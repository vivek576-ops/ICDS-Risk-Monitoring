/**
 * ═══════════════════════════════════════════════════════════════
 * ICDS Notification Service
 * SMS alerts via MSG91 (India's leading SMS gateway)
 * ═══════════════════════════════════════════════════════════════
 *
 * Sends SMS to:
 *   - Parents when their child is flagged high/critical risk
 *   - Supervisors when referrals become overdue
 *   - AWWs when a referral is assigned to their centre
 *
 * Setup: Add MSG91_AUTH_KEY to your .env file
 * Get a free API key at: https://msg91.com/
 */

const https = require("https");

// ─── MSG91 Configuration ───
const MSG91_AUTH_KEY   = process.env.MSG91_AUTH_KEY   || "";
const MSG91_SENDER_ID  = process.env.MSG91_SENDER_ID  || "ICDSAL";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";

const SMS_ENABLED = !!MSG91_AUTH_KEY;

if (!SMS_ENABLED) {
  console.log("📱 SMS: Disabled (MSG91_AUTH_KEY not set in .env). Notifications will be logged only.");
}

// ─── Message Templates ───
const TEMPLATES = {
  HIGH_RISK_PARENT: (childName, riskLevel, referredTo) =>
    `ICDS Alert: ${childName} has been assessed as ${riskLevel.toUpperCase()} risk. A referral to ${referredTo} has been created. Please contact your nearest Anganwadi Centre. -ICDS AP`,

  CRITICAL_RISK_PARENT: (childName, referralCode, referredTo) =>
    `URGENT ICDS Alert: ${childName} requires IMMEDIATE developmental intervention. Referral ${referralCode} created. Specialist: ${referredTo}. Please visit AWC immediately. -ICDS AP`,

  REFERRAL_OVERDUE_SUPERVISOR: (referralCode, childName, daysOpen) =>
    `ICDS SLA Alert: Referral ${referralCode} for ${childName} is ${daysOpen} days old and overdue. Immediate action required. Login to ICDS portal to update status. -ICDS AP`,

  REFERRAL_ASSIGNED_AWW: (childName, urgency, referredTo) =>
    `ICDS: New ${urgency.toUpperCase()} referral created for ${childName}. Please schedule appointment with ${referredTo} within SLA deadline. -ICDS AP`,

  SCREENING_REMINDER_PARENT: (childName, awcName) =>
    `ICDS Reminder: ${childName} is due for a developmental screening at ${awcName}. Early screening helps identify delays. Please visit your AWC. -ICDS AP`,
};

/**
 * Send SMS via MSG91 API
 * @param {string} phone - Indian mobile number (10 digits or with +91)
 * @param {string} message - SMS text
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendSMS(phone, message) {
  // Normalize phone number
  const normalizedPhone = phone.replace(/\D/g, "").replace(/^91/, "").slice(-10);

  if (normalizedPhone.length !== 10) {
    console.warn(`📱 SMS: Invalid phone number: ${phone}`);
    return { success: false, message: "Invalid phone number" };
  }

  // Log the message regardless of whether SMS is enabled
  console.log(`📱 SMS ${SMS_ENABLED ? "SENDING" : "LOG"} → +91${normalizedPhone}: ${message}`);

  if (!SMS_ENABLED) {
    // Simulate success in development
    return { success: true, message: "SMS logged (MSG91 disabled)" };
  }

  return new Promise((resolve) => {
    const payload = JSON.stringify({
      sender: MSG91_SENDER_ID,
      route: "4", // Transactional route
      country: "91",
      sms: [
        {
          message,
          to: [`91${normalizedPhone}`],
        },
      ],
    });

    const options = {
      hostname: "api.msg91.com",
      path: "/api/sendhttp.php",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": MSG91_AUTH_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve({ success: true, message: "SMS sent successfully" });
        } else {
          console.error(`📱 SMS Error: ${data}`);
          resolve({ success: false, message: data });
        }
      });
    });

    req.on("error", (err) => {
      console.error(`📱 SMS Request Error: ${err.message}`);
      resolve({ success: false, message: err.message });
    });

    req.write(payload);
    req.end();
  });
}

// ─── High-Level Notification Functions ───

/**
 * Notify parent when child is flagged as high/critical risk
 */
async function notifyParentHighRisk(child, referral) {
  if (!child?.parentPhone) return { success: false, message: "No parent phone" };

  const message =
    referral.riskLevel === "critical"
      ? TEMPLATES.CRITICAL_RISK_PARENT(child.name, referral.referralCode, referral.referredTo)
      : TEMPLATES.HIGH_RISK_PARENT(child.name, referral.riskLevel, referral.referredTo);

  const result = await sendSMS(child.parentPhone, message);

  // Track notification in referral
  if (result.success) {
    referral.parentNotified = true;
    referral.notificationHistory.push({
      type: "sms",
      sentTo: child.parentPhone,
      sentAt: new Date(),
      status: "sent",
    });
    await referral.save();
  }

  return result;
}

/**
 * Notify supervisor when referral becomes overdue
 */
async function notifySupervisorOverdue(referral, supervisorPhone) {
  if (!supervisorPhone) return { success: false, message: "No supervisor phone" };

  const childName = referral.childId?.name || "Unknown Child";
  const message   = TEMPLATES.REFERRAL_OVERDUE_SUPERVISOR(
    referral.referralCode,
    childName,
    referral.daysOpen
  );

  const result = await sendSMS(supervisorPhone, message);

  if (result.success) {
    referral.supervisorNotified = true;
    referral.notificationHistory.push({
      type: "sms",
      sentTo: supervisorPhone,
      sentAt: new Date(),
      status: "sent",
    });
    await referral.save();
  }

  return result;
}

/**
 * Notify AWW when referral is assigned to their centre
 */
async function notifyAwwReferralAssigned(child, referral, awwPhone) {
  if (!awwPhone) return { success: false, message: "No AWW phone" };

  const message = TEMPLATES.REFERRAL_ASSIGNED_AWW(
    child.name,
    referral.urgency,
    referral.referredTo
  );

  return sendSMS(awwPhone, message);
}

/**
 * Send screening reminder to parent
 */
async function sendScreeningReminder(child, awcName) {
  if (!child?.parentPhone) return { success: false, message: "No parent phone" };

  const message = TEMPLATES.SCREENING_REMINDER_PARENT(child.name, awcName);
  return sendSMS(child.parentPhone, message);
}

/**
 * Batch send overdue notifications
 * Called as a scheduled job (e.g., daily cron)
 */
async function sendOverdueNotifications(Referral, User) {
  try {
    const overdueReferrals = await Referral.find({
      status: { $in: ["pending", "overdue"] },
      slaDeadline: { $lt: new Date() },
      supervisorNotified: false,
    }).populate("childId", "name district");

    console.log(`📱 Overdue notifications: ${overdueReferrals.length} referrals`);

    let sent = 0;
    for (const referral of overdueReferrals) {
      // Find supervisor for this district
      const supervisor = await User.findOne({
        where: { role: "supervisor", district: referral.district, isActive: true },
      });

      if (supervisor?.phone) {
        const result = await notifySupervisorOverdue(referral, supervisor.phone);
        if (result.success) sent++;
      }
    }

    console.log(`📱 Sent ${sent} overdue notifications`);
    return { sent, total: overdueReferrals.length };
  } catch (error) {
    console.error(`📱 Batch notification error: ${error.message}`);
    return { sent: 0, error: error.message };
  }
}

module.exports = {
  sendSMS,
  notifyParentHighRisk,
  notifySupervisorOverdue,
  notifyAwwReferralAssigned,
  sendScreeningReminder,
  sendOverdueNotifications,
  TEMPLATES,
  SMS_ENABLED,
};

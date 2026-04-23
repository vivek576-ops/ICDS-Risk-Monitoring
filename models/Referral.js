const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    // ─── Reference Code (human-readable) ───
    referralCode: {
      type: String,
      unique: true,
      // Auto-generated in pre-save hook: "REF-3421"
    },

    // ─── Links ───
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    screeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScreeningRecord",
      required: true,
    },
    centreId: {
      // PostgreSQL AnganwadiCentre UUID
      type: String,
      required: true,
    },
    referredBy: {
      // PostgreSQL User UUID
      type: String,
      required: true,
    },

    // ─── Risk Context ───
    riskLevel: {
      type: String,
      enum: ["moderate", "high", "critical"],
      required: true,
    },
    flaggedDomains: [String],
    compositeScore: Number,

    // ─── Urgency (matches PPT's urgency queue) ───
    urgency: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      required: true,
    },

    // ─── Referral Target ───
    referredTo: {
      type: String, // "Pediatrician", "Speech Therapist", "Neurologist", etc.
      required: true,
    },
    referralFacility: String, // Hospital / clinic name
    referralFacilityPhone: String,

    // ─── Status Pipeline (Pending → In-Progress → Completed / Cancelled) ───
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled", "overdue"],
      default: "pending",
    },

    // ─── Timeline Tracking (for SLA monitoring) ───
    flaggedDate: {
      // When the risk was first detected
      type: Date,
      required: true,
    },
    referralDate: {
      // When the referral was created
      type: Date,
      default: Date.now,
    },
    appointmentDate: {
      // When the specialist appointment is scheduled
      type: Date,
    },
    completionDate: {
      // When the referral was resolved
      type: Date,
    },
    slaDeadline: {
      // Auto-calculated based on urgency
      type: Date,
      required: false,
    },
    daysOpen: {
      // Computed field: how many days since referral creation
      type: Number,
      default: 0,
    },

    // ─── Follow-up ───
    followUpDates: [Date],
    outcome: {
      type: String,
      enum: [
        "intervention_started",
        "referred_higher",
        "resolved",
        "no_intervention_needed",
        "lost_to_followup",
      ],
    },
    outcomeNotes: String,

    // ─── Notifications ───
    parentNotified: { type: Boolean, default: false },
    supervisorNotified: { type: Boolean, default: false },
    notificationHistory: [
      {
        type: { type: String, enum: ["sms", "app", "call"] },
        sentTo: String,
        sentAt: Date,
        status: String,
      },
    ],

    // ─── Location (for geo-queries) ───
    district: String,
    mandal: String,
  },
  {
    timestamps: true,
  }
);

// ─── Auto-generate referral code ───
referralSchema.pre("save", async function (next) {
  if (this.isNew && !this.referralCode) {
    const count = await mongoose.model("Referral").countDocuments();
    this.referralCode = `REF-${String(count + 1001).padStart(4, "0")}`;
  }

  // Auto-calculate SLA deadline based on urgency
  if (this.isNew && !this.slaDeadline) {
    const deadlineDays = {
      emergency: 3,
      urgent: 7,
      routine: 30,
    };
    const days = deadlineDays[this.urgency] || 30;
    this.slaDeadline = new Date(
      this.referralDate.getTime() + days * 24 * 60 * 60 * 1000
    );
  }

  // Calculate days open
  if (this.status !== "completed" && this.status !== "cancelled") {
    this.daysOpen = Math.floor(
      (Date.now() - this.referralDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Auto-mark overdue
    if (new Date() > this.slaDeadline && this.status === "pending") {
      this.status = "overdue";
    }
  }

  next();
});

// ─── Indexes ───
referralSchema.index({ status: 1, urgency: 1 });
referralSchema.index({ district: 1, status: 1 });
referralSchema.index({ slaDeadline: 1, status: 1 });
referralSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Referral", referralSchema);

const express = require("express");
const router = express.Router();
const Referral = require("../models/Referral");
const { authenticate, authorize } = require("../middleware/auth");

// ─── GET /api/referrals — List referrals with filters ───
router.get("/", authenticate, async (req, res, next) => {
  try {
    const {
      status,
      urgency,
      district,
      page = 1,
      limit = 50,
      sortBy = "urgency",
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (district) filter.district = district;

    // Role-based scoping
    if (req.user.role === "aww" && req.user.centreId) {
      filter.centreId = req.user.centreId;
    }
    if (
      (req.user.role === "supervisor" || req.user.role === "cdpo") &&
      req.user.district
    ) {
      filter.district = req.user.district;
    }

    // Sort priorities: emergency first, then urgent, then by days open
    const sortOptions = {
      urgency: { urgency: 1, daysOpen: -1 },
      recent: { createdAt: -1 },
      overdue: { slaDeadline: 1, status: 1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Referral.countDocuments(filter);
    const referrals = await Referral.find(filter)
      .populate("childId", "name dateOfBirth parentName parentPhone district")
      .sort(sortOptions[sortBy] || sortOptions.urgency)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: referrals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: referrals,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/referrals/urgency-queue — PPT's "Recent Referrals - Urgency Queue" ───
router.get(
  "/urgency-queue",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const filter = {
        status: { $in: ["pending", "overdue", "in_progress"] },
      };

      if (req.user.district) filter.district = req.user.district;

      const queue = await Referral.find(filter)
        .populate("childId", "name dateOfBirth parentName parentPhone")
        .sort({ urgency: 1, daysOpen: -1 })
        .limit(20);

      // Update daysOpen for each
      for (const ref of queue) {
        ref.daysOpen = Math.floor(
          (Date.now() - ref.referralDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (new Date() > ref.slaDeadline && ref.status === "pending") {
          ref.status = "overdue";
        }
        await ref.save();
      }

      res.json({
        success: true,
        count: queue.length,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PUT /api/referrals/:id/status — Update referral status ───
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww"),
  async (req, res, next) => {
    try {
      const { status, outcome, outcomeNotes, appointmentDate } = req.body;

      const referral = await Referral.findById(req.params.id);
      if (!referral) {
        return res
          .status(404)
          .json({ success: false, error: "Referral not found" });
      }

      if (status) referral.status = status;
      if (outcome) referral.outcome = outcome;
      if (outcomeNotes) referral.outcomeNotes = outcomeNotes;
      if (appointmentDate) referral.appointmentDate = new Date(appointmentDate);

      // Set completion date when marked complete
      if (status === "completed") {
        referral.completionDate = new Date();
      }

      await referral.save();

      res.json({
        success: true,
        data: referral,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/referrals/:id/follow-up — Add follow-up date ───
router.post(
  "/:id/follow-up",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww"),
  async (req, res, next) => {
    try {
      const referral = await Referral.findById(req.params.id);
      if (!referral) {
        return res
          .status(404)
          .json({ success: false, error: "Referral not found" });
      }

      referral.followUpDates.push(new Date(req.body.date || Date.now()));
      await referral.save();

      res.json({
        success: true,
        data: referral,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

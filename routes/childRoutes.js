const express = require("express");
const router = express.Router();
const Child = require("../models/Child");
const ScreeningRecord = require("../models/ScreeningRecord");
const Referral = require("../models/Referral");
const { calculateRisk, calculateRiskQuick } = require("../utils/riskCalculator");
const { authenticate, authorize } = require("../middleware/auth");

// ─── POST /api/children — Register a new child ───
router.post(
  "/",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww"),
  async (req, res, next) => {
    try {
      const childData = {
        ...req.body,
        centreId: req.body.centreId || req.user.centreId,
        district: req.body.district || req.user.district,
        mandal: req.body.mandal || req.user.mandal,
      };

      const child = await Child.create(childData);

      res.status(201).json({
        success: true,
        data: child,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/children — List children (with filters) ───
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { centreId, district, riskLevel, status, page = 1, limit = 50 } = req.query;

    const filter = { enrollmentStatus: "active" };

    if (centreId) filter.centreId = centreId;
    if (district) filter.district = district;
    if (riskLevel) filter["currentRisk.level"] = riskLevel;
    if (status) filter.enrollmentStatus = status;

    // Role-based scoping: AWWs see only their centre
    if (req.user.role === "aww" && req.user.centreId) {
      filter.centreId = req.user.centreId;
    }
    // Supervisors see their district
    if (req.user.role === "supervisor" && req.user.district) {
      filter.district = req.user.district;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Child.countDocuments(filter);
    const children = await Child.find(filter)
      .sort({ "currentRisk.compositeScore": 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-anthropometrics"); // Exclude heavy nested data from list view

    res.json({
      success: true,
      count: children.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: children,
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/children/:id — Get child with full profile ───
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) {
      return res.status(404).json({ success: false, error: "Child not found" });
    }

    // Fetch screening history
    const screenings = await ScreeningRecord.find({ childId: child._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Fetch referrals
    const referrals = await Referral.find({ childId: child._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: {
        child,
        screeningHistory: screenings,
        referrals,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/children/:id/screen — Perform a developmental screening
// ═══════════════════════════════════════════════════════════════
// This is the CORE endpoint that ties everything together:
//   1. Takes milestone assessment data from the AWW
//   2. Runs it through the risk calculator
//   3. Creates a ScreeningRecord
//   4. Updates the child's current risk profile
//   5. Auto-creates a Referral if risk is high/critical
// ═══════════════════════════════════════════════════════════════
router.post(
  "/:id/screen",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww"),
  async (req, res, next) => {
    try {
      const child = await Child.findById(req.params.id);
      if (!child) {
        return res
          .status(404)
          .json({ success: false, error: "Child not found" });
      }

      // Calculate age in months
      const now = new Date();
      const ageInMonths =
        (now.getFullYear() - child.dateOfBirth.getFullYear()) * 12 +
        (now.getMonth() - child.dateOfBirth.getMonth());

      // Get screening count for confidence calculation
      const screeningCount = (child.currentRisk?.screeningCount || 0) + 1;

      // Get latest anthropometrics
      const latestAnthro =
        child.anthropometrics && child.anthropometrics.length > 0
          ? child.anthropometrics[child.anthropometrics.length - 1]
          : null;

      // ─── Run the risk assessment engine ───
      const riskResult = calculateRisk(
        {
          ageInMonths,
          domains: req.body.domains,
          anthropometrics: latestAnthro,
        },
        screeningCount
      );

      // ─── Create screening record ───
      const screeningRecord = await ScreeningRecord.create({
        childId: child._id,
        centreId: child.centreId,
        screenedBy: req.user.id,
        ageAtScreening: {
          months: ageInMonths,
          band: riskResult.ageBand,
        },
        assessments: riskResult.assessments,
        compositeScore: riskResult.compositeScore,
        riskLevel: riskResult.riskLevel,
        confidence: riskResult.confidence,
        flaggedDomains: riskResult.flaggedDomains,
        requiresReferral: riskResult.requiresReferral,
        referralUrgency: riskResult.referralUrgency,
        screeningTool: riskResult.screeningTool,
        notes: req.body.notes,
        district: child.district,
        mandal: child.mandal,
      });

      // ─── Update child's current risk profile ───
      child.currentRisk = {
        level: riskResult.riskLevel,
        compositeScore: riskResult.compositeScore,
        confidence: riskResult.confidence,
        domainScores: riskResult.domainScores,
        lastScreenedAt: now,
        screeningCount,
        flaggedDomains: riskResult.flaggedDomains,
      };
      await child.save();

      // ─── Auto-create referral if needed ───
      let referral = null;
      if (riskResult.requiresReferral) {
        referral = await Referral.create({
          childId: child._id,
          screeningId: screeningRecord._id,
          centreId: child.centreId,
          referredBy: req.user.id,
          riskLevel: riskResult.riskLevel,
          flaggedDomains: riskResult.flaggedDomains,
          compositeScore: riskResult.compositeScore,
          urgency: riskResult.referralUrgency,
          referredTo: riskResult.referredTo,
          flaggedDate: now,
          district: child.district,
          mandal: child.mandal,
        });
      }

      res.status(201).json({
        success: true,
        data: {
          screening: screeningRecord,
          riskAssessment: {
            level: riskResult.riskLevel,
            compositeScore: riskResult.compositeScore,
            confidence: riskResult.confidence,
            flaggedDomains: riskResult.flaggedDomains,
            domainScores: riskResult.domainScores,
          },
          referral: referral
            ? {
                code: referral.referralCode,
                urgency: referral.urgency,
                referredTo: referral.referredTo,
                slaDeadline: referral.slaDeadline,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/children/:id/screen-quick — Simplified screening ───
// Backward-compatible with your teammate's original format
router.post(
  "/:id/screen-quick",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww"),
  async (req, res, next) => {
    try {
      const child = await Child.findById(req.params.id);
      if (!child) {
        return res
          .status(404)
          .json({ success: false, error: "Child not found" });
      }

      const now = new Date();
      const ageInMonths =
        (now.getFullYear() - child.dateOfBirth.getFullYear()) * 12 +
        (now.getMonth() - child.dateOfBirth.getMonth());

      const riskResult = calculateRiskQuick({
        age: ageInMonths,
        weight: req.body.weight,
        height: req.body.height,
        speechDelay: req.body.speechDelay,
        motorSkills: req.body.motorSkills,
      });

      // Update child's risk profile
      child.currentRisk = {
        level: riskResult.riskLevel,
        compositeScore: riskResult.compositeScore,
        confidence: riskResult.confidence,
        domainScores: riskResult.domainScores,
        lastScreenedAt: now,
        screeningCount: (child.currentRisk?.screeningCount || 0) + 1,
        flaggedDomains: riskResult.flaggedDomains,
      };
      await child.save();

      res.json({
        success: true,
        message: "Quick screening completed",
        data: {
          riskLevel: riskResult.riskLevel,
          compositeScore: riskResult.compositeScore,
          confidence: riskResult.confidence,
          flaggedDomains: riskResult.flaggedDomains,
          referralNeeded: riskResult.requiresReferral,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/children/:id/anthropometrics — Add measurements ───
router.post(
  "/:id/anthropometrics",
  authenticate,
  authorize("admin", "cdpo", "supervisor", "aww", "anm"),
  async (req, res, next) => {
    try {
      const child = await Child.findById(req.params.id);
      if (!child) {
        return res
          .status(404)
          .json({ success: false, error: "Child not found" });
      }

      const measurement = {
        ...req.body,
        date: new Date(),
        recordedBy: req.user.id,
      };

      // Auto-calculate BMI
      if (measurement.weight && measurement.height) {
        const heightM = measurement.height / 100;
        measurement.bmi =
          Math.round((measurement.weight / (heightM * heightM)) * 10) / 10;
      }

      child.anthropometrics.push(measurement);
      await child.save();

      res.status(201).json({
        success: true,
        data: measurement,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Child = require("../models/Child");
const ScreeningRecord = require("../models/ScreeningRecord");
const Referral = require("../models/Referral");
const AnganwadiCentre = require("../models/AnganwadiCentre");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

// ═══════════════════════════════════════════════════════════════
// SLIDE 5: SCREENING & COVERAGE DASHBOARD
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/screening/kpis — Top-level KPI cards ───
router.get(
  "/screening/kpis",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district } = req.query;
      const matchFilter = {};
      if (district) matchFilter.district = district;

      const [totalChildren, totalScreened, flaggedChildren, activeCentres] =
        await Promise.all([
          Child.countDocuments({
            enrollmentStatus: "active",
            ...matchFilter,
          }),
          Child.countDocuments({
            enrollmentStatus: "active",
            "currentRisk.lastScreenedAt": { $ne: null },
            ...matchFilter,
          }),
          Child.countDocuments({
            enrollmentStatus: "active",
            "currentRisk.level": { $in: ["high", "critical"] },
            ...matchFilter,
          }),
          // Count active centres from PostgreSQL
          district
            ? AnganwadiCentre.count({
                where: { district, isActive: true },
              })
            : AnganwadiCentre.count({ where: { isActive: true } }),
        ]);

      const coveragePercent =
        totalChildren > 0
          ? Math.round((totalScreened / totalChildren) * 1000) / 10
          : 0;

      const flaggedPercent =
        totalScreened > 0
          ? Math.round((flaggedChildren / totalScreened) * 1000) / 10
          : 0;

      res.json({
        success: true,
        data: {
          childrenScreened: totalScreened,
          activeCentres,
          screeningCoverage: coveragePercent,
          childrenFlagged: flaggedPercent,
          totalEnrolled: totalChildren,
          flaggedCount: flaggedChildren,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/screening/monthly-trend — Monthly screening chart data ───
router.get(
  "/screening/monthly-trend",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { year, district } = req.query;
      const targetYear = parseInt(year) || new Date().getFullYear();

      const matchStage = {
        createdAt: {
          $gte: new Date(`${targetYear}-01-01`),
          $lt: new Date(`${targetYear + 1}-01-01`),
        },
      };
      if (district) matchStage.district = district;

      const trend = await ScreeningRecord.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $month: "$createdAt" },
            screened: { $sum: 1 },
            flagged: {
              $sum: {
                $cond: [
                  { $in: ["$riskLevel", ["high", "critical"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Fill in all 12 months
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const fullTrend = months.map((month, idx) => {
        const found = trend.find((t) => t._id === idx + 1);
        return {
          month,
          screened: found ? found.screened : 0,
          flagged: found ? found.flagged : 0,
        };
      });

      res.json({ success: true, data: fullTrend });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/screening/by-district — AWC Performance Summary table ───
router.get(
  "/screening/by-district",
  authenticate,
  authorize("admin", "cdpo"),
  async (req, res, next) => {
    try {
      const districtStats = await Child.aggregate([
        { $match: { enrollmentStatus: "active" } },
        {
          $group: {
            _id: "$district",
            total: { $sum: 1 },
            screened: {
              $sum: {
                $cond: [
                  { $ne: ["$currentRisk.lastScreenedAt", null] },
                  1,
                  0,
                ],
              },
            },
            atRisk: {
              $sum: {
                $cond: [
                  { $in: ["$currentRisk.level", ["high", "critical"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            district: "$_id",
            total: 1,
            coverage: {
              $cond: [
                { $gt: ["$total", 0] },
                {
                  $round: [
                    { $multiply: [{ $divide: ["$screened", "$total"] }, 100] },
                    0,
                  ],
                },
                0,
              ],
            },
            riskPercent: {
              $cond: [
                { $gt: ["$screened", 0] },
                {
                  $round: [
                    {
                      $multiply: [{ $divide: ["$atRisk", "$screened"] }, 100],
                    },
                    0,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { coverage: -1 } },
      ]);

      // Merge AWC count from PostgreSQL
      for (const stat of districtStats) {
        const awcCount = await AnganwadiCentre.count({
          where: { district: stat.district, isActive: true },
        });
        stat.awcCount = awcCount;
      }

      res.json({ success: true, data: districtStats });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// SLIDE 6: RISK STRATIFICATION DASHBOARD
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/risk/distribution — Risk level pie chart data ───
router.get(
  "/risk/distribution",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district } = req.query;
      const matchFilter = { enrollmentStatus: "active" };
      if (district) matchFilter.district = district;

      const distribution = await Child.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$currentRisk.level",
            count: { $sum: 1 },
          },
        },
      ]);

      const total = distribution.reduce((sum, d) => sum + d.count, 0);
      const result = ["low", "moderate", "high", "critical"].map((level) => {
        const found = distribution.find((d) => d._id === level);
        const count = found ? found.count : 0;
        return {
          level,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      });

      res.json({ success: true, total, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/risk/by-domain — Domain-wise delay burden ───
router.get(
  "/risk/by-domain",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district } = req.query;
      const matchFilter = {
        enrollmentStatus: "active",
        "currentRisk.lastScreenedAt": { $ne: null },
      };
      if (district) matchFilter.district = district;

      const totalScreened = await Child.countDocuments(matchFilter);

      const domainDelays = await Child.aggregate([
        { $match: matchFilter },
        { $unwind: "$currentRisk.flaggedDomains" },
        {
          $group: {
            _id: "$currentRisk.flaggedDomains",
            count: { $sum: 1 },
          },
        },
      ]);

      const domainLabels = {
        grossMotor: "Gross Motor",
        fineMotor: "Fine Motor",
        language: "Language",
        cognitive: "Cognitive",
        socioEmotional: "Socio-Emot.",
      };

      const result = Object.keys(domainLabels).map((domain) => {
        const found = domainDelays.find((d) => d._id === domain);
        const count = found ? found.count : 0;
        return {
          domain,
          label: domainLabels[domain],
          count,
          delayPercent:
            totalScreened > 0
              ? Math.round((count / totalScreened) * 1000) / 10
              : 0,
        };
      });

      res.json({ success: true, totalScreened, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/risk/by-age — Age-band risk distribution ───
router.get(
  "/risk/by-age",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district } = req.query;
      const matchFilter = { enrollmentStatus: "active" };
      if (district) matchFilter.district = district;

      // Since ageInMonths is a virtual, we need to compute it in aggregation
      const ageRisk = await Child.aggregate([
        { $match: matchFilter },
        {
          $addFields: {
            ageInMonths: {
              $divide: [
                { $subtract: [new Date(), "$dateOfBirth"] },
                1000 * 60 * 60 * 24 * 30.44, // avg days per month
              ],
            },
          },
        },
        {
          $addFields: {
            ageBand: {
              $switch: {
                branches: [
                  { case: { $lte: ["$ageInMonths", 12] }, then: "0-12 mo" },
                  { case: { $lte: ["$ageInMonths", 24] }, then: "13-24 mo" },
                  { case: { $lte: ["$ageInMonths", 36] }, then: "25-36 mo" },
                  { case: { $lte: ["$ageInMonths", 48] }, then: "37-48 mo" },
                  { case: { $lte: ["$ageInMonths", 60] }, then: "49-60 mo" },
                ],
                default: "61-72 mo",
              },
            },
          },
        },
        {
          $group: {
            _id: "$ageBand",
            screened: { $sum: 1 },
            atRisk: {
              $sum: {
                $cond: [
                  { $in: ["$currentRisk.level", ["high", "critical"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            ageBand: "$_id",
            screened: 1,
            atRisk: 1,
            riskPercent: {
              $cond: [
                { $gt: ["$screened", 0] },
                {
                  $round: [
                    { $multiply: [{ $divide: ["$atRisk", "$screened"] }, 100] },
                    1,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({ success: true, data: ageRisk });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// SLIDE 7: REFERRAL & ACTION SUPPORT DASHBOARD
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/referrals/kpis — Referral KPI cards ───
router.get(
  "/referrals/kpis",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district } = req.query;
      const matchFilter = {};
      if (district) matchFilter.district = district;

      const [totalReferred, completed, overdue, avgTime] = await Promise.all([
        Referral.countDocuments(matchFilter),
        Referral.countDocuments({ ...matchFilter, status: "completed" }),
        Referral.countDocuments({
          ...matchFilter,
          status: { $in: ["overdue", "pending"] },
          slaDeadline: { $lt: new Date() },
        }),
        // Average days from flag to referral
        Referral.aggregate([
          { $match: matchFilter },
          {
            $project: {
              daysDiff: {
                $divide: [
                  { $subtract: ["$referralDate", "$flaggedDate"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: "$daysDiff" } } },
        ]),
      ]);

      const completionRate =
        totalReferred > 0
          ? Math.round((completed / totalReferred) * 1000) / 10
          : 0;

      res.json({
        success: true,
        data: {
          totalReferred,
          completionRate,
          avgFlagToReferralDays:
            avgTime.length > 0 ? Math.round(avgTime[0].avg * 10) / 10 : 0,
          overdueCount: overdue,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/referrals/monthly — Monthly referral status chart ───
router.get(
  "/referrals/monthly",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { year, district } = req.query;
      const targetYear = parseInt(year) || new Date().getFullYear();

      const matchStage = {
        referralDate: {
          $gte: new Date(`${targetYear}-01-01`),
          $lt: new Date(`${targetYear + 1}-01-01`),
        },
      };
      if (district) matchStage.district = district;

      const monthly = await Referral.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $month: "$referralDate" },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["pending", "in_progress", "overdue"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const fullMonthly = months.map((month, idx) => {
        const found = monthly.find((m) => m._id === idx + 1);
        return {
          month,
          completed: found ? found.completed : 0,
          pending: found ? found.pending : 0,
        };
      });

      res.json({ success: true, data: fullMonthly });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// SLIDE 8: WORKFORCE & SYSTEM PERFORMANCE
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/workforce/summary — Workforce capacity matrix ───
router.get(
  "/workforce/summary",
  authenticate,
  authorize("admin", "cdpo"),
  async (req, res, next) => {
    try {
      const roles = ["cdpo", "supervisor", "aww", "anm", "asha"];
      const roleLabels = {
        cdpo: "CDPO",
        supervisor: "Supervisor",
        aww: "AWW",
        anm: "ANM",
        asha: "ASHA",
      };

      const summary = [];
      for (const role of roles) {
        const [total, trained] = await Promise.all([
          User.count({ where: { role, isActive: true } }),
          User.count({ where: { role, isActive: true, trainingCompleted: true } }),
        ]);
        summary.push({
          role: roleLabels[role],
          total,
          trained,
          percentage: total > 0 ? Math.round((trained / total) * 1000) / 10 : 0,
        });
      }

      // Training mode distribution
      const [physical, virtual, hybrid] = await Promise.all([
        User.count({ where: { trainingMode: "physical", trainingCompleted: true } }),
        User.count({ where: { trainingMode: "virtual", trainingCompleted: true } }),
        User.count({ where: { trainingMode: "hybrid", trainingCompleted: true } }),
      ]);
      const totalTrained = physical + virtual + hybrid || 1;

      res.json({
        success: true,
        data: {
          capacityMatrix: summary,
          trainingModeDistribution: {
            physical: Math.round((physical / totalTrained) * 100),
            virtual: Math.round((virtual / totalTrained) * 100),
            hybrid: Math.round((hybrid / totalTrained) * 100),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════════════════
// SLIDE 9: GEO-ANALYTIC RISK MAP
// ═══════════════════════════════════════════════════════════════

// ─── GET /api/dashboard/geo/centres — AWC markers for map ───
router.get(
  "/geo/centres",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { district, riskLevel } = req.query;
      const where = { isActive: true };
      if (district) where.district = district;
      if (riskLevel) where.riskLevel = riskLevel;

      const centres = await AnganwadiCentre.findAll({
        where,
        attributes: [
          "id",
          "centreCode",
          "name",
          "district",
          "mandal",
          "village",
          "latitude",
          "longitude",
          "screeningCoverage",
          "riskScore",
          "riskLevel",
          "currentEnrollment",
        ],
      });

      res.json({ success: true, count: centres.length, data: centres });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/dashboard/geo/district-risk — District risk scores for bar chart ───
router.get(
  "/geo/district-risk",
  authenticate,
  authorize("admin", "cdpo"),
  async (req, res, next) => {
    try {
      const { Sequelize } = require("sequelize");
      const districtRisk = await AnganwadiCentre.findAll({
        where: { isActive: true },
        attributes: [
          "district",
          [Sequelize.fn("AVG", Sequelize.col("riskScore")), "avgRiskScore"],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "centreCount"],
        ],
        group: ["district"],
        order: [[Sequelize.fn("AVG", Sequelize.col("riskScore")), "DESC"]],
      });

      res.json({
        success: true,
        data: districtRisk.map((d) => ({
          district: d.district,
          riskScore: Math.round(parseFloat(d.getDataValue("avgRiskScore")) || 0),
          centreCount: parseInt(d.getDataValue("centreCount")) || 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

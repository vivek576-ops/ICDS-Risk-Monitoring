const mongoose = require("mongoose");

// ─── Individual domain assessment within a screening ───
const domainAssessmentSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: [
        "grossMotor",
        "fineMotor",
        "language",
        "cognitive",
        "socioEmotional",
      ],
      required: true,
    },

    // ─── Milestone Checklist Results ───
    milestonesExpected: { type: Number, required: true }, // How many milestones expected for this age
    milestonesAchieved: { type: Number, required: true }, // How many the child demonstrated
    milestoneDetails: [
      {
        milestone: String, // e.g., "Walks independently"
        achieved: Boolean,
        notes: String,
      },
    ],

    // ─── Scoring ───
    rawScore: { type: Number, required: true }, // milestonesAchieved / milestonesExpected * 100
    percentile: { type: Number, required: true }, // Age-normalized percentile (0-100)
    zScore: { type: Number }, // Standard deviations from mean

    // ─── Domain-level risk ───
    domainRisk: {
      type: String,
      enum: ["on_track", "monitor", "at_risk", "delayed"],
      required: true,
    },
  },
  { _id: false }
);

const screeningRecordSchema = new mongoose.Schema(
  {
    // ─── Links ───
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
      index: true,
    },
    centreId: {
      // PostgreSQL AnganwadiCentre UUID
      type: String,
      required: true,
      index: true,
    },
    screenedBy: {
      // PostgreSQL User UUID (AWW who performed screening)
      type: String,
      required: true,
    },

    // ─── Child's age at time of screening (snapshot) ───
    ageAtScreening: {
      months: { type: Number, required: true },
      band: { type: String, required: true }, // "0-12 mo", "13-24 mo", etc.
    },

    // ─── Domain Assessments ───
    assessments: [domainAssessmentSchema],

    // ─── Composite Results ───
    compositeScore: {
      type: Number, // 0-100 weighted average across domains
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      required: true,
    },
    confidence: {
      type: Number, // 0.0 - 1.0
      required: true,
    },

    // ─── Flags ───
    flaggedDomains: [String], // Domains where child is "at_risk" or "delayed"
    requiresReferral: { type: Boolean, default: false },
    referralUrgency: {
      type: String,
      enum: ["none", "routine", "urgent", "emergency"],
      default: "none",
    },

    // ─── Screening Context ───
    screeningTool: {
      type: String,
      enum: ["asq3", "dasii", "manual", "hybrid"],
      default: "asq3",
    },
    notes: String,

    // ─── Location snapshot (for geo-queries) ───
    district: String,
    mandal: String,
  },
  {
    timestamps: true,
  }
);

// ─── Indexes for dashboard aggregations ───
screeningRecordSchema.index({ createdAt: -1, district: 1 });
screeningRecordSchema.index({ riskLevel: 1, district: 1 });
screeningRecordSchema.index({ centreId: 1, createdAt: -1 });
screeningRecordSchema.index({ childId: 1, createdAt: -1 });

module.exports = mongoose.model("ScreeningRecord", screeningRecordSchema);

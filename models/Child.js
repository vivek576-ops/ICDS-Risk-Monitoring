const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    // ─── Basic Identity ───
    name: {
      type: String,
      required: [true, "Child name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    aadhaarLast4: {
      // Last 4 digits only for privacy
      type: String,
      maxlength: 4,
    },

    // ─── Parent / Guardian ───
    parentName: {
      type: String,
      required: true,
    },
    parentPhone: {
      type: String,
      required: true,
    },
    parentUserId: {
      // Links to PostgreSQL User (parent account)
      type: String,
      default: null,
    },

    // ─── Location Mapping ───
    centreId: {
      // Links to PostgreSQL AnganwadiCentre UUID
      type: String,
      required: true,
    },
    district: String,
    mandal: String,
    village: String,

    // ─── Anthropometric Data ───
    anthropometrics: [
      {
        date: { type: Date, default: Date.now },
        weight: Number, // kg
        height: Number, // cm
        headCircumference: Number, // cm
        midUpperArmCircumference: Number, // cm (MUAC)
        bmi: Number, // auto-calculated
        weightForAge: String, // z-score category: normal / underweight / severely_underweight
        heightForAge: String, // z-score category: normal / stunted / severely_stunted
        weightForHeight: String, // z-score category: normal / wasted / severely_wasted
        recordedBy: String, // User UUID who took the measurement
      },
    ],

    // ─── Current Risk Profile (updated after each screening) ───
    currentRisk: {
      level: {
        type: String,
        enum: ["low", "moderate", "high", "critical"],
        default: "low",
      },
      compositeScore: {
        type: Number, // 0-100
        default: 0,
      },
      confidence: {
        type: Number, // 0-1, how confident we are in this assessment
        default: 0,
      },
      domainScores: {
        grossMotor: { type: Number, default: 0 },
        fineMotor: { type: Number, default: 0 },
        language: { type: Number, default: 0 },
        cognitive: { type: Number, default: 0 },
        socioEmotional: { type: Number, default: 0 },
      },
      lastScreenedAt: Date,
      screeningCount: { type: Number, default: 0 },
      flaggedDomains: [String], // e.g., ["language", "grossMotor"]
    },

    // ─── Status ───
    enrollmentStatus: {
      type: String,
      enum: ["active", "graduated", "transferred", "dropped"],
      default: "active",
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: Calculate current age in months ───
childSchema.virtual("ageInMonths").get(function () {
  if (!this.dateOfBirth) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - this.dateOfBirth.getFullYear()) * 12 +
    (now.getMonth() - this.dateOfBirth.getMonth());
  return Math.max(0, months);
});

// ─── Virtual: Age band for dashboard grouping ───
childSchema.virtual("ageBand").get(function () {
  const months = this.ageInMonths;
  if (months === null) return "unknown";
  if (months <= 12) return "0-12 mo";
  if (months <= 24) return "13-24 mo";
  if (months <= 36) return "25-36 mo";
  if (months <= 48) return "37-48 mo";
  if (months <= 60) return "49-60 mo";
  return "61-72 mo";
});

// ─── Indexes for fast dashboard queries ───
childSchema.index({ centreId: 1, enrollmentStatus: 1 });
childSchema.index({ district: 1, "currentRisk.level": 1 });
childSchema.index({ "currentRisk.lastScreenedAt": -1 });
childSchema.index({ dateOfBirth: 1 });

module.exports = mongoose.model("Child", childSchema);

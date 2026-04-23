const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const AnganwadiCentre = sequelize.define(
  "AnganwadiCentre",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    centreCode: {
      // Unique AWC identifier e.g., "AWC-VIZ-0012"
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    // ─── Location Hierarchy (matches PPT's district/mandal/village drill-down) ───
    state: {
      type: DataTypes.STRING(50),
      defaultValue: "Andhra Pradesh",
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    mandal: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    village: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    // ─── Geolocation (for Leaflet.js heatmaps) ───
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },

    // ─── Capacity & Status ───
    capacity: {
      // Max children this centre can serve
      type: DataTypes.INTEGER,
      defaultValue: 40,
    },
    currentEnrollment: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // ─── Assigned Workers ───
    assignedAwwId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    assignedSupervisorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // ─── Performance Metrics (updated by aggregation jobs) ───
    screeningCoverage: {
      // Percentage of enrolled children screened
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    riskScore: {
      // Composite risk score for this centre (0-100)
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    riskLevel: {
      type: DataTypes.ENUM("low", "moderate", "high", "critical"),
      defaultValue: "low",
    },
  },
  {
    tableName: "anganwadi_centres",
    timestamps: true,
  }
);

module.exports = AnganwadiCentre;

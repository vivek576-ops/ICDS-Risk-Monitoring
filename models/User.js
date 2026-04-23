const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      // Matches the roles from your PPT: CDPO, Supervisor, AWW, ANM, ASHA, Parent, Admin
      type: DataTypes.ENUM(
        "admin",
        "cdpo",
        "supervisor",
        "aww",
        "anm",
        "asha",
        "parent"
      ),
      allowNull: false,
      defaultValue: "aww",
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mandal: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    centreId: {
      // Links to AnganwadiCentre
      type: DataTypes.UUID,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trainingCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    trainingMode: {
      type: DataTypes.ENUM("physical", "virtual", "hybrid", "none"),
      defaultValue: "none",
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        user.password = await bcrypt.hash(user.password, 12);
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

// Instance method to verify password
User.prototype.verifyPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip password from JSON output
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;

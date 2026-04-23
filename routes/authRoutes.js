const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticate, authorize, generateToken } = require("../middleware/auth");

// ─── POST /api/auth/register ───
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password, role, district, mandal, centreId } =
      req.body;

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || "aww",
      district,
      mandal,
      centreId,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/login ───
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user);

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/auth/me ───
router.get("/me", authenticate, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// ─── GET /api/auth/users (Admin only — workforce listing) ───
router.get(
  "/users",
  authenticate,
  authorize("admin", "cdpo"),
  async (req, res, next) => {
    try {
      const { role, district, trained } = req.query;
      const where = {};

      if (role) where.role = role;
      if (district) where.district = district;
      if (trained !== undefined) where.trainingCompleted = trained === "true";

      const users = await User.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });

      res.json({ success: true, count: users.length, data: users });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

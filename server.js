/**
 * ═══════════════════════════════════════════════════════════════
 * ICDS AI-Based Developmental Risk Monitoring System
 * Main Server Entry Point
 * ═══════════════════════════════════════════════════════════════
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectMongo, connectPostgres } = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ─── Security Middleware ───
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

// ─── Rate Limiting ───
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});
app.use("/api/", limiter);

// ─── Body Parsing ───
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ───
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ───
app.get("/api/health", (req, res) => {
  res.json({
    status: "running",
    name: "ICDS Risk Monitoring System",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───
const authRoutes = require("./routes/authRoutes");
const childRoutes = require("./routes/childRoutes");
const referralRoutes = require("./routes/referralRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/children", childRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ─── 404 Handler ───
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect both databases
    await connectMongo();
    await connectPostgres();

    app.listen(PORT, () => {
      console.log(`\n🚀 ICDS Server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`\n📋 API Endpoints:`);
      console.log(`   AUTH:       POST /api/auth/register, /api/auth/login, GET /api/auth/me`);
      console.log(`   CHILDREN:   CRUD /api/children, POST /api/children/:id/screen`);
      console.log(`   REFERRALS:  GET /api/referrals, PUT /api/referrals/:id/status`);
      console.log(`   DASHBOARD:  GET /api/dashboard/screening/kpis`);
      console.log(`               GET /api/dashboard/screening/monthly-trend`);
      console.log(`               GET /api/dashboard/risk/distribution`);
      console.log(`               GET /api/dashboard/risk/by-domain`);
      console.log(`               GET /api/dashboard/risk/by-age`);
      console.log(`               GET /api/dashboard/referrals/kpis`);
      console.log(`               GET /api/dashboard/referrals/monthly`);
      console.log(`               GET /api/dashboard/workforce/summary`);
      console.log(`               GET /api/dashboard/geo/centres`);
      console.log(`               GET /api/dashboard/geo/district-risk`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

/**
 * ADD THIS SECTION TO routes/dashboardRoutes.js
 * ───────────────────────────────────────────────
 * Paste this block BEFORE the module.exports line
 * Also add at the top: const { dbscan } = require("../utils/dbscan");
 */

// ─── GET /api/dashboard/geo/clusters — DBSCAN hotspot detection ───
router.get(
  "/geo/clusters",
  authenticate,
  authorize("admin", "cdpo", "supervisor"),
  async (req, res, next) => {
    try {
      const { minRiskScore = 40, epsilon = 25, minPoints = 3 } = req.query;

      // Fetch all high/critical centres from PostgreSQL
      const centres = await AnganwadiCentre.findAll({
        where: { isActive: true },
        attributes: [
          "id", "centreCode", "name", "district", "mandal",
          "latitude", "longitude", "riskScore", "riskLevel",
        ],
      });

      // Filter to concerning centres (above threshold)
      const concerningCentres = centres
        .filter(c => parseFloat(c.riskScore) >= parseFloat(minRiskScore))
        .map(c => ({
          id: c.id,
          centreCode: c.centreCode,
          name: c.name,
          district: c.district,
          mandal: c.mandal,
          lat: parseFloat(c.latitude),
          lng: parseFloat(c.longitude),
          riskScore: parseFloat(c.riskScore),
          riskLevel: c.riskLevel,
        }));

      // Run DBSCAN
      const { dbscan } = require("../utils/dbscan");
      const clusters = dbscan(
        concerningCentres,
        parseFloat(epsilon),
        parseInt(minPoints)
      );

      res.json({
        success: true,
        totalCentresAnalyzed: centres.length,
        concerningCentres: concerningCentres.length,
        clustersFound: clusters.length,
        epsilon: parseFloat(epsilon),
        minPoints: parseInt(minPoints),
        data: clusters,
      });
    } catch (error) {
      next(error);
    }
  }
);

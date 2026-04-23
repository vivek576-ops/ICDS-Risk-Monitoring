/**
 * ═══════════════════════════════════════════════════════════════
 * DBSCAN Spatial Clustering
 * Identifies hotspots of high-risk Anganwadi Centres
 * ═══════════════════════════════════════════════════════════════
 *
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Groups AWCs that are geographically close AND have high risk scores.
 *
 * Parameters:
 *   epsilon (ε) - max distance in km between points in same cluster
 *   minPoints   - minimum AWCs to form a cluster
 *
 * Used by: GET /api/dashboard/geo/clusters
 */

/**
 * Haversine formula - distance between two lat/lng points in km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find all points within epsilon distance of a given point
 */
function regionQuery(points, pointIdx, epsilon) {
  const neighbors = [];
  const { lat, lng } = points[pointIdx];
  for (let i = 0; i < points.length; i++) {
    if (haversineDistance(lat, lng, points[i].lat, points[i].lng) <= epsilon) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

/**
 * DBSCAN clustering algorithm
 * @param {Array} points - Array of {lat, lng, id, riskScore, riskLevel, ...}
 * @param {number} epsilon - Max distance in km (default: 25km)
 * @param {number} minPoints - Min points per cluster (default: 3)
 * @returns {Array} clusters - Array of cluster objects with member points
 */
function dbscan(points, epsilon = 25, minPoints = 3) {
  const UNVISITED = -1;
  const NOISE     = 0;

  const labels     = new Array(points.length).fill(UNVISITED);
  let   clusterId  = 0;

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = regionQuery(points, i, epsilon);

    if (neighbors.length < minPoints) {
      labels[i] = NOISE;
      continue;
    }

    clusterId++;
    labels[i] = clusterId;

    const seedSet = [...neighbors];
    let   si      = 0;

    while (si < seedSet.length) {
      const q = seedSet[si];

      if (labels[q] === NOISE) labels[q] = clusterId;

      if (labels[q] === UNVISITED) {
        labels[q] = clusterId;
        const qNeighbors = regionQuery(points, q, epsilon);
        if (qNeighbors.length >= minPoints) {
          seedSet.push(...qNeighbors.filter(n => !seedSet.includes(n)));
        }
      }
      si++;
    }
  }

  // Build cluster objects
  const clusterMap = {};
  for (let i = 0; i < points.length; i++) {
    const label = labels[i];
    if (label <= 0) continue; // Skip noise

    if (!clusterMap[label]) {
      clusterMap[label] = { clusterId: label, points: [], centroid: null };
    }
    clusterMap[label].points.push(points[i]);
  }

  // Calculate centroids and cluster stats
  const clusters = Object.values(clusterMap).map(cluster => {
    const lats = cluster.points.map(p => parseFloat(p.lat));
    const lngs = cluster.points.map(p => parseFloat(p.lng));
    const scores = cluster.points.map(p => parseFloat(p.riskScore || 0));

    const centroidLat = lats.reduce((s, v) => s + v, 0) / lats.length;
    const centroidLng = lngs.reduce((s, v) => s + v, 0) / lngs.length;
    const avgRisk     = scores.reduce((s, v) => s + v, 0) / scores.length;
    const maxRisk     = Math.max(...scores);

    const criticalCount  = cluster.points.filter(p => p.riskLevel === "critical").length;
    const highCount      = cluster.points.filter(p => p.riskLevel === "high").length;

    // Hotspot severity
    let severity = "moderate";
    if (criticalCount >= 2 || avgRisk >= 75) severity = "critical";
    else if (criticalCount >= 1 || highCount >= 3 || avgRisk >= 55) severity = "high";
    else if (avgRisk >= 35) severity = "moderate";
    else severity = "low";

    return {
      clusterId: cluster.clusterId,
      size: cluster.points.length,
      severity,
      avgRiskScore: Math.round(avgRisk * 10) / 10,
      maxRiskScore: Math.round(maxRisk * 10) / 10,
      criticalCount,
      highCount,
      centroid: {
        lat: Math.round(centroidLat * 10000) / 10000,
        lng: Math.round(centroidLng * 10000) / 10000,
      },
      districts: [...new Set(cluster.points.map(p => p.district))],
      mandals:   [...new Set(cluster.points.map(p => p.mandal))],
      centres: cluster.points.map(p => ({
        id: p.id,
        name: p.name,
        centreCode: p.centreCode,
        riskLevel: p.riskLevel,
        riskScore: p.riskScore,
        lat: p.lat,
        lng: p.lng,
      })),
    };
  });

  // Sort by severity then size
  const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
  clusters.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    b.size - a.size
  );

  return clusters;
}

module.exports = { dbscan, haversineDistance };

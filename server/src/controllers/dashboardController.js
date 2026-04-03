const Dataset = require('../models/Dataset');
const AnomalyResult = require('../models/AnomalyResult');
const TrafficRecord = require('../models/TrafficRecord');

// GET /api/dashboard/stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalDatasets,
      totalAnomalies,
      criticalCount,
      suspiciousCount,
      normalCount,
      recentAnomalies,
      hourlyAnomalies,
      protocolDist,
    ] = await Promise.all([
      Dataset.countDocuments({ status: 'ready' }),
      AnomalyResult.countDocuments(),
      AnomalyResult.countDocuments({ classification: 'critical' }),
      AnomalyResult.countDocuments({ classification: 'suspicious' }),
      AnomalyResult.countDocuments({ classification: 'normal' }),
      // Last 10 anomalies for live feed
      AnomalyResult.find({ isAnomaly: true })
        .sort({ detectedAt: -1 })
        .limit(10)
        .populate('datasetId', 'name source')
        .lean(),
      // Anomalies per hour for last 24h
      AnomalyResult.aggregate([
        {
          $match: {
            detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $hour: '$detectedAt' },
            count: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$classification', 'critical'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Protocol distribution
      AnomalyResult.aggregate([
        { $group: { _id: '$protocol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    // Build last 24h traffic timeline (hourly)
    const now = new Date();
    const trafficTimeline = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now);
      hour.setHours(now.getHours() - (23 - i), 0, 0, 0);
      const h = hour.getHours();
      const found = hourlyAnomalies.find((r) => r._id === h);
      return {
        hour: hour.toISOString(),
        label: `${String(h).padStart(2, '0')}:00`,
        anomalies: found?.count || 0,
        critical: found?.critical || 0,
      };
    });

    const modelAccuracy = totalAnomalies > 0
      ? Math.round((normalCount / totalAnomalies) * 100)
      : 100;

    res.json({
      kpis: {
        totalDatasets,
        totalAnomalies,
        criticalCount,
        suspiciousCount,
        normalCount,
        modelAccuracy,
      },
      recentAnomalies,
      trafficTimeline,
      protocolDistribution: protocolDist.map((p) => ({
        name: p._id || 'unknown',
        value: p.count,
      })),
      systemHealth: {
        database: 'online',
        mlService: 'checking',
        api: 'online',
      },
    });
  } catch (err) {
    next(err);
  }
};

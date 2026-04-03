const AuditLog = require('../models/AuditLog');

// GET /api/audit/logs (admin only)
exports.getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, action, from, to } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = new RegExp(action, 'i');
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'username email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
};

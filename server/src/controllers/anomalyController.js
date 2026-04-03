const AnomalyResult = require('../models/AnomalyResult');
const { createError } = require('../middleware/errorHandler');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const os = require('os');
const fs = require('fs');

// GET /api/anomalies
exports.listAnomalies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      risk,
      protocol,
      srcIp,
      dstIp,
      datasetId,
      status,
      from,
      to,
      sortBy = 'detectedAt',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (risk) filter.classification = risk;
    if (protocol) filter.protocol = new RegExp(protocol, 'i');
    if (srcIp) filter.srcIp = new RegExp(srcIp);
    if (dstIp) filter.dstIp = new RegExp(dstIp);
    if (datasetId) filter.datasetId = datasetId;
    if (status) filter.status = status;
    if (from || to) {
      filter.detectedAt = {};
      if (from) filter.detectedAt.$gte = new Date(from);
      if (to) filter.detectedAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [anomalies, total] = await Promise.all([
      AnomalyResult.find(filter)
        .populate('flaggedBy', 'username')
        .populate('datasetId', 'name source')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit)),
      AnomalyResult.countDocuments(filter),
    ]);

    res.json({
      anomalies,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/anomalies/export
exports.exportAnomalies = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.risk) filter.classification = req.query.risk;
    if (req.query.datasetId) filter.datasetId = req.query.datasetId;

    const anomalies = await AnomalyResult.find(filter).sort({ detectedAt: -1 }).limit(10000).lean();

    const tmpFile = path.join(os.tmpdir(), `anomalies_${Date.now()}.csv`);
    const writer = createObjectCsvWriter({
      path: tmpFile,
      header: [
        { id: '_id', title: 'ID' },
        { id: 'detectedAt', title: 'Timestamp' },
        { id: 'srcIp', title: 'Src IP' },
        { id: 'dstIp', title: 'Dst IP' },
        { id: 'protocol', title: 'Protocol' },
        { id: 'riskScore', title: 'Risk Score' },
        { id: 'classification', title: 'Classification' },
        { id: 'status', title: 'Status' },
        { id: 'analystNote', title: 'Analyst Note' },
      ],
    });

    await writer.writeRecords(anomalies);

    res.download(tmpFile, 'anomaly_export.csv', () => {
      fs.unlink(tmpFile, () => {});
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/anomalies/:id
exports.getById = async (req, res, next) => {
  try {
    const anomaly = await AnomalyResult.findById(req.params.id)
      .populate('flaggedBy', 'username email')
      .populate('datasetId', 'name source');
    if (!anomaly) throw createError(404, 'Anomaly not found', 'NOT_FOUND');
    res.json({ anomaly });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/anomalies/:id/flag
exports.flagAnomaly = async (req, res, next) => {
  try {
    const { analystNote, status } = req.body;
    const validStatuses = ['new', 'reviewed', 'confirmed', 'false_positive', 'escalated'];
    if (status && !validStatuses.includes(status)) {
      throw createError(400, `Invalid status. Choose from: ${validStatuses.join(', ')}`, 'INVALID_STATUS');
    }

    const anomaly = await AnomalyResult.findByIdAndUpdate(
      req.params.id,
      {
        ...(analystNote !== undefined && { analystNote }),
        ...(status && { status }),
        flaggedBy: req.user._id,
      },
      { new: true, runValidators: true }
    ).populate('flaggedBy', 'username');

    if (!anomaly) throw createError(404, 'Anomaly not found', 'NOT_FOUND');
    res.json({ anomaly });
  } catch (err) {
    next(err);
  }
};

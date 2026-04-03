const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const readline = require('readline');
const Dataset = require('../models/Dataset');
const TrafficRecord = require('../models/TrafficRecord');
const { createError } = require('../middleware/errorHandler');

// POST /api/dataset/upload
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError(400, 'No file provided', 'NO_FILE');
    }
    const { source, name } = req.body;
    if (!source || !['UNSW-NB15', 'NSL-KDD', 'CICIDS'].includes(source)) {
      fs.unlinkSync(req.file.path);
      throw createError(400, 'Invalid or missing dataset source. Choose: UNSW-NB15, NSL-KDD, CICIDS', 'INVALID_SOURCE');
    }

    // Quick row count
    const rowCount = await countCSVRows(req.file.path);

    const dataset = await Dataset.create({
      name: name || req.file.originalname,
      source,
      uploadedBy: req.user._id,
      filePath: req.file.path,
      fileSize: req.file.size,
      recordCount: Math.max(0, rowCount - 1), // exclude header
      status: 'ready',
    });

    res.status(201).json({
      message: 'Dataset uploaded successfully',
      dataset,
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(err);
  }
};

// GET /api/dataset
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [datasets, total] = await Promise.all([
      Dataset.find()
        .populate('uploadedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dataset.countDocuments(),
    ]);

    res.json({ datasets, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/dataset/:id
exports.getById = async (req, res, next) => {
  try {
    const dataset = await Dataset.findById(req.params.id).populate('uploadedBy', 'username email');
    if (!dataset) throw createError(404, 'Dataset not found', 'NOT_FOUND');
    res.json({ dataset });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dataset/:id
exports.deleteById = async (req, res, next) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    if (!dataset) throw createError(404, 'Dataset not found', 'NOT_FOUND');

    // Remove file from disk
    if (dataset.filePath && fs.existsSync(dataset.filePath)) {
      fs.unlinkSync(dataset.filePath);
    }

    // Remove associated traffic records
    await TrafficRecord.deleteMany({ datasetId: dataset._id });
    await dataset.deleteOne();

    res.json({ message: 'Dataset deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Helper: count lines in CSV
function countCSVRows(filePath) {
  return new Promise((resolve) => {
    let count = 0;
    const rl = readline.createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', () => count++);
    rl.on('close', () => resolve(count));
    rl.on('error', () => resolve(0));
  });
}

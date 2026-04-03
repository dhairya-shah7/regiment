const { v4: uuidv4 } = require('uuid');
const Dataset = require('../models/Dataset');
const AnomalyResult = require('../models/AnomalyResult');
const { createError } = require('../middleware/errorHandler');
const mlClient = require('../utils/mlClient');
const { jobQueue, updateJob, getJob } = require('../utils/jobQueue');
const { emitToAll, emitAnalysisProgress, emitAnomalyNew } = require('../utils/socketManager');

// POST /api/analysis/run/:datasetId
exports.runAnalysis = async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    const { modelType = 'isolation_forest', contamination = 0.1 } = req.body;

    const dataset = await Dataset.findById(datasetId);
    if (!dataset) throw createError(404, 'Dataset not found', 'DATASET_NOT_FOUND');
    if (dataset.status !== 'ready') {
      throw createError(409, `Dataset status is '${dataset.status}'. Only 'ready' datasets can be analyzed.`, 'DATASET_NOT_READY');
    }
    if (!dataset.filePath) {
      throw createError(400, 'Dataset has no file path', 'NO_FILE');
    }

    const jobId = uuidv4();
    jobQueue.set(jobId, {
      jobId,
      status: 'queued',
      percent: 0,
      stage: 'Queued',
      datasetId: datasetId.toString(),
      modelType,
      contamination,
      startedAt: new Date(),
      resultCount: 0,
      criticalCount: 0,
    });

    res.status(202).json({ jobId, status: 'queued', message: 'Analysis job queued' });

    // Fire and forget — run in background
    runAnalysisJob(jobId, dataset, modelType, contamination, req.user._id).catch((err) => {
      console.error(`[Analysis] Job ${jobId} failed:`, err.message);
      updateJob(jobId, { status: 'failed', stage: err.message });
      emitAnalysisProgress(jobId, 0, `Failed: ${err.message}`, 'failed');
    });
  } catch (err) {
    next(err);
  }
};

async function runAnalysisJob(jobId, dataset, modelType, contamination, userId) {
  const { default: FormData } = await import('form-data');
  const fs = require('fs');

  updateJob(jobId, { status: 'running', percent: 5, stage: 'Sending to ML service' });
  emitAnalysisProgress(jobId, 5, 'Sending to ML service');

  // Build multipart form for ML service
  const form = new FormData();
  form.append('file', fs.createReadStream(dataset.filePath), {
    filename: 'dataset.csv',
    contentType: 'text/csv',
  });

  updateJob(jobId, { percent: 15, stage: 'Training model' });
  emitAnalysisProgress(jobId, 15, 'Training model');

  // Submit to ML service
  const trainResp = await mlClient.post('/ml/train', form, {
    headers: form.getHeaders(),
    params: {
      dataset_source: dataset.source,
      model_type: modelType,
      contamination,
      dataset_id: dataset._id.toString(),
    },
    timeout: 300000, // 5 min
  });

  const mlJobId = trainResp.data.job_id;
  updateJob(jobId, { percent: 25, stage: 'Waiting for ML training', mlJobId });

  // Poll ML service for completion
  let mlResult = null;
  for (let attempt = 0; attempt < 180; attempt++) {
    await sleep(2000);
    const statusResp = await mlClient.get(`/ml/train/${mlJobId}/status`);
    const { status, progress, result } = statusResp.data;

    const mapped = 25 + Math.round((progress || 0) * 0.6);
    updateJob(jobId, { percent: mapped, stage: `ML: ${status}` });
    emitAnalysisProgress(jobId, mapped, `ML training: ${status}`);

    if (status === 'complete') {
      mlResult = result;
      break;
    }
    if (status === 'failed') {
      throw createError(500, statusResp.data.message || 'ML training failed', 'ML_FAILED');
    }
  }

  if (!mlResult) throw createError(504, 'ML training timed out', 'ML_TIMEOUT');

  updateJob(jobId, { percent: 88, stage: 'Storing results' });
  emitAnalysisProgress(jobId, 88, 'Storing anomaly results');

  // Store top-level summary as anomaly result placeholders
  // (Detailed per-record results need separate predict step)
  const summaryAnomaly = await AnomalyResult.create({
    datasetId: dataset._id,
    jobId,
    modelId: mlResult.model_id,
    riskScore: mlResult.anomaly_count / Math.max(mlResult.total_records, 1),
    classification: mlResult.critical_count > 0 ? 'critical' : mlResult.anomaly_count > 0 ? 'suspicious' : 'normal',
    confidence: mlResult.accuracy_estimate / 100,
    isAnomaly: mlResult.anomaly_count > 0,
    srcIp: 'dataset-summary',
    dstIp: 'dataset-summary',
    protocol: 'mixed',
    status: 'new',
  });

  // Update dataset analysis count
  await Dataset.findByIdAndUpdate(dataset._id, {
    analysisCount: { $inc: 1 },
    lastAnalyzedAt: new Date(),
  });

  const finalResult = {
    resultCount: mlResult.total_records,
    criticalCount: mlResult.critical_count,
    suspiciousCount: mlResult.suspicious_count,
    normalCount: mlResult.normal_count,
    modelId: mlResult.model_id,
    accuracyEstimate: mlResult.accuracy_estimate,
  };

  updateJob(jobId, {
    status: 'complete',
    percent: 100,
    stage: 'Complete',
    result: finalResult,
    completedAt: new Date(),
    resultCount: mlResult.total_records,
    criticalCount: mlResult.critical_count,
  });

  emitToAll('analysis:complete', { jobId, ...finalResult });
  if (mlResult.critical_count > 0) {
    emitToAll('system:alert', {
      level: 'critical',
      message: `Analysis complete: ${mlResult.critical_count} critical anomalies detected in dataset "${dataset.name}"`,
    });
    emitAnomalyNew(summaryAnomaly);
  }
}

// GET /api/analysis/:jobId/status
exports.getJobStatus = (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND' });
  res.json({ job });
};

// GET /api/analysis/:jobId/results
exports.getJobResults = async (req, res, next) => {
  try {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND' });

    const anomalies = await AnomalyResult.find({ jobId: req.params.jobId }).sort({ riskScore: -1 }).limit(200);

    res.json({ job, anomalies });
  } catch (err) {
    next(err);
  }
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

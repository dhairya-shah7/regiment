const router = require('express').Router();
const ctrl = require('../controllers/analysisController');
const { verifyToken, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.post('/run/:datasetId', verifyToken, requireRole('admin', 'analyst'), audit('analysis.run'), ctrl.runAnalysis);
router.get('/:jobId/status',   verifyToken, ctrl.getJobStatus);
router.get('/:jobId/results',  verifyToken, ctrl.getJobResults);

module.exports = router;

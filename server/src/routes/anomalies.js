const router = require('express').Router();
const ctrl = require('../controllers/anomalyController');
const { verifyToken, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.get('/export', verifyToken, ctrl.exportAnomalies);
router.get('/',             verifyToken, ctrl.listAnomalies);
router.get('/:id',          verifyToken, ctrl.getById);
router.patch('/:id/flag',   verifyToken, requireRole('admin', 'analyst'), audit('anomaly.flag'), ctrl.flagAnomaly);

module.exports = router;

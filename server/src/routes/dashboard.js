const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

router.get('/stats', verifyToken, ctrl.getStats);

module.exports = router;

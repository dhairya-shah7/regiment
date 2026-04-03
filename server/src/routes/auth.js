const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { verifyToken, requireRole, verifyRefreshToken } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.post('/register', audit('auth.register'), ctrl.register);
router.post('/login',    audit('auth.login'),    ctrl.login);
router.post('/logout',   verifyToken,            audit('auth.logout'), ctrl.logout);
router.post('/refresh',  verifyRefreshToken,     ctrl.refresh);
router.get('/me',        verifyToken,            ctrl.me);

// Admin user management
router.get('/users',     verifyToken, requireRole('admin'), ctrl.getUsers);
router.patch('/users/:id', verifyToken, requireRole('admin'), audit('user.update'), ctrl.updateUser);

module.exports = router;

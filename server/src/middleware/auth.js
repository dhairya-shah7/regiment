const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT token verification middleware.
 * Attaches req.user on success, throws 401 on failure.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive', code: 'INVALID_TOKEN' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin', 'analyst')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'NOT_AUTHENTICATED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'FORBIDDEN',
        yourRole: req.user.role,
      });
    }
    next();
  };
};

/**
 * Verify refresh token from HTTP-only cookie.
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token missing', code: 'NO_REFRESH_TOKEN' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token expired or invalid', code: 'REFRESH_TOKEN_INVALID' });
  }
};

module.exports = { verifyToken, requireRole, verifyRefreshToken };

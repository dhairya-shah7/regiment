const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

const generateTokens = (user) => {
  const payload = { id: user._id, role: user.role, email: user.email };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw createError(400, 'username, email and password are required', 'MISSING_FIELDS');
    }
    if (password.length < 8) {
      throw createError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // First user gets admin role
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'viewer';

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ username, email, passwordHash, role });

    const { accessToken, refreshToken } = generateTokens(user);
    await User.findByIdAndUpdate(user._id, { refreshToken, lastLogin: new Date() });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw createError(400, 'Email and password required', 'MISSING_FIELDS');
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw createError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw createError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await User.findByIdAndUpdate(user._id, { refreshToken, lastLogin: new Date() });
    setRefreshCookie(res, refreshToken);

    res.json({
      message: 'Login successful',
      user: { id: user._id, username: user.username, email: user.email, role: user.role, clearanceLevel: user.clearanceLevel },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const user = req.user; // injected by verifyRefreshToken middleware
    const { accessToken, refreshToken } = generateTokens(user);
    await User.findByIdAndUpdate(user._id, { refreshToken });
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user });
};

// GET /api/auth/users (admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash -refreshToken').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/users/:id (admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { role, clearanceLevel, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }), ...(clearanceLevel && { clearanceLevel }), ...(isActive !== undefined && { isActive }) },
      { new: true, runValidators: true }
    );
    if (!user) throw createError(404, 'User not found', 'USER_NOT_FOUND');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

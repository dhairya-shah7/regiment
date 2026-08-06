const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.COOKIE_SAME_SITE || '').trim().toLowerCase() || (isProduction ? 'none' : 'lax');
  const secure = String(process.env.COOKIE_SECURE || '').trim().toLowerCase() === 'true'
    || (isProduction && sameSite === 'none');

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

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
  res.cookie('refreshToken', token, getRefreshCookieOptions());
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : req.body.username;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
      throw createError(400, 'username, email and password are required', 'MISSING_FIELDS');
    }
    if (password.length < 8) {
      throw createError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    // First user gets admin role, all subsequent default to analyst
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'analyst';

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

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    if (!email) {
      throw createError(400, 'Email address is required', 'MISSING_EMAIL');
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if email not found to prevent user enumeration
      return res.json({ message: 'If an account exists for this email, a reset OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(user._id, {
      resetPasswordOTP: otpHash,
      resetPasswordExpires: otpExpires,
    });

    const emailService = require('../utils/emailService');
    await emailService.sendOTPEmail(email, otpCode);

    res.json({ message: 'Password reset OTP has been sent to your email.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      throw createError(400, 'Email and OTP code are required', 'MISSING_FIELDS');
    }

    const user = await User.findOne({ email }).select('+resetPasswordOTP');
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      throw createError(400, 'Invalid or expired OTP code', 'INVALID_OTP');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw createError(400, 'OTP code has expired. Please request a new code.', 'OTP_EXPIRED');
    }

    const isValid = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isValid) {
      throw createError(400, 'Incorrect OTP security code', 'INVALID_OTP');
    }

    res.json({ message: 'OTP verified successfully', valid: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    const otp = String(req.body.otp || '').trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      throw createError(400, 'Email, OTP, and new password are required', 'MISSING_FIELDS');
    }
    if (newPassword.length < 8) {
      throw createError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const user = await User.findOne({ email }).select('+resetPasswordOTP');
    if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
      throw createError(400, 'Invalid or expired OTP code', 'INVALID_OTP');
    }

    if (new Date() > user.resetPasswordExpires) {
      throw createError(400, 'OTP code has expired. Please request a new code.', 'OTP_EXPIRED');
    }

    const isValid = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isValid) {
      throw createError(400, 'Incorrect OTP security code', 'INVALID_OTP');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    res.json({ message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    const password = req.body.password;
    if (!email || !password) {
      throw createError(400, 'Email and password required', 'MISSING_FIELDS');
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw createError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const retryAfterMs = user.lockUntil.getTime() - Date.now();
      throw createError(423, `Account temporarily locked. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).`, 'ACCOUNT_LOCKED');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const loginAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = loginAttempts >= MAX_LOGIN_ATTEMPTS;
      await User.findByIdAndUpdate(user._id, {
        loginAttempts,
        ...(shouldLock ? { lockUntil: new Date(Date.now() + LOCK_TIME_MS) } : {}),
      });
      throw createError(401, 'Invalid email or password. Please check your credentials.', 'INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await User.findByIdAndUpdate(user._id, {
      refreshToken,
      lastLogin: new Date(),
      loginAttempts: 0,
      lockUntil: null,
    });
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
    res.clearCookie('refreshToken', getRefreshCookieOptions());
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
    await User.findByIdAndUpdate(user._id, {
      refreshToken,
      loginAttempts: 0,
      lockUntil: null,
    });
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

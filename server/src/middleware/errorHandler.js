/**
 * Central error handler for Express.
 * Must be the last middleware registered with app.use().
 */
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: messages.join('. '),
      code: 'VALIDATION_ERROR',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      error: `${field || 'Field'} already exists`,
      code: 'DUPLICATE_KEY',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }

  // Cast error (invalid MongoDB ID)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ID: ${err.value}`, code: 'INVALID_ID' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  console.error(`[Error] ${statusCode} ${code}: ${message}`, isDev ? err.stack : '');

  res.status(statusCode).json({
    error: message,
    code,
    ...(isDev && { stack: err.stack }),
  });
};

/**
 * Convenience helper to create structured errors.
 * Usage: throw createError(404, 'Not found', 'RESOURCE_NOT_FOUND')
 */
const createError = (statusCode, message, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

module.exports = errorHandler;
module.exports.createError = createError;

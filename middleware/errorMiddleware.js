const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  // Set default values for statusCode and status if not provided
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development mode (or any custom logging level you may want)
  if (process.env.NODE_ENV === 'development') {
    // In dev, log full error details including stack trace
    logger.error(
      `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip} - Stack: ${err.stack}`
    );
  } else {
    // In production, avoid full stack trace but log message, status, and URL
    logger.error(
      `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`
    );
  }

  // Send error response to client
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // If in development mode, include the stack trace
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

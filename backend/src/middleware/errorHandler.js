const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  // Mongo duplicate key error -> the partial unique index catching a double-booking race.
  if (err.code === 11000) {
    logger.warn('Duplicate key conflict (likely double-booking race caught at DB level)', {
      keyValue: err.keyValue,
    });
    return res.status(409).json({
      message: 'This slot was just booked by someone else. Please choose another slot.',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}: ${err.value}` });
  }

  logger.error(err.message, { stack: err.stack });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };

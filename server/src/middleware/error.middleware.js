import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  
  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled server error');
  } else {
    logger.warn({ err: err.message, statusCode }, 'Client request error');
  }

  return res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'An unexpected error occurred',
    },
  });
};

import { checkDatabaseReadiness } from '../db/index.js';
import { logger } from '../config/logger.js';

export const getLiveness = (req, res) => {
  return res.status(200).json({ status: 'live' });
};

export const getReadiness = async (req, res) => {
  try {
    await checkDatabaseReadiness();
    return res.status(200).json({ status: 'ready' });
  } catch (err) {
    logger.warn({ err: err.message }, 'Database readiness check failed');
    return res.status(503).json({
      status: 'not_ready',
      error: 'Database connection failed',
    });
  }
};

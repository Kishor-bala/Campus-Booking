import { pool } from '../db/index.js';

export const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User no longer exists',
        },
      });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (allowedRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    if (req.user.role !== allowedRole) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. ${allowedRole} role required.`,
        },
      });
    }

    next();
  };
};

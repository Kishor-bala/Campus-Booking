import crypto from 'crypto';

export const generateCsrfToken = (req) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
};

export const csrfProtection = (req, res, next) => {
  // Allow safe read-only HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'];
  const sessionToken = req.session ? req.session.csrfToken : null;

  if (!clientToken || !sessionToken || clientToken !== sessionToken) {
    return res.status(403).json({
      error: {
        code: 'CSRF_ERROR',
        message: 'Invalid or missing CSRF token',
      },
    });
  }

  next();
};

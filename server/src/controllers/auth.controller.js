import argon2 from 'argon2';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../db/index.js';
import { sendWelcomeEmail, sendOtpEmail } from '../services/mailer.service.js';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otpCode: z.string().length(6),
});

export const register = async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration input',
          details: parseResult.error.errors,
        },
      });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const role = 'STUDENT';

    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash, role]
    );

    const newUser = insertResult.rows[0];

    // Asynchronously send welcome email
    sendWelcomeEmail({ email: newUser.email, name: newUser.name });

    return res.status(201).json({
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login credentials format',
        },
      });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Verify email and password against PostgreSQL database
    const userRes = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account found with this email address. Please check your email or register.',
        },
      });
    }

    const user = userRes.rows[0];
    const passwordValid = await argon2.verify(user.password_hash, password);

    if (!passwordValid) {
      return res.status(401).json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Incorrect password. Please try again.',
        },
      });
    }

    // Generate 6-digit numeric OTP code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Store pending OTP state in session
    req.session.pendingOtp = {
      code: otpCode,
      expiresAt,
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    // Dispatch 2FA OTP Email via Nodemailer SMTP
    sendOtpEmail({
      email: user.email,
      name: user.name,
      otpCode,
    });

    return res.status(200).json({
      data: {
        requiresOtp: true,
        email: user.email,
        message: `OTP code sent to ${user.email}. Valid for 5 minutes.`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'OTP code must be a 6-digit number',
        },
      });
    }

    const { email, otpCode } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const pending = req.session.pendingOtp;

    if (!pending || pending.email !== normalizedEmail) {
      return res.status(400).json({
        error: {
          code: 'NO_PENDING_OTP',
          message: 'No login session pending OTP verification. Please sign in again.',
        },
      });
    }

    if (Date.now() > pending.expiresAt) {
      delete req.session.pendingOtp;
      return res.status(400).json({
        error: {
          code: 'OTP_EXPIRED',
          message: 'OTP verification code has expired. Please request a new one.',
        },
      });
    }

    if (pending.code !== otpCode) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: 'Incorrect OTP code. Please try again.',
        },
      });
    }

    // OTP Validated Successfully! Establish full user session
    const userId = pending.userId;
    delete req.session.pendingOtp;

    req.session.regenerate(async (err) => {
      if (err) return next(err);

      req.session.userId = userId;

      const userRes = await pool.query(
        'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      const user = userRes.rows[0];

      return res.status(200).json({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    });
  } catch (err) {
    next(err);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const pending = req.session.pendingOtp;
    if (!pending) {
      return res.status(400).json({
        error: {
          code: 'NO_PENDING_OTP',
          message: 'No active session pending OTP verification.',
        },
      });
    }

    const newOtpCode = crypto.randomInt(100000, 999999).toString();
    pending.code = newOtpCode;
    pending.expiresAt = Date.now() + 5 * 60 * 1000;

    sendOtpEmail({
      email: pending.email,
      name: pending.name,
      otpCode: newOtpCode,
    });

    return res.status(200).json({
      data: {
        message: 'A new 6-digit OTP code has been sent to your email.',
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getCsrfTokenController = (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return res.status(200).json({
    data: {
      csrfToken: req.session.csrfToken,
    },
  });
};

export const me = (req, res) => {
  return res.status(200).json({
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.created_at,
    },
  });
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Failed to destroy session',
        },
      });
    }
    res.clearCookie('campus_session');
    return res.status(200).json({
      data: {
        message: 'Logged out successfully',
      },
    });
  });
};

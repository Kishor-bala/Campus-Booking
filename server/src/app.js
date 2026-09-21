import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import { config } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import { sessionMiddleware } from './middleware/session.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { requireAuth, requireRole } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Trust reverse proxy (essential for secure cookies on Vercel, Heroku, AWS)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible client SPA embedding
}));

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin, configured origin, localhost, or any vercel.app preview deployment
    if (!origin || origin === config.appOrigin || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

app.use(express.json());
app.use(pinoHttp({ logger }));

// Session Middleware
app.use(sessionMiddleware);

// Serverless URL normalizer: ensure req.url starts with /api for routing consistency
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Mount API Endpoints
app.use('/api/health', healthRoutes);
app.use('/api', csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api', resourceRoutes);
app.use('/api', bookingRoutes);

// Test Admin Route
app.get('/api/admin/test-protection', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({ data: { message: 'Admin access granted' } });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;

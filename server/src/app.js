import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import { sessionMiddleware } from './middleware/session.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { requireAuth, requireRole } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Session Middleware
app.use(sessionMiddleware);

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

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/campus_booking_dev',
  sessionSecret: process.env.SESSION_SECRET || 'fallback_development_session_secret_32chars',
};

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from the monorepo root (two levels up from server/src/config/)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL,
  migrationDatabaseUrl: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,

  // Session
  sessionSecret: process.env.SESSION_SECRET,

  // Seed admin
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL,
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD,

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.MAIL_FROM_NAME || 'Campus Resource Booking',
    fromAddress: process.env.MAIL_FROM_ADDRESS,
  },

  // Cron & tokens
  reminderCronInterval: process.env.REMINDER_CRON_INTERVAL || '*/5 * * * *',
  checkinTokenSecret: process.env.CHECKIN_TOKEN_SECRET,
};

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/index.js';
import { config } from '../config/env.js';

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false, // Created via versioned migrations
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'campus_session',
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

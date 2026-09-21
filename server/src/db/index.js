import pg from 'pg';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

// Detect whether to enforce SSL (required for Neon, Supabase, and cloud DBs)
const isRemoteOrProd =
  config.nodeEnv === 'production' ||
  (config.databaseUrl &&
    !config.databaseUrl.includes('localhost') &&
    !config.databaseUrl.includes('127.0.0.1'));

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isRemoteOrProd ? { rejectUnauthorized: false } : false,
  max: config.nodeEnv === 'production' ? 10 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});

export const checkDatabaseReadiness = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
};

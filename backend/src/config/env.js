import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized environment validation for predictable failures at startup.
 */
const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set. Set it in .env for production.`);
  }
}

export const config = {
  // Default 5050: macOS often binds AirPlay Receiver to 5000 (EADDRINUSE).
  port: Number(process.env.PORT) || 5050,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  fastApiUrl: process.env.FASTAPI_URL || 'http://127.0.0.1:8000',
  fastApiTimeoutMs: Number(process.env.FASTAPI_TIMEOUT_MS) || 120000,
};

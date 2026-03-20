import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Adrena Data API
  ADRENA_API_BASE_URL: z.string().url().default('https://datapi.adrena.trade'),

  // Adrena Competition Service API
  ADRENA_COMPETITION_API_URL: z.string().url().default('https://adrena-competition-service.onrender.com'),
  ADRENA_COMPETITION_API_KEY: z.string().min(1, 'ADRENA_COMPETITION_API_KEY is required'),

  // Solana
  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),

  // Treasury
  TREASURY_WALLET: z.string().min(32).optional(),

  // Admin wallets (comma-separated)
  ADMIN_WALLETS: z.string().transform(val => val.split(',').map(w => w.trim())),

  // Server
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS (comma-separated origins for production)
  CORS_ORIGIN: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

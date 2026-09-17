import { registerAs } from '@nestjs/config';

const DEFAULT_CORS_ORIGINS = ['http://localhost:3000', 'https://rupayaidwebapp.vercel.app'];

export function parseCorsOrigins(raw?: string): string[] {
  const fromEnv = (raw || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_CORS_ORIGINS])];
}

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN)[0],
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  isProduction: process.env.NODE_ENV === 'production',
}));

export const APP_CONFIG_KEY = 'app';

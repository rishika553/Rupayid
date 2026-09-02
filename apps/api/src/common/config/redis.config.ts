import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  isConfigured: !!process.env.REDIS_URL,
}));

export const REDIS_CONFIG_KEY = 'redis';

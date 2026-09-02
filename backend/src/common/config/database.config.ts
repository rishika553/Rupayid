import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const DATABASE_CONFIG_KEY = 'database';

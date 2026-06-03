import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  databaseUrl: process.env.DATABASE_URL || '',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/agritrace_logs',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  checkvn: {
    apiUrl: process.env.CHECKVN_API_URL || 'https://api.checkvn.vn/v1',
    apiKey: process.env.CHECKVN_API_KEY || '',
    webhookSecret: process.env.CHECKVN_WEBHOOK_SECRET || '',
  },
  meili: {
    host: process.env.MEILI_HOST || 'http://localhost:7700',
    masterKey: process.env.MEILI_MASTER_KEY || '',
  },
  bullRedisUrl: process.env.BULL_REDIS_URL || 'redis://localhost:6379',
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
  },
};
export default config;

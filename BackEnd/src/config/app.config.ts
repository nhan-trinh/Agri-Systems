import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/agritrace_logs',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  zalo: {
    appId: process.env.ZALO_APP_ID || '',
    appSecret: process.env.ZALO_APP_SECRET || '',
    oauthUrl: process.env.ZALO_OAUTH_URL || 'https://oauth.zaloapp.com/v4/oa/access_token',
    graphApiUrl: process.env.ZALO_GRAPH_API_URL || 'https://graph.zalo.me/v2.0/me',
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
    // 'local' (dev) | 'r2' (Cloudflare R2, S3-compatible) | 's3' (alias of r2)
    type: process.env.STORAGE_TYPE || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    r2: {
      // Cloudflare R2 — S3-compatible. Endpoint is derived from accountId.
      accountId: process.env.R2_ACCOUNT_ID || '',
      bucket: process.env.R2_BUCKET || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      // Optional custom domain / public base URL (for non-presigned URLs). Private by default.
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || '',
      // Presigned URL lifetime in seconds (default 15 min).
      presignExpirySec: parseInt(process.env.R2_PRESIGN_EXPIRY_SEC || '900', 10),
    },
  },
  ocr: {
    // 'stub' = deterministic mock (pilot/demo). 'google' = future Google Vision + Gemini.
    provider: process.env.OCR_PROVIDER || 'stub',
    maxFileSizeMb: parseInt(process.env.OCR_MAX_FILE_MB || '10', 10),
    maxFilesPerBatch: parseInt(process.env.OCR_MAX_FILES || '10', 10),
    google: {
      // Reserved for the future Google Vision + Gemini provider (not wired yet).
      visionCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
    },
  },
};
export default config;

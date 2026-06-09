import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import app from './app';
import config from './config/app.config';
import prisma from './prisma/client';
import mongoose from 'mongoose';
import { getRedisClient, disconnectRedis } from './shared/utils/redis.client';

const startServer = async () => {
  // ✅ Connect DB trước, listen sau
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected');

    await mongoose.connect(config.mongoUrl);
    console.log('MongoDB connected');

    await getRedisClient();
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1); // không chạy nếu DB lỗi
  }

  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} on port ${config.port}`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down...`);

    // ✅ Timeout 10s phòng trường hợp treo
    const forceExit = setTimeout(() => {
      console.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000);

    server.close(async () => {
      try {
        await Promise.all([
          prisma.$disconnect(),
          mongoose.disconnect(),
          disconnectRedis(),
        ]);
        console.log('All connections closed.');
      } catch (err) {
        console.error('Error during shutdown:', err);
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
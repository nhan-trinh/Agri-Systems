import app from './app';
import config from './config/app.config';
import prisma from './prisma/client';
import mongoose from 'mongoose';
import { getRedisClient, disconnectRedis } from './shared/utils/redis.client';

const server = app.listen(config.port, async () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
  
  // Connect to PostgreSQL
  try {
    await prisma.$connect();
    console.log('PostgreSQL Database connected successfully via Prisma');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL Database:', error);
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUrl);
    console.log('MongoDB connected successfully via Mongoose');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }

  // Connect to Redis
  try {
    await getRedisClient();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
});

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      await mongoose.disconnect();
      await disconnectRedis();
      console.log('Database connections closed.');
    } catch (error) {
      console.error('Error during database disconnection:', error);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

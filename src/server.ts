import app from './app';
import config from './config/app.config';
import prisma from './prisma/client';

const server = app.listen(config.port, async () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
  try {
    await prisma.$connect();
    console.log('PostgreSQL Database connected successfully via Prisma');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL Database:', error);
  }
});

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

import { createClient, RedisClientType } from 'redis';
import config from '../../config/app.config';

let redisClient: RedisClientType;
let isConnected = false;

/**
 * Get or create a singleton Redis client.
 * Uses the REDIS_URL from environment config.
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (isConnected && redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: config.redisUrl,
  }) as RedisClientType;

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });

  await redisClient.connect();
  isConnected = true;

  return redisClient;
};

/**
 * Disconnect Redis client gracefully.
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && isConnected) {
    await redisClient.disconnect();
    isConnected = false;
    console.log('Redis disconnected');
  }
};

export default getRedisClient;

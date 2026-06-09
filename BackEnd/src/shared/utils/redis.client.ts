import { createClient, RedisClientType } from 'redis';
import config from '../../config/app.config';

let redisClient: RedisClientType | null = null;
let connectingPromise: Promise<RedisClientType> | null = null; // chống race condition

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient?.isReady) return redisClient;

  // Nếu đang trong quá trình connect thì chờ, không tạo client mới
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    redisClient = createClient({ url: config.redisUrl }) as RedisClientType;

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    redisClient.on('reconnecting', () => {
      console.warn('Redis reconnecting...');
    });

    await redisClient.connect();
    console.log('Redis connected successfully');
    connectingPromise = null;
    return redisClient;
  })();

  return connectingPromise;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient?.isReady) {
    await redisClient.disconnect();
    redisClient = null;
    console.log('Redis disconnected');
  }
};

export default getRedisClient;
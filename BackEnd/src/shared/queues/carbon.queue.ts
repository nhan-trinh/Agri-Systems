import { Queue, ConnectionOptions } from 'bullmq';
import { URL } from 'url';
import config from '../../config/app.config';

const redisUrlObj = new URL(config.redisUrl);
export const bullConnection: ConnectionOptions = {
  host: redisUrlObj.hostname || 'localhost',
  port: parseInt(redisUrlObj.port || '6379', 10),
  username: redisUrlObj.username || undefined,
  password: redisUrlObj.password || undefined,
};

// Queue instances with standard retry policies (3 attempts, exponential backoff)
export const carbonCalculationQueue = new Queue('carbon-calculation-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const carbonCertificateQueue = new Queue('carbon-certificate-queue', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

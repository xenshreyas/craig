import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || (process.env.container === 'docker' ? 'redis' : 'localhost'),
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  keyPrefix: 'craig:',
  lazyConnect: true
});

export default redis;

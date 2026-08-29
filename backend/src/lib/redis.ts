import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

let redisUrl = process.env.REDIS_URL;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const urlObj = new URL(process.env.UPSTASH_REDIS_REST_URL);
  const hostname = urlObj.hostname;
  redisUrl = `rediss://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@${hostname}:6379`;
}

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const connection = redisUrl 
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    });

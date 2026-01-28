import { Redis } from "ioredis";

// Lazy initialization to avoid build-time errors
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not defined");
    }

    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      redis?.quit();
    });

    process.on("SIGINT", () => {
      redis?.quit();
    });
  }

  return redis;
}

// For backwards compatibility - but this should only be used at runtime
export { redis };

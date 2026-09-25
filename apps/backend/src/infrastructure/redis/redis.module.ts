import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { CacheService } from './cache.service.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { REDIS_CLIENT, type RedisClient } from './redis.constants.js';

const logger = new Logger('Redis');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const client = createClient({
          url: config.getOrThrow<string>('REDIS_URL'),
          // Fail fast while disconnected so callers can apply their own fallback policy.
          disableOfflineQueue: true,
          socket: {
            connectTimeout: 5_000,
            reconnectStrategy: (retries) => Math.min(retries * 200, 5_000),
          },
        });

        client.on('error', (error: Error) =>
          logger.warn(`Redis error: ${error.message}`),
        );

        await client.connect();

        return client;
      },
    },
    CacheService,
    RateLimiterService,
  ],
  exports: [REDIS_CLIENT, CacheService, RateLimiterService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

  async onApplicationShutdown() {
    if (this.client.isOpen) {
      await this.client.close();
    }
  }
}

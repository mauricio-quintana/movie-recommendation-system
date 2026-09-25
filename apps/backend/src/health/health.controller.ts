import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../infrastructure/redis/redis.constants.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaClient,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'API liveness and dependency checks' })
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.ping('database', () => this.prisma.$queryRaw`SELECT 1`),
      () => this.ping('redis', () => this.redis.ping()),
    ]);
  }

  private async ping<const Key extends string>(
    key: Key,
    probe: () => Promise<unknown>,
  ) {
    const indicator = this.indicators.check(key);

    try {
      await probe();
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}

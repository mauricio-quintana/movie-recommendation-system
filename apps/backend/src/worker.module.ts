import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { RabbitMqService } from './infrastructure/rabbitmq/rabbitmq.service.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { OutboxPublisher } from './outbox/outbox.publisher.js';
import { GroqAvailabilityService } from './recommendations/worker/groq-availability.service.js';
import { GroqClient } from './recommendations/worker/groq.client.js';
import { RecommendationConsumer } from './recommendations/worker/recommendation.consumer.js';
import { RecommendationProcessor } from './recommendations/worker/recommendation.processor.js';

/**
 * Worker entrypoint module: outbox relay + recommendation consumer. No HTTP server.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisModule,
  ],
  providers: [
    RabbitMqService,
    OutboxPublisher,
    GroqClient,
    GroqAvailabilityService,
    RecommendationProcessor,
    RecommendationConsumer,
  ],
})
export class WorkerModule {}

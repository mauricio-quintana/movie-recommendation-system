import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module.js';
import { OriginCheckMiddleware } from './common/origin-check.middleware.js';
import { envValidationSchema } from './config/env.validation.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { LikesModule } from './likes/likes.module.js';
import { MoviesModule } from './movies/movies.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    TerminusModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    LikesModule,
    RecommendationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginCheckMiddleware).forRoutes('{*splat}');
  }
}

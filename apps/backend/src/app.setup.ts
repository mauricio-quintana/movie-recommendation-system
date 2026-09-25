import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/**
 * HTTP pipeline shared by the API entrypoint and the e2e tests.
 */
export function configureApp(app: NestExpressApplication): void {
  // Requests reach the API through the Next.js proxy on the private Docker network.
  app.set('trust proxy', 'loopback, uniquelocal');

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();
}

import { Global, Module } from '@nestjs/common';
import { auth } from '../lib/auth.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { AUTH } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    { provide: AUTH, useValue: auth },
    AuthService,
    SessionGuard,
    AuthRateLimitGuard,
  ],
  exports: [AUTH, SessionGuard],
})
export class AuthModule {}

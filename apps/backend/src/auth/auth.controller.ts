import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { forwardAuthCookies, toAuthHeaders } from './auth-headers.js';
import { AuthService } from './auth.service.js';
import { AuthResultDto, SessionDto } from './dto/auth-response.dto.js';
import { CredentialsDto } from './dto/credentials.dto.js';
import { SessionGuard } from './session.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({
    summary: 'Create an account with username/password and start a session',
  })
  @ApiCreatedResponse({
    type: AuthResultDto,
    description: 'Session cookie is set',
  })
  @ApiBadRequestResponse({ description: 'Invalid username or password format' })
  @ApiConflictResponse({ description: 'Username is already taken' })
  @ApiTooManyRequestsResponse()
  async signUp(
    @Body() credentials: CredentialsDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResultDto> {
    const { headers, result } = await this.authService.signUp(
      credentials,
      toAuthHeaders(request),
    );
    forwardAuthCookies(headers, response);

    return { user: result };
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({ summary: 'Sign in with username/password' })
  @ApiOkResponse({ type: AuthResultDto, description: 'Session cookie is set' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse({ description: 'Invalid username or password' })
  @ApiTooManyRequestsResponse()
  async signIn(
    @Body() credentials: CredentialsDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResultDto> {
    const { headers, result } = await this.authService.signIn(
      credentials,
      toAuthHeaders(request),
    );
    forwardAuthCookies(headers, response);

    return { user: result };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Sign out and clear the session cookie' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const headers = await this.authService.signOut(toAuthHeaders(request));
    forwardAuthCookies(headers, response);
  }

  @Get('session')
  @ApiOperation({
    summary: 'Current session state (never fails for anonymous clients)',
  })
  @ApiOkResponse({ type: SessionDto })
  async session(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionDto> {
    const { headers, result } = await this.authService.getSession(
      toAuthHeaders(request),
    );
    forwardAuthCookies(headers, response);

    return result;
  }
}

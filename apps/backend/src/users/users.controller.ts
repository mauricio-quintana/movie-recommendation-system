import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard } from '../auth/session.guard.js';
import { UsersService } from './users.service.js';

export class MeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'movie_fan' })
  username: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: MeDto })
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.usersService.getProfile(user.id);
  }
}

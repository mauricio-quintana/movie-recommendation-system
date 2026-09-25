import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard } from '../auth/session.guard.js';
import { MovieDto, TmdbIdParamDto } from '../movies/dto/movie.dto.js';
import { LikesService } from './likes.service.js';

export class LikeDto {
  @ApiProperty({ type: String, format: 'date-time' })
  likedAt: Date;

  @ApiProperty({ type: MovieDto })
  movie: MovieDto;
}

@ApiTags('likes')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@UseGuards(SessionGuard)
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get()
  @ApiOperation({ summary: "Authenticated user's liked movies, newest first" })
  @ApiOkResponse({ type: [LikeDto] })
  list(@CurrentUser() user: AuthUser): Promise<LikeDto[]> {
    return this.likesService.list(user.id);
  }

  @Post(':tmdbId')
  @ApiOperation({ summary: 'Like a movie (idempotent)' })
  @ApiCreatedResponse({ type: LikeDto, description: 'Like created' })
  @ApiOkResponse({ type: LikeDto, description: 'The movie was already liked' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Unknown TMDB movie' })
  @ApiServiceUnavailableResponse({ description: 'TMDB is unavailable' })
  async like(
    @CurrentUser() user: AuthUser,
    @Param() params: TmdbIdParamDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LikeDto> {
    const { created, like } = await this.likesService.like(
      user.id,
      params.tmdbId,
    );
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return like;
  }

  @Delete(':tmdbId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a like (idempotent)' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  unlike(
    @CurrentUser() user: AuthUser,
    @Param() params: TmdbIdParamDto,
  ): Promise<void> {
    return this.likesService.unlike(user.id, params.tmdbId);
  }
}

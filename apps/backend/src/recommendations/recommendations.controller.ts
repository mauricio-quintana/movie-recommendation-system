import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard } from '../auth/session.guard.js';
import {
  RecommendationAcceptedDto,
  RecommendationDto,
} from './dto/recommendation.dto.js';
import { RecommendationsService } from './recommendations.service.js';

@ApiTags('recommendations')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@UseGuards(SessionGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a personalised recommendation (asynchronous)',
    description:
      'Returns immediately with PENDING status. Poll GET /api/recommendations/{id}.',
  })
  @ApiAcceptedResponse({ type: RecommendationAcceptedDto })
  @ApiServiceUnavailableResponse({
    description: 'Candidates could not be built (TMDB unavailable)',
  })
  async request(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecommendationAcceptedDto> {
    const recommendation = await this.recommendationsService.request(user.id);
    response.location(`/api/recommendations/${recommendation.id}`);

    return recommendation;
  }

  @Get()
  @ApiOperation({
    summary: "Authenticated user's recommendations, newest first",
  })
  @ApiOkResponse({ type: [RecommendationDto] })
  list(@CurrentUser() user: AuthUser): Promise<RecommendationDto[]> {
    return this.recommendationsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A recommendation owned by the authenticated user' })
  @ApiOkResponse({ type: RecommendationDto })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Missing or owned by another user' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RecommendationDto> {
    return this.recommendationsService.get(user.id, id);
  }
}

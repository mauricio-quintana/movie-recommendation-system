import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ListMoviesQueryDto,
  MovieDetailDto,
  MoviePageDto,
  TmdbIdParamDto,
} from './dto/movie.dto.js';
import { MoviesService } from './movies.service.js';

@ApiTags('movies')
@ApiServiceUnavailableResponse({ description: 'TMDB is unavailable' })
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({
    summary: 'Popular movies, or a title search when `search` is present',
  })
  @ApiOkResponse({ type: MoviePageDto })
  @ApiBadRequestResponse()
  list(@Query() query: ListMoviesQueryDto): Promise<MoviePageDto> {
    return this.moviesService.list(query.page, query.search);
  }

  @Get(':tmdbId')
  @ApiOperation({ summary: 'Movie detail by TMDB id' })
  @ApiOkResponse({ type: MovieDetailDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  detail(@Param() params: TmdbIdParamDto): Promise<MovieDetailDto> {
    return this.moviesService.getMovie(params.tmdbId);
  }
}

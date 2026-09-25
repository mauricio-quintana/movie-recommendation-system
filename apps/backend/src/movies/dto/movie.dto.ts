import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Movie } from '../../generated/prisma/client.js';
import { TMDB_MAX_PAGE, type MovieSummary } from '../movie.mapper.js';

export class ListMoviesQueryDto {
  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: TMDB_MAX_PAGE,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TMDB_MAX_PAGE)
  page: number = 1;

  @ApiProperty({
    required: false,
    maxLength: 100,
    description: 'Free-text title search',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class TmdbIdParamDto {
  @ApiProperty({ example: 550 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tmdbId: number;
}

export class MovieDto {
  @ApiProperty({ example: 550 })
  tmdbId: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  originalTitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  overview: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'TMDB image path, e.g. /abc.jpg',
  })
  posterPath: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'TMDB image path' })
  backdropPath: string | null;

  @ApiProperty({ type: String, nullable: true, example: '1999-10-15' })
  releaseDate: string | null;

  @ApiProperty({ type: Number, nullable: true })
  voteAverage: number | null;

  @ApiProperty({ type: Number, nullable: true })
  voteCount: number | null;

  @ApiProperty({ type: Number, nullable: true })
  popularity: number | null;

  @ApiProperty({ type: String, nullable: true })
  originalLanguage: string | null;
}

export class MovieDetailDto extends MovieDto {
  @ApiProperty({ type: [String] })
  genres: string[];

  @ApiProperty({ type: Number, nullable: true, description: 'Minutes' })
  runtime: number | null;

  @ApiProperty({ type: String, nullable: true })
  tagline: string | null;
}

export class MoviePageDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalResults: number;

  @ApiProperty({ type: [MovieDto] })
  results: MovieDto[];
}

export function toMovieDto(movie: Movie): MovieSummary {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    releaseDate: movie.releaseDate?.toISOString().slice(0, 10) ?? null,
    voteAverage: movie.voteAverage,
    voteCount: movie.voteCount,
    popularity: movie.popularity,
    originalLanguage: movie.originalLanguage,
  };
}

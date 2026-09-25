import { ApiProperty } from '@nestjs/swagger';
import {
  RecommendationStatus,
  type Movie,
  type Recommendation,
} from '../../generated/prisma/client.js';
import { MovieDto, toMovieDto } from '../../movies/dto/movie.dto.js';

export class RecommendationAcceptedDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: RecommendationStatus,
    example: RecommendationStatus.PENDING,
  })
  status: RecommendationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class RecommendationDto extends RecommendationAcceptedDto {
  @ApiProperty({ description: 'Processing attempts so far' })
  attempts: number;

  @ApiProperty({
    type: [Number],
    description: 'TMDB ids the model was allowed to choose from',
  })
  candidateTmdbIds: number[];

  @ApiProperty({ type: MovieDto, nullable: true })
  selectedMovie: MovieDto | null;

  @ApiProperty({ type: String, nullable: true })
  reason: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'GROQ_UNAVAILABLE' })
  failureCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  failureMessage: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: Date | null;
}

export function toRecommendationDto(
  recommendation: Recommendation & { selectedMovie: Movie | null },
): RecommendationDto {
  return {
    id: recommendation.id,
    status: recommendation.status,
    attempts: recommendation.attempts,
    candidateTmdbIds: recommendation.candidateTmdbIds,
    selectedMovie: recommendation.selectedMovie
      ? toMovieDto(recommendation.selectedMovie)
      : null,
    reason: recommendation.reason,
    failureCode: recommendation.failureCode,
    failureMessage: recommendation.failureMessage,
    createdAt: recommendation.createdAt,
    updatedAt: recommendation.updatedAt,
    startedAt: recommendation.startedAt,
    completedAt: recommendation.completedAt,
  };
}

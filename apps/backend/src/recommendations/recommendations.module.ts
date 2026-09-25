import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module.js';
import { CandidateSelectorService } from './candidate-selector.service.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';

@Module({
  imports: [MoviesModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, CandidateSelectorService],
})
export class RecommendationsModule {}

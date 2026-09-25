import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller.js';
import { MoviesService } from './movies.service.js';
import { TmdbClient } from './tmdb.client.js';

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, TmdbClient],
  exports: [MoviesService],
})
export class MoviesModule {}

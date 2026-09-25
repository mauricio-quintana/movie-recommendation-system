import { Module } from '@nestjs/common';
import { MoviesModule } from '../movies/movies.module.js';
import { LikesController } from './likes.controller.js';
import { LikesService } from './likes.service.js';

@Module({
  imports: [MoviesModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { toMovieDto } from '../movies/dto/movie.dto.js';
import { MoviesService } from '../movies/movies.service.js';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly moviesService: MoviesService,
  ) {}

  async list(userId: string) {
    const likes = await this.prisma.like.findMany({
      where: { userId },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });

    return likes.map((like) => ({
      likedAt: like.createdAt,
      movie: toMovieDto(like.movie),
    }));
  }

  /**
   * Idempotent: liking an already liked movie returns the existing like with `created: false`.
   */
  async like(userId: string, tmdbId: number) {
    const movie = await this.moviesService.ensureSnapshot(tmdbId);
    const key = { userId_movieId: { userId, movieId: movie.id } };

    const existing = await this.prisma.like.findUnique({ where: key });

    if (existing) {
      return {
        created: false,
        like: { likedAt: existing.createdAt, movie: toMovieDto(movie) },
      };
    }

    try {
      const like = await this.prisma.like.create({
        data: { userId, movieId: movie.id },
      });
      return {
        created: true,
        like: { likedAt: like.createdAt, movie: toMovieDto(movie) },
      };
    } catch (error) {
      // A concurrent request created the same like: the unique key keeps it single.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const like = await this.prisma.like.findUniqueOrThrow({ where: key });
        return {
          created: false,
          like: { likedAt: like.createdAt, movie: toMovieDto(movie) },
        };
      }

      throw error;
    }
  }

  /**
   * Idempotent: removing a like that does not exist is a no-op.
   */
  async unlike(userId: string, tmdbId: number): Promise<void> {
    await this.prisma.like.deleteMany({ where: { userId, movie: { tmdbId } } });
  }
}

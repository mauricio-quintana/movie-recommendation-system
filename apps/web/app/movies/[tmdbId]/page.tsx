import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LikeButton } from '@/components/like-button';
import { ApiError, apiFetch } from '@/lib/api';
import { releaseYear, tmdbImage } from '@/lib/format';
import { getLikedIds } from '@/lib/likes';
import type { MovieDetail } from '@/lib/types';

// Shared by generateMetadata and the page within one request.
const getMovie = cache(async (tmdbId: string): Promise<MovieDetail> => {
  if (!/^\d+$/.test(tmdbId) || Number(tmdbId) < 1) {
    notFound();
  }

  try {
    return await apiFetch<MovieDetail>(`/movies/${tmdbId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps<'/movies/[tmdbId]'>): Promise<Metadata> {
  const { tmdbId } = await params;

  return { title: (await getMovie(tmdbId)).title };
}

export default async function MoviePage({ params }: PageProps<'/movies/[tmdbId]'>) {
  const { tmdbId } = await params;
  const [movie, likedIds] = await Promise.all([getMovie(tmdbId), getLikedIds()]);

  const poster = tmdbImage(movie.posterPath, 'w500');
  const facts = [
    releaseYear(movie.releaseDate),
    movie.runtime ? `${movie.runtime} min` : null,
    movie.voteAverage !== null
      ? `★ ${movie.voteAverage.toFixed(1)} (${movie.voteCount ?? 0} votes)`
      : null,
    movie.originalLanguage?.toUpperCase(),
  ].filter(Boolean);

  return (
    <article className="flex flex-col gap-8 md:flex-row">
      <div className="relative aspect-[2/3] w-full max-w-xs shrink-0 self-center overflow-hidden rounded-xl bg-[var(--muted-surface)] md:self-start">
        {poster ? (
          <Image
            src={poster}
            alt={`Poster of ${movie.title}`}
            fill
            sizes="320px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="text-muted flex h-full items-center justify-center">
            No poster available
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{movie.title}</h1>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <p className="text-muted">{movie.originalTitle}</p>
          )}
          {movie.tagline && <p className="mt-2 italic">{movie.tagline}</p>}
        </div>

        <p className="text-muted text-sm">{facts.join(' · ')}</p>

        {movie.genres.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Genres">
            {movie.genres.map((genre) => (
              <li
                key={genre}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
              >
                {genre}
              </li>
            ))}
          </ul>
        )}

        <p className="max-w-prose leading-relaxed">{movie.overview ?? 'No overview available.'}</p>

        <div className="w-40">
          {likedIds ? (
            <LikeButton
              tmdbId={movie.tmdbId}
              title={movie.title}
              liked={likedIds.has(movie.tmdbId)}
            />
          ) : (
            <p className="text-muted text-sm">
              <Link href={`/login?next=/movies/${movie.tmdbId}`} className="link">
                Sign in
              </Link>{' '}
              to like this movie.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { MovieCard, MovieGrid } from '@/components/movie-card';
import { EmptyState } from '@/components/states';
import { apiFetch } from '@/lib/api';
import { getLikedIds } from '@/lib/likes';
import type { MoviePage } from '@/lib/types';

export const metadata: Metadata = { title: 'Movies' };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}

function pageHref(page: number, search: string) {
  const params = new URLSearchParams({ page: String(page) });

  if (search) {
    params.set('search', search);
  }

  return `/movies?${params.toString()}`;
}

export default async function MoviesPage({ searchParams }: PageProps<'/movies'>) {
  const params = await searchParams;
  const search = first(params.search)?.trim().slice(0, 100) ?? '';
  const page = toPage(first(params.page));

  const query = new URLSearchParams({ page: String(page) });
  if (search) {
    query.set('search', search);
  }

  const [movies, likedIds] = await Promise.all([
    apiFetch<MoviePage>(`/movies?${query.toString()}`),
    getLikedIds(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {search ? `Results for “${search}”` : 'Popular movies'}
          </h1>
          <p className="text-muted text-sm">
            {likedIds
              ? 'Like movies to shape your recommendations.'
              : 'Sign in to like movies and get recommendations.'}
          </p>
        </div>

        <form action="/movies" role="search" className="flex gap-2">
          <label htmlFor="search" className="sr-only">
            Search movies
          </label>
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Search by title…"
            maxLength={100}
            className="input w-56"
          />
          <button type="submit" className="button-primary">
            Search
          </button>
        </form>
      </div>

      {movies.results.length === 0 ? (
        <EmptyState
          title="No movies found"
          description={search ? 'Try a different title.' : 'The catalog returned no movies.'}
          action={search ? { href: '/movies', label: 'Back to popular movies' } : undefined}
        />
      ) : (
        <MovieGrid>
          {movies.results.map((movie, index) => (
            <MovieCard
              key={movie.tmdbId}
              movie={movie}
              liked={likedIds ? likedIds.has(movie.tmdbId) : undefined}
              priority={index < 5}
            />
          ))}
        </MovieGrid>
      )}

      {movies.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1, search)} className="button-ghost">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {movies.totalPages}
          </span>
          {page < movies.totalPages && (
            <Link href={pageHref(page + 1, search)} className="button-ghost">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

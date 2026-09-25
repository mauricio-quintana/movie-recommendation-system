import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FeaturedGallery, type FeaturedMovie } from '@/components/featured-gallery';
import { LikeHeart } from '@/components/like-heart';
import { Pagination } from '@/components/pagination';
import { PosterCard, PosterGrid } from '@/components/poster-card';
import { RequestRecommendationButton } from '@/components/request-recommendation-button';
import { SearchBox } from '@/components/search-box';
import { StateMessage } from '@/components/states';
import { apiFetch } from '@/lib/api';
import { firstParam, movieMeta, tmdbImage } from '@/lib/format';
import { getLikedIds } from '@/lib/likes';
import type { MoviePage } from '@/lib/types';

export const metadata: Metadata = { title: 'Descubrir' };

const FEATURED_COUNT = 5;

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

export default async function DiscoverPage({ searchParams }: PageProps<'/movies'>) {
  const params = await searchParams;
  const search = firstParam(params.search)?.trim().slice(0, 100) ?? '';
  const page = toPage(firstParam(params.page));

  const query = new URLSearchParams({ page: String(page) });
  if (search) {
    query.set('search', search);
  }

  const [movies, likedIds] = await Promise.all([
    apiFetch<MoviePage>(`/movies?${query.toString()}`),
    getLikedIds(),
  ]);

  const liked = (tmdbId: number) => likedIds?.has(tmdbId) ?? false;
  const isFirstPage = page === 1 && !search;
  const featured = isFirstPage ? movies.results.slice(0, FEATURED_COUNT) : [];
  const grid = isFirstPage ? movies.results.slice(FEATURED_COUNT) : movies.results;
  const likeCount = likedIds?.size ?? 0;
  const isEmpty = movies.results.length === 0;

  const featuredMovies: FeaturedMovie[] = featured.map((movie) => ({
    tmdbId: movie.tmdbId,
    title: movie.title,
    backdrop: tmdbImage(movie.backdropPath ?? movie.posterPath, 'w1280'),
    meta: movieMeta(movie),
    liked: liked(movie.tmdbId),
  }));

  return (
    <>
      <Suspense>
        <SearchBox large className="hidden max-[760px]:flex" />
      </Suspense>

      <div className="flex flex-wrap items-baseline gap-3.5">
        <h1 className="page-title">{search ? `Resultados para “${search}”` : 'Descubrir'}</h1>
        <span className="meta">
          {search
            ? `${movies.totalResults} ${movies.totalResults === 1 ? 'película' : 'películas'}`
            : `Populares en TMDB · página ${page} de ${movies.totalPages}`}
        </span>
        {search && (
          <Link href="/movies" className="text-[13px] text-ink underline">
            ✕ Limpiar búsqueda
          </Link>
        )}
      </div>

      {isEmpty ? (
        <StateMessage
          title={`Sin resultados para “${search}”`}
          description="Revisá la ortografía o probá con otro título."
        >
          <Link href="/movies" className="btn-secondary px-4 py-[9px]">
            Limpiar búsqueda
          </Link>
        </StateMessage>
      ) : (
        <>
          {featuredMovies.length > 0 && <FeaturedGallery movies={featuredMovies} />}

          {page === 1 && likeCount > 0 && (
            <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-dashed border-dash px-4 py-3">
              <span className="text-sm">
                Tenés {likeCount} {likeCount === 1 ? 'like' : 'likes'}. ¿Te recomendamos una
                película?
              </span>
              <div className="ml-auto">
                <RequestRecommendationButton className="btn-secondary btn-sm" />
              </div>
            </div>
          )}

          <section className="flex flex-col gap-4" aria-label="Películas">
            {!search && (
              <h2 className="m-0 text-lg font-bold">
                {isFirstPage ? 'Más populares' : 'Populares'}
              </h2>
            )}
            <PosterGrid>
              {grid.map((movie, index) => (
                <PosterCard
                  key={movie.tmdbId}
                  title={movie.title}
                  meta={movieMeta(movie)}
                  poster={tmdbImage(movie.posterPath)}
                  href={`/movies/${movie.tmdbId}`}
                  priority={index < 5}
                  overlay={
                    <LikeHeart
                      tmdbId={movie.tmdbId}
                      title={movie.title}
                      liked={liked(movie.tmdbId)}
                    />
                  }
                />
              ))}
            </PosterGrid>
          </section>

          {movies.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={movies.totalPages}
              href={(target) => pageHref(target, search)}
            />
          )}
        </>
      )}
    </>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { LikeButton } from '@/components/like-button';
import { TiltedCard } from '@/components/react-bits/tilted-card';
import { ApiError, apiFetch } from '@/lib/api';
import { formatRuntime, releaseYear, tmdbImage } from '@/lib/format';
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

  const facts = [
    releaseYear(movie.releaseDate),
    formatRuntime(movie.runtime),
    movie.voteAverage ? `★ ${movie.voteAverage.toFixed(1)} (${movie.voteCount ?? 0} votos)` : null,
    movie.originalLanguage?.toUpperCase(),
  ].filter(Boolean);

  return (
    <>
      <Link href="/movies" className="text-[13px] text-ink underline">
        ‹ Volver a Descubrir
      </Link>

      <article className="relative min-h-[440px] overflow-hidden rounded-2xl bg-night shadow-[0_10px_30px_-18px_rgba(0,0,0,.8)]">
        {movie.backdropPath && (
          <Image
            src={tmdbImage(movie.backdropPath, 'w1280')!}
            alt=""
            fill
            sizes="(min-width: 1240px) 1192px, 100vw"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,11,11,.94)_0%,rgba(11,11,11,.8)_48%,rgba(11,11,11,.5)_100%)] max-[760px]:bg-[linear-gradient(180deg,rgba(11,11,11,.55)_0%,rgba(11,11,11,.92)_45%)]" />
        <div className="relative grid grid-cols-[minmax(0,280px)_minmax(0,1fr)] items-center gap-12 px-11 py-10 max-[760px]:grid-cols-[minmax(0,1fr)] max-[760px]:gap-6 max-[760px]:px-5 max-[760px]:pt-6 max-[760px]:pb-7">
          <div className="w-full max-[760px]:w-[200px] max-[760px]:justify-self-center">
            <TiltedCard
              imageSrc={tmdbImage(movie.posterPath, 'w500')}
              altText={`Póster de ${movie.title}`}
              showTooltip={false}
              sizes="280px"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col gap-3.5 text-white">
            {movie.tagline && (
              <div className="flex items-center gap-3">
                <span className="h-[26px] w-[3px] flex-none rounded-[3px] bg-white shadow-[0_0_12px_rgba(255,255,255,.6)]" />
                <span className="font-mono text-[11px] tracking-[.08em] uppercase">
                  {movie.tagline}
                </span>
              </div>
            )}
            <h1 className="m-0 text-[42px] leading-[1.04] font-bold tracking-[-.02em] text-balance max-[760px]:text-[30px]">
              {movie.title}
            </h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <span className="text-sm text-[#cfcfcf]">{movie.originalTitle}</span>
            )}
            <span className="text-sm text-[#cfcfcf]">{facts.join(' · ')}</span>
            {movie.genres.length > 0 && (
              <ul aria-label="Géneros" className="m-0 flex list-none flex-wrap gap-2 p-0">
                {movie.genres.map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full border border-white/40 px-3 py-1 font-mono text-[11px] tracking-[.04em]"
                  >
                    {genre}
                  </li>
                ))}
              </ul>
            )}
            <p className="m-0 max-w-[58ch] text-[15px] leading-normal text-pretty text-[#e2e2e2]">
              {movie.overview ?? 'Sin sinopsis disponible.'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              {likedIds ? (
                <LikeButton
                  tmdbId={movie.tmdbId}
                  title={movie.title}
                  liked={likedIds.has(movie.tmdbId)}
                  tone="dark"
                />
              ) : (
                <Link href={`/login?next=/movies/${movie.tmdbId}`} className="btn-on-dark">
                  Ingresá para darle ♡
                </Link>
              )}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

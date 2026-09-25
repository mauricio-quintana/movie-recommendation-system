import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LikeButton } from '@/components/like-button';
import { LocalDateTime } from '@/components/local-date-time';
import { PosterCard, PosterGrid } from '@/components/poster-card';
import { TiltedCard } from '@/components/react-bits/tilted-card';
import { RecommendationNotice } from '@/components/recommendation-notice';
import { RecommendationProgress } from '@/components/recommendation-progress';
import { RecommendationWatcher } from '@/components/recommendation-watcher';
import { RequestRecommendationButton } from '@/components/request-recommendation-button';
import { StateMessage } from '@/components/states';
import { apiFetch, apiFetchAuthenticated } from '@/lib/api';
import { firstParam, formatRuntime, isActiveStatus, releaseYear, tmdbImage } from '@/lib/format';
import type { Like, MovieDetail, Recommendation } from '@/lib/types';

export const metadata: Metadata = { title: 'Recomendaciones' };

async function getMovieDetail(tmdbId: number): Promise<MovieDetail | null> {
  try {
    return await apiFetch<MovieDetail>(`/movies/${tmdbId}`);
  } catch {
    // Runtime and genres are extras: the hero renders from the snapshot without them.
    return null;
  }
}

function StatusChip({ label }: { label: string }) {
  return (
    <span className="absolute top-2.5 left-2.5 rounded-full border border-white/70 bg-black/45 px-[9px] py-[3px] font-mono text-[10px] tracking-[.06em] text-white">
      {label}
    </span>
  );
}

export default async function RecommendationsPage({ searchParams }: PageProps<'/recommendations'>) {
  const requestedId = firstParam((await searchParams).id);

  const [recommendations, likes] = await Promise.all([
    apiFetchAuthenticated<Recommendation[]>('/recommendations', '/recommendations'),
    apiFetchAuthenticated<Like[]>('/likes', '/recommendations'),
  ]);

  const selected = requestedId
    ? recommendations.find((recommendation) => recommendation.id === requestedId)
    : recommendations[0];

  if (requestedId && !selected) {
    notFound();
  }

  const likeCount = likes.length;
  const hasLikes = likeCount > 0;
  // At most one recommendation runs at a time (the CTA is disabled meanwhile).
  const running = recommendations.find((recommendation) => isActiveStatus(recommendation.status));
  const busy = running !== undefined;
  const canRequest = hasLikes && !busy;
  const movie = selected?.status === 'COMPLETED' ? selected.selectedMovie : null;
  const detail = movie ? await getMovieDetail(movie.tmdbId) : null;
  const likedIds = new Set(likes.map((like) => like.movie.tmdbId));
  const isLatest = selected?.id === recommendations[0]?.id;

  return (
    <>
      {running && running.id !== selected?.id && (
        // Viewing another recommendation: keep watching the running one (single poller).
        <RecommendationWatcher key={running.id} recommendation={running} />
      )}
      {selected && (
        <RecommendationNotice
          id={selected.id}
          status={selected.status}
          title={selected.selectedMovie?.title ?? null}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex max-w-[600px] min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h1 className="page-title">Recomendaciones</h1>
            <span className="meta">
              {hasLikes
                ? `Basadas en tus ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`
                : 'Todavía no tenés likes'}
            </span>
          </div>
          <p className="lede">
            Elegimos una película para vos a partir de las que te gustaron. Tarda unos segundos y
            podés seguir navegando mientras tanto.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 max-[760px]:w-full max-[760px]:items-stretch">
          {canRequest ? (
            <RequestRecommendationButton />
          ) : (
            <button type="button" disabled className="btn-disabled">
              {busy ? '◌ Procesando…' : 'Pedir recomendación'}
            </button>
          )}
          <span className="font-mono text-[11px] text-subtle">
            {busy
              ? 'Ya hay una en curso'
              : !hasLikes
                ? 'Necesitás al menos 1 like'
                : 'Tarda unos segundos'}
          </span>
        </div>
      </div>

      {!selected && (
        <StateMessage
          bordered
          title={hasLikes ? 'Todavía no tenés recomendaciones' : 'Primero, contanos qué te gusta'}
          description={
            hasLikes
              ? `Pedí la primera: la generamos a partir de tus ${likeCount} likes y queda guardada acá.`
              : 'Dale ♡ a algunas películas en Descubrir. Con al menos un like ya podemos recomendarte algo.'
          }
        >
          {hasLikes ? (
            <RequestRecommendationButton
              label="Pedir mi primera recomendación"
              className="btn-primary px-[18px] py-2.5"
            />
          ) : (
            <Link href="/movies" className="btn-primary px-[18px] py-2.5">
              Explorar películas
            </Link>
          )}
        </StateMessage>
      )}

      {selected && movie && (
        <section className="relative min-h-[440px] overflow-hidden rounded-2xl bg-night shadow-[0_10px_30px_-18px_rgba(0,0,0,.8)]">
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
                altText={movie.title}
                captionText="Ver detalle"
                href={`/movies/${movie.tmdbId}`}
                sizes="280px"
                priority
              />
            </div>
            <div className="flex min-w-0 flex-col gap-3.5 text-white">
              <div className="flex items-center gap-3">
                <span className="h-[26px] w-[3px] flex-none rounded-[3px] bg-white shadow-[0_0_12px_rgba(255,255,255,.6)]" />
                <span className="font-mono text-[11px] tracking-[.08em]">
                  {isLatest ? (
                    'TU RECOMENDACIÓN'
                  ) : (
                    <>
                      RECOMENDACIÓN ANTERIOR ·{' '}
                      <LocalDateTime value={selected.createdAt} uppercase />
                    </>
                  )}
                </span>
              </div>
              <h2 className="m-0 text-[42px] leading-[1.04] font-bold tracking-[-.02em] text-balance max-[760px]:text-[30px]">
                {movie.title}
              </h2>
              <span className="text-sm text-[#cfcfcf]">
                {[
                  releaseYear(movie.releaseDate),
                  formatRuntime(detail?.runtime ?? null),
                  movie.voteAverage ? `★ ${movie.voteAverage.toFixed(1)}` : null,
                  detail?.genres.slice(0, 2).join(' · ') || null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {movie.overview && (
                <p className="m-0 max-w-[58ch] text-[15px] leading-normal text-pretty text-[#e2e2e2]">
                  {movie.overview}
                </p>
              )}
              {selected.reason ? (
                <div className="flex max-w-[58ch] flex-col gap-1.5 border-t border-white/18 pt-3.5">
                  <span className="font-mono text-[11px] tracking-[.08em] text-[#bdbdbd]">
                    POR QUÉ TE LA RECOMENDAMOS
                  </span>
                  <p className="m-0 text-[15px] leading-[1.45] text-white">{selected.reason}</p>
                </div>
              ) : (
                <span className="border-t border-white/18 pt-3.5 font-mono text-[11px] tracking-[.06em] text-[#bdbdbd]">
                  GENERADA A PARTIR DE TUS LIKES ·{' '}
                  <LocalDateTime value={selected.createdAt} uppercase />
                </span>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <Link href={`/movies/${movie.tmdbId}`} className="btn-on-dark">
                  Ver detalle
                </Link>
                <LikeButton
                  key={movie.tmdbId}
                  tmdbId={movie.tmdbId}
                  title={movie.title}
                  liked={likedIds.has(movie.tmdbId)}
                  tone="dark"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {selected && isActiveStatus(selected.status) && (
        <RecommendationProgress
          key={selected.id}
          recommendation={{
            id: selected.id,
            status: selected.status as 'PENDING' | 'PROCESSING',
            attempts: selected.attempts,
            createdAt: selected.createdAt,
            startedAt: selected.startedAt,
          }}
          likes={likes.slice(0, 6).map((like) => ({
            image: tmdbImage(like.movie.backdropPath ?? like.movie.posterPath, 'w1280'),
            label: like.movie.title,
          }))}
        />
      )}

      {selected?.status === 'FAILED' && (
        <StateMessage
          bordered
          icon="✕"
          kicker={
            <>
              ✕ FALLIDA · <LocalDateTime value={selected.createdAt} uppercase />
            </>
          }
          title="No pudimos generar tu recomendación"
          description="Algo falló de nuestro lado. Tus likes siguen guardados; podés intentarlo de nuevo ahora."
        >
          {canRequest && (
            <RequestRecommendationButton
              label="Reintentar"
              className="btn-primary px-[18px] py-2.5"
            />
          )}
          <Link href="/movies" className="btn-secondary px-[18px] py-2.5">
            Seguir explorando
          </Link>
        </StateMessage>
      )}

      {recommendations.length > 0 && (
        <section aria-label="Historial" className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="m-0 text-lg font-bold">Historial</h2>
            <span className="meta">
              {recommendations.length} {recommendations.length === 1 ? 'solicitud' : 'solicitudes'}{' '}
              · más reciente primero
            </span>
          </div>
          <PosterGrid>
            {recommendations.map((recommendation) => {
              const href = `/recommendations?id=${recommendation.id}`;
              const viewing = recommendation.id === selected?.id;
              const meta = (
                <>
                  {viewing && 'Viendo · '}
                  <LocalDateTime value={recommendation.createdAt} />
                </>
              );
              const recommended = recommendation.selectedMovie;

              if (recommendation.status === 'COMPLETED' && recommended) {
                return (
                  <PosterCard
                    key={recommendation.id}
                    title={recommended.title}
                    meta={meta}
                    poster={tmdbImage(recommended.posterPath)}
                    href={href}
                    caption="Ver recomendación"
                    overlay={<StatusChip label="● COMPLETADA" />}
                  />
                );
              }

              const failed = recommendation.status === 'FAILED';

              return (
                <article key={recommendation.id} className="flex min-w-0 flex-col gap-2.5">
                  <Link
                    href={href}
                    className={`flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-[15px] border border-dashed border-dash-strong p-3 text-center text-ink no-underline ${
                      failed ? '' : 'bg-placeholder'
                    }`}
                  >
                    <span aria-hidden="true" className={failed ? 'text-lg' : 'text-xl'}>
                      {failed ? '✕' : '◌'}
                    </span>
                    <span className="font-mono text-[10px] tracking-[.06em]">
                      {failed ? 'FALLIDA' : '◌ PROCESANDO'}
                    </span>
                    {!failed && <span className="text-xs text-subtle">En unos momentos…</span>}
                  </Link>
                  {failed && canRequest && (
                    <RequestRecommendationButton
                      label="Reintentar"
                      className="btn-secondary btn-sm -mt-1 py-1.5 text-xs"
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-[3px]">
                    <Link
                      href={href}
                      className="line-clamp-2 text-[15px] leading-[1.25] font-semibold text-ink no-underline hover:underline"
                    >
                      {failed ? 'Sin resultado' : 'Procesando tu solicitud'}
                    </Link>
                    <span className="meta">{meta}</span>
                  </div>
                </article>
              );
            })}
          </PosterGrid>
        </section>
      )}
    </>
  );
}

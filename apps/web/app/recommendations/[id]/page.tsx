import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/components/auto-refresh';
import { MovieCard } from '@/components/movie-card';
import { isActive, StatusBadge } from '@/components/recommendation-status';
import { RequestRecommendationButton } from '@/components/request-recommendation-button';
import { ApiError, apiFetchAuthenticated } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Recommendation } from '@/lib/types';

export const metadata: Metadata = { title: 'Recommendation' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RecommendationPage({ params }: PageProps<'/recommendations/[id]'>) {
  const { id } = await params;

  if (!UUID.test(id)) {
    notFound();
  }

  let recommendation: Recommendation;

  try {
    recommendation = await apiFetchAuthenticated<Recommendation>(
      `/recommendations/${id}`,
      `/recommendations/${id}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const active = isActive(recommendation.status);

  return (
    <div className="flex flex-col gap-6">
      {active && <AutoRefresh />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/recommendations" className="link text-sm">
            ← All recommendations
          </Link>
          <h1 className="text-2xl font-semibold">Your recommendation</h1>
          <p className="text-muted text-xs">Requested {formatDateTime(recommendation.createdAt)}</p>
        </div>
        <StatusBadge status={recommendation.status} />
      </div>

      <section aria-live="polite" className="flex flex-col gap-4">
        {active && (
          <div role="status" className="card flex items-center gap-4 p-6">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <div>
              <p className="font-medium">
                {recommendation.status === 'PENDING'
                  ? 'Your request is queued…'
                  : 'Choosing the best movie for you…'}
              </p>
              <p className="text-muted text-sm">
                This page updates automatically.
                {recommendation.attempts > 1 && ` Attempt ${recommendation.attempts}.`}
              </p>
            </div>
          </div>
        )}

        {recommendation.status === 'COMPLETED' && recommendation.selectedMovie && (
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="w-48 shrink-0">
              <MovieCard movie={recommendation.selectedMovie} priority />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">{recommendation.selectedMovie.title}</h2>
              <blockquote className="border-l-4 border-[var(--accent)] pl-4 leading-relaxed">
                {recommendation.reason}
              </blockquote>
              <p className="text-muted text-xs">
                Picked from {recommendation.candidateTmdbIds.length} candidates related to your
                likes.
              </p>
            </div>
          </div>
        )}

        {recommendation.status === 'FAILED' && (
          <div role="alert" className="card flex flex-col gap-3 p-6">
            <p className="font-medium">We could not generate this recommendation.</p>
            {recommendation.failureMessage && (
              <p className="text-muted text-sm">{recommendation.failureMessage}</p>
            )}
            <div>
              <RequestRecommendationButton />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

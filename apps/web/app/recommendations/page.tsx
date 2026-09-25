import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/auto-refresh';
import { isActive, StatusBadge } from '@/components/recommendation-status';
import { RequestRecommendationButton } from '@/components/request-recommendation-button';
import { EmptyState } from '@/components/states';
import { apiFetchAuthenticated } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Recommendation } from '@/lib/types';

export const metadata: Metadata = { title: 'Recommendations' };

export default async function RecommendationsPage() {
  const recommendations = await apiFetchAuthenticated<Recommendation[]>(
    '/recommendations',
    '/recommendations',
  );

  return (
    <div className="flex flex-col gap-6">
      {recommendations.some((item) => isActive(item.status)) && <AutoRefresh intervalMs={4_000} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recommendations</h1>
          <p className="text-muted text-sm">
            Each recommendation is picked from movies related to what you liked.
          </p>
        </div>
        <RequestRecommendationButton />
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Request one above. Liking a few movies first makes it more personal."
          action={{ href: '/movies', label: 'Browse movies' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {recommendations.map((recommendation) => (
            <li key={recommendation.id}>
              <Link
                href={`/recommendations/${recommendation.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-[var(--accent)]"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {recommendation.selectedMovie?.title ??
                      (recommendation.status === 'FAILED'
                        ? 'Recommendation failed'
                        : 'Working on your recommendation…')}
                  </span>
                  <span className="text-muted text-xs">
                    Requested {formatDateTime(recommendation.createdAt)}
                  </span>
                </div>
                <StatusBadge status={recommendation.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

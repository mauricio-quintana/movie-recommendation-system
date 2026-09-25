'use client';

import { useRecommendationPolling } from '@/lib/use-recommendation-polling';
import type { RecommendationStatus } from '@/lib/types';

export interface WatchedRecommendation {
  id: string;
  status: RecommendationStatus;
  attempts: number;
  createdAt: string;
}

/**
 * Shown when automatic polling pauses after the max wait. The recommendation is
 * still PENDING/PROCESSING in the backend: same neutral message, never a failure.
 */
export function StillProcessingNotice({ onResume }: { onResume: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-4 rounded-[10px] border border-dashed border-dash px-4 py-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="kicker">◌ EN PROCESO</span>
        <span className="text-sm leading-[1.45]">
          Estamos procesando tu solicitud. Tu recomendación estará lista en unos momentos; podés
          volver a consultar cuando quieras.
        </span>
      </div>
      <button type="button" onClick={onResume} className="btn-secondary btn-sm ml-auto">
        Volver a consultar
      </button>
    </div>
  );
}

/**
 * Polls a running recommendation that is not the one on screen (e.g. while viewing
 * an older result), so the page updates when it finishes. Renders only the notice.
 */
export function RecommendationWatcher({
  recommendation,
}: {
  recommendation: WatchedRecommendation;
}) {
  const { phase, resume } = useRecommendationPolling({
    id: recommendation.id,
    status: recommendation.status,
    attempts: recommendation.attempts,
    since: recommendation.createdAt,
  });

  return phase === 'paused' ? <StillProcessingNotice onResume={resume} /> : null;
}

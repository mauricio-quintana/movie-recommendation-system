'use client';

import { useEffect, useState } from 'react';
import { useRecommendationPolling } from '@/lib/use-recommendation-polling';
import { AccordionGallery, type AccordionItem } from './react-bits/accordion-gallery';
import { StillProcessingNotice, type WatchedRecommendation } from './recommendation-watcher';

const TICK_MS = 1_400;

interface RecommendationProgressProps {
  recommendation: WatchedRecommendation & {
    status: 'PENDING' | 'PROCESSING';
    startedAt: string | null;
  };
  likes: AccordionItem[];
}

/**
 * PENDING / PROCESSING state. Polls the backend (useRecommendationPolling) while the
 * user's liked movies cycle in the accordion. Both states share one neutral
 * message: queueing, provider waits and retries are internal details.
 */
export function RecommendationProgress({ recommendation, likes }: RecommendationProgressProps) {
  const { status, attempts } = recommendation;
  const { phase, resume } = useRecommendationPolling({
    id: recommendation.id,
    status,
    attempts,
    since: recommendation.createdAt,
  });
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, TICK_MS);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const processing = status === 'PROCESSING';
  const retrying = status === 'PENDING' && attempts > 0;
  const since = new Date(recommendation.startedAt ?? recommendation.createdAt).getTime();
  const elapsed = now === null ? 0 : Math.max(0, (now - since) / 1000);
  const cycle = Math.floor(elapsed / (TICK_MS / 1000));
  const progress = processing ? Math.min(0.15 + elapsed / 10, 0.92) : retrying ? 0.15 : 0;

  const steps = [
    { label: '● RECIBIDA', width: 1, active: true },
    { label: '◌ PROCESANDO', width: progress, active: processing || retrying },
    { label: '○ LISTA', width: 0, active: false },
  ];

  return (
    <section aria-live="polite" aria-busy="true" className="flex flex-col gap-[18px]">
      {likes.length > 0 && (
        <AccordionGallery
          items={likes}
          activeIndex={processing ? cycle : 0}
          height={440}
          expandRatio={0.52}
          trigger="click"
          ariaLabel="Tus likes"
        />
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-[560px] min-w-0 flex-col gap-1.5">
          <span className="kicker">◌ EN PROCESO</span>
          <span className="text-[30px] leading-[1.08] font-bold tracking-[-.015em] text-balance">
            Estamos procesando tu solicitud…
          </span>
          <span className="text-sm leading-[1.45] text-muted">
            Tu recomendación estará lista en unos momentos.
          </span>
        </div>
        <ol
          className="m-0 flex w-[360px] list-none gap-2 p-0 max-[760px]:w-full"
          aria-label="Progreso"
        >
          {steps.map((step) => (
            <li key={step.label} className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="h-[3px] overflow-hidden rounded-[3px] bg-line">
                <div
                  className="h-full bg-ink transition-[width] duration-[1400ms] ease-linear"
                  style={{ width: `${Math.round(step.width * 100)}%` }}
                />
              </div>
              <span
                className={`font-mono text-[11px] tracking-[.06em] ${step.active ? 'text-ink' : 'text-faint'}`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {phase === 'paused' && <StillProcessingNotice onResume={resume} />}
    </section>
  );
}

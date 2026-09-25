'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  decideNextPoll,
  hasProgressed,
  POLLING_CONFIG,
  type ObservedRecommendation,
} from './recommendation-polling';
import type { Recommendation, RecommendationStatus } from './types';

export type PollingPhase = 'polling' | 'paused' | 'done';

interface UseRecommendationPollingArgs {
  id: string;
  status: RecommendationStatus;
  attempts: number;
  /** ISO date the wait started (the recommendation's createdAt). */
  since: string;
}

/**
 * Polls GET /api/recommendations/:id while the recommendation is PENDING or
 * PROCESSING. One request in flight at a time (the next check is scheduled when
 * the previous one ends); the Server Component page is refreshed only when the
 * status or attempt changes. After the max wait it pauses; `resume` checks again.
 */
export function useRecommendationPolling({
  id,
  status,
  attempts,
  since,
}: UseRecommendationPollingArgs) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const observed = useRef<ObservedRecommendation>({ status, attempts });
  const startedAt = useRef<number | null>(null);

  // The server is the source of truth: keep in sync with what the page rendered.
  useEffect(() => {
    observed.current = { status, attempts };
  }, [status, attempts]);

  const done = decideNextPoll(status, 0).action === 'stop';

  useEffect(() => {
    if (done) {
      return;
    }

    // First run measures from the request; a manual resume opens a new window.
    const start = startedAt.current ?? new Date(since).getTime();
    startedAt.current = start;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delayMs: number) => {
      timer = setTimeout(check, delayMs);
    };

    const next = () => {
      const decision = decideNextPoll(observed.current.status, Date.now() - start);

      if (decision.action === 'poll') {
        schedule(decision.delayMs);
      } else if (decision.action === 'pause') {
        setPaused(true);
      }
    };

    async function check() {
      try {
        const response = await fetch(`/api/recommendations/${id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.refresh(); // Session expired: the page redirects to login.
          return;
        }

        if (response.ok) {
          const latest = (await response.json()) as Recommendation;
          const current = { status: latest.status, attempts: latest.attempts };

          if (hasProgressed(observed.current, current)) {
            observed.current = current;
            router.refresh();
          }
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        // Network hiccup: keep waiting, the recommendation is not failed.
      }

      next();
    }

    // A manual resume checks right away; otherwise wait for the first interval.
    if (runId > 0) {
      schedule(0);
    } else {
      next();
    }

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, since, done, runId, router]);

  const resume = useCallback(() => {
    startedAt.current = Date.now();
    setPaused(false);
    setRunId((value) => value + 1);
  }, []);

  const phase: PollingPhase = done ? 'done' : paused ? 'paused' : 'polling';

  return { phase, resume, maxWaitMs: POLLING_CONFIG.maxWaitMs };
}

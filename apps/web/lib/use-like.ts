'use client';

import { useOptimistic, useTransition } from 'react';
import { useToast } from '@/components/toast';
import { setLike } from './actions';

/**
 * Optimistic like/unlike through the setLike Server Action, with the design's toasts.
 */
export function useLike(tmdbId: number, title: string, liked: boolean) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !optimisticLiked;

    startTransition(async () => {
      setOptimisticLiked(next);
      const result = await setLike(tmdbId, next);

      toast(
        result.ok
          ? next
            ? `“${title}” añadida a tus likes`
            : `Quitaste “${title}” de tus likes`
          : result.error,
      );
    });
  }

  return { liked: optimisticLiked, pending, toggle };
}

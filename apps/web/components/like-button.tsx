'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { setLike } from '@/lib/actions';

interface LikeButtonProps {
  tmdbId: number;
  title: string;
  liked: boolean;
}

export function LikeButton({ tmdbId, title, liked }: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimisticLiked;
    setError(null);

    startTransition(async () => {
      setOptimisticLiked(next);
      const result = await setLike(tmdbId, next);

      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimisticLiked}
        aria-label={`${optimisticLiked ? 'Unlike' : 'Like'} ${title}`}
        className={optimisticLiked ? 'button-liked' : 'button-ghost'}
      >
        {optimisticLiked ? '♥ Liked' : '♡ Like'}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

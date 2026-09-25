'use client';

import { useLike } from '@/lib/use-like';

/**
 * Round heart over a poster (Descubrir). Toggles the like.
 */
export function LikeHeart({
  tmdbId,
  title,
  liked,
}: {
  tmdbId: number;
  title: string;
  liked: boolean;
}) {
  const like = useLike(tmdbId, title, liked);

  return (
    <button
      type="button"
      onClick={like.toggle}
      disabled={like.pending}
      aria-pressed={like.liked}
      aria-label={like.liked ? `Quitar “${title}” de mis likes` : `Dar like a “${title}”`}
      className={`pointer-events-auto absolute top-2.5 right-2.5 flex size-9 cursor-pointer items-center justify-center rounded-full border text-base leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        like.liked
          ? 'border-ink bg-white text-ink'
          : 'border-white/70 bg-black/45 text-white hover:bg-black/60'
      }`}
    >
      {like.liked ? '♥' : '♡'}
    </button>
  );
}

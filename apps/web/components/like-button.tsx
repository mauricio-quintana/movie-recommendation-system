'use client';

import { useLike } from '@/lib/use-like';

interface LikeButtonProps {
  tmdbId: number;
  title: string;
  liked: boolean;
  /** 'dark' sits on the recommendation hero. */
  tone?: 'light' | 'dark';
}

/**
 * "♡ Me gusta" / "♥ En tus likes" text button used next to "Ver detalle".
 */
export function LikeButton({ tmdbId, title, liked, tone = 'light' }: LikeButtonProps) {
  const like = useLike(tmdbId, title, liked);

  return (
    <button
      type="button"
      onClick={like.toggle}
      disabled={like.pending}
      aria-pressed={like.liked}
      className={`${tone === 'dark' ? 'btn-ghost-dark' : 'btn-secondary'} px-[18px]`}
    >
      {like.liked ? '♥ En tus likes' : '♡ Me gusta'}
    </button>
  );
}

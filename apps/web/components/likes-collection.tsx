'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { setLike } from '@/lib/actions';
import { movieMeta, tmdbImage } from '@/lib/format';
import { groupLikes, type LikeSortKey } from '@/lib/likes-grouping';
import type { Like } from '@/lib/types';
import { useHydrated } from '@/lib/use-hydrated';
import { PosterCard, PosterGrid } from './poster-card';
import { useToast } from './toast';

const REMOVE_ANIMATION_MS = 280;
/** Same as the toast with an action: the removal is only sent once "Deshacer" is gone. */
const UNDO_WINDOW_MS = 5_000;

function RemoveHeart({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Quitar “${title}” de mis likes`}
      className="group pointer-events-auto absolute top-2.5 right-2.5 flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-[18px] border border-ink bg-white px-0 text-base leading-none font-semibold whitespace-nowrap text-ink transition-[padding] duration-200 hover:px-3 hover:text-[13px] focus-visible:px-3 focus-visible:text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="group-hover:hidden group-focus-visible:hidden">♥</span>
      <span className="hidden group-hover:inline group-focus-visible:inline">♡ Quitar</span>
    </button>
  );
}

/**
 * Liked movies with animated removal and undo. Removal is deferred until the undo
 * window closes, so "Deshacer" restores the like exactly (same position and date)
 * without touching the server. Pending removals are sent if the user leaves.
 */
export function LikesCollection({ likes, sort }: { likes: Like[]; sort: LikeSortKey }) {
  const [removing, setRemoving] = useState<ReadonlySet<number>>(() => new Set());
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
  const pending = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const [, startTransition] = useTransition();
  const toast = useToast();
  const hydrated = useHydrated();

  const toggle = (setter: typeof setHidden, tmdbId: number, present: boolean) =>
    setter((current) => {
      const next = new Set(current);
      if (present) {
        next.add(tmdbId);
      } else {
        next.delete(tmdbId);
      }
      return next;
    });

  // Leaving the page must not lose a removal whose undo window is still open.
  useEffect(() => {
    const timers = pending.current;

    const sendPending = () => {
      for (const [tmdbId, timer] of timers) {
        clearTimeout(timer);
        void fetch(`/api/likes/${tmdbId}`, { method: 'DELETE', keepalive: true });
      }
      timers.clear();
    };

    window.addEventListener('pagehide', sendPending);

    return () => {
      window.removeEventListener('pagehide', sendPending);
      sendPending();
    };
  }, []);

  function commit(like: Like) {
    pending.current.delete(like.movie.tmdbId);

    startTransition(async () => {
      const result = await setLike(like.movie.tmdbId, false);

      if (!result.ok) {
        toggle(setHidden, like.movie.tmdbId, false);
        toast(result.error);
      }
    });
  }

  function undo(like: Like) {
    clearTimeout(pending.current.get(like.movie.tmdbId));
    pending.current.delete(like.movie.tmdbId);
    toggle(setHidden, like.movie.tmdbId, false);
    toast(`“${like.movie.title}” volvió a tus likes`);
  }

  function remove(like: Like) {
    const { tmdbId, title } = like.movie;

    if (removing.has(tmdbId) || pending.current.has(tmdbId)) {
      return;
    }

    toggle(setRemoving, tmdbId, true);

    setTimeout(() => {
      toggle(setHidden, tmdbId, true);
      toggle(setRemoving, tmdbId, false);
      pending.current.set(
        tmdbId,
        setTimeout(() => commit(like), UNDO_WINDOW_MS),
      );
      toast(`Quitaste “${title}”`, { label: 'Deshacer', onClick: () => undo(like) });
    }, REMOVE_ANIMATION_MS);
  }

  const visible = likes.filter((like) => !hidden.has(like.movie.tmdbId));
  // Month groups follow the browser's time zone once it is known.
  const groups = groupLikes(visible, sort, hydrated ? undefined : 'UTC');

  return groups.map((group) => (
    <section
      key={group.label || 'all'}
      aria-label={group.label || 'Mis likes'}
      className="flex flex-col gap-4"
    >
      {group.label && (
        <div className="flex items-center gap-3">
          <h2 className="m-0 font-mono text-[11px] font-normal tracking-[.08em] text-ink">
            {group.label}
          </h2>
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] text-subtle">{group.likes.length}</span>
        </div>
      )}
      <PosterGrid>
        {group.likes.map((like) => {
          const isRemoving = removing.has(like.movie.tmdbId);

          return (
            <PosterCard
              key={like.movie.tmdbId}
              title={like.movie.title}
              meta={movieMeta(like.movie)}
              poster={tmdbImage(like.movie.posterPath)}
              href={`/movies/${like.movie.tmdbId}`}
              className="transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(.2,.7,.2,1)]"
              style={{
                opacity: isRemoving ? 0 : 1,
                transform: `scale(${isRemoving ? 0.92 : 1})`,
              }}
              overlay={<RemoveHeart title={like.movie.title} onRemove={() => remove(like)} />}
            />
          );
        })}
      </PosterGrid>
    </section>
  ));
}

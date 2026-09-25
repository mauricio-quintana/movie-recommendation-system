import Image from 'next/image';
import Link from 'next/link';
import { releaseYear, tmdbImage } from '@/lib/format';
import type { Movie } from '@/lib/types';
import { LikeButton } from './like-button';

interface MovieCardProps {
  movie: Movie;
  /** undefined when the visitor is anonymous: the like button is hidden. */
  liked?: boolean;
  priority?: boolean;
}

export function MovieCard({ movie, liked, priority = false }: MovieCardProps) {
  const poster = tmdbImage(movie.posterPath);
  const year = releaseYear(movie.releaseDate);

  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/movies/${movie.tmdbId}`} className="group flex flex-1 flex-col">
        <div className="relative aspect-[2/3] bg-[var(--muted-surface)]">
          {poster ? (
            <Image
              src={poster}
              alt={`Poster of ${movie.title}`}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition group-hover:opacity-90"
              priority={priority}
            />
          ) : (
            <div className="text-muted flex h-full items-center justify-center p-4 text-center text-sm">
              No poster available
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h2 className="line-clamp-2 font-medium group-hover:underline">{movie.title}</h2>
          <p className="text-muted text-xs">
            {[year, movie.voteAverage !== null ? `★ ${movie.voteAverage.toFixed(1)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </Link>
      {liked !== undefined && (
        <div className="px-3 pb-3">
          <LikeButton tmdbId={movie.tmdbId} title={movie.title} liked={liked} />
        </div>
      )}
    </article>
  );
}

export function MovieGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{children}</div>;
}

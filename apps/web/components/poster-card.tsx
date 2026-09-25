import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { TiltedCard } from './react-bits/tilted-card';

interface PosterCardProps {
  title: string;
  meta: ReactNode;
  poster: string | null;
  href: string;
  caption?: string;
  /** Rendered over the poster, e.g. the like heart or a status chip. */
  overlay?: ReactNode;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Poster + title + meta: the card shared by Descubrir, Mis likes and the history of
 * Recomendaciones. Usable from Server and Client Components.
 */
export function PosterCard({
  title,
  meta,
  poster,
  href,
  caption = 'Ver detalle',
  overlay,
  priority,
  className = '',
  style,
}: PosterCardProps) {
  return (
    <article className={`flex min-w-0 flex-col gap-2.5 ${className}`} style={style}>
      <TiltedCard
        imageSrc={poster}
        altText={title}
        captionText={caption}
        href={href}
        overlayContent={overlay}
        priority={priority}
      />
      <div className="flex min-w-0 flex-col gap-[3px]">
        <Link
          href={href}
          className="line-clamp-2 text-[15px] leading-[1.25] font-semibold text-ink no-underline hover:underline"
        >
          {title}
        </Link>
        <span className="meta">{meta}</span>
      </div>
    </article>
  );
}

export function PosterGrid({ children }: { children: ReactNode }) {
  return <div className="poster-grid">{children}</div>;
}

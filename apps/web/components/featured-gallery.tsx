'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LikeButton } from './like-button';
import { AccordionGallery } from './react-bits/accordion-gallery';

export interface FeaturedMovie {
  tmdbId: number;
  title: string;
  backdrop: string | null;
  meta: string;
  liked: boolean;
}

/**
 * Descubrir hero: React Bits AccordionGallery with the active movie's title and actions below.
 */
export function FeaturedGallery({
  movies,
  defaultIndex = 2,
}: {
  movies: FeaturedMovie[];
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(Math.min(defaultIndex, movies.length - 1));
  const featured = movies[active];

  return (
    <section aria-label="Destacadas" className="flex flex-col gap-[18px]">
      <AccordionGallery
        items={movies.map((movie) => ({
          image: movie.backdrop,
          label: movie.title,
          href: `/movies/${movie.tmdbId}`,
        }))}
        defaultIndex={defaultIndex}
        height={440}
        expandRatio={0.52}
        trigger="hover"
        onActiveChange={setActive}
      />
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div aria-live="polite" className="flex min-w-0 flex-col gap-1.5">
          <span className="kicker">
            DESTACADA · {active + 1} de {movies.length}
          </span>
          <span className="text-[30px] leading-[1.08] font-bold tracking-[-.015em] text-balance">
            {featured.title}
          </span>
          <span className="text-sm text-muted">{featured.meta}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href={`/movies/${featured.tmdbId}`} className="btn-primary">
            Ver detalle
          </Link>
          <LikeButton
            key={featured.tmdbId}
            tmdbId={featured.tmdbId}
            title={featured.title}
            liked={featured.liked}
          />
        </div>
      </div>
    </section>
  );
}

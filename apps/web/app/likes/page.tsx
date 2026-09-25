import type { Metadata } from 'next';
import Link from 'next/link';
import { LikesCollection } from '@/components/likes-collection';
import { apiFetchAuthenticated } from '@/lib/api';
import { firstParam } from '@/lib/format';
import { LIKE_SORTS } from '@/lib/likes-grouping';
import type { Like } from '@/lib/types';

export const metadata: Metadata = { title: 'Mis likes' };

export default async function LikesPage({ searchParams }: PageProps<'/likes'>) {
  const requested = firstParam((await searchParams).sort);
  const sort = LIKE_SORTS.find((option) => option.key === requested) ?? LIKE_SORTS[0];
  const likes = await apiFetchAuthenticated<Like[]>('/likes', '/likes');
  const count = likes.length;

  return (
    <>
      <div className="flex max-w-[600px] flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h1 className="page-title">Mis likes</h1>
          <span className="meta">
            {count === 0
              ? 'Todavía sin películas'
              : `${count} ${count === 1 ? 'película guardada' : 'películas guardadas'}`}
          </span>
        </div>
        <p className="lede">
          Tu colección: las películas que guardaste con ♡. También son la base de tus
          recomendaciones.
        </p>
      </div>

      {count === 0 ? (
        <section className="dashed-panel flex flex-col items-center gap-3 px-6 pt-12 pb-[52px] text-center">
          <div aria-hidden="true" className="mb-2.5 flex items-end justify-center gap-3.5">
            <span className="aspect-[2/3] w-[78px] rounded-xl border border-dashed border-dash max-[760px]:hidden" />
            <span className="aspect-[2/3] w-[92px] rounded-[13px] border border-dashed border-dash-strong" />
            <span className="flex aspect-[2/3] w-28 items-center justify-center rounded-[15px] border border-ink bg-white text-2xl">
              ♡
            </span>
            <span className="aspect-[2/3] w-[92px] rounded-[13px] border border-dashed border-dash-strong" />
            <span className="aspect-[2/3] w-[78px] rounded-xl border border-dashed border-dash max-[760px]:hidden" />
          </div>
          <span className="kicker">0 PELÍCULAS GUARDADAS</span>
          <h2 className="m-0 text-2xl font-bold tracking-[-.01em] text-balance">
            Tu colección empieza con un ♡
          </h2>
          <p className="m-0 max-w-[400px] text-sm leading-[1.45] text-pretty text-muted">
            Dale like a las películas que te gustan mientras explorás. Aparecerán acá y las usaremos
            para recomendarte otras.
          </p>
          <Link href="/movies" className="btn-primary mt-1.5">
            Descubrir películas
          </Link>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-dashed border-dash px-4 py-3">
            <span className="text-sm">
              Tus {count} {count === 1 ? 'like alimenta' : 'likes alimentan'} tus recomendaciones.
              ¿Pedimos una?
            </span>
            <Link href="/recommendations" className="btn-secondary btn-sm ml-auto">
              Pedir recomendación
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <span className="meta">{sort.hint}</span>
            <nav
              aria-label="Ordenar"
              className="flex gap-1 rounded-lg border border-field bg-white p-[3px] max-[760px]:w-full"
            >
              {LIKE_SORTS.map((option) =>
                option.key === sort.key ? (
                  <span
                    key={option.key}
                    aria-current="true"
                    className="rounded-md bg-ink px-3 py-1.5 text-center text-[13px] font-semibold text-white max-[760px]:flex-1"
                  >
                    {option.label}
                  </span>
                ) : (
                  <Link
                    key={option.key}
                    href={option.key === 'recent' ? '/likes' : `/likes?sort=${option.key}`}
                    scroll={false}
                    className="rounded-md px-3 py-1.5 text-center text-[13px] text-ink no-underline hover:bg-hover max-[760px]:flex-1"
                  >
                    {option.label}
                  </Link>
                ),
              )}
            </nav>
          </div>

          <LikesCollection likes={likes} sort={sort.key} />
        </>
      )}
    </>
  );
}

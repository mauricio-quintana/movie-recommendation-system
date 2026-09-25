import Link from 'next/link';

type PageItem = number | 'gap';

/** Design rule: 1–5 near the start, otherwise 1 … p-1 p p+1, and always … last. */
export function pageWindow(page: number, totalPages: number): PageItem[] {
  const head: PageItem[] =
    page <= 3 ? [1, 2, 3, 4, 5] : [1, 'gap', page - 1, page, Math.min(page + 1, totalPages)];
  const items = head.filter((item) => item === 'gap' || item <= totalPages);

  if (totalPages > 5 && !items.includes(totalPages)) {
    if (items.at(-1) !== totalPages - 1) {
      items.push('gap');
    }
    items.push(totalPages);
  }

  return items.filter((item, index) => item !== items[index - 1]);
}

export function Pagination({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
}) {
  const item = 'min-w-[38px] h-[38px] flex items-center justify-center rounded-lg text-sm';

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1.5 pt-2">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-field bg-white px-3.5 py-2 text-sm text-ink no-underline hover:bg-hover"
        >
          ‹ Anterior
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="rounded-lg border border-field bg-white px-3.5 py-2 text-sm text-faint"
        >
          ‹ Anterior
        </span>
      )}
      <div className="flex gap-1.5 max-[760px]:hidden">
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} aria-hidden="true" className={`${item} text-subtle`}>
              …
            </span>
          ) : entry === page ? (
            <span
              key={entry}
              aria-current="page"
              className={`${item} bg-ink font-semibold text-white`}
            >
              {entry}
            </span>
          ) : (
            <Link
              key={entry}
              href={href(entry)}
              className={`${item} text-ink no-underline hover:bg-page-hover`}
            >
              {entry}
            </Link>
          ),
        )}
      </div>
      <span className="meta px-1.5">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-field bg-white px-3.5 py-2 text-sm text-ink no-underline hover:bg-hover"
        >
          Siguiente ›
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="rounded-lg border border-field bg-white px-3.5 py-2 text-sm text-faint"
        >
          Siguiente ›
        </span>
      )}
    </nav>
  );
}

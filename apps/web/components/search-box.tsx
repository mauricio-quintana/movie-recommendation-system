'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Plain GET form to /movies: works without JavaScript. On Descubrir it shows the current query.
 */
export function SearchBox({
  className = '',
  large = false,
}: {
  className?: string;
  large?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = pathname === '/movies' ? (searchParams.get('search') ?? '') : '';

  return (
    <form action="/movies" role="search" className={`field ${large ? 'px-3' : ''} ${className}`}>
      <span aria-hidden="true" className="text-sm text-faint">
        ⌕
      </span>
      <label className="sr-only" htmlFor={large ? 'search-mobile' : 'search'}>
        Buscar películas
      </label>
      <input
        // Remount when the query in the URL changes so the field reflects it.
        key={current}
        id={large ? 'search-mobile' : 'search'}
        name="search"
        type="search"
        defaultValue={current}
        placeholder="Buscar películas…"
        maxLength={100}
        className={`min-w-0 flex-1 border-none bg-transparent font-[inherit] outline-none ${large ? 'py-[11px] text-[15px]' : 'py-[9px] text-sm'}`}
      />
    </form>
  );
}

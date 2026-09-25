'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const SECTIONS = [
  { href: '/movies', label: 'Descubrir', short: 'Descubrir', icon: '◉', activeIcon: '◉' },
  { href: '/likes', label: 'Mis likes', short: 'Likes', icon: '♡', activeIcon: '♥' },
  { href: '/recommendations', label: 'Recomendaciones', short: 'Recs', icon: '◌', activeIcon: '◌' },
] as const;

export function useActiveSection(): string | undefined {
  const pathname = usePathname();
  return SECTIONS.find((section) => pathname.startsWith(section.href))?.href;
}

export function NavLinks() {
  const active = useActiveSection();

  return (
    <nav aria-label="Principal" className="flex gap-[22px] text-sm max-[760px]:hidden">
      {SECTIONS.map((section) => {
        const current = section.href === active;

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? 'page' : undefined}
            className={
              current
                ? 'border-b-2 border-ink pb-[3px] font-semibold text-ink no-underline'
                : 'pb-[5px] text-muted no-underline hover:text-ink'
            }
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { AccountMenu } from './account-menu';
import { SECTIONS, useActiveSection } from './nav-links';

/**
 * Bottom tab bar under 760px (the header navigation and search are hidden there).
 */
export function MobileTabs({ username }: { username: string | null }) {
  const active = useActiveSection();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 hidden justify-around border-t border-line bg-paper pt-2 pb-3.5 text-xs max-[760px]:flex"
    >
      {SECTIONS.map((section) => {
        const current = section.href === active;

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? 'page' : undefined}
            className={`flex min-w-16 flex-col items-center gap-0.5 no-underline ${current ? 'font-bold text-ink' : 'text-muted'}`}
          >
            <span aria-hidden="true" className="text-base">
              {current ? section.activeIcon : section.icon}
            </span>
            {section.short}
          </Link>
        );
      })}
      <AccountMenu username={username} variant="tab" />
    </nav>
  );
}

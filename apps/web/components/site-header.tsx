import Link from 'next/link';
import { Suspense } from 'react';
import { getSession } from '@/lib/api';
import { AccountMenu } from './account-menu';
import { MobileTabs } from './mobile-tabs';
import { NavLinks } from './nav-links';
import { SearchBox } from './search-box';

export async function SiteHeader() {
  const { user } = await getSession();
  const username = user?.username ?? null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1240px] items-center gap-7 px-6 py-3">
          <Link
            href="/movies"
            className="text-base font-bold tracking-[.02em] text-ink no-underline"
            aria-label="MRS, inicio"
          >
            MRS
          </Link>
          <NavLinks />
          <Suspense fallback={<div className="ml-auto w-[280px] max-[760px]:hidden" />}>
            <SearchBox className="ml-auto w-[280px] max-[760px]:hidden" />
          </Suspense>
          <div className="max-[760px]:hidden">
            <AccountMenu username={username} variant="avatar" />
          </div>
        </div>
      </header>
      <MobileTabs username={username} />
    </>
  );
}

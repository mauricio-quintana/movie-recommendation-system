import Link from 'next/link';
import { getSession } from '@/lib/api';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const { user } = await getSession();

  return (
    <header className="border-b border-[var(--border)]">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
      >
        <Link href="/movies" className="text-lg font-semibold">
          🎬 MovieRecs
        </Link>

        <div className="flex flex-1 flex-wrap items-center gap-4 text-sm">
          <Link href="/movies" className="link-nav">
            Movies
          </Link>
          {user && (
            <>
              <Link href="/likes" className="link-nav">
                My likes
              </Link>
              <Link href="/recommendations" className="link-nav">
                Recommendations
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted">
                Signed in as <strong className="text-[var(--foreground)]">{user.username}</strong>
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="link-nav">
                Sign in
              </Link>
              <Link href="/signup" className="button-primary">
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

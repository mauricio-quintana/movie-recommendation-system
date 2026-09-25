'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
  next: string;
}

const copy = {
  'sign-in': { title: 'Sign in', submit: 'Sign in', pending: 'Signing in…' },
  'sign-up': { title: 'Create account', submit: 'Create account', pending: 'Creating account…' },
};

/**
 * Posts to the API through the same-origin /api proxy, so Better Auth sets the
 * session cookie directly on the browser.
 */
export function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
        setError(message ?? 'Something went wrong. Please try again.');
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  const text = copy[mode];

  return (
    <form
      onSubmit={onSubmit}
      className="card mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
      noValidate={false}
    >
      <h1 className="text-2xl font-semibold">{text.title}</h1>

      <label className="flex flex-col gap-1 text-sm">
        Username
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_.]+"
          title="Letters, numbers, underscores and dots"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          maxLength={128}
          className="input"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="button-primary">
        {pending ? text.pending : text.submit}
      </button>

      <p className="text-muted text-sm">
        {mode === 'sign-in' ? (
          <>
            No account?{' '}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="link">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already registered?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="link">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

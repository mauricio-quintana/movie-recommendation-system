'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
  next: string;
}

const copy = {
  'sign-in': {
    title: 'Ingresar',
    kicker: 'BIENVENIDO DE NUEVO',
    submit: 'Ingresar',
    pending: 'Ingresando…',
  },
  'sign-up': {
    title: 'Crear cuenta',
    kicker: 'EMPEZÁ TU COLECCIÓN',
    submit: 'Crear cuenta',
    pending: 'Creando cuenta…',
  },
};

const errorMessages: Record<number, string> = {
  400: 'Revisá el usuario (3–30 letras, números, _ o .) y la contraseña (mínimo 8 caracteres).',
  401: 'Usuario o contraseña incorrectos.',
  409: 'Ese nombre de usuario ya está en uso.',
  429: 'Demasiados intentos. Esperá un minuto y probá de nuevo.',
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
        setError(errorMessages[response.status] ?? 'Algo salió mal. Probá de nuevo.');
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError('No pudimos conectar con el servidor. Probá de nuevo.');
    } finally {
      setPending(false);
    }
  }

  const text = copy[mode];

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-white p-7"
    >
      <div className="flex flex-col gap-1.5">
        <span className="kicker">{text.kicker}</span>
        <h1 className="page-title">{text.title}</h1>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Usuario
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_.]+"
          title="Letras, números, guiones bajos y puntos"
          className="rounded-lg border border-field bg-white px-3 py-2.5 text-[15px] font-normal outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          maxLength={128}
          className="rounded-lg border border-field bg-white px-3 py-2.5 text-[15px] font-normal outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-lg border border-dashed border-dash-strong px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? text.pending : text.submit}
      </button>

      <p className="m-0 text-sm text-muted">
        {mode === 'sign-in' ? (
          <>
            ¿No tenés cuenta?{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-semibold text-ink underline"
            >
              Creá una
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{' '}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-semibold text-ink underline"
            >
              Ingresá
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PasswordField } from './password-field';

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

type Field = 'username' | 'password' | 'confirmPassword';

interface FormError {
  message: string;
  /** Fields highlighted in red. */
  fields: Field[];
}

const errorsByStatus: Record<number, FormError> = {
  400: {
    message:
      'Revisá el usuario (3–30 letras, números, _ o .) y la contraseña (mínimo 8 caracteres).',
    fields: ['username', 'password'],
  },
  // The API does not tell which one failed, so accounts cannot be probed.
  401: { message: 'Usuario o contraseña incorrectos.', fields: ['username', 'password'] },
  409: { message: 'Ese usuario ya existe. Elegí otro nombre.', fields: ['username'] },
  429: { message: 'Demasiados intentos. Esperá un minuto y probá de nuevo.', fields: [] },
};

const inputClass =
  'rounded-lg border border-field bg-white px-3 py-2.5 text-[15px] font-normal outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink aria-invalid:border-danger aria-invalid:focus-visible:outline-danger';

/**
 * Posts to the API through the same-origin /api proxy, so Better Auth sets the
 * session cookie directly on the browser.
 */
export function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const signUp = mode === 'sign-up';
  // Only shown once the user has typed something in the confirmation field.
  const mismatch = signUp && confirmation.length > 0 && confirmation !== password;
  const invalid = (field: Field) => error?.fields.includes(field) || undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);

    // The confirmation is checked here only; the API contract stays username/password.
    if (signUp && form.get('password') !== form.get('confirmPassword')) {
      setError({ message: 'Las contraseñas no coinciden.', fields: ['confirmPassword'] });
      return;
    }

    setPending(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });

      if (!response.ok) {
        setError(
          errorsByStatus[response.status] ?? {
            message: 'Algo salió mal. Probá de nuevo.',
            fields: [],
          },
        );
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError({ message: 'No pudimos conectar con el servidor. Probá de nuevo.', fields: [] });
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
          aria-invalid={invalid('username')}
          onChange={() => setError(null)}
          className={inputClass}
        />
      </label>

      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete={signUp ? 'new-password' : 'current-password'}
        required
        minLength={8}
        maxLength={128}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(null);
        }}
        aria-invalid={invalid('password')}
        hint={signUp ? 'Mínimo 8 caracteres.' : undefined}
      />

      {signUp && (
        <PasswordField
          label="Repetí la contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError(null);
          }}
          aria-invalid={mismatch || invalid('confirmPassword')}
          hint={mismatch ? 'Las contraseñas no coinciden.' : undefined}
        />
      )}

      {error && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm font-semibold text-danger"
        >
          <span aria-hidden="true">✕</span>
          {error.message}
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

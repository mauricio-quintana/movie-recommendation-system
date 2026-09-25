'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
    } finally {
      setPending(false);
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className="btn-secondary btn-sm">
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}

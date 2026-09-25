import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getSession } from '@/lib/api';
import { safeNextPath } from '@/lib/format';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const next = safeNextPath((await searchParams).next);

  if ((await getSession()).authenticated) {
    redirect(next);
  }

  return <AuthForm mode="sign-in" next={next} />;
}

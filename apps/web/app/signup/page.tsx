import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';
import { getSession } from '@/lib/api';
import { safeNextPath } from '@/lib/format';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const next = safeNextPath((await searchParams).next);

  if ((await getSession()).authenticated) {
    redirect(next);
  }

  return <AuthForm mode="sign-up" next={next} />;
}

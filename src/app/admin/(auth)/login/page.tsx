import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await readSession();
  if (session) redirect('/admin');
  const { next } = await searchParams;

  // No credentials are ever rendered on this page, in any environment. The form is the only thing
  // here, so a visitor who reaches it learns nothing about the accounts it accepts — and a
  // deployment can never leak a seeded default by leaving it on screen.
  return <LoginForm next={next ?? '/admin'} />;
}

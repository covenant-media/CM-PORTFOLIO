import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await readSession();
  if (session) redirect('/admin');
  const { next } = await searchParams;

  // Only the local demo seed prints itself; a real deployment never sees this block.
  const devHint =
    process.env.NODE_ENV !== 'production' && process.env.ADMIN_SEED_VISIBLE !== '0'
      ? { email: process.env.ADMIN_EMAIL ?? 'covenant@example.test', password: process.env.ADMIN_PASSWORD ?? 'covenant-demo-2026' }
      : null;

  return <LoginForm next={next ?? '/admin'} devHint={devHint} />;
}

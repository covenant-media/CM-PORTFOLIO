import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { getSettings } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Sign in — Covenant CMS',
    robots: { index: false, follow: false },
  };
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="theme-admin flex min-h-dvh items-center justify-center bg-ink-1000 px-5 py-10 text-fg">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2 border border-[var(--accent)]/40 text-[var(--accent)]">
            <Icon name="sliders" size={17} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px]">{String(settings['brand.name'] ?? 'Covenant Media')}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-fg-dim">Content management</span>
          </span>
        </div>
        <div className="rounded-4 border border-line bg-ink-950/80 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">{children}</div>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-fg-dim">
          Private area. Failed attempts are rate limited and recorded; sessions expire after 12 hours of inactivity.
        </p>
      </div>
    </div>
  );
}

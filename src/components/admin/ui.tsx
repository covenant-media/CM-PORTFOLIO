/**
 * Small shared pieces for the CMS chrome. Presentation only — no data fetching —
 * so both server components and client components can use them.
 */
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

/** Module icon keys in the registry → icons that exist in the shared icon set. */
const ICON_MAP: Record<string, IconName> = {
  settings: 'settings',
  pages: 'layout',
  sections: 'layers',
  blocks: 'layers',
  navigation: 'menu',
  mail: 'mail',
  link: 'link',
  service: 'briefcase',
  user: 'user',
  users: 'users',
  quote: 'quote',
  camera: 'camera',
  film: 'film',
  video: 'film',
  gallery: 'gallery',
  image: 'image',
  library: 'archive',
  code: 'code',
  gauge: 'gauge',
  clock: 'clock',
  key: 'key',
  resume: 'book',
  price: 'tag',
  pricing: 'tag',
  search: 'search',
  inbox: 'inbox',
  star: 'star',
  shield: 'shield',
  chart: 'gauge',
  brand: 'sparkle',
  form: 'clipboard',
  palette: 'palette',
  database: 'database',
};

export interface AdminNavItemLite {
  key: string;
  label: string;
  icon: string;
  level: 'none' | 'read' | 'write' | 'manage';
}

export interface AdminNavGroupLite {
  key: string;
  label: string;
  hint: string;
  items: AdminNavItemLite[];
}

export function adminIcon(name: string | undefined): IconName {
  if (!name) return 'layers';
  return (ICON_MAP[name] ?? name) as IconName;
}

export function Pill({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'ok' | 'warn' | 'info' | 'accent'; children: React.ReactNode; className?: string }) {
  const tones: Record<string, string> = {
    neutral: 'border-line text-fg-muted',
    ok: 'border-ok-400/40 text-ok-400',
    warn: 'border-alert-400/40 text-alert-400',
    info: 'border-signal-400/40 text-signal-400',
    accent: 'border-accent/40 text-[var(--accent)]',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-pill border px-2 py-[2px] text-[11px] leading-none tracking-wide', tones[tone] ?? tones.neutral, className)}>
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'info'> = {
  published: 'ok',
  draft: 'warn',
  archived: 'neutral',
  new: 'info',
  read: 'neutral',
  replied: 'ok',
  spam: 'neutral',
};

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Pill>;
}

export function Panel({ title, hint, action, children, className, pad = true }: { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('rounded-4 border border-line bg-ink-900/70 backdrop-blur-sm', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            {title ? <h2 className="text-[13px] font-medium tracking-wide text-fg">{title}</h2> : null}
            {hint ? <p className="mt-0.5 text-[12px] leading-snug text-fg-dim">{hint}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={pad ? 'px-5 py-4' : ''}>{children}</div>
    </section>
  );
}

export function TinyButton({ href, children, icon, target }: { href: string; children: React.ReactNode; icon?: IconName; target?: string }) {
  return (
    <Link
      href={href}
      target={target}
      className="inline-flex items-center gap-1.5 rounded-2 border border-line px-2.5 py-1 text-[12px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </Link>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-1.5 last:border-0">
      <span className="text-[12px] text-fg-dim">{label}</span>
      <span className="text-right text-[12.5px] text-fg">{value}</span>
    </div>
  );
}

export function bytesLabel(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function whenLabel(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toISOString().slice(0, 10);
}

export function Meta({ items }: { items: (string | null | undefined)[] }) {
  const list = items.filter((v): v is string => Boolean(v));
  if (!list.length) return null;
  return <span className="text-[11.5px] text-fg-dim">{list.join(' · ')}</span>;
}

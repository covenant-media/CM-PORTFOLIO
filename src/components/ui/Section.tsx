import { cx } from '@/lib/utils/text';
import { CountUp } from './Motion';
import { Reveal } from './Reveal';
import { Icon } from './Icon';

export function Section({
  id,
  children,
  className,
  size = 'default',
  tone = 'transparent',
  as: Tag = 'section',
  bleed = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'tight' | 'loose' | 'flush';
  tone?: 'transparent' | 'raised' | 'sunken' | 'paper' | 'accent';
  as?: 'section' | 'div' | 'footer' | 'header';
  bleed?: boolean;
}) {
  const padding = {
    default: 'py-16 md:py-24 lg:py-28',
    tight: 'py-10 md:py-14',
    loose: 'py-20 md:py-32 lg:py-40',
    flush: 'py-0',
  }[size];
  const tones: Record<string, string> = {
    transparent: '',
    raised: 'bg-[var(--color-ink-900)]',
    sunken: 'bg-[var(--color-ink-1000)]',
    paper: 'on-paper',
    accent: 'bg-[var(--color-ink-900)] border-y border-[rgba(243,241,236,.08)]',
  };
  return (
    <Tag
      id={id}
      className={cx('relative isolate', padding, tones[tone], !bleed && '', className)}
      data-section={id}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  index,
  align = 'left',
  action,
  className,
  as: Tag = 'h2',
  id,
}: {
  eyebrow?: string | null;
  title?: string | null;
  lede?: string | null;
  index?: number;
  align?: 'left' | 'center' | 'split';
  action?: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
}) {
  const headingClass = Tag === 'h1' ? 'display-2' : Tag === 'h3' ? 'display-4' : 'display-3';
  if (align === 'split') {
    return (
      <Reveal className={cx('flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-16', className)}>
        <div className="max-w-2xl">
          {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
          {title ? (
            <Tag id={id} className={cx(headingClass, 'mt-4')}>
              {title}
            </Tag>
          ) : null}
          {lede ? <p className="lede mt-4 max-w-xl text-fg-muted">{lede}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </Reveal>
    );
  }
  return (
    <Reveal className={cx(align === 'center' && 'mx-auto max-w-3xl text-center', 'max-w-3xl', className)}>
      {eyebrow ? <Eyebrow index={index} center={align === 'center'}>{eyebrow}</Eyebrow> : null}
      {title ? (
        <Tag id={id} className={cx(headingClass, align === 'center' ? 'mt-5' : 'mt-4')}>
          {title}
        </Tag>
      ) : null}
      {lede ? <p className={cx('lede mt-4 text-fg-muted', align === 'center' && 'mx-auto max-w-xl')}>{lede}</p> : null}
    </Reveal>
  );
}

export function Eyebrow({
  children,
  index,
  center = false,
  className,
}: {
  children?: React.ReactNode;
  index?: number;
  center?: boolean;
  className?: string;
}) {
  return (
    <p className={cx('flex items-center gap-3 eyebrow', center && 'justify-center', className)}>
      {index !== undefined ? (
        <span className="tnum text-[var(--accent)] opacity-90">{String(index + 1).padStart(2, '0')}</span>
      ) : null}
      {index !== undefined && children ? <span className="h-px w-6 bg-[rgba(243,241,236,.24)]" aria-hidden /> : null}
      {children ? <span>{children}</span> : null}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-[rgba(243,241,236,.09)]', className)} aria-hidden />;
}

export function Tag({
  children,
  tone = 'neutral',
  className,
  size = 'sm',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'line';
  className?: string;
  size?: 'xs' | 'sm';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-[rgba(243,241,236,.055)] text-fg-muted border-[rgba(243,241,236,.09)]',
    accent: 'bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)] border-[color-mix(in_oklab,var(--accent)_32%,transparent)]',
    ok: 'bg-[rgba(116,201,160,.12)] text-[var(--color-ok-400)] border-[rgba(116,201,160,.28)]',
    warn: 'bg-[rgba(232,121,90,.12)] text-[var(--color-alert-400)] border-[rgba(232,121,90,.3)]',
    line: 'border-[rgba(243,241,236,.16)] text-fg-muted',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill border font-medium',
        size === 'xs' ? 'px-2 py-0.5 text-[0.6875rem] tracking-[0.02em]' : 'px-2.5 py-1 text-xs',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Placeholder disclosure — never let seeded content read as a real claim. */
export function SampleTag({ label = 'Placeholder', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill border border-dashed border-[rgba(232,121,90,.45)] bg-[rgba(232,121,90,.1)] px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--color-alert-400)]',
        className,
      )}
      title="Seeded sample content — replace it in the CMS"
    >
      <Icon name="info" size={12} />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'layers',
  action,
  className,
  compact = false,
}: {
  title: string;
  body?: string | null;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-start gap-3 rounded-4 border border-dashed border-[rgba(243,241,236,.14)] bg-[rgba(243,241,236,.02)] text-left',
        compact ? 'p-5' : 'p-7 md:p-9',
        className,
      )}
    >
      <span className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.12)] text-[var(--accent)]">
        <Icon name={icon} size={17} />
      </span>
      <p className="display-4 text-fg">{title}</p>
      {body ? <p className="max-w-lg text-sm leading-relaxed text-fg-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function StatBlock({
  value,
  label,
  note,
  className,
  animate = false,
}: {
  value: string | number;
  label: string;
  note?: string | null;
  className?: string;
  animate?: boolean;
}) {
  const numeric = typeof value === 'number' || /^\d+$/.test(String(value));
  return (
    <div className={cx('min-w-0', className)}>
      <p className="tnum font-display text-3xl leading-none tracking-[-0.03em] md:text-[2.5rem]">
        {animate && numeric ? <CountUp to={Number(value)} className="inline-block" /> : value}
      </p>
      <p className="mt-2 text-sm text-fg-muted">{label}</p>
      {note ? <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{note}</p> : null}
    </div>
  );
}

'use client';

/**
 * The studio's figures, between the hero's calls to action and the capability list.
 *
 * Owned by the Media surface rather than shared with the Tech portfolio: the pattern is the
 * same idea (a four-up band of counting numbers), the treatment is not. Here the numbers sit in
 * the media surface's divided-panel language — hairline rules between cells rather than dots in
 * the margin, brass only on the suffix — so it belongs to this page.
 *
 * The numbers themselves come from the data module, which a CMS loader can replace; nothing is
 * counted up until the band is on screen, and with reduced motion or without JavaScript the
 * final values are simply there.
 */
import { CountUp, FadeIn } from '@/components/ui/Motion';
import { MEDIA_STATS } from '@/lib/media/sample-portfolio';

export function MediaStats({ className, stats }: { className?: string; stats?: { label: string; value: number; suffix: string }[] }) {
  // The CMS figures when the owner has set them, the studio's published ones otherwise.
  const rows = stats?.length ? stats : MEDIA_STATS;
  if (!rows.length) return null;

  return (
    <FadeIn delay={80} className={className}>
      <dl
        aria-label="Covenant Media at a glance"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[rgba(243,241,236,.07)] md:grid-cols-4"
      >
        {rows.map((stat) => (
          <div key={stat.label} className="group/stat relative bg-[color:var(--color-ink-950)] px-5 py-4 text-center transition-colors duration-500 hover:bg-[color:var(--color-ink-900)] sm:py-6 md:px-6 md:text-left">
            <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100 md:inset-x-6" />
            <dd className="flex items-baseline justify-center font-display text-[1.65rem] font-light leading-none tracking-[-0.035em] sm:text-[clamp(1.9rem,3.4vw,2.5rem)] md:justify-start">
              <CountUp to={stat.value} />
              <span className="ml-0.5 text-[var(--accent)]">{stat.suffix}</span>
            </dd>
            <dt className="mt-2.5 font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-fg-dim">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </FadeIn>
  );
}

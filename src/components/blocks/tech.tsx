import Link from 'next/link';
import { Section, SectionHeader, EmptyState, Eyebrow, SampleTag } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { FadeIn, DecodeText } from '@/components/ui/Motion';
import { blockProps } from '@/lib/cms/blocks';
import { cx } from '@/lib/utils/text';
import type { ExperienceEntry, SkillItem } from '@/lib/types/content';
import { pb } from './helpers';
import type { Props } from './helpers';

/* ── skill matrix ─────────────────────────────────────────────────────────── */
export function SkillMatrix({
  block,
  groups,
}: {
  block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null };
  groups: { category: string; label: string; skills: SkillItem[] }[];
}) {
  const props = blockProps('skill_matrix', block.props);
  const layout = pb(props, 'compact', false) ? 'cloud' : (props.layout as string) ?? 'matrix';
  const limit = Number(props.limit ?? 30);
  if (!groups.length) {
    return (
      <Section id="skills">
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Capability'} title={block.headline ?? 'Skills'} />
          <EmptyState className="mt-10" icon="cpu" compact title="No skills published" body="Add them in the CMS → Skills. Each one can carry the evidence that backs the claim." />
        </div>
      </Section>
    );
  }
  const flat = groups.flatMap((g) => g.skills).slice(0, limit);

  if (layout === 'cloud') {
    return (
      <Section id="skills" size="tight">
        <div className="container-page">
          {block.headline ? <SectionHeader eyebrow={block.eyebrow ?? 'Capability'} title={block.headline} lede={block.body} /> : null}
          <ul className="mt-8 flex flex-wrap gap-2">
            {flat.map((skill) => (
              <li key={skill.id} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.03)] px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-fg-muted transition hover:border-[var(--accent)] hover:text-fg">
                {skill.name}
              </li>
            ))}
          </ul>
        </div>
      </Section>
    );
  }

  return (
    <Section id="skills">
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Capability'} title={block.headline ?? 'What I build with'} lede={block.body} />
        <div className={cx('mt-12 grid gap-x-8 gap-y-12', layout === 'bars' ? 'lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
          {groups.map((group, gi) => (
            <FadeIn key={group.category} delay={gi * 60}>
              <div>
                <div className="flex items-baseline justify-between gap-4 border-b border-[rgba(243,241,236,.1)] pb-3">
                  <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                    {layout === 'bars' ? <DecodeText text={group.label} /> : group.label}
                  </h3>
                  <span className="tnum font-mono text-[0.625rem] text-fg-dim">{group.skills.length}</span>
                </div>
                <ul className="mt-4 space-y-3.5">
                  {group.skills.map((skill) => (
                    <li key={skill.id} className="group/skill">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate text-[0.9375rem] text-fg">{skill.name}</span>
                          {skill.isSample ? <SampleTag /> : null}
                        </span>
                        {layout === 'bars' ? (
                          <span className="flex shrink-0 gap-1" aria-hidden>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={cx('h-1 w-4 rounded-full', i < skill.level ? 'bg-[var(--accent)]' : 'bg-[rgba(243,241,236,.14)]')} />
                            ))}
                          </span>
                        ) : (
                          <span className="tnum shrink-0 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-fg-dim">
                            {skill.yearsStart ? `since ${skill.yearsStart}` : ''}
                          </span>
                        )}
                      </div>
                      {skill.description && layout !== 'cloud' ? (
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-fg-dim">{skill.description}</p>
                      ) : null}
                      {pb(props, 'showEvidence', false) && skill.evidence ? (
                        <p className="mt-1 flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-dim">
                          <Icon name="check" size={11} className="text-[var(--accent)]" /> {skill.evidence}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── experience timeline ──────────────────────────────────────────────────── */
export function ExperienceTimeline({
  block,
  items,
  projectHref = '/tech/projects',
}: {
  block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null };
  items: ExperienceEntry[];
  projectHref?: string;
}) {
  const props = blockProps('experience_timeline', block.props);
  const limit = Number(props.limit ?? 12);
  const showStack = pb(props, 'showStack', true);
  const rows = items.slice(0, limit);

  if (!rows.length) {
    return (
      <Section id="experience">
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Track record'} title={block.headline ?? 'Experience'} />
          <EmptyState className="mt-10" icon="clock" compact title="No timeline entries yet" body="Add roles, freelance work and training in the CMS → Experience. The PRD starts the journey around 2015 — fill it with the real details." />
        </div>
      </Section>
    );
  }

  return (
    <Section id="experience">
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Track record'} title={block.headline ?? 'The path so far'} lede={block.body} />
        <ol className="mt-12 border-l border-[rgba(243,241,236,.12)] pl-6 md:pl-10">
          {rows.map((entry, i) => (
            <FadeIn key={entry.id} delay={(i % 6) * 50} as="li" className="relative pb-10 last:pb-0">
              <span aria-hidden className="absolute -left-[calc(1.5rem+1px)] top-2 size-2 rounded-full bg-[var(--accent)] ring-4 ring-[var(--color-ink-950)] md:-left-[calc(2.5rem+1px)]" />
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="tnum font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{entry.rangeLabel}</span>
                {entry.isCurrent ? (
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-[rgba(116,201,160,.12)] px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-[var(--color-ok-400)]">
                    <span className="animate-pulse-dot size-1 rounded-full bg-[var(--color-ok-400)]" /> current
                  </span>
                ) : null}
                {entry.isSample ? <SampleTag /> : null}
              </div>
              <h3 className="mt-2.5 font-display text-[1.3rem] leading-snug tracking-[-0.02em] md:text-[1.55rem]">{entry.role}</h3>
              {entry.organization ? (
                <p className="mt-1 text-[0.9375rem] text-fg-muted">
                  {entry.organization}
                  {entry.location ? <span className="text-fg-dim"> · {entry.location}</span> : null}
                  <span className="ml-2 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-fg-dim">{entry.kind}</span>
                </p>
              ) : null}
              {entry.summary ? <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted">{entry.summary}</p> : null}
              {entry.bullets.length ? (
                <ul className="mt-4 space-y-2">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-fg-muted">
                      <span aria-hidden className="mt-[0.55rem] size-1 shrink-0 rounded-full bg-[var(--accent)] opacity-70" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {showStack && entry.technologies.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {entry.technologies.map((tech) => (
                    <li key={tech} className="rounded-pill border border-[rgba(243,241,236,.1)] px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-fg-dim">
                      {tech}
                    </li>
                  ))}
                </ul>
              ) : null}
            </FadeIn>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[rgba(243,241,236,.09)] pt-6">
          <Link href={projectHref} className="group inline-flex items-center gap-2 text-[0.9375rem] text-[var(--accent)]">
            See the work this produced
            <Icon name="arrow-right" size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ── generic annotated list (used by project detail pages) ────────────────── */
export function DetailList({ items, title, tone = 'default' }: { items: string[]; title: string; tone?: 'default' | 'accent' }) {
  if (!items.length) return null;
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <ul className={cx('mt-4 space-y-2.5', tone === 'accent' && 'border-l-2 border-[var(--accent)] pl-5')}>
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-fg-muted">
            <span aria-hidden className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-[var(--accent)] opacity-70" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

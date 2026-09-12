'use client';

/**
 * Catalog grids for the three media formats.
 *
 * Each format gets its own screen (`/media/long-form`, `/media/short-form`,
 * `/media/photography`) so nothing unrelated is ever mixed into one list, and each one is a
 * complete library rather than a longer version of the front page:
 *
 *   • a filter bar built from the categories the items actually carry, with counts, so the
 *     library can be narrowed without a second page;
 *   • the same cards as the homepage, opening the same details card, so an entry behaves
 *     identically wherever it is found;
 *   • short supporting lines on the vertical edits, where a title alone says very little.
 *
 * The filters are derived from the data, so adding a category in the CMS adds a filter here.
 */
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MediaDetailsCard, MediaPreviewCard, useDetailsCard } from './MediaCards';
import { MediaPhotoWall } from './MediaGalleries';
import type { MediaFormat, MediaItem } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

/** The one-line note under a short-form card. Written from the piece, never a description dump. */
const SHORT_NOTES: Record<string, string> = {
  mda_futia_promo: 'Event promo, cut to the beat and built to be watched without sound.',
  mda_tech_event_awareness: 'Awareness cut from the tech event, landscape footage reframed for the feed.',
  mda_church_ministration: 'Ministration highlight, chosen for the moments that carried the room.',
  mda_wedding_highlight: 'Wedding highlight: the day compressed into the parts people rewatch.',
  mda_burial_tribute: 'Memorial tribute, edited quietly and delivered to the family the same week.',
};

function FilterBar({
  categories,
  active,
  onChange,
  total,
}: {
  categories: { name: string; count: number }[];
  active: string;
  onChange: (next: string) => void;
  total: number;
}) {
  if (categories.length < 2) return null;
  const options = [{ name: 'All', count: total }, ...categories];

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
      {options.map((option) => {
        const selected = active === option.name;
        return (
          <button
            key={option.name}
            type="button"
            onClick={() => onChange(option.name)}
            aria-pressed={selected}
            className={cx(
              'inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5 text-[0.8125rem] transition duration-300',
              selected
                ? 'border-[var(--accent)]/60 bg-[var(--accent)]/12 text-fg'
                : 'border-[rgba(243,241,236,.12)] text-fg-muted hover:border-[rgba(243,241,236,.28)] hover:text-fg',
            )}
          >
            {option.name}
            <span className={cx('tnum font-mono text-[0.5625rem] tracking-[0.1em]', selected ? 'text-[var(--accent)]' : 'text-fg-dim')}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MediaCatalogGrid({ items, format }: { items: MediaItem[]; format: MediaFormat }) {
  const { item, open, close } = useDetailsCard();
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of items) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);

  const visible = category === 'All' ? items : items.filter((entry) => entry.category === category);

  if (!items.length) {
    return (
      <p className="mt-10 rounded-4 border border-dashed border-[rgba(243,241,236,.14)] p-8 text-center text-fg-muted">
        Nothing published in this format yet.
      </p>
    );
  }

  const short = format === 'short';
  const photo = format === 'photo';

  return (
    <>
      <FilterBar categories={categories} active={category} onChange={setCategory} total={items.length} />

      {photo ? (
        <MediaPhotoWall items={visible} layout="grid" />
      ) : visible.length ? (
        <div
          className={cx(
            'mt-8',
            short ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5' : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {visible.map((entry) => (
            <div key={entry.id} className="flex flex-col">
              <MediaPreviewCard
                item={entry}
                aspect={short ? 'portrait' : 'video'}
                preview={short ? 'none' : 'hover'}
                previewPaused={item !== null}
                onOpen={open}
                sizes={short ? '(max-width: 640px) 45vw, 20vw' : '(max-width: 640px) 92vw, 32vw'}
                showMeta={!short}
              />
              {short ? (
                <div className="mt-3">
                  <p className="font-display text-[1rem] leading-tight tracking-[-0.015em] text-fg">{entry.title}</p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">{SHORT_NOTES[entry.id] ?? entry.tags.slice(0, 2).join(' · ')}</p>
                  <p className="mt-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">
                    {[entry.category, entry.duration].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 flex items-center gap-2 rounded-4 border border-dashed border-[rgba(243,241,236,.14)] p-6 text-[0.875rem] text-fg-muted">
          <Icon name="info" size={15} className="shrink-0" />
          Nothing in this category yet. Choose All to see the whole library.
        </p>
      )}

      {item ? <MediaDetailsCard item={item} onClose={close} /> : null}
    </>
  );
}

'use client';

/**
 * The galleries that make up the Media Portfolio page.
 *
 *   • `MediaLongFormRows`   two rows of long-form work moving in opposite directions, with
 *                           hover-pause and a muted hover preview per card.
 *   • `MediaShortFormRail`  one 9:16 rail that rolls continuously on its own thumbnails.
 *   • `MediaPhotoWall`      photography as an editorial masonry that keeps each frame's own
 *                           ratio (mixed portrait and landscape, no forced crops, no text).
 *   • `MediaTestimonialRail` client stories on a draggable, continuously moving rail.
 *
 * All four share `MediaTicker` (the loop), `MediaPreviewCard` (the card) and
 * `MediaDetailsCard` (the modal), so behaviour and motion stay consistent between them.
 *
 * Every section that has a catalog ends with a link to it, because the front page is a
 * selection and the catalogs are the full library. Those links are the only way in, so they
 * are real buttons in the page, not a footnote.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { emitLightbox } from '@/components/ui/Lightbox';
import { MediaTicker } from './MediaTicker';
import { MediaDetailsCard, MediaPreviewCard, useDetailsCard } from './MediaCards';
import type { MediaItem, MediaTestimonial } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

/** The action at the end of a section: opens the matching catalog. */
function ViewCatalog({ href, label = 'View Catalog' }: { href: string; label?: string }) {
  return (
    <Button href={href} variant="outline" size="md" iconEnd="arrow-right" className="shrink-0" data-analytics="cta_click" data-analytics-target={href}>
      {label}
    </Button>
  );
}

/**
 * The action that closes a work section.
 *
 * Only the button: the section headers above already say what each row is, and a second line of
 * explanation under the work was doing nothing except adding height.
 */
function SectionActions({ more }: { more?: { href: string; label?: string } }) {
  if (!more) return null;
  return (
    <div className="mt-8 flex justify-end border-t border-[rgba(243,241,236,.07)] pt-6">
      <ViewCatalog href={more.href} label={more.label ?? 'View Catalog'} />
    </div>
  );
}

/* ── long-form ─────────────────────────────────────────────────────────────── */

export function MediaLongFormRows({ items, more }: { items: MediaItem[]; more?: { href: string; label?: string } }) {
  const { item, open, close } = useDetailsCard();
  if (!items.length) return null;

  const card = (entry: MediaItem) => (
    <div key={entry.id} className="w-[76vw] sm:w-[44vw] lg:w-[24vw] xl:w-[20rem]">
      <MediaPreviewCard
        item={entry}
        aspect="video"
        preview="hover"
        previewPaused={item !== null}
        onOpen={open}
        sizes="(max-width: 640px) 76vw, (max-width: 1024px) 44vw, 20rem"
      />
    </div>
  );

  // The second row is the same library in a different order, not the same list reversed: the
  // two rows then show different pieces side by side instead of mirroring each other, and
  // neither row repeats an item inside the width of the screen.
  const rotation = Math.max(1, Math.floor(items.length / 2));
  const alternate = [...items.slice(rotation), ...items.slice(0, rotation)];

  return (
    <>
      {/* Row one travels right to left, row two travels left to right. Both pause on hover so
          a card can be read, previewed and opened without chasing it. */}
      <div className="mt-10 space-y-4 md:space-y-5">
        <MediaTicker speed={22} gap={16} pauseOnHover draggable ariaLabel="Long-form work, first row">
          {items.map(card)}
        </MediaTicker>
        <MediaTicker speed={-20} gap={16} pauseOnHover draggable ariaLabel="Long-form work, second row">
          {alternate.map(card)}
        </MediaTicker>
      </div>
      <SectionActions more={more} />
      {item ? <MediaDetailsCard item={item} onClose={close} /> : null}
    </>
  );
}

/* ── short-form ────────────────────────────────────────────────────────────── */

/**
 * Vertical work, rolling on its own thumbnails.
 *
 * **Nothing here starts by itself.** The cards used to mount a muted embed while they were on
 * screen; on a front page that rolls a row past the visitor, that meant players starting
 * unattended, which is exactly what was asked to stop. The rail now advertises the work with
 * stills, and playback happens only after a card is deliberately selected. It also keeps the
 * page light: a rolling row of vertical video mounts no players at all.
 */
export function MediaShortFormRail({ items, more }: { items: MediaItem[]; more?: { href: string; label?: string } }) {
  const { item, open, close } = useDetailsCard();
  if (!items.length) return null;

  return (
    <>
      {/* Card widths are chosen so the group is always wider than the viewport: five pieces at
          this size fill a desktop row before the loop repeats, which is what keeps a duplicate
          from ever appearing inside the visible strip. */}
      <MediaTicker speed={20} gap={14} pauseOnHover draggable ariaLabel="Short-form work" className="mt-10">
        {items.map((entry) => (
          <div key={entry.id} className="w-[62vw] sm:w-[38vw] lg:w-[18vw] xl:w-[15.5rem]">
            <MediaPreviewCard
              item={entry}
              aspect="portrait"
              preview="none"
              previewPaused={item !== null}
              onOpen={open}
              sizes="(max-width: 640px) 62vw, (max-width: 1024px) 38vw, 15.5rem"
            />
          </div>
        ))}
      </MediaTicker>
      <SectionActions more={more} />
      {item ? <MediaDetailsCard item={item} onClose={close} /> : null}
    </>
  );
}

/* ── photography ───────────────────────────────────────────────────────────── */

/**
 * Photography, laid out so the pictures keep their own shape.
 *
 * Every frame is rendered at its real aspect ratio (recorded on the record as `width` and
 * `height`) inside a multi-column masonry, so a portrait stays a portrait, a landscape stays a
 * landscape, and nothing is cropped into a uniform tile to make the grid tidy. The tiles carry
 * no captions or labels: the photograph is the content, and the words live in the viewer.
 */
export function MediaPhotoWall({
  items,
  more,
  layout = 'mosaic',
}: {
  items: MediaItem[];
  more?: { href: string; label?: string };
  layout?: 'mosaic' | 'grid';
}) {
  if (!items.length) return null;

  const withImage = items.filter((entry) => entry.image);
  const openPhoto = (entry: MediaItem) => {
    if (!entry.image) return;
    const index = Math.max(0, withImage.indexOf(entry));
    emitLightbox(
      withImage.map((photo) => ({
        kind: 'image' as const,
        src: photo.image as string,
        alt: photo.caption ?? photo.title,
        title: photo.title,
        caption: photo.caption,
        meta: [photo.kindLabel, photo.role].filter(Boolean).join(' · ') || null,
        width: photo.width ?? null,
        height: photo.height ?? null,
        mediaGallery: true,
      })),
      index,
    );
  };

  // The catalog runs denser than the front page, because browsing wants more frames on screen
  // at once; the front page keeps the larger, more editorial rhythm.
  const columnClass = layout === 'mosaic' ? 'columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4' : 'columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4 2xl:columns-5';

  return (
    <>
      <div className={cx('mt-10 [column-fill:_balance]', columnClass)}>
        {items.map((entry) => {
          const ratio = entry.width && entry.height ? entry.width / entry.height : 4 / 5;
          const interactive = Boolean(entry.image);
          const shell =
            'group/photo relative mb-3 block w-full overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)] text-left transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:border-[rgba(243,241,236,.18)] hover:shadow-[var(--shadow-lift)] md:mb-4';

          const body = (
            <>
              <div className="relative w-full" style={{ aspectRatio: ratio }}>
                {entry.image ? (
                  <img
                    src={entry.image}
                    alt={entry.caption ?? entry.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover/photo:scale-[1.03]"
                  />
                ) : (
                  <div className="size-full bg-[radial-gradient(120%_100%_at_20%_0%,rgba(228,190,107,.14),transparent_60%),linear-gradient(160deg,rgba(243,241,236,.06),transparent_65%)]" />
                )}
                {/* A light scrim only, no caption: it keeps the expand control legible over a
                    bright frame without dimming the photograph itself. */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.42)] via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover/photo:opacity-95"
                />
                {interactive ? (
                  <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-[rgba(8,8,10,.5)] text-white opacity-0 ring-1 ring-[rgba(243,241,236,.3)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/photo:scale-100 group-hover/photo:opacity-100 group-focus-visible/photo:scale-100 group-focus-visible/photo:opacity-100">
                    <Icon name="expand" size={15} />
                  </span>
                ) : null}
              </div>
            </>
          );

          return interactive ? (
            <button key={entry.id} type="button" onClick={() => openPhoto(entry)} aria-label={`View photograph: ${entry.caption ?? entry.title}`} className={shell}>
              {body}
            </button>
          ) : (
            <figure key={entry.id} className={shell}>
              {body}
            </figure>
          );
        })}
      </div>

      <SectionActions more={more} />
    </>
  );
}

/* ── client stories ────────────────────────────────────────────────────────── */

export function MediaTestimonialRail({ items }: { items: MediaTestimonial[] }) {
  const [dragging, setDragging] = useState(false);
  if (!items.length) return null;

  return (
    <MediaTicker
      speed={16}
      gap={20}
      draggable
      pauseOnHover
      ariaLabel="Client stories, swipe or drag to browse"
      className="mt-10 [mask-image:linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
    >
      {items.map((entry) => (
        <figure
          key={entry.id}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          className={cx(
            'flex w-[80vw] shrink-0 flex-col justify-between rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)]/70 p-5 backdrop-blur sm:w-[54vw] sm:p-6 lg:w-[30vw] xl:w-[23vw]',
            dragging && 'select-none',
          )}
        >
          <div>
            <Icon name="quote" size={18} className="text-[var(--accent)]/70" />
            <blockquote className="mt-4 text-[0.9375rem] leading-relaxed text-fg">{entry.quote}</blockquote>
          </div>
          <figcaption className="mt-6 border-t border-[rgba(243,241,236,.08)] pt-4">
            <span className="block text-[0.875rem] text-fg">{entry.author}</span>
            <span className="mt-0.5 block text-[0.75rem] text-fg-dim">{entry.context}</span>
          </figcaption>
        </figure>
      ))}
    </MediaTicker>
  );
}

'use client';

/**
 * The single media tile used by the hero wall, video walls, grids and project
 * galleries. Posters only: no third-party iframe is created until activation, so
 * a page can show twelve previews without twelve embeds.
 */
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { AssetRef, VideoRef } from '@/lib/types/content';
import { cx, formatDuration } from '@/lib/utils/text';
import { plainSrc } from '@/components/ui/Media';
import { trackClientEvent } from '@/lib/analytics/client';
import { Icon } from './Icon';
import { Marquee } from './Marquee';
import { PosterFallback } from './Media';
import { emitLightbox, type LightboxItem } from './Lightbox';
import { SampleTag } from './Section';

export interface MediaTileProps {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  poster?: AssetRef | null;
  posterUrl?: string | null;
  video?: VideoRef | null;
  items?: LightboxItem[];
  index?: number;
  href?: string | null;
  ratio?: 'wide' | 'vertical' | 'square' | 'tall';
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  hoverPreview?: boolean;
  captionOnHover?: boolean;
  isSample?: boolean;
  seed?: string;
  sizes?: string;
  showDuration?: boolean;
  tone?: 'media' | 'tech' | 'main';
  overlayBadge?: string | null;
}

const RATIOS: Record<string, string> = {
  wide: 'aspect-video',
  vertical: 'aspect-[9/16]',
  square: 'aspect-square',
  tall: 'aspect-[4/5]',
};

export function MediaTile({
  title,
  subtitle,
  meta,
  poster,
  posterUrl,
  video,
  items,
  index = 0,
  href,
  ratio = 'wide',
  className,
  imgClassName,
  priority = false,
  hoverPreview = true,
  captionOnHover = false,
  isSample,
  seed,
  sizes,
  showDuration = true,
  tone = 'media',
  overlayBadge,
}: MediaTileProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const src = poster?.url ?? posterUrl ?? video?.posterUrl ?? null;
  const canPreview = hoverPreview && !reduce && video?.source === 'upload' && Boolean(video.fileUrl);

  const onEnter = () => {
    setHovered(true);
    if (canPreview) videoRef.current?.play?.().catch(() => undefined);
  };
  const onLeave = () => {
    setHovered(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  };

  const open = () => {
    const list = items?.length ? items : video ? [{ kind: 'video' as const, video, title: video.title, meta }] : [];
    if (!list.length) return;
    trackClientEvent('lightbox_open', video && !items?.length ? 'video' : 'gallery');
    emitLightbox(list, index);
  };

  const body = (
    <>
      <div className={cx('relative isolate size-full overflow-hidden bg-[var(--color-ink-850)]', RATIOS[ratio])}>
        {src ? (
          <Image
            src={src}
            unoptimized={plainSrc(src)}
            alt={poster?.alt ?? title}
            fill
            sizes={sizes ?? '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 32vw'}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            decoding="async"
            className={cx(
              'size-full object-cover transition-[transform,filter] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]',
              hovered && !reduce ? 'scale-[1.045]' : '',
              imgClassName,
            )}
          />
        ) : (
          <PosterFallback seed={seed ?? title} label={null} ratio={ratio === 'tall' ? 'wide' : ratio} tone={tone} className="size-full" showLabel={false} />
        )}
        {canPreview && video?.fileUrl ? (
          <video
            ref={videoRef}
            src={video.fileUrl}
            muted
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            aria-hidden
            className={cx('absolute inset-0 size-full object-cover transition-opacity duration-500', hovered ? 'opacity-100' : 'opacity-0')}
          />
        ) : null}
        <span
          aria-hidden
          className={cx(
            'absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.92)] via-[rgba(5,5,7,.14)] to-transparent transition-opacity duration-500',
            hovered ? 'opacity-100' : 'opacity-80',
          )}
        />

        {video ? (
          <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[rgba(10,10,13,.55)] text-white ring-1 ring-[rgba(243,241,236,.28)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/tile:scale-110 group-hover/tile:bg-[var(--accent)] group-hover/tile:text-[var(--accent-ink)] group-hover/tile:ring-transparent">
            <Icon name="play" size={16} filled className="translate-x-[1px]" />
          </span>
        ) : (
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-[rgba(10,10,13,.5)] text-white/80 opacity-0 ring-1 ring-[rgba(243,241,236,.2)] backdrop-blur-md transition duration-500 group-hover/tile:opacity-100">
            <Icon name={href ? 'arrow-up-right' : 'expand'} size={14} />
          </span>
        )}

        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 md:p-4">
          <span className={cx('min-w-0 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]', captionOnHover && !reduce ? (hovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0') : '')}>
            <span className="block truncate text-[0.9375rem] font-medium leading-snug text-white md:text-base">{title}</span>
            {subtitle ? <span className="mt-0.5 block truncate font-mono text-[0.625rem] uppercase tracking-[0.15em] text-white/62">{subtitle}</span> : null}
          </span>
          {showDuration && (video?.durationS || meta) ? (
            <span className="tnum shrink-0 rounded-pill bg-[rgba(8,8,10,.55)] px-2 py-1 font-mono text-[0.625rem] text-white/80 backdrop-blur">
              {video?.durationS ? formatDuration(video.durationS) : meta}
            </span>
          ) : null}
        </span>
        {overlayBadge ? (
          <span className="absolute left-3 top-3">
            <SampleTag label={overlayBadge} />
          </span>
        ) : isSample ? (
          <span className="absolute left-3 top-3">
            <SampleTag />
          </span>
        ) : null}
      </div>
    </>
  );

  const shell = cx(
    'group/tile relative block isolate overflow-hidden rounded-3 border border-[rgba(243,241,236,.08)] bg-[var(--color-ink-900)] shadow-[var(--shadow-2)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:border-[rgba(243,241,236,.16)] hover:shadow-[var(--shadow-lift)]',
    !reduce && 'hover:-translate-y-1',
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={shell}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        data-analytics="project_click"
        data-analytics-target={href}
        onClick={(event) => {
          // A click on the play affordance opens the viewer instead of navigating.
          if ((event.target as HTMLElement).closest('[data-play]')) {
            event.preventDefault();
            open();
          }
        }}
      >
        {body}
        <span data-play className="sr-only">
          Play preview
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cx(shell, 'w-full text-left')}
      aria-label={video ? `Play ${title}` : `Open ${title}`}
    >
      {body}
    </button>
  );
}

/** Continuous, GPU-friendly strip of tiles. Duplicated content + CSS animation. */
export function MediaStrip({ children, duration = 48, reverse = false, className }: { children: React.ReactNode; duration?: number; reverse?: boolean; className?: string }) {
  return (
    <Marquee duration={duration} reverse={reverse} pauseOnHover className={className}>
      {children}
    </Marquee>
  );
}

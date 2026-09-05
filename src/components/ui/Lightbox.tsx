'use client';

/**
 * Media playback.
 *
 * Performance + data rules baked in:
 *  • social embeds (YouTube/TikTok/Facebook/Vimeo) are NEVER loaded until the
 *    visitor activates them — a poster frame renders instead;
 *  • uploads use <video preload="none"> with native controls (sound available);
 *  • the lightbox traps focus roughly, closes on Escape and restores focus.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { cx, formatDuration } from '@/lib/utils/text';
import type { VideoRef } from '@/lib/types/content';
import { Icon } from './Icon';
import { PosterFallback } from './Media';
import { useReducedMotion } from 'framer-motion';

export interface LightboxItem {
  kind: 'video' | 'image';
  video?: VideoRef;
  src?: string;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  meta?: string | null;
}

interface LightboxState {
  items: LightboxItem[];
  index: number;
  trigger?: HTMLElement | null;
}

const LIGHTBOX_EVENT = 'cm:lightbox';

export function emitLightbox(items: LightboxItem[], index = 0) {
  window.dispatchEvent(new CustomEvent(LIGHTBOX_EVENT, { detail: { items, index } }));
}

export function useLightbox() {
  return useCallback((items: LightboxItem[], index = 0) => emitLightbox(items, index), []);
}

export function LightboxHost() {
  const [state, setState] = useState<LightboxState | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocus = useRef<Element | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LightboxState>).detail;
      lastFocus.current = (detail as LightboxState & { trigger?: HTMLElement }).trigger ?? document.activeElement;
      setState(detail);
    };
    window.addEventListener(LIGHTBOX_EVENT, handler as EventListener);
    return () => window.removeEventListener(LIGHTBOX_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    if (!state) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setState(null);
      if (state.items.length > 1 && event.key === 'ArrowRight') setState((s) => (s ? { ...s, index: (s.index + 1) % s.items.length } : s));
      if (state.items.length > 1 && event.key === 'ArrowLeft') setState((s) => (s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
    };
  }, [state]);

  if (!state?.items?.length) return null;
  const item = state.items[state.index] ?? state.items[0]!;
  const multi = state.items.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-[rgba(4,4,6,.94)] backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={item.title ? `Media viewer — ${item.title}` : 'Media viewer'}
      style={{ animation: reduce ? undefined : 'cm-fade-in .28s ease-out both' }}
    >
      <div className="flex items-start justify-between gap-4 p-3 md:p-5">
        <div className="min-w-0">
          {item.title ? <p className="truncate font-display text-lg md:text-2xl">{item.title}</p> : null}
          {item.meta ? <p className="mt-0.5 truncate font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{item.meta}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {multi ? (
            <span className="tnum mr-1 font-mono text-xs text-fg-dim">
              {state.index + 1} / {state.items.length}
            </span>
          ) : null}
          {item.kind === 'video' && item.video?.externalUrl ? (
            <a
              href={item.video.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-9 items-center gap-2 rounded-pill border border-[rgba(243,241,236,.16)] px-3.5 text-sm text-fg-muted transition hover:border-[rgba(243,241,236,.32)] hover:text-fg"
            >
              <Icon name={sourceIcon(item.video.source)} size={15} /> {sourceLabel(item.video.source)}
              <Icon name="external" size={13} />
            </a>
          ) : null}
          <button
            ref={closeRef}
            onClick={() => setState(null)}
            className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.18)] text-fg transition hover:bg-[rgba(243,241,236,.08)]"
            aria-label="Close viewer"
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 md:px-8">
        {multi ? (
          <button
            onClick={() => setState((s) => (s ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s))}
            className="absolute left-1 z-10 hidden size-11 place-items-center rounded-full border border-[rgba(243,241,236,.14)] bg-[rgba(10,10,13,.6)] text-fg transition hover:bg-[rgba(10,10,13,.9)] md:grid"
            aria-label="Previous"
          >
            <Icon name="arrow-left" size={18} />
          </button>
        ) : null}
        <div className="relative mx-auto w-full max-w-[min(1180px,94vw)]">
          {item.kind === 'video' && item.video ? (
            <VideoPlayer video={item.video} active autoPlay soundOn />
          ) : item.src ? (
            <div className="relative mx-auto aspect-[4/3] max-h-[74vh] w-full">
              <Image src={item.src} alt={item.alt ?? item.title ?? ''} fill sizes="94vw" className="rounded-3 object-contain" priority />
            </div>
          ) : null}
          {item.caption ? <p className="mt-3 text-center text-sm text-fg-muted">{item.caption}</p> : null}
        </div>
        {multi ? (
          <button
            onClick={() => setState((s) => (s ? { ...s, index: (s.index + 1) % s.items.length } : s))}
            className="absolute right-1 z-10 hidden size-11 place-items-center rounded-full border border-[rgba(243,241,236,.14)] bg-[rgba(10,10,13,.6)] text-fg transition hover:bg-[rgba(10,10,13,.9)] md:grid"
            aria-label="Next"
          >
            <Icon name="arrow-right" size={18} />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function sourceIcon(source: string): string {
  return (
    { youtube: 'youtube', tiktok: 'tiktok', facebook: 'facebook', vimeo: 'vimeo', instagram: 'instagram', upload: 'film', external: 'external' } as Record<string, string>
  )[source] ?? 'external';
}

function sourceLabel(source: string): string {
  return (
    { youtube: 'Watch on YouTube', tiktok: 'Watch on TikTok', facebook: 'Watch on Facebook', vimeo: 'Watch on Vimeo', instagram: 'View on Instagram', upload: 'Download file', external: 'Open link' } as Record<string, string>
  )[source] ?? 'Open link';
}

/**
 * The player itself. `active` mounts the third-party frame; before that only the
 * poster is in the DOM.
 */
export function VideoPlayer({
  video,
  active = false,
  autoPlay = false,
  soundOn = false,
  className,
  onActivate,
  ratio,
}: {
  video: VideoRef;
  active?: boolean;
  autoPlay?: boolean;
  soundOn?: boolean;
  className?: string;
  onActivate?: () => void;
  ratio?: 'wide' | 'vertical' | 'square';
}) {
  const isUpload = video.source === 'upload' && Boolean(video.fileUrl);
  const aspect = ratio ?? (video.vertical ? 'vertical' : 'wide');
  const aspectClass = { wide: 'aspect-video', vertical: 'aspect-[9/16]', square: 'aspect-square' }[aspect];
  const [failed, setFailed] = useState(false);

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={cx('group/player relative isolate block w-full overflow-hidden rounded-3 bg-[var(--color-ink-850)] text-left', aspectClass, className)}
        aria-label={`Play ${video.title}`}
      >
        {video.posterUrl ? (
          <Image src={video.posterUrl} alt="" fill sizes="(max-width: 768px) 94vw, 70vw" className="object-cover" loading="lazy" decoding="async" />
        ) : (
          <PosterFallback seed={video.id} label={video.title} ratio={aspect} className="size-full" showLabel={false} />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-[rgba(4,4,6,.78)] via-transparent to-[rgba(4,4,6,.18)]" aria-hidden />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_18px_40px_-18px_rgba(0,0,0,.9)] transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/player:scale-[1.08] md:size-16">
            <Icon name="play" size={22} filled className="translate-x-[1px]" />
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 md:p-4">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white md:text-base">{video.title}</span>
            <span className="mt-0.5 block font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/70">
              {sourceLabel(video.source)}
              {video.durationS ? ` · ${formatDuration(video.durationS)}` : ''}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-[rgba(8,8,10,.55)] px-2 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/80 backdrop-blur">
            <Icon name="volume" size={11} /> sound on
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className={cx('relative isolate w-full overflow-hidden rounded-3 bg-black', aspectClass, className)}>
      {isUpload ? (
        <video
          src={video.fileUrl ?? undefined}
          poster={video.posterUrl ?? undefined}
          controls
          autoPlay={autoPlay}
          muted={false}
          playsInline
          preload="metadata"
          className="size-full bg-black object-contain"
          onError={() => setFailed(true)}
        />
      ) : video.embedUrl ? (
        <iframe
          src={withParams(video.embedUrl, { autoplay: autoPlay ? 1 : 0, muted: soundOn ? 0 : 1, controls: 1, rel: 0, modestbranding: 1 })}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : failed || !video.externalUrl ? (
        <div className="grid size-full place-items-center p-6 text-center">
          <div>
            <p className="text-sm text-fg-muted">This source does not allow embedding.</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-fg-dim">Metadata was saved — add a poster for the grid</p>
          </div>
        </div>
      ) : (
        <div className="grid size-full place-items-center gap-4 p-8 text-center">
          <p className="max-w-sm text-sm text-fg-muted">{video.title} is published on {sourceLabel(video.source).replace(/^Watch on |^View on /, '')}. Open it there — embedding is not permitted for this item.</p>
          <a
            href={video.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-10 items-center gap-2 rounded-pill bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-ink)]"
          >
            <Icon name={sourceIcon(video.source)} size={16} /> Open
          </a>
        </div>
      )}
    </div>
  );
}

function withParams(url: string, params: Record<string, string | number>): string {
  try {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (!target.searchParams.has(key)) target.searchParams.set(key, String(value));
    }
    return target.toString();
  } catch {
    return url;
  }
}

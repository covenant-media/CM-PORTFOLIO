import Image from 'next/image';
import { cx, hashString } from '@/lib/utils/text';
import type { AssetRef } from '@/lib/types/content';
import { Icon } from './Icon';

/**
 * Deterministic placeholder artwork for records without an uploaded asset.
 * Rendered as inline SVG (no extra request, no binary in git, infinitely
 * scalable) and always labelled so nothing reads as finished photography.
 */
export function PosterFallback({
  seed,
  label,
  ratio = 'wide',
  tone = 'media',
  className,
  showLabel = true,
}: {
  seed: string;
  label?: string | null;
  ratio?: 'wide' | 'vertical' | 'square' | 'tall';
  tone?: 'media' | 'tech' | 'main';
  className?: string;
  showLabel?: boolean;
}) {
  const h = hashString(seed);
  const a = h % 360;
  const b = (a + 42 + (h % 60)) % 360;
  const warm = tone === 'tech' ? [214, 226] : tone === 'main' ? [40, 74] : [34, 58];
  const hue1 = tone === 'tech' ? warm[0] + (h % 24) : warm[0] + (h % 28);
  const hue2 = b % 2 === 0 ? warm[1] : a % 3 === 0 ? 12 : warm[0];
  const dims = { wide: '16 / 9', vertical: '9 / 16', square: '1 / 1', tall: '4 / 5' }[ratio];
  return (
    <div
      className={cx('relative isolate overflow-hidden bg-[var(--color-ink-850)]', className)}
      style={{ aspectRatio: dims }}
      data-placeholder="true"
      role="img"
      aria-label={label ? `Placeholder artwork — ${label}` : 'Placeholder artwork'}
    >
        <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`g-${h}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={`hsl(${hue1} 42% 16%)`} />
              <stop offset="55%" stopColor={`hsl(${(hue1 + 18) % 360} 26% 11%)`} />
              <stop offset="100%" stopColor={`hsl(${hue2} 52% 20%)`} />
            </linearGradient>
            <radialGradient id={`r-${h}`} cx={`${20 + (h % 60)}%`} cy={`${18 + ((h >> 3) % 40)}%`} r="70%">
              <stop offset="0%" stopColor={`hsl(${warm[1]} 70% 62%)`} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="160" height="90" fill={`url(#g-${h})`} />
          <rect width="160" height="90" fill={`url(#r-${h})`} />
          <g stroke={`hsl(${warm[1]} 60% 70%)`} strokeOpacity="0.16" fill="none" strokeWidth="0.35">
            {Array.from({ length: 7 }).map((_, i) => (
              <circle key={i} cx={132 - i * 4} cy={26 + i * 6} r={10 + i * 7} />
            ))}
          </g>
          <g opacity="0.5">
            {Array.from({ length: 26 }).map((_, i) => {
              const y = 6 + ((i * 13 + (h % 11)) % 82);
              const w = 4 + ((i * 7 + h) % 30);
              return <rect key={i} x={2} y={y} width={w} height="0.5" fill={`hsl(${warm[0]} 55% 68%)`} opacity={0.1 + ((i % 5) / 16)} />;
            })}
          </g>
        </svg>
      {showLabel ? (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-[rgba(243,241,236,.16)] bg-[rgba(8,8,10,.62)] px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-muted backdrop-blur-sm">
            <Icon name="image" size={10} /> placeholder
          </span>
          {label ? (
            <span className="truncate font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">{label}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

const VARIANT_ORDER = ['w_640', 'w_1000', 'w_1600'] as const;

/** Picks the smallest generated variant that still covers the render width. */
function bestSrc(asset: AssetRef, cssWidth: number, variant: 'auto' | 'full' | 'thumb'): string {
  if (variant === 'thumb') return asset.variants?.thumb?.url ?? asset.variants?.w_640?.url ?? asset.url;
  if (variant === 'full') return asset.url;
  const available = VARIANT_ORDER.map((key) => asset.variants?.[key]).filter((v): v is { url: string; width: number; height: number } => Boolean(v?.url));
  if (!available.length) return asset.url;
  const needed = cssWidth * (typeof globalThis !== 'undefined' && (globalThis as { devicePixelRatio?: number }).devicePixelRatio ? 2 : 1);
  const fit = available.find((v) => v.width >= needed) ?? available[available.length - 1]!;
  return fit.url;
}

/**
 * CMS image with variant selection, blur-up and a labelled placeholder when the
 * record has no asset yet. `fill` layouts keep CLS at zero.
 */
/**
 * Remote sources (video thumbnails, third-party CDNs) are fetched by the browser directly.
 * Routing them through the image optimizer means the server has to reach out for them, which
 * fails on hosts without outbound access and only adds a hop everywhere else. Local uploads —
 * the images the CMS actually stores — keep the full AVIF/WebP treatment.
 */
export function isExternalSrc(src: string | null | undefined): boolean {
  return /^https?:\/\/\S+/i.test(String(src ?? ''));
}

/**
 * Sources that must bypass the image optimiser: remote hosts (see above) and anything under
 * /uploads, which is written after the build and therefore missing from the optimiser's
 * snapshot of public files. Those images are served straight from disk by /uploads/[...path],
 * and the storage driver has already produced sized WebP variants for them.
 */
export function plainSrc(src: string | null | undefined): boolean {
  const value = String(src ?? '');
  return isExternalSrc(value) || value.startsWith('/uploads/');
}

export function CmImage({
  asset,
  alt,
  className,
  imgClassName,
  ratio = 'wide',
  variant = 'auto',
  priority = false,
  sizes = '(max-width: 768px) 92vw, 45vw',
  seed,
  rounded = 'rounded-3',
  tone = 'media',
  overlay,
}: {
  asset: AssetRef | null | undefined;
  alt?: string | null;
  className?: string;
  imgClassName?: string;
  ratio?: 'wide' | 'vertical' | 'square' | 'tall';
  variant?: 'auto' | 'full' | 'thumb';
  priority?: boolean;
  sizes?: string;
  seed?: string;
  rounded?: string;
  tone?: 'media' | 'tech' | 'main';
  overlay?: React.ReactNode;
}) {
  const aspect = { wide: '16 / 9', vertical: '9 / 16', square: '1 / 1', tall: '4 / 5' }[ratio];
  const label = alt ?? asset?.alt ?? null;
  if (!asset?.url) {
    return (
      <div className={cx('relative isolate overflow-hidden', rounded, className)}>
        <PosterFallback seed={seed ?? label ?? 'asset'} label={label} ratio={ratio} tone={tone} className="size-full" />
        {overlay}
      </div>
    );
  }
  return (
    <div className={cx('relative isolate overflow-hidden bg-[var(--color-ink-850)]', rounded, className)} style={{ aspectRatio: aspect }}>
      <Image
        src={bestSrc(asset, 1000, variant)}
        unoptimized={plainSrc(bestSrc(asset, 1000, variant))}
        alt={label ?? ''}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        decoding="async"
        placeholder={asset.blur ? 'blur' : undefined}
        blurDataURL={asset.blur ?? undefined}
        className={cx('size-full object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)]', imgClassName)}
      />
      {overlay}
    </div>
  );
}

/** Subtle duotone + vignette used on cinematic panels. */
export function CinematicFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('relative isolate overflow-hidden', className)}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(5,5,7,.55) 100%), linear-gradient(180deg, rgba(5,5,7,.05), rgba(5,5,7,.55))',
        }}
      />
    </div>
  );
}

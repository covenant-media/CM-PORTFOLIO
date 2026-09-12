/**
 * The studio's social buttons, under the hero's calls to action.
 *
 * The interaction is the Tech portfolio's, deliberately: a circular icon button that lifts a
 * half-pixel on hover, takes the surface accent and brightens its icon. What changes is the
 * surface it wears — media brass, media borders — so it belongs to this page instead of looking
 * pasted in.
 *
 * **Only destinations that exist are rendered.** The row is built from `MEDIA_SOCIALS`, where
 * each entry is a network the studio publishes on; an entry whose URL has not been supplied
 * simply does not produce a button. That is why a Facebook button can be declared in the data
 * and appear the moment the studio's page URL is filled in, and why nothing here can point at
 * an account that may not be the studio's.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { MEDIA_SOCIALS } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

export function MediaSocialButtons({
  socials = MEDIA_SOCIALS,
  className,
}: {
  socials?: { network: string; label: string | null; url: string }[];
  className?: string;
}) {
  const entries = socials.filter((entry) => entry.url.trim().length > 0);
  if (!entries.length) return null;

  return (
    <ul className={cx('flex flex-wrap items-center justify-center gap-2 lg:justify-start', className)}>
      {entries.map((entry) => (
        <li key={entry.network}>
          <Link
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`${entry.label ?? entry.network}, opens in a new tab`}
            title={entry.label ?? entry.network}
            data-analytics="outbound_click"
            data-analytics-target={entry.url}
            className="grid size-11 place-items-center rounded-full border border-[rgba(243,241,236,.14)] bg-[rgba(243,241,236,.03)] text-fg-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-fg focus-visible:-translate-y-0.5 focus-visible:border-[var(--accent)]/50 focus-visible:text-fg"
          >
            <Icon name={entry.network} size={17} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

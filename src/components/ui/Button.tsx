import Link from 'next/link';
import { Icon } from './Icon';
import { cx } from '@/lib/utils/text';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'link' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'group inline-flex items-center justify-center gap-2.5 rounded-pill font-medium transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] disabled:opacity-50 disabled:pointer-events-none select-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_30px_-14px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,.28)] hover:-translate-y-px hover:brightness-[1.06] active:translate-y-0 active:brightness-95',
  outline:
    'border border-[rgba(243,241,236,.16)] text-fg hover:border-[rgba(243,241,236,.34)] hover:bg-[rgba(243,241,236,.045)] hover:-translate-y-px',
  ghost: 'text-fg-muted hover:text-fg hover:bg-[rgba(243,241,236,.05)]',
  link: 'text-fg underline-offset-4 decoration-[rgba(243,241,236,.28)] hover:decoration-[var(--accent)] hover:underline p-0 rounded-none',
  quiet: 'bg-[rgba(243,241,236,.06)] text-fg hover:bg-[rgba(243,241,236,.1)] border border-[rgba(243,241,236,.07)]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[0.8125rem] tracking-[-0.006em]',
  md: 'h-10.5 px-5 text-[0.9375rem] tracking-[-0.008em]',
  lg: 'h-12.5 md:h-13 px-6.5 md:px-7.5 text-[1rem] md:text-[1.0625rem]',
};

export interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconEnd?: string;
  className?: string;
  newTab?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  'aria-label'?: string;
  download?: boolean | string;
  'data-analytics'?: string;
  'data-analytics-target'?: string;
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('sms:');
}

/**
 * One button API for internal links, external links and form actions.
 * `data-analytics*` attributes are picked up by the first-party tracker.
 */
export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  className,
  newTab,
  disabled,
  type = 'button',
  onClick,
  download,
  ...rest
}: ButtonProps) {
  const classes = cx(BASE, VARIANTS[variant], variant === 'link' ? '' : SIZES[size], className);
  const inner = (
    <>
      {icon ? <Icon name={icon} size={size === 'lg' ? 19 : 17} className="opacity-80" /> : null}
      <span>{children}</span>
      {iconEnd ? (
        <Icon
          name={iconEnd}
          size={size === 'lg' ? 18 : 16}
          className="opacity-70 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-0.5"
        />
      ) : null}
    </>
  );

  if (href && !disabled) {
    if (isExternal(href)) {
      const external = /^https?:\/\//i.test(href);
      return (
        <a
          href={href}
          className={classes}
          target={newTab || external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          download={download || undefined}
          {...(rest as Record<string, unknown>)}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} target={newTab ? '_blank' : undefined} {...(rest as Record<string, unknown>)}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} {...(rest as Record<string, unknown>)}>
      {inner}
    </button>
  );
}

/** Small circular icon button (media controls, admin row actions). */
export function IconButton({
  icon,
  label,
  onClick,
  className,
  size = 36,
  variant = 'outline',
  type = 'button',
  disabled,
  active,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  className?: string;
  size?: number;
  variant?: 'outline' | 'solid' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  active?: boolean;
}) {
  const styles: Record<string, string> = {
    outline: 'border border-[rgba(243,241,236,.14)] bg-[rgba(10,10,13,.5)] backdrop-blur-md hover:border-[rgba(243,241,236,.3)]',
    solid: 'bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-105',
    ghost: 'hover:bg-[rgba(243,241,236,.07)]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      style={{ width: size, height: size }}
      className={cx(
        'inline-grid place-items-center rounded-full transition duration-200 disabled:opacity-40',
        styles[variant],
        active && 'ring-1 ring-[var(--accent)]',
        className,
      )}
    >
      <Icon name={icon} size={Math.round(size * 0.46)} />
    </button>
  );
}

'use client';
/**
 * Form primitives for the console screens.
 *
 * The generic module editor builds inputs from field definitions; these screens are
 * hand-composed instead, so they need the same building blocks as plain components.
 * Everything here is a controlled-free, progressively-enhanced element: real `<label>`,
 * a name, and no JavaScript required to submit. Styling comes from the admin theme
 * tokens, so a control looks the same wherever it is used.
 */
import { useFormStatus } from 'react-dom';
import { cx } from '@/lib/utils/text';

const FIELD =
  'w-full rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim transition-colors focus:border-[var(--accent)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30';

const LABEL = 'mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-fg-dim';
const HELP = 'mt-1.5 text-[11.5px] leading-relaxed text-fg-dim';

export function Field({
  label,
  name,
  help,
  hint,
  children,
  className,
}: {
  label: string;
  name?: string;
  help?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={LABEL} htmlFor={name}>
        {label}
        {hint ? <span className="ml-1.5 normal-case tracking-normal text-fg-dim/70">{hint}</span> : null}
      </label>
      {children}
      {help ? <p className={HELP}>{help}</p> : null}
    </div>
  );
}

export function TextInput({
  label,
  name,
  defaultValue,
  placeholder,
  help,
  hint,
  required,
  type = 'text',
  className,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  hint?: string;
  required?: boolean;
  type?: 'text' | 'url' | 'email' | 'tel' | 'number';
  className?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} name={name} help={help} hint={hint} className={className}>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={FIELD}
      />
    </Field>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  help,
  hint,
  rows = 4,
  required,
  className,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  className?: string;
  maxLength?: number;
}) {
  return (
    <Field label={label} name={name} help={help} hint={hint} className={className}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={cx(FIELD, 'resize-y leading-relaxed')}
      />
    </Field>
  );
}

export function LinesInput({
  label,
  name,
  values,
  placeholder,
  help,
  hint,
  rows = 5,
  className,
}: {
  label: string;
  name: string;
  values: string[];
  placeholder?: string;
  help?: string;
  hint?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <Field label={label} name={name} help={help} hint={hint} className={className}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={values.join('\n')}
        placeholder={placeholder}
        className={cx(FIELD, 'resize-y font-mono text-[12.5px] leading-relaxed')}
      />
    </Field>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  help,
  hint,
  placeholder,
  required,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  help?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} name={name} help={help} hint={hint} className={className}>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} required={required} className={cx(FIELD, 'appearance-none pr-8')}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * A real checkbox, so the form still means something with JavaScript off. The visual
 * switch is drawn from its `:checked` state rather than from client state.
 */
export function Toggle({
  label,
  name,
  defaultChecked,
  help,
  hint,
  className,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  help?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cx('flex items-start gap-3 rounded-3 border border-line bg-ink-950/40 px-3.5 py-3', className)}>
      <label className="relative mt-[1px] inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="block h-[20px] w-[36px] rounded-pill bg-ink-700 transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/50" />
        <span className="absolute left-[3px] top-[3px] h-[14px] w-[14px] rounded-full bg-fg transition-transform peer-checked:translate-x-[16px] peer-checked:bg-[var(--accent-ink)]" />
      </label>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-fg">{label}</span>
        {help ? <span className={HELP}>{help}</span> : null}
        {hint ? <span className={cx(HELP, 'text-fg-dim/70')}>{hint}</span> : null}
      </span>
    </div>
  );
}

/** The primary save affordance. Label flips while the action is in flight. */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  variant = 'primary',
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90'
      : variant === 'danger'
        ? 'border border-alert-400/45 text-alert-400 hover:bg-alert-400/10'
        : 'border border-line text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg';
  return (
    <button
      type="submit"
      disabled={pending}
      className={cx(
        'inline-flex items-center justify-center rounded-3 px-4 py-2 text-[12.5px] font-medium transition-all disabled:opacity-50',
        styles,
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** A small inline row action (publish, verify…) sharing one visual language. */
export function ActionButton({
  children,
  variant = 'ghost',
  pendingLabel,
  className,
  title,
}: {
  children: React.ReactNode;
  variant?: 'ghost' | 'danger' | 'accent';
  pendingLabel?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === 'danger'
      ? 'border-alert-400/35 text-alert-400/90 hover:border-alert-400/70 hover:text-alert-400'
      : variant === 'accent'
        ? 'border-[var(--accent)]/45 text-[var(--accent)] hover:border-[var(--accent)]/80'
        : 'border-line text-fg-muted hover:border-[var(--accent)]/45 hover:text-fg';
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      className={cx(
        'inline-flex items-center gap-1 rounded-2 border px-2 py-[3px] text-[11.5px] transition-colors disabled:opacity-50',
        styles,
        className,
      )}
    >
      {pending ? (pendingLabel ?? '…') : children}
    </button>
  );
}

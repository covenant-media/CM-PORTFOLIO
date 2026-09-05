'use client';

/**
 * The public enquiry form. One engine, three configurations (brand, media, tech),
 * with real states: idle → validating → submitting → success | error.
 * Works without JavaScript (native POST + redirect) and degrades politely.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';
import type { PublicFieldDef, PublicFormConfig } from '@/lib/cms/forms';

interface Props {
  config: PublicFormConfig;
  action: string;
  token: string;
  turnstileSiteKey?: string | null;
  successMessage?: string | null;
  initialStatus?: 'idle' | 'sent';
  tone?: 'dark' | 'paper';
  submitNote?: string | null;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function PublicForm({ config, action, token, turnstileSiteKey, successMessage, initialStatus = 'idle', tone = 'dark', submitNote }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus === 'sent' ? 'success' : 'idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [turnstile, setTurnstile] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const honeypot = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Optional Cloudflare Turnstile — only fetched when a site key is configured.
  useEffect(() => {
    if (!turnstileSiteKey) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    document.head.appendChild(script);
    const attempt = window.setInterval(() => {
      const api = (window as unknown as { turnstile?: { render: (el: Element, opts: Record<string, unknown>) => void } }).turnstile;
      const container = document.getElementById('cm-turnstile');
      if (api && container && !container.dataset.rendered) {
        container.dataset.rendered = '1';
        api.render(container, {
          sitekey: turnstileSiteKey,
          theme: 'dark',
          callback: (value: string) => setTurnstile(value),
          'expired-callback': () => setTurnstile(null),
        });
        window.clearInterval(attempt);
      }
    }, 250);
    return () => window.clearInterval(attempt);
  }, [turnstileSiteKey]);

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    for (const field of config.fields) {
      const value = (values[field.name] ?? '').trim();
      if (field.required && !value) next[field.name] = `${field.label} is required`;
      else if (field.type === 'email' && value && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value)) next[field.name] = 'Enter a valid email address';
      else if (field.maxLength && value.length > field.maxLength) next[field.name] = `${field.maxLength} characters or fewer`;
    }
    return next;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (turnstileSiteKey && !turnstile) {
      setServerError('Please complete the human check first.');
      return;
    }
    if ((honeypot.current?.value ?? '') !== '') {
      setStatus('success'); // silently swallow bots
      return;
    }
    setStatus('submitting');
    setServerError(null);
    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          form: config.variant,
          ...values,
          _token: token,
          consent,
          _gotcha: honeypot.current?.value ?? '',
          turnstileToken: turnstile,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string; details?: Record<string, string> };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setServerError(data.error ?? 'Something went wrong on our side. Try email or WhatsApp and we will pick it up.');
        if (data.details) setErrors(data.details);
        return;
      }
      setStatus('success');
      setValues({});
    } catch {
      setStatus('error');
      setServerError('Network trouble — your message did not send. Try again, or use the contact details on this page.');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-4 border border-[rgba(116,201,160,.32)] bg-[rgba(116,201,160,.07)] p-6 md:p-7" role="status">
        <div className="flex items-start gap-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgba(116,201,160,.16)] text-[var(--color-ok-400)]">
            <Icon name="check" size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.25rem] leading-snug tracking-[-0.02em]">Message sent</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">{successMessage || config.fallbackSuccess}</p>
            <button type="button" onClick={() => setStatus('idle')} className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--accent)]">
              Send another <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} method="post" onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="form" value={config.variant} />
      <input type="hidden" name="_token" value={token} />
      <input type="hidden" name="_gotcha" ref={honeypot} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      <input type="hidden" name="consent" value={consent ? 'true' : 'false'} />

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {config.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            error={errors[field.name]}
            tone={tone}
            onChange={(value) => {
              setValues((v) => ({ ...v, [field.name]: value }));
              if (errors[field.name]) setErrors((e) => ({ ...e, [field.name]: '' }));
            }}
          />
        ))}
      </div>

      {turnstileSiteKey ? <div id="cm-turnstile" className="min-h-[68px]" /> : null}

      <label className="flex items-start gap-2.5 text-[0.75rem] leading-relaxed text-fg-dim">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 appearance-none rounded-[4px] border border-[rgba(243,241,236,.24)] bg-transparent checked:border-[var(--accent)] checked:bg-[var(--accent)]"
        />
        <span>
          I am happy for Covenant to store this message and reply to it. Nothing is shared, sold or used for advertising —{' '}
          <Link href="/security" className="text-fg-muted underline underline-offset-4 hover:text-[var(--accent)]">
            how data is handled
          </Link>
          .
        </span>
      </label>

      {serverError ? (
        <p className="flex items-start gap-2 rounded-3 border border-[rgba(232,121,90,.34)] bg-[rgba(232,121,90,.08)] p-3 text-[0.875rem] text-[var(--color-alert-400)]" role="alert">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cx(
            'group inline-flex h-11 items-center gap-2.5 rounded-pill px-6 text-[0.9375rem] font-medium transition duration-300 disabled:opacity-60',
            tone === 'paper'
              ? 'bg-[var(--color-paper-ink)] text-paper hover:brightness-125'
              : 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_12px_30px_-16px_var(--accent-glow)] hover:-translate-y-px hover:brightness-[1.06]',
          )}
        >
          {status === 'submitting' ? (
            <>
              <Icon name="spinner" size={16} className="animate-spin" /> Sending…
            </>
          ) : (
            <>
              {config.submitLabel}
              <Icon name="arrow-right" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
        <p className="max-w-xs text-[0.75rem] leading-relaxed text-fg-dim">{submitNote ?? 'This goes straight to Covenant — no lists, no tracking pixels.'}</p>
      </div>
    </form>
  );
}

function Field({
  field,
  value,
  error,
  tone,
  onChange,
}: {
  field: PublicFieldDef;
  value: string;
  error?: string;
  tone: 'dark' | 'paper';
  onChange: (value: string) => void;
}) {
  const id = `f-${field.name}`;
  const border = error
    ? 'border-[rgba(232,121,90,.6)]'
    : tone === 'paper'
      ? 'border-[rgba(16,17,21,.16)] focus:border-[rgba(16,17,21,.5)]'
      : 'border-[rgba(243,241,236,.14)] hover:border-[rgba(243,241,236,.26)] focus:border-[var(--accent)]';
  const shell = cx(
    'w-full rounded-3 border px-3.5 py-2.5 text-[0.9375rem] outline-none transition-[border-color,background-color] duration-300 placeholder:text-fg-dim/70',
    tone === 'paper' ? 'bg-[rgba(16,17,21,.02)] text-[var(--color-paper-ink)] placeholder:text-[rgba(16,17,21,.42)]' : 'bg-[rgba(243,241,236,.02)] text-fg',
    border,
  );
  const shared = {
    id,
    name: field.name,
    required: field.required,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value),
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-err` : field.help ? `${id}-help` : undefined,
    placeholder: field.placeholder,
    maxLength: field.maxLength,
  };

  return (
    <div className={cx('min-w-0', field.width === 'full' || field.type === 'textarea' ? 'sm:col-span-2' : '')}>
      <label htmlFor={id} className={cx('flex items-baseline justify-between gap-3 font-mono text-[0.625rem] uppercase tracking-[0.16em]', tone === 'paper' ? 'text-[rgba(16,17,21,.62)]' : 'text-fg-dim')}>
        <span>
          {field.label}
          {field.required ? <span className="ml-1 text-[var(--accent)]" aria-hidden>*</span> : <span className="ml-1 opacity-50">(optional)</span>}
        </span>
      </label>
      <div className="mt-2">
        {field.type === 'textarea' ? (
          <textarea {...shared} rows={field.rows ?? 4} className={cx(shell, 'resize-y leading-relaxed')} />
        ) : field.type === 'select' ? (
          <div className="relative">
            <select {...shared} className={cx(shell, 'appearance-none pr-9')}>
              <option value="">Select…</option>
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" size={14} className={cx('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2', tone === 'paper' ? 'text-[rgba(16,17,21,.5)]' : 'text-fg-dim')} />
          </div>
        ) : (
          <input
            {...shared}
            type={field.type === 'number' ? 'number' : field.type}
            inputMode={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}
            autoComplete={field.type === 'email' ? 'email' : field.name === 'name' ? 'name' : field.name === 'phone' ? 'tel' : 'on'}
            className={shell}
          />
        )}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-[var(--color-alert-400)]">
          <Icon name="alert" size={12} /> {error}
        </p>
      ) : field.help ? (
        <p id={`${id}-help`} className={cx('mt-1.5 text-[0.75rem] leading-snug', tone === 'paper' ? 'text-[rgba(16,17,21,.55)]' : 'text-fg-dim')}>
          {field.help}
        </p>
      ) : null}
    </div>
  );
}

/** Details panel used next to a form. */
export function ContactDetails({ title, items, note }: { title?: string; items: { label: string; value: string; href?: string | null; icon?: string }[]; note?: string | null }) {
  const rows = items.filter((item) => item.value);
  if (!rows.length) return null;
  return (
    <div className="rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] p-6">
      {title ? <p className="eyebrow">{title}</p> : null}
      <dl className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{row.label}</dt>
            <dd className="mt-1.5 text-[0.9375rem] text-fg">
              {row.href ? (
                <a
                  href={row.href}
                  target={row.href.startsWith('http') ? '_blank' : undefined}
                  rel={row.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="mask-link inline-flex items-center gap-1.5 transition hover:text-[var(--accent)]"
                  data-analytics="outbound_click"
                  data-analytics-target={row.href}
                >
                  {row.icon ? <Icon name={row.icon} size={14} className="opacity-70" /> : null}
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-6 border-t border-[rgba(243,241,236,.09)] pt-4 text-[0.8125rem] leading-relaxed text-fg-muted">{note}</p> : null}
    </div>
  );
}

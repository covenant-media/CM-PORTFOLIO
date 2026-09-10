'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

export function NewsletterForm({ source, tone = 'dark' }: { source: string; tone?: 'dark' | 'paper' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('success');
        setMessage(data.message || 'Subscribed.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-3 border border-[rgba(116,201,160,.32)] bg-[rgba(116,201,160,.07)] p-3 text-[0.875rem] text-[var(--color-ok-400)]">
        <Icon name="check" size={14} />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <div className={cx("flex overflow-hidden rounded-pill border p-1 transition",
          tone === 'paper' ? "border-[rgba(16,17,21,.16)] bg-[rgba(16,17,21,.03)] focus-within:border-[rgba(16,17,21,.5)]" : "border-[rgba(243,241,236,.14)] bg-[rgba(243,241,236,.03)] focus-within:border-[var(--accent)]/50"
      )}>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Your email"
          aria-label="Email for newsletter"
          disabled={status === 'submitting'}
          className={cx("min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[0.8rem] focus:outline-none disabled:opacity-50",
            tone === 'paper' ? "text-[var(--color-paper-ink)] placeholder:text-[rgba(16,17,21,.42)]" : "text-fg placeholder:text-fg-dim"
          )}
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className={cx("shrink-0 rounded-pill px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.1em] transition disabled:opacity-50",
            tone === 'paper' ? "bg-[var(--color-paper-ink)] text-paper hover:brightness-125" : "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-105"
          )}
        >
          {status === 'submitting' ? '...' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-[0.75rem] text-[var(--color-alert-400)]">{message}</p>
      )}
    </form>
  );
}
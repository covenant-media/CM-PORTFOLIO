'use client';

/**
 * Typewriter effect: cycles through phrases, typing/holding/deleting.
 * Honors prefers-reduced-motion (shows all joined by ·).
 *
 * Timings tuned for a smooth flowing feel per reference:
 *  - types a bit fast so it feels responsive (35ms per char)
 *  - holds long enough to actually read the phrase (2000ms)
 *  - deletes smoothly (20ms per char, slightly faster than type)
 *  - small pause (200ms) between phrases before the next types in
 */
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/utils/text';

function useReduced() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduce(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduce;
}

interface Props {
  phrases: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  hold?: number;
  gap?: number;
}

export function Typewriter({
  phrases,
  className,
  typeSpeed = 35,
  deleteSpeed = 20,
  hold = 2000,
  gap = 200,
}: Props) {
  const reduce = useReduced();
  const [text, setText] = useState('');
  const idx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    if (reduce || !phrases.length) return;
    let timer: number;
    const tick = () => {
      const current = phrases[idx.current % phrases.length];
      if (!deleting.current) {
        const next = current.slice(0, text.length + 1);
        setText(next);
        if (next === current) {
          deleting.current = true;
          timer = window.setTimeout(tick, hold);
          return;
        }
        timer = window.setTimeout(tick, typeSpeed);
      } else {
        const next = current.slice(0, text.length - 1);
        setText(next);
        if (next === '') {
          deleting.current = false;
          idx.current += 1;
          timer = window.setTimeout(tick, gap);
          return;
        }
        timer = window.setTimeout(tick, deleteSpeed);
      }
    };
    timer = window.setTimeout(tick, 250);
    return () => window.clearTimeout(timer);
  }, [deleteSpeed, gap, hold, phrases, reduce, text.length, typeSpeed]);

  if (reduce || !phrases.length) {
    return (
      <span className={className}>
        {phrases.map((p, i) => (i ? <span key={p}> · {p}</span> : <span key={p}>{p}</span>))}
      </span>
    );
  }

  return (
    <span className={cx('inline-flex items-baseline', className)}>
      <span>{text}</span>
      <span
        aria-hidden
        className="ml-1 inline-block h-[1.15em] w-[2.5px] translate-y-[0.10em] bg-[var(--accent)] animate-[blink_0.8s_steps(2)_infinite]"
      />
      <style>{`@keyframes blink{50%{opacity:0}}`}</style>
    </span>
  );
}

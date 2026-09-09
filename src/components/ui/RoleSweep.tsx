'use client';

/**
 * RoleSweep — the animated role line under the hero name.
 *
 * Deliberately not a typewriter: every line keeps its final box the whole time
 * (no reflow, no cursor flicker, no layout jump between phrases), and a
 * clip-path window wipes across it. The cycle for each role is
 * reveal (left→right) → readable hold → retract (right→left), then the next
 * line starts opening immediately — one continuous motion, each phase chained
 * by a single CSS transition while JS only advances the phase pointer.
 *
 * `prefers-reduced-motion` (or a single phrase) falls back to showing every
 * role at once, joined by a middot — same as the previous role-line component.
 */
import { useEffect, useState } from 'react';
import { cx } from '@/lib/utils/text';

interface Props {
  phrases: string[];
  className?: string;
  /** ms the first reveal takes — a touch slower so the opening line reads as an entrance */
  revealFirstMs?: number;
  /** ms each subsequent line takes to open across */
  revealMs?: number;
  /** ms the fully opened line stays up — sized so it is comfortably readable */
  holdMs?: number;
  /** ms the line takes to retract right→left before the next one opens */
  eraseMs?: number;
}

type Phase = 'hold' | 'erase' | 'reveal';

export function RoleSweep({
  phrases,
  className,
  revealFirstMs = 900,
  revealMs = 680,
  holdMs = 2000,
  eraseMs = 520,
}: Props) {
  // The first line renders fully open on the server so the hero copy is readable
  // without JS and hydration never flashes; the cycle starts from there.
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('hold');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setReduced(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Phase chain: hold → erase → reveal(next) → hold → …
  // Each timer is padded past its transition so a phase never switches while the
  // previous wipe is still settling (that mid-flight swap is what reads as "jump").
  useEffect(() => {
    if (reduced || phrases.length < 2) return;
    const duration =
      phase === 'hold'
        ? holdMs
        : phase === 'erase'
          ? eraseMs + 40
          : (index === 0 ? revealFirstMs : revealMs) + 40;
    const timer = window.setTimeout(() => {
      if (phase === 'hold') setPhase('erase');
      else if (phase === 'erase') {
        setIndex((i) => (i + 1) % phrases.length);
        setPhase('reveal');
      } else setPhase('hold');
    }, duration);
    return () => window.clearTimeout(timer);
  }, [phase, index, reduced, phrases.length, holdMs, eraseMs, revealMs, revealFirstMs]);

  if (reduced || phrases.length < 2) {
    return (
      <span className={className} aria-hidden>
        {phrases.join(' · ')}
      </span>
    );
  }

  // All phrases stack in one grid cell, so the line box keeps the width/height of
  // the longest text in the current wrap state — switching lines cannot shift anything.
  return (
    <span aria-hidden className={cx('relative grid', className)}>
      {phrases.map((phrase, i) => {
        const active = i === index;
        // Reveal/hold → fully open; erase → right edge collapses leftward (retract
        // right→left). Inactive lines sit fully closed, invisible but still sizing.
        const clip = !active || phase === 'erase' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)';
        const duration = !active
          ? 0
          : phase === 'erase'
            ? eraseMs
            : phase === 'reveal'
              ? index === 0
                ? revealFirstMs
                : revealMs
              : 0;
        return (
          <span
            key={phrase}
            className="col-start-1 row-start-1"
            style={{
              clipPath: clip,
              transitionProperty: 'clip-path',
              transitionDuration: `${duration}ms`,
              transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
              willChange: 'clip-path',
            }}
          >
            {phrase}
          </span>
        );
      })}
    </span>
  );
}

'use client';

/**
 * Motion primitives. Intentionally few and cheap: CSS transforms/opacity only
 * (GPU friendly), everything gated on prefers-reduced-motion, no layout thrash.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cx } from '@/lib/utils/text';

/** Vertical parallax driven by scroll position. `distance` in px. */
export function Parallax({
  children,
  distance = 40,
  className,
  axis = 'y',
}: {
  children: React.ReactNode;
  distance?: number;
  className?: string;
  axis?: 'x' | 'y';
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const style = useMemo(() => (axis === 'y' ? { y: raw } : { x: raw }), [axis, raw]);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className}>
      <motion.div style={style} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/** Line-mask reveal for display type: each line slides out from under a clip. */
export function MaskReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
  as: Tag = 'span',
  stagger = 90,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: 'span' | 'h1' | 'h2' | 'p';
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <Tag className={cx('block', className)}>
      {lines.map((line, i) => (
        <span key={`${line}-${i}`} className={cx('block overflow-hidden')}>
          <motion.span
            className={cx('block will-change-transform', lineClassName)}
            initial={reduce ? false : { y: '108%', opacity: 0.001 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, margin: '-8% 0px -8% 0px' }}
            transition={{ duration: 0.95, delay: delay / 1000 + (i * stagger) / 1000, ease: [0.16, 1, 0.3, 1] }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Fade + rise on enter viewport. */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
  once = true,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  as?: 'div' | 'li' | 'article' | 'section';
}) {
  const reduce = useReducedMotion();
  const MotionTag = (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-6% 0px -6% 0px' }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/** Subtle pointer-follow used on the tech hero portrait / cards. */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const [transform, setTransform] = useState('');
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTransform(`perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateZ(0)`);
    };
    const leave = () => setTransform('perspective(900px) rotateX(0deg) rotateY(0deg)');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [max, reduce]);
  return (
    <div ref={ref} className={cx('[transition:transform_.5s_cubic-bezier(.16,1,.3,1)]', className)} style={{ transform }}>
      {children}
    </div>
  );
}

const GLYPHS = '01<>{}#$%&*/\\|ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Technical "decode" headline — resolves once when it scrolls into view. */
export function DecodeText({ text, className, speed = 34 }: { text: string; className?: string; speed?: number }) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(text);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        let frame = 0;
        const total = text.length;
        const timer = window.setInterval(() => {
          frame += 1;
          const resolved = Math.min(total, Math.floor(frame / 1.6));
          setValue(
            text
              .split('')
              .map((char, i) => {
                if (i < resolved || char === ' ') return char;
                return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              })
              .join(''),
          );
          if (resolved >= total) window.clearInterval(timer);
        }, speed);
        cleanup.push(() => window.clearInterval(timer));
      },
      { threshold: 0.4 },
    );
    const cleanup: Array<() => void> = [];
    observer.observe(node);
    return () => {
      observer.disconnect();
      cleanup.forEach((fn) => fn());
    };
  }, [reduce, speed, text]);

  return (
    <span ref={ref} className={cx('tnum', className)}>
      {value}
    </span>
  );
}

/** Card that lifts and lights its border toward the cursor. */
export function SpotlightCard({
  children,
  className,
  intensity = 0.16,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      el.style.setProperty('--spot-o', String(intensity));
    };
    const leave = () => el.style.setProperty('--spot-o', '0');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [intensity, reduce]);
  return (
    <div ref={ref} className={cx('relative isolate overflow-hidden', className)} style={{ '--spot-o': 0 } as React.CSSProperties}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[var(--spot-o,0)] transition-opacity duration-500"
        style={{ background: 'radial-gradient(340px circle at var(--spot-x,50%) var(--spot-y,50%), var(--accent), transparent 62%)' }}
      />
      {children}
    </div>
  );
}

export function CountUp({ to, duration = 1100, className }: { to: number; duration?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (reduce || to <= 0) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(to * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [duration, reduce, to]);
  return (
    <span ref={ref} className={cx('tnum', className)}>
      {value}
    </span>
  );
}

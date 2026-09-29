import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import { Sparkle } from './Sparkle';
import s from './ProgressRing.module.css';

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  /** Accessible name ("87% consistent this month"). */
  label: string;
  /** Diameter in px. */
  size?: number;
  /** Stroke width in px (defaults to ~11% of the size). */
  thickness?: number;
  tone?: Tone;
  /** Center content (a big friendly number, an icon…). */
  children?: ComponentChildren;
  /** Fill from empty on mount (default true; skipped with reduced motion by CSS). */
  animateIn?: boolean;
  class?: string;
}

/** A soft ring that fills clockwise from 12 o'clock and gets a sparkle when complete. */
export function ProgressRing({ value, label, size = 96, thickness, tone = 'sage', children, animateIn = true, class: cls }: ProgressRingProps) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const [shown, setShown] = useState(animateIn ? 0 : v);
  useEffect(() => {
    if (shown === v) return;
    const raf = requestAnimationFrame(() => setShown(v));
    return () => cancelAnimationFrame(raf);
  }, [v]);

  const stroke = thickness ?? Math.max(6, Math.round(size * 0.11));
  const r = 50 - (stroke / size) * 50;
  const sw = (stroke / size) * 100;
  const complete = v >= 1;

  return (
    <div
      class={cx(s.ring, complete && s.complete, toneClass(tone), cls)}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <svg class={s.dial} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle class={s.track} cx="50" cy="50" r={r} stroke-width={sw} />
        <circle
          class={s.fill}
          cx="50"
          cy="50"
          r={r}
          stroke-width={sw}
          pathLength={100}
          stroke-dasharray="100 100"
          style={{ strokeDashoffset: 100 - shown * 100, opacity: shown > 0 ? 1 : 0 }}
        />
      </svg>
      {complete && <Sparkle size={Math.max(10, size * 0.16)} class={s.sparkle} style={{ top: `${stroke / 2}px` }} />}
      {children && <div class={s.center}>{children}</div>}
    </div>
  );
}

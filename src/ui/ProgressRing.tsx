import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import s from './ProgressRing.module.css';

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  /** Accessible name ("26 of the last 30 days"). */
  label: string;
  /** Readable value for assistive tech; defaults to the percentage. */
  valueText?: string;
  /** Diameter in px. */
  size?: number;
  /** Fill stroke width in px (defaults to ~8% of the size). */
  thickness?: number;
  tone?: Tone;
  /** Center content (a number in Castoro, a small word). */
  children?: ComponentChildren;
  /** Fill from empty on mount (default true; instant with reduced motion). */
  animateIn?: boolean;
  class?: string;
}

/** A calm ring: a hairline track and a pastel fill, clockwise from 12 o'clock. */
export function ProgressRing({ value, label, valueText, size = 96, thickness, tone = 'sage', children, animateIn = true, class: cls }: ProgressRingProps) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const [shown, setShown] = useState(animateIn ? 0 : v);
  useEffect(() => {
    if (shown === v) return;
    const raf = requestAnimationFrame(() => setShown(v));
    return () => cancelAnimationFrame(raf);
  }, [v]);

  const stroke = thickness ?? Math.max(4, Math.round(size * 0.08));
  const sw = (stroke / size) * 100;
  const r = 50 - sw / 2 - 0.5;
  const hair = Math.max(0.9, (1.25 / size) * 100);

  return (
    <div
      class={cx(s.ring, toneClass(tone), cls)}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={valueText}
    >
      <svg class={s.dial} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle class={s.track} cx="50" cy="50" r={r} stroke-width={hair} />
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
      {children && <div class={s.center}>{children}</div>}
    </div>
  );
}

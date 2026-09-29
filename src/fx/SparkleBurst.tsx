import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';
import { SPARKLE_PATH } from '@/ui/Sparkle';
import { prefersReducedMotion } from './motion';
import s from './SparkleBurst.module.css';

export interface SparkleBurstProps {
  /** Change this number to play the burst again (0 = idle). */
  trigger: number;
  count?: number;
  /** How far the sparkles travel, in px. */
  radius?: number;
  colors?: string[];
  class?: string;
}

const DEFAULT_COLORS = ['#FFE593', '#FFFFFF', '#FFC4D3', '#F6C544'];

/**
 * A little ring of ✦ sparkles that pops out of the center of its (position: relative) parent.
 * Pure CSS animation; renders nothing while idle or with reduced motion.
 */
export function SparkleBurst({ trigger, count = 6, radius = 30, colors = DEFAULT_COLORS, class: cls }: SparkleBurstProps) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const d = radius * (0.75 + Math.random() * 0.4);
        return {
          '--dx': `${(Math.cos(a) * d).toFixed(1)}px`,
          '--dy': `${(Math.sin(a) * d).toFixed(1)}px`,
          '--rot': `${Math.round(Math.random() * 90 - 45)}deg`,
          '--size': `${Math.round(8 + Math.random() * 6)}px`,
          '--delay': `${Math.round(Math.random() * 60)}ms`,
          color: colors[i % colors.length],
        } as JSX.CSSProperties;
      }),
    [trigger, count, radius, colors],
  );
  if (!trigger || prefersReducedMotion()) return null;
  return (
    <span key={trigger} class={[s.burst, cls].filter(Boolean).join(' ')} aria-hidden="true">
      {sparks.map((style, i) => (
        <svg key={i} class={s.spark} style={style} viewBox="-10 -10 20 20">
          <path d={SPARKLE_PATH} fill="currentColor" stroke="#5A3E45" stroke-opacity="0.18" stroke-width="1" />
        </svg>
      ))}
    </span>
  );
}

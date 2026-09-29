import { h, render, type JSX } from 'preact';
import { useMemo } from 'preact/hooks';
import { SPARKLE_PATH } from '@/ui/Sparkle';
import { fxLayer, toPoint, type Point } from './layer';
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

/** Butter and blush: the ✦ motif's colors, deep enough to read on cream and on night plum. */
const DEFAULT_COLORS = ['#F6C544', '#F58CAA', '#FFD65C', '#F6C544', '#FFC4D3'];

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
          '--size': `${Math.round(11 + Math.random() * 6)}px`,
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
          <path d={SPARKLE_PATH} fill="currentColor" stroke="#5A3E45" stroke-opacity="0.3" stroke-width="1.2" />
        </svg>
      ))}
    </span>
  );
}

const PUFF_MS = 760;

/**
 * Fire-and-forget SparkleBurst at a point on screen (the check-in puff, DESIGN §9.1): a handful
 * of DOM sparkles on the shared FX layer, so tiny moments never spin up the confetti canvas.
 */
export function sparklePuff(at: DOMRect | Point, { count = 6, radius = 30 }: { count?: number; radius?: number } = {}): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const p = toPoint(at);
  const holder = document.createElement('div');
  holder.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:0;height:0`;
  fxLayer().appendChild(holder);
  render(h(SparkleBurst, { trigger: 1, count, radius }), holder);
  setTimeout(() => {
    render(null, holder);
    holder.remove();
  }, PUFF_MS);
}

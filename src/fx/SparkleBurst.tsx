import { h, render } from 'preact';
import { GLINT_PATH } from '@/ui/Sparkle';
import { fxLayer, toPoint, type Point } from './layer';
import { prefersReducedMotion } from './motion';
import s from './SparkleBurst.module.css';

export interface SparkleBurstProps {
  /** Change this number to play the glint again (0 = idle). */
  trigger: number;
  /** Diameter of the glint in px. */
  size?: number;
  /** Kept for older callers: a rare reveal gets ONE glint, whatever the count. */
  count?: number;
  radius?: number;
  colors?: string[];
  class?: string;
}

/** How long the glint lasts (ms). */
export const GLINT_MS = 720;

/**
 * One foil glint (DESIGN §10.5): light catching a printed foil edge for a moment, over the
 * centre of its (position: relative) parent. Pure CSS; renders nothing while idle or with
 * reduced motion (the static foil finish still says "rare").
 */
export function SparkleBurst({ trigger, size = 26, class: cls }: SparkleBurstProps) {
  if (!trigger || prefersReducedMotion()) return null;
  return (
    <span key={trigger} class={[s.glint, cls].filter(Boolean).join(' ')} style={{ '--size': `${size}px` }} aria-hidden="true">
      <svg viewBox="-10 -10 20 20" class={s.mark}>
        <path d={GLINT_PATH} class={s.outer} />
        <path d={GLINT_PATH} class={s.inner} transform="scale(0.55)" />
      </svg>
    </span>
  );
}

/** The same glint, fired at a point on screen (a revealed card's foil edge). */
export function glintAt(at: DOMRect | Point, size = 26): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const p = toPoint(at);
  const holder = document.createElement('div');
  holder.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:0;height:0`;
  fxLayer().appendChild(holder);
  render(h(SparkleBurst, { trigger: 1, size }), holder);
  setTimeout(() => {
    render(null, holder);
    holder.remove();
  }, GLINT_MS + 60);
}

/** The older name: check-ins no longer puff sparkles, so this is one glint too. */
export function sparklePuff(at: DOMRect | Point, _opts: { count?: number; radius?: number } = {}): void {
  glintAt(at);
}

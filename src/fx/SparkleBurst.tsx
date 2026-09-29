import { h, render } from 'preact';
import { SPARKLE_PATH } from '@/ui/Sparkle';
import { fxLayer, toPoint, type Point } from './layer';
import { prefersReducedMotion } from './motion';
import s from './SparkleBurst.module.css';

export interface SparkleBurstProps {
  /** Change this number to play it again (0 = idle). */
  trigger: number;
  /**
   * 'foil' (default): a rare reveal's one foil glint, a pale-gold sheen sliding once across the
   * parent. 'secret': a Secret's one sparkle (DESIGN §10.5).
   */
  variant?: 'foil' | 'secret';
  /** The Secret's sparkle diameter in px. */
  size?: number;
  /** Kept for older callers: a reveal gets ONE glint, whatever the count. */
  count?: number;
  radius?: number;
  colors?: string[];
  class?: string;
}

/** How long the glint lasts (ms). */
export const GLINT_MS = 600;

/**
 * One foil glint (DESIGN §10.5): light sliding once across a printed foil finish. It fills its
 * (position: relative) parent, clipped to the parent's rounded corners, and moves by transform
 * only. Renders nothing while idle or with reduced motion (the static foil still says "rare").
 */
export function SparkleBurst({ trigger, variant = 'foil', size = 26, class: cls }: SparkleBurstProps) {
  if (!trigger || prefersReducedMotion()) return null;
  if (variant === 'secret') {
    return (
      <span key={trigger} class={[s.secret, cls].filter(Boolean).join(' ')} style={{ '--size': `${size}px` }} aria-hidden="true">
        <svg viewBox="-10 -10 20 20" class={s.mark}>
          <path d={SPARKLE_PATH} class={s.star} />
        </svg>
      </span>
    );
  }
  return (
    <span key={trigger} class={[s.foil, cls].filter(Boolean).join(' ')} aria-hidden="true">
      <span class={s.sheen} />
    </span>
  );
}

/**
 * The same glint across an area of the screen (a revealed card's foil face). Given a point, it
 * crosses a `size`-px square around it.
 */
export function glintAt(at: DOMRect | Point, size = 26, radius = 12): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const box = 'width' in at ? at : (() => {
    const p = toPoint(at);
    return { left: p.x - size / 2, top: p.y - size / 2, width: size, height: size };
  })();
  const holder = document.createElement('div');
  holder.style.cssText = `position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;border-radius:${radius}px`;
  fxLayer().appendChild(holder);
  render(h(SparkleBurst, { trigger: 1 }), holder);
  setTimeout(() => {
    render(null, holder);
    holder.remove();
  }, GLINT_MS + 60);
}

/** The older name: check-ins no longer puff sparkles, so this is one glint too. */
export function sparklePuff(at: DOMRect | Point, _opts: { count?: number; radius?: number } = {}): void {
  glintAt(at);
}

import { useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { Ratchet, TICK_DEG, angleDelta } from './ratchet';

/** A press that moves less than this is a tap (auto-turn), not a drag. */
const TAP_DEG = 10;
/** Closer to the hub than this share of the crank's radius (and at least 10px), the pointer's angle is noise. */
const DEAD_ZONE = 0.3;

export interface CrankCallbacks {
  /** First real movement of a drag. */
  onGrab: () => void;
  /** The crank moved forward by `delta` degrees, to `progress` (0..TURN_TARGET), turning in `dir`. */
  onAdvance: (progress: number, delta: number, dir: 1 | -1) => void;
  /** Tap, click, Enter or Space: turn it automatically. */
  onAutoTurn: () => void;
  /** A tap or key while the handle can't turn yet (nothing paid). */
  onIdleTap?: () => void;
}

interface Drag {
  pointerId: number;
  cx: number;
  cy: number;
  dead: number;
  /** Last pointer angle; null until the pointer is far enough from the hub. */
  last: number | null;
  moved: number;
}

function angleAt(d: Drag, x: number, y: number): number | null {
  const dx = x - d.cx;
  const dy = y - d.cy;
  if (dx * dx + dy * dy < d.dead * d.dead) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Circular drag on the handle: angle via atan2 around the hub (pointer capture keeps the drag
 * even when the finger strays), fed through a ratchet that ignores jumps across the hub. The
 * arrow keys step it round one ratchet click at a time; Enter and Space give it a whole turn.
 * Returns handlers for the handle's slider.
 */
export function useCrank(enabled: boolean, cb: CrankCallbacks) {
  const drag = useRef<Drag | null>(null);
  const ratchet = useRef(new Ratchet()).current;
  const suppressClick = useRef(false);
  const cbs = useRef(cb);
  cbs.current = cb;

  const report = (moved: number) => {
    if (moved > 0 && ratchet.dir !== 0) cbs.current.onAdvance(ratchet.progress, moved, ratchet.dir);
  };

  const handlers: Pick<JSX.HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick' | 'onKeyDown'> = {
    onPointerDown: (e) => {
      if (!enabled || e.button !== 0) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const d: Drag = {
        pointerId: e.pointerId,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        dead: Math.max(10, (r.width / 2) * DEAD_ZONE),
        last: null,
        moved: 0,
      };
      d.last = angleAt(d, e.clientX, e.clientY);
      drag.current = d;
      el.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const a = angleAt(d, e.clientX, e.clientY);
      if (a === null) return;
      if (d.last === null) {
        d.last = a;
        return;
      }
      const delta = angleDelta(d.last, a);
      d.last = a;
      d.moved += Math.abs(delta);
      const wasCommitted = ratchet.dir !== 0;
      const moved = ratchet.turn(delta);
      if (!wasCommitted && ratchet.dir !== 0) cbs.current.onGrab();
      report(moved);
    },
    onPointerUp: (e) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      // A real drag already turned the crank; swallow the click that follows it.
      suppressClick.current = d.moved >= TAP_DEG;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onClick: () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      if (enabled) cbs.current.onAutoTurn();
      else cbs.current.onIdleTap?.();
    },
    onKeyDown: (e) => {
      const whole = e.key === 'Enter' || e.key === ' ' || e.key === 'End';
      const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageUp';
      if (!whole && !step) return;
      e.preventDefault();
      // Keep the page (and the carousel) from taking the arrow keys too.
      e.stopPropagation();
      if (e.repeat && whole) return;
      if (!enabled) {
        cbs.current.onIdleTap?.();
        return;
      }
      if (whole) {
        cbs.current.onAutoTurn();
        return;
      }
      const wasCommitted = ratchet.dir !== 0;
      const moved = ratchet.push(e.key === 'PageUp' ? TICK_DEG * 3 : TICK_DEG);
      if (!wasCommitted) cbs.current.onGrab();
      report(moved);
    },
  };

  return {
    handlers,
    /** Current progress in degrees. */
    progress: () => ratchet.progress,
    /** Programmatic turning (auto-turn animation). */
    advanceBy: (delta: number) => report(ratchet.push(delta)),
    reset: () => {
      ratchet.reset();
      drag.current = null;
      suppressClick.current = false;
    },
  };
}

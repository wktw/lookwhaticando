import { useRef } from 'preact/hooks';
import type { JSX } from 'preact';

/** Degrees of turning that release a capsule (DESIGN §9.3). */
export const TURN_TARGET = 300;
/** A ratchet click every this many degrees. */
export const TICK_DEG = 30;
/** Rotation that commits a direction; either way counts, as long as it stays consistent. */
const COMMIT_DEG = 12;
/** A press that moves less than this is a tap (auto-turn), not a drag. */
const TAP_DEG = 10;

export interface CrankCallbacks {
  /** First real movement of a drag. */
  onGrab: () => void;
  /** Progress moved forward by `delta` degrees (0..TURN_TARGET total), turning in `dir`. */
  onAdvance: (progress: number, delta: number, dir: 1 | -1) => void;
  /** Tap, click, Enter or Space: turn it automatically. */
  onAutoTurn: () => void;
}

interface Drag {
  pointerId: number;
  cx: number;
  cy: number;
  /** Last pointer angle; null until the pointer is far enough from the hub. */
  last: number | null;
  moved: number;
  pending: number;
}

function angleAt(d: Drag, x: number, y: number): number | null {
  const dx = x - d.cx;
  const dy = y - d.cy;
  // Too close to the hub, the angle is noise.
  if (dx * dx + dy * dy < 64) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Circular drag on the crank: angle via atan2 around the hub, cumulative rotation with a
 * ratchet (only the committed direction advances; backing up never undoes progress).
 * Returns pointer + click handlers for the crank button and the live progress state.
 */
export function useCrank(enabled: boolean, cb: CrankCallbacks) {
  const drag = useRef<Drag | null>(null);
  const turn = useRef({ progress: 0, dir: 0 as 0 | 1 | -1, suppressClick: false });
  const cbs = useRef(cb);
  cbs.current = cb;

  const advance = (delta: number) => {
    const t = turn.current;
    if (t.dir === 0 || delta <= 0 || t.progress >= TURN_TARGET) return;
    const next = Math.min(TURN_TARGET, t.progress + delta);
    const d = next - t.progress;
    t.progress = next;
    cbs.current.onAdvance(next, d, t.dir);
  };

  const handlers: Pick<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick'> = {
    onPointerDown: (e) => {
      if (!enabled || e.button !== 0) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const d: Drag = { pointerId: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, last: null, moved: 0, pending: 0 };
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
      let delta = a - d.last;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      d.last = a;
      d.moved += Math.abs(delta);
      const t = turn.current;
      if (t.dir === 0) {
        d.pending += delta;
        if (Math.abs(d.pending) < COMMIT_DEG) return;
        t.dir = d.pending > 0 ? 1 : -1;
        cbs.current.onGrab();
        advance(Math.abs(d.pending));
        return;
      }
      if (Math.sign(delta) === t.dir) advance(Math.abs(delta));
    },
    onPointerUp: (e) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      drag.current = null;
      // A real drag already turned the crank; swallow the click that follows it.
      turn.current.suppressClick = d.moved >= TAP_DEG;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onClick: () => {
      const t = turn.current;
      if (t.suppressClick) {
        t.suppressClick = false;
        return;
      }
      if (enabled) cbs.current.onAutoTurn();
    },
  };

  return {
    handlers,
    /** Current progress in degrees. */
    progress: () => turn.current.progress,
    direction: () => turn.current.dir,
    /** Programmatic turning (auto-turn animation). */
    advanceBy: (delta: number) => {
      if (turn.current.dir === 0) turn.current.dir = 1;
      advance(delta);
    },
    reset: () => {
      turn.current = { progress: 0, dir: 0, suppressClick: false };
      drag.current = null;
    },
  };
}

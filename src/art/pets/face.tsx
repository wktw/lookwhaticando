import type { JSX } from 'preact';
import { BLUSH, TONGUE, type Tones } from './palette';
import type { CanonicalExpression } from './types';
import type { LitKey } from './rig';
import { circle, ellipse, fmt } from './shape';

/**
 * Faces (DESIGN §10.4): solid graphite dot eyes (an iris for breeds known by their eyes), a pale
 * ring on dark coats, a catchlight toward the window at larger sizes. Closed eyes and whiskers
 * are the only strokes (`pet-line`). Mouths appear only for a yawn, a blep or chewing.
 */

export interface FaceCtx {
  tones: Tones;
  expr: CanonicalExpression;
  /** The eyes are shut whatever the expression (sleep pose, small sizes). */
  closed: boolean;
  /** ≥ 48 px: catchlights, whiskers, inner ears. */
  full: boolean;
  lit: LitKey;
  /** Cats have slit pupils when they have an iris. */
  slit?: boolean;
  /** Idle life is on: the slow blink plays in CSS instead of holding half-closed. */
  animated?: boolean;
}

const CATCH: Record<LitKey, [number, number]> = { left: [-0.36, -0.4], top: [0, -0.46], right: [0.36, -0.4] };

type EyeState = 'open' | 'closed' | 'happy';

export function eyeState(f: FaceCtx): EyeState {
  if (f.closed || f.expr === 'sleep' || f.expr === 'yawn') return 'closed';
  if (f.expr === 'happy') return 'happy';
  return 'open';
}

/** Two eyes. `left` and `right` are x positions in the head frame; `y2` and `r2` for eyes that are not level. */
export function Eyes({ f, y, y2 = y, left, right, r, r2 = r }: { f: FaceCtx; y: number; y2?: number; left: number; right: number; r: number; r2?: number }) {
  const state = eyeState(f);
  const t = f.tones;
  const w = fmt(Math.max(0.9, r * 0.6));
  if (state !== 'open') {
    const up = state === 'happy';
    const arc = (x: number, y: number, r: number) =>
      up
        ? `M${fmt(x - r * 1.05)} ${fmt(y + r * 0.35)}Q${fmt(x)} ${fmt(y - r * 1.25)} ${fmt(x + r * 1.05)} ${fmt(y + r * 0.35)}`
        : `M${fmt(x - r * 1.05)} ${fmt(y - r * 0.1)}Q${fmt(x)} ${fmt(y + r * 0.95)} ${fmt(x + r * 1.05)} ${fmt(y - r * 0.1)}`;
    return <path class="pet-line" d={arc(left, y, r) + arc(right, y2, r2)} fill="none" stroke={t.line} stroke-width={w} stroke-linecap="round" />;
  }
  if (f.expr === 'blink' && !f.animated) {
    // A still slow blink: the lids halfway down, the lower half of each eye showing.
    const half = (x: number, y: number, rr: number) => `M${fmt(x - rr * 1.1)} ${fmt(y - rr * 0.1)}Q${fmt(x)} ${fmt(y + rr * 1.5)} ${fmt(x + rr * 1.1)} ${fmt(y - rr * 0.1)}Z`;
    return (
      <g>
        {t.ring && <path d={half(left, y, r * 1.4) + half(right, y2, r2 * 1.4)} fill={t.ring} />}
        <path d={half(left, y, r) + half(right, y2, r2)} fill={t.eye ?? t.ink} />
      </g>
    );
  }
  const k = f.expr === 'surprised' ? 1.16 : 1;
  const [cx, cy] = CATCH[f.lit];
  // Both eyes share each layer (ring, iris, pupil, catchlight) as one path: fewer nodes.
  const eyes: [number, number, number, string | null][] = [
    [left, y, r * k, t.eye],
    [right, y2, r2 * k, t.eye2],
  ];
  const all = (fn: (x: number, y: number, rr: number) => string) => eyes.map(([x, yy, rr]) => fn(x, yy, rr)).join('');
  const iris = t.eye;
  const pupil = (x: number, yy: number, rr: number) => (!iris ? circle(x, yy, rr) : f.slit ? ellipse(x, yy, rr * 0.38, rr * 0.98) : circle(x, yy, rr * 0.62));
  // The blink squashes both eyes toward the eye line (pet.css); the slow blink holds it.
  const mid = (y + y2) / 2;
  return (
    <g transform={`translate(0 ${fmt(mid)})`}>
      <g class={f.expr === 'blink' ? 'pet-slowblink' : 'pet-blink'}>
        <g transform={`translate(0 ${fmt(-mid)})`}>
          {t.ring && <path d={all((x, yy, rr) => circle(x, yy, rr * (iris ? 1.5 : 1.36)))} fill={t.ring} />}
          {iris &&
            (t.eye2 === iris ? (
              <path d={all((x, yy, rr) => circle(x, yy, rr * 1.2))} fill={iris} />
            ) : (
              eyes.map(([x, yy, rr, c], n) => <path key={n} d={circle(x, yy, rr * 1.2)} fill={c ?? iris} />)
            ))}
          <path d={all(pupil)} fill={t.ink} />
          {f.full && <path d={all((x, yy, rr) => circle(x + cx * rr, yy + cy * rr, rr * 0.33))} fill="#FFFDF8" />}
        </g>
      </g>
    </g>
  );
}

/** Blush appears only as a reaction (happy). */
export function Blush({ f, y, left, right, rx = 3.2, ry = 1.9, opacity = 0.7 }: { f: FaceCtx; y: number; left: number; right: number; rx?: number; ry?: number; opacity?: number }) {
  if (f.expr !== 'happy') return null;
  return (
    <g fill={BLUSH} opacity={opacity}>
      <ellipse cx={left} cy={y} rx={rx} ry={ry} />
      <ellipse cx={right} cy={y} rx={rx} ry={ry} />
    </g>
  );
}

/** A small mouth for a yawn, a tongue tip for a blep, a moving jaw line for chewing. */
export function Mouth({ f, x, y, s = 1 }: { f: FaceCtx; x: number; y: number; s?: number }): JSX.Element | null {
  const t = f.tones;
  if (f.expr === 'yawn') {
    return (
      <g transform={`translate(${fmt(x)} ${fmt(y)}) scale(${fmt(s)})`}>
        <path d="M-2.3 0.4C-2.3 -1 2.3 -1 2.3 0.4C2.3 3.4 1.2 4.8 0 4.8C-1.2 4.8 -2.3 3.4 -2.3 0.4Z" fill="#7C4854" />
        <path d="M-1.5 3.2C-0.8 2.5 0.8 2.5 1.5 3.2C1.1 4.3 0.6 4.7 0 4.7C-0.6 4.7 -1.1 4.3 -1.5 3.2Z" fill={TONGUE} />
      </g>
    );
  }
  if (f.expr === 'blep') {
    return <path transform={`translate(${fmt(x)} ${fmt(y)}) scale(${fmt(s)})`} d="M-1.3 0C-1.3 1.9 -0.7 2.8 0 2.8C0.7 2.8 1.3 1.9 1.3 0Z" fill={TONGUE} />;
  }
  if (f.expr === 'chew') {
    return (
      <g transform={`translate(${fmt(x)} ${fmt(y)}) scale(${fmt(s)})`}>
        <g class="pet-chew">
          <path class="pet-line" d="M-1.6 0.6Q0 1.6 1.6 0.6" fill="none" stroke={t.line} stroke-width="0.9" stroke-linecap="round" />
        </g>
      </g>
    );
  }
  return null;
}

/** Three whiskers a side, thin graphite, only at full detail. */
export function Whiskers({ f, left, right, y, len = 9, spread = 3 }: { f: FaceCtx; left: number; right: number; y: number; len?: number; spread?: number }) {
  if (!f.full) return null;
  const side = (x0: number, dir: number) =>
    [-1, 0, 1].map((k) => `M${fmt(x0)} ${fmt(y + k * 1.1)}L${fmt(x0 + dir * len)} ${fmt(y + k * spread - 1.4)}`).join('');
  return (
    <path
      class="pet-line"
      d={side(right, 1) + side(left, -1)}
      fill="none"
      stroke={f.tones.dark ? f.tones.line : f.tones.ink}
      stroke-opacity={f.tones.dark ? 0.55 : 0.5}
      stroke-width="0.7"
      stroke-linecap="round"
    />
  );
}

import type { JSX } from 'preact';
import { useId, useRef } from 'preact/hooks';
import { prefersReducedMotion } from '@/fx/motion';
import { cx } from './cx';
import { toneClass, type Tone } from './tone';
import {
  CHECK_PATH,
  countLabelPlacement,
  isCountHabit,
  MOON_PATH,
  RING,
  ringState,
  SPROUT_LEAVES,
  SPROUT_STEM,
  surfaceY,
  WATER_BODY,
  WATER_SURFACE,
  waterLevel,
  type CheckRingState,
} from './checkRing';
import s from './CheckRing.module.css';

export { CHECK_RING_MS, CHECKIN_CHOREOGRAPHY, waterLevel, ringState, type CheckRingState } from './checkRing';

export type CheckRingMark = 'check' | 'sprout' | 'moon' | null;

export interface CheckRingArtProps {
  /** 0..1: how full the ring is. */
  level: number;
  /** What is drawn over the water. */
  mark: CheckRingMark;
  /** 0..1: how far the mark has drawn in (the check's stroke, the sprout's growth). */
  markProgress?: number;
  /** "5/8" for count habits. */
  countLabel?: string;
  /** The ring's edge takes the water's colour once it is full. */
  full?: boolean;
  /** Rest: a lighter, quieter edge. */
  quiet?: boolean;
  tone?: Tone;
  size?: number;
  /** Freeze every value (gallery frames of the choreography). */
  still?: boolean;
  class?: string;
}

/**
 * The ring itself, as a picture of given values. The live CheckRing animates between these
 * values with CSS; the gallery renders chosen frames of the same drawing.
 */
export function CheckRingArt({ level, mark, markProgress = 1, countLabel, full = level >= 1, quiet = false, tone = 'sky', size = 48, still, class: cls }: CheckRingArtProps) {
  const clip = `cr${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const y = surfaceY(level);
  const label = countLabel ? countLabelPlacement(level) : null;
  const p = Math.min(1, Math.max(0, markProgress));
  return (
    <svg
      class={cx(s.art, still && s.still, full && s.full, quiet && s.quiet, toneClass(tone), cls)}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <circle cx={RING.c} cy={RING.c} r={RING.inner} />
        </clipPath>
      </defs>
      <circle class={s.glass} cx={RING.c} cy={RING.c} r={RING.inner} />
      <g clip-path={`url(#${clip})`}>
        <g class={s.water} style={{ transform: `translateY(${y}px)` }}>
          <path class={s.body} d={WATER_BODY} />
          <path class={s.surface} d={WATER_SURFACE} />
        </g>
      </g>
      <circle class={s.edge} cx={RING.c} cy={RING.c} r={RING.r} stroke-width={RING.stroke} />
      {label && (
        <text class={cx(s.count, label.inWater && s.countInWater)} x="24" y="0" style={{ transform: `translateY(${label.y + 3.8}px)` }}>
          {countLabel}
        </text>
      )}
      {/* Every mark stays in the DOM, so checking and unchecking can draw and undraw it. */}
      <path class={s.check} d={CHECK_PATH} pathLength={1} style={{ strokeDashoffset: 1 - (mark === 'check' ? p : 0) }} />
      <g class={s.sprout} style={{ transform: `scale(${mark === 'sprout' ? Math.max(0.001, p) : 0.001})`, opacity: mark === 'sprout' && p > 0 ? 1 : 0 }}>
        <path class={s.stem} d={SPROUT_STEM} />
        <path class={s.leaves} d={SPROUT_LEAVES} />
      </g>
      <path class={s.moon} d={MOON_PATH} style={{ opacity: mark === 'moon' ? p : 0 }} />
    </svg>
  );
}

export interface CheckRingProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'label' | 'size' | 'type' | 'disabled'> {
  /** empty · done · rest (a moon) · tiny (a sprout). Derived from count/target when omitted. */
  state?: CheckRingState;
  /** Count habits: the water shows count/target ("5/8"). */
  count?: number;
  target?: number;
  /**
   * The accessible name. A one-tap habit is named with the habit ("Walk"); a count habit with
   * what the tap does ("Add 1 glass to Drink water").
   */
  label: string;
  /** Read after the name ("5 of 8 glasses", "Resting today"). */
  description?: string;
  /** The water's pastel family (default sky, ramune). */
  tone?: Tone;
  /** Diameter in px (48 is the design size; the target is never under 44). */
  size?: number;
  disabled?: boolean;
}

/**
 * The water-fill check ring, catkin's signature control (DESIGN §9.1). On check, water rises
 * inside it with a meniscus (240 ms), then a hairline check draws; unchecking drains it. Count
 * habits show the water level and "5/8". Rest shows a moon, tiny a sprout. A real button:
 * aria-pressed for one-tap habits, a plain "add" button for counts. Reduced motion fills instantly.
 */
export function CheckRing({ state, count, target, label, description, tone = 'sky', size = 48, disabled, class: cls, ...rest }: CheckRingProps) {
  const descId = `${useId()}-desc`;
  const resolved = ringState({ state, count, target });
  const level = waterLevel({ state, count, target });
  const counting = isCountHabit(target) && resolved === 'empty';
  const mark: CheckRingMark = resolved === 'done' ? 'check' : resolved === 'tiny' ? 'sprout' : resolved === 'rest' ? 'moon' : null;
  const instant = prefersReducedMotion();
  // Rising water fills quickly; falling water waits for the mark to lift, then drains.
  const prev = useRef(level);
  const flow = level < prev.current ? 'drain' : 'fill';
  prev.current = level;
  return (
    <button
      {...rest}
      type="button"
      class={cx(s.ring, instant && s.instant, cls as string)}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-label={label}
      aria-pressed={isCountHabit(target) ? undefined : resolved === 'done' || resolved === 'tiny'}
      aria-describedby={description ? descId : undefined}
      disabled={disabled}
      data-state={resolved}
      data-level={level.toFixed(3)}
      data-flow={flow}
      data-instant={instant ? '' : undefined}
    >
      <CheckRingArt level={level} mark={mark} markProgress={mark ? 1 : 0} countLabel={counting ? `${count ?? 0}/${target}` : undefined} quiet={resolved === 'rest'} tone={tone} size={size} />
      {description && (
        <span id={descId} class="sr-only">
          {description}
        </span>
      )}
    </button>
  );
}

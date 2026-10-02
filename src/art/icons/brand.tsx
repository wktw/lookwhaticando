/**
 * The Little by Little mark and wordmark (DESIGN §1). A willow sprig beside a two-line Castoro name:
 * the wider name fits small headers without shrinking its letters. The words remain real text.
 */
import type { JSX } from 'preact';
import { DAY_LIGHT, type Light, type LightFrom } from '@/art/light';
import css from './brand.module.css';

/**
 * One catkin on its own 9.2 × 18 frame (base at 0,9; tip at 0,−9): a soft oval with a scalloped,
 * fuzzy edge. Generated offline (14 bumps, bulge 0.8, taper 0.1) and committed.
 */
export const CATKIN_BODY =
  'M0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.37 5.61A1.84 1.84 0 0 1 1.82 8.11A1.26 1.26 0 0 1 0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9Z';
/** The little brown bud scale each catkin sits in. */
export const CATKIN_BRACT = 'M-2.5 7.2C-1.6 10 1.6 10 2.5 7.2C1.4 8.6 -1.4 8.6 -2.5 7.2Z';

/**
 * The twig, and the three catkins seated straight on it (pussy-willow catkins have no stalk):
 * [base x, base y, angle°], the base being where the bract meets the twig.
 */
const TWIG = 'M9.5 57C10.6 47.5 13 38.6 17.4 30C20.3 24.4 23.4 19.8 27.2 16.2';
export const SPRIG_CATKINS: readonly [number, number, number][] = [
  [10.5, 49.8, -26],
  [14.1, 37.6, 30],
  [27, 16.4, 12],
];

/**
 * Each catkin's lit side, per light direction, in the catkin's own frame (so it sits over
 * CATKIN_BODY, which shows through as the shade). Generated offline: the catkin body intersected with a
 * large disc (r 16) whose edge is the terminator, placed in sprig space so that every crescent falls on
 * the same side, away from the window (right for "left", left for "right", underneath for "top").
 * Positions match SPRIG_CATKINS; regenerate both together.
 */
export const CATKIN_LIT: Record<LightFrom, readonly [string, string, string]> = {
  left: [
    'M-3.49 6.22A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 2.71 -7.91A16 16 0 0 1 -3.49 6.22Z',
    'M3.25 7.2A1.84 1.84 0 0 1 1.82 8.11A1.26 1.26 0 0 1 0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -3.67 -5.83A16 16 0 0 1 3.25 7.2Z',
    'M0.41 9.13A1.26 1.26 0 0 1 0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2.76 -7.88A16 16 0 0 1 0.41 9.13Z',
  ],
  top: [
    'M-4.58 2.3A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.63 5.49A16 16 0 0 1 -4.58 2.3Z',
    'M-3.42 5.77A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 4.5 2.18A16 16 0 0 1 -3.42 5.77Z',
    'M-4.62 4.46A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 4.81 2.91A16 16 0 0 1 -4.62 4.46Z',
  ],
  right: [
    'M3.71 -6.4A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.37 5.61A1.84 1.84 0 0 1 1.82 8.11A1.26 1.26 0 0 1 0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -2.72 7.78A16 16 0 0 1 3.71 -6.4Z',
    'M-3.26 -7.49A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.37 5.61A16 16 0 0 1 -3.26 -7.49Z',
    'M-0.4 -9.15A1.37 1.37 0 0 1 0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.37 5.61A1.84 1.84 0 0 1 2.67 7.81A16 16 0 0 1 -0.4 -9.15Z',
  ],
};

export const SPRIG_VIEWBOX = '-3 -3.5 39 62';
/** Width ÷ height of the mark. */
export const SPRIG_ASPECT = 39 / 62;

export interface CatkinSprigProps {
  /** Height in px (the mark is 39 × 62 units, about three fifths as wide as it is tall). */
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /**
   * Windowlight. Every catkin's shade crescent sits on the side away from `from` (left, top or right); `night` switches to the lamp
   * palette (a lighter twig and warmed catkins). By default the colours follow the page theme.
   */
  light?: Light;
}

export function CatkinSprig({ size = 32, title, class: cls, style, light }: CatkinSprigProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const width = typeof size === 'number' ? `${Math.round(size * SPRIG_ASPECT * 100) / 100}px` : `calc(${size} * ${SPRIG_ASPECT})`;
  const lit = CATKIN_LIT[(light ?? DAY_LIGHT).from];
  const tone = light === undefined ? css.auto : light.night ? css.night : css.day;
  return (
    <svg
      viewBox={SPRIG_VIEWBOX}
      class={[css.sprig, tone, cls].filter(Boolean).join(' ')}
      style={{ width, height: px, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path class={css.twig} d={TWIG} fill="none" stroke-width={2.1} stroke-linecap="round" />
      {SPRIG_CATKINS.map(([x, y, a], i) => (
        <g key={a} transform={`translate(${x} ${y}) rotate(${a}) translate(0 -9)`}>
          <path class={css.shade} d={CATKIN_BODY} />
          <path class={css.lit} d={lit[i]} />
          <path class={css.bract} d={CATKIN_BRACT} />
        </g>
      ))}
    </svg>
  );
}

export interface WordmarkProps {
  /** Font size in px (the cap height of Castoro is about 0.7 of it). */
  size?: number;
  /** Lead with the sprig mark. */
  sprig?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  /** Lamplight palette for the sprig (the text always follows `color`). */
  light?: Light;
}

/** The full name in Castoro, as real text on two lines, with an optional sprig. Inherits `color`. */
export function Wordmark({ size = 32, sprig = true, class: cls, style, light }: WordmarkProps) {
  return (
    <span class={[css.wordmark, cls].filter(Boolean).join(' ')} style={{ fontSize: `${size}px`, ...style }}>
      {sprig && <CatkinSprig size="1.9em" class={css.lead} light={light} />}
      <span class={css.word}>Little <span class={css.wordTail}>by Little</span></span>
    </span>
  );
}

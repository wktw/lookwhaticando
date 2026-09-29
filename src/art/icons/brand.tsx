/**
 * The catkin mark and wordmark (DESIGN §1). The mark is a single sprig: a thin twig with three soft,
 * silver-grey catkins (willow flower spikes). The wordmark is lowercase "catkin" set in Castoro as real
 * text, with the sprig as an optional lead-in. No faces, no ears on letters.
 */
import type { JSX } from 'preact';
import { DAY_LIGHT, type Light } from '@/art/light';
import css from './brand.module.css';

/**
 * One catkin on its own 9.2 × 18 frame (base at 0,9; tip at 0,−9): a soft oval with a scalloped,
 * fuzzy edge. `LIT` is the same outline on the window side, closed by a smooth arc, so the shade
 * shows as a hard crescent where the two differ. Generated offline (14 bumps, bulge 0.8, taper 0.1)
 * and committed; never computed at runtime.
 */
export const CATKIN_BODY =
  'M0 -9A1.37 1.37 0 0 1 2 -8.11A1.85 1.85 0 0 1 3.6 -5.61A2.32 2.32 0 0 1 4.48 -2A2.5 2.5 0 0 1 4.38 2A2.34 2.34 0 0 1 3.37 5.61A1.84 1.84 0 0 1 1.82 8.11A1.26 1.26 0 0 1 0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9Z';
export const CATKIN_LIT =
  'M0 9A1.26 1.26 0 0 1 -1.82 8.11A1.84 1.84 0 0 1 -3.37 5.61A2.34 2.34 0 0 1 -4.38 2A2.5 2.5 0 0 1 -4.48 -2A2.32 2.32 0 0 1 -3.6 -5.61A1.85 1.85 0 0 1 -2 -8.11A1.37 1.37 0 0 1 0 -9A1.3 9 0 0 1 0 9Z';
/** The little brown bud scale each catkin sits in. */
export const CATKIN_BRACT = 'M-2.5 7.2C-1.6 10 1.6 10 2.5 7.2C1.4 8.6 -1.4 8.6 -2.5 7.2Z';

/** The twig, its side spur and where each catkin sits on it: [base x, base y, angle°]. */
const TWIG = 'M9.5 57C10.6 47.5 13 38.6 17.4 30C20.3 24.4 23.4 19.8 27.2 16.2';
const SPUR = 'M11.7 44.6C9.6 43.2 7.9 41.2 6.8 38.8';
const CATKINS: [number, number, number][] = [
  [6.9, 39.2, -30],
  [14.1, 37.6, 42],
  [27, 16.4, 12],
];

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
   * Windowlight. The shade crescent sits on the side away from `from`; `night` switches to the lamp
   * palette (a lighter twig and warmed catkins). By default the colours follow the page theme.
   */
  light?: Light;
}

export function CatkinSprig({ size = 32, title, class: cls, style, light }: CatkinSprigProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const width = typeof size === 'number' ? `${Math.round(size * SPRIG_ASPECT * 100) / 100}px` : `calc(${size} * ${SPRIG_ASPECT})`;
  const from = (light ?? DAY_LIGHT).from;
  // The catkin frames are drawn lit from the left; mirror each one in place when the lamp is on the right.
  const flip = from === 'right' ? ' scale(-1 1)' : '';
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
      <path class={css.twig} d={SPUR} fill="none" stroke-width={1.6} stroke-linecap="round" />
      {CATKINS.map(([x, y, a]) => (
        <g key={a} transform={`translate(${x} ${y}) rotate(${a}) translate(0 -9)${flip}`}>
          <path class={css.shade} d={CATKIN_BODY} />
          <path class={css.lit} d={CATKIN_LIT} />
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

/** Lowercase "catkin" in Castoro, as real text, with an optional sprig. Inherits `color`. */
export function Wordmark({ size = 32, sprig = true, class: cls, style, light }: WordmarkProps) {
  return (
    <span class={[css.wordmark, cls].filter(Boolean).join(' ')} style={{ fontSize: `${size}px`, ...style }}>
      {sprig && <CatkinSprig size="1.3em" class={css.lead} light={light} />}
      <span class={css.word}>catkin</span>
    </span>
  );
}

/**
 * Pins (DESIGN §9.2): every achievement is an enamel pin. A die-cut plate in the badge's colour family
 * with a thin stamped brass rim (the one "outline" a pin may have, because it is real metal) and a
 * simple emblem from the badge's meaning. The rim's darker edge sits on the side away from the window.
 * Unearned pins are outline-only: the plate as a dashed line, the emblem as a thin one, in
 * --ink-disabled, so the shelf of "not yet" pins stays quiet in both themes.
 */
import type { JSX } from 'preact';
import { BADGE_BY_ID, type BadgeDef } from '@/catalog/badges';
import { circlePath, roundRectPath, scallopPath } from '@/art/icons/shapes';
import { BADGE_EMBLEMS, type Emblem } from './emblems';
import { METAL, NOT_YET, plateEnamel } from './palette';
import css from './badge.module.css';

export type PinPlate = 'round' | 'scallop' | 'shield' | 'arch' | 'tag';

/** Die-cut plate silhouettes on the 100-unit canvas, and where each puts its emblem box. */
export const PLATES: Record<PinPlate, { d: string; emblem: string }> = {
  round: { d: circlePath(50, 50, 38), emblem: 'translate(20.3 20.3) scale(1.35)' },
  scallop: { d: scallopPath(50, 50, 35, 14, 0.8), emblem: 'translate(21.8 21.8) scale(1.28)' },
  shield: {
    d: 'M50 11.5C59 16.6 70.4 18.6 82 18V47C82 69 67.6 82.6 50 89 32.4 82.6 18 69 18 47V18c11.6.6 23-1.4 32-6.5Z',
    emblem: 'translate(22.5 20.4) scale(1.25)',
  },
  arch: {
    d: 'M22.5 89A4.5 4.5 0 0 1 18 84.5V46C18 27.8 32.3 12.5 50 12.5S82 27.8 82 46V84.5A4.5 4.5 0 0 1 77.5 89Z',
    emblem: 'translate(22.5 24.6) scale(1.25)',
  },
  /** Wide plates carry a 64 × 40 emblem box. */
  tag: { d: roundRectPath(8, 24, 84, 52, 13), emblem: 'translate(12.2 26.4) scale(1.18)' },
};

/** Which plate each pin is cut to. Anything not listed is round. */
export const PIN_PLATE: Record<string, PinPlate> = {
  'perfect-week': 'tag',
  'checkins-50': 'shield',
  'checkins-100': 'tag',
  'checkins-250': 'scallop',
  'checkins-500': 'arch',
  'checkins-1000': 'arch',
  comeback: 'shield',
  'collect-10': 'tag',
  'collect-25': 'arch',
  'collect-100': 'arch',
  'set-complete': 'tag',
  'first-bloom': 'scallop',
  'first-outfit': 'shield',
  'early-bird': 'arch',
  'wind-down': 'arch',
  'album-complete': 'shield',
  'steady-month': 'tag',
};

export const plateFor = (badgeId: string): PinPlate => PIN_PLATE[badgeId] ?? 'round';

/** For ids without art (a badge added to the catalog later): the first sprout. */
const FALLBACK: Emblem = BADGE_EMBLEMS['first-checkin']!;

/** The thickness of the stamped metal, seen on the side away from the window. */
const EDGE_OFFSET = 'translate(1.3 1.7)';

export interface BadgeMedalProps {
  badgeId: string;
  earned: boolean;
  size?: number | string;
  /** Label for a pin shown on its own (it becomes role="img"). Say "not yet" in it when unearned. */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /** Grid sizes: a slightly heavier rim and longer dashes. Defaults to on for numeric sizes up to 64 px. */
  compact?: boolean;
}

export function BadgeMedal({ badgeId, earned, size = 64, title, class: cls, style, compact }: BadgeMedalProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const small = compact ?? (typeof size === 'number' && size <= 64);
  /** Pins at 40 px and under (a dense grid, an inline list) get the heaviest "not yet" line. */
  const tiny = typeof size === 'number' && size <= 40;
  const plate = PLATES[plateFor(badgeId)];
  const color: BadgeDef['color'] = BADGE_BY_ID.get(badgeId)?.color ?? 'butter';
  const emblem = BADGE_EMBLEMS[badgeId] ?? FALLBACK;
  const rim = small ? 3.8 : 3.2;
  const classes = [css.pin, earned ? undefined : css.notYet, small ? css.small : undefined, tiny ? css.tiny : undefined, cls].filter(Boolean).join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      class={classes}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      data-earned={earned ? 'true' : 'false'}
    >
      {earned ? (
        <g stroke-linejoin="round">
          <path d={plate.d} transform={EDGE_OFFSET} fill={METAL.edge} stroke={METAL.edge} stroke-width={rim} />
          <path d={plate.d} fill={plateEnamel(color)} stroke={METAL.rim} stroke-width={rim} />
        </g>
      ) : (
        <path d={plate.d} fill="none" stroke={NOT_YET} stroke-width={tiny ? 3.6 : small ? 2.8 : 2.2} stroke-dasharray={tiny ? '8 6.5' : small ? '6.5 5' : '5 4.2'} stroke-linecap="round" />
      )}
      <g class={css.emblem} transform={plate.emblem}>
        {emblem({ earned })}
      </g>
    </svg>
  );
}

/** The same component under its catkin name. */
export const EnamelPin = BadgeMedal;
export type EnamelPinProps = BadgeMedalProps;

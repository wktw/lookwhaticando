/**
 * Badge medals: a ribbon in the badge's color family, a butter-gold pie-crust medallion and a
 * hand-drawn emblem per badge. Unearned medals are redrawn in soft lavender-grey with a little
 * heart lock (deep lavender at night), so the shelf of "not yet" badges still looks lovely.
 * Reads well from 48 to 120 px: at shelf sizes the medal switches to a compact layout.
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { BADGE_BY_ID } from '@/catalog/badges';
import { sparklePath } from '@/art/icons/shapes';
import { BADGE_EMBLEMS, type Emblem } from './emblems';
import { EW } from './emblems/kit';
import { LockTag, Medallion, Ribbon, medalLayout } from './medal';
import { EARNED, MUTED, medalColors } from './palette';
import css from './badge.module.css';

export interface BadgeMedalProps {
  badgeId: string;
  earned: boolean;
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
  /**
   * Shelf layout: a bigger emblem, bolder scallops, shorter ribbons, no decorative sparkles.
   * Defaults to on for numeric sizes up to 64 px.
   */
  compact?: boolean;
}

const FALLBACK_SPARKLE = sparklePath(20, 20, 12, 0.24);
/** For ids without art (e.g. a badge added to the catalog later): a friendly sparkle. */
const FALLBACK: Emblem = ({ p }) => <path d={FALLBACK_SPARKLE} fill={p.butter} />;

export function BadgeMedal({ badgeId, earned, size = 64, title, class: cls, style, compact }: BadgeMedalProps) {
  const uid = `bm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  const small = compact ?? (typeof size === 'number' && size <= 64);
  const layout = medalLayout(small);
  const p = earned ? EARNED : MUTED;
  const m = medalColors(BADGE_BY_ID.get(badgeId)?.color ?? 'butter', earned);
  const emblem = BADGE_EMBLEMS[badgeId] ?? FALLBACK;
  const classes = [earned ? undefined : css.locked, small ? css.compact : undefined, cls].filter(Boolean).join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      class={classes || undefined}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Ribbon m={m} ink={p.ink} layout={layout} />
      <Medallion m={m} ink={p.ink} layout={layout} />
      <g
        transform={layout.emblem}
        fill="none"
        stroke={p.ink}
        stroke-width={EW}
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {emblem({ p, uid, earned })}
      </g>
      {!earned && <LockTag ink={p.ink} layout={layout} />}
    </svg>
  );
}

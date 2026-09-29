/**
 * Badge medals: a ribbon in the badge's color family, a butter-gold pie-crust medallion and a
 * hand-drawn emblem per badge. Unearned medals are redrawn in soft lavender-grey with a little
 * heart lock, so the shelf of "not yet" badges still looks lovely. Reads well from 48 to 120 px.
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { BADGE_BY_ID } from '@/catalog/badges';
import { BADGE_EMBLEMS, type Emblem } from './emblems';
import { EW, Spark } from './emblems/kit';
import { EMBLEM_TRANSFORM, LockTag, Medallion, Ribbon } from './medal';
import { EARNED, MUTED, medalColors } from './palette';
import css from './badge.module.css';

export interface BadgeMedalProps {
  badgeId: string;
  earned: boolean;
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** For ids without art (e.g. a badge added to the catalog later): a friendly sparkle. */
const FALLBACK: Emblem = ({ p }) => <Spark x={20} y={20} r={12} fill={p.butter} />;

export function BadgeMedal({ badgeId, earned, size = 64, title, class: cls, style }: BadgeMedalProps) {
  const uid = `bm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  const p = earned ? EARNED : MUTED;
  const m = medalColors(BADGE_BY_ID.get(badgeId)?.color ?? 'butter', earned);
  const emblem = BADGE_EMBLEMS[badgeId] ?? FALLBACK;
  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      class={earned ? cls : [css.locked, cls].filter(Boolean).join(' ')}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Ribbon m={m} ink={p.ink} />
      <Medallion m={m} ink={p.ink} />
      <g
        transform={EMBLEM_TRANSFORM}
        fill="none"
        stroke={p.ink}
        stroke-width={EW}
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {emblem({ p, uid, earned })}
      </g>
      {!earned && <LockTag ink={p.ink} />}
    </svg>
  );
}

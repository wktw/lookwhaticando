/**
 * Currency tokens on a 32-unit canvas (DESIGN §6, §10.2), used inline in text at 14–20 px and larger
 * in the wallet. Each is a real object, flat and matte, lit from the window (upper left):
 *  - Coin: a brass coin with a pressed rim and a tiny sprig stamp.
 *  - Stamp: a loyalty-card stamp, a round inked impression in lavender.
 *  - Swap: a ring of 10 segments that fills as swaps collect (10 swaps make a stamp).
 *  - Ticket: a paper stub with a perforated edge.
 */
import type { ComponentChildren, JSX } from 'preact';
import { FAMILY, MATERIAL, mix } from './palette';
import { circlePath, ringSegmentPath } from './shapes';

export interface CurrencyIconProps {
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export interface SwapIconProps extends CurrencyIconProps {
  /** Filled segments, 0–10 (swaps toward the next stamp). Defaults to 6. */
  count?: number;
}

export interface StardustIconProps extends CurrencyIconProps {
  /** The old API: how full the ring is, 0..1 (swaps / 10). Rounds to whole segments. */
  level?: number;
}

/** Tokens sit in running text by default ("+5 {coin}"); flex and grid parents blockify them anyway. */
const INLINE: JSX.CSSProperties = { display: 'inline-block', verticalAlign: '-0.2em' };

function CurrencySvg({ size = 20, title, class: cls, style, children }: CurrencyIconProps & { children: ComponentChildren }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      class={cls}
      style={{ ...INLINE, ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ---------- Coin ---------- */

/** The coin's shade: the disc minus itself nudged toward the window (computed offline, committed). */
const COIN_SHADE = 'M6.81 25.2A13 13 0 1 0 23.09 5.1A13 13 0 0 1 6.81 25.2Z';
const COIN_RIM = `${circlePath(16, 16, 10.4)}${circlePath(16, 16, 9.2)}`;
/** A tiny catkin sprig pressed into the face. */
const COIN_SPRIG = 'M13.4 23.2c.8-3.8 2.2-7 4.8-9.8M14.6 18.2c-1-.5-1.8-1.3-2.3-2.4';
const COIN_CATKINS: [number, number, number][] = [
  [11.7, 14.4, -24],
  [17.2, 16.6, 50],
  [19.3, 11, 22],
];

/** A brass coin with a pressed rim and a tiny sprig stamp. */
export function CoinIcon(props: CurrencyIconProps) {
  return (
    <CurrencySvg {...props}>
      <circle cx={16} cy={16} r={13} fill={MATERIAL.brass} />
      <path d={COIN_SHADE} fill={MATERIAL.brassShade} />
      <path d={COIN_RIM} fill={MATERIAL.brassDeep} fill-rule="evenodd" />
      <g fill={MATERIAL.brassDeep}>
        <path d={COIN_SPRIG} fill="none" stroke={MATERIAL.brassDeep} stroke-width={1.3} stroke-linecap="round" />
        {COIN_CATKINS.map(([x, y, a]) => (
          <ellipse key={a} cx={x} cy={y} rx={1.5} ry={2.7} transform={`rotate(${a} ${x} ${y})`} />
        ))}
      </g>
    </CurrencySvg>
  );
}

/* ---------- Stamp ---------- */

/** Stamp ink: lavender, deep enough to read at 14 px on paper and on the night card. */
export const STAMP_INK = mix(FAMILY.lavender[500], FAMILY.lavender[700], 0.3);
const STAMP_PAPER = '#F3EFFA';
const STAMP_SHADE = 'M7.04 25.14A12.8 12.8 0 1 0 23.26 5.46A12.8 12.8 0 0 1 7.04 25.14Z';
const STAMP_RING = `${circlePath(16, 16, 10.3)}${circlePath(16, 16, 9.1)}`;

/** A loyalty-card stamp: a round inked impression in lavender with a check pressed out of it. */
export function StampIcon(props: CurrencyIconProps) {
  return (
    <CurrencySvg {...props}>
      <g transform="rotate(-10 16 16)">
        <circle cx={16} cy={16} r={12.8} fill={STAMP_INK} />
        <path d={STAMP_SHADE} fill={mix(STAMP_INK, '#5A4870', 0.14)} />
        <path d={STAMP_RING} fill={STAMP_PAPER} fill-rule="evenodd" />
        <path d="M11.2 16.4l3.3 3.3 6.4-6.8" fill="none" stroke={STAMP_PAPER} stroke-width={2.3} stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </CurrencySvg>
  );
}

/* ---------- Swap ---------- */

/** Empty segments follow the theme (a pale lavender by day, a dusky one at night). */
const SWAP_EMPTY = 'var(--lavender-300, #DDD4F1)';
/** Ten ring segments, clockwise from the top, with a small gap between each. */
export const SWAP_SEGMENTS = Array.from({ length: 10 }, (_, i) => ringSegmentPath(16, 16, 8.6, 13.4, i * 36 + 3.2, (i + 1) * 36 - 3.2));

/** The swap ring: 10 segments, `count` of them filled. */
export function SwapIcon({ count = 6, ...props }: SwapIconProps) {
  const filled = Math.max(0, Math.min(10, Math.round(count)));
  return (
    <CurrencySvg {...props}>
      {SWAP_SEGMENTS.map((d, i) => (
        <path key={i} d={d} fill={i < filled ? STAMP_INK : SWAP_EMPTY} />
      ))}
    </CurrencySvg>
  );
}

/* ---------- Ticket ---------- */

const TICKET_PAPER = FAMILY.blush[500];
const TICKET_STUB = mix(FAMILY.blush[500], '#5A4870', 0.1);
const TICKET_PRINT = FAMILY.blush[700];
/** The ticket with its side notches and the perforation holes punched through (even-odd). */
const TICKET =
  'M5.2 8h21.6A2.2 2.2 0 0 1 29 10.2v3.4a2.4 2.4 0 0 0 0 4.8v3.4a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 21.8v-3.4a2.4 2.4 0 0 0 0-4.8v-3.4A2.2 2.2 0 0 1 5.2 8z' +
  [10.6, 14.2, 17.8, 21.4].map((y) => circlePath(22, y, 0.75)).join('');
/** The tear-off stub beyond the perforation. */
const STUB = 'M22.9 8h3.9A2.2 2.2 0 0 1 29 10.2v3.4a2.4 2.4 0 0 0 0 4.8v3.4a2.2 2.2 0 0 1-2.2 2.2h-3.9z';

/** A paper ticket stub with a perforated edge, printed in deep blush. */
export function TicketIcon(props: CurrencyIconProps) {
  return (
    <CurrencySvg {...props}>
      <g transform="rotate(-8 16 16)">
        <path d={TICKET} fill={TICKET_PAPER} fill-rule="evenodd" />
        <path d={STUB} fill={TICKET_STUB} />
        <g fill={TICKET_PRINT}>
          <rect x={6.6} y={11.6} width={11.6} height={2.4} rx={1.2} />
          <rect x={6.6} y={16.4} width={7.4} height={2.4} rx={1.2} />
          <circle cx={25.6} cy={16} r={1.5} />
        </g>
      </g>
    </CurrencySvg>
  );
}

/** Old names from the Mochi economy: stars became stamps, stardust became swaps. */
export const StarIcon = StampIcon;

export function StardustIcon({ level = 0.6, ...props }: StardustIconProps) {
  return <SwapIcon count={level * 10} {...props} />;
}

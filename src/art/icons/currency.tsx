/**
 * Currency art on a 32-unit canvas. Colors are fixed (these are objects, not UI glyphs) and
 * drawn in the illustration style: cocoa outline, pastel fills, one soft top-left highlight.
 * Legible at 16 px, lovely at 48 px.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useId } from 'preact/hooks';
import { ACCENT, COCOA, PASTEL } from './palette';
import { heartPath, sparklePath, starPath } from './shapes';

export interface CurrencyIconProps {
  size?: number | string;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export interface StardustIconProps extends CurrencyIconProps {
  /** How full the jar is, 0..1 (e.g. stardust / 10). Defaults to a cheerful 0.7. */
  level?: number;
}

const OUTLINE = { stroke: COCOA, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } as const;

function CurrencySvg({ size = 20, title, class: cls, style, children }: CurrencyIconProps & { children: ComponentChildren }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      class={cls}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Gold coin with a thick rim, an embossed paw print and a glint. */
export function CoinIcon(props: CurrencyIconProps) {
  return (
    <CurrencySvg {...props}>
      <g {...OUTLINE}>
        <circle cx={16} cy={17.4} r={12.6} fill={ACCENT.goldDeep} />
        <circle cx={16} cy={15.4} r={12.6} fill={ACCENT.gold} />
      </g>
      <circle cx={16} cy={15.4} r={9.2} fill={ACCENT.star} stroke={ACCENT.goldDeep} stroke-width={1.5} />
      <g fill={ACCENT.goldDeep}>
        <path d="M16 14.6c2.3 0 4 2 4 3.7 0 1.5-1.4 2-4 2s-4-.5-4-2c0-1.7 1.7-3.7 4-3.7z" />
        <ellipse cx={11.7} cy={13.9} rx={1.4} ry={1.7} transform="rotate(-22 11.7 13.9)" />
        <ellipse cx={14.4} cy={11.4} rx={1.4} ry={1.8} transform="rotate(-8 14.4 11.4)" />
        <ellipse cx={17.6} cy={11.4} rx={1.4} ry={1.8} transform="rotate(8 17.6 11.4)" />
        <ellipse cx={20.3} cy={13.9} rx={1.4} ry={1.7} transform="rotate(22 20.3 13.9)" />
      </g>
      <path d="M6.6 12.3a10.4 10.4 0 0 1 5.2-5.6" fill="none" stroke="#fff" stroke-width={1.9} stroke-linecap="round" opacity={0.8} />
    </CurrencySvg>
  );
}

const STAR = starPath(16, 17, 13.8, 7.6, 5, 0.3);
const STAR_INNER = starPath(16, 17.4, 8.4, 4.6, 5, 0.3);

/** Plump, rounded butter star with a soft inner glow and a highlight. */
export function StarIcon(props: CurrencyIconProps) {
  return (
    <CurrencySvg {...props}>
      <path d={STAR} fill={ACCENT.star} {...OUTLINE} />
      <path d={STAR_INNER} fill={PASTEL.butter[300]} />
      <ellipse cx={11.6} cy={12.9} rx={2.2} ry={1.3} transform="rotate(-38 11.6 12.9)" fill="#fff" opacity={0.85} />
    </CurrencySvg>
  );
}

const JAR =
  'M11.5 8.2h9v1.3c3.3 1.3 5.5 4.3 5.5 8.1v6.6a4.3 4.3 0 0 1-4.3 4.3H10.3A4.3 4.3 0 0 1 6 24.2v-6.6c0-3.8 2.2-6.8 5.5-8.1z';
/** The dust rises from the jar floor (y 28.2) to just below the neck (y 12). */
const JAR_FLOOR = 28.2;
const JAR_SPAN = 16.2;
/** Sparkles suspended in the dust; each shows only once the dust rises past it. */
const DUST_SPARKLES = [
  { y: 22.8, d: sparklePath(12.2, 22.8, 2.6), fill: '#fff' },
  { y: 25.2, d: sparklePath(19.6, 25.2, 2), fill: ACCENT.goldLight },
  { y: 17.6, d: sparklePath(18.8, 17.6, 2.2), fill: '#fff' },
  { y: 15.4, d: sparklePath(12.6, 15.4, 1.7), fill: ACCENT.goldLight },
];
const FLOATING = sparklePath(26.4, 5.6, 3, 0.22);

/** A little jar of lavender stardust. `level` visibly fills it. */
export function StardustIcon({ level = 0.7, ...props }: StardustIconProps) {
  const uid = `sd${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const top = JAR_FLOOR - Math.min(1, Math.max(0, level)) * JAR_SPAN;
  return (
    <CurrencySvg {...props}>
      <defs>
        <clipPath id={`${uid}-jar`}>
          <path d={JAR} />
        </clipPath>
      </defs>
      <path d={JAR} fill={PASTEL.lavender[100]} />
      <g clip-path={`url(#${uid}-jar)`}>
        {level > 0 && (
          <g>
            <path d={`M0 ${top + 0.8}Q8 ${top - 1} 16 ${top + 0.4}T32 ${top}V32H0z`} fill={PASTEL.lavender[300]} />
            <path d={`M0 ${top + 0.8}Q8 ${top - 1} 16 ${top + 0.4}T32 ${top}`} fill="none" stroke={PASTEL.lavender[500]} stroke-width={1.2} />
            {DUST_SPARKLES.filter((sp) => sp.y > top + 1.5).map((sp) => (
              <path key={sp.d} d={sp.d} fill={sp.fill} />
            ))}
          </g>
        )}
        <ellipse cx={16} cy={31} rx={12} ry={3.4} fill={COCOA} opacity={0.08} />
      </g>
      <path d={JAR} fill="none" {...OUTLINE} />
      <path d="M9.1 17.2v5.6" stroke="#fff" stroke-width={1.8} stroke-linecap="round" opacity={0.9} />
      <rect x={10.4} y={3.2} width={11.2} height={5.4} rx={1.8} fill={ACCENT.wood} {...OUTLINE} />
      <path d="M13 5.3h4" stroke="#fff" stroke-width={1.3} stroke-linecap="round" opacity={0.6} />
      <path d={FLOATING} fill={ACCENT.star} stroke={COCOA} stroke-width={1.1} stroke-linejoin="round" />
    </CurrencySvg>
  );
}

const TICKET =
  'M5.5 9h21A2.5 2.5 0 0 1 29 11.5v2.1a2.4 2.4 0 0 0 0 4.8v2.1a2.5 2.5 0 0 1-2.5 2.5h-21A2.5 2.5 0 0 1 3 20.5v-2.1a2.4 2.4 0 0 0 0-4.8v-2.1A2.5 2.5 0 0 1 5.5 9z';
const TICKET_SPARKLE = sparklePath(19.2, 11.4, 1.7, 0.24);
const CAPSULE_HEART = heartPath(12.4, 13.4, 3.4);

/** Pink capsule ticket, tilted, with a perforated stub and a tiny capsule print. */
export function TicketIcon(props: CurrencyIconProps) {
  const uid = `tk${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <CurrencySvg {...props}>
      <defs>
        <clipPath id={`${uid}-t`}>
          <path d={TICKET} />
        </clipPath>
      </defs>
      <g transform="rotate(-12 16 16)">
        <path d={TICKET} fill={PASTEL.blush[300]} />
        <rect x={22} y={8} width={8} height={16} fill="#FBA8BF" clip-path={`url(#${uid}-t)`} />
        <path d={TICKET} fill="none" {...OUTLINE} />
        <path d="M22 10.8v10.4" stroke={COCOA} stroke-width={1.4} stroke-dasharray="1.4 1.9" stroke-linecap="round" opacity={0.6} />
        <path d="M6.6 11.6h4.2" stroke="#fff" stroke-width={1.5} stroke-linecap="round" opacity={0.85} />
        {/* A tiny capsule toy: clear dome with a heart inside, a lip band, pink base. */}
        <g stroke={COCOA} stroke-width={1.3} stroke-linejoin="round">
          <path d="M8.6 15.4a3.8 4.4 0 0 1 7.6 0z" fill="#fff" />
          <path d={CAPSULE_HEART} fill={PASTEL.blush[500]} stroke="none" />
          <path d="M8.6 16.6a3.8 4.4 0 0 0 7.6 0z" fill={PASTEL.blush[500]} />
          <rect x={7.9} y={15.1} width={9} height={1.8} rx={0.9} fill={PASTEL.blush[500]} />
        </g>
        <path d={TICKET_SPARKLE} fill="#fff" />
      </g>
    </CurrencySvg>
  );
}

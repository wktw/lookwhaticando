import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import type { Rarity } from '@/catalog/types';
import { OUTLINE } from './geometry';
import { shade, tint } from './color';
import './capsule.css';

/**
 * Capsule shells (DESIGN §9.3 step 3): the shell hints at rarity before it opens.
 *   common   solid pastel halves
 *   uncommon two-tone halves with a sheen stripe
 *   rare     soft glowing aura with two orbiting sparkles, golden seam
 *   ultra    holographic rainbow shimmer and a gentle wobble (the series Secret)
 * Drawn on a 100×100 canvas centered on the origin (radius 40), so it can be placed inside
 * another SVG with a translate/scale, or stand alone via <CapsuleArt>.
 */

export type CapsuleState = 'closed' | 'open';

export interface CapsuleShellProps {
  rarity: Rarity;
  /** Top-half color (a machine capsule tint). */
  color: string;
  /** Bottom-half color for two-tone shells (uncommon). */
  color2?: string;
  state?: CapsuleState;
  /** 0–3 cracks (ultra capsules take three taps). */
  cracks?: number;
  /** Idle rarity effects: sheen sweep, glow pulse, orbiting sparkles, holo shimmer, wobble. */
  animated?: boolean;
  /** Outline width in canvas units (thicker when the shell is drawn small). */
  stroke?: number;
  class?: string;
}

const R = 40;
const TOP_HALF = `M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z`;
const BOTTOM_HALF = `M${-R} 0 A${R} ${R} 0 0 0 ${R} 0 Z`;
export const SPARKLE_PATH = 'M0 -5 C0.7 -1.3 1.3 -0.7 5 0 C1.3 0.7 0.7 1.3 0 5 C-0.7 1.3 -1.3 0.7 -5 0 C-1.3 -0.7 -0.7 -1.3 0 -5 Z';
export const HOLO_STOPS = ['#FFB3C7', '#FFE593', '#B3E6D6', '#BBDCF6', '#D6C8F8'];

/** Eggshell cracks, one set per tap: each starts at the seam or rim and branches. */
const CRACKS = [
  'M-5 -3 L-8 -9 L-3 -13.5 L-7 -19 L-4 -24 M-3 -13.5 L2.5 -16',
  'M16 -3 L12.5 -8.5 L18 -12.5 L15 -18.5 L20 -24 M18 -12.5 L24.5 -13 M-4 -24 L-9 -30.5 L-6 -35',
  'M-24 -3 L-20.5 -9.5 L-26 -14 L-22.5 -20 M-20.5 -9.5 L-14 -11 M5 -39 L2.5 -33 L7 -28.5 L4 -23',
];

export function CapsuleShell({ rarity, color, color2, state = 'closed', cracks = 0, animated, stroke = 2.4, class: cls }: CapsuleShellProps) {
  const uid = `cap${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const holo = rarity === 'ultra';
  const top = holo ? `url(#${uid}-holo)` : color;
  const bottom = holo ? `url(#${uid}-holo)` : rarity === 'uncommon' ? (color2 ?? tint(color, 0.5)) : tint(color, 0.62);
  const seam = rarity === 'rare' ? '#FFD65C' : holo ? '#FFF7D9' : shade(color, 0.12);
  const classes = ['capsule', `capsule-${rarity}`, animated ? 'is-animated' : '', state === 'open' ? 'is-open' : '', cls ?? ''].filter(Boolean).join(' ');

  return (
    <g class={classes}>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <circle r={R} />
        </clipPath>
        {rarity === 'rare' && (
          <radialGradient id={`${uid}-aura`}>
            <stop offset="0.45" stop-color="#FFF4C2" stop-opacity="0.95" />
            <stop offset="0.7" stop-color="#D6C8F8" stop-opacity="0.6" />
            <stop offset="1" stop-color="#D6C8F8" stop-opacity="0" />
          </radialGradient>
        )}
        {holo && (
          <>
            <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="1" y2="0.35" gradientUnits="objectBoundingBox" spreadMethod="reflect">
              {HOLO_STOPS.map((c, i) => (
                <stop key={c} offset={i / (HOLO_STOPS.length - 1)} stop-color={c} />
              ))}
            </linearGradient>
            <radialGradient id={`${uid}-halo`}>
              <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.9" />
              <stop offset="0.72" stop-color="#FFD9E4" stop-opacity="0.55" />
              <stop offset="1" stop-color="#BBDCF6" stop-opacity="0" />
            </radialGradient>
          </>
        )}
      </defs>

      {rarity === 'rare' && <circle class="capsule-aura" r={R * 1.55} fill={`url(#${uid}-aura)`} />}
      {holo && <circle class="capsule-aura" r={R * 1.5} fill={`url(#${uid}-halo)`} />}

      <g class="capsule-body">
        <g class="capsule-bottom">
          <path d={BOTTOM_HALF} fill={bottom} />
          <ellipse class="capsule-inside" cx={0} cy={0} rx={R - 3} ry={8} fill="#FFFDF8" stroke={OUTLINE} stroke-width={stroke * 0.7} />
          <path d={BOTTOM_HALF} fill="none" stroke={OUTLINE} stroke-width={stroke} stroke-linejoin="round" />
          <path
            d={`M${-R * 0.72} ${R * 0.5} Q0 ${R * 1.02} ${R * 0.72} ${R * 0.5}`}
            fill="none"
            stroke={OUTLINE}
            stroke-width={5}
            opacity={0.07}
            stroke-linecap="round"
          />
        </g>

        <g class="capsule-top">
          <path d={TOP_HALF} fill={top} />
          <g clip-path={`url(#${uid}-clip)`}>
            {holo && <HoloShimmer />}
            {rarity === 'uncommon' && (
              <g class="capsule-sheen">
                <rect x={-16} y={-60} width={11} height={120} fill="#fff" opacity={0.55} transform="rotate(24)" />
                <rect x={-1} y={-60} width={4} height={120} fill="#fff" opacity={0.45} transform="rotate(24)" />
              </g>
            )}
          </g>
          <ellipse class="capsule-inside" cx={0} cy={0} rx={R - 3} ry={8} fill={shade(holo ? '#FFE9EF' : color, 0.18)} />
          <path d={TOP_HALF} fill="none" stroke={OUTLINE} stroke-width={stroke} stroke-linejoin="round" />
          <ellipse cx={-17} cy={-23} rx={10} ry={5.6} transform="rotate(-38 -17 -23)" fill="#fff" opacity={0.8} />
          <circle cx={-4} cy={-31} r={2.6} fill="#fff" opacity={0.85} />
          {cracks > 0 && <Cracks level={cracks} stroke={stroke} />}
          {/* the top half's lip overlaps the bottom half */}
          <rect class="capsule-seam" x={-R - 1.5} y={-3.4} width={2 * R + 3} height={6.8} rx={3.4} fill={seam} stroke={OUTLINE} stroke-width={stroke * 0.85} />
        </g>
      </g>

      {rarity === 'rare' && (
        <g class="capsule-orbit" fill="#FFE593" stroke="#fff" stroke-width={0.9}>
          <path d={SPARKLE_PATH} transform={`translate(0 ${-R - 13}) scale(1.5)`} />
          <path d={SPARKLE_PATH} transform={`translate(0 ${R + 13}) scale(1.1)`} />
        </g>
      )}
    </g>
  );
}

/** A wide band of rainbow sliding under the clip: transform-only, so it is cheap to animate. */
function HoloShimmer() {
  return (
    <g class="capsule-holo-band">
      {[-2, -1, 0, 1, 2].map((i) => (
        <rect key={i} x={-20 + i * 26} y={-60} width={9} height={120} fill="#fff" opacity={i === 0 ? 0.5 : 0.28} transform="rotate(28)" />
      ))}
    </g>
  );
}

function Cracks({ level, stroke }: { level: number; stroke: number }) {
  const paths = CRACKS.slice(0, Math.min(3, level));
  return (
    <g class="capsule-cracks" fill="none" stroke-linecap="round" stroke-linejoin="round">
      {level >= 3 && paths.map((d) => <path key={`g${d}`} d={d} stroke="#FFFBEA" stroke-width={stroke * 2.4} />)}
      {paths.map((d) => (
        <path key={d} d={d} stroke={OUTLINE} stroke-width={stroke * 0.7} />
      ))}
    </g>
  );
}

export interface CapsuleArtProps extends CapsuleShellProps {
  size?: number | string;
  title?: string;
  style?: JSX.CSSProperties;
  svgClass?: string;
}

/** Standalone capsule (reveal overlay, gallery). */
export function CapsuleArt({ size = 120, title, style, svgClass, ...shell }: CapsuleArtProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      class={['capsule-art', svgClass].filter(Boolean).join(' ')}
      viewBox="-50 -50 100 100"
      width={px}
      height={px}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <CapsuleShell {...shell} />
    </svg>
  );
}

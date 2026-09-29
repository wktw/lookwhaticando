import type { JSX } from 'preact';
import type { MachineId, Rarity } from '@/catalog/types';
import { DAY_LIGHT, type Light } from '@/art/light';
import { lowerMoon } from './crescent';
import { mix, richer } from './color';
import { LAMP, lighting, type Lighting } from './lighting';
import { MOTIFS, MOTIF_ACCENT } from './labels';
import { BRASS } from './theme';
import './capsule.css';

/**
 * The capsule, close up (DESIGN §7.2): one clear half and one tinted half. Through the clear
 * one you see the figure's silhouette standing on its folded paper insert (or, for a Secret,
 * the insert alone). The shell carries its tier's static print
 * finish, which survives reduced motion:
 *   classic  a matte tinted half
 *   special  a two-colour tinted half
 *   rare     a foil band at the seam, and a foil-edged insert
 *   super    gold foil on pearl, and a holographic insert
 *   secret   pearl with a blind-embossed "?", and a holographic band
 * Drawn on a 100×100 canvas centred on the origin (radius 40). The top half turns with a twist
 * (the `--twist` custom property) and lifts away when the capsule opens.
 */

export type CapsuleFinish = 'classic' | 'special' | 'rare' | 'super' | 'secret';

export function finishOf(rarity: Rarity, secret = false): CapsuleFinish {
  if (secret) return 'secret';
  return rarity === 'common' ? 'classic' : rarity === 'uncommon' ? 'special' : rarity === 'rare' ? 'rare' : 'super';
}

/** Holographic foil as static printed bands (a gradient only ever means light). */
export const HOLO_BANDS = ['#F5CDD6', '#F6E6B4', '#CDE6DA', '#D2E4F2', '#DDD4F1'] as const;
export const PEARL = '#F4EEF1';
/** Clear plastic: a cool, barely-there tint, so the clear half reads on white paper too. */
export const CLEAR = { fill: '#E3EBF1', rim: '#D3DEE7' } as const;
export const FOIL = { base: BRASS.base, light: BRASS.light, deep: BRASS.deep } as const;

/** closed · parting (a still frame of the halves coming apart) · open (plays the opening, then gives way). */
export type CapsuleState = 'closed' | 'parting' | 'open';

export interface CapsuleShellProps {
  finish: CapsuleFinish;
  /** The tinted half. */
  color: string;
  /** The second print colour of a special finish. */
  color2?: string;
  /** Prints this series' motif on the insert inside. */
  machineId?: MachineId;
  state?: CapsuleState;
  /** 0–3: how far a Secret's seam has cracked open, one step per tap. */
  cracks?: number;
  /**
   * The figure inside, seen through the clear half: art on a 0–100 canvas, feet at about y = 94
   * (a `CollectibleArt`). It prints as a flat silhouette in `figureInk`, standing on the insert.
   */
  figure?: JSX.Element;
  /** The silhouette's ink (the series ink); graphite by default. */
  figureInk?: string;
  light?: Light;
  class?: string;
}

const R = 40;
const TOP = `M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z`;
const BOTTOM = `M${-R} 0 A${R} ${R} 0 0 0 ${R} 0 Z`;
/** The right half of the bottom (the second colour of a two-colour print). */
const BOTTOM_RIGHT = `M0 0 H${R} A${R} ${R} 0 0 1 0 ${R} Z`;

/** A strip of the bottom half from the seam down to `depth`. */
function seamBand(from: number, depth: number): string {
  const x0 = Math.sqrt(R * R - from * from);
  const x1 = Math.sqrt(R * R - depth * depth);
  return `M${-x0} ${from} H${x0} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${depth} H${(-x1).toFixed(2)} A${R} ${R} 0 0 1 ${-x0} ${from} Z`;
}

const SEAM_FOIL = seamBand(1.8, 6.4);
/** Ten stripes of holographic print across the seam, inside the rim. */
const HOLO_EDGE = Math.sqrt(R * R - 7.4 * 7.4);
const HOLO_STRIPES = Array.from({ length: 10 }, (_, i) => {
  const w = (2 * HOLO_EDGE) / 10;
  const x = -HOLO_EDGE + i * w;
  return { d: `M${x.toFixed(2)} 1.6 H${(x + w + 0.05).toFixed(2)} V7.4 H${x.toFixed(2)} Z`, colour: HOLO_BANDS[i % HOLO_BANDS.length]! };
});

const f = (n: number) => n.toFixed(2);

/** The shell parts, for embedding in another drawing. */
/** The figure's canvas inside the shell: 42 units square, feet on the insert just above the seam. */
const FIGURE = { size: 42, x: -21, y: -42 } as const;

/** The lit-side highlight on the clear dome: a thin arc along its edge. */
function domeHighlight(toward: readonly [number, number]): { rim: string } {
  const lit = toward[0] < 0 ? -1 : toward[0] > 0 ? 1 : 0;
  // Angles on screen (y down): the upper-left quarter for light from the left, mirrored for the right,
  // the crown for light from above.
  const [a0, a1] = lit < 0 ? [186, 256] : lit > 0 ? [284, 354] : [236, 304];
  const pt = (deg: number, r: number) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r] as const;
  const arc = (from: number, to: number, r: number) => {
    const [x0, y0] = pt(from, r);
    const [x1, y1] = pt(to, r);
    return `M${f(x0)} ${f(y0)} A${r} ${r} 0 0 1 ${f(x1)} ${f(y1)}`;
  };
  return { rim: arc(a0, a1, R - 0.7) };
}

export function CapsuleShell({
  finish,
  color,
  color2,
  machineId,
  state = 'closed',
  cracks = 0,
  light = DAY_LIGHT,
  figure,
  figureInk = '#3B3236',
  class: cls,
}: CapsuleShellProps) {
  const L = lighting(light);
  const night = L.light.night;
  const tint = richer(color);
  const pearl = finish === 'super' || finish === 'secret';
  const base = pearl ? L.lit(PEARL) : L.tint(tint);
  const seam = pearl ? L.lit(mix(PEARL, '#FFFFFF', 0.4)) : L.tint(mix(tint, '#FFFFFF', 0.4));
  // Clear plastic at night keeps most of its body and catches the lamp, rather than going grey.
  const clearRim = night ? mix(CLEAR.rim, LAMP, 0.2) : CLEAR.rim;
  const hi = domeHighlight(L.toward);
  const lift = Math.min(3, cracks);
  const classes = ['capsule', `capsule-${finish}`, state !== 'closed' ? `is-${state}` : '', cls ?? ''].filter(Boolean).join(' ');
  return (
    <g class={classes}>
      <ellipse class="cap-contact" cx={2} cy={R + 3} rx={30} ry={3.6} style={{ fill: L.contact }} />
      <g class="cap-bottom">
        <path d={BOTTOM} fill={base} />
        {finish === 'special' && <path d={BOTTOM_RIGHT} fill={L.tint(richer(color2 ?? mix(color, '#FFFFFF', 0.4)))} />}
        {(finish === 'rare' || finish === 'super') && (
          <>
            <path d={SEAM_FOIL} fill={L.lit(FOIL.base)} />
            <path d={seamBand(1.8, 3)} fill={L.lit(FOIL.light)} />
          </>
        )}
        {finish === 'secret' && (
          <g>
            {HOLO_STRIPES.map((st) => (
              <path key={st.d} d={st.d} fill={L.lit(st.colour)} />
            ))}
            <Embossed L={L} />
          </g>
        )}
        <rect x={-R - 0.6} y={-1.8} width={2 * R + 1.2} height={3.6} rx={1.8} fill={seam} />
      </g>

      <g class="cap-inside">
        {figure ? <FlatInsert finish={finish} L={L} /> : <Insert finish={finish} machineId={machineId} L={L} />}
        {figure && (
          <g
            class="cap-figure"
            opacity={night ? 0.75 : 0.45}
            // By day a shadow of the series ink; at night the figure catches the lamp through the plastic.
            style={{ '--cap-figure-ink': night ? mix(figureInk, LAMP, 0.55) : figureInk } as JSX.CSSProperties}
            transform={`translate(${FIGURE.x} ${FIGURE.y}) scale(${FIGURE.size / 100})`}
          >
            {figure}
          </g>
        )}
      </g>

      <g class="cap-top" transform={lift ? `translate(0 ${-lift * 1.3}) rotate(${-lift * 1.6})` : undefined}>
        {/* At night the clear plastic is nearly invisible against the room, faintly warmed by the lamp. */}
        <path d={TOP} fill={night ? LAMP : CLEAR.fill} opacity={night ? 0.16 : 0.5} />
        {/* No rim all round (that would read as an outline): a thin highlight on the lit side only. */}
        <path d={hi.rim} fill="none" stroke="#FFFFFF" stroke-width={0.9} stroke-opacity={night ? 0.4 : 0.7} />
        <rect x={-R - 0.6} y={-3.6} width={2 * R + 1.2} height={2.4} rx={1.2} fill={clearRim} />
      </g>

      {cracks > 0 && <rect class="cap-crack" x={-R + 2} y={-0.9 - lift * 0.9} width={2 * R - 4} height={1.8 + lift * 1.6} rx={1} fill={L.lit('#FFF3D2')} />}
      <path class="cap-shade" d={lowerMoon(R, L.side, 9, 1.8)} style={{ fill: L.shade }} />
      <Glint L={L} />
    </g>
  );
}

/** The paper insert, folded in two and tucked in the capsule, printed with the series motif. */
function Insert({ finish, machineId, L }: { finish: CapsuleFinish; machineId?: MachineId; L: Lighting }) {
  const paper = L.lit('#FFFBF2');
  const back = L.lit('#EFE7DA');
  const Motif = machineId ? MOTIFS[machineId] : null;
  const edge = finish === 'rare' ? L.lit(FOIL.base) : null;
  const holo = finish === 'super' || finish === 'secret';
  const fold = L.lit('#F1E8DA');
  return (
    <g>
      {/* The back leaf of the fold, then the front leaf, creased down the middle. */}
      <path d="M-17 -2 L-13 -32 L15 -32 L21 -2 Z" fill={back} />
      <path d="M-25 -2 L-21 -27 L0 -29 L0 -2 Z" fill={paper} />
      <path d="M0 -2 L0 -29 L21 -27 L25 -2 Z" fill={fold} />
      {edge && <path d="M-25 -2 L-21 -27 L0 -29 L21 -27 L25 -2 Z M-22.4 -4 L-18.9 -24.9 L0 -26.7 L18.9 -24.9 L22.4 -4 Z" fill={edge} fill-rule="evenodd" />}
      {holo && (
        <g>
          {HOLO_BANDS.map((c, i) => (
            <path key={c} d={`M${-20.6 + i * 8.2} ${-26.6 + i * 0.4} H${-12.4 + i * 8.2} V${-23.4 + i * 0.3} H${-20.9 + i * 8.2} Z`} fill={L.lit(c)} />
          ))}
        </g>
      )}
      {Motif && machineId && (
        <g transform="translate(-19.5 -24) scale(0.62)">
          <Motif ink={L.lit('#6F6065')} accent={L.lit(MOTIF_ACCENT[machineId])} paper={paper} />
        </g>
      )}
    </g>
  );
}

/**
 * The insert as the figure's floor: the paper folded in two and laid flat at the seam, seen a
 * little from above, with its tier's edge (foil for Rare, a holographic strip for Super rare).
 */
function FlatInsert({ finish, L }: { finish: CapsuleFinish; L: Lighting }) {
  const far = L.lit('#EFE7DA');
  const near = L.lit('#FFFBF2');
  return (
    <g>
      <path d="M-24 -2.2 L-19.5 -9.4 H19.5 L24 -2.2 Z" fill={near} />
      <path d="M-21.6 -6 L-19.5 -9.4 H19.5 L21.6 -6 Z" fill={far} />
      {finish === 'rare' && <path d="M-24 -2.2 H24 L23.3 -3.3 H-23.3 Z" fill={L.lit(FOIL.base)} />}
      {(finish === 'super' || finish === 'secret') &&
        HOLO_BANDS.map((c, i) => <path key={c} d={`M${f(-22 + i * 8.8)} -3.4 H${f(-13.2 + i * 8.8)} V-2.2 H${f(-22 + i * 8.8)} Z`} fill={L.lit(c)} />)}
    </g>
  );
}

/** A secret's "?", pressed into the pearl: a lit edge and a shaded edge, no ink. */
function Embossed({ L }: { L: Lighting }) {
  const d =
    'M-4.6 12.6C-4.6 9.2-1.8 7.4 1.2 7.4 4.6 7.4 6.8 9.4 6.8 12.2 6.8 14.8 5 15.8 3.4 16.8 2 17.6 1.6 18.2 1.6 19.8V20.8H-1.4V19.6C-1.4 17.2-0.4 16.2 1.4 15 2.8 14.1 3.6 13.6 3.6 12.3 3.6 11 2.6 10.2 1.1 10.2-0.6 10.2-1.6 11.2-1.6 12.8ZM-1.6 23.4H1.8V26.8H-1.6Z';
  const [tx, ty] = L.toward;
  return (
    <g transform="translate(-1 2)">
      <path d={d} transform={`translate(${f(tx * 0.7)} ${f(ty * 0.7)})`} fill="#FFFFFF" opacity={0.85} />
      <path d={d} transform={`translate(${f(-tx * 0.7)} ${f(-ty * 0.7)})`} style={{ fill: L.shade }} />
      <path d={d} fill={L.lit(PEARL)} />
    </g>
  );
}

function Glint({ L }: { L: Lighting }) {
  // Light from straight above still glints a little off the crown, not dead centre (where the figure's head is).
  const [tx, ty] = L.toward[0] === 0 ? [-0.55, -1] : L.toward;
  const len = Math.hypot(tx, ty);
  const ux = tx / len;
  const uy = ty / len;
  const a = (Math.atan2(uy, ux) * 180) / Math.PI;
  const gx = ux * R * 0.66;
  const gy = uy * R * 0.66 - 4;
  return (
    <g class="cap-glint" opacity={L.light.night ? 0.5 : 0.9}>
      <ellipse cx={gx} cy={gy} rx={3.4} ry={8.5} transform={`rotate(${f(a)} ${f(gx)} ${f(gy)})`} fill="#FFFFFF" />
      <circle cx={gx - uy * 9 * Math.sign(ux || 1)} cy={gy + ux * 9 * Math.sign(ux || 1) - 4} r={1.8} fill="#FFFFFF" />
    </g>
  );
}

export interface CapsuleArtProps extends CapsuleShellProps {
  size?: number | string;
  title?: string;
  style?: JSX.CSSProperties;
  svgClass?: string;
}

/** A standalone capsule (the reveal, the gallery). */
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

/**
 * The capsule after it has opened: the tinted half upright like a small bowl, and the clear
 * half tipped on its side beside it (the reveal card sets them on the table).
 */
export function OpenCapsuleArt({
  finish,
  color,
  color2,
  light = DAY_LIGHT,
  size = 120,
}: Omit<CapsuleShellProps, 'state' | 'cracks' | 'machineId'> & { size?: number | string }) {
  const L = lighting(light);
  const pearl = finish === 'super' || finish === 'secret';
  const tint = pearl ? PEARL : richer(color);
  const px = typeof size === 'number' ? `${size}px` : size;
  const r = 24;
  const bowl = `M${-r} 0 A${r} ${r} 0 0 0 ${r} 0 Z`;
  return (
    <svg class="capsule-art" viewBox="-60 -34 120 68" width={px} height={px} aria-hidden="true" focusable="false">
      <ellipse cx={0} cy={25.5} rx={52} ry={3.4} style={{ fill: L.contact }} />
      <g transform="translate(-22 0)">
        <path d={bowl} fill={L.lit(tint)} />
        {finish === 'special' && <path d={`M0 0 H${r} A${r} ${r} 0 0 1 0 ${r} Z`} fill={L.lit(richer(color2 ?? mix(color, '#FFFFFF', 0.4)))} />}
        {(finish === 'rare' || finish === 'super') && (
          <path d={`M${-r} 0.5 H${r} A${r} ${r} 0 0 1 ${r - 0.9} 4.6 H${-r + 0.9} A${r} ${r} 0 0 1 ${-r} 0.5 Z`} fill={L.lit(FOIL.base)} />
        )}
        <ellipse cx={0} cy={0} rx={r} ry={5.4} fill={L.lit(mix(tint, '#FFFFFF', 0.35))} />
        <ellipse cx={0} cy={0.6} rx={r - 3} ry={3.8} fill={L.lit(mix(tint, '#4B4060', 0.2))} />
        <path d={lowerMoon(r, L.side, 6)} style={{ fill: L.shade }} />
      </g>
      <g transform="translate(26 6) rotate(-14)">
        <path d={`M${-20} 0 A20 20 0 0 1 20 0 Z`} fill={L.lit(CLEAR.fill)} opacity={L.light.night ? 0.35 : 0.6} />
        <path d="M-20 0 A20 20 0 0 1 20 0 H17.8 A17.8 17.8 0 0 0 -17.8 0 Z" fill={L.lit(CLEAR.rim)} />
        <ellipse cx={0} cy={0} rx={20} ry={4.2} fill={L.lit(CLEAR.rim)} />
        <ellipse cx={0} cy={0.3} rx={17.8} ry={3} fill={L.lit(CLEAR.fill)} />
        <ellipse cx={-6} cy={-13.4} rx={6} ry={1.5} transform="rotate(-24 -6 -13.4)" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

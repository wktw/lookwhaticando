import { useId } from 'preact/hooks';
import { MATERIAL, SHADE_INK, mix } from '@/art/icons/palette';

/**
 * The app icon (DESIGN §1): a small black cat loafing on the rim of a terracotta pot with two leaves,
 * in a slanting window beam. The cat and pot cast a hard shadow on a soft lavender wall. Flat, matte,
 * no outlines, lit from the upper left. Used by scripts/generate-icons.mjs (PNG icons, favicon) and
 * inside the install guide.
 *  - squircle: transparent corners (desktop / "any" icons, in-app)
 *  - square:   full-bleed (iOS applies its own mask)
 *  - maskable: full-bleed, the cat and pot kept inside the 80% safe circle (Android)
 *  - favicon:  the squircle cropped to the cat and pot on a deeper lavender tile, without the beam,
 *              the bars or the cast shadow, so it still reads at 16 px on a pale tab strip
 */
export type AppIconShape = 'squircle' | 'square' | 'maskable' | 'favicon';

/** Superellipse (n = 5) path, the continuous-corner "squircle" shape. */
export function squirclePath(cx: number, cy: number, r: number, n = 5, steps = 96): string {
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = cx + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const SQUIRCLE = squirclePath(50, 50, 50);
const SQUARE = 'M0 0H100V100H0Z';

/** The room: a soft lavender wall, a paler sill, and the sun's parallelogram crossing both. */
const ROOM = {
  wall: '#E6DEEE',
  floor: '#EFE8F0',
  floorEdge: '#DDD3E4',
  beamWall: '#FAEFD2',
  beamFloor: '#F8EBCB',
};
const FLOOR_Y = 84;
/** The beam on the wall (its edges are the window's jambs, slanting down to the right), then on the sill. */
const BEAM_WALL = `M-8.5 -2H40.3L92.1 ${FLOOR_Y}H46.1Z`;
const BEAM_FLOOR = `M46.1 ${FLOOR_Y}H92.1L116 101H70Z`;
/** The shadow of a window bar inside the beam. */
const BAR = `M31.5 -2H35.2L87.2 ${FLOOR_Y}H83.5Z`;
const BAR_FLOOR = `M83.5 ${FLOOR_Y}H87.2L111 101H107.3Z`;

/* ---------- Pot: terracotta with a darker rim; shade strips on the side away from the window ---------- */
const POT_BODY = 'M27.6 65H68.4L64.9 89.2Q64.5 92 61.8 92H34.2Q31.5 92 31.1 89.2Z';
const POT_BODY_SHADE = 'M61.3 65H68.4L64.9 89.2Q64.5 92 61.8 92H57.9Z';
const POT_UNDER_RIM = 'M27.6 65H68.4L68.1 67.4H27.9Z';
const POT_RIM = 'M27.2 57H68.8Q71 57 71 59.2V62.8Q71 65 68.8 65H27.2Q25 65 25 62.8V59.2Q25 57 27.2 57Z';
const POT_RIM_SHADE = 'M64.6 57H68.8Q71 57 71 59.2V62.8Q71 65 68.8 65H64.6Z';
/** The pot's shadow thrown across the sill, away from the window. */
const FLOOR_SHADOW = 'M33 92H64L84.5 99.5H53.5Z';

/* ---------- Two heart-shaped leaves on thin stems, split light/shade along the midrib ---------- */
const LEAF = 'M0 0C-3.4-2.4-10.6-2.4-11.6-9.8C-12.6-17-6.2-21.8 0-26C6.2-21.8 12.6-17 11.6-9.8C10.6-2.4 3.4-2.4 0 0Z';
const LEAF_SHADE_HALF = 'M0 0C3.4-2.4 10.6-2.4 11.6-9.8C12.6-17 6.2-21.8 0-26C.9-17 .9-8 0 0Z';
const LEAF_RIB = 'M0-1.5C.5-9 .5-16 0-22.5';
const STEMS = ['M44.5 60C43 50 38.5 42.5 31.5 37', 'M52.5 60C54.5 49.5 59.5 41 67.5 34.5'];
const LEAVES: { x: number; y: number; a: number; s: number; lit: string; shade: string }[] = [
  { x: 31.5, y: 37, a: -46, s: 0.92, lit: MATERIAL.leaf, shade: MATERIAL.leafDeep },
  { x: 67.5, y: 34.5, a: 38, s: 1, lit: MATERIAL.leafLight, shade: MATERIAL.leaf },
];

/* ---------- The black cat, loafing, head to the window (a 100-unit frame, ground at y 86) ---------- */
const CAT_FRAME = 'translate(19.4 9.3) scale(0.56)';
const CAT_BODY = 'M24 86C15 86 13 77 16.5 69C22 57 38 50.5 57 50.5C76 50.5 90 58 91.5 71C92.5 81 88.5 86 80 86Z';
const CAT_HEAD = 'M33 36.5C45.5 36.5 53.5 43.5 53.8 53.5C54.1 63.5 45 70.5 33 70.5C21 70.5 11.9 63.5 12.2 53.5C12.5 43.5 20.5 36.5 33 36.5Z';
const CAT_EAR_L = 'M13.5 50C12.5 41 13 32.5 15.2 27.2C16 25.4 17.8 25.2 19.2 26.3C23.2 29.5 27.2 33.5 30 38Z';
const CAT_EAR_R = 'M52.5 50C53.5 41 53 32.5 50.8 27.2C50 25.4 48.2 25.2 46.8 26.3C42.8 29.5 38.8 33.5 36 38Z';
/** The tail, over the rim and down the pot's shaded side, curling at the tip (icon units). */
const CAT_TAIL = 'M66.6 52.2C70.6 54.2 72.6 58.4 72 63.6C71.5 68 70.2 71.6 70.9 75C71.4 77.4 69.6 79.2 67.6 78.2';
/**
 * The plum coat is drawn nudged away from the window over a lavender copy, so the lavender shows
 * as a hard rim of light on the window side (DESIGN §10.4: dark coats keep a rim light).
 */
const RIM_NUDGE = 'translate(1.6 1.3)';
const EYES: [number, number][] = [
  [25.2, 55.4],
  [40.6, 55.4],
];

const WALL_SHADOW_OFFSET = 'translate(6.5 2.4)';
/** How strong the hard shadow thrown on the wall and sill is (one flat layer of the shade ink). */
export const WALL_SHADOW_OPACITY = 0.2;
/** Where the loaf meets the rim: a thin flat contact shadow, only on the rim's top face. */
const CAT_CONTACT = 'M29.6 57H67.6A19 2 0 0 1 29.6 57Z';
const CAT_CONTACT_INK = mix(MATERIAL.terracottaRim, SHADE_INK, 0.34);
/** The favicon's tile: a deeper lavender than the wall, so the square holds on a pale tab strip. */
export const FAVICON_TILE = '#D3C5E5';

function Foreground({ shadow = false }: { shadow?: boolean }) {
  // `shadow` repeats the silhouettes in one flat ink for the cast shadow on the wall.
  const f = (color: string) => (shadow ? undefined : color);
  return (
    <g>
      {STEMS.map((d) => (
        <path key={d} d={d} fill="none" stroke={shadow ? SHADE_INK : MATERIAL.stem} stroke-width={1.9} stroke-linecap="round" />
      ))}
      {LEAVES.map((l) => (
        <g key={l.x} transform={`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.s})`}>
          <path d={LEAF} fill={f(l.lit)} />
          {!shadow && <path d={LEAF_SHADE_HALF} fill={l.shade} />}
          {!shadow && <path d={LEAF_RIB} fill="none" stroke="#F4F2DE" stroke-opacity={0.75} stroke-width={0.8} stroke-linecap="round" />}
        </g>
      ))}
      {shadow && <path d={POT_RIM} />}
      <path d={POT_BODY} fill={f(MATERIAL.terracotta)} />
      {!shadow && (
        <g>
          <path d={POT_BODY_SHADE} fill={MATERIAL.terracottaShade} />
          <path d={POT_UNDER_RIM} fill={MATERIAL.terracottaRimShade} />
          <path d={POT_RIM} fill={MATERIAL.terracottaRim} />
          <path d={POT_RIM_SHADE} fill={MATERIAL.terracottaRimShade} />
          <path d={CAT_CONTACT} fill={CAT_CONTACT_INK} />
        </g>
      )}
      <g transform={CAT_FRAME}>
        {shadow ? (
          <g>
            <path d={CAT_BODY} />
            <path d={CAT_EAR_L} />
            <path d={CAT_EAR_R} />
            <path d={CAT_HEAD} />
          </g>
        ) : (
          <g>
            <path d={CAT_BODY} fill={MATERIAL.plumRim} />
            <path d={CAT_BODY} fill={MATERIAL.plum} transform={RIM_NUDGE} />
            <path d={CAT_EAR_L} fill={MATERIAL.plumRim} />
            <path d={CAT_EAR_L} fill={MATERIAL.plum} transform={RIM_NUDGE} />
            <path d={CAT_EAR_R} fill={MATERIAL.plum} transform={RIM_NUDGE} />
            <path d={CAT_HEAD} fill={MATERIAL.plumRim} />
            <path d={CAT_HEAD} fill={MATERIAL.plum} transform={RIM_NUDGE} />
            {EYES.map(([x, y]) => (
              <g key={x}>
                <circle cx={x + 1} cy={y + 0.8} r={3.3} fill={MATERIAL.catEye} />
                <ellipse cx={x + 1.4} cy={y + 0.8} rx={1.05} ry={2.3} fill={MATERIAL.plum} />
              </g>
            ))}
          </g>
        )}
      </g>
      {!shadow && <path d={CAT_TAIL} fill="none" stroke={MATERIAL.plum} stroke-width={3.4} stroke-linecap="round" />}
    </g>
  );
}

function Room() {
  return (
    <g>
      <rect x={-2} y={-2} width={104} height={FLOOR_Y + 2} fill={ROOM.wall} />
      <path d={BEAM_WALL} fill={ROOM.beamWall} />
      <path d={BAR} fill={ROOM.wall} opacity={0.55} />
      <rect x={-2} y={FLOOR_Y} width={104} height={100 - FLOOR_Y + 2} fill={ROOM.floor} />
      <path d={BEAM_FLOOR} fill={ROOM.beamFloor} />
      <path d={BAR_FLOOR} fill={ROOM.floor} opacity={0.55} />
      <rect x={-2} y={FLOOR_Y} width={104} height={1.4} fill={ROOM.floorEdge} />
    </g>
  );
}

/** Foreground placement per shape: the maskable icon keeps the cat and pot inside the safe circle. */
const PLACE: Record<AppIconShape, string | undefined> = {
  square: undefined,
  squircle: undefined,
  maskable: 'translate(50 58) scale(0.76) translate(-50 -58)',
  favicon: 'translate(50 51) scale(1.28) translate(-49 -57.5)',
};

export function AppIconArt({ size = 96, shape = 'squircle', title, class: cls }: { size?: number | string; shape?: AppIconShape; title?: string; class?: string }) {
  const uid = `ai${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  const clip = `${uid}-clip`;
  const favicon = shape === 'favicon';
  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      class={cls}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={shape === 'squircle' || shape === 'favicon' ? SQUIRCLE : SQUARE} />
        </clipPath>
      </defs>
      <g clip-path={`url(#${clip})`}>
        {favicon ? <rect x={-2} y={-2} width={104} height={104} fill={FAVICON_TILE} /> : <Room />}
        <g transform={PLACE[shape]}>
          {!favicon && (
            <g opacity={WALL_SHADOW_OPACITY} fill={SHADE_INK}>
              <g transform={WALL_SHADOW_OFFSET}>
                <Foreground shadow />
              </g>
              <path d={FLOOR_SHADOW} />
            </g>
          )}
          <Foreground />
        </g>
      </g>
    </svg>
  );
}

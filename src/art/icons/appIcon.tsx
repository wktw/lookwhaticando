/**
 * The app icon (DESIGN §1 "Many animals"): the black cat loafing on the rim of a terracotta pot with two leaves, and a
 * small Holstein calf sitting on the sill at the pot's right, in the slanting window beam. Both animals are PetArt's own
 * drawings (pet-cat-black's loaf, pet-cow-holstein sitting), so the icon's cat is the app's cat: the same anatomy and
 * eyes, and its rim light only on the lit edge. Each casts a hard shadow on the soft lavender wall. Flat, matte, no
 * outlines, lit from the upper left. Rendered to PNG and the favicon by scripts/generate-icons.mjs.
 *  - squircle: transparent corners (desktop / "any" icons, in-app)
 *  - square:   full-bleed (iOS applies its own mask)
 *  - maskable: full-bleed, the pot and both animals kept inside the 80% safe circle (Android)
 *  - favicon:  cropped to the cat and the calf's head on a deeper lavender tile, without the beam, the bars or the
 *              cast shadow, so it still reads at 16 px on a pale tab strip
 *
 * The same scene without its room is `IconScene` (the launch screen uses it above the wordmark).
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { DAY_LIGHT, NIGHT_LIGHT } from '@/art/light';
import { nightTone } from '@/art/scene/decor/kit';
import { PetArt } from '@/art/pets/PetArt';
import { CONTACT_DAY, CONTACT_LAMP, SHADE_DAY, SHADE_LAMP } from '@/art/shade';
import { MATERIAL, SHADE_INK } from './palette';

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
const ROOM = { wall: '#E6DEEE', floor: '#EFE8F0', floorEdge: '#DDD3E4', beamWall: '#FAEFD2', beamFloor: '#F8EBCB' };
const FLOOR_Y = 84;
const BEAM_WALL = `M-8.5 -2H40.3L92.1 ${FLOOR_Y}H46.1Z`;
const BEAM_FLOOR = `M46.1 ${FLOOR_Y}H92.1L116 101H70Z`;
const BAR = `M31.5 -2H35.2L87.2 ${FLOOR_Y}H83.5Z`;
const BAR_FLOOR = `M83.5 ${FLOOR_Y}H87.2L111 101H107.3Z`;

/*
 * The pot, a little left of centre so the calf has the sill at its right: terracotta with a darker rim, shade strips on
 * the side away from the window.
 */
const POT_BODY = 'M22.6 65H63.4L59.9 89.2Q59.5 92 56.8 92H29.2Q26.5 92 26.1 89.2Z';
const POT_BODY_SHADE = 'M56.3 65H63.4L59.9 89.2Q59.5 92 56.8 92H52.9Z';
const POT_UNDER_RIM = 'M22.6 65H63.4L63.1 67.4H22.9Z';
const POT_RIM = 'M22.2 57H63.8Q66 57 66 59.2V62.8Q66 65 63.8 65H22.2Q20 65 20 62.8V59.2Q20 57 22.2 57Z';
const POT_RIM_SHADE = 'M59.6 57H63.8Q66 57 66 59.2V62.8Q66 65 63.8 65H59.6Z';
/** The pot's shadow thrown across the sill, away from the window. */
const FLOOR_SHADOW = 'M28 92H59L73 97.4H42Z';

const LEAF = 'M0 0C-3.4-2.4-10.6-2.4-11.6-9.8C-12.6-17-6.2-21.8 0-26C6.2-21.8 12.6-17 11.6-9.8C10.6-2.4 3.4-2.4 0 0Z';
const LEAF_SHADE_HALF = 'M0 0C3.4-2.4 10.6-2.4 11.6-9.8C12.6-17 6.2-21.8 0-26C.9-17 .9-8 0 0Z';
const LEAF_RIB = 'M0-1.5C.5-9 .5-16 0-22.5';
const STEMS = ['M39.5 60C38 50 33.5 42.5 26.5 37', 'M47.5 60C49.5 49.5 54.5 41 62.5 34.5'];
const LEAVES: { x: number; y: number; a: number; s: number; lit: string; shade: string }[] = [
  { x: 26.5, y: 37, a: -46, s: 0.92, lit: MATERIAL.leaf, shade: MATERIAL.leafDeep },
  { x: 62.5, y: 34.5, a: 38, s: 1, lit: MATERIAL.leafLight, shade: MATERIAL.leaf },
];

/**
 * Where the animals stand, in icon units: each PetArt canvas's edge, the x of its centre and the y of its feet line
 * (canvas y 94). The cat is at least 35% of the icon's width; the calf is about 58% of the cat's height (the size of a
 * calf beside a cat in the Pz_poses frames, scaled to the icon).
 */
export const ICON_CAT = { petId: 'pet-cat-black', size: 64, x: 43.5, feet: 57.6 } as const;
export const ICON_CALF = { petId: 'pet-cow-holstein', size: 27, x: 80, feet: 91.6 } as const;

/** Scene tokens PetArt reads, pinned so the icon (and the serialized favicon) never depend on the page theme. */
const PET_TOKENS = { '--shade': SHADE_DAY, '--contact': CONTACT_DAY } as JSX.CSSProperties;
const PET_TOKENS_LAMP = { '--shade': SHADE_LAMP, '--contact': CONTACT_LAMP, '--lamp': '#FFC98A' } as JSX.CSSProperties;

const WALL_SHADOW_OFFSET = 'translate(6.5 2.4)';
/** How strong the hard shadow thrown on the wall and sill is (one flat layer of the shade ink). */
export const WALL_SHADOW_OPACITY = 0.2;
/** The favicon's tile: a deeper lavender than the wall, so the square holds on a pale tab strip. */
export const FAVICON_TILE = '#D3C5E5';

/** One animal on the icon canvas: PetArt at its size, feet on its line, head toward the window (left). */
function Animal({ a, pose, shadow, night }: { a: typeof ICON_CAT | typeof ICON_CALF; pose: 'loaf' | 'sit'; shadow?: boolean; night?: boolean }) {
  const top = a.feet - (a.size * 94) / 100;
  return (
    <g transform={`translate(${a.x - a.size / 2} ${top.toFixed(2)})`} data-animal={a.petId}>
      <PetArt petId={a.petId} size={String(a.size)} px={512} pose={pose} facing="left" light={night ? NIGHT_LIGHT : DAY_LIGHT} silhouette={shadow} shadow={!shadow} />
    </g>
  );
}

/**
 * The pot, its leaves, the cat on the rim and the calf on the sill. `shadow` draws them all as one flat silhouette;
 * `night` lights them by the lamp (the launch screen in Lamplight).
 */
function Foreground({ shadow = false, night = false }: { shadow?: boolean; night?: boolean }) {
  const f = (color: string) => (shadow ? undefined : night ? nightTone(color) : color);
  const t = (color: string) => (night ? nightTone(color) : color);
  return (
    <g style={shadow ? ({ '--ink-disabled': SHADE_INK } as JSX.CSSProperties) : night ? PET_TOKENS_LAMP : PET_TOKENS}>
      {STEMS.map((d) => (
        <path key={d} d={d} fill="none" stroke={shadow ? SHADE_INK : t(MATERIAL.stem)} stroke-width={1.9} stroke-linecap="round" />
      ))}
      {LEAVES.map((l) => (
        <g key={l.x} transform={`translate(${l.x} ${l.y}) rotate(${l.a}) scale(${l.s})`}>
          <path d={LEAF} fill={f(l.lit)} />
          {!shadow && <path d={LEAF_SHADE_HALF} fill={t(l.shade)} />}
          {!shadow && <path d={LEAF_RIB} fill="none" stroke="#F4F2DE" stroke-opacity={0.75} stroke-width={0.8} stroke-linecap="round" />}
        </g>
      ))}
      {shadow && <path d={POT_RIM} />}
      <path d={POT_BODY} fill={f(MATERIAL.terracotta)} />
      {!shadow && (
        <g>
          <path d={POT_BODY_SHADE} fill={t(MATERIAL.terracottaShade)} />
          <path d={POT_UNDER_RIM} fill={t(MATERIAL.terracottaRimShade)} />
          <path d={POT_RIM} fill={t(MATERIAL.terracottaRim)} />
          <path d={POT_RIM_SHADE} fill={t(MATERIAL.terracottaRimShade)} />
        </g>
      )}
      <Animal a={ICON_CAT} pose="loaf" shadow={shadow} night={night} />
      <Animal a={ICON_CALF} pose="sit" shadow={shadow} night={night} />
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

/**
 * Foreground placement per shape. The maskable icon keeps the pot and both animals inside the 80% safe circle; the
 * favicon crops to the cat and the calf's head.
 */
export const ICON_PLACE: Record<AppIconShape, string | undefined> = {
  square: undefined,
  squircle: undefined,
  maskable: 'translate(48.5 54) scale(0.72) translate(-50 -56)',
  favicon: 'translate(50 52) scale(1.22) translate(-54 -58)',
};

/** The pot, the cat and the calf on their own, with their contact shadows (the launch screen), by day or by the lamp. */
export function IconScene({ size = 96, night = false, title, class: cls, style }: { size?: number | string; night?: boolean; title?: string; class?: string; style?: JSX.CSSProperties }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="10 20 84 76" width={px} height={typeof size === 'number' ? `${(size * 76) / 84}px` : undefined} class={cls} style={style} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <ellipse cx={43} cy={92.4} rx={19} ry={1.8} fill={night ? CONTACT_LAMP : CONTACT_DAY} />
      <Foreground night={night} />
    </svg>
  );
}

export function AppIconArt({ size = 96, shape = 'squircle', title, class: cls }: { size?: number | string; shape?: AppIconShape; title?: string; class?: string }) {
  const uid = `ai${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const px = typeof size === 'number' ? `${size}px` : size;
  const clip = `${uid}-clip`;
  const favicon = shape === 'favicon';
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} class={cls} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={shape === 'squircle' || shape === 'favicon' ? SQUIRCLE : SQUARE} />
        </clipPath>
      </defs>
      <g clip-path={`url(#${clip})`}>
        {favicon ? <rect x={-2} y={-2} width={104} height={104} fill={FAVICON_TILE} /> : <Room />}
        <g transform={ICON_PLACE[shape]}>
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

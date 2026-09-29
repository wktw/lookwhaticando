/**
 * Drawing kit for item art (decor and treats): "printed miniature, lit by one window" (DESIGN §10.4).
 *
 * Every item is drawn on the 100×100 canvas as flat, matte, outline-free shapes. Edges come from
 * value contrast. Each solid shape takes a hard-edged shade crescent in `var(--shade)` on the side
 * away from the light, and every standing item sits on a flat contact shadow in `var(--contact)`.
 *
 * Crescents are precomputed. A shape is registered with `shapes(itemId, {...})`; the offline tool
 * `tools/build-shade.mjs` subtracts each shape from itself nudged toward the light (for light from
 * the left, the top and the right) and commits the results to `shade.gen.ts`. At run time a
 * crescent is only a lookup, and `decor.test.ts` fails when a shape changes without a rebuild.
 *
 * At night (Lamplight) surfaces dim toward the indigo room and warm slightly toward the lamp,
 * dark shapes get a thin rim light on the lamp side, and light sources glow.
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import { DAY_LIGHT, NIGHT_LIGHT, type Light, type LightFrom } from '@/art/light';
import { SHADE } from './shade.gen';
import { heart } from './geo';

export interface DecorArtOptions {
  /** Lamplight: surfaces dim and warm, dark shapes get a rim light, light sources glow. Defaults to `light.night`. */
  night?: boolean;
  /** Windowlight: which side the light comes from (shade crescents sit opposite). Defaults to DAY_LIGHT. */
  light?: Light;
  /** Thin-line scale: 1 on the icon canvas; a scene passes PET_UNITS ÷ size so strings match the pets'. */
  line?: number;
}

/** Draws one item on the 100×100 canvas (no <svg> wrapper). */
export type DecorRenderer = (opts?: DecorArtOptions) => JSX.Element;

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** Warm graphite ink (DESIGN §10.1), for eyes, seeds and thin dark lines. Never pure black. */
export const INK = '#3B3236';

/** The lamp (DESIGN §10.1 Lamplight). Light sources glow in it at night. */
export const LAMP = '#FFC98A';

/* ------------------------------------------------------------------ */
/* Light                                                               */
/* ------------------------------------------------------------------ */

/** Crescent order in the generated table. */
export const LIGHT_ORDER: readonly LightFrom[] = ['left', 'top', 'right'];

/**
 * How far each shape is nudged toward the light before it is subtracted from itself: the crescent
 * is what is left, a sliver along the far edges (canvas units, scaled by the shape's `k`).
 */
export const CRESCENT_OFFSET: Readonly<Record<LightFrom, readonly [number, number]>> = {
  left: [-4.2, -2.2],
  top: [0, -3.6],
  right: [4.2, -2.2],
};

/** Width of the lamp-side rim light on dark shapes at night (canvas units). */
export const RIM_WIDTH = 1.5;

/** The night room that surfaces lean toward after dark (Lamplight wall and sill). */
const NIGHT_ROOM = [70, 64, 102] as const;
const NIGHT_MIX = 0.3;
const NIGHT_DESATURATE = 0.16;
const NIGHT_WARM = 0.07;
const LAMP_RGB = [255, 201, 138] as const;

const toned = new Map<string, string>();

const hexToRgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
};
const rgbToHex = (rgb: readonly number[]) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** `hex` in Lamplight: a little greyer, mixed toward the indigo room, then warmed toward the lamp. */
export function nightTone(hex: string): string {
  const hit = toned.get(hex);
  if (hit) return hit;
  const rgb = hexToRgb(hex);
  const grey = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
  const out = rgb.map((v, i) => {
    const flat = v + (grey - v) * NIGHT_DESATURATE;
    const dim = flat + (NIGHT_ROOM[i]! - flat) * NIGHT_MIX;
    return dim + (LAMP_RGB[i]! - dim) * NIGHT_WARM;
  });
  const result = rgbToHex(out);
  toned.set(hex, result);
  return result;
}

/** By day the shade and contact inks follow the theme tokens; in Lamplight they are the lamp room's own. */
const SHADE_DAY = 'var(--shade)';
const SHADE_NIGHT = 'rgba(10, 8, 22, 0.3)';
const CONTACT_DAY = 'var(--contact)';
const CONTACT_NIGHT = 'rgba(8, 6, 16, 0.24)';
const RIM = 'rgba(255, 201, 138, 0.62)';

/** How one render paints. */
export interface Paint {
  night: boolean;
  light: Light;
  from: LightFrom;
  /** Index of `from` in LIGHT_ORDER (the generated tables are stored in that order). */
  i: 0 | 1 | 2;
  /** +1 when the light comes from the left (shadows fall right), −1 from the right, 0 from above. */
  away: -1 | 0 | 1;
  /** A surface colour, toned for the time of day. Light sources skip this. */
  c: (hex: string) => string;
  /** A thin-line width, scaled with `line`. */
  w: (width: number) => number;
  shade: string;
  contact: string;
  rim: string;
  /**
   * @deprecated Meadow-era outline preset, kept only so an existing shelf test compiles; catkin art
   * never outlines. Use `thin()` for genuinely thin things.
   */
  ink: { stroke: string; 'stroke-width': number; 'stroke-linejoin': 'round'; 'stroke-linecap': 'round' };
}

export function paint({ night, light, line = 1 }: DecorArtOptions = {}): Paint {
  const isNight = night ?? light?.night ?? false;
  const l = light ?? (isNight ? NIGHT_LIGHT : DAY_LIGHT);
  const from = l.from;
  const w = (width: number) => +(width * line).toFixed(3);
  return {
    night: isNight,
    light: l,
    from,
    i: from === 'left' ? 0 : from === 'top' ? 1 : 2,
    away: from === 'left' ? 1 : from === 'right' ? -1 : 0,
    c: isNight ? nightTone : (hex) => hex,
    w,
    shade: isNight ? SHADE_NIGHT : SHADE_DAY,
    contact: isNight ? CONTACT_NIGHT : CONTACT_DAY,
    rim: RIM,
    ink: { stroke: INK, 'stroke-width': w(2.4), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
  };
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface ShapeDef {
  d: string;
  /** Crescent strength (1 = standard, 0 = none: a flat patch or a surface facing up). */
  k?: number;
  /** A dark shape: gets a lamp-side rim light at night. */
  rim?: boolean;
  /** Key of another shape of the same item that this one is trimmed to (stripes on a canopy, a label on a jar). */
  clip?: string;
}

export interface Shape {
  /** `<itemId>/<key>`: the row in the generated table. */
  readonly ref: string;
  readonly d: string;
  readonly k: number;
  readonly rim: boolean;
  readonly clip?: string;
}

/** Every registered shape, for the offline crescent tool and the freshness test. */
export const SHAPES = new Map<string, Shape>();

/** Registers an item's solid shapes. Called once per item at module load. */
export function shapes<K extends string>(id: string, defs: Record<K, string | ShapeDef>): Record<K, Shape> {
  const out = {} as Record<K, Shape>;
  for (const key of Object.keys(defs) as K[]) {
    const raw = defs[key];
    const def: ShapeDef = typeof raw === 'string' ? { d: raw } : raw;
    const shape: Shape = { ref: `${id}/${key}`, d: def.d, k: def.k ?? 1, rim: !!def.rim, ...(def.clip ? { clip: `${id}/${def.clip}` } : {}) };
    SHAPES.set(shape.ref, shape);
    out[key] = shape;
  }
  return out;
}

/** FNV-1a, as 8 hex digits. */
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** A fingerprint of what the generated rows for `s` were computed from. Stale when this changes. */
export function shapeHash(s: Shape): string {
  const clip = s.clip ? (SHAPES.get(s.clip)?.d ?? '?') : '';
  return fnv(JSON.stringify([CRESCENT_OFFSET, RIM_WIDTH, s.d, s.k, s.rim, clip]));
}

/** The path a shape paints (trimmed to its clip shape when it has one). */
export const shapeD = (s: Shape): string => SHADE[s.ref]?.d ?? s.d;

type Details = JSX.Element | null | false | undefined | (JSX.Element | null | false | undefined)[];

/**
 * A solid shape: its lit fill, any flat details on it, then its shade crescent (and rim light by
 * night). `glowing` paints the fill as given: a light source is not dimmed by the night.
 */
export function solid(p: Paint, s: Shape, fill: string, details?: Details, glowing = false): JSX.Element {
  const g = SHADE[s.ref];
  const crescent = g?.c?.[p.i];
  const rim = p.night ? g?.r?.[p.i] : undefined;
  return (
    <>
      <path d={g?.d ?? s.d} fill={glowing ? fill : p.c(fill)} />
      {details}
      {crescent && <path d={crescent} fill={p.shade} />}
      {rim && <path d={rim} fill={p.rim} />}
    </>
  );
}

/** A flat patch (a label, a stripe, an inner surface): no crescent of its own. */
export function flat(p: Paint, s: Shape, fill: string, opacity?: number): JSX.Element {
  return <path d={shapeD(s)} fill={p.c(fill)} opacity={opacity} />;
}

/** Just the crescent of a shape, for laying shade over details drawn after it. */
export function crescentOf(p: Paint, s: Shape): JSX.Element | null {
  const crescent = SHADE[s.ref]?.c?.[p.i];
  return crescent ? <path d={crescent} fill={p.shade} /> : null;
}

/** A shadow cast inside the object that does not move with the light (under a rim, inside a box). */
export function cast(p: Paint, d: string, strength = 1): JSX.Element {
  return <path d={d} fill={p.shade} opacity={strength === 1 ? undefined : strength} />;
}

/** The flat contact shadow under a standing item, slid a little away from the light and kept on the canvas. */
export function contact(p: Paint, cx: number, cy: number, rx: number, ry = 2.4): JSX.Element {
  const wide = rx * (p.away ? 1.04 : 1);
  const x = cx + p.away * rx * 0.08;
  const r = Math.min(wide, x - 0.5, 99.5 - x);
  return <ellipse cx={+x.toFixed(2)} cy={cy} rx={+r.toFixed(2)} ry={ry} fill={p.contact} />;
}

/**
 * A genuinely thin thing (string, twine, a stem, a seam, a spoke): a round-capped line, never an
 * outline. `glowing` keeps its colour at night.
 */
export function thin(p: Paint, d: string, color: string, width: number, opacity?: number, glowing = false): JSX.Element {
  return (
    <path d={d} fill="none" stroke={glowing ? color : p.c(color)} stroke-width={p.w(width)} stroke-linecap="round" stroke-linejoin="round" opacity={opacity} />
  );
}

/** A light source's colour: its day colour, or the lamp's warm light at night. */
export function lit(p: Paint, day: string, night: string = LAMP): string {
  return p.night ? night : day;
}

/**
 * A warm halo around a light source (light is the one thing allowed a gradient). A component, so
 * its gradient id is unique per instance.
 */
export function Glow({ cx, cy, r, color = LAMP, strength = 0.55 }: { cx: number; cy: number; r: number; color?: string; strength?: number }) {
  const id = `ig${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stop-color={color} stop-opacity={strength} />
          <stop offset="0.5" stop-color={color} stop-opacity={+(strength * 0.32).toFixed(3)} />
          <stop offset="1" stop-color={color} stop-opacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

/** A plump heart centred on 0,0 about 12 wide; place it with a transform. */
export const HEART = heart(0, 0, 12);

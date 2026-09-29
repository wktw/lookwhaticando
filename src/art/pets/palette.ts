import type { PetLook, PetPalette } from './types';

/**
 * Palette resolution: a look's named colours become the tones the rigs paint with, including the
 * derived ones (far legs, socks, the far ear). Variants are precomputed per look and cached, never
 * done with filters: `muted` is the Field Guide's 35% saturation for pets not yet at home, `night`
 * warms the lit side toward the lamp.
 */

const hex = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  const v = s.length === 3 ? s.replace(/./g, (c) => c + c) : s;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
};
const toHex = (c: readonly number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((v, i) => v + (B[i]! - v) * t));
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl([h, s, l]: [number, number, number]): string {
  if (s === 0) return toHex([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return toHex([ch(h + 1 / 3) * 255, ch(h) * 255, ch(h - 1 / 3) * 255]);
}

/** Keeps `amount` of the colour's saturation, and lifts it slightly toward paper. */
export function desaturate(c: string, amount = 0.35): string {
  const [h, s, l] = toHsl(hex(c));
  return mix(fromHsl([h, s * amount, l]), '#F4EEE6', 0.18);
}

/** Relative luminance 0–1 (sRGB, approximate). */
export function luma(c: string): number {
  const [r, g, b] = hex(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Graphite ink (never pure black). */
export const INK = '#3B3236';
/** Paler ink for closed eyes and lines on dark coats. */
export const INK_ON_DARK = '#E9DED6';
/** A pink blush, used only as a reaction. */
export const BLUSH = '#F2A9B6';
/** Tongue pink for a blep, a yawn or a nose-lick. */
export const TONGUE = '#E98E9C';
/** Mirrors --lamp in tokens.css: the night side is warmed toward it. */
export const LAMP = '#FFC98A';
/** The far side of the body is a little into the room's lavender shade. */
const FAR_INK = '#4A3F63';

export interface Tones {
  coat: string;
  far: string;
  under: string;
  mark: string;
  mark2: string;
  point: string;
  head: string;
  ear: string;
  earFar: string;
  earIn: string;
  nose: string;
  muzzle: string;
  eye: string | null;
  eye2: string | null;
  leg: string;
  legFar: string;
  paw: string | null;
  pawFar: string | null;
  tail: string;
  tip: string;
  horn: string;
  hoof: string;
  bill: string;
  foot: string;
  footFar: string;
  ink: string;
  /** Lines drawn on the coat (closed eyes, whiskers). */
  line: string;
  /** Eye ring for dark coats, or null. */
  ring: string | null;
  dark: boolean;
}

export type Tone = Exclude<keyof Tones, 'eye' | 'eye2' | 'ring' | 'dark' | 'paw' | 'pawFar'> | 'paw' | 'pawFar';

export type PaletteMode = 'day' | 'night' | 'muted' | 'muted-night' | 'silhouette';

const far = (c: string, dark: boolean) => mix(c, FAR_INK, dark ? 0.2 : 0.13);

function derive(p: PetPalette, dark: boolean): Tones {
  const coat = p.coat;
  const head = p.head ?? coat;
  const leg = p.leg ?? coat;
  const ear = p.ear ?? head;
  const tail = p.tail ?? coat;
  const bill = p.bill ?? '#EDB36A';
  const foot = p.foot ?? '#E9A764';
  return {
    coat,
    far: far(coat, dark),
    under: p.under ?? mix(coat, '#FFFAF2', 0.55),
    mark: p.mark ?? mix(coat, INK, 0.3),
    mark2: p.mark2 ?? p.mark ?? mix(coat, INK, 0.3),
    point: p.point ?? mix(coat, INK, 0.45),
    head,
    ear,
    earFar: far(ear, dark),
    earIn: p.earIn ?? mix(ear, '#F3B6BE', 0.55),
    nose: p.nose ?? (dark ? mix(coat, INK, 0.5) : '#D98F96'),
    muzzle: p.muzzle ?? mix(head, '#FFF6EC', 0.6),
    eye: p.eye ?? null,
    eye2: p.eye2 ?? p.eye ?? null,
    leg,
    legFar: far(leg, dark),
    paw: p.paw ?? null,
    pawFar: p.paw ? far(p.paw, dark) : null,
    tail,
    tip: p.tip ?? tail,
    horn: p.horn ?? '#F1E3C3',
    hoof: p.hoof ?? '#4A3F42',
    bill,
    foot,
    footFar: far(foot, false),
    ink: INK,
    line: dark ? INK_ON_DARK : INK,
    ring: dark ? mix(coat, '#FFF4EA', 0.27) : null,
    dark,
  };
}

const STRING_KEYS = [
  'coat', 'far', 'under', 'mark', 'mark2', 'point', 'head', 'ear', 'earFar', 'earIn', 'nose', 'muzzle', 'eye', 'eye2', 'leg', 'legFar',
  'paw', 'pawFar', 'tail', 'tip', 'horn', 'hoof', 'bill', 'foot', 'footFar', 'ring',
] as const;

function mapTones(t: Tones, fn: (c: string) => string, keepFace = false): Tones {
  const out = { ...t };
  for (const k of STRING_KEYS) {
    const v = t[k];
    if (v === null) continue;
    if (keepFace && (k === 'eye' || k === 'eye2')) continue;
    (out as Record<string, unknown>)[k] = fn(v);
  }
  return out;
}

/** The room's lavender, for pale coats that would vanish into paper at sprite size. */
const SPRITE_SHADE = '#8E80A6';

/**
 * Tones for the ≤ 20 px sprite. There is no room for a crescent at that size, so a pale coat (a
 * white cat, a Pekin, a polar bear) would sink into the card: its body steps into the shade and
 * its head a little less, so the silhouette and the head still read against the paper.
 */
export function spriteTones(t: Tones): Tones {
  const k = (c: string, amt: number) => (c.startsWith('var(') || luma(c) < 0.8 ? c : mix(c, SPRITE_SHADE, amt));
  if (k(t.coat, 1) === t.coat) return t;
  return { ...t, coat: k(t.coat, 0.2), far: k(t.far, 0.24), head: k(t.head, 0.12), under: k(t.under, 0.1), muzzle: k(t.muzzle, 0.08), tail: k(t.tail, 0.2) };
}

const cache = new WeakMap<PetLook, Map<PaletteMode, Tones>>();

/** The tones for a look in a lighting / display mode. Cached per look. */
export function tonesFor(look: PetLook, mode: PaletteMode): Tones {
  let byMode = cache.get(look);
  if (!byMode) cache.set(look, (byMode = new Map()));
  const hit = byMode.get(mode);
  if (hit) return hit;
  const dark = !!look.dark;
  const base = derive(look.palette, dark);
  let out: Tones;
  switch (mode) {
    case 'day':
      out = base;
      break;
    case 'night':
      // The lamp warms every lit surface a little; eyes keep their own colour.
      out = mapTones(base, (c) => mix(c, LAMP, dark ? 0.05 : 0.09), true);
      break;
    case 'muted':
      out = { ...mapTones(base, (c) => desaturate(c)), line: mix(base.line, '#9A8E90', 0.5), ink: '#6F6065' };
      break;
    case 'muted-night':
      out = { ...mapTones(tonesFor(look, 'night'), (c) => desaturate(c)), line: mix(base.line, '#9A8E90', 0.5), ink: '#6F6065' };
      break;
    case 'silhouette': {
      const flat = 'var(--ink-disabled)';
      out = { ...mapTones(base, () => flat), ink: flat, line: flat, eye: null, eye2: null, ring: null, paw: null, pawFar: null };
      break;
    }
  }
  byMode.set(mode, out);
  return out;
}

/** Tiny color helpers for deriving palette defaults (a lighter muzzle, a deeper inner ear…). */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix two #rrggbb colors; t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const ca = parse(a);
  const cb = parse(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i]! - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const lighten = (c: string, t: number) => mix(c, '#FFFFFF', t);
/** Darken toward the warm cocoa outline rather than black, so shades stay in the palette family. */
export const shade = (c: string, t: number) => mix(c, '#5A3E45', t);

/**
 * Moonlight: wash a color toward a pale periwinkle. Mixing toward a *light* cool tone keeps
 * pastels clean (mixing toward a mid blue greys them out); the moonlit overlay adds the depth.
 */
export const moonlight = (c: string, t = 1) => mix(c, '#E2DCFF', 0.2 * t);

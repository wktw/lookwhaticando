/**
 * How the capsule art takes the scene's Windowlight (DESIGN §10.4). By day the window lights
 * each part from `light.from` and a lavender-ink crescent sits on the far side. At night the
 * lamp is the source: surfaces dim a little toward the indigo room and warm toward the lamp,
 * the side facing the lamp takes a warm band, and the shade deepens. Pastel capsule tints dim
 * least, so pink, blue and butter survive the night. Everything here is plain colour, never a
 * filter.
 */
import { DAY_LIGHT, shadeSide, type Light } from '@/art/light';
import { mix } from './color';
import type { ShadeSide } from './crescent';
import { CONTACT_DAY, CONTACT_LAMP, SHADE_DAY, SHADE_LAMP } from '@/art/shade';

/** The lamp (tokens.css --lamp) and the Lamplight wall the room falls back to at night. */
export const LAMP = '#FFC98A';
export const NIGHT_ROOM = '#2B2536';

export interface Lighting {
  light: Light;
  /** Where crescents go. */
  side: ShadeSide;
  /** Unit vector toward the light (for round parts). */
  toward: readonly [number, number];
  /** A surface colour as this light shows it. */
  lit: (hex: string) => string;
  /** A pastel capsule tint as this light shows it (dims less than a painted surface at night). */
  tint: (hex: string) => string;
  /** The warm band on the side facing the lamp, for an already-lit colour; null by day. */
  lampSide: ((litHex: string) => string) | null;
  /** Crescent ink (translucent, laid over the part). */
  shade: string;
  /** Flat contact shadow on the surface below. */
  contact: string;
  /** A thin rim of lamp light for dark shapes at night; null by day. */
  rim: string | null;
}

const TOWARD: Record<ShadeSide, readonly [number, number]> = {
  // Shade on the right means the light comes from the left (and a little above).
  right: [-1, -0.45],
  left: [1, -0.45],
  under: [0, -1],
};

function nightTone(hex: string): string {
  return mix(mix(hex, NIGHT_ROOM, 0.17), LAMP, 0.1);
}

function nightTint(hex: string): string {
  return mix(mix(hex, NIGHT_ROOM, 0.15), LAMP, 0.06);
}

function lampWarm(hex: string): string {
  return mix(hex, LAMP, 0.22);
}

const same = (hex: string) => hex;

const cache = new Map<string, Lighting>();

export function lighting(light: Light = DAY_LIGHT): Lighting {
  const key = `${light.from}:${light.night ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const side = shadeSide(light);
  const result: Lighting = {
    light,
    side,
    toward: TOWARD[side],
    lit: light.night ? nightTone : same,
    tint: light.night ? nightTint : same,
    lampSide: light.night ? lampWarm : null,
    // The night values are tokens.css's Lamplight ones (@/art/shade) so night art also reads correctly on a light page (the gallery).
    shade: light.night ? SHADE_LAMP : `var(--shade, ${SHADE_DAY})`,
    contact: light.night ? CONTACT_LAMP : `var(--contact, ${CONTACT_DAY})`,
    rim: light.night ? 'rgba(255, 201, 138, 0.42)' : null,
  };
  cache.set(key, result);
  return result;
}

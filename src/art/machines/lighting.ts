/**
 * How the capsule art takes the scene's Windowlight (DESIGN §10.4). By day the window lights
 * each part from `light.from` and a lavender-ink crescent sits on the far side. At night the
 * lamp is the source: surfaces dim toward the indigo room and warm slightly toward the lamp,
 * and the shade deepens. Everything here is plain colour, never a filter.
 */
import { DAY_LIGHT, shadeSide, type Light } from '@/art/light';
import { mix } from './color';
import type { ShadeSide } from './crescent';

/** The lamp (tokens.css --lamp) and the Lamplight wall the room falls back to at night. */
export const LAMP = '#FFC98A';
const NIGHT_ROOM = '#2B2536';

export interface Lighting {
  light: Light;
  /** Where crescents go. */
  side: ShadeSide;
  /** Unit vector toward the light (for round parts). */
  toward: readonly [number, number];
  /** A surface colour as this light shows it. */
  lit: (hex: string) => string;
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
  return mix(mix(hex, NIGHT_ROOM, 0.3), LAMP, 0.1);
}

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
    lit: light.night ? nightTone : (hex) => hex,
    // The night values mirror tokens.css so night art also reads correctly on a light page (the gallery).
    shade: light.night ? 'rgba(12, 9, 26, 0.34)' : 'var(--shade, rgba(94, 76, 154, 0.16))',
    contact: light.night ? 'rgba(0, 0, 0, 0.24)' : 'var(--contact, rgba(59, 50, 54, 0.08))',
    rim: light.night ? 'rgba(255, 201, 138, 0.42)' : null,
  };
  cache.set(key, result);
  return result;
}

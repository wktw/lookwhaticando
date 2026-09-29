/**
 * Windowlight for plants (DESIGN §10.4): one light, a lit side and a shade side. The kit is made once per light and
 * handed to every pot, vessel and species renderer, so they pick inks without knowing where the window is.
 */
import { DAY_LIGHT, type Light } from '../light';
import { channels, fromHsl, mix, toHsl, type Rgb } from './math';

/** The lamp, for warming lit sides at night (matches `--lamp`). */
const LAMP = '#FFC98A';

/** Class names that paint with the art tokens (`plant.css`): `--shade`, `--contact` and `--lamp`. */
export const SHADE = 'pl-shade';
export const CONTACT = 'pl-contact';
export const RIM_LIGHT = 'pl-rim';

/** A species' greens: light, dark, and a pre-mixed third tone for overlaps and the shade side. */
export type Inks = readonly [light: string, dark: string, shade: string];

/** Makes the third tone from the dark one: a step toward the lavender shade ink, never toward grey. */
export const inks = (light: string, dark: string, shade = mix(dark, '#4E4470', 0.2)): Inks => [light, dark, shade];

export interface Kit {
  light: Light;
  night: boolean;
  /** Which way the shade falls in x: +1 to the right (window on the left), -1 to the left, 0 when lit from above. */
  away: -1 | 0 | 1;
  /** A lit colour: warmed a little toward the lamp at night, unchanged by day. */
  lit(c: string): string;
  /**
   * The ink for a leaf (or petal) centred at (x, y) on the 100-unit canvas: tone 0 light or 1 dark, one step darker
   * on the shade side. Lit from above, the lowest leaves are the shaded ones.
   */
  tone(p: Inks, tone: number, x: number, y?: number): string;
  /** How big the flowers are drawn (1; a Petite look draws them smaller, DESIGN §14.2). */
  bloom: number;
}

/**
 * Lamplight on a colour: it takes the lightness a lamp's warm white would give it (multiplied by the lamp), keeps its
 * own hue and saturation, and then eases a touch toward the lamp itself (less for dark colours). Multiplying the channels outright would
 * pull blues toward grey; keeping the chroma means a blue glaze stays blue under the lamp and nothing turns cold.
 */
const LAMP_WHITE = [255, 239, 218] as const;
const warmCache = new Map<string, string>();
const warm = (c: string) => {
  let w = warmCache.get(c);
  if (!w) {
    const rgb = channels(c);
    const [h, s] = toHsl(rgb);
    const [, , l] = toHsl(rgb.map((v, i) => (v * LAMP_WHITE[i]!) / 255) as Rgb);
    // Light colours take a little of the lamp's colour; dark glazes barely any (they get a rim of lamplight instead).
    w = mix(fromHsl(h, s, l), LAMP, 0.1 * l);
    warmCache.set(c, w);
  }
  return w;
};

const kits = new Map<string, Kit>();

/** The kit for a light (memoised: there are only six). */
export function kitFor(light: Light = DAY_LIGHT): Kit {
  const from = light.from === 'left' || light.from === 'right' || light.from === 'top' ? light.from : 'left';
  const night = !!light.night;
  const key = `${from}${night ? 'n' : 'd'}`;
  let kit = kits.get(key);
  if (kit) return kit;
  const away: Kit['away'] = from === 'left' ? 1 : from === 'right' ? -1 : 0;
  const lit = night ? warm : (c: string) => c;
  kit = {
    light: { from, night },
    night,
    away,
    lit,
    tone(p, tone, x, y = 0) {
      const shaded = away === 0 ? y > 60 : away * (x - 50) > 2.5;
      const t = Math.min(2, Math.max(0, Math.round(tone)) + (shaded ? 1 : 0));
      return t === 0 ? lit(p[0]) : p[t]!;
    },
    bloom: 1,
  };
  kits.set(key, kit);
  return kit;
}

const bloomKits = new Map<string, Kit>();

/** The same light with the flowers drawn at `bloom` × their size (memoised). */
export function kitWithBloom(k: Kit, bloom: number): Kit {
  if (bloom === k.bloom) return k;
  const key = `${k.light.from}${k.night ? 'n' : 'd'}${bloom}`;
  let out = bloomKits.get(key);
  if (!out) bloomKits.set(key, (out = { ...k, bloom }));
  return out;
}

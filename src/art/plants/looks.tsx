/**
 * Blooms Like You (DESIGN §14.2) on the plant itself. A look recolours the flowers by when she usually waters
 * (Dawn · Sunlit · Twilight · Wildflower), draws them smaller for Petite, and for Paired takes the partner habit's
 * card colour and brings a bee. Classic (no look) keeps the species' own colours.
 *
 * The recolouring keeps every petal's own lightness and takes the look's hue and saturation, so the species' light and
 * dark petals, its shade side and its lamplit version all survive. Foliage species "bloom" as a peak form (a split
 * leaf, a pup), so they have no petals to recolour: their look shows on the tag, and Paired still brings its bee.
 */
import { cloneElement, Fragment, isValidElement, toChildArray, type ComponentChildren, type JSX, type VNode } from 'preact';
import type { PastelKey, PlantSpeciesId } from '@/catalog/types';
import type { BloomColour, BloomShape } from '@/state/types';
import type { Kit } from './kit';
import { channels, f, fromHsl, toHsl } from './math';

/** What a plant's chosen look asks of the drawing. */
export interface PlantLookArt {
  colour: BloomColour;
  shape: BloomShape;
  /** Paired: the partner habit's card colour, which the petals take. */
  partnerColour?: PastelKey;
}

/** The petal inks each flowering species paints (and its buds), as authored. */
export const PETAL_INKS: Partial<Record<PlantSpeciesId, readonly string[]>> = {
  begonia: ['#FCEEF1', '#F5CBD5', '#F0B9C6'],
  catnip: ['#F1E8F4', '#B99BD6'],
  hoya: ['#F5CCD6', '#EDC3CF', '#C9546E'],
  lavender: ['#B4A1E0', '#9C87CD'],
  orchid: ['#F6DAE3', '#EEBFCD', '#EAD4DA', '#D46A8E'],
  strawberry: ['#F8F3EA', '#F3F1E2'],
  violet: ['#A78CD8', '#8F72C9', '#B7A3DC'],
  xmascactus: ['#F4A7C2', '#EE86AB', '#F6C2D2', '#E0567F'],
  tulip: ['#F3A8B8', '#E58CA1'],
  sunflower: ['#F6CF55', '#EDB93C'],
};

/** The card colours (DESIGN §10.1, the -500 faces). */
export const PASTEL_HEX: Readonly<Record<PastelKey, string>> = {
  blush: '#EFB4C1',
  peach: '#DDA088',
  butter: '#F2D98A',
  sage: '#B5CC9C',
  mint: '#A9D3C0',
  sky: '#B3D1E8',
  lavender: '#C8BAE6',
  lilac: '#DDB6DA',
};

/** Each time of day's flower colour: [hue, saturation]. Wildflower mixes the other three and a blush. */
const LOOK_HUE: Readonly<Record<Exclude<BloomColour, 'wildflower'>, readonly [number, number]>> = {
  // Early light: apricot and coral.
  dawn: [14, 0.78],
  // The middle of the day: butter and marigold.
  sunlit: [44, 0.86],
  // After six: wisteria and dusk violet.
  twilight: [262, 0.5],
};
const WILDFLOWER: readonly (readonly [number, number])[] = [[346, 0.66], LOOK_HUE.sunlit, LOOK_HUE.twilight, LOOK_HUE.dawn];

/** Petite draws the flowers at this share of their size. */
export const PETITE_BLOOM = 0.72;

/** The hue and saturation a look paints the `i`-th petal ink in, or null for the species' own colours. */
function hueFor(look: PlantLookArt, i: number): readonly [number, number] | null {
  if (look.shape === 'paired' && look.partnerColour) {
    const [h, s] = toHsl(channels(PASTEL_HEX[look.partnerColour]));
    return [h, Math.max(0.45, s)];
  }
  if (look.colour === 'wildflower') return WILDFLOWER[i % WILDFLOWER.length]!;
  return LOOK_HUE[look.colour];
}

/** One petal ink in a look: its lightness kept (clamped so pale petals still show the colour), the look's hue. */
export function lookInk(hex: string, look: PlantLookArt, i: number): string {
  const hs = hueFor(look, i);
  if (!hs) return hex;
  const [, , l] = toHsl(channels(hex));
  return fromHsl(hs[0], hs[1], Math.min(0.88, Math.max(0.46, l)));
}

/** From-to fills for a species in a look, under the kit's light (a lamplit petal maps to the lamplit new colour). */
export function petalMap(species: PlantSpeciesId, look: PlantLookArt | undefined, k: Kit): ReadonlyMap<string, string> | null {
  const petals = PETAL_INKS[species];
  if (!look || !petals) return null;
  const map = new Map<string, string>();
  petals.forEach((hex, i) => {
    const to = lookInk(hex, look, i);
    map.set(hex.toUpperCase(), to);
    map.set(k.lit(hex).toUpperCase(), k.lit(to));
  });
  return map;
}

const PAINTS = ['fill', 'stroke'] as const;

/** Repaints the petal fills in an element tree (plain elements only; components keep their own colours). */
export function repaint(node: ComponentChildren, map: ReadonlyMap<string, string>): ComponentChildren {
  const items = toChildArray(node);
  const out = items.map((child) => {
    if (!isValidElement(child)) return child;
    const el = child as VNode<Record<string, unknown>>;
    if (typeof el.type !== 'string' && el.type !== Fragment) return el;
    const props: Record<string, unknown> = {};
    for (const key of PAINTS) {
      const v = el.props[key];
      if (typeof v === 'string') {
        const to = map.get(v.toUpperCase());
        if (to) props[key] = to;
      }
    }
    const children = el.props.children as ComponentChildren;
    return cloneElement(el, props, children === undefined ? undefined : repaint(children, map));
  });
  return out.length === 1 ? out[0] : out;
}

/**
 * The visiting bee of a Paired look: a small striped body and two pale wings, hovering beside the flowers on the
 * lit side. Flat and matte; its wings are the paper colour pushed back.
 */
export function Bee({ x, y, k, s = 1 }: { x: number; y: number; k: Kit; s?: number }): JSX.Element {
  const dir = k.away === 0 ? 1 : -k.away;
  return (
    <g data-flourish="bee" transform={`translate(${f(x)} ${f(y)}) scale(${f(s * dir)} ${f(s)})`}>
      <ellipse cx={-0.4} cy={-1.7} rx={1.3} ry={0.9} fill={k.lit('#F4F1FA')} opacity={0.85} transform="rotate(-24 -0.4 -1.7)" />
      <ellipse cx={0.9} cy={-1.5} rx={1.1} ry={0.8} fill={k.lit('#E7E3F2')} opacity={0.85} transform="rotate(18 0.9 -1.5)" />
      <ellipse cx={0} cy={0} rx={2.1} ry={1.4} fill={k.lit('#EFC553')} />
      <path d="M-0.9 -1.3Q-1.3 0 -0.9 1.3L-0.3 1.4Q-0.7 0 -0.3 -1.4ZM0.5 -1.4Q0.1 0 0.5 1.4L1.1 1.2Q0.7 0 1.1 -1.2Z" fill="#4A3F3C" />
      <circle cx={2} cy={-0.1} r={0.8} fill="#4A3F3C" />
      <path d="M-2.1 0A2.1 1.4 0 0 0 2.1 0A2.1 0.8 0 0 1 -2.1 0Z" class="pl-shade" />
    </g>
  );
}

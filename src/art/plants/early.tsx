/** Shared early stages: Seed (0), Sprout (1) and Seedling (2). Species may override 1 and 2. */
import type { Growth, PlantLayers } from './types';
import { BASE_Y, FINE, GREEN, Leaf, OUTLINE, Shine, Stems, type LeafShape } from './parts';
import { lerp } from './math';

const SOIL_DARK = '#7E5A4D';

/**
 * A sleepy seed peeking out of the soil, big enough to read on a 40px card. It cracks and shows
 * a green tip as progress fills; the soil around it is pushed up in little crumbs.
 */
export function seed(g: Growth, coat: string, stripes?: string): PlantLayers {
  const p = g.progress;
  return {
    back: (
      <g transform="translate(50 54) rotate(-12)" stroke-linecap="round" stroke-linejoin="round">
        {p >= 0.72 && <Leaf x={1.2} y={-8.2} rot={28} L={lerp(6, 10, (p - 0.72) / 0.28)} W={2.8} shape="round" fill={GREEN.light} vein={null} />}
        <ellipse rx={7.6} ry={9.2} fill={coat} stroke={OUTLINE} stroke-width={FINE} />
        {stripes && (
          <g fill="none" stroke={stripes} stroke-width={1.5}>
            <path d="M-3.6 -7.6 Q-6.6 -2 -5.6 4.6" />
            <path d="M3.6 -7.6 Q6.6 -2 5.6 4.6" />
          </g>
        )}
        {p >= 0.4 && <path d="M-3.4 -6.6 L-1.2 -4.4 L0.8 -6.8 L3 -4.6" fill="none" stroke={OUTLINE} stroke-width={1.3} />}
        <g fill="none" stroke={OUTLINE} stroke-width={1.3}>
          <path d="M-4 0.6 Q-2.9 1.8 -1.8 0.6" />
          <path d="M1.8 0.6 Q2.9 1.8 4 0.6" />
        </g>
        <g fill="#FF9FB8" opacity={0.7}>
          <ellipse cx={-4.4} cy={3.2} rx={1.6} ry={1} />
          <ellipse cx={4.4} cy={3.2} rx={1.6} ry={1} />
        </g>
        <Shine d="M-4.4 -2.6 Q-4.2 -5.2 -2.2 -6.4" w={1.4} />
      </g>
    ),
    ground: (
      <g fill={SOIL_DARK} stroke={OUTLINE} stroke-width={0.9}>
        <circle cx={39} cy={62.8} r={1.3} />
        <circle cx={60.6} cy={62} r={1.5} />
        <circle cx={64.4} cy={64} r={1} />
      </g>
    ),
  };
}

export interface EarlyStyle {
  leaf?: string;
  shape?: LeafShape;
}

/** Two round cotyledons on a short stem, just like Mochi's head sprout. */
export function sprout(g: Growth, { leaf = GREEN.leaf }: EarlyStyle = {}): PlantLayers {
  const p = g.progress;
  const top = BASE_Y - 2 - lerp(14, 18, p);
  const L = lerp(14, 17, p);
  return {
    back: (
      <g>
        <Stems paths={[`M50 ${BASE_Y + 2} C50 ${top + 6} 50.4 ${top + 3} 50.8 ${top}`]} w={2.6} />
        <Leaf x={50.6} y={top + 0.6} rot={-64} L={L} W={L * 0.42} shape="round" fill={leaf} />
        <Leaf x={50.8} y={top + 0.4} rot={60} L={L * 0.94} W={L * 0.4} shape="round" fill={leaf} />
        {p >= 0.6 && <Leaf x={50.8} y={top + 0.8} rot={6} L={lerp(4, 6.5, (p - 0.6) / 0.4)} W={2} shape="round" fill={GREEN.light} vein={null} />}
      </g>
    ),
  };
}

/**
 * The sprout's cotyledons, still full size, droop just above the soil while the first pair of
 * true leaves opens in a V on top (a third one unfurls between them as progress fills).
 */
export function seedling(g: Growth, { leaf = GREEN.leaf, shape = 'oval' }: EarlyStyle = {}): PlantLayers {
  const p = g.progress;
  const top = BASE_Y - 2 - lerp(16, 19, p);
  const L = lerp(14, 16.5, p);
  const C = 15;
  return {
    back: (
      <g>
        <Stems paths={[`M50 ${BASE_Y + 2} C50 ${top + 10} 49.4 ${top + 5} 50 ${top}`]} w={2.8} />
        <Leaf x={49.6} y={BASE_Y - 7.4} rot={-80} L={C} W={C * 0.42} shape="round" fill={leaf} />
        <Leaf x={50.4} y={BASE_Y - 7.8} rot={78} L={C * 0.95} W={C * 0.4} shape="round" fill={leaf} />
        {p >= 0.5 && <Leaf x={50} y={top + 1} rot={-3} L={lerp(6, 11, (p - 0.5) / 0.5)} W={lerp(2.4, 4, (p - 0.5) / 0.5)} shape={shape} fill={GREEN.light} />}
        <Leaf x={49.6} y={top + 1} rot={-38} L={L} W={L * 0.4} shape={shape} fill={leaf} />
        <Leaf x={50.4} y={top + 1} rot={36} L={L * 0.94} W={L * 0.38} shape={shape} fill={leaf} />
      </g>
    ),
  };
}

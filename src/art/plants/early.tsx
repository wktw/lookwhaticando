/** Shared early stages: Seed (0), Sprout (1) and Seedling (2). Species may override 1 and 2. */
import type { Growth, PlantLayers } from './types';
import { BASE_Y, FINE, GREEN, Leaf, OUTLINE, Shine, Stems, type LeafShape } from './parts';
import { lerp } from './math';

/** A sleepy seed peeking out of the soil; it cracks and shows a green tip as progress fills. */
export function Seed({ g, coat }: { g: Growth; coat: string }) {
  const p = g.progress;
  return (
    <g transform="translate(50 55.4) rotate(-12)">
      {p >= 0.72 && <Leaf x={0.8} y={-6.2} rot={26} L={lerp(5, 8, (p - 0.72) / 0.28)} W={2.3} shape="round" fill={GREEN.light} vein={null} />}
      <ellipse rx={6} ry={7.4} fill={coat} stroke={OUTLINE} stroke-width={FINE} />
      {p >= 0.4 && <path d="M-2.8 -5.2 L-0.9 -3.5 L0.6 -5.4 L2.4 -3.7" fill="none" stroke={OUTLINE} stroke-width={1.2} stroke-linejoin="round" stroke-linecap="round" />}
      <g fill="none" stroke={OUTLINE} stroke-width={1.1} stroke-linecap="round">
        <path d="M-3.4 0.2 Q-2.4 1.2 -1.4 0.2" />
        <path d="M1.4 0.2 Q2.4 1.2 3.4 0.2" />
      </g>
      <g fill="#FF9FB8" opacity={0.7}>
        <ellipse cx={-3.9} cy={2.3} rx={1.3} ry={0.8} />
        <ellipse cx={3.9} cy={2.3} rx={1.3} ry={0.8} />
      </g>
      <Shine d="M-3.4 -2.4 Q-3.2 -4.4 -1.6 -5.2" w={1.3} />
    </g>
  );
}

export interface EarlyStyle {
  leaf?: string;
  shape?: LeafShape;
}

/** Two round cotyledons on a short stem, just like Mochi's head sprout. */
export function sprout(g: Growth, { leaf = GREEN.leaf }: EarlyStyle = {}): PlantLayers {
  const p = g.progress;
  const top = BASE_Y - 2 - lerp(11, 15, p);
  const L = lerp(12, 14.5, p);
  return {
    back: (
      <g>
        <Stems paths={[`M50 ${BASE_Y + 2} C50 ${top + 6} 50.4 ${top + 3} 50.8 ${top}`]} w={2.4} />
        <Leaf x={50.6} y={top + 0.6} rot={-64} L={L} W={L * 0.42} shape="round" fill={leaf} />
        <Leaf x={50.8} y={top + 0.4} rot={60} L={L * 0.94} W={L * 0.4} shape="round" fill={leaf} />
        {p >= 0.6 && <Leaf x={50.8} y={top + 0.8} rot={6} L={lerp(3, 5, (p - 0.6) / 0.4)} W={1.6} shape="round" fill={GREEN.light} vein={null} />}
      </g>
    ),
  };
}

/** Cotyledons low on the stem and the first pair of true leaves on top. */
export function seedling(g: Growth, { leaf = GREEN.leaf, shape = 'oval' }: EarlyStyle = {}): PlantLayers {
  const p = g.progress;
  const top = BASE_Y - 2 - lerp(20, 26, p);
  const L = lerp(13, 15.5, p);
  const midY = lerp(BASE_Y - 2, top, 0.55);
  return {
    back: (
      <g>
        <Stems paths={[`M50 ${BASE_Y + 2} C50 ${top + 10} 49.4 ${top + 5} 50 ${top}`]} w={2.6} />
        <Leaf x={50} y={BASE_Y - 8.4} rot={-76} L={9.4} W={3.8} shape="round" fill={GREEN.leaf} vein={null} />
        <Leaf x={50} y={BASE_Y - 8.8} rot={74} L={9} W={3.6} shape="round" fill={GREEN.leaf} vein={null} />
        {p >= 0.5 && <Leaf x={50} y={midY} rot={66} L={lerp(6, 10, (p - 0.5) / 0.5)} W={3.4} shape={shape} fill={leaf} />}
        <Leaf x={49.8} y={top + 1} rot={-46} L={L} W={L * 0.36} shape={shape} fill={leaf} />
        <Leaf x={50.2} y={top + 1} rot={42} L={L * 0.92} W={L * 0.34} shape={shape} fill={leaf} />
        <Leaf x={50} y={top + 0.6} rot={-2} L={5} W={1.8} shape="round" fill={GREEN.light} vein={null} />
      </g>
    ),
  };
}

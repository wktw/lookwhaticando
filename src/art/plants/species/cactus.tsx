import type { Growth, PlantSpeciesArt } from '../types';
import { EYE } from '../../pets/geometry';
import { Blossom, FINE, Leaf, OUTLINE, PetalRing, STROKE, Shine, Stems } from '../parts';
import { f, lerp } from '../math';

const BODY = '#9FD7A8';
const RIB = '#7FBF8D';
const FLOWER = '#FF9FB8';
const FLOWER_LIGHT = '#FFC9D6';

/** Rounded column body from the soil up to `top`, half-width `w`, with a gentle belly. */
function bodyD(x: number, top: number, w: number, bottom = 66): string {
  const mid = (top + bottom) / 2;
  return `M${f(x - w)} ${bottom} C${f(x - w * 1.08)} ${f(mid)} ${f(x - w * 1.02)} ${f(top + w * 0.9)} ${f(x - w * 0.72)} ${f(top + w * 0.3)} C${f(x - w * 0.45)} ${f(top - w * 0.06)} ${f(x + w * 0.45)} ${f(top - w * 0.06)} ${f(x + w * 0.72)} ${f(top + w * 0.3)} C${f(x + w * 1.02)} ${f(top + w * 0.9)} ${f(x + w * 1.08)} ${f(mid)} ${f(x + w)} ${bottom} Z`;
}

/** A tiny tuft of three spines. */
function Spines({ x, y }: { x: number; y: number }) {
  return <path d={`M${f(x - 1.3)} ${f(y - 0.9)} L${f(x)} ${f(y)} L${f(x + 1.3)} ${f(y - 0.9)} M${f(x)} ${f(y)} L${f(x)} ${f(y - 1.5)}`} />;
}

/** Cactus column with ribs, spines, a shy little face and a soft highlight. `bottom` tucks it behind the rim. */
function Column({ x, top, w, bottom = 66, face = true }: { x: number; top: number; w: number; bottom?: number; face?: boolean }) {
  const h = bottom - top;
  const eyeY = top + Math.min(h * 0.36, w * 1.3);
  const e = Math.min(1, w / 9);
  return (
    <g stroke-linejoin="round" stroke-linecap="round">
      <path d={bodyD(x, top, w, bottom)} fill={BODY} stroke={OUTLINE} stroke-width={STROKE} />
      <g fill="none" stroke={RIB} stroke-width={1.4}>
        <path d={`M${f(x - w * 0.52)} ${f(top + w * 0.7)} Q${f(x - w * 0.62)} ${f(top + h * 0.55)} ${f(x - w * 0.55)} ${bottom}`} />
        <path d={`M${f(x + w * 0.52)} ${f(top + w * 0.7)} Q${f(x + w * 0.62)} ${f(top + h * 0.55)} ${f(x + w * 0.55)} ${bottom}`} />
      </g>
      <g fill="none" stroke={OUTLINE} stroke-width={1} opacity={0.55}>
        <Spines x={x - w * 0.58} y={top + h * 0.3} />
        <Spines x={x + w * 0.6} y={top + h * 0.48} />
        {h > 22 && <Spines x={x - w * 0.62} y={top + h * 0.66} />}
        {h > 22 && <Spines x={x + w * 0.55} y={top + h * 0.16} />}
      </g>
      <Shine d={`M${f(x - w * 0.72)} ${f(top + w * 0.9)} Q${f(x - w * 0.82)} ${f(top + w * 1.6)} ${f(x - w * 0.8)} ${f(top + w * 2.2)}`} w={1.6} opacity={0.6} />
      {face && (
        <g>
          <g fill="#FF9FB8" opacity={0.6}>
            <ellipse cx={f(x - w * 0.52)} cy={f(eyeY + 3.2 * e)} rx={f(2.4 * e)} ry={f(1.4 * e)} />
            <ellipse cx={f(x + w * 0.52)} cy={f(eyeY + 3.2 * e)} rx={f(2.4 * e)} ry={f(1.4 * e)} />
          </g>
          <g fill={EYE}>
            <ellipse cx={f(x - w * 0.3)} cy={f(eyeY)} rx={f(1.3 * e)} ry={f(1.7 * e)} />
            <ellipse cx={f(x + w * 0.3)} cy={f(eyeY)} rx={f(1.3 * e)} ry={f(1.7 * e)} />
          </g>
          <g fill="#fff">
            <circle cx={f(x - w * 0.3 + 0.5 * e)} cy={f(eyeY - 0.7 * e)} r={f(0.5 * e)} />
            <circle cx={f(x + w * 0.3 + 0.5 * e)} cy={f(eyeY - 0.7 * e)} r={f(0.5 * e)} />
          </g>
          <path d={`M${f(x - 1.4 * e)} ${f(eyeY + 2 * e)} Q${f(x)} ${f(eyeY + 3.4 * e)} ${f(x + 1.4 * e)} ${f(eyeY + 2 * e)}`} fill="none" stroke={OUTLINE} stroke-width={1.1} />
        </g>
      )}
    </g>
  );
}

/** Big flowers get a double ring of petals; small ones a simple five-petal blossom that stays pink, never a dark blot. */
function CactusFlower({ x, y, r }: { x: number; y: number; r: number }) {
  if (r < 5) return <Blossom x={x} y={y} r={r} petal={FLOWER_LIGHT} center="#FFE08A" line={1.1} />;
  return (
    <g>
      <PetalRing x={x} y={y} r={r} n={8} inner={r * 0.2} width={r * 0.24} fill={FLOWER} shape="oval" line={1.7} />
      <PetalRing x={x} y={y} r={r * 0.62} n={6} inner={r * 0.1} width={r * 0.2} fill={FLOWER_LIGHT} shape="oval" rot={30} line={1.3} />
      <circle cx={f(x)} cy={f(y)} r={f(r * 0.2)} fill="#FFE08A" stroke={OUTLINE} stroke-width={1.1} />
    </g>
  );
}

function CactusBud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`} stroke={OUTLINE} stroke-width={f(1.7 / s)} stroke-linejoin="round">
      <path d="M0 -8 C-3.8 -6 -4 -1 0 0.6 C4 -1 3.8 -6 0 -8 Z" fill={FLOWER} />
      <path d="M-3.6 -1.4 L-2 -3.6 L0 -2 L2 -3.6 L3.6 -1.4 C2 0.8 -2 0.8 -3.6 -1.4 Z" fill={BODY} />
    </g>
  );
}

interface Arm {
  side: -1 | 1;
  y: number;
  len: number;
}

function armD(x: number, w: number, { side, y, len }: Arm): string {
  const out = x + side * (w + 5.5);
  return `M${f(x + side * w * 0.3)} ${f(y)} L${f(x + side * (w + 2))} ${f(y)} Q${f(out)} ${f(y)} ${f(out)} ${f(y - 4)} L${f(out)} ${f(y - len)}`;
}

const armTip = (x: number, w: number, a: Arm): [number, number] => [x + a.side * (w + 5.5), a.y - a.len - 3.4];

interface Shape {
  top: number;
  w: number;
  arms: Arm[];
  /** Flowers: [x, y, r]; r = 0 draws a bud. */
  flowers: [number, number, number, number?][];
}

function shape(g: Growth): Shape {
  const p = g.progress;
  switch (g.stage) {
    case 2:
      return { top: 62 - lerp(17, 20, p), w: lerp(9, 10, p), arms: [], flowers: [] };
    case 3:
      return { top: lerp(38, 34, p), w: 10.5, arms: [], flowers: [] };
    case 4: {
      const top = lerp(33, 30, p);
      return { top, w: 11, arms: [{ side: -1, y: 50, len: lerp(5, 9, p) }], flowers: [[50, top - 1, 0, lerp(0.7, 1.05, p)]] };
    }
    case 5: {
      const w = 11.5;
      const arms: Arm[] = [{ side: -1, y: 48, len: 11 }];
      const [ax, ay] = armTip(50, w, arms[0]!);
      return { top: 27, w, arms, flowers: [[50, 25.5, lerp(5.6, 6.8, p)], ...(p >= 0.5 ? [[ax, ay, 0, 0.7] as [number, number, number, number]] : [])] };
    }
    case 6: {
      const w = 11.5;
      const arms: Arm[] = [
        { side: -1, y: 47, len: 12 },
        { side: 1, y: 42, len: 8 },
      ];
      const l = armTip(50, w, arms[0]!);
      const r = armTip(50, w, arms[1]!);
      return { top: 22, w, arms, flowers: [[50, 20.5, 7], [l[0], l[1], 5], [r[0], r[1], p >= 0.5 ? 5 : 0, 0.75]] };
    }
    default: {
      const w = 12;
      const arms: Arm[] = [
        { side: -1, y: 45, len: 14 },
        { side: 1, y: 40, len: 11 },
      ];
      const l = armTip(50, w, arms[0]!);
      const r = armTip(50, w, arms[1]!);
      return {
        top: 18,
        w,
        arms,
        flowers: [[50, 16.5, 7.4], [l[0], l[1], 5.4], [r[0], r[1], 5.2], ...EXTRA.slice(0, g.blooms)],
      };
    }
  }
}

/** Extra flowers after Evergreen, seated on the silhouette: shoulders, arm sides, the pup's crown. */
const EXTRA: [number, number, number][] = [
  [41.6, 21.4, 3.8],
  [58.4, 21.4, 3.8],
  [27, 38, 3.6],
  [73.4, 33, 3.6],
  [66.5, 50.6, 3.4],
  [38.4, 31, 3.4],
];

/** Evergreen's pup, tucked in beside its parent (clear of the arms) with its own little face. */
const PUP = { x: 66.5, top: 52, w: 5.8, bottom: 70 };

export const cactus: PlantSpeciesArt = {
  seed: '#D8C2A0',
  render: (g) => {
    if (g.stage === 1) {
      const r = lerp(7, 8.4, g.progress);
      const cy = 61 - r * 0.55;
      return {
        back: (
          <g>
            <Leaf x={48.8} y={cy - r * 0.72} rot={-42} L={8} W={4} shape="round" fill={BODY} vein={null} />
            <Leaf x={51.2} y={cy - r * 0.72} rot={40} L={7.4} W={3.8} shape="round" fill={BODY} vein={null} />
            <circle cx={50} cy={f(cy)} r={f(r)} fill={BODY} stroke={OUTLINE} stroke-width={FINE} />
            <Shine d={`M${f(50 - r * 0.6)} ${f(cy - r * 0.1)} Q${f(50 - r * 0.55)} ${f(cy - r * 0.5)} ${f(50 - r * 0.2)} ${f(cy - r * 0.62)}`} w={1.3} />
          </g>
        ),
      };
    }
    const sh = shape(g);
    return {
      back: (
        <g>
          {g.stage >= 7 && <Column {...PUP} />}
          <Stems paths={sh.arms.map((a) => armD(50, sh.w, a))} w={7.6} color={BODY} line={STROKE} />
          <Column x={50} top={sh.top} w={sh.w} />
          {sh.flowers.map(([x, y, r, s], i) => (r > 0 ? <CactusFlower key={i} x={x} y={y} r={r} /> : <CactusBud key={i} x={x} y={y + 2} s={s ?? 1} />))}
        </g>
      ),
    };
  },
};

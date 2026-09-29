import type { Growth, PlantSpeciesArt } from '../types';
import { Blossom, OUTLINE, Stems, leafD } from '../parts';
import { f, lerp } from '../math';

const LEAF = '#AEDDC8';
const LEAF_BACK = '#90CBB2';
const TIP = '#F7A8BC';
const FLOWER = '#FFB294';
const BUD = '#FFA487';
/** A touch finer than other leaves: rosettes stack many outlines. */
const LINE = 1.7;

/** Plump echeveria leaf with a blushing pink tip. */
function SucculentLeaf({ x, y, rot, L, W, fill }: { x: number; y: number; rot: number; L: number; W: number; fill: string }) {
  const outline = leafD('oval', L, W);
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)})`} stroke-linejoin="round">
      <path d={outline} fill={fill} />
      <path d={leafD('oval', L * 0.24, W * 0.42)} transform={`translate(0 ${f(-L * 0.76)})`} fill={TIP} />
      <path d={outline} fill="none" stroke={OUTLINE} stroke-width={LINE} />
      <path d={`M${f(-W * 0.5)} ${f(-L * 0.24)} Q${f(-W * 0.55)} ${f(-L * 0.48)} ${f(-W * 0.32)} ${f(-L * 0.62)}`} fill="none" stroke="#fff" stroke-width={1.3} stroke-linecap="round" opacity={0.55} />
    </g>
  );
}

/**
 * Side view of an echeveria rosette: a back ring reaching up, a middle ring reaching out,
 * and plump front leaves facing you. Small rosettes (pups) skip the middle ring.
 */
function Rosette({ x, y, s, pup = false }: { x: number; y: number; s: number; pup?: boolean }) {
  const ring = (angles: number[], L: number, W: number, fill: string) =>
    angles.map((a) => <SucculentLeaf key={a} x={x} y={y} rot={a} L={L * s} W={W * s} fill={fill} />);
  return (
    <g>
      {ring(pup ? [-50, 0, 50] : [-68, -34, 0, 34, 68], 15.5, 6.6, LEAF_BACK)}
      {!pup && ring([-98, -56, 56, 98], 14.5, 7, LEAF)}
      {ring([-122, 122], 12, 6.6, LEAF)}
      {ring([-16, 16], 9, 4.6, '#C4E8D6')}
      <SucculentLeaf x={x} y={y + 6 * s} rot={0} L={11 * s} W={7.4 * s} fill={LEAF} />
    </g>
  );
}

interface Stalk {
  d: string;
  /** Flowers (or buds) along the stalk tip: [x, y]. */
  at: [number, number][];
}

const STALKS: Stalk[] = [
  { d: 'M53 54 C59 45 66 38 67 24', at: [[67, 23], [63.4, 28.6], [69.6, 29.4]] },
  { d: 'M47 54 C41 45 34 36 32 21', at: [[32, 20], [35.6, 25.8], [29, 26.4]] },
  { d: 'M50 52 C50 38 51 24 52 9', at: [[52, 8], [48.6, 13.4], [55.2, 14.2], [51.4, 19]] },
];

function stalks(g: Growth): { list: Stalk[]; open: number } {
  switch (g.stage) {
    case 4:
      return { list: STALKS.slice(0, 1), open: 0 };
    case 5:
      return { list: STALKS.slice(0, g.progress >= 0.5 ? 2 : 1), open: 1 };
    case 6:
      return { list: STALKS.slice(0, 2), open: 2 };
    case 7:
      return { list: STALKS, open: 3 };
    default:
      return { list: [], open: 0 };
  }
}

/** Extra flowers after Evergreen, along the stalks. */
const EXTRA: [number, number][] = [
  [65.4, 35],
  [33.2, 32],
  [48.4, 24.6],
  [55.6, 21],
  [71.6, 18.6],
  [27.6, 15.4],
];

export const succulent: PlantSpeciesArt = {
  seed: '#D9C3A5',
  render: (g) => {
    const p = g.progress;
    if (g.stage === 1) {
      const L = lerp(10, 13, p);
      return {
        front: (
          <g>
            <SucculentLeaf x={49.4} y={61} rot={-26} L={L} W={5.2} fill={LEAF} />
            <SucculentLeaf x={50.6} y={61} rot={24} L={L * 0.95} W={5} fill={LEAF} />
          </g>
        ),
      };
    }
    const s = g.stage === 2 ? lerp(0.74, 0.88, p) : [0, 0, 0, lerp(1, 1.12, p), lerp(1.16, 1.22, p), lerp(1.24, 1.28, p), lerp(1.3, 1.35, p), 1.38][g.stage]!;
    const { list, open } = stalks(g);
    const flowers = list.flatMap((st, i) => st.at.map(([x, y], j) => ({ x, y, open: i < open && j < 2 + (g.stage >= 6 ? 1 : 0) })));
    const extra = EXTRA.slice(0, g.blooms).map(([x, y]) => ({ x, y, open: true }));
    return {
      back: list.length ? (
        <g>
          <Stems paths={list.map((st) => st.d)} w={2} color="#B5DDBF" />
          {[...flowers, ...extra].map((fl, i) =>
            fl.open ? (
              <Blossom key={i} x={fl.x} y={fl.y} r={3.8} petal={FLOWER} center="#FFE08A" line={1.5} />
            ) : (
              <ellipse key={i} cx={fl.x} cy={fl.y} rx={f(lerp(1.8, 2.5, g.stage === 4 ? p : 1))} ry={f(lerp(2.2, 3, g.stage === 4 ? p : 1))} fill={BUD} stroke={OUTLINE} stroke-width={1.5} />
            ),
          )}
        </g>
      ) : null,
      front: (
        <g>
          {g.stage >= 6 && <Rosette x={25} y={64.5} s={0.66} pup />}
          {(g.stage >= 7 || (g.stage === 6 && p >= 0.6)) && <Rosette x={75.5} y={64.8} s={g.stage >= 7 ? 0.7 : 0.56} pup />}
          <Rosette x={50} y={58.5} s={s} />
        </g>
      ),
    };
  },
};

/**
 * The coin jar (DESIGN §6): a jam jar of brass coins with a scrap of gingham tied over the lid. Its
 * fill follows the wallet, eased so the first coins show and a full jar takes a while.
 */
import type { JSX } from 'preact';
import { DAY_LIGHT, type Light } from '@/art/light';
import { CRESCENTS } from '../crescent/data';
import { JAR_COLORS as C } from '../palette';
import { seeded } from '../sill/scenery';
import { JAR } from './shapes';

/** The jar looks full at this many coins. */
export const JAR_FULL = 1000;
/** Fill levels drawn (each one is memoised). */
export const JAR_LEVELS = 12;

/** The y of the top of the heap on the jar's 100 canvas (where a new coin comes to rest). */
export function pileTop(coins: number): number {
  const { floor, top } = JAR.inner;
  return floor - ((floor - top) * jarLevel(coins)) / JAR_LEVELS - 1.6;
}

/** Fill level 0…JAR_LEVELS for a coin balance: any coins show at least one layer; the curve eases out. */
export function jarLevel(coins: number): number {
  const c = Number.isFinite(coins) ? Math.max(0, coins) : 0;
  if (c <= 0) return 0;
  return Math.max(1, Math.min(JAR_LEVELS, Math.round(Math.sqrt(c / JAR_FULL) * JAR_LEVELS)));
}

interface Pile {
  /** The body of the heap seen between the coins. */
  mass: string;
  rims: string;
  faces: string;
  /** The pressed leaf on each coin that faces us. */
  marks: string;
  /** Coins lying flat on top of the heap. */
  flatEdges: string;
  flatFaces: string;
}

const f = (n: number) => +n.toFixed(2);
const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;

const piles = new Map<number, Pile>();

/**
 * A heap of coins up to `level`, higher in the middle. Against the glass the coins show their faces
 * (rows of discs, each with its pressed leaf); on top a few lie flat. One path per tone.
 */
export function coinPile(level: number): Pile {
  const hit = piles.get(level);
  if (hit) return hit;
  const r = seeded(29);
  const { x0, x1, floor, top } = JAR.inner;
  const surface = floor - ((floor - top) * level) / JAR_LEVELS;
  const mound = (x: number) => surface - Math.cos(((x - (x0 + x1) / 2) / (x1 - x0)) * Math.PI) * 1.6;
  const pile: Pile = { mass: '', rims: '', faces: '', marks: '', flatEdges: '', flatFaces: '' };
  if (level > 0) {
    let mass = `M${x0} ${floor}`;
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 10) mass += `L${f(x)} ${f(mound(x) + 1)}`;
    pile.mass = `${mass}L${x1} ${floor}Z`;
    const R = 3.5;
    const rims: string[] = [];
    const faces: string[] = [];
    const marks: string[] = [];
    let row = 0;
    for (let y = floor - R + 0.4; y > top - R; y -= R * 1.55, row++) {
      for (let x = x0 + R + (row % 2 ? R * 0.95 : 0.2); x < x1 - R + 0.6; x += R * 1.9) {
        const cx = x + (r() - 0.5) * 1.6;
        if (y - R * 0.4 < mound(cx)) continue;
        const cy = y + (r() - 0.5) * 1.2;
        const rr = R * (0.88 + r() * 0.2);
        const squash = r() < 0.3 ? 0.5 + r() * 0.25 : 0.84 + r() * 0.16;
        rims.push(oval(cx, cy, rr, rr * squash));
        faces.push(oval(cx - 0.35, cy - 0.3, rr - 0.85, (rr - 0.85) * squash));
        if (squash > 0.8) marks.push(oval(cx - 0.4, cy - 0.3, 0.55, 1.2 * squash));
      }
    }
    const edges: string[] = [];
    const flats: string[] = [];
    for (let x = x0 + 4.6; x < x1 - 4; x += 7 + r() * 3) {
      const cy = mound(x) + 0.6;
      const ry = 1.1 + r() * 0.8;
      edges.push(oval(x, cy + 0.8, 4.2, ry));
      flats.push(oval(x, cy, 4.2, ry));
    }
    Object.assign(pile, { rims: rims.join(''), faces: faces.join(''), marks: marks.join(''), flatEdges: edges.join(''), flatFaces: flats.join('') });
  }
  piles.set(level, pile);
  return pile;
}

/** Gingham bands inside the cap's trapezoid (JAR.cap: 34…66 at y 30.5, 29.5…70.5 at y 42). */
const GINGHAM = (() => {
  const [yt, yb] = [30.5, 42];
  const left = (y: number) => 34 - ((y - yt) / (yb - yt)) * 4.5 + 0.3;
  const right = (y: number) => 66 + ((y - yt) / (yb - yt)) * 4.5 - 0.3;
  const v = [37.2, 44.6, 52, 59.4].map((x) => `M${x} ${yt}h3.4V${yb}h-3.4Z`).join('');
  const band = (a: number, b: number) => `M${f(left(a))} ${a}L${f(right(a))} ${a}L${f(right(b))} ${b}L${f(left(b))} ${b}Z`;
  return { v, h: band(33.2, 35.4) + band(38, 40.2) };
})();

export interface CoinJarProps {
  coins: number;
  light?: Light;
  class?: string;
  style?: JSX.CSSProperties;
}

export function CoinJar({ coins, light = DAY_LIGHT, class: cls, style }: CoinJarProps) {
  const pile = coinPile(jarLevel(coins));
  const from = light.night ? 'right' : light.from;
  const lit = from === 'right' ? 62.5 : 34.5;
  const shine = light.night ? '#FFE8C2' : '#FFFFFF';
  return (
    <svg class={cls} style={style} viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" overflow="visible">
      <ellipse cx={50} cy={94} rx={23} ry={2.6} fill="var(--contact)" />
      {pile.mass && <path d={pile.mass} fill={C.coinDeep} />}
      <path d={pile.rims} fill={C.coinEdge} />
      <path d={pile.faces} fill={C.coin} />
      <path d={pile.marks} fill={C.coinEdge} opacity={0.7} />
      <path d={pile.flatEdges} fill={C.coinEdge} />
      <path d={pile.flatFaces} fill={C.coin} />
      <path d={JAR.body} fill={C.glass} opacity={0.36} />
      <path d={CRESCENTS['jar.body']![from]} fill="var(--shade)" />
      <rect x={lit} y={52} width={2.6} height={32} rx={1.3} fill={shine} opacity={0.72} />
      <rect x={lit + (from === 'right' ? -4.2 : 4.2)} y={56} width={1.2} height={9} rx={0.6} fill={shine} opacity={0.5} />
      <path d={JAR.neck} fill={C.glassEdge} opacity={0.9} />
      {/* the gingham scrap: blush with white bands, darker where the bands cross */}
      <path d={JAR.cap} fill={C.gingham} />
      <path d={GINGHAM.v} fill={C.check} opacity={0.42} />
      <path d={GINGHAM.h} fill={C.check} opacity={0.42} />
      <path d={CRESCENTS['jar.cap']![from]} fill="var(--shade)" />
      {/* twine round the neck, with a small bow */}
      <path d="M32.6 43.6C44 45.4 56 45.4 67.4 43.6M55 44.6c-2.4-3-5-2.6-4.2-0.2 0.8 2.2 3.4 1.6 4.2 0.2 1.4-2.4 4.8-2.4 4.4-0.2-0.4 2-3.6 1.8-4.4 0.2M55 44.8l-2.4 6M55 44.8l2 5.6" fill="none" stroke={C.twine} stroke-width={0.8} stroke-linecap="round" />
    </svg>
  );
}

/** Moo Moo Milk Bar decor: hay bale, picnic blanket, little barn. */
import { DETAIL, HEART, INK, OUTLINE, Shadow, Shine, type DecorRenderer } from './kit';

const HAY = '#F7DC8F';
const HAY_TOP = '#FCEAB4';
const HAY_SIDE = '#E8C46E';
const STRAW = '#D4AB55';

/** A plump rectangular bale, tied with twine, with a daisy tucked in. */
export const hayBale: DecorRenderer = () => (
  <g>
    <Shadow rx={38} />
    <g {...INK}>
      <path d="M13 49 L22 38 L88 38 L81 49 Z" fill={HAY_TOP} />
      <path d="M81 49 L88 38 L88 83 L81 93 Z" fill={HAY_SIDE} />
      <rect x={12} y={48} width={70} height={45} rx={6} fill={HAY} />
    </g>
    <g stroke={STRAW} stroke-width={1.5} stroke-linecap="round">
      <path d="M18 60 l6 -2" />
      <path d="M22 76 l5 1.5" />
      <path d="M40 58 l5 -1" />
      <path d="M44 84 l6 -1.5" />
      <path d="M68 62 l4 2" />
      <path d="M66 80 l5 -1" />
      <path d="M30 43 l6 -1" />
      <path d="M62 42 l6 0" />
    </g>
    {/* twine */}
    <g stroke="#C98F6A" stroke-width={3.2} stroke-linecap="round" fill="none">
      <path d="M31 93 L31 48 L38 38" />
      <path d="M62 93 L62 48 L68.5 38" />
    </g>
    {/* stray straws */}
    <g {...DETAIL} stroke={STRAW} stroke-width={1.8}>
      <path d="M12 58 L6 55" />
      <path d="M12 68 L5.5 69" />
      <path d="M46 38 L44 31" />
      <path d="M52 38 L55 32" />
    </g>
    <g transform="translate(31 60)">
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 3.6} cy={-Math.cos((a * Math.PI) / 180) * 3.6} r={3} fill="#FFFDF7" stroke={OUTLINE} stroke-width={1.2} />
      ))}
      <circle r={2.2} fill="#FFD65C" stroke={OUTLINE} stroke-width={1.1} />
    </g>
    <Shine cx={20} cy={58} rx={2.4} ry={6} rotate={0} opacity={0.45} />
  </g>
);

/* The blanket is a trapezoid on the ground; gingham is drawn as stripes in perspective. */
const BACK = { y: 64, l: 20, r: 80 };
const FRONT = { y: 91, l: 5, r: 95 };
function at(u: number, v: number): string {
  const y = BACK.y + (FRONT.y - BACK.y) * v;
  const l = BACK.l + (FRONT.l - BACK.l) * v;
  const r = BACK.r + (FRONT.r - BACK.r) * v;
  return `${(l + (r - l) * u).toFixed(2)} ${y.toFixed(2)}`;
}
const quad = (u0: number, u1: number, v0: number, v1: number) => `M${at(u0, v0)} L${at(u1, v0)} L${at(u1, v1)} L${at(u0, v1)} Z`;
const COLS = [1, 3, 5].map((i) => quad(i / 7, (i + 1) / 7, 0, 1));
const ROWS = [1, 3].map((i) => quad(0, 1, i / 5, (i + 1) / 5));

function Strawberry({ x, y, tilt = 0 }: { x: number; y: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(1.25)`}>
      <path d="M0 5.2 C-3.2 4 -4.6 0.4 -4.2 -1.8 C-3.8 -3.8 -1.8 -4.2 0 -3.6 C1.8 -4.2 3.8 -3.8 4.2 -1.8 C4.6 0.4 3.2 4 0 5.2 Z" fill="#FF7F92" {...INK} stroke-width={1.7} />
      <path d="M-3.4 -3.4 L-1.2 -2.4 L0 -4.4 L1.2 -2.4 L3.4 -3.4 L2 -5 L0 -4.6 L-2 -5 Z" fill="#8EC07C" stroke={OUTLINE} stroke-width={1} stroke-linejoin="round" />
      <g fill="#FFF3C2">
        <circle cx={-1.8} cy={-0.6} r={0.55} />
        <circle cx={1.6} cy={-0.4} r={0.55} />
        <circle cx={-0.2} cy={1.4} r={0.55} />
        <circle cx={-1.4} cy={2.8} r={0.5} />
        <circle cx={1.2} cy={2.6} r={0.5} />
      </g>
    </g>
  );
}

/** Gingham, a basket, and nowhere to be. */
export const picnicBlanket: DecorRenderer = () => (
  <g>
    <Shadow cy={92.5} rx={46} ry={3} />
    <path d={quad(0, 1, 0, 1)} fill="#FFF9F7" />
    <g fill="#F7A1B9" opacity={0.5}>
      {COLS.map((d) => (
        <path key={d} d={d} />
      ))}
      {ROWS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
    <path d={quad(0, 1, 0, 1)} fill="none" {...INK} />
    {/* picnic basket */}
    <g {...INK}>
      <path d="M24 60 Q34 42 44 60" fill="none" stroke-width={2.4} />
      <path d="M20 60 L48 60 L45.5 73.5 Q45 75 43 75 L25 75 Q23 75 22.5 73.5 Z" fill="#EAC08E" />
      <path d="M23 60 Q27 55 33 57 Q38 53 45 60 Z" fill="#FFC4D3" />
      <rect x={18.5} y={59} width={31} height={5} rx={2.5} fill="#DDAE78" />
    </g>
    <g {...DETAIL} stroke="#B98A5E">
      <path d="M25 68.5 L43.5 68.5" />
      <path d="M29 64 L29.5 74.5 M34 64 L34 74.5 M39 64 L38.5 74.5" />
    </g>
    <Strawberry x={63} y={74} tilt={-14} />
    <Strawberry x={73} y={80} tilt={12} />
  </g>
);

const BARN = '#F6A6A2';
const BARN_DOOR = '#EC918F';
const ROOF = '#B8858E';
const TRIM = '#FFF8F1';

/** A little red barn with room for everyone; its windows glow at night. */
export const littleBarn: DecorRenderer = ({ night } = {}) => {
  const glass = night ? '#FFE9A3' : '#D6ECFA';
  return (
    <g>
      <Shadow rx={42} ry={4} />
      {/* weathervane */}
      <path d="M50 14 L50 5" stroke={OUTLINE} stroke-width={1.8} stroke-linecap="round" />
      <path d={HEART} transform="translate(50 4.5) scale(0.55)" fill="#F58CAA" stroke={OUTLINE} stroke-width={2.6} />
      <g {...INK}>
        {/* gable wall and roof */}
        <path d="M18 93 L18 48 L24 35 L50 20 L76 35 L82 48 L82 93 Z" fill={BARN} />
        <path d="M10.5 53 L18.5 31.5 L50 11.5 L81.5 31.5 L89.5 53 L83 54 L76 36.5 L50 21 L24 36.5 L17 54 Z" fill={ROOF} />
        {/* loft */}
        <path d="M43 44 L43 35 Q50 28.5 57 35 L57 44 Z" fill={night ? glass : '#FFE593'} />
        {/* side windows */}
        <rect x={22.5} y={60} width={9} height={9} rx={1.6} fill={glass} />
        <rect x={68.5} y={60} width={9} height={9} rx={1.6} fill={glass} />
        {/* doors */}
        <rect x={34} y={58} width={32} height={35} rx={2} fill={TRIM} />
        <rect x={37} y={61} width={12.5} height={32} fill={BARN_DOOR} />
        <rect x={50.5} y={61} width={12.5} height={32} fill={BARN_DOOR} />
      </g>
      <g stroke={TRIM} stroke-width={2.6} stroke-linecap="round">
        <path d="M38.5 62.5 L48 91.5 M48 62.5 L38.5 91.5" />
        <path d="M52 62.5 L61.5 91.5 M61.5 62.5 L52 91.5" />
      </g>
      <g {...DETAIL} stroke-width={1.3}>
        <path d="M27 60 L27 69 M22.5 64.5 L31.5 64.5" />
        <path d="M73 60 L73 69 M68.5 64.5 L77.5 64.5" />
        {!night && <path d="M46 40 l2 -3 M50 41 l0 -4 M54 40 l-2 -3" stroke="#D4AB55" />}
      </g>
      <path d="M22 50 L22 88" stroke="#fff" stroke-width={3} stroke-linecap="round" opacity={0.35} />
      <Shine cx={30} cy={30} rx={6} ry={2} rotate={-33} opacity={0.4} />
    </g>
  );
};

/** Sakura Garden decor: tulip bed, cherry blossom tree. */
import { OUTLINE, STROKE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

const STEM = '#86B972';
const TULIP_HEAD =
  'M-6.6 -1 C-7.4 -8 -5 -13 -3.8 -13.6 L-1.6 -9 L0 -14.6 L1.6 -9 L3.8 -13.6 C5 -13 7.4 -8 6.6 -1 C6 5 -6 5 -6.6 -1 Z';

/** Tulips: [x, head y, fill, tilt]. */
const TULIPS: readonly (readonly [x: number, y: number, fill: string, tilt: number])[] = [
  [20, 50, '#FFB3C6', -8],
  [35, 42, '#D6C8F8', -3],
  [50, 38, '#FFE593', 0],
  [65, 43, '#FFCBA8', 4],
  [80, 51, '#F0C6F0', 9],
];

/** A stem drawn as a doubled stroke (outline + green), like the pets' tails. */
function Stem({ p, d, width = 2.8 }: { p: Paint; d: string; width?: number }) {
  return (
    <g fill="none" stroke-linecap="round">
      <path d={d} stroke={OUTLINE} stroke-width={width + p.w(STROKE * 1.33)} />
      <path d={d} stroke={p.c(STEM)} stroke-width={width} />
    </g>
  );
}

/** A tidy row of pastel tulips in a little wooden bed. */
export const tulipBed: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={44} ry={3.4} />
      {TULIPS.map(([x, y, , tilt]) => (
        <Stem key={x} p={p} d={`M${x} 80 Q${x - tilt * 0.4} ${(80 + y) / 2} ${x + tilt * 0.3} ${y + 3}`} />
      ))}
      {TULIPS.map(([x, y, fill, tilt]) => (
        <g key={x} transform={`translate(${x + tilt * 0.3} ${y}) rotate(${tilt})`}>
          <path d={TULIP_HEAD} fill={p.c(fill)} {...p.ink} stroke-width={p.w(2.1)} />
          <ellipse cx={-2.8} cy={-6} rx={1.2} ry={3} fill="#fff" opacity={p.night ? 0.3 : 0.55} />
        </g>
      ))}
      {/* leaves */}
      <g fill={p.c('#A6D38F')} {...p.ink} stroke-width={p.w(2)}>
        <path d="M27 80 C22 72 22 64 26 58 C29 66 30 73 31 80 Z" />
        <path d="M44 80 C41 71 42 63 47 58 C48 66 48 73 48 80 Z" />
        <path d="M58 80 C58 72 60 65 65 61 C66 68 64 74 62 80 Z" />
        <path d="M73 80 C74 72 77 66 82 63 C82 70 80 75 77 80 Z" />
      </g>
      {/* soil and wooden border */}
      <path d="M9 81 Q50 70 91 81 Z" fill={p.c('#A88070')} {...p.ink} />
      <rect x={6} y={79} width={88} height={14} rx={5} fill={p.c('#F4CFA0')} {...p.ink} />
      <path d="M16 86 L84 86" stroke={p.c('#E0B685')} stroke-width={p.w(2)} stroke-linecap="round" />
      <Shine p={p} cx={16} cy={82.5} rx={5} ry={1.2} rotate={0} opacity={0.6} />
    </g>
  );
};

/** Canopy puffs [cx, cy, r]; their union is the blossom cloud. */
const BLOSSOM: readonly (readonly [cx: number, cy: number, r: number])[] = [
  [30, 42, 17],
  [50, 28, 21],
  [71, 39, 17],
  [39, 55, 15],
  [62, 55, 15],
  [50, 44, 18],
  [22, 54, 11],
  [79, 53, 11],
];
const FLORETS: readonly (readonly [x: number, y: number])[] = [
  [36, 30],
  [58, 22],
  [74, 44],
  [28, 50],
  [52, 50],
  [66, 60],
  [44, 38],
];
const PETAL = 'M0 -2.6 C1.8 -1.6 1.8 1.4 0 2.6 C-1.8 1.4 -1.8 -1.6 0 -2.6 Z';

/** A round cherry tree in full bloom, petals drifting down. */
export const cherryTree: DecorRenderer = (o) => {
  const p = paint(o);
  const puffs = BLOSSOM.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />);
  return (
    <g>
      <Shadow rx={30} ry={3.4} />
      <g fill={p.c('#FFD1DD')} opacity={0.9}>
        <ellipse cx={30} cy={92} rx={3} ry={1.3} />
        <ellipse cx={70} cy={91.5} rx={2.6} ry={1.2} />
        <ellipse cx={60} cy={93.5} rx={2.2} ry={1} />
      </g>
      {/* trunk and branches */}
      <path
        d="M42 93 C46 85 47 76 45 64 L39 57 L44 55.5 L49 61 L55 54 L59.5 56.5 L54 64 C53 76 55 85 60 93 Z"
        fill={p.c('#C9A07E')}
        {...p.ink}
      />
      <path d="M51 70 L51 88" stroke={p.c('#B48A69')} stroke-width={3} stroke-linecap="round" />
      {/* blossom cloud: outline stroke behind the fills keeps one soft silhouette */}
      <g fill={OUTLINE} stroke={OUTLINE} stroke-width={p.w(STROKE * 2)}>
        {puffs}
      </g>
      <g fill={p.c('#FFC9D8')}>{puffs}</g>
      <g fill={p.c('#F7AFC5')}>
        {BLOSSOM.filter(([, cy]) => cy > 45).map(([cx, cy, r]) => (
          <circle key={`s${cx}`} cx={cx + 1} cy={cy + 3.4} r={r - 4} />
        ))}
      </g>
      <g fill={p.c('#FFC9D8')}>
        <circle cx={50} cy={40} r={15} />
        <circle cx={34} cy={40} r={12} />
        <circle cx={66} cy={38} r={12} />
      </g>
      <Shine p={p} cx={38} cy={22} rx={8} ry={3.6} rotate={-30} opacity={0.55} />
      {FLORETS.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} fill={p.c('#FFFFFF')}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 1.9} cy={-Math.cos((a * Math.PI) / 180) * 1.9} r={1.5} />
          ))}
          <circle r={1} fill={p.c('#F58CAA')} />
        </g>
      ))}
      {/* drifting petals */}
      <g fill={p.c('#FFC4D3')} stroke={OUTLINE} stroke-width={p.w(0.9)}>
        <path d={PETAL} transform="translate(14 72) rotate(-30) scale(1.2)" />
        <path d={PETAL} transform="translate(86 70) rotate(40)" />
        <path d={PETAL} transform="translate(76 83) rotate(-60) scale(0.9)" />
      </g>
    </g>
  );
};

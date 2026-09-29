/** Dreamy Night decor: moon lamp, fairy lights. */
import { CRESCENT } from '../paths';
import { Glow, OUTLINE, STROKE, Shadow, Shine, Sparkle, paint, type DecorRenderer, type Paint } from './kit';

const LAVENDER = '#C9B8F2';

/** A curly garden lamp with a little moon glowing in its globe. */
export const moonLamp: DecorRenderer = (o) => {
  const p = paint(o);
  const pole = 'M50 87 L50 30 C50 16 67 13 68 24';
  return (
    <g>
      <Shadow rx={16} ry={3} />
      {!p.night && <Glow cx={68} cy={42} r={24} />}
      <g fill="none" stroke-linecap="round">
        <path d={pole} stroke={OUTLINE} stroke-width={3.6 + p.w(STROKE * 2)} />
        <path d={pole} stroke={p.c(LAVENDER)} stroke-width={3.6} />
      </g>
      <path d="M68 24 L68 29.5" stroke={OUTLINE} stroke-width={p.w(1.8)} stroke-linecap="round" />
      <g {...p.ink}>
        <path d="M38 93 L40.5 86.5 Q50 83.5 59.5 86.5 L62 93 Z" fill={p.c(LAVENDER)} />
        <circle cx={68} cy={42} r={12} fill={p.night ? '#FFF3C4' : '#FFF8E4'} />
        <path d="M61 30.5 L75 30.5 L73.5 27.5 Q68 25.5 62.5 27.5 Z" fill={p.c(LAVENDER)} stroke-width={p.w(2)} />
        <path d="M64.5 54 L71.5 54 L70 57.5 L66 57.5 Z" fill={p.c(LAVENDER)} stroke-width={p.w(2)} />
      </g>
      <path d={CRESCENT} transform="translate(68.6 42.4) scale(0.36) translate(-50 -50)" fill="#FFE27F" stroke={OUTLINE} stroke-width={p.w(4.4)} stroke-linejoin="round" />
      <Shine p={p} cx={63} cy={36.5} rx={2.6} ry={1.4} rotate={-40} opacity={0.8} />
      <Sparkle x={86} y={30} r={3.4} />
      <Sparkle x={82} y={57} r={2.2} />
    </g>
  );
};

const BULB_COLORS = ['#FFE27F', '#FFB3C6', '#A8E6D2', '#D6C8F8', '#FFCBA8', '#BBDCF6'];
/** Knots the string is tied at (left, centre, right) and how low each swag sags. */
const KNOTS = [
  [7, 20],
  [50, 24],
  [93, 20],
] as const;
const SAG = 80;

type Pt = readonly [number, number];
/** A swag from `a` to `b`: a cubic whose handles drop straight down near each knot, so it hangs in a soft U. */
function handles(a: Pt, b: Pt): [Pt, Pt] {
  const span = b[0] - a[0];
  return [
    [a[0] + span * 0.12, SAG],
    [b[0] - span * 0.12, SAG],
  ];
}
function swag(a: Pt, b: Pt, t: number): Pt {
  const [c1, c2] = handles(a, b);
  const u = 1 - t;
  const at = (i: 0 | 1) => u * u * u * a[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * b[i];
  return [at(0), at(1)];
}
const SWAGS = [
  [KNOTS[0], KNOTS[1]],
  [KNOTS[1], KNOTS[2]],
] as const;
const WIRE = SWAGS.map(([a, b]) => {
  const [c1, c2] = handles(a, b);
  return `M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`;
}).join(' ');
const BULBS = SWAGS.flatMap(([a, b]) => [0.26, 0.5, 0.74].map((t) => swag(a, b, t)));

function Bow({ p, x, y }: { p: Paint; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={p.c('#FFB3C6')} {...p.ink} stroke-width={p.w(1.8)}>
      <path d="M0 0 C-3 -5 -8.5 -5.5 -8.5 -1 C-8.5 3 -3 3 0 0 Z" />
      <path d="M0 0 C3 -5 8.5 -5.5 8.5 -1 C8.5 3 3 3 0 0 Z" />
      <path d="M-0.8 0.6 L-3.4 7 M0.8 0.6 L3.4 7" fill="none" />
      <circle r={2.2} fill={p.c('#F58CAA')} />
    </g>
  );
}

function starPath(outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}
const STAR = starPath(8.4, 4.2);

/** Strung across the sky like little fireflies: a double swag of plump bulbs with a star charm. */
export const fairyLights: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <path d={WIRE} fill="none" stroke={OUTLINE} stroke-width={p.w(1.8)} stroke-linecap="round" />
      {BULBS.map(([x, y], i) => {
        const color = BULB_COLORS[i % BULB_COLORS.length]!;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <circle cy={9} r={11} fill={color} opacity={p.night ? 0.26 : 0.14} />
            <circle cy={9} r={7.6} fill={color} opacity={p.night ? 0.4 : 0.2} />
            <rect x={-2.6} y={-1} width={5.2} height={4.2} rx={1.2} fill={p.c('#8E7AB8')} {...p.ink} stroke-width={p.w(1.4)} />
            <path d="M0 3 C-4.8 3 -6 7 -5.4 10 C-4.8 13.4 -2.4 15.4 0 15.4 C2.4 15.4 4.8 13.4 5.4 10 C6 7 4.8 3 0 3 Z" fill={color} {...p.ink} stroke-width={p.w(1.8)} />
            <ellipse cx={-2} cy={7.6} rx={1.3} ry={2.2} transform="rotate(20 -2 7.6)" fill="#fff" opacity={0.85} />
          </g>
        );
      })}
      <Bow p={p} x={KNOTS[0][0]} y={KNOTS[0][1]} />
      <Bow p={p} x={KNOTS[2][0]} y={KNOTS[2][1]} />
      {/* the star charm tied at the centre */}
      <g transform={`translate(${KNOTS[1][0]} ${KNOTS[1][1] - 2})`}>
        <circle r={13} fill="#FFE59A" opacity={p.night ? 0.3 : 0.16} />
        <path d={STAR} fill="#FFE27F" {...p.ink} stroke-width={p.w(2)} />
        <ellipse cx={-2.2} cy={-2.6} rx={1.3} ry={2.2} transform="rotate(30 -2.2 -2.6)" fill="#fff" opacity={0.75} />
      </g>
    </g>
  );
};

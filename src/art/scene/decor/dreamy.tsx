/** Dreamy Night decor: moon lamp, fairy lights. */
import { CRESCENT } from '../paths';
import { Glow, INK, OUTLINE, Shadow, Shine, Sparkle, type DecorRenderer } from './kit';

const LAVENDER = '#C9B8F2';

/** A curly garden lamp with a little moon glowing in its globe. */
export const moonLamp: DecorRenderer = ({ night } = {}) => {
  const pole = 'M50 87 L50 30 C50 16 67 13 68 24';
  return (
    <g>
      <Shadow rx={16} ry={3} />
      {!night && <Glow cx={68} cy={42} r={24} />}
      <g fill="none" stroke-linecap="round">
        <path d={pole} stroke={OUTLINE} stroke-width={8.2} />
        <path d={pole} stroke={LAVENDER} stroke-width={3.6} />
      </g>
      <path d="M68 24 L68 29.5" stroke={OUTLINE} stroke-width={1.8} stroke-linecap="round" />
      <g {...INK}>
        <path d="M38 93 L40.5 86.5 Q50 83.5 59.5 86.5 L62 93 Z" fill={LAVENDER} />
        <circle cx={68} cy={42} r={12} fill={night ? '#FFF3C4' : '#FFF8E4'} />
        <path d="M61 30.5 L75 30.5 L73.5 27.5 Q68 25.5 62.5 27.5 Z" fill={LAVENDER} stroke-width={2} />
        <path d="M64.5 54 L71.5 54 L70 57.5 L66 57.5 Z" fill={LAVENDER} stroke-width={2} />
      </g>
      <path d={CRESCENT} transform="translate(68.6 42.4) scale(0.36) translate(-50 -50)" fill="#FFE27F" stroke={OUTLINE} stroke-width={4.4} stroke-linejoin="round" />
      <Shine cx={63} cy={36.5} rx={2.6} ry={1.4} rotate={-40} opacity={0.8} />
      <Sparkle x={86} y={30} r={3.4} />
      <Sparkle x={82} y={57} r={2.2} />
    </g>
  );
};

const BULB_COLORS = ['#FFE27F', '#FFB3C6', '#A8E6D2', '#D6C8F8', '#FFCBA8'];
/** Two scallops of string: [start, control, end]. */
const SWAGS: readonly [[number, number], [number, number], [number, number]][] = [
  [
    [4, 34],
    [27, 66],
    [50, 38],
  ],
  [
    [50, 38],
    [73, 66],
    [96, 34],
  ],
];
const BULBS = SWAGS.flatMap(([p0, c, p1]) =>
  [0.2, 0.4, 0.6, 0.8].map((t) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * t * u * c[0] + t * t * p1[0], u * u * p0[1] + 2 * t * u * c[1] + t * t * p1[1]] as const;
  }),
);

function Bow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="#FFB3C6" {...INK} stroke-width={1.6}>
      <path d="M0 0 C-2.5 -4 -7 -4.5 -7 -1 C-7 2.5 -2.5 2.5 0 0 Z" />
      <path d="M0 0 C2.5 -4 7 -4.5 7 -1 C7 2.5 2.5 2.5 0 0 Z" />
      <circle r={1.8} fill="#F58CAA" />
    </g>
  );
}

/** Strung across the sky like little fireflies. */
export const fairyLights: DecorRenderer = ({ night } = {}) => (
  <g>
    <path d={SWAGS.map(([p0, c, p1]) => `M${p0[0]} ${p0[1]} Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`).join(' ')} fill="none" stroke={OUTLINE} stroke-width={1.6} stroke-linecap="round" />
    {BULBS.map(([x, y], i) => {
      const color = BULB_COLORS[i % BULB_COLORS.length]!;
      return (
        <g key={i}>
          <circle cx={x} cy={y + 5.2} r={7.5} fill={color} opacity={night ? 0.2 : 0.14} />
          <circle cx={x} cy={y + 5.2} r={5} fill={color} opacity={night ? 0.32 : 0.2} />
          <rect x={x - 1.8} y={y - 0.6} width={3.6} height={2.8} rx={0.8} fill="#8E7AB8" stroke={OUTLINE} stroke-width={1.1} />
          <ellipse cx={x} cy={y + 5.4} rx={2.9} ry={3.6} fill={color} stroke={OUTLINE} stroke-width={1.5} />
          <circle cx={x - 0.9} cy={y + 4.2} r={0.9} fill="#fff" opacity={0.85} />
        </g>
      );
    })}
    <Bow x={4} y={34} />
    <Bow x={50} y={38} />
    <Bow x={96} y={34} />
  </g>
);

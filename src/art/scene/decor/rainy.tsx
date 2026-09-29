/** Rainy Day decor: lily pad puddle, rainbow, mushroom house. */
import { DETAIL, HEART, INK, OUTLINE, Shadow, Shine, Sparkle, type DecorRenderer } from './kit';

/** A lily pad lying flat on the water (an ellipse with a notch), centred on 0,0. */
const PAD = 'M0 0 L10.3 1.9 A11 5.5 0 1 1 10.96 -0.48 Z';

/** Perfect for splashing: sky-blue water, two lily pads and a pink bloom. */
export const puddle: DecorRenderer = () => (
  <g>
    <path
      d="M9 80 C7 72 21 67.5 35 68.5 C46 64.5 61 64.5 71.5 68 C85.5 68 94.5 74 90.5 82 C87.5 90 70 92.5 54 91.5 C38 93.5 13.5 90.5 9 80 Z"
      fill="#BBDCF6"
      {...INK}
    />
    <path d="M18 76 C20 71 32 70.5 40 71 C50 68 62 68.5 70 70.5 C60 71.5 48 73 36 73.5 C28 74 22 75 18 76 Z" fill="#E4F2FC" />
    <g fill="none" stroke="#fff" stroke-width={1.4} opacity={0.85}>
      <ellipse cx={70} cy={83} rx={6} ry={1.8} />
      <ellipse cx={70} cy={83} rx={11} ry={3.4} opacity={0.6} />
    </g>
    <g transform="translate(33 81)">
      <path d={PAD} fill="#A6D38F" {...INK} stroke-width={2} />
      <path d="M0 0 L-8 -2 M0 0 L-5 3.5 M0 0 L3 -4.5" {...DETAIL} stroke="#7FB26B" stroke-width={1.2} />
    </g>
    <g transform="translate(62 73.5) scale(0.72) rotate(170)">
      <path d={PAD} fill="#A6D38F" {...INK} stroke-width={2.6} />
    </g>
    {/* lotus */}
    <g transform="translate(30 78)" {...INK} stroke-width={1.5}>
      <path d="M-6 0 C-7 -4 -5 -7 -3 -8 C-2 -5 -1 -2 0 0 Z" fill="#FFB3C6" />
      <path d="M6 0 C7 -4 5 -7 3 -8 C2 -5 1 -2 0 0 Z" fill="#FFB3C6" />
      <path d="M-3.5 0 C-4 -5 -2 -9 0 -10.5 C2 -9 4 -5 3.5 0 Z" fill="#FFC9D8" />
    </g>
    <Shine cx={22} cy={82} rx={4} ry={1.2} rotate={-6} opacity={0.8} />
  </g>
);

const BANDS = ['#FFB3C6', '#FFCBA8', '#FFE593', '#B3E6D6', '#BBDCF6', '#D6C8F8'];
const OUTER = 44;
const BAND = 4.6;
const arc = (r: number) => `M${50 - r} 80 A${r} ${r} 0 0 1 ${50 + r} 80`;

function Puff({ x }: { x: number }) {
  const puffs = (
    <>
      <circle cx={x - 6} cy={80} r={6.5} />
      <circle cx={x + 1} cy={76} r={8} />
      <circle cx={x + 8} cy={81} r={5.5} />
      <rect x={x - 12} y={79} width={25} height={8} rx={4} />
    </>
  );
  return (
    <g>
      <g fill={OUTLINE} stroke={OUTLINE} stroke-width={4.8}>
        {puffs}
      </g>
      <g fill="#FFFFFF">{puffs}</g>
      <rect x={x - 9} y={83} width={19} height={3} rx={1.5} fill="#E3F0FB" />
    </g>
  );
}

/** The reward for every rainy day: a pastel arc resting on two little clouds. */
export const rainbow: DecorRenderer = () => {
  const inner = OUTER - BAND * BANDS.length;
  return (
    <g>
      <path d={arc((OUTER + inner) / 2)} fill="none" stroke={OUTLINE} stroke-width={OUTER - inner + 4.8} />
      {BANDS.map((c, i) => (
        <path key={c} d={arc(OUTER - BAND * (i + 0.5))} fill="none" stroke={c} stroke-width={BAND + 0.3} />
      ))}
      <path d={arc(OUTER - 3)} fill="none" stroke="#fff" stroke-width={1.4} stroke-dasharray="10 60" stroke-linecap="round" opacity={0.7} />
      <Puff x={16} />
      <Puff x={84} />
      <Sparkle x={50} y={26} r={3.6} />
      <Sparkle x={14} y={56} r={2.6} />
      <Sparkle x={88} y={52} r={2.2} />
    </g>
  );
};

const CAP_SPOTS: readonly [number, number, number, number][] = [
  [28, 35, 6, 4.4],
  [50, 23, 7, 4.8],
  [72, 34, 6, 4.4],
  [40, 48, 4.6, 3.4],
  [61, 47, 5, 3.4],
  [15, 49, 3.4, 2.8],
  [85, 49, 3.4, 2.8],
];

/** A cozy cottage under a spotted cap; its windows glow at night. */
export const mushroomHouse: DecorRenderer = ({ night } = {}) => {
  const glass = night ? '#FFE9A3' : '#D6ECFA';
  return (
    <g>
      <Shadow rx={36} ry={3.8} />
      <g {...INK}>
        <path d="M29 93 L31.5 60 Q50 56 68.5 60 L71 93 Z" fill="#FFF3E3" />
        <path d="M43 93 L43 79 Q43 71 50 71 Q57 71 57 79 L57 93 Z" fill="#D9A988" />
        <circle cx={63} cy={72} r={4.8} fill={glass} />
        <circle cx={36.5} cy={74} r={4} fill={glass} />
      </g>
      <g {...DETAIL} stroke-width={1.2}>
        <path d="M63 67.2 L63 76.8 M58.2 72 L67.8 72" />
      </g>
      <path d={HEART} transform="translate(50 78.5) scale(0.42)" fill="#F58CAA" />
      <circle cx={54.2} cy={85} r={1.2} fill={OUTLINE} />
      {/* chimney pipe */}
      <g {...INK} stroke-width={2}>
        <rect x={64} y={8} width={7} height={11} rx={1.5} fill="#C9B8F2" />
        <rect x={62.5} y={6} width={10} height={3.6} rx={1.8} fill="#B7A3EC" />
      </g>
      {/* cap */}
      <ellipse cx={50} cy={59} rx={27} ry={5.2} fill="#F2D2C0" {...INK} />
      <path d="M8 56.5 C8 29 27 13 50 13 C73 13 92 29 92 56.5 C92 63.5 8 63.5 8 56.5 Z" fill="#FF9FA8" {...INK} />
      <path d="M13 57 C22 61 78 61 87 57" fill="none" stroke="#F4858F" stroke-width={3} stroke-linecap="round" />
      <g fill="#FFFDF7">
        {CAP_SPOTS.map(([x, y, rx, ry]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} />
        ))}
      </g>
      <Shine cx={30} cy={24} rx={8} ry={3.2} rotate={-34} opacity={0.5} />
      {/* flowers at the door */}
      {[
        [24, 90, '#FFFDF7'],
        [78, 90.5, '#FFE593'],
      ].map(([x, y, c]) => (
        <g key={x as number} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.sin((a * Math.PI) / 180) * 2.6} cy={-4 - Math.cos((a * Math.PI) / 180) * 2.6} r={2.2} fill={c as string} stroke={OUTLINE} stroke-width={1} />
          ))}
          <circle cy={-4} r={1.5} fill="#FFD65C" stroke={OUTLINE} stroke-width={0.9} />
        </g>
      ))}
    </g>
  );
};

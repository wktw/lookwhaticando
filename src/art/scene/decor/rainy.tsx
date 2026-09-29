/** Rainy Day decor: lily pad puddle, rainbow, mushroom house. */
import { Flower, HEART, OUTLINE, STROKE, Shadow, Shine, Sparkle, paint, type DecorRenderer, type Paint } from './kit';

/** A lily pad lying flat on the water (an ellipse with a notch), centred on 0,0. */
const PAD = 'M0 0 L10.3 1.9 A11 5.5 0 1 1 10.96 -0.48 Z';

/** A raindrop ring spreading on the water: two thin ellipses. */
function Ripple({ p, x, y, r }: { p: Paint; x: number; y: number; r: number }) {
  return (
    <g fill="none" stroke="#fff" stroke-width={p.w(1.4)} opacity={0.9}>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.32} />
      <ellipse cx={x} cy={y} rx={r * 1.9} ry={r * 0.6} opacity={0.55} />
    </g>
  );
}

/** A tiny green frog sitting on its lily pad. */
function Frog({ p, x, y }: { p: Paint; x: number; y: number }) {
  const green = p.c('#A8DC8E');
  return (
    <g transform={`translate(${x} ${y})`}>
      <g fill={green} {...p.ink} stroke-width={p.w(1.8)}>
        <path d="M-8.4 0 C-9.6 -5 -6 -10 0 -10 C6 -10 9.6 -5 8.4 0 Z" />
        <circle cx={-4.6} cy={-11.6} r={3.4} />
        <circle cx={4.6} cy={-11.6} r={3.4} />
      </g>
      <circle cx={-4.6} cy={-11.8} r={1.4} fill={OUTLINE} />
      <circle cx={4.6} cy={-11.8} r={1.4} fill={OUTLINE} />
      <circle cx={-4.2} cy={-12.3} r={0.5} fill="#fff" />
      <circle cx={5} cy={-12.3} r={0.5} fill="#fff" />
      <ellipse cx={-5} cy={-5.6} rx={1.8} ry={1} fill="#FF9FB8" opacity={0.7} />
      <ellipse cx={5} cy={-5.6} rx={1.8} ry={1} fill="#FF9FB8" opacity={0.7} />
      <path d="M-1.6 -6.4 Q0 -5 1.6 -6.4" fill="none" stroke={OUTLINE} stroke-width={p.w(1.1)} stroke-linecap="round" />
    </g>
  );
}

/** Perfect for splashing: sky-blue water, lily pads, a pink bloom and a frog who got here first. */
export const puddle: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <path
        d="M8 76 C5 64 22 57 38 58.5 C50 54.5 66 55 76 59 C90 60 97 69 92 78 C89 89 71 93.5 54 92.5 C37 94.5 11 90 8 76 Z"
        fill={p.c('#BBDCF6')}
        {...p.ink}
      />
      <path d="M17 70 C20 64 32 62.5 41 63 C51 59.5 63 60.5 72 62.5 C61 64 49 65.5 37 66 C29 66.5 22 68 17 70 Z" fill={p.c('#E4F2FC')} />
      <Ripple p={p} x={69} y={80} r={5} />
      <Ripple p={p} x={56} y={67} r={3} />
      <g transform="translate(64 71) scale(0.8) rotate(170)">
        <path d={PAD} fill={p.c('#A6D38F')} {...p.ink} stroke-width={p.w(2.6)} />
      </g>
      {/* the frog's pad, with its lotus */}
      <g transform="translate(32 80) scale(1.25)">
        <path d={PAD} fill={p.c('#A6D38F')} {...p.ink} stroke-width={p.w(1.8)} />
        <path d="M0 0 L-8 -2 M0 0 L-5 3.5 M0 0 L3 -4.5" {...p.detail} stroke={p.c('#7FB26B')} stroke-width={p.w(1)} />
      </g>
      <Frog p={p} x={30} y={82} />
      <g transform="translate(49 83)" {...p.ink} stroke-width={p.w(1.5)}>
        <path d="M-6 0 C-7 -4 -5 -7 -3 -8 C-2 -5 -1 -2 0 0 Z" fill={p.c('#FFB3C6')} />
        <path d="M6 0 C7 -4 5 -7 3 -8 C2 -5 1 -2 0 0 Z" fill={p.c('#FFB3C6')} />
        <path d="M-3.5 0 C-4 -5 -2 -9 0 -10.5 C2 -9 4 -5 3.5 0 Z" fill={p.c('#FFC9D8')} />
      </g>
      <Shine p={p} cx={80} cy={70} rx={4} ry={1.2} rotate={-6} opacity={0.8} />
    </g>
  );
};

const BANDS = ['#FFB3C6', '#FFCBA8', '#FFE593', '#B3E6D6', '#BBDCF6', '#D6C8F8'];
const OUTER = 44;
const BAND = 4.6;
const arc = (r: number) => `M${50 - r} 80 A${r} ${r} 0 0 1 ${50 + r} 80`;

function Puff({ p, x }: { p: Paint; x: number }) {
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
      <g fill={OUTLINE} stroke={OUTLINE} stroke-width={p.w(STROKE * 2)}>
        {puffs}
      </g>
      <g fill={p.c('#FFFFFF')}>{puffs}</g>
      <rect x={x - 9} y={83} width={19} height={3} rx={1.5} fill={p.c('#E3F0FB')} />
    </g>
  );
}

/** The reward for every rainy day: a pastel arc resting on two little clouds. */
export const rainbow: DecorRenderer = (o) => {
  const p = paint(o);
  const inner = OUTER - BAND * BANDS.length;
  return (
    <g>
      <path d={arc((OUTER + inner) / 2)} fill="none" stroke={OUTLINE} stroke-width={OUTER - inner + p.w(STROKE * 2)} />
      {BANDS.map((c, i) => (
        <path key={c} d={arc(OUTER - BAND * (i + 0.5))} fill="none" stroke={p.c(c)} stroke-width={BAND + 0.3} />
      ))}
      <path d={arc(OUTER - 3)} fill="none" stroke="#fff" stroke-width={1.4} stroke-dasharray="10 60" stroke-linecap="round" opacity={0.7} />
      <Puff p={p} x={16} />
      <Puff p={p} x={84} />
      <Sparkle x={50} y={26} r={3.6} />
      <Sparkle x={14} y={56} r={2.6} />
      <Sparkle x={88} y={52} r={2.2} />
    </g>
  );
};

const CAP_SPOTS: readonly (readonly [cx: number, cy: number, rx: number, ry: number])[] = [
  [28, 35, 6, 4.4],
  [50, 23, 7, 4.8],
  [72, 34, 6, 4.4],
  [40, 48, 4.6, 3.4],
  [61, 47, 5, 3.4],
  [15, 49, 3.4, 2.8],
  [85, 49, 3.4, 2.8],
];
const LIT = '#FFE9A3';

/** A cozy cottage under a spotted cap; its windows glow at night. */
export const mushroomHouse: DecorRenderer = (o) => {
  const p = paint(o);
  const glass = p.night ? LIT : '#D6ECFA';
  return (
    <g>
      <Shadow rx={36} ry={3.8} />
      <g {...p.ink}>
        <path d="M29 93 L31.5 60 Q50 56 68.5 60 L71 93 Z" fill={p.c('#FFF3E3')} />
        <path d="M43 93 L43 79 Q43 71 50 71 Q57 71 57 79 L57 93 Z" fill={p.c('#D9A988')} />
        <circle cx={63} cy={72} r={4.8} fill={glass} />
        <circle cx={36.5} cy={74} r={4} fill={glass} />
      </g>
      <path d="M63 67.2 L63 76.8 M58.2 72 L67.8 72" {...p.detail} stroke-width={p.w(1.2)} />
      <path d={HEART} transform="translate(50 78.5) scale(0.42)" fill={p.c('#F58CAA')} />
      <circle cx={54.2} cy={85} r={1.2} fill={OUTLINE} />
      {/* chimney pipe */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <rect x={64} y={8} width={7} height={11} rx={1.5} fill={p.c('#C9B8F2')} />
        <rect x={62.5} y={6} width={10} height={3.6} rx={1.8} fill={p.c('#B7A3EC')} />
      </g>
      {/* cap */}
      <ellipse cx={50} cy={59} rx={27} ry={5.2} fill={p.c('#F2D2C0')} {...p.ink} />
      <path d="M8 56.5 C8 29 27 13 50 13 C73 13 92 29 92 56.5 C92 63.5 8 63.5 8 56.5 Z" fill={p.c('#FF9FA8')} {...p.ink} />
      <path d="M13 57 C22 61 78 61 87 57" fill="none" stroke={p.c('#F4858F')} stroke-width={3} stroke-linecap="round" />
      <g fill={p.c('#FFFDF7')}>
        {CAP_SPOTS.map(([x, y, rx, ry]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} />
        ))}
      </g>
      <Shine p={p} cx={30} cy={24} rx={8} ry={3.2} rotate={-34} opacity={0.5} />
      {/* flowers at the door */}
      <g transform="translate(24 86)">
        <Flower p={p} petal="#FFFDF7" />
      </g>
      <g transform="translate(78 86.5)">
        <Flower p={p} petal="#FFE593" />
      </g>
    </g>
  );
};

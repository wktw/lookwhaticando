/** Snow Globe decor: snowman, twinkly tree. */
import { HEART, OUTLINE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

/** A snowball with its shade tucked into the bottom-right. */
function Snowball({ p, x, y, r }: { p: Paint; x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={p.c('#DCEAF8')} />
      <circle cx={x - r * 0.14} cy={y - r * 0.14} r={r * 0.86} fill={p.c('#FFFFFF')} />
      <circle cx={x} cy={y} r={r} fill="none" {...p.ink} />
      <Shine p={p} cx={x - r * 0.45} cy={y - r * 0.45} rx={r * 0.24} ry={r * 0.13} rotate={-40} opacity={0.9} />
    </g>
  );
}

/** Carrot nose, button eyes, knitted scarf and a warm heart. */
export const snowman: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      {/* a soft drift of snow, edged in lavender rather than outlined */}
      <ellipse cx={50} cy={91} rx={31} ry={4.4} fill={p.c('#F3F8FF')} stroke={p.c('#C9C0EE')} stroke-width={p.w(1.6)} />
      <ellipse cx={42} cy={90} rx={12} ry={1.6} fill="#fff" opacity={0.8} />
      {/* twig arms */}
      <g {...p.detail} stroke={p.c('#9C7A64')} stroke-width={p.w(2.4)}>
        <path d="M34 64 L20 53 M24.5 56.5 L22 51.5" />
        <path d="M66 64 L80 52 M75.5 56 L79 58.5" />
      </g>
      <Snowball p={p} x={50} y={71} r={18} />
      <Snowball p={p} x={50} y={41.5} r={13} />
      <path d={HEART} transform="translate(50 67.5) scale(0.5)" fill={p.c('#F58CAA')} stroke={OUTLINE} stroke-width={p.w(2.6)} />
      <circle cx={50} cy={76.5} r={1.7} fill={OUTLINE} />
      <circle cx={50} cy={83} r={1.7} fill={OUTLINE} />
      {/* scarf */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <path d="M56 56 L60.5 69.5 L66.5 67.5 L61.5 55 Z" fill={p.c('#FFB3C6')} />
        <path d="M37.2 51.5 Q50 57.5 62.8 51.5 L63.2 56.4 Q50 62.6 36.8 56.4 Z" fill={p.c('#FFB3C6')} />
      </g>
      <g stroke={p.c('#FFE1EA')} stroke-width={p.w(1.6)} stroke-linecap="round">
        <path d="M43 54.6 L42.6 59" />
        <path d="M50 55.6 L50 60.4" />
        <path d="M57 54.6 L57.4 59" />
        <path d="M59.4 61.4 L64.4 59.6" />
      </g>
      {/* beanie */}
      <g {...p.ink} stroke-width={p.w(2.2)}>
        <path d="M39 35.5 Q39 24.5 50 24.5 Q61 24.5 61 35.5 Z" fill={p.c('#BBDCF6')} />
        <rect x={37.5} y={33.5} width={25} height={5.4} rx={2.7} fill={p.c('#9CC8EE')} />
        <circle cx={50} cy={23} r={3.8} fill={p.c('#FFFFFF')} />
      </g>
      {/* face */}
      <ellipse cx={45.6} cy={42.6} rx={1.7} ry={2.1} fill={OUTLINE} />
      <ellipse cx={54.4} cy={42.6} rx={1.7} ry={2.1} fill={OUTLINE} />
      <circle cx={46.1} cy={41.9} r={0.6} fill="#fff" />
      <circle cx={54.9} cy={41.9} r={0.6} fill="#fff" />
      <ellipse cx={41.4} cy={46.4} rx={2.4} ry={1.4} fill="#FF9FB8" opacity={0.6} />
      <ellipse cx={58.6} cy={46.4} rx={2.4} ry={1.4} fill="#FF9FB8" opacity={0.6} />
      <path d="M49.2 44.6 L58.4 46.8 L49.2 48 Z" fill={p.c('#FFA36E')} stroke={OUTLINE} stroke-width={p.w(1.4)} stroke-linejoin="round" />
      <path d="M46.6 49.8 Q48.6 51.4 50.6 50.2" fill="none" stroke={OUTLINE} stroke-width={p.w(1.3)} stroke-linecap="round" />
    </g>
  );
};

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const TIERS = ['M50 40 L19 77 Q50 85.5 81 77 Z', 'M50 26 L25.5 58 Q50 65 74.5 58 Z', 'M50 12.5 L32.5 39 Q50 44.5 67.5 39 Z'];
const STRINGS: readonly { d: string; bulbs: readonly (readonly [number, number])[] }[] = [
  { d: 'M25 68 Q50 78 75 66', bulbs: [[30, 70.2], [40, 72.6], [50, 73], [60, 71.6], [70, 68.4]] },
  { d: 'M30.5 50 Q50 58 69.5 48.5', bulbs: [[35, 52], [45, 54.4], [55, 53.8], [64.5, 51]] },
  { d: 'M37 33 Q50 38 63 32', bulbs: [[42, 34.8], [50, 35.6], [58, 34]] },
];
const LIGHTS = ['#FFE27F', '#FFB3C6', '#A9D3F5', '#FFCBA8', '#D6C8F8'];

/** A soft evergreen strung with lights, a star on top and presents underneath. */
export const twinklyTree: DecorRenderer = (o) => {
  const p = paint(o);
  let n = 0;
  return (
    <g>
      <Shadow rx={36} ry={3.6} />
      <rect x={45} y={78} width={10} height={11} rx={2} fill={p.c('#C9A07E')} {...p.ink} />
      {TIERS.map((d) => (
        <path key={d} d={d} fill={p.c('#9ED3A8')} {...p.ink} />
      ))}
      <g {...p.detail} stroke={p.c('#7DB98A')} stroke-width={p.w(1.8)}>
        <path d="M30 79.5 Q34 76.5 38 80 M62 80 Q66 76.5 70 79.5" />
        <path d="M34 60 Q38 57.5 42 61 M58 61 Q62 57.5 66 60" />
      </g>
      {STRINGS.map((s) => (
        <g key={s.d}>
          <path d={s.d} fill="none" stroke={OUTLINE} stroke-width={p.w(1.1)} opacity={0.6} />
          {s.bulbs.map(([x, y]) => {
            const color = LIGHTS[n++ % LIGHTS.length]!;
            return (
              <g key={x}>
                {p.night && <circle cx={x} cy={y} r={4.8} fill={color} opacity={0.5} />}
                <circle cx={x} cy={y} r={2.1} fill={color} stroke={OUTLINE} stroke-width={p.w(1.1)} />
              </g>
            );
          })}
        </g>
      ))}
      <Shine p={p} cx={42} cy={30} rx={1.5} ry={4} rotate={30} opacity={0.5} />
      {p.night && <circle cx={50} cy={12} r={11} fill="#FFE59A" opacity={0.35} />}
      <path d={starPath(50, 12, 8, 3.8)} fill="#FFE27F" {...p.ink} stroke-width={p.w(2)} />
      {/* presents */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <rect x={16} y={80} width={17} height={13} rx={2} fill={p.c('#FFB8CB')} />
        <rect x={67} y={83} width={15} height={10} rx={2} fill={p.c('#BBDCF6')} />
      </g>
      <g stroke={p.c('#FFFDF7')} stroke-width={2.2}>
        <path d="M24.5 80 L24.5 93 M16 86 L33 86" />
        <path d="M74.5 83 L74.5 93" />
      </g>
      <path d="M24.5 80 C21 75 17 77 20 80 Z M24.5 80 C28 75 32 77 29 80 Z" fill={p.c('#F58CAA')} stroke={OUTLINE} stroke-width={p.w(1.3)} stroke-linejoin="round" />
    </g>
  );
};

/** Beach Day decor: beach umbrella, sandcastle. */
import { OUTLINE, STROKE, Shadow, Shine, paint, type DecorRenderer } from './kit';

const APEX = [46, 14] as const;
/** Rim points of the canopy, left to right, bowing towards the viewer in the middle. */
const RIM = Array.from({ length: 6 }, (_, i) => {
  const t = i / 5;
  return [7 + 78 * t, 47 - 8 * t + 4 * Math.sin(Math.PI * t)] as const;
});

/** Striped shade for sunny naps, planted in a little sand mound with a bucket. */
export const beachUmbrella: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow cx={54} rx={30} ry={3.4} />
      <ellipse cx={55} cy={90.5} rx={19} ry={4} fill={p.c('#FCE3B0')} {...p.ink} />
      <g fill="none" stroke-linecap="round">
        <path d="M47 22 L55 90" stroke={OUTLINE} stroke-width={2.8 + p.w(STROKE * 2)} />
        <path d="M47 22 L55 90" stroke={p.c('#FFFDF7')} stroke-width={2.8} />
      </g>
      {RIM.slice(0, -1).map((a, i) => {
        const b = RIM[i + 1]!;
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2 + 5.5;
        const d = `M${APEX[0]} ${APEX[1]} L${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)} Z`;
        return <path key={i} d={d} fill={p.c(i % 2 ? '#FFFDF7' : '#FFB3C6')} {...p.ink} />;
      })}
      <circle cx={APEX[0]} cy={APEX[1] - 1} r={2.8} fill={p.c('#F58CAA')} {...p.ink} stroke-width={p.w(1.8)} />
      <Shine p={p} cx={30} cy={28} rx={6} ry={1.8} rotate={-38} opacity={0.55} />
      {/* bucket */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <path d="M76 82 Q82 75 88 82" fill="none" stroke-width={p.w(1.6)} />
        <path d="M74.5 81 L89.5 81 L87.5 92 Q87.2 93 86 93 L78 93 Q76.8 93 76.5 92 Z" fill={p.c('#BBDCF6')} />
      </g>
      <path d="M76.5 85 L87.5 85" stroke={p.c('#FFFDF7')} stroke-width={p.w(2)} stroke-linecap="round" />
    </g>
  );
};

/** A crenellated block from x0 to x1: `n` merlons on top of `top`, down to `bottom`. */
function battlement(x0: number, x1: number, top: number, bottom: number, n: number): string {
  const m = (x1 - x0) / (2 * n - 1);
  let d = `M${x0} ${bottom} L${x0} ${top - 5}`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * 2 * m;
    d += ` L${(a + m).toFixed(2)} ${top - 5}`;
    if (i < n - 1) d += ` L${(a + m).toFixed(2)} ${top} L${(a + 2 * m).toFixed(2)} ${top} L${(a + 2 * m).toFixed(2)} ${top - 5}`;
  }
  return `${d} L${x1} ${bottom} Z`;
}

const SAND = '#F8DCA2';
const SAND_SHADE = '#EAC37D';
const DOOR = '#C99C66';

/** Towers, a moat, and a tiny flag. */
export const sandcastle: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <path d="M5 87 Q5 83 10 83.5 Q50 92 90 83.5 Q95 83 95 87 Q94 94 50 95.5 Q6 94 5 87 Z" fill={p.c('#BBDCF6')} {...p.ink} />
      <path d="M50 16 L50 33" stroke={OUTLINE} stroke-width={p.w(1.8)} stroke-linecap="round" />
      <path d="M50.5 16.5 L62 20.5 L50.5 25 Z" fill={p.c('#FFB3C6')} {...p.ink} stroke-width={p.w(1.8)} />
      <g fill={p.c(SAND)} {...p.ink}>
        <path d={battlement(15, 32, 55, 88, 3)} />
        <path d={battlement(68, 85, 55, 88, 3)} />
        <path d={battlement(29, 71, 64, 89, 5)} />
        <path d={battlement(39, 61, 38, 64, 3)} />
      </g>
      <path d="M44 89 L44 79 Q44 73 50 73 Q56 73 56 79 L56 89 Z" fill={p.c(DOOR)} {...p.ink} />
      <path d="M47.5 52 L47.5 47 Q50 44 52.5 47 L52.5 52 Z" fill={p.c(DOOR)} {...p.ink} stroke-width={p.w(1.8)} />
      <g fill={p.c(SAND_SHADE)}>
        <rect x={27} y={58} width={3.5} height={27} rx={1.7} />
        <rect x={80} y={58} width={3.5} height={27} rx={1.7} />
        <rect x={57} y={42} width={2.6} height={19} rx={1.3} />
        <circle cx={20} cy={70} r={0.9} />
        <circle cx={37} cy={79} r={0.9} />
        <circle cx={64} cy={76} r={0.9} />
        <circle cx={75} cy={66} r={0.9} />
      </g>
      {/* seashell */}
      <g transform="translate(36 71)">
        <path d="M0 3 L-4.4 -1.6 Q0 -6 4.4 -1.6 Z" fill={p.c('#FFC4D3')} {...p.ink} stroke-width={p.w(1.3)} />
        <path d="M0 3 L-1.6 -3.8 M0 3 L1.6 -3.8" {...p.detail} stroke-width={p.w(0.9)} />
      </g>
      <Shine p={p} cx={19} cy={62} rx={1.4} ry={4.4} rotate={0} opacity={0.55} />
      <Shine p={p} cx={42} cy={45} rx={1.2} ry={3.6} rotate={0} opacity={0.55} />
      <path d="M16 88.5 Q50 96 84 88.5" fill="none" stroke="#fff" stroke-width={p.w(1.3)} opacity={0.8} stroke-dasharray="6 7" stroke-linecap="round" />
    </g>
  );
};

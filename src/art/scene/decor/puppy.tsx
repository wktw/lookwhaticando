/** Puppy Park decor: tennis balls, dog house. */
import { HEART, OUTLINE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

/** A fuzzy ball with its two curved seams bowing toward each other, rotated by `turn`. */
function Ball({ p, x, y, r, turn }: { p: Paint; x: number; y: number; r: number; turn: number }) {
  const s = (v: number) => +(v * r).toFixed(2);
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <circle r={r} fill={p.c('#E4F09A')} {...p.ink} />
      <path
        d={`M${s(-0.62)} ${s(-0.8)} C${s(0.05)} ${s(-0.42)} ${s(0.05)} ${s(0.42)} ${s(-0.62)} ${s(0.8)} M${s(0.62)} ${s(-0.8)} C${s(-0.05)} ${s(-0.42)} ${s(-0.05)} ${s(0.42)} ${s(0.62)} ${s(0.8)}`}
        fill="none"
        stroke={p.c('#FFFDF4')}
        stroke-width={p.w(2.4)}
        stroke-linecap="round"
      />
      <circle cx={s(-0.38)} cy={s(-0.45)} r={s(0.2)} fill="#fff" opacity={p.night ? 0.35 : 0.6} />
    </g>
  );
}

/** Three fuzzy balls, slightly slobbery. */
export const tennisBalls: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={36} ry={4} />
      <Ball p={p} x={50} y={52} r={15} turn={20} />
      <Ball p={p} x={32} y={78} r={15} turn={-30} />
      <Ball p={p} x={67} y={79} r={14} turn={60} />
    </g>
  );
};

/** A sky-blue dog house with a bone name-plate over the door, and a bowl of kibble. */
export const dogHouse: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={42} ry={4} />
      <g {...p.ink}>
        <path d="M20 93 L20 55 L50 31 L80 55 L80 93 Z" fill={p.c('#C6E2F8')} />
        <path d="M36 93 L36 73 Q36 60 50 60 Q64 60 64 73 L64 93 Z" fill={p.c('#7C5F69')} />
        <path d="M10 60 L50 24 L90 60 L83.5 65 L50 35 L16.5 65 Z" fill={p.c('#F7A8BC')} />
      </g>
      <path d="M40 91 L40 74 Q40 65 50 64" fill="none" stroke={p.c('#9A7C86')} stroke-width={2.4} stroke-linecap="round" opacity={0.8} />
      <g {...p.detail} stroke={p.c('#9CC4E6')}>
        <path d="M24 72 L34 72 M24 82 L34 82 M66 72 L76 72 M66 82 L76 82 M30 62 L40 62 M60 62 L70 62" />
      </g>
      {/* bone name-plate */}
      <g transform="translate(50 49)">
        <g fill={p.c('#FFF8EC')} {...p.ink} stroke-width={p.w(1.8)}>
          <circle cx={-9} cy={-2.2} r={2.9} />
          <circle cx={-9} cy={2.2} r={2.9} />
          <circle cx={9} cy={-2.2} r={2.9} />
          <circle cx={9} cy={2.2} r={2.9} />
        </g>
        <rect x={-9} y={-3.2} width={18} height={6.4} fill={p.c('#FFF8EC')} />
        <path d="M-8.4 -3.2 L8.4 -3.2 M-8.4 3.2 L8.4 3.2" stroke={OUTLINE} stroke-width={p.w(1.8)} />
        <path d={HEART} transform="scale(0.42)" fill={p.c('#F58CAA')} />
      </g>
      {/* kibble bowl */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <path d="M75 86 Q82 82.5 89 86 Z" fill={p.c('#C79A7C')} />
        <path d="M72 86 L92 86 L89.5 92 Q89 93 87.5 93 L76.5 93 Q75 93 74.5 92 Z" fill={p.c('#FFB8CB')} />
      </g>
      <Shine p={p} cx={30} cy={62} rx={2.2} ry={6} rotate={0} opacity={0.5} />
      <Shine p={p} cx={32} cy={44} rx={6} ry={1.8} rotate={-42} opacity={0.5} />
    </g>
  );
};

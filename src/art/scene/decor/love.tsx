/** Love Letters decor: heart balloons, love mailbox. */
import { HEART, OUTLINE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

/** Balloons: [x, y, scale, tilt, fill]. */
const BALLOONS: readonly (readonly [x: number, y: number, k: number, tilt: number, fill: string])[] = [
  [33, 30, 2.5, -12, '#FFB3C6'],
  [65, 25, 2.5, 12, '#EFC3F0'],
  [50, 48, 2.2, -2, '#FFCBA8'],
];

/** Where the ribbon strings are knotted: the point that gets tied to something in the Meadow. */
export const BALLOON_KNOT = [50, 84] as const;

/** Three heart balloons bobbing on ribbon strings. */
export const heartBalloons: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <g fill="none" stroke={OUTLINE} stroke-width={p.w(1.3)} stroke-linecap="round">
        <path d="M31 44 C28 58 44 66 49 84" />
        <path d="M67 39 C72 56 55 66 51 84" />
        <path d="M50 60 C47 70 52 76 50 84" />
      </g>
      {BALLOONS.map(([x, y, k, tilt, fill]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(${tilt}) scale(${k})`}>
          <path d="M-1.2 5.9 L1.2 5.9 L0.6 4.6 L-0.6 4.6 Z" fill={p.c(fill)} stroke={OUTLINE} stroke-width={p.w(2) / k} stroke-linejoin="round" />
          <path d={HEART} fill={p.c(fill)} stroke={OUTLINE} stroke-width={p.w(2.4) / k} stroke-linejoin="round" />
          <ellipse cx={-3} cy={-2.6} rx={1.1} ry={1.7} transform="rotate(35 -3 -2.6)" fill="#fff" opacity={p.night ? 0.4 : 0.7} />
        </g>
      ))}
      <g transform={`translate(${BALLOON_KNOT[0]} ${BALLOON_KNOT[1]})`} fill={p.c('#FFE593')} {...p.ink} stroke-width={p.w(1.8)}>
        <path d="M0 0 C-3 -5 -9 -5.5 -9 -1 C-9 3 -3 3 0 0 Z" />
        <path d="M0 0 C3 -5 9 -5.5 9 -1 C9 3 3 3 0 0 Z" />
        <path d="M-1 0.5 L-4 8 M1 0.5 L4 8" fill="none" />
        <circle r={2.2} fill={p.c('#F6C544')} />
      </g>
    </g>
  );
};

function Envelope({ p, x, y, tilt }: { p: Paint; x: number; y: number; tilt: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <rect x={-8} y={-5.5} width={16} height={11} rx={1.5} fill={p.c('#FFFDF7')} {...p.ink} stroke-width={p.w(1.8)} />
      <path d="M-7.4 -4.8 L0 1 L7.4 -4.8" fill="none" stroke={OUTLINE} stroke-width={p.w(1.3)} stroke-linejoin="round" />
      <path d={HEART} transform="translate(0 1.2) scale(0.36)" fill={p.c('#F58CAA')} />
    </g>
  );
}

/** A blush mailbox with its heart flag up: full of notes that say "you did great". */
export const loveMailbox: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={20} ry={3.4} />
      <rect x={45.5} y={56} width={9} height={37} rx={2} fill={p.c('#D9B08C')} {...p.ink} />
      <path d="M50 62 L50 88" stroke={p.c('#C39571')} stroke-width={2.4} stroke-linecap="round" />
      <Envelope p={p} x={83} y={38} tilt={-18} />
      <Envelope p={p} x={86} y={49} tilt={10} />
      <g {...p.ink}>
        <path d="M17 58 L17 41 Q17 28 30 28 L67 28 Q79 28 79 41 L79 58 Z" fill={p.c('#FFB8CB')} />
        <path d="M79 58 L79 41 Q79 30.5 73 29.4 Q76 34 76 41 L76 58 Z" fill={p.c('#F58CAA')} />
        <rect x={14} y={55} width={68} height={5.4} rx={2.7} fill={p.c('#F7A1B9')} />
      </g>
      <path d={HEART} transform="translate(49 43.5) scale(0.95)" fill={p.c('#FFFDF7')} />
      <path d="M23 36 Q25 33 29 32.4" {...p.detail} stroke={p.c('#F7A1B9')} stroke-width={p.w(1.4)} />
      {/* the flag is up */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <rect x={24.5} y={20} width={4} height={30} rx={2} fill={p.c('#C9A0DC')} />
        <circle cx={26.5} cy={47} r={2.8} fill={p.c('#FFE593')} />
      </g>
      <path d={HEART} transform="translate(33.5 22.5) rotate(-12) scale(0.9)" fill={p.c('#F58CAA')} stroke={OUTLINE} stroke-width={p.w(2)} stroke-linejoin="round" />
      <Shine p={p} cx={32} cy={33} rx={8} ry={2} rotate={-4} opacity={0.55} />
    </g>
  );
};

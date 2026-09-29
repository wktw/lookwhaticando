/** Pumpkin Patch decor: pumpkin pile, jack-o'-lantern. */
import { OUTLINE, STROKE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

interface PumpkinProps {
  p: Paint;
  x: number;
  y: number;
  /** Half-width and half-height. */
  w: number;
  h: number;
  fill: string;
  rib: string;
  stem?: number;
}

/** A lobed pumpkin: two side lobes tucked behind a centre lobe, each outlined. */
function Pumpkin({ p, x, y, w, h, fill, rib, stem = 0 }: PumpkinProps) {
  const stalk = `M${x} ${y - h + 1} q${-1 - stem * 0.2} ${-h * 0.35} ${1.5 + stem} ${-h * 0.5}`;
  return (
    <g>
      <path d={stalk} fill="none" stroke={OUTLINE} stroke-width={2.2 + p.w(STROKE * 2)} stroke-linecap="round" />
      <path d={stalk} fill="none" stroke={p.c('#9FBF7A')} stroke-width={2.2} stroke-linecap="round" />
      <g fill={p.c(fill)} {...p.ink}>
        <ellipse cx={x - w * 0.42} cy={y} rx={w * 0.58} ry={h * 0.96} />
        <ellipse cx={x + w * 0.42} cy={y} rx={w * 0.58} ry={h * 0.96} />
        <ellipse cx={x} cy={y} rx={w * 0.5} ry={h} />
      </g>
      <g {...p.detail} stroke={p.c(rib)}>
        <path d={`M${x - w * 0.72} ${y - h * 0.5} Q${x - w * 0.8} ${y} ${x - w * 0.72} ${y + h * 0.5}`} />
        <path d={`M${x + w * 0.72} ${y - h * 0.5} Q${x + w * 0.8} ${y} ${x + w * 0.72} ${y + h * 0.5}`} />
      </g>
      <Shine p={p} cx={x - w * 0.22} cy={y - h * 0.45} rx={w * 0.12} ry={h * 0.22} rotate={20} opacity={0.5} />
    </g>
  );
}

/** Three pumpkins, perfectly imperfect, with a curly vine. */
export const pumpkinPile: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={40} ry={4} />
      <Pumpkin p={p} x={52} y={52} w={13} h={10} fill="#FFF4E4" rib="#E9D2B4" stem={1} />
      <Pumpkin p={p} x={67} y={79} w={17} h={13} fill="#FFE08A" rib="#E9BF55" />
      <Pumpkin p={p} x={34} y={76} w={23} h={17} fill="#FFBE8C" rib="#EE955F" stem={2} />
      <path d="M36 58 C44 58 44 50 50 51 C54 52 52 57 49 56" fill="none" stroke={p.c('#86B972')} stroke-width={p.w(1.8)} stroke-linecap="round" />
      <path d="M22 60 C16 55 17 48 23 47 C27 51 27 56 22 60 Z" fill={p.c('#A6D38F')} {...p.ink} stroke-width={p.w(1.8)} />
    </g>
  );
};

/** A single pumpkin smiling a crooked, candlelit smile. */
export const jackLantern: DecorRenderer = (o) => {
  const p = paint(o);
  const flame = p.night ? '#FFE9A3' : '#FFD66E';
  return (
    <g>
      <Shadow rx={34} ry={4} />
      <Pumpkin p={p} x={50} y={67} w={36} h={25} fill="#FFB27E" rib="#EE8E58" stem={3} />
      <g fill={flame} stroke={OUTLINE} stroke-width={p.w(1.8)} stroke-linejoin="round">
        <path d="M31 62 L36.5 52.5 L42 62 Q36.5 64 31 62 Z" />
        <path d="M58 62 L63.5 52.5 L69 62 Q63.5 64 58 62 Z" />
        <path d="M32 71 Q50 78 68 70 Q66 83 50 84 Q34 84 32 71 Z" />
      </g>
      {/* one crooked tooth */}
      <path d="M45 76.4 L45.5 80.8 L50.5 80.8 L50 77" fill={p.c('#FFB27E')} stroke={OUTLINE} stroke-width={p.w(1.6)} stroke-linejoin="round" />
      <path d="M49 43 C44 37 34 35 31 40 C29 44 34 46 35.5 43" fill="none" stroke={p.c('#86B972')} stroke-width={p.w(1.8)} stroke-linecap="round" />
      <path d="M58 43 C62 36 70 37 70 42 C66 46 61 46 58 43 Z" fill={p.c('#A6D38F')} {...p.ink} stroke-width={p.w(1.8)} />
    </g>
  );
};

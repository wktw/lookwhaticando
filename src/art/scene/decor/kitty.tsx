/** Kitty Capsule decor: cardboard box, yarn basket, cat tree. */
import { OUTLINE, Shadow, Shine, paint, type DecorRenderer, type Paint } from './kit';

const KRAFT = '#EDC592';
const KRAFT_LIGHT = '#F6D8AE';
const KRAFT_SHADE = '#DDAE78';
const KRAFT_INSIDE = '#B98C62';

/** An open box with its flaps flopped out: the finest real estate in any meadow. */
export const cardboardBox: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={38} />
      <g {...p.ink}>
        {/* back and side flaps */}
        <path d="M23 40 L77 40 L73 25 L28 27 Z" fill={p.c(KRAFT_SHADE)} />
        <path d="M17 51 L23 40 L9 33.5 L4.5 45.5 Z" fill={p.c(KRAFT)} />
        <path d="M83 51 L77 40 L91 33.5 L95.5 45.5 Z" fill={p.c(KRAFT)} />
        {/* the opening */}
        <path d="M17 51 L23 40 L77 40 L83 51 Z" fill={p.c(KRAFT_INSIDE)} />
        {/* front wall */}
        <path d="M17 51 L83 51 L83 89.5 Q83 93 79.5 93 L20.5 93 Q17 93 17 89.5 Z" fill={p.c(KRAFT)} />
        {/* front flap folded down over the wall */}
        <path d="M17 51 L83 51 L81 63 L19 63 Z" fill={p.c(KRAFT_LIGHT)} />
      </g>
      <path d="M24 44 L76 44" stroke={p.c('#9F7552')} stroke-width={3} stroke-linecap="round" opacity={0.5} />
      <rect x={44} y={51.5} width={12} height={11} fill={p.c('#FFF3DF')} opacity={0.75} />
      {/* paw print stamp */}
      <g fill={p.c('#F58CAA')} opacity={0.85}>
        <ellipse cx={50} cy={81.5} rx={5.4} ry={4.4} />
        <circle cx={43.2} cy={75.8} r={2} />
        <circle cx={47.3} cy={72.6} r={2} />
        <circle cx={52.7} cy={72.6} r={2} />
        <circle cx={56.8} cy={75.8} r={2} />
      </g>
      <Shine p={p} cx={25} cy={70} rx={3} ry={8} rotate={0} opacity={0.35} />
    </g>
  );
};

const YARN = [
  { cx: 36, cy: 49, r: 13, fill: '#FFB8CB', line: '#F28FAB' },
  { cx: 62, cy: 46, r: 14, fill: '#B3D8F6', line: '#86BCE8' },
  { cx: 50, cy: 55, r: 11, fill: '#FFE593', line: '#F2CB57' },
] as const;

/** A wicker basket of pastel skeins, one strand escaping. */
export const yarnBasket: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={34} />
      {/* knitting needles */}
      <g {...p.ink} stroke-width={p.w(2)}>
        <path d="M58 44 L74 22" />
        <path d="M66 46 L80 28" />
        <circle cx={74.5} cy={21.3} r={2.6} fill={p.c('#D6C8F8')} stroke-width={p.w(1.8)} />
        <circle cx={80.5} cy={27.3} r={2.6} fill={p.c('#D6C8F8')} stroke-width={p.w(1.8)} />
      </g>
      {YARN.map((y) => (
        <g key={y.cx}>
          <circle cx={y.cx} cy={y.cy} r={y.r} fill={p.c(y.fill)} {...p.ink} />
          <g fill="none" stroke={p.c(y.line)} stroke-width={p.w(1.8)} stroke-linecap="round">
            <path d={`M${y.cx - y.r * 0.8} ${y.cy - y.r * 0.3} Q${y.cx} ${y.cy - y.r * 0.9} ${y.cx + y.r * 0.7} ${y.cy - y.r * 0.1}`} />
            <path d={`M${y.cx - y.r * 0.9} ${y.cy + y.r * 0.15} Q${y.cx} ${y.cy - y.r * 0.4} ${y.cx + y.r * 0.85} ${y.cy + y.r * 0.35}`} />
            <path d={`M${y.cx - y.r * 0.3} ${y.cy - y.r * 0.9} Q${y.cx + y.r * 0.1} ${y.cy} ${y.cx - y.r * 0.2} ${y.cy + y.r * 0.9}`} />
          </g>
        </g>
      ))}
      {/* basket */}
      <g {...p.ink}>
        <path d="M20 60 L80 60 Q79.5 87 70 91.5 Q68 93 64 93 L36 93 Q32 93 30 91.5 Q20.5 87 20 60 Z" fill={p.c('#EAC08E')} />
        <rect x={15.5} y={55} width={69} height={9} rx={4.5} fill={p.c('#DDAE78')} />
      </g>
      <g {...p.detail} stroke={p.c('#B98A5E')}>
        <path d="M22.5 72 Q50 76 77.5 72" />
        <path d="M25 82 Q50 86 75 82" />
        {[31, 40.5, 50, 59.5, 69].map((x) => (
          <path key={x} d={`M${x} 65 L${x + (x - 50) * 0.08} 91`} />
        ))}
      </g>
      {/* the escaping strand */}
      <path d="M26 56 C18 60 10 66 12 76 C13.5 84 22 84 21 90" fill="none" stroke={p.c('#F58CAA')} stroke-width={p.w(2.2)} stroke-linecap="round" />
      <Shine p={p} cx={26} cy={66} rx={2.4} ry={5} rotate={10} opacity={0.4} />
    </g>
  );
};

const CARPET = '#D9CCF7';
const CARPET_SHADE = '#BFAEEB';
const SISAL = '#EFD3A6';

function Post({ p, x, top, bottom }: { p: Paint; x: number; top: number; bottom: number }) {
  const rows: number[] = [];
  for (let y = top + 4; y < bottom - 1; y += 4.5) rows.push(y);
  return (
    <g>
      <rect x={x - 5} y={top} width={10} height={bottom - top} fill={p.c(SISAL)} {...p.ink} />
      <g stroke={p.c('#C9A472')} stroke-width={p.w(1.3)} stroke-linecap="round">
        {rows.map((y) => (
          <path key={y} d={`M${x - 3.6} ${y} L${x + 3.6} ${y - 1.4}`} />
        ))}
      </g>
    </g>
  );
}

/** Three levels of lounging luxury: posts, a cubby, a top bed and a dangling pom-pom. */
export const catTree: DecorRenderer = (o) => {
  const p = paint(o);
  return (
    <g>
      <Shadow rx={33} />
      <Post p={p} x={34} top={50} bottom={86} />
      <Post p={p} x={52} top={22} bottom={60} />
      {/* dangling pom-pom */}
      <path d="M22 51 L22 62" stroke={OUTLINE} stroke-width={p.w(1.4)} />
      <circle cx={22} cy={65.5} r={4} fill={p.c('#FFB8CB')} {...p.ink} stroke-width={p.w(2)} />
      {/* cubby */}
      <g {...p.ink}>
        <rect x={49} y={59} width={30} height={28} rx={7} fill={p.c('#FFC4D3')} />
        <circle cx={64} cy={74} r={7.6} fill={p.c('#8A6470')} />
        <rect x={46} y={55} width={36} height={7} rx={3.5} fill={p.c(CARPET)} />
        <rect x={16} y={46} width={34} height={7} rx={3.5} fill={p.c(CARPET)} />
        <rect x={18} y={85} width={64} height={8} rx={4} fill={p.c(CARPET)} />
      </g>
      <path d="M60 71 Q64 68.6 68 71" fill="none" stroke={p.c('#FFD9E2')} stroke-width={p.w(1.4)} stroke-linecap="round" opacity={0.8} />
      {/* top bed with a butter cushion */}
      <g {...p.ink}>
        <path d="M33 21 Q33 31 52 31 Q71 31 71 21 Z" fill={p.c(CARPET)} />
        <ellipse cx={52} cy={20.5} rx={16} ry={4.6} fill={p.c('#FFE593')} />
      </g>
      <path d="M38 27.5 Q52 30 66 27.5" fill="none" stroke={p.c(CARPET_SHADE)} stroke-width={p.w(1.6)} stroke-linecap="round" />
      <Shine p={p} cx={42} cy={18.6} rx={4} ry={1.4} rotate={-6} opacity={0.6} />
      <Shine p={p} cx={54} cy={64} rx={1.8} ry={3.4} rotate={0} opacity={0.5} />
    </g>
  );
};

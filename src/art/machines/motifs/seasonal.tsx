import { OUTLINE } from '../geometry';
import { shade, tint } from '../color';
import { Face, HEART_PATH, Heart, Leaf, Snowflake } from '../parts';
import { Print, SW, type Motif } from './shared';

/* The five seasonal series (they return every year). */

/** A vine curling from the pumpkin's stem down over the cap, with two big leaves and a tendril. */
function Vine() {
  const vine = 'M125 6 C134 1 146 4 151 13 C155 20 153 29 158 36';
  return (
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d={vine} fill="none" stroke={OUTLINE} stroke-width={SW + 3.2} />
      <path d={vine} fill="none" stroke="#8EC07C" stroke-width={3.2} />
      <path d="M158 36 C163 40 168 36 165 31.5 C163 28.5 158.6 30.6 160.6 33.6" fill="none" stroke={OUTLINE} stroke-width={1.8} />
      <Leaf x={139} y={4} rot={-28} s={1.35} fill="#C3DFB4" />
      <Leaf x={152} y={19} rot={62} s={1.25} fill="#A9D495" />
      <Leaf x={112} y={9} rot={200} s={1.05} fill="#C3DFB4" />
    </g>
  );
}

export const pumpkin: Motif = {
  // Soft pumpkin ribs bowing out from the middle.
  body: ({ theme }) => (
    <g fill="none" stroke={shade(theme.body, 0.16)} stroke-width={2.6} stroke-linecap="round" opacity={0.5}>
      {[58, 84, 156, 182].map((x) => (
        <path key={x} d={`M${x} 214 Q${x + (x - 120) * 0.22} 258 ${x} 304`} />
      ))}
      <path d="M58 214 Q44 258 58 304 M182 214 Q196 258 182 304" stroke={tint(theme.body, 0.35)} stroke-width={5} opacity={0.6} />
    </g>
  ),
  topper: () => (
    <g>
      <Vine />
      <g class="machine-sway" stroke={OUTLINE} stroke-linejoin="round">
        <path d="M121 12 C121 7 122.5 4 125.5 2" fill="none" stroke="#8C6A5A" stroke-width={4.2} stroke-linecap="round" />
        <g stroke-width={SW}>
          <ellipse cx={110} cy={23} rx={10} ry={11} fill="#FF9E6E" />
          <ellipse cx={130} cy={23} rx={10} ry={11} fill="#FF9E6E" />
          <ellipse cx={120} cy={23} rx={10} ry={12.5} fill="#FFB27A" />
        </g>
        <ellipse cx={114.5} cy={17} rx={2.6} ry={1.6} transform="rotate(-30 114.5 17)" fill="#fff" stroke="none" opacity={0.7} />
        <Face x={120} y={24} spread={5} scale={0.75} mouth="u" />
      </g>
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.8} stroke-linejoin="round">
      <path d="M0 16 L0 5" stroke-width={2.4} stroke-linecap="round" />
      <path d="M0 6 L-4 8 L-5 4 L-12 5 L-9 0 L-14 -3 L-8 -5 L-9 -11 L-4 -8 L0 -15 L4 -8 L9 -11 L8 -5 L14 -3 L9 0 L12 5 L5 4 L4 8 Z" fill="#FFCBA8" />
      <path d="M0 5 L0 -9 M0 1 L-6 -4 M0 1 L6 -4" fill="none" stroke-width={1.1} opacity={0.5} stroke-linecap="round" />
    </g>
  ),
};

export const snow: Motif = {
  // A cozy knit: rows of little V stitches, and a ribbed cuff.
  body: ({ theme, uid }) => (
    <g>
      <Print id={`${uid}-knit`} w={8} h={7} opacity={0.5}>
        <path d="M1 1 L4 5.4 L7 1" fill="none" stroke={tint(theme.body, 0.45)} stroke-width={1.5} stroke-linecap="round" stroke-linejoin="round" />
      </Print>
      <rect x={36} y={292} width={168} height={16} fill={tint(theme.body, 0.28)} />
      <g stroke={theme.body} stroke-width={1.6} opacity={0.8}>
        {Array.from({ length: 34 }, (_, i) => (
          <path key={i} d={`M${38 + i * 5} 295 L${38 + i * 5} 306`} />
        ))}
      </g>
    </g>
  ),
  cap: () => (
    <g>
      <path
        d="M82.5 46 C82 35 97 29 120 29 C143 29 158 35 157.5 46 C155 49.5 151.6 46 150 48.5 C148.6 51 150.6 55.6 146.4 56.4 C142 57 142.8 50 139 49.4 C134.6 48.8 134 52 129.8 52 C125.6 52 126.4 47.8 121.6 47.8 C116.6 47.8 118.4 53.6 113.6 54.2 C109 54.8 109.6 49 105.6 48.8 C101.4 48.6 101.2 51.8 96.8 51.4 C92.6 51 93 47 88.8 47.2 C85.8 47.4 84.8 49.4 82.5 46 Z"
        fill="#fff"
        stroke={OUTLINE}
        stroke-width={SW}
        stroke-linejoin="round"
      />
      <path d="M98 36 Q106 32.5 114 32" fill="none" stroke="#E7F3FD" stroke-width={3} stroke-linecap="round" />
    </g>
  ),
  topper: () => (
    <g stroke={OUTLINE} stroke-width={SW}>
      <circle cx={120} cy={20} r={10} fill="#fff" />
      <path d="M113 24 Q120 29 127 24" fill="none" stroke="#BBDCF6" stroke-width={2} stroke-linecap="round" />
      <path d="M126 12 C129 8 133 8 135 9" fill="none" stroke-width={2} stroke-linecap="round" />
      <circle cx={133.5} cy={10} r={2.6} fill="#F0607F" stroke-width={1.4} />
      <circle cx={129.6} cy={7} r={2.6} fill="#F0607F" stroke-width={1.4} />
    </g>
  ),
  front: () => (
    <g>
      <Snowflake cls="machine-twinkle" x={34} y={70} s={0.95} />
      <Snowflake cls="machine-twinkle" x={212} y={112} s={1.05} />
      <Snowflake cls="machine-twinkle" x={196} y={30} s={0.7} />
      <Snowflake cls="machine-twinkle" x={26} y={172} s={0.7} />
    </g>
  ),
  decal: () => <Snowflake x={0} y={0} s={1.7} />,
};

/** Scallops along the bottom of the body, each holding a tiny heart, like lace on a valentine. */
function HeartTrim({ trim }: { trim: string }) {
  const top = 293;
  const xs = Array.from({ length: 16 }, (_, i) => 40 + i * 10);
  const edge = xs.map((x) => `A5 5 0 0 1 ${x + 10} ${top}`).join(' ');
  return (
    <g>
      <path d={`M40 ${top} ${edge} V310 H40 Z`} fill={trim} stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round" />
      {xs.map((x) => (
        <path key={x} d={HEART_PATH} transform={`translate(${x + 5} ${top + 3.4}) scale(0.3)`} fill="#F58CAA" />
      ))}
    </g>
  );
}

export const love: Motif = {
  // Lilac-pink, so Love Letters never reads as a second Kitty Capsule.
  theme: { body: '#E78DC2' },
  body: ({ theme }) => <HeartTrim trim={theme.trim} />,
  topper: () => (
    <g class="machine-sway">
      <path d="M120 34 L120 22" stroke={OUTLINE} stroke-width={SW + 3} stroke-linecap="round" />
      <path d="M120 34 L120 22" stroke="#FFE9EF" stroke-width={3} stroke-linecap="round" />
      <Heart x={120} y={14} s={1.45} fill="#FF9FB8" />
    </g>
  ),
  front: () => (
    <g>
      <Heart cls="machine-float" x={204} y={52} s={0.65} fill="#FFC4D3" />
      <Heart cls="machine-float" x={36} y={84} s={0.5} fill="#F58CAA" />
      <Heart cls="machine-float" x={214} y={150} s={0.45} fill="#F0C6F0" />
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.9} stroke-linejoin="round">
      <rect x={-14} y={-10} width={28} height={20} rx={3.5} fill="#fff" />
      <path d="M-13 -8.6 L0 2 L13 -8.6" fill="none" />
      <path d="M-13 8.6 L-5 1.5 M13 8.6 L5 1.5" fill="none" stroke-width={1.3} opacity={0.5} />
      <Heart x={0} y={2.4} s={0.5} fill="#F58CAA" />
    </g>
  ),
};

/** A raindrop about 9 units tall, centered on its round bottom. */
const DROP = 'M0 -4.5 C1.6 -1.6 3 0.4 3 2 C3 3.8 1.6 5 0 5 C-1.6 5 -3 3.8 -3 2 C-3 0.4 -1.6 -1.6 0 -4.5 Z';

export const rainy: Motif = {
  body: ({ uid }) => (
    <Print id={`${uid}-rain`} w={24} h={28} opacity={0.5}>
      <g fill="#fff">
        <path d={DROP} transform="translate(6 8) scale(0.85)" />
        <path d={DROP} transform="translate(18 22) scale(0.7)" />
      </g>
    </Print>
  ),
  topper: () => (
    <g>
      <g class="machine-rain" fill="#9CC8EF" stroke={OUTLINE} stroke-width={1.4}>
        {[
          [84, 34],
          [158, 30],
          [148, 40],
          [92, 44],
        ].map(([x, y]) => (
          <g key={`${x}`} transform={`translate(${x} ${y})`}>
            <path class="machine-drop" d={DROP} />
          </g>
        ))}
      </g>
      <path
        d="M92 30 C84 30 83 19 91 18 C91 9 101 5 107 10 C110 3 122 1 127 8 C132 3 142 6 142 14 C150 14 153 24 146 28 C150 32 145 36 140 34 Z"
        transform="translate(0 -2)"
        fill="#fff"
        stroke={OUTLINE}
        stroke-width={SW}
        stroke-linejoin="round"
      />
      <path d="M96 16 Q100 11 105 12" fill="none" stroke="#BBDCF6" stroke-width={2} stroke-linecap="round" transform="translate(0 -2)" />
      <Face x={117} y={20} spread={7} scale={0.85} mouth="u" eyes="sleepy" />
    </g>
  ),
  decal: () => (
    <g fill="none" stroke-linecap="round">
      <path d="M-14 6 A14 14 0 0 1 14 6" stroke={OUTLINE} stroke-width={13} />
      <path d="M-14 6 A14 14 0 0 1 14 6" stroke="#FFC4D3" stroke-width={8.5} />
      <path d="M-9.4 6 A9.4 9.4 0 0 1 9.4 6" stroke="#FFE593" stroke-width={3.6} />
      <path d="M-5.4 6 A5.4 5.4 0 0 1 5.4 6" stroke="#BBDCF6" stroke-width={3} />
      <g fill="#fff" stroke={OUTLINE} stroke-width={1.6}>
        <ellipse cx={-14} cy={7} rx={5} ry={3.4} />
        <ellipse cx={14} cy={7} rx={5} ry={3.4} />
      </g>
    </g>
  ),
};

/** A wide striped parasol: five scalloped panels from the apex, pastel and white. */
function Parasol() {
  const cx = 124;
  const half = 38;
  const rimY = 21;
  const top = 1;
  const panel = (2 * half) / 5;
  const colors = ['#FFC4D3', '#fff', '#FFE593', '#fff', '#FFC4D3'];
  const x = (i: number) => cx - half + i * panel;
  const scallop = (i: number) => `Q${x(i) + panel / 2} ${rimY - 4} ${x(i + 1)} ${rimY}`;
  const canopy = `M${x(0)} ${rimY} C${x(0)} ${top + 5} ${cx - half * 0.6} ${top} ${cx} ${top} C${cx + half * 0.6} ${top} ${x(5)} ${top + 5} ${x(5)} ${rimY} ${[
    4, 3, 2, 1, 0,
  ]
    .map((i) => `Q${x(i) + panel / 2} ${rimY - 4} ${x(i)} ${rimY}`)
    .join(' ')} Z`;
  return (
    <g transform={`rotate(-10 ${cx} 38)`}>
      <g class="machine-sway">
        <path d={`M${cx} 38 L${cx} 10`} stroke={OUTLINE} stroke-width={SW + 2.6} stroke-linecap="round" />
        <path d={`M${cx} 38 L${cx} 10`} stroke="#fff" stroke-width={2.6} stroke-linecap="round" />
        <path d={canopy} fill={colors[0]} />
        {colors.map((c, i) => (i === 0 ? null : <path key={i} d={`M${cx} ${top + 1} L${x(i)} ${rimY} ${scallop(i)} Z`} fill={c} />))}
        <path d={canopy} fill="none" stroke={OUTLINE} stroke-width={SW} stroke-linejoin="round" />
        <path
          d={`M${cx - 30} ${top + 9} Q${cx - 22} ${top + 3.5} ${cx - 13} ${top + 2}`}
          fill="none"
          stroke="#fff"
          stroke-width={2.4}
          stroke-linecap="round"
          opacity={0.9}
        />
        <circle cx={cx} cy={top - 1.5} r={2.8} fill="#fff" stroke={OUTLINE} stroke-width={1.7} />
      </g>
    </g>
  );
}

/** A wavy band across the body, `y` at its middle. */
const wave = (y: number, amp: number) => `M36 ${y} ${Array.from({ length: 9 }, (_, i) => `q${9.5} ${i % 2 ? amp : -amp} 19 0`).join(' ')}`;

export const beach: Motif = {
  // Sea waves over a strip of sand.
  body: () => (
    <g fill="none" stroke-linecap="round">
      <path d={wave(258, 4)} stroke="#fff" stroke-width={3} opacity={0.45} />
      <path d={wave(272, 4)} stroke="#fff" stroke-width={2.2} opacity={0.3} />
      <path d={`${wave(290, 3.2)} V312 H36 Z`} fill="#FFE8A8" stroke="none" />
      <path d={wave(290, 3.2)} stroke="#fff" stroke-width={2.6} />
      <g fill="#F6C544" opacity={0.6} stroke="none">
        <circle cx={52} cy={300} r={1} />
        <circle cx={70} cy={303} r={0.9} />
        <circle cx={168} cy={301} r={1} />
        <circle cx={186} cy={298} r={0.9} />
      </g>
    </g>
  ),
  topper: () => <Parasol />,
  front: () => (
    <g stroke={OUTLINE} stroke-linejoin="round">
      <path
        d="M0 -9 L2.6 -3 L9 -3.4 L4 1 L6 7.4 L0 3.8 L-6 7.4 L-4 1 L-9 -3.4 L-2.6 -3 Z"
        transform="translate(48 326) rotate(-12)"
        fill="#FFCBA8"
        stroke-width={1.8}
      />
      <g transform="translate(78 334) rotate(8)">
        <path d="M-7 3 C-7 -4 -1 -7 3 -5 C7 -3 7 2 3 3.5 C0 4.5 -2 2 0 0.4" fill="#FBEAFB" stroke-width={1.7} stroke-linecap="round" />
        <path d="M-7 3 L7 3" stroke-width={1.7} stroke-linecap="round" />
      </g>
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.9} stroke-linejoin="round">
      <path d="M0 12 C-10 12 -15 2 -14 -4 C-13 -10 -7 -14 0 -14 C7 -14 13 -10 14 -4 C15 2 10 12 0 12 Z" fill="#FFCBA8" />
      <path d="M0 12 L0 -13 M0 12 L-7 -11.5 M0 12 L7 -11.5 M0 12 L-12 -6 M0 12 L12 -6" fill="none" stroke-width={1.2} opacity={0.55} stroke-linecap="round" />
      <path d="M-5 11 L-6 15 L6 15 L5 11" fill="#FFB38F" />
    </g>
  ),
};

import type { JSX } from 'preact';
import type { MachineDef, MachineId } from '@/catalog/types';
import { OUTLINE, STROKE } from './geometry';
import { tint } from './color';
import { Blossom, Face, Heart, Leaf, Snowflake, Sparkle, Star } from './parts';

/**
 * Per-series dressing (DESIGN §6.2): each machine is the same gumball machine wearing its
 * own topper and decals. Layers, back to front:
 *   back → body (clipped to the body) → decal (at DECAL, local coords) → capBack (behind the
 *   dome cap) → cap (over the cap) → topper (replaces the default knob) → front
 */
export interface MotifCtx {
  theme: MachineDef['theme'];
  uid: string;
}

type Layer = (ctx: MotifCtx) => JSX.Element | null;

export interface Motif {
  back?: Layer;
  body?: Layer;
  decal?: Layer;
  capBack?: Layer;
  cap?: Layer;
  topper?: Layer;
  front?: Layer;
}

const MIRROR = 'translate(240 0) scale(-1 1)';
const PETAL = 'M0 0 C-3 -3 -3 -7 0 -8 L1 -6.6 L2 -8 C5 -7 4 -3 0 0 Z';
const SW = STROKE;

/** Smooth closed blob through points around (cx, cy); `k` varies each radius for an organic spot. */
function blob(cx: number, cy: number, rx: number, ry: number, k: number[]): string {
  const pts = k.map((f, i) => {
    const a = (i / k.length) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f] as const;
  });
  const n = pts.length;
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** A cute face sitting on the dome cap. */
const capFace = (mouth: 'u' | 'cat' | 'none' = 'u') => <Face x={120} y={41} spread={11} scale={0.9} mouth={mouth} />;

/* ------------------------------------------------------------------ */

const kitty: Motif = {
  back: ({ theme }) => (
    <g class="machine-tail">
      <path d="M186 292 C207 295 219 280 217 260 C216 250 211 244 205 244" fill="none" stroke={OUTLINE} stroke-width={9 + SW * 2} stroke-linecap="round" />
      <path d="M186 292 C207 295 219 280 217 260 C216 250 211 244 205 244" fill="none" stroke={theme.body} stroke-width={9} stroke-linecap="round" />
    </g>
  ),
  capBack: ({ theme }) => {
    const ear = (
      <g>
        <path
          d="M84 46 C83 34 85 22 89 14 C90.4 11.4 93.4 11.2 95.4 13.2 C100 17.6 105 23.5 109 31"
          fill={theme.body}
          stroke={OUTLINE}
          stroke-width={SW}
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <path d="M89.5 36 C89.5 29 90.6 23.4 92.4 19.6 C95.6 22.6 99 26.2 101.8 29.8 C97.4 30.8 93 33 89.5 36 Z" fill={tint(theme.body, 0.6)} />
      </g>
    );
    return (
      <g class="machine-ears">
        <g class="machine-ear-l">{ear}</g>
        <g transform={MIRROR}>{ear}</g>
      </g>
    );
  },
  topper: () => (
    <g transform="translate(145 25) rotate(18)" stroke={OUTLINE} stroke-width={1.8} stroke-linejoin="round">
      <path d="M0 0 C-3 -5 -9.5 -6 -10 -1 C-10.4 4 -4 4 0 0 Z" fill="#FFE593" />
      <path d="M0 0 C3 -5 9.5 -6 10 -1 C10.4 4 4 4 0 0 Z" fill="#FFE593" />
      <ellipse rx={2.6} ry={2.8} fill="#F6C544" />
    </g>
  ),
  front: () => (
    <g>
      <g stroke={OUTLINE} stroke-width={1.6} stroke-linecap="round" opacity={0.6}>
        <path d="M85 42 L68 38.5" />
        <path d="M85 46 L67 47" />
        <path d="M155 42 L172 38.5" />
        <path d="M155 46 L173 47" />
      </g>
      {capFace('cat')}
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={2} stroke-linejoin="round">
      <path d="M-15 -7 L-8 0 L-15 7 Z" fill="#9CC8EF" />
      <ellipse cx={1} cy={0} rx={11} ry={7.5} fill="#BBDCF6" />
      <path d="M-3 -5 Q-6 0 -3 5" fill="none" stroke-width={1.4} opacity={0.5} />
      <circle cx={5.5} cy={-1.5} r={1.5} fill={OUTLINE} stroke="none" />
      <circle cx={12} cy={-12} r={2.2} fill="#fff" stroke-width={1.3} />
      <circle cx={16} cy={-19} r={1.4} fill="#fff" stroke-width={1.1} />
    </g>
  ),
};

const moo: Motif = {
  body: () => (
    <g fill="#6E5250">
      <path d={blob(50, 282, 17, 15, [1, 0.8, 1.1, 0.9, 1.05, 0.85])} />
      <path d={blob(194, 268, 14, 16, [0.9, 1.1, 0.85, 1, 0.9, 1.1])} />
      <path d={blob(160, 304, 9, 6, [1, 0.8, 1.1, 0.9, 1, 0.9])} />
      <path d={blob(66, 213, 10, 6, [1, 0.9, 1.1, 0.8, 1, 1])} />
    </g>
  ),
  capBack: ({ theme }) => {
    const side = (
      <g stroke={OUTLINE} stroke-width={SW} stroke-linejoin="round">
        <path d="M99 38 C96 30 95.5 22 98 16 C99 13.8 101.8 14 102.5 16.2 C103.8 21 105.8 27 110 33" fill="#FFF3D6" stroke-linecap="round" />
        <g transform="rotate(-20 78 43)">
          <ellipse cx={78} cy={43} rx={12} ry={6.6} fill={theme.body} />
          <ellipse cx={77} cy={43.4} rx={7} ry={3.4} fill={theme.trim} stroke="none" />
        </g>
      </g>
    );
    return (
      <g>
        {side}
        <g transform={MIRROR}>{side}</g>
      </g>
    );
  },
  cap: () => <path d={blob(143, 38, 7.5, 5, [1, 0.85, 1.1, 0.9, 1, 1])} fill="#6E5250" />,
  topper: () => (
    <path
      d="M112 32 C109 25 113 19.5 119 20 C117 23 118 25.5 121 26 C121 21 125 18 130 19.5 C127 22 128 27 124 31 Z"
      fill="#6E5250"
      stroke={OUTLINE}
      stroke-width={1.8}
      stroke-linejoin="round"
    />
  ),
  front: () => capFace('u'),
  decal: ({ theme }) => (
    <g stroke={OUTLINE} stroke-width={2} stroke-linejoin="round">
      <path d="M-5 -15 L5 -15 L5 -10 C9 -7 10 -4 10 0 L10 13 Q10 16 7 16 L-7 16 Q-10 16 -10 13 L-10 0 C-10 -4 -9 -7 -5 -10 Z" fill="#fff" />
      <rect x={-6} y={-19} width={12} height={5.5} rx={2} fill={theme.trim} />
      <path d="M-10 1 L10 1 L10 10 L-10 10 Z" fill={theme.trim} stroke="none" />
      <Heart x={0} y={5.6} s={0.42} fill="#F58CAA" />
      <path d="M-5 -15 L5 -15 L5 -10 C9 -7 10 -4 10 0 L10 13 Q10 16 7 16 L-7 16 Q-10 16 -10 13 L-10 0 C-10 -4 -9 -7 -5 -10 Z" fill="none" />
    </g>
  ),
};

const puppy: Motif = {
  topper: () => null,
  front: () => {
    const ear = (
      <g stroke={OUTLINE} stroke-width={SW} stroke-linejoin="round">
        <path d="M93 36 C81 32 70 41 67 56 C64 71 66 85 74.5 87 C82 88.5 86.5 79.5 88.4 67 C90 57 92 47 97 41 Z" fill="#F4CFA4" />
        <path d="M84 45 C77 50 73 60 72.5 70 C72.2 76 73.6 80 76 80.5" fill="none" stroke-width={1.5} opacity={0.35} stroke-linecap="round" />
      </g>
    );
    return (
      <g>
        <g class="machine-ear-l">{ear}</g>
        <g transform={MIRROR}>{ear}</g>
        <Face x={120} y={39} spread={11} scale={0.9} mouth="none" />
        <ellipse cx={120} cy={44.2} rx={3.4} ry={2.4} fill={OUTLINE} />
        <path d="M117.4 46.4 Q120 49 122.6 46.4" fill="none" stroke={OUTLINE} stroke-width={1.4} stroke-linecap="round" />
      </g>
    );
  },
  decal: () => (
    <g fill="#fff" stroke={OUTLINE} stroke-width={1.9}>
      <path d="M0 -1 C6 -1 10 5 10 9 C10 13 6 14 3 12.5 C1.2 11.6 -1.2 11.6 -3 12.5 C-6 14 -10 13 -10 9 C-10 5 -6 -1 0 -1 Z" />
      <ellipse cx={-10.5} cy={-4} rx={3.4} ry={4.2} transform="rotate(-25 -10.5 -4)" />
      <ellipse cx={-4} cy={-10.5} rx={3.4} ry={4.4} transform="rotate(-8 -4 -10.5)" />
      <ellipse cx={4} cy={-10.5} rx={3.4} ry={4.4} transform="rotate(8 4 -10.5)" />
      <ellipse cx={10.5} cy={-4} rx={3.4} ry={4.2} transform="rotate(25 10.5 -4)" />
    </g>
  ),
};

const sakura: Motif = {
  back: () => (
    <g class="machine-petals" fill="#FFC4D3" stroke={OUTLINE} stroke-width={1.3}>
      <g transform="translate(30 104) rotate(-30)">
        <path class="machine-petal" d={PETAL} />
      </g>
      <g transform="translate(22 176) rotate(40)">
        <path class="machine-petal" d={PETAL} />
      </g>
    </g>
  ),
  topper: () => (
    <g>
      <path d="M120 34 L120 24" stroke={OUTLINE} stroke-width={SW + 3} stroke-linecap="round" />
      <path d="M120 34 L120 24" stroke="#B98A72" stroke-width={3} stroke-linecap="round" />
      <Blossom x={120} y={18} s={1.15} rot={-8} />
    </g>
  ),
  front: () => {
    const branch = 'M150 42 C164 40 178 44 190 56 C200 66 205 80 206 96';
    const twig = 'M176 45 C180 38 184 32 190 28';
    return (
      <g>
        <g fill="none" stroke-linecap="round">
          <path d={branch} stroke={OUTLINE} stroke-width={SW * 2 + 4.5} />
          <path d={twig} stroke={OUTLINE} stroke-width={SW * 2 + 3} />
          <path d={branch} stroke="#B98A72" stroke-width={4.5} />
          <path d={twig} stroke="#B98A72" stroke-width={3} />
        </g>
        <Leaf x={168} y={43} rot={-50} s={0.9} />
        <Leaf x={201} y={72} rot={80} s={0.85} />
        <Blossom x={160} y={40} s={0.85} rot={12} />
        <Blossom x={190} y={27} s={0.75} rot={-20} />
        <Blossom x={193} y={60} s={1.05} rot={30} />
        <Blossom x={206} y={96} s={0.85} rot={4} />
        <circle cx={181} cy={49} r={3.4} fill="#F58CAA" stroke={OUTLINE} stroke-width={1.5} />
      </g>
    );
  },
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.9} stroke-linejoin="round">
      <ellipse cx={-4.5} cy={-11} rx={3.4} ry={8.5} transform="rotate(-10 -4.5 -11)" fill="#fff" />
      <ellipse cx={4.5} cy={-11} rx={3.4} ry={8.5} transform="rotate(10 4.5 -11)" fill="#fff" />
      <ellipse cx={-4.5} cy={-10} rx={1.4} ry={5} transform="rotate(-10 -4.5 -10)" fill="#FFC4D3" stroke="none" />
      <ellipse cx={4.5} cy={-10} rx={1.4} ry={5} transform="rotate(10 4.5 -10)" fill="#FFC4D3" stroke="none" />
      <ellipse cx={0} cy={3} rx={11} ry={9.5} fill="#fff" />
      <circle cx={-4} cy={2} r={1.4} fill={OUTLINE} stroke="none" />
      <circle cx={4} cy={2} r={1.4} fill={OUTLINE} stroke="none" />
      <ellipse cx={-7} cy={6} rx={2.2} ry={1.3} fill="#FF9FB8" stroke="none" opacity={0.7} />
      <ellipse cx={7} cy={6} rx={2.2} ry={1.3} fill="#FF9FB8" stroke="none" opacity={0.7} />
      <path d="M-1.4 4.6 Q0 6 1.4 4.6" fill="none" stroke-width={1.2} />
      <Blossom x={8} y={-6} s={0.45} />
    </g>
  ),
};

const sweets: Motif = {
  cap: () => (
    <g>
      <path
        d="M83 45 C83 36 98 29.5 120 29.5 C142 29.5 157 36 157 45 C154 48.5 151 45.5 148 47.5 C145.6 49 147 56.5 142.6 56.5 C138.4 56.5 139.6 48 136 47 C131.5 46 131 51.5 126.4 51.5 C121.8 51.5 123 45.6 118 45.6 C112.6 45.6 114 55 109 55 C104.6 55 105.8 46.5 101.4 46.5 C97 46.5 96.4 50.5 92.4 49.6 C88.6 48.8 87.4 44.6 83 45 Z"
        fill="#FFD1DC"
        stroke={OUTLINE}
        stroke-width={SW}
        stroke-linejoin="round"
      />
      <path d="M96 36 Q106 32 116 32" fill="none" stroke="#fff" stroke-width={3} stroke-linecap="round" opacity={0.8} />
      {[
        [104, 40, 20, '#7DB7E8'],
        [114, 37, -30, '#FFE593'],
        [128, 39, 45, '#8EC07C'],
        [138, 36, -10, '#fff'],
        [146, 42, 30, '#7DB7E8'],
        [95, 44, -40, '#FFE593'],
        [121, 42, 80, '#fff'],
      ].map(([x, y, r, c]) => (
        <rect key={`${x}-${y}`} x={-3} y={-1} width={6} height={2} rx={1} fill={c as string} transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </g>
  ),
  topper: () => (
    <g stroke={OUTLINE} stroke-linejoin="round">
      <path d="M121 13 C122 7 125 2.5 131 0" fill="none" stroke-width={SW} stroke-linecap="round" />
      <path d="M126 5 C130 1.5 135 2 137 4 C134 6.5 129.5 7 126 5 Z" fill="#C3DFB4" stroke-width={1.6} />
      <circle cx={120} cy={21} r={9.5} fill="#F0607F" stroke-width={SW} />
      <ellipse cx={116.6} cy={17.6} rx={2.8} ry={1.9} transform="rotate(-35 116.6 17.6)" fill="#fff" stroke="none" opacity={0.85} />
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.9} stroke-linejoin="round">
      <circle r={13} fill="#F4CFA4" />
      <path
        d="M-11 -2 C-11 -9 -5 -11 0 -11 C6 -11 11 -8 11 -2 C11 3 8 3 7 5 C6 8 3 6 1 8 C-1 10 -3 7 -5 7 C-8 7 -8 4 -10 3 C-11 2 -11 0 -11 -2 Z"
        fill="#FFC4D3"
      />
      <circle r={3.6} fill="#FFCBA8" />
      <g stroke="none">
        <rect x={-7} y={-7} width={3.4} height={1.3} rx={0.6} fill="#7DB7E8" transform="rotate(30 -5 -6)" />
        <rect x={4} y={-8} width={3.4} height={1.3} rx={0.6} fill="#FFE593" transform="rotate(-20 5 -7)" />
        <rect x={5} y={1} width={3.4} height={1.3} rx={0.6} fill="#fff" transform="rotate(60 6 2)" />
        <rect x={-8} y={1} width={3.4} height={1.3} rx={0.6} fill="#8EC07C" transform="rotate(-50 -6 2)" />
      </g>
    </g>
  ),
};

const dreamy: Motif = {
  back: ({ uid }) => (
    <g>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0.55" stop-color="#E9DFFF" stop-opacity="0.95" />
          <stop offset="0.8" stop-color="#D6C8F8" stop-opacity="0.45" />
          <stop offset="1" stop-color="#D6C8F8" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle class="machine-glow" cx={120} cy={126} r={128} fill={`url(#${uid}-glow)`} />
    </g>
  ),
  topper: () => (
    <g stroke={OUTLINE} stroke-linejoin="round">
      <path d="M120 34 L120 26" stroke-width={SW + 2.4} stroke-linecap="round" />
      <path d="M120 34 L120 26" stroke="#FFE593" stroke-width={2.6} stroke-linecap="round" />
      <g transform="translate(118 12) rotate(-18)">
        <path
          d="M4 -13 C-6 -14 -14 -6 -14 2 C-14 10 -6 15 2 14.5 C8 14 12.5 10 14 5 C10 8 4.5 8.6 -0.5 6.2 C-6.4 3.4 -7.6 -5.8 4 -13 Z"
          fill="#FFE593"
          stroke-width={SW}
        />
        <path d="M-9.6 1.6 Q-7.4 3.8 -5.2 1.6" fill="none" stroke-width={1.5} stroke-linecap="round" />
        <ellipse cx={-6.6} cy={6.6} rx={2.4} ry={1.4} fill="#FF9FB8" stroke="none" opacity={0.7} />
      </g>
    </g>
  ),
  front: () => (
    <g>
      <Star cls="machine-twinkle" x={40} y={58} s={0.95} />
      <Sparkle cls="machine-twinkle" x={210} y={54} s={1.3} />
      <Star cls="machine-twinkle" x={218} y={156} s={0.75} fill="#FFF3C4" />
      <Sparkle cls="machine-twinkle" x={24} y={146} s={1.05} fill="#FFF3C4" />
      <Sparkle cls="machine-twinkle" x={72} y={20} s={0.8} />
      <Star cls="machine-twinkle" x={176} y={14} s={0.7} />
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.9} stroke-linejoin="round">
      <path d="M-12 7 C-17 7 -17 -1 -11 -1 C-11 -7 -3 -9 0 -4 C2 -9 11 -8 11 -1 C16 -1 16 7 11 7 Z" fill="#fff" />
      <Sparkle x={9} y={-11} s={0.7} />
      <path d="M-5 2.4 Q-3.6 3.6 -2.2 2.4 M2.2 2.4 Q3.6 3.6 5 2.4" fill="none" stroke-width={1.3} stroke-linecap="round" />
    </g>
  ),
};

const pumpkin: Motif = {
  topper: () => (
    <g stroke={OUTLINE} stroke-linejoin="round">
      <path d="M121 10 C121 5 123 2 127 0" fill="none" stroke="#8C6A5A" stroke-width={4} stroke-linecap="round" />
      <path d="M124 7 C130 1 138 3 139 8 C134 11 128 11 124 7 Z" fill="#C3DFB4" stroke-width={1.6} />
      <path d="M113 10 C107 8 104 4 106 1.5" fill="none" stroke="#8EC07C" stroke-width={1.6} stroke-linecap="round" />
      <g stroke-width={SW}>
        <ellipse cx={110} cy={22} rx={10} ry={11} fill="#FF9E6E" />
        <ellipse cx={130} cy={22} rx={10} ry={11} fill="#FF9E6E" />
        <ellipse cx={120} cy={22} rx={10} ry={12.5} fill="#FFB27A" />
      </g>
      <ellipse cx={114.5} cy={16} rx={2.6} ry={1.6} transform="rotate(-30 114.5 16)" fill="#fff" stroke="none" opacity={0.7} />
      <Face x={120} y={23} spread={5} scale={0.75} mouth="u" />
    </g>
  ),
  front: () => (
    <g>
      <Leaf x={168} y={196} rot={-28} s={1.1} fill="#FFCBA8" />
      <Leaf x={186} y={322} rot={-8} s={1} fill="#FFE593" />
      <Leaf x={40} y={318} rot={-160} s={0.9} fill="#C3DFB4" />
    </g>
  ),
  decal: () => (
    <g stroke={OUTLINE} stroke-width={1.8} stroke-linejoin="round">
      <path d="M0 16 L0 5" stroke-width={2.4} stroke-linecap="round" />
      <path d="M0 6 L-4 8 L-5 4 L-12 5 L-9 0 L-14 -3 L-8 -5 L-9 -11 L-4 -8 L0 -15 L4 -8 L9 -11 L8 -5 L14 -3 L9 0 L12 5 L5 4 L4 8 Z" fill="#FF9E6E" />
      <path d="M0 5 L0 -9 M0 1 L-6 -4 M0 1 L6 -4" fill="none" stroke-width={1.1} opacity={0.5} stroke-linecap="round" />
    </g>
  ),
};

const snow: Motif = {
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

const love: Motif = {
  topper: () => (
    <g>
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

const rainy: Motif = {
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
            <path class="machine-drop" d="M0 -4.5 C1.6 -1.6 3 0.4 3 2 C3 3.8 1.6 5 0 5 C-1.6 5 -3 3.8 -3 2 C-3 0.4 -1.6 -1.6 0 -4.5 Z" />
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

const beach: Motif = {
  topper: () => {
    const rim = 'Q148 13.5 142 17 Q136 13.5 130 17 Q124 13.5 118 17 Q112 13.5 106 17 Q100 13.5 94 17';
    const canopy = `M94 17 C94 6 108 0 124 0 C140 0 154 6 154 17 ${rim} Z`;
    return (
      <g transform="rotate(-12 124 38)">
        <path d="M124 38 L124 8" stroke={OUTLINE} stroke-width={SW + 2.6} stroke-linecap="round" />
        <path d="M124 38 L124 8" stroke="#fff" stroke-width={2.6} stroke-linecap="round" />
        <path d={canopy} fill="#FFC4D3" />
        <g fill="#fff">
          <path d="M124 1 L106 17 Q112 13.5 118 17 Z" />
          <path d="M124 1 L130 17 Q136 13.5 142 17 Z" />
        </g>
        <path d="M124 1 L118 17 Q124 13.5 130 17 Z" fill="#FFE593" />
        <path d={canopy} fill="none" stroke={OUTLINE} stroke-width={SW} stroke-linejoin="round" />
        <path d="M102 9 Q108 4 114 3" fill="none" stroke="#fff" stroke-width={2.4} stroke-linecap="round" opacity={0.9} />
        <circle cx={124} cy={-1.5} r={2.8} fill="#fff" stroke={OUTLINE} stroke-width={1.7} />
      </g>
    );
  },
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

export const MOTIFS: Record<MachineId, Motif> = { kitty, moo, puppy, sakura, sweets, dreamy, pumpkin, snow, love, rainy, beach };

import { OUTLINE } from '../geometry';
import { tint } from '../color';
import { Blossom, Face, Heart, Leaf, Sparkle, Star } from '../parts';
import { MIRROR, PETAL, SW, blob, capFace, type Motif } from './shared';

/* The six standard series. */

export const kitty: Motif = {
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

export const moo: Motif = {
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

export const puppy: Motif = {
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

export const sakura: Motif = {
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

export const sweets: Motif = {
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

export const dreamy: Motif = {
  back: ({ uid }) => (
    <g>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0.55" stop-color="#E9DFFF" stop-opacity="0.95" />
          <stop offset="0.8" stop-color="#D6C8F8" stop-opacity="0.45" />
          <stop offset="1" stop-color="#D6C8F8" stop-opacity="0" />
        </radialGradient>
      </defs>
      {/* Static on purpose: pulsing a glow this large would repaint the whole machine every frame. */}
      <circle cx={120} cy={126} r={128} fill={`url(#${uid}-glow)`} />
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

import type { PetLook } from './types';

type AuraKind = NonNullable<PetLook['aura']>;

/** Radial glow stops per aura: [offset %, color, opacity]. Drawn as a gradient, never a CSS filter (cheap on iPhone). */
const GLOWS: Partial<Record<AuraKind, [number, string, number][]>> = {
  glow: [
    [0, '#FFF6CF', 0.95],
    [45, '#FFE593', 0.6],
    [75, '#FFD65C', 0.22],
    [100, '#FFD65C', 0],
  ],
  holo: [
    [0, '#FFFFFF', 0.7],
    [38, '#FFE593', 0.42],
    [56, '#FFB3C7', 0.36],
    [72, '#B3E6D6', 0.3],
    [86, '#BBDCF6', 0.22],
    [100, '#D6C8F8', 0],
  ],
  ghost: [
    [0, '#F2EDFE', 0.9],
    [60, '#D6C8F8', 0.35],
    [100, '#D6C8F8', 0],
  ],
};

/** Soft halo behind rare pets. */
export function Aura({ kind, uid }: { kind: AuraKind; uid: string }) {
  const stops = GLOWS[kind];
  if (!stops) return null;
  const id = `${uid}-aura`;
  return (
    <g class="pet-aura">
      <defs>
        <radialGradient id={id}>
          {stops.map(([o, c, a]) => (
            <stop key={o} offset={`${o}%`} stop-color={c} stop-opacity={a} />
          ))}
        </radialGradient>
      </defs>
      <ellipse cx={50} cy={60} rx={47} ry={43} fill={`url(#${id})`} />
    </g>
  );
}

const SPARKLE_PATH = 'M0 -4 C0.6 -1 1 -0.6 4 0 C1 0.6 0.6 1 0 4 C-0.6 1 -1 0.6 -4 0 C-1 -0.6 -0.6 -1 0 -4 Z';

const SPOTS = [
  { x: 12, y: 30, s: 0.9 },
  { x: 89, y: 40, s: 0.7 },
  { x: 86, y: 16, s: 1.1 },
  { x: 16, y: 70, s: 0.6 },
];
const HOLO_FILLS = ['#FFB3C7', '#B3E6D6', '#FFE593', '#D6C8F8'];

/** Four little ✦ sparkles orbiting rare/ultra variants (pastel rainbow for holo). */
export function Sparkles({ holo }: { holo?: boolean }) {
  return (
    <g class="pet-sparkles" stroke="#fff" stroke-width={0.6}>
      {SPOTS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <path class="pet-twinkle" style={{ animationDelay: `${-i * 0.45}s` }} d={SPARKLE_PATH} fill={holo ? HOLO_FILLS[i] : '#FFE593'} />
        </g>
      ))}
    </g>
  );
}

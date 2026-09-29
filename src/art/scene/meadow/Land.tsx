import { memo } from 'preact/compat';
import { OUTLINE } from '@/art/pets/geometry';
import type { ScenePalette } from '../palette';
import { ridge, SPARKLE, type Pt } from '../paths';
import { GATE_X } from '../layout';
import { Fence } from './Fence';
import { useUid } from '../uid';
import s from './meadow.module.css';

/**
 * The land: far hills, near hills with the cottage, the meadow floor with its stepping-stone
 * path, the fence and garden gate, toadstools and wildflowers.
 * One 6000-wide canvas, centred on the scene at 10 units to 1U (see layout.ts), so a phone sees
 * the middle ~700 units and a desktop ~2000; nothing is ever stretched. The horizon is at
 * canvas y = 460; the floor runs on below y = 1000 for tall portrait scenes.
 */

const FAR: Pt[] = [
  [-100, 330], [350, 272], [800, 322], [1300, 262], [1800, 318], [2250, 268], [2700, 312],
  [3150, 262], [3600, 316], [4050, 270], [4550, 322], [5050, 262], [5550, 316], [6100, 290],
];
/** Near hills, with a round crest behind the gate for the cottage. */
const NEAR: Pt[] = [
  [-100, 400], [300, 368], [700, 404], [1150, 356], [1600, 402], [2050, 364], [2480, 400],
  [2850, 384], [GATE_X, 352], [3480, 394], [3780, 360], [4150, 402], [4600, 362], [5050, 404], [5500, 360], [6100, 396],
];
/** Lollipop trees on the far hills: [x, y, size]. */
const FAR_TREES: readonly (readonly [x: number, y: number, k: number])[] = [
  [2170, 292, 1], [2215, 300, 0.75], [3560, 312, 0.9], [3605, 318, 0.7], [4010, 286, 1], [1250, 280, 0.9], [4950, 282, 0.9], [2620, 312, 0.8],
];
/** Round bushes on the near hills: [x, y, r]. */
const BUSHES: readonly (readonly [x: number, y: number, r: number])[] = [
  [2380, 394, 26], [2424, 402, 18], [3800, 372, 24], [3840, 381, 16], [1460, 390, 24], [4700, 380, 22], [3330, 386, 16],
];
/** The cottage where resting pets nap, on the crest right behind the gate. */
const COTTAGE = { x: GATE_X, y: 354 };

type Bloom = 'white' | 'pink' | 'butter' | 'lilac' | 'tuft' | 'tick' | 'dew';
/** Wildflowers, tufts and grass ticks for one 2000-wide tile (x 2000..4000), repeated either side. The path (x ≈ 3030–3170) stays clear. */
const TILE: readonly (readonly [x: number, y: number, kind: Bloom])[] = [
  // along the horizon, in front of the fence
  [2090, 478, 'white'], [2116, 488, 'pink'], [2470, 476, 'butter'], [2694, 482, 'white'], [2718, 490, 'pink'],
  [2960, 480, 'tuft'], [3330, 486, 'white'], [3354, 476, 'lilac'], [3600, 480, 'pink'], [3905, 486, 'white'], [3930, 476, 'tuft'],
  // far field
  [2250, 560, 'tuft'], [2560, 590, 'pink'], [2590, 600, 'white'], [2880, 540, 'tick'], [3250, 575, 'tick'], [3300, 560, 'butter'],
  [3332, 572, 'white'], [3520, 600, 'tuft'], [3760, 560, 'lilac'], [3790, 572, 'white'], [2420, 530, 'tick'], [3660, 520, 'tick'],
  // mid-field flower patches (two in a phone's view, more either side)
  [2740, 700, 'pink'], [2768, 716, 'white'], [2796, 698, 'butter'], [2716, 714, 'tuft'], [2822, 712, 'tuft'],
  [3290, 760, 'lilac'], [3318, 776, 'pink'], [3346, 758, 'white'], [3266, 772, 'tuft'],
  [2380, 690, 'pink'], [2408, 706, 'white'], [2432, 690, 'tuft'], [3620, 700, 'butter'], [3648, 716, 'white'], [3672, 700, 'tuft'],
  [3880, 740, 'lilac'], [3906, 756, 'pink'],
  // blooms along the path
  [3176, 520, 'white'], [3066, 612, 'pink'], [3150, 680, 'butter'], [3050, 790, 'white'], [3160, 890, 'pink'], [3000, 1000, 'butter'],
  // near field
  [2150, 820, 'tuft'], [2600, 790, 'tick'], [2940, 860, 'tick'], [3300, 820, 'tick'], [3720, 790, 'tick'],
  [3950, 850, 'tuft'], [2560, 900, 'tick'], [3560, 900, 'tick'],
  // dawn dew
  [2230, 620, 'dew'], [2660, 760, 'dew'], [2960, 600, 'dew'], [3380, 660, 'dew'], [3700, 840, 'dew'], [3900, 600, 'dew'], [2440, 880, 'dew'],
];
const PETALS = { white: '#FFFDF7', pink: '#FFC4D3', butter: '#FFE593', lilac: '#E4D6FA' } as const;

/** Flat things further back look smaller: 0.7 at the horizon → 1.6 at the front edge. */
const depth = (y: number) => 0.7 + ((y - 460) / 540) * 0.9;

/** Stepping stones from the front of the meadow, meandering up to the gate: [x, y]. */
const STONES: readonly (readonly [x: number, y: number])[] = [
  [3060, 1330], [3040, 1180], [3050, 1050], [3082, 944], [3104, 856], [3106, 778], [3094, 710], [3090, 650],
  [3102, 600], [3120, 558], [3136, 524], [3146, 498],
];
/** Tiny toadstool clusters: [x, y]. */
const TOADSTOOLS: readonly (readonly [x: number, y: number])[] = [
  [2724, 628], [3280, 610], [2230, 880], [3800, 760],
];

function SteppingStones({ palette }: { palette: ScenePalette }) {
  const stone = palette.night ? '#B9B3CF' : '#F3EADF';
  const shade = palette.night ? '#9E97B8' : '#E2D4C4';
  return (
    <g stroke={palette.line} stroke-linejoin="round">
      {STONES.map(([x, y], i) => {
        const k = depth(y);
        return (
          <g key={y} transform={`translate(${x} ${y}) scale(${k.toFixed(2)}) rotate(${i % 2 ? 4 : -5})`}>
            <ellipse rx={28} ry={10} fill={shade} stroke-width={+(3 / k).toFixed(2)} />
            <ellipse cx={-1.5} cy={-2} rx={25} ry={7.5} fill={stone} stroke="none" />
            <ellipse cx={-10} cy={-4} rx={7} ry={2} fill="#fff" opacity={palette.night ? 0.35 : 0.6} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

function Toadstools({ palette, glow }: { palette: ScenePalette; glow: string }) {
  const cap = palette.night ? '#FFB8C4' : '#FF9FA8';
  return (
    <g stroke={palette.line} stroke-width={2.6} stroke-linejoin="round">
      {TOADSTOOLS.map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${depth(y).toFixed(2)})`}>
          {palette.night && <circle cx={6} cy={-12} r={34} fill={`url(#${glow})`} stroke="none" />}
          {(
            [
              [0, 0, 1],
              [13, 3, 0.7],
            ] as const
          ).map(([dx, dy, k]) => (
            <g key={dx} transform={`translate(${dx} ${dy}) scale(${k})`}>
              <path d="M-3.5 0 L-3 -9 L3 -9 L3.5 0 Z" fill="#FFF6EA" />
              <path d="M-10 -8 Q-10 -19 0 -19 Q10 -19 10 -8 Z" fill={cap} />
              <circle cx={-3.5} cy={-13.5} r={2} fill="#fff" stroke="none" />
              <circle cx={4} cy={-12} r={1.6} fill="#fff" stroke="none" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

/** The cottage on the crest behind the gate: chimney, heart window, and warm light at night. */
function Cottage({ palette, glow }: { palette: ScenePalette; glow: string }) {
  const lit = palette.night;
  return (
    <g transform={`translate(${COTTAGE.x} ${COTTAGE.y}) scale(0.8)`} stroke={palette.line} stroke-width={3.6} stroke-linejoin="round" stroke-linecap="round">
      {lit && <circle cx={0} cy={-22} r={90} fill={`url(#${glow})`} stroke="none" />}
      <rect x={14} y={-58} width={9} height={18} rx={2} fill={lit ? '#C98F95' : '#E9B7A6'} />
      <path d="M-25 -2 L-25 -30 L25 -30 L25 -2 Z" fill={lit ? '#E4D5CC' : '#FFF6EA'} />
      <path d="M-33 -28 Q-31 -33 -26 -37 L-4 -55 Q0 -58 4 -55 L26 -37 Q31 -33 33 -28 Z" fill={lit ? '#C47E9A' : '#F7A8BC'} />
      <rect x={-18} y={-24} width={13} height={12} rx={2.5} fill={lit ? '#FFE9A3' : '#CFE6F7'} />
      <path d="M-11.5 -24 L-11.5 -12 M-18 -18 L-5 -18" fill="none" stroke-width={1.8} />
      <path d="M5 -2 L5 -17 Q10.5 -22 16 -17 L16 -2" fill={lit ? '#FFD98A' : '#D9A988'} />
      <path d="M-5 -46 C-6 -48.5 -3 -50 0 -47.5 C3 -50 6 -48.5 5 -46 L0 -42 Z" fill="#F58CAA" stroke-width={1.6} />
    </g>
  );
}

function Blooms({ palette, id }: { palette: ScenePalette; id: string }) {
  return (
    <defs>
      <path
        id={`${id}-tuft`}
        d="M-10 0 C-10 -6 -8 -11 -5 -15 C-4 -9 -2.6 -5 -1.2 -2 C-0.6 -9 0.8 -15 3.4 -19 C4.8 -12 4.4 -6 3.2 -2 C5.4 -6.4 8.4 -9.2 11.4 -10.2 C9.6 -6.2 8.6 -3 8.4 0 Z"
        fill={palette.grass}
        stroke={palette.grassLine}
        stroke-width={2}
        stroke-linejoin="round"
      />
      <path id={`${id}-tick`} d="M-6 0 Q-5 -4 -3 -7 M0 0 Q0 -5 1 -9 M5 0 Q5.4 -3.6 7.4 -6" fill="none" stroke={palette.grassLine} stroke-width={2.2} stroke-linecap="round" opacity={0.45} />
      {palette.time === 'dawn' ? (
        <path id={`${id}-dew`} d={SPARKLE} transform="scale(9)" fill="#fff" opacity={0.95} />
      ) : (
        <g id={`${id}-dew`} />
      )}
      {(Object.keys(PETALS) as (keyof typeof PETALS)[]).map((kind) => (
        <g id={`${id}-${kind}`} key={kind}>
          <path d="M0 0 Q-1 -9 0 -17" fill="none" stroke={palette.grassLine} stroke-width={2.2} stroke-linecap="round" />
          <path d="M-0.6 -7 Q-7 -9 -8 -4 Q-3 -3 -0.6 -7 Z" fill={palette.grass} stroke={palette.grassLine} stroke-width={1.4} stroke-linejoin="round" />
          <g fill={PETALS[kind]} stroke={OUTLINE} stroke-width={1.4} opacity={palette.bloom}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle key={a} cx={+(Math.sin((a * Math.PI) / 180) * 4.4).toFixed(2)} cy={+(-21 - Math.cos((a * Math.PI) / 180) * 4.4).toFixed(2)} r={3.9} />
            ))}
          </g>
          <circle cx={0} cy={-21} r={2.7} fill="#FFD65C" stroke={OUTLINE} stroke-width={1.2} />
        </g>
      ))}
    </defs>
  );
}

const NEAR_FIELD: Pt[] = [
  [-100, 640], [900, 606], [1900, 650], [2900, 612], [3900, 652], [4900, 608], [6100, 640],
];
const FLOOR_BOTTOM = 1900;

function LandArt({ palette }: { palette: ScenePalette }) {
  const id = useUid('land');
  const night = palette.night;
  const wash = palette.wash;
  return (
    <svg class={s.land} viewBox="0 0 6000 1000" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-near`} x1="0" y1="610" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color={palette.meadowNear} />
          <stop offset="1" stop-color={palette.meadowFront} />
        </linearGradient>
        <linearGradient id={`${id}-contact`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={palette.grassLine} stop-opacity={0.22} />
          <stop offset="1" stop-color={palette.grassLine} stop-opacity={0} />
        </linearGradient>
        {wash && (
          <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color={wash.color} stop-opacity={0} />
            <stop offset="0.45" stop-color={wash.color} stop-opacity={wash.opacity} />
            <stop offset="1" stop-color={wash.color} stop-opacity={0} />
          </linearGradient>
        )}
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stop-color="#FFE7A0" stop-opacity={0.75} />
          <stop offset="0.35" stop-color="#FFE7A0" stop-opacity={0.3} />
          <stop offset="1" stop-color="#FFE7A0" stop-opacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-moonlight`}>
          <stop offset="0" stop-color="#E3DCFF" stop-opacity={0.26} />
          <stop offset="1" stop-color="#E3DCFF" stop-opacity={0} />
        </radialGradient>
      </defs>
      <Blooms palette={palette} id={id} />

      {/* far hills, hazy and outline-free */}
      <path d={ridge(FAR, 520)} fill={palette.hillFar} />
      {FAR_TREES.map(([x, y, k]) => (
        <g key={x} fill={palette.hillFarDetail} transform={`translate(${x} ${y}) scale(${k})`}>
          <rect x={-2.5} y={-14} width={5} height={16} rx={2} />
          <ellipse cx={0} cy={-26} rx={14} ry={17} />
        </g>
      ))}
      {/* morning mist lying in the valleys (dawn) */}
      {palette.time === 'dawn' && <rect x={-100} y={250} width={6200} height={230} fill={`url(#${id}-wash)`} />}

      {/* near hills, with a soft colored line */}
      <path d={ridge(NEAR, 560)} fill={palette.hillNear} stroke={palette.hillLine} stroke-width={3.4} stroke-linejoin="round" />
      {BUSHES.map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill={palette.hillNearShade} stroke={palette.hillLine} stroke-width={2.6} />
      ))}
      <Cottage palette={palette} glow={`${id}-glow`} />
      {palette.time === 'dawn' && <rect x={-100} y={330} width={6200} height={150} fill={`url(#${id}-wash)`} />}

      {/* the meadow floor: a far field and a gently rolling near field */}
      <path d={`M-100 470 Q3000 448 6100 470 L6100 ${FLOOR_BOTTOM} L-100 ${FLOOR_BOTTOM} Z`} fill={palette.meadowBack} />
      <rect x={-100} y={456} width={6200} height={46} fill={`url(#${id}-contact)`} />
      <path d={ridge(NEAR_FIELD, FLOOR_BOTTOM)} fill={`url(#${id}-near)`} />
      {/* low-sun light washed over the far meadow (golden hour) */}
      {palette.time === 'golden' && <rect x={-100} y={420} width={6200} height={380} fill={`url(#${id}-wash)`} />}
      {night && (
        <>
          <ellipse cx={3000} cy={760} rx={1000} ry={240} fill={`url(#${id}-moonlight)`} />
          <ellipse cx={GATE_X} cy={490} rx={130} ry={34} fill={`url(#${id}-glow)`} />
        </>
      )}
      <SteppingStones palette={palette} />
      <Fence palette={palette} glow={`${id}-glow`} />
      <Toadstools palette={palette} glow={`${id}-glow`} />

      {/* wildflowers & tufts: one tile, repeated either side for wide screens */}
      <g id={`${id}-tile`}>
        {TILE.map(([x, y, kind]) => (
          <use key={`${x}-${y}`} href={`#${id}-${kind}`} transform={`translate(${x} ${y}) scale(${depth(y).toFixed(2)})`} />
        ))}
      </g>
      <use href={`#${id}-tile`} x={-2000} />
      <use href={`#${id}-tile`} x={2000} />
    </svg>
  );
}

/** The land only changes with the time of day, so parent re-renders (pets moving) skip it. */
export const Land = memo(LandArt);

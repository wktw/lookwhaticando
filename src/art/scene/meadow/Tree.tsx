import type { ScenePalette } from '../palette';
import { useUid } from '../uid';
import s from './meadow.module.css';

/**
 * The big round cozy tree, with a rope swing and a little lantern (lit at night).
 * Canvas 700×1000 at the scene's scale; its trunk stands on the horizon (y 460–470).
 */

/** Canopy puffs [cx, cy, r]; their union is the silhouette. */
const CANOPY: readonly [number, number, number][] = [
  [118, 262, 92],
  [196, 176, 112],
  [292, 236, 94],
  [212, 292, 104],
  [140, 170, 70],
  [276, 146, 70],
];
/** Little peaches hanging in the canopy: [x, y]. */
const PEACHES: readonly [number, number][] = [
  [248, 188],
  [150, 300],
  [322, 270],
  [96, 214],
  [196, 330],
];
const LINE = 3.6;

function Canopy({ palette, clip }: { palette: ScenePalette; clip: string }) {
  const puffs = CANOPY.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />);
  return (
    <g>
      <g fill={palette.line} stroke={palette.line} stroke-width={LINE * 2}>
        {puffs}
      </g>
      <g fill={palette.leaf}>{puffs}</g>
      <g clip-path={`url(#${clip})`}>
        <ellipse cx={220} cy={392} rx={200} ry={70} fill={palette.leafShade} />
        <ellipse cx={20} cy={300} rx={50} ry={90} fill={palette.leafShade} />
      </g>
      <ellipse cx={150} cy={118} rx={42} ry={20} transform="rotate(-30 150 118)" fill={palette.leafLight} opacity={0.9} />
      <ellipse cx={92} cy={200} rx={16} ry={9} transform="rotate(-50 92 200)" fill={palette.leafLight} opacity={0.7} />
      {/* leaf flicks */}
      <g fill="none" stroke={palette.leafShade} stroke-width={3.4} stroke-linecap="round">
        <path d="M232 110 q10 -8 20 -2" />
        <path d="M300 200 q10 -8 20 -2" />
        <path d="M120 260 q10 -8 20 -2" />
        <path d="M200 236 q10 -8 20 -2" />
        <path d="M268 300 q10 -8 20 -2" />
      </g>
      {/* little peaches */}
      <g stroke={palette.line} stroke-width={2.4}>
        {PEACHES.map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path d="M1 -8 C4 -15 11 -15 13 -11 C9 -8 5 -7 1 -8 Z" fill={palette.leafShade} stroke-width={2} stroke-linejoin="round" />
            <circle r={9.5} fill={palette.night ? '#D98E9A' : '#FFB2A6'} />
            <circle cx={-3} cy={-3} r={2.6} fill="#fff" opacity={0.7} stroke="none" />
          </g>
        ))}
      </g>
    </g>
  );
}

export function Tree({ palette, class: cls }: { palette: ScenePalette; class?: string }) {
  const clip = useUid('canopy');
  const lit = palette.night;
  return (
    <svg class={cls} viewBox="0 0 700 1000" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${clip}-glow`}>
          <stop offset="0" stop-color="#FFE7A0" stop-opacity={0.8} />
          <stop offset="0.3" stop-color="#FFE7A0" stop-opacity={0.32} />
          <stop offset="1" stop-color="#FFE7A0" stop-opacity={0} />
        </radialGradient>
        <clipPath id={clip}>
          {CANOPY.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </clipPath>
      </defs>
      {/* trunk with root flares and a knot hole */}
      <path
        d="M170 472 C182 462 186 440 186 410 L186 330 L234 330 L234 410 C234 440 238 462 252 472 C236 476 226 468 220 462 C214 470 204 476 190 470 C184 474 176 476 170 472 Z"
        fill={palette.trunk}
        stroke={palette.line}
        stroke-width={LINE}
        stroke-linejoin="round"
      />
      <path d="M222 348 L222 452" stroke={palette.trunkShade} stroke-width={8} stroke-linecap="round" />
      <ellipse cx={204} cy={404} rx={7} ry={9.5} fill={palette.line} opacity={0.85} />
      {/* swing branch */}
      <path d="M228 386 C262 372 312 360 372 352" fill="none" stroke={palette.line} stroke-width={16 + LINE * 2} stroke-linecap="round" />
      <path d="M228 386 C262 372 312 360 372 352" fill="none" stroke={palette.trunk} stroke-width={16} stroke-linecap="round" />
      <Canopy palette={palette} clip={clip} />
      {/* lantern, hanging close to the trunk */}
      <g class={s.lantern}>
        <path d="M282 368 L282 384" stroke={palette.line} stroke-width={2.4} />
        {lit && <circle cx={282} cy={400} r={78} fill={`url(#${clip}-glow)`} />}
        <g stroke={palette.line} stroke-width={2.6} stroke-linejoin="round">
          <rect x={272} y={383} width={20} height={6} rx={2} fill="#C9A0DC" />
          <rect x={273.5} y={389} width={17} height={21} rx={5} fill={lit ? '#FFE9A3' : '#FFF6DE'} />
          <rect x={272} y={409} width={20} height={5} rx={2} fill="#C9A0DC" />
        </g>
      </g>
      {/* rope swing, rocking gently from the branch */}
      <g class={s.swing} stroke={palette.line} stroke-linejoin="round" stroke-linecap="round">
        <path d="M322 362 L318 452 M356 356 L360 450" stroke-width={2.6} fill="none" />
        <rect x={306} y={448} width={66} height={10} rx={4} fill={palette.night ? '#D08BA5' : '#FFB8CB'} stroke-width={2.8} />
      </g>
    </svg>
  );
}

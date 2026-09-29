import { OUTLINE } from '@/art/pets/geometry';
import type { ScenePalette } from '../palette';
import { CRESCENT, SPARKLE } from '../paths';
import { useUid } from '../uid';
import s from './sky.module.css';

const SUN_RAYS = Array.from({ length: 10 }, (_, i) => (i * 36 * Math.PI) / 180);

function Sun({ palette }: { palette: ScenePalette }) {
  return (
    <g>
      <g stroke={palette.orb} stroke-width={3.4} stroke-linecap="round" opacity={0.9}>
        {SUN_RAYS.map((a) => (
          <path key={a} d={`M${(50 + Math.cos(a) * 26).toFixed(1)} ${(50 + Math.sin(a) * 26).toFixed(1)} L${(50 + Math.cos(a) * 30.5).toFixed(1)} ${(50 + Math.sin(a) * 30.5).toFixed(1)}`} />
        ))}
      </g>
      <circle cx={50} cy={50} r={19.5} fill={palette.orb} stroke={OUTLINE} stroke-width={1.6} />
      <ellipse cx={42.5} cy={41.5} rx={6} ry={3.4} transform="rotate(-32 42.5 41.5)" fill="#fff" opacity={0.5} />
      {/* sleepy-happy face */}
      <g fill="none" stroke={OUTLINE} stroke-width={1.5} stroke-linecap="round">
        <path d="M41.4 51 Q43.6 48.6 45.8 51" />
        <path d="M54.2 51 Q56.4 48.6 58.6 51" />
        <path d="M48.3 54.6 Q50 56.4 51.7 54.6" />
      </g>
      <ellipse cx={39.6} cy={55.2} rx={2.8} ry={1.6} fill="#FF9FB8" opacity={0.6} />
      <ellipse cx={60.4} cy={55.2} rx={2.8} ry={1.6} fill="#FF9FB8" opacity={0.6} />
    </g>
  );
}

function Moon({ palette }: { palette: ScenePalette }) {
  return (
    <g>
      <path d={CRESCENT} fill={palette.orb} stroke={OUTLINE} stroke-width={1.6} stroke-linejoin="round" />
      <ellipse cx={37} cy={44} rx={3.4} ry={2} transform="rotate(-50 37 44)" fill="#fff" opacity={0.55} />
      <path d="M36.2 53.4 Q38.4 55.8 40.6 53.4" fill="none" stroke={OUTLINE} stroke-width={1.4} stroke-linecap="round" />
      <ellipse cx={41.8} cy={59.4} rx={2.4} ry={1.4} fill="#FF9FB8" opacity={0.6} />
      <path d={SPARKLE} transform="translate(74 30) scale(3.6)" fill="#FFF3C2" />
      <path d={SPARKLE} transform="translate(80 44) scale(2.2)" fill="#FFF3C2" />
    </g>
  );
}

export interface OrbProps {
  palette: ScenePalette;
  /** Centre position and size (the orb canvas edge) as CSS lengths. */
  x: string;
  y: string;
  size: string;
}

/**
 * The halo: bright around the sun's disc; around the moon it is softer and leans toward the lit
 * limb, so the crescent's bite still reads as sky.
 */
const HALO = {
  sun: { cx: 50, cy: 50, r: 50, stops: [0.95, 0.38] },
  moon: { cx: 42, cy: 56, r: 42, stops: [0.5, 0.2] },
} as const;

/** The sun (dawn/day/golden) or the crescent moon (night), with a softly breathing halo. */
export function Orb({ palette, x, y, size }: OrbProps) {
  const id = useUid('halo');
  const box = { left: x, top: y, height: size };
  const halo = palette.night ? HALO.moon : HALO.sun;
  return (
    <>
      {/* the halo is its own element so its breathing stays on the compositor */}
      <svg class={`${s.orb} ${s.halo}`} style={box} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={id} cx={halo.cx / 100} cy={halo.cy / 100} r={halo.r / 100}>
            <stop offset="0.3" stop-color={palette.halo} stop-opacity={halo.stops[0]} />
            <stop offset="0.62" stop-color={palette.halo} stop-opacity={halo.stops[1]} />
            <stop offset="1" stop-color={palette.halo} stop-opacity={0} />
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
      </svg>
      <svg class={s.orb} style={box} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {palette.night ? <Moon palette={palette} /> : <Sun palette={palette} />}
      </svg>
    </>
  );
}

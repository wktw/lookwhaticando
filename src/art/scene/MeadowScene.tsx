/**
 * The Meadow: the living scene pets inhabit (DESIGN §9.4).
 *
 * Fills its container, which must have a definite size (e.g. width 100% + a height or an
 * aspect-ratio). Layers, back to front: sky → stars → sun/moon → clouds → far sky decor
 * (rainbow) → land (hills, cottage, meadow, path, fence & gate) → big tree → near sky decor
 * (balloons, fairy lights) → GROUND (decor, planter box, foreground framing, `children`) →
 * butterflies by day, fireflies by night.
 * Pets go in `children`, placed with `groundToStyle()`; they share the ground's stacking
 * context, so they depth-sort with decor and the planter by zIndex. All scene art is <svg>
 * painted with attributes (not CSS), so photo mode can serialize it layer by layer. The static
 * layers are memoized, so re-rendering pets never rebuilds the scenery.
 */
import { memo } from 'preact/compat';
import type { ComponentChildren, JSX } from 'preact';
import { DECOR_ENTRIES } from './decor';
import { groundPoint, groundToStyle, pointToGround, HORIZON, PET_UNITS } from './ground';
import { DECOR_UNIT_CSS, UNIT_CSS, openSky, top, type Len } from './layout';
import { PALETTES, type ScenePalette } from './palette';
import { useUid } from './uid';
import type { TimeOfDay } from './time';
import { SkyGradient } from './sky/SkyGradient';
import { Stars } from './sky/Stars';
import { Orb } from './sky/Orb';
import { DriftingClouds, type CloudSpec } from './sky/Clouds';
import { Land } from './meadow/Land';
import { Tree } from './meadow/Tree';
import { Planter, type PlanterPlant } from './meadow/Planter';
import { Foreground } from './meadow/Foreground';
import { Fireflies } from './meadow/Fireflies';
import { Butterflies } from './meadow/Butterflies';
import s from './meadow/meadow.module.css';

export interface PlacedDecor {
  itemId: string;
  /** Ground coordinates (see ground.ts); sky decor uses negative y. */
  x: number;
  y: number;
}

export interface MeadowSceneProps {
  time: TimeOfDay;
  decor: PlacedDecor[];
  /** Plants shown in the planter box (left to right; up to MAX_PLANTERS). */
  planters?: PlanterPlant[];
  /** Tap on open ground (not on a child), in ground coordinates. */
  onGroundTap?: (x: number, y: number) => void;
  /** Accessible name for the scene (it becomes a labelled group); decorative when omitted. */
  label?: string;
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

interface OrbSpot {
  x: Len;
  top: string;
  /** Orb canvas edge in meadow units. */
  size: number;
}

/**
 * Sun or moon per time of day, placed in the open sky right of the big tree: the dawn sun low on
 * the left (east), the big golden-hour sun low on the right (west), day sun and moon up high.
 * Low suns peek over the far hills.
 */
const ORB: Record<TimeOfDay, OrbSpot> = {
  dawn: { x: openSky(0.18), top: top(46, -24), size: 26 },
  day: { x: openSky(0.62), top: '13%', size: 22 },
  golden: { x: openSky(0.84), top: top(46, -21), size: 32 },
  night: { x: openSky(0.66), top: '12%', size: 22 },
};
/** Balloons or a rainbow fill the left of the open sky, so a dawn sun comes up to the right of them. */
const DAWN_BESIDE_SKY_DECOR: OrbSpot = { ...ORB.dawn, x: openSky(0.5), top: top(46, -30) };

const CLOUDS: readonly CloudSpec[] = [
  { x: 44, top: 6, height: 7, duration: 170 },
  { x: 58, top: 18.5, height: 5.5, duration: 230 },
  { x: 8, top: 15, height: 6, duration: 200 },
];
const NIGHT_CLOUDS = CLOUDS.slice(0, 2);

/** At the front edge, front to back: the planter box, the corner bushes, the grass fringe. */
const FRINGE_Z = groundPoint(0, 0.995).zIndex;
const CORNER_Z = FRINGE_Z + 2;
const PLANTER_Z = FRINGE_Z + 4;
/** Flat decor (blankets, puddles) lies under everything that stands on the ground. */
const FLAT_Z = 5;

interface DecorItemProps {
  itemId: string;
  x: number;
  y: number;
  palette: ScenePalette;
}

/** One placed decor item: its art with outlines matched to the pets', lit and shadowed for the hour. */
const DecorItem = memo(function DecorItem({ itemId, x, y, palette }: DecorItemProps) {
  const glowId = useUid('glow');
  const entry = DECOR_ENTRIES[itemId];
  if (!entry) return null;
  const style = groundToStyle(x, y, { size: entry.size, inside: entry.bounds, unit: 'var(--du)' });
  if (entry.flat) style.zIndex = FLAT_Z;
  if (entry.tied) style.transformOrigin = `${entry.tied[0]}% ${entry.tied[1]}%`;
  const onGround = y >= 0;
  const glow = palette.night ? entry.glow : undefined;
  const shade = palette.shadow;
  const [b0, b1] = entry.bounds;
  const half = (b1 - b0) / 2;
  return (
    <svg class={entry.tied ? `${s.decor} ${s.bob}` : s.decor} style={style} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {glow && (
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0" stop-color="#FFE7A0" stop-opacity={0.7} />
            <stop offset="0.35" stop-color="#FFE7A0" stop-opacity={0.28} />
            <stop offset="1" stop-color="#FFE7A0" stop-opacity={0} />
          </radialGradient>
        </defs>
      )}
      {/* a long shadow thrown by the low sun */}
      {onGround && shade.toward !== 0 && !entry.flat && (
        <ellipse cx={(b0 + b1) / 2 + shade.toward * half * 0.7} cy={93.5} rx={half * 1.1} ry={4.2} fill={shade.color} opacity={shade.opacity} />
      )}
      {glow && onGround && <ellipse cx={glow[0]} cy={94} rx={glow[2] * 1.1} ry={glow[2] * 0.22} fill={`url(#${glowId})`} />}
      {glow && <circle cx={glow[0]} cy={glow[1]} r={glow[2]} fill={`url(#${glowId})`} />}
      {entry.art({ night: palette.night, line: PET_UNITS / entry.size })}
    </svg>
  );
});

function DecorLayer({ items, palette }: { items: PlacedDecor[]; palette: ScenePalette }) {
  return (
    <>
      {items.map((d, i) => (
        <DecorItem key={`${d.itemId}-${i}`} itemId={d.itemId} x={d.x} y={d.y} palette={palette} />
      ))}
    </>
  );
}

const Sky = memo(function Sky({ palette, orb }: { palette: ScenePalette; orb: OrbSpot }) {
  return (
    <>
      <SkyGradient colors={palette.sky} horizon={HORIZON} />
      {palette.night && <Stars bottom={400} />}
      <Orb palette={palette} x={orb.x.css} y={orb.top} size={`calc(${orb.size} * var(--u))`} />
      <DriftingClouds palette={palette} clouds={palette.night ? NIGHT_CLOUDS : CLOUDS} />
    </>
  );
});

const StaticFireflies = memo(Fireflies);
const StaticButterflies = memo(Butterflies);

export function MeadowScene({ time, decor, planters = [], onGroundTap, label, children, class: cls, style }: MeadowSceneProps) {
  const palette = PALETTES[time];
  const farSky = decor.filter((d) => d.y < 0 && DECOR_ENTRIES[d.itemId]?.sky === 'hills');
  const nearSky = decor.filter((d) => d.y < 0 && DECOR_ENTRIES[d.itemId]?.sky !== 'hills');
  const ground = decor.filter((d) => d.y >= 0);
  const skyTaken = decor.some((d) => d.y < 0 && DECOR_ENTRIES[d.itemId]?.sky !== 'canopy');
  const orb = time === 'dawn' && skyTaken ? DAWN_BESIDE_SKY_DECOR : ORB[time];

  const onClick = onGroundTap
    ? (e: MouseEvent) => {
        if (e.target !== e.currentTarget) return;
        const p = pointToGround(e.clientX, e.clientY, (e.currentTarget as HTMLElement).getBoundingClientRect());
        if (p) onGroundTap(p.x, p.y);
      }
    : undefined;

  return (
    <div
      class={cls ? `${s.scene} ${cls}` : s.scene}
      style={{ '--u': UNIT_CSS, '--du': DECOR_UNIT_CSS, ...style }}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      <Sky palette={palette} orb={orb} />
      {farSky.length > 0 && (
        <div class={s.band}>
          <DecorLayer items={farSky} palette={palette} />
        </div>
      )}
      <Land palette={palette} />
      <Tree palette={palette} />
      {nearSky.length > 0 && (
        <div class={s.band}>
          <DecorLayer items={nearSky} palette={palette} />
        </div>
      )}
      <div class={s.ground} onClick={onClick}>
        <DecorLayer items={ground} palette={palette} />
        <Planter plants={planters} palette={palette} zIndex={PLANTER_Z} />
        <Foreground palette={palette} cornerZ={CORNER_Z} fringeZ={FRINGE_Z} />
        {children}
      </div>
      {palette.night ? <StaticFireflies /> : <StaticButterflies />}
    </div>
  );
}

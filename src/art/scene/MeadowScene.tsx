/**
 * The Meadow: the living scene pets inhabit (DESIGN §9.4).
 *
 * Fills its container, which must have a definite size (e.g. width 100% + a height or an
 * aspect-ratio). Layers, back to front: sky → stars → sun/moon → clouds → sky decor →
 * hills, cottage & meadow → fence → big tree → GROUND (decor, planter box, `children`) → fireflies.
 * Pets go in `children`, placed with `groundToStyle()`; they share the ground's stacking
 * context, so they depth-sort with decor and the planter by zIndex. Scene art is <svg> painted
 * with attributes (not CSS), so photo mode can serialize it layer by layer; only the dawn mist
 * and the fireflies are CSS flourishes.
 */
import type { ComponentChildren, JSX } from 'preact';
import { getCollectible } from '@/catalog/collectibles';
import { DECOR_ENTRIES } from './decor';
import { groundPoint, groundToStyle, pointToGround, HORIZON } from './ground';
import { PALETTES } from './palette';
import { useUid } from './uid';
import type { TimeOfDay } from './time';
import { SkyGradient } from './sky/SkyGradient';
import { Stars } from './sky/Stars';
import { Orb } from './sky/Orb';
import { DriftingClouds, type CloudSpec } from './sky/Clouds';
import { Land } from './meadow/Land';
import { Fence } from './meadow/Fence';
import { Tree } from './meadow/Tree';
import { Planter, type PlanterPlant } from './meadow/Planter';
import { Fireflies } from './meadow/Fireflies';
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
  children?: ComponentChildren;
  class?: string;
  style?: JSX.CSSProperties;
}

/**
 * Sun or moon centre and size (% of the scene) per time of day. High ones sit top-right above
 * the back decor; low ones rise and set behind the hills in the open sky between the trees.
 */
const ORB: Record<TimeOfDay, { x: string; y: string; size: string }> = {
  dawn: { x: '52%', y: '27%', size: '26%' },
  day: { x: '84%', y: '12%', size: '25%' },
  golden: { x: '52%', y: '26%', size: '30%' },
  night: { x: '85%', y: '12%', size: '24%' },
};

const CLOUDS: readonly CloudSpec[] = [
  { x: 6, top: 6, height: 8.5, duration: 150 },
  { x: 50, top: 17, height: 6.5, duration: 210 },
  { x: 84, top: 27, height: 5, duration: 260 },
];
const NIGHT_CLOUDS = CLOUDS.slice(1);

/** The planter box stands at the front edge. */
const PLANTER_Z = groundPoint(0, 0.97).zIndex;
/** Flat decor (blankets, puddles) lies under everything that stands on the ground. */
const FLAT_Z = 5;

function isSky(itemId: string): boolean {
  const def = getCollectible(itemId);
  return def?.category === 'decor' && def.slot === 'sky';
}

function DecorItem({ item, night }: { item: PlacedDecor; night: boolean }) {
  const glowId = useUid('glow');
  const entry = DECOR_ENTRIES[item.itemId];
  if (!entry) return null;
  const cls = entry.motion === 'bob' ? `${s.decor} ${s.bob}` : s.decor;
  const style = groundToStyle(item.x, item.y, { size: entry.size });
  if (entry.flat) style.zIndex = FLAT_Z;
  const glow = night ? entry.glow : undefined;
  return (
    <svg class={cls} style={style} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {glow && (
        <>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0" stop-color="#FFE7A0" stop-opacity={0.7} />
              <stop offset="0.35" stop-color="#FFE7A0" stop-opacity={0.28} />
              <stop offset="1" stop-color="#FFE7A0" stop-opacity={0} />
            </radialGradient>
          </defs>
          <circle cx={glow[0]} cy={glow[1]} r={glow[2]} fill={`url(#${glowId})`} />
        </>
      )}
      {entry.art({ night })}
    </svg>
  );
}

export function MeadowScene({ time, decor, planters = [], onGroundTap, children, class: cls, style }: MeadowSceneProps) {
  const palette = PALETTES[time];
  const night = palette.night;
  const sky = decor.filter((d) => isSky(d.itemId));
  const ground = decor.filter((d) => !isSky(d.itemId));

  const onClick = onGroundTap
    ? (e: MouseEvent) => {
        if (e.target !== e.currentTarget) return;
        const p = pointToGround(e.clientX, e.clientY, (e.currentTarget as HTMLElement).getBoundingClientRect());
        if (p) onGroundTap(p.x, p.y);
      }
    : undefined;

  return (
    <div class={cls ? `${s.scene} ${cls}` : s.scene} style={style}>
      <SkyGradient colors={palette.sky} horizon={HORIZON} />
      {night && <Stars bottom={400} />}
      <Orb palette={palette} {...ORB[time]} />
      <DriftingClouds palette={palette} clouds={night ? NIGHT_CLOUDS : CLOUDS} />
      {sky.length > 0 && (
        <div class={s.band}>
          {sky.map((d, i) => (
            <DecorItem key={`${d.itemId}-${i}`} item={d} night={night} />
          ))}
        </div>
      )}
      <Land palette={palette} />
      <Fence palette={palette} class={s.fence} />
      <Tree palette={palette} class={s.tree} />
      {time === 'dawn' && <div class={s.mist} />}
      <div class={s.ground} onClick={onClick}>
        {ground.map((d, i) => (
          <DecorItem key={`${d.itemId}-${i}`} item={d} night={night} />
        ))}
        <Planter plants={planters} palette={palette} zIndex={PLANTER_Z} />
        {children}
      </div>
      {night && <Fireflies />}
    </div>
  );
}

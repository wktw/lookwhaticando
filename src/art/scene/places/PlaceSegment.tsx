/**
 * One place on the Shelf, drawn in its own segment: the place's back, its decor and pets, its front
 * (the saucer's lip, the front of the grass), and after dark its lamp's pool, painted under the pets.
 */
import type { ComponentChildren } from 'preact';
import { DECOR_ENTRIES } from '../decor';
import type { Ground } from '../arrange';
import type { ShelfDecor } from '../model';
import { baseline, clamp, depthScale, depthZ } from '../room';
import type { PlacedDecor } from '../sill/world';
import { DecorItem } from '../actors/DecorItem';
import type { PlaceDrawProps, PlaceScene } from './types';
import { LampPoolGradient } from '../props/LampPool';

/** Decor on a place's ground: where it was put, or spread along the front. Hanging decor stays on the Sill. */
export function placeOnGround(g: Ground, decor: readonly ShelfDecor[]): PlacedDecor[] {
  let n = 0;
  return decor.flatMap((d, i): PlacedDecor[] => {
    const entry = DECOR_ENTRIES[d.itemId];
    if (!entry || entry.hang === 'window') return [];
    const k = n++;
    const x = d.x ?? g.x0 + ((k * 37 + 18) % Math.max(20, g.x1 - g.x0));
    const depth = clamp(d.depth ?? (k % 2 === 0 ? g.d1 - 0.08 : (g.d0 + g.d1) / 2), g.d0, g.d1);
    return [{ key: d.key ?? `${d.itemId}#${i}`, itemId: d.itemId, x, y: baseline(g.rows, depth), depth, z: depthZ(depth, entry.flat ? 'flat' : 'stand'), flip: !!d.flip, hanging: false, scale: depthScale(depth) }];
  });
}

export interface PlaceSegmentProps extends PlaceDrawProps {
  place: PlaceScene;
  decor: readonly PlacedDecor[];
  petSize: number;
  children?: ComponentChildren;
}

export function PlaceSegment({ place, decor, petSize, children, ...draw }: PlaceSegmentProps) {
  const { room, uid } = draw;
  const W = place.width;
  const lamp = place.lampAt ?? ([W + 24, 24] as const);
  const own = !!place.lampAt;
  return (
    <>
      <svg viewBox={`0 0 ${W} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        {room.night && (
          <defs>
            <LampPoolGradient id={`${uid}-pool`} cx={place.pool?.x ?? lamp[0]} cy={place.pool?.y ?? lamp[1]} r={place.pool?.r ?? (own ? 78 : 96)} strength={own ? 1 : 0.55} />
          </defs>
        )}
        {place.back(draw)}
        {room.night && <rect width={W} height={100} fill={`url(#${uid}-pool)`} />}
        {/* the corner where this stretch of room meets the last */}
        <rect width={1.2} height={100} fill="var(--shade)" />
      </svg>
      {decor.map((d) => (
        <DecorItem key={d.key} itemId={d.itemId} x={d.x} y={d.y} z={d.z} petSize={petSize} light={draw.light} flip={d.flip} scale={d.scale} />
      ))}
      {children}
      {place.front && (
        <svg viewBox={`0 0 ${W} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, display: 'block', zIndex: place.frontZ, pointerEvents: 'none' }}>
          {place.front(draw)}
        </svg>
      )}
    </>
  );
}

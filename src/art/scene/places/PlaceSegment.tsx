/**
 * One place on the Shelf, drawn in its own segment: the place's back, its decor and pets, its front
 * (the saucer's lip, the front of the grass), and after dark its lamp's pool, painted under the pets.
 */
import type { ComponentChildren } from 'preact';
import type { PlaceId } from '@/catalog/types';
import type { Ground } from '../arrange';
import type { ShelfDecor } from '../model';
import { baseline, clamp, depthScale, depthZ } from '../room';
import type { PlacedDecor } from '../sill/world';
import { decorEntry, fracToScene } from '../decorPlace';
import { decorSize } from '../fit';
import { DecorItem } from '../actors/DecorItem';
import type { PlaceDrawProps, PlaceScene } from './types';
import { LampPoolGradient } from '../props/LampPool';
import { TableLamp } from '../props/TableLamp';
import { OBJECT_BASE } from '../props/shapes';
import { tone } from '../palette';

/** Where the table lamp's shade sits on its canvas (the pool is anchored to it). */
const SHADE_Y = 29.5;

/** A place's light after dark: its own (`lampAt`), or the shade of the table lamp standing in it. */
export function placeLampAt(place: PlaceScene): readonly [number, number] | undefined {
  if (place.lampAt) return place.lampAt;
  const l = place.lamp;
  return l ? [l.x, l.y - ((OBJECT_BASE - SHADE_Y) / 100) * l.size] : undefined;
}

/** The Sill's table lamp standing in a place, on a little side table if it needs one. */
function PlaceLamp({ lamp, draw }: { lamp: NonNullable<PlaceScene['lamp']>; draw: PlaceDrawProps }) {
  const { room, light } = draw;
  const t = lamp.table ?? 0;
  const top = lamp.y;
  const wood = tone(room.time, '#D9C09C');
  const woodDeep = tone(room.time, '#C9A57F');
  const f = (n: number) => +n.toFixed(2);
  return (
    <g data-lamp="table">
      {t > 0 && (
        <g>
          <ellipse cx={lamp.x} cy={f(top + t + 0.4)} rx={lamp.size * 0.34} ry={0.9} fill="var(--contact)" />
          <rect x={f(lamp.x - lamp.size * 0.26)} y={f(top + 1.6)} width={1.6} height={f(t - 1.6)} fill={woodDeep} />
          <rect x={f(lamp.x + lamp.size * 0.26 - 1.6)} y={f(top + 1.6)} width={1.6} height={f(t - 1.6)} fill={woodDeep} />
          <rect x={f(lamp.x - lamp.size * 0.34)} y={f(top)} width={f(lamp.size * 0.68)} height={2} rx={0.5} fill={wood} />
        </g>
      )}
      <svg x={f(lamp.x - lamp.size / 2)} y={f(top - (OBJECT_BASE / 100) * lamp.size)} width={lamp.size} height={lamp.size} viewBox="0 0 100 100" overflow="visible">
        <TableLamp light={light} on={room.night} />
      </svg>
    </g>
  );
}

/**
 * Decor on a place's ground: where it was put (a stored placement's fractions resolve against this ground, DESIGN
 * §9.4), or spread along the front. Hanging decor stays on the Sill.
 */
export function placeOnGround(g: Ground, decor: readonly ShelfDecor[], place: PlaceId): PlacedDecor[] {
  let n = 0;
  return decor.flatMap((d, i): PlacedDecor[] => {
    const entry = decorEntry(d);
    if (!entry || entry.hang === 'window') return [];
    const k = n++;
    const at = d.frac ? fracToScene(g, d.frac) : null;
    const x = at?.x ?? d.x ?? g.x0 + ((k * 37 + 18) % Math.max(20, g.x1 - g.x0));
    const depth = clamp(at?.depth ?? d.depth ?? (k % 2 === 0 ? g.d1 - 0.08 : (g.d0 + g.d1) / 2), g.d0, g.d1);
    return [
      {
        key: d.key ?? `${d.itemId}#${i}`,
        itemId: d.itemId,
        entry,
        x,
        y: baseline(g.rows, depth),
        depth,
        z: depthZ(depth, entry.flat ? 'flat' : 'stand'),
        flip: !!d.flip,
        hanging: false,
        size: decorSize(entry, g.petSize),
        scale: depthScale(depth),
        place,
      },
    ];
  });
}

export interface PlaceSegmentProps extends PlaceDrawProps {
  place: PlaceScene;
  decor: readonly PlacedDecor[];
  children?: ComponentChildren;
}

export function PlaceSegment({ place, decor, children, ...draw }: PlaceSegmentProps) {
  const { room, uid } = draw;
  const W = place.width;
  const lit = placeLampAt(place);
  const lamp = lit ?? ([W + 24, 24] as const);
  const own = !!lit;
  return (
    <>
      <svg viewBox={`0 0 ${W} 100`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        {room.night && (
          <defs>
            <LampPoolGradient id={`${uid}-pool`} cx={place.pool?.x ?? lamp[0]} cy={place.pool?.y ?? lamp[1]} r={place.pool?.r ?? (own ? 78 : 96)} strength={own ? 1 : 0.55} />
          </defs>
        )}
        {place.back(draw)}
        {place.lamp && <PlaceLamp lamp={place.lamp} draw={draw} />}
        {room.night && <rect width={W} height={100} fill={`url(#${uid}-pool)`} />}
        {/* the corner where this stretch of room meets the last */}
        <rect width={1.2} height={100} fill="var(--shade)" />
      </svg>
      {decor.map((d) => (
        <DecorItem key={d.key} entry={d.entry} itemId={d.itemId} x={d.x} y={d.y} z={d.z} size={d.size} light={draw.light} flip={d.flip} scale={d.scale} />
      ))}
      {decor
        .filter((d) => d.entry.front)
        .map((d) => (
          <DecorItem key={`${d.key}/front`} entry={d.entry} itemId={d.itemId} x={d.x} y={d.y} z={d.z + 3} size={d.size} light={draw.light} flip={d.flip} scale={d.scale} front />
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

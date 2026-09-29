/**
 * A place as a picture, for the places map (DESIGN §9.4): the place itself in the hour's light, with
 * no pets. A place not yet opened is a quiet preview under a paper veil, with its price.
 */
import type { JSX } from 'preact';
import type { PlaceId } from '@/catalog/types';
import { PLACE_BY_ID } from '@/catalog/places';
import type { Moment } from './time';
import { momentAt } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { SILL_SPEC } from './sill/layout';
import { sillWorld } from './sill/world';
import { SillBackdrop } from './sill/Backdrop';
import { CoinJar } from './props/CoinJar';
import { TableLamp } from './props/TableLamp';
import { PLACE_SCENES, type RoomPlaceId } from './places';
import { baseline } from './room';
import { OBJECT_BASE } from './props/shapes';
import { sceneTokens } from './SillScene';
import { useUid } from './uid';
import { Plant } from './actors/adapters';

export interface PlaceArtProps {
  place: PlaceId;
  /** Not opened yet: a quiet preview with its price. */
  locked?: boolean;
  /** Price shown when locked (defaults to the catalog's). */
  price?: number;
  /** Width (a number is px); the height follows the art's 3:2 aspect. */
  width?: number | string;
  moment?: Moment;
  /** An accessible name; defaults to the place's name (and price when locked). */
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

const SILL_CROP: readonly [number, number, number, number] = [4, 12, 132, 88];

/** Two plants stand in for her pots on the map. */
const MAP_POTS = [
  { species: 'pothos', stage: 5, pot: 'terracotta' },
  { species: 'pilea', stage: 4, pot: 'cream' },
] as const;

function SillPicture({ moment, uid }: { moment: Moment; uid: string }) {
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);
  const pots = MAP_POTS.map((p, i) => ({ habitId: `map-${i}`, ...p }));
  const world = sillWorld(SILL_SPEC, pots, [], room, moment.light.sun, SILL_CROP[2] + 20);
  const { jar, lamp } = world.layout;
  const rows = SILL_SPEC.rows;
  const at = (x: number, depth: number, size: number) => ({ x: x - size / 2, y: baseline(rows, depth) - (size * OBJECT_BASE) / 100, width: size, height: size });
  return (
    <>
      <svg x={0} y={0} width={world.layout.width} height={100} overflow="hidden">
        <SillBackdrop layout={world.layout} room={room} view={view} beam={world.beam} casts={[]} cast={world.cast} uid={uid} />
      </svg>
      {world.layout.pots.map((p, i) => (
        <svg key={i} {...at(p.x, p.depth, SILL_SPEC.scale.pot)} viewBox="0 0 100 100" overflow="visible">
          <Plant species={pots[i]!.species} stage={pots[i]!.stage} pot={pots[i]!.pot} size="100%" light={light} />
        </svg>
      ))}
      <svg {...at(jar.x, jar.depth, SILL_SPEC.scale.jar)} viewBox="0 0 100 100" overflow="visible">
        <CoinJar coins={260} light={light} />
      </svg>
      <svg {...at(lamp.x, lamp.depth, SILL_SPEC.scale.lamp)} viewBox="0 0 100 100" overflow="visible">
        <TableLamp light={light} on={room.night} />
      </svg>
    </>
  );
}

export function PlaceArt({ place, locked = false, price, width = 180, moment: pinned, title, class: cls, style }: PlaceArtProps) {
  const uid = useUid('place');
  const moment = pinned ?? momentAt(new Date());
  const room = ROOM[moment.time];
  const def = PLACE_BY_ID.get(place);
  const cost = price ?? def?.price ?? 0;
  const scene = place === 'sill' ? null : PLACE_SCENES[place as RoomPlaceId];
  const crop = scene ? scene.crop : SILL_CROP;
  const name = def?.name ?? place;
  const label = title ?? (locked ? `${name}, opens for ${cost} coins` : name);
  const draw = { room, view: outsidePalette(moment.time, moment.season), light: childLight(moment.light), moment, uid };
  return (
    <div class={cls} role="img" aria-label={label} style={{ position: 'relative', width: typeof width === 'number' ? `${width}px` : width, aspectRatio: `${crop[2]} / ${crop[3]}`, borderRadius: '14px', overflow: 'hidden', background: room.wall, ...sceneTokens(room.tokens), ...style }}>
      <svg viewBox={crop.join(' ')} width="100%" height="100%" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
        {scene ? (
          <>
            {scene.back(draw)}
            {scene.front?.(draw)}
          </>
        ) : (
          <SillPicture moment={moment} uid={uid} />
        )}
        {locked && <rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} fill={room.night ? '#2D2733' : '#FAF6EF'} opacity={0.58} />}
      </svg>
      {locked && (
        <span
          style={{
            position: 'absolute',
            right: '8px',
            bottom: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px 3px 5px',
            borderRadius: '999px',
            background: room.night ? 'rgba(45, 39, 51, 0.9)' : 'rgba(255, 253, 249, 0.92)',
            color: room.night ? '#F4EDE6' : '#3B3236',
            font: '700 12px/1.2 var(--font-body)',
          }}
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 10 10">
            <circle cx={5} cy={5} r={4.6} fill="#D2A24B" />
            <circle cx={4.8} cy={4.8} r={4} fill="#EDCB72" />
            <path d="M4.8 2.6C6.2 3.5 6.2 5.6 4.8 7M4.8 4.6l1-0.8" fill="none" stroke="#C99A3E" stroke-width={0.6} stroke-linecap="round" />
          </svg>
          {cost.toLocaleString('en-US')}
        </span>
      )}
    </div>
  );
}

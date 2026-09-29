/**
 * The Shelf (DESIGN §8.4, §9.4): one horizontally scrolling room at pet eye level. It starts at the
 * Sill and continues into each opened place — Saucer Pond, Cat-grass Tray, Bookshelf, Balcony Box,
 * The Quilt — all lit by the same window by day and by lamps after dark. Pets live where they are
 * out and roam by personality and hour; it opens scrolled to wherever the light is.
 */
import type { JSX } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { Hemisphere } from '@/art/light';
import type { PlaceId } from '@/catalog/types';
import { PLACES } from '@/catalog/places';
import type { ShelfDecor, ShelfPet, SillPot } from './model';
import { petKey, speciesOf } from './model';
import { momentAt, type Moment } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { arrangePets, type Ground } from './arrange';
import { SILL_SPEC } from './sill/layout';
import { sillWorld } from './sill/world';
import { SillSegment } from './sill/SillSegment';
import { PLACE_SCENES, type RoomPlaceId } from './places';
import { PlaceSegment, placeOnGround } from './places/PlaceSegment';
import { PetLayer } from './actors/PetLayer';
import { u } from './actors/stand';
import { useWidthUnits } from './hooks';
import { useShelfLife } from './behavior/useShelfLife';
import type { DirectorPet } from './behavior/director';
import { stageVignette } from './behavior/stage';
import { sceneTokens } from './SillScene';
import { useUid } from './uid';
import s from './shelf.module.css';

export interface ShelfSceneProps {
  pots: readonly SillPot[];
  pets?: readonly ShelfPet[];
  decor?: readonly ShelfDecor[];
  coins?: number;
  /** Opened places (the Sill is always there); shown in the catalog's order. */
  places?: readonly PlaceId[];
  /** Retired plants, living on the Balcony Box's shelf. */
  retired?: readonly SillPot[];
  now?: Date;
  hemisphere?: Hemisphere;
  moment?: Moment;
  tags?: boolean;
  live?: boolean;
  /** Where it opens: where the light is (default), the start, or a place. */
  open?: 'light' | 'start' | PlaceId;
  /** Stage a vignette in a place (gallery). */
  vignette?: { id: string; place: PlaceId };
  label?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

interface Segment {
  id: PlaceId;
  x: number;
  width: number;
  ground: Ground;
}

const ORDER = PLACES.map((p) => p.id);

export function ShelfScene(props: ShelfSceneProps) {
  const { pots, pets = [], decor = [], coins = 0, places = [], retired = [], tags = true, live = true, label } = props;
  const ref = useRef<HTMLDivElement>(null);
  const uid = useUid('shelf');
  const widthU = useWidthUnits(ref, 130);
  const moment = props.moment ?? momentAt(props.now ?? new Date(), props.hemisphere);
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);
  const opened = useMemo(() => ORDER.filter((id): id is RoomPlaceId => id !== 'sill' && places.includes(id)), [places]);

  const sillDecor = useMemo(() => decor.filter((d) => !d.place || d.place === 'sill' || !opened.includes(d.place as RoomPlaceId)), [decor, opened]);
  const world = useMemo(() => sillWorld(SILL_SPEC, pots, sillDecor, room, moment.light.sun, opened.length ? 0 : widthU), [pots, sillDecor, room, moment.light.sun, widthU, opened.length]);

  const segments = useMemo(() => {
    const out: Segment[] = [{ id: 'sill', x: 0, width: world.layout.width, ground: world.ground }];
    let x = world.layout.width;
    for (const id of opened) {
      const place = PLACE_SCENES[id];
      out.push({ id, x, width: place.width, ground: place.ground(room, SILL_SPEC.scale.pet) });
      x += place.width;
    }
    return out;
  }, [world, opened, room]);
  const total = segments.reduce((w, seg) => w + seg.width, 0);

  const where = (p: ShelfPet): PlaceId => (p.place && segments.some((seg) => seg.id === p.place) ? p.place : 'sill');
  const byPlace = useMemo(() => {
    const m = new Map<PlaceId, ShelfPet[]>();
    for (const p of pets) m.set(where(p), [...(m.get(where(p)) ?? []), p]);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, segments]);

  const start = useMemo(() => {
    const spots = new Map();
    for (const seg of segments) {
      const here = byPlace.get(seg.id) ?? [];
      let placed = arrangePets(seg.ground, here, moment);
      if (props.vignette?.place === seg.id) placed = stageVignette(props.vignette.id, seg.id, seg.ground, moment, here, placed);
      for (const [k, v] of placed) spots.set(k, v);
    }
    return spots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, byPlace, moment.time, props.vignette?.id, props.vignette?.place]);

  const cast = useMemo<DirectorPet[]>(
    () =>
      pets.map((p) => {
        const seg = segments.find((x) => x.id === where(p))!;
        return { key: petKey(p), species: speciesOf(p.petId), personality: p.personality, place: seg.id, ground: seg.ground, home: seg.ground.perches.find((q) => q.owner && q.owner === p.home) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pets, segments],
  );
  const views = useShelfLife(cast, start, { moment, live: live && !props.vignette, sceneRef: ref });

  // Open where the light is: the sunbeam by day, the lamp at night (or a place, or the start).
  const open = props.open ?? 'light';
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open === 'start') return;
    const unit = el.clientHeight / 100;
    let target: number;
    if (open === 'light') target = world.beam ? (world.beam.x0 + world.beam.x1) / 2 + world.beam.slant / 2 : world.layout.lamp.x - 40;
    else {
      const seg = segments.find((x) => x.id === open);
      if (!seg) return;
      target = seg.x + seg.width / 2;
    }
    el.scrollLeft = Math.max(0, target * unit - el.clientWidth / 2);
    // Only on first layout and when asked to open somewhere else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total]);

  const draw = { room, view, light, moment };
  return (
    <div
      ref={ref}
      class={[s.scene, room.night ? s.night : '', props.class].filter(Boolean).join(' ')}
      style={{ ...sceneTokens(room.tokens), background: room.wall, ...props.style }}
      role={label ? 'group' : undefined}
      aria-label={label}
      data-time={moment.time}
    >
      <div class={s.track} style={{ width: u(total) }}>
        {segments.map((seg) => {
          const here = byPlace.get(seg.id) ?? [];
          const layer = (
            <PetLayer pets={here} views={views} size={SILL_SPEC.scale.pet} light={light} castColor={seg.id === 'sill' ? room.sill : undefined} cast={world.cast} animated={live} />
          );
          return (
            <div key={seg.id} class={s.segment} style={{ left: u(seg.x), width: u(seg.width) }} data-place={seg.id}>
              {seg.id === 'sill' ? (
                <SillSegment world={world} room={room} view={view} light={light} pots={pots} coins={coins} uid={`${uid}-sill`} tags={tags} animated={live}>
                  {layer}
                </SillSegment>
              ) : (
                <PlaceSegment
                  {...draw}
                  uid={`${uid}-${seg.id}`}
                  place={PLACE_SCENES[seg.id as RoomPlaceId]}
                  decor={placeOnGround(seg.ground, decor.filter((d) => d.place === seg.id))}
                  petSize={SILL_SPEC.scale.pet}
                  retired={retired}
                >
                  {layer}
                </PlaceSegment>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

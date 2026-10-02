/**
 * The Shelf (DESIGN §8.4, §9.4): one horizontally scrolling room at pet eye level. It starts at the
 * Sill and continues into each opened place — Saucer Pond, Cat-grass Tray, Bookshelf, Balcony Box,
 * The Quilt — all lit by the same window by day and by lamps after dark. Pets live where they are
 * out (`ShelfPet.place`) and roam by personality and hour; it opens scrolled to wherever the light is.
 *
 * Touch and editing as the Sill (`SceneTouchProps`): pets are buttons with a name tag after a tap, decor has an
 * edit mode, and a ref (`ShelfSceneHandle`) lets the screen play a reaction or find a pet on screen.
 */
import type { JSX, Ref } from 'preact';
import { forwardRef } from 'preact/compat';
import { useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { Hemisphere } from '@/art/light';
import type { PlaceId } from '@/catalog/types';
import { PLACES } from '@/catalog/places';
import type { ShelfDecor, ShelfPet, SillExtras, SillPot } from './model';
import { petKey, speciesOf } from './model';
import type { Moment } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { arrangePets, homePerch, type Ground } from './arrange';
import { SILL_SPEC } from './sill/layout';
import { openScroll, sillWorld } from './sill/world';
import { SillSegment } from './sill/SillSegment';
import { PLACE_SCENES, type RoomPlaceId } from './places';
import { PlaceSegment, placeLampAt, placeOnGround } from './places/PlaceSegment';
import { PetLayer } from './actors/PetLayer';
import { usePetTouch } from './actors/usePetTouch';
import { DecorEditLayer } from './actors/DecorEdit';
import { u } from './actors/stand';
import { useWidthUnits, useWindowMoment } from './hooks';
import { useShelfLife } from './behavior/useShelfLife';
import type { DirectorPet } from './behavior/director';
import { stageVignette } from './behavior/stage';
import { petRect, sceneTokens, type SceneTouchProps, type ShelfSceneHandle } from './SillScene';
import { useUid } from './uid';
import { ScrollFrame } from './ScrollFrame';
import s from './shelf.module.css';

export interface ShelfSceneProps extends SceneTouchProps, SillExtras {
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

export const ShelfScene = forwardRef(function ShelfScene(props: ShelfSceneProps, ref: Ref<ShelfSceneHandle>) {
  const { pots, pets = [], decor = [], coins = 0, places = [], retired = [], tags = true, live = true, label } = props;
  const sceneRef = useRef<HTMLDivElement>(null);
  const uid = useUid('shelf');
  const widthU = useWidthUnits(sceneRef, 130);
  const moment = useWindowMoment(props);
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);
  const opened = useMemo(() => ORDER.filter((id): id is RoomPlaceId => id !== 'sill' && places.includes(id)), [places]);

  const sillDecor = useMemo(() => decor.filter((d) => !d.place || d.place === 'sill' || !opened.includes(d.place as RoomPlaceId)), [decor, opened]);
  const foundSeed = props.found?.seed;
  const hasNote = !!props.note;
  const hasCake = !!props.cake;
  const world = useMemo(
    () => sillWorld(SILL_SPEC, pots, sillDecor, room, moment.light.sun, opened.length ? 0 : widthU, moment.season, { found: foundSeed, note: hasNote, cake: hasCake }),
    [pots, sillDecor, room, moment.light.sun, widthU, opened.length, moment.season, foundSeed, hasNote, hasCake],
  );

  const segments = useMemo(() => {
    const out: Segment[] = [{ id: 'sill', x: 0, width: world.layout.width, ground: world.ground }];
    let x = world.layout.width;
    for (const id of opened) {
      const place = PLACE_SCENES[id];
      const lamp = placeLampAt(place);
      // Pets gather under the place's own lamp after dark.
      out.push({ id, x, width: place.width, ground: { ...place.ground(room, SILL_SPEC.scale.pet), lampX: lamp?.[0] } });
      x += place.width;
    }
    return out;
  }, [world, opened, room]);
  const total = segments.reduce((w, seg) => w + seg.width, 0);
  const placed = useMemo(() => new Map(segments.filter((seg) => seg.id !== 'sill').map((seg) => [seg.id, placeOnGround(seg.ground, decor.filter((d) => d.place === seg.id), seg.id)])), [segments, decor]);

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
      let placedPets = arrangePets(seg.ground, here, moment);
      if (props.vignette?.place === seg.id) placedPets = stageVignette(props.vignette.id, seg.id, seg.ground, moment, here, placedPets);
      for (const [k, v] of placedPets) spots.set(k, v);
    }
    return spots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, byPlace, moment.time, props.vignette?.id, props.vignette?.place]);

  const cast = useMemo<DirectorPet[]>(
    () =>
      pets.map((p) => {
        const seg = segments.find((x) => x.id === where(p))!;
        return { key: petKey(p), species: speciesOf(p.petId), petId: p.petId, personality: p.personality, bond: p.bond, place: seg.id, ground: seg.ground, home: homePerch(seg.ground, p.home) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pets, segments],
  );
  // A staged vignette holds its places, then plays out once the scene is live (ducks walk on).
  const { views, director } = useShelfLife(cast, start, { moment, live, sceneRef, vignettes: !props.vignette, opening: props.vignette?.id });
  const groundOf = (key: string) => cast.find((c) => c.key === key)?.ground;
  const touch = usePetTouch({ pets, views, sceneRef, groundOf, onPet: props.onPet, onOpenPet: props.onOpenPet, interactive: props.interactive, hold: (k) => director.hold(k), release: (k, at) => director.release(k, at) });
  useImperativeHandle(ref, () => ({ react: (k, e) => touch.react(k, e), spotOf: (k) => petRect(sceneRef.current, k) }), [touch]);

  // Open where the light is: the sunbeam by day, the lamp at night (or a place, or the start).
  const open = props.open ?? 'light';
  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el || open === 'start') return;
    const unit = el.clientHeight / 100;
    if (!unit) return;
    const viewU = el.clientWidth / unit;
    let left: number;
    if (open === 'light') left = openScroll(world, viewU);
    else {
      const seg = segments.find((x) => x.id === open);
      if (!seg) return;
      const lamp = placeLampAt(PLACE_SCENES[seg.id as RoomPlaceId]);
      // By day its middle; after dark, far enough right that its lamp is in view too.
      left = seg.x + seg.width / 2 - viewU / 2;
      if (room.night && lamp) left = Math.max(left, seg.x + Math.min(seg.width, lamp[0] + 14) - viewU);
    }
    el.scrollLeft = Math.max(0, left * unit);
    // Only on first layout and when asked to open somewhere else.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total]);

  const extras: SillExtras = { cutting: props.cutting, found: props.found, note: props.note, cake: props.cake };
  const draw = { room, view, light, moment };
  return (
    <ScrollFrame
      sceneRef={sceneRef}
      wall={room.wall}
      step={SILL_SPEC.pitch}
      label={label ?? 'The Shelf'}
      night={room.night}
      time={moment.time}
      class={props.class}
      style={{ ...sceneTokens(room.tokens), background: room.wall, ...props.style }}
    >
      <div class={s.track} style={{ width: u(total) }}>
        {segments.map((seg) => {
          const here = byPlace.get(seg.id) ?? [];
          const layer = (
            <PetLayer pets={here} views={views} size={SILL_SPEC.scale.pet} light={light} castColor={seg.id === 'sill' ? room.sill : undefined} cast={world.cast} animated={live} touch={touch} />
          );
          return (
            <div key={seg.id} class={s.segment} style={{ left: u(seg.x), width: u(seg.width) }} data-place={seg.id}>
              {seg.id === 'sill' ? (
                <SillSegment world={world} room={room} view={view} light={light} pots={pots} coins={coins} uid={`${uid}-sill`} tags={tags} animated={live} extras={extras} edit={props.editDecor ? { decor: props.editDecor, sceneRef } : undefined}>
                  {layer}
                </SillSegment>
              ) : (
                <PlaceSegment {...draw} uid={`${uid}-${seg.id}`} place={PLACE_SCENES[seg.id as RoomPlaceId]} decor={placed.get(seg.id) ?? []} retired={retired}>
                  {layer}
                  {props.editDecor && <DecorEditLayer decor={placed.get(seg.id) ?? []} floor={seg.ground} rows={seg.ground.rows} place={seg.id} edit={props.editDecor} sceneRef={sceneRef} />}
                </PlaceSegment>
              )}
            </div>
          );
        })}
      </div>
    </ScrollFrame>
  );
});

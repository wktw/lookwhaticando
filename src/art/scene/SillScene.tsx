/**
 * The Sill (DESIGN §8.4, §9.4): a long painted windowsill in front of a sash window, at pet eye
 * level, lit by one window. The habit pots stand in a row, then the coin jar; the lamp waits at the
 * right for the evening. The sunbeam crosses the sill with the real sun, and after dark the lamp's
 * pool takes over and every shade flips. Pets roam by personality and time of day.
 *
 * Fills its container (give it a height; ~300 px on phones) and scrolls sideways when it is longer
 * than the screen.
 */
import type { JSX } from 'preact';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { Hemisphere } from '@/art/light';
import type { ShelfDecor, ShelfPet, SillPot } from './model';
import { petKey, speciesOf } from './model';
import type { Moment } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { arrangePets } from './arrange';
import { SILL_SPEC } from './sill/layout';
import { lightTarget, sillWorld } from './sill/world';
import { SillSegment } from './sill/SillSegment';
import { PetLayer } from './actors/PetLayer';
import { u } from './actors/stand';
import { useWidthUnits, useWindowMoment } from './hooks';
import { useShelfLife } from './behavior/useShelfLife';
import { stageVignette } from './behavior/stage';
import { useUid } from './uid';
import { ScrollFrame } from './ScrollFrame';
import s from './shelf.module.css';

export interface SillSceneProps {
  pots: readonly SillPot[];
  pets?: readonly ShelfPet[];
  decor?: readonly ShelfDecor[];
  coins?: number;
  /** The clock (defaults to now); the light, sky and routines follow it. */
  now?: Date;
  hemisphere?: Hemisphere;
  /** Pin the moment (gallery, tests, photo mode). Overrides `now`. */
  moment?: Moment;
  /** Show the plant tags (default true). */
  tags?: boolean;
  /** Pets roam (default true). Off: they hold the spots the hour gives them. */
  live?: boolean;
  /** Start with this vignette staged, if it can play (gallery). */
  vignette?: string;
  /** An accessible name makes the scene a labelled group; otherwise it is decorative. */
  label?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

/** Scene tokens so every child is lit alike whatever the page theme. */
export function sceneTokens(tokens: { shade: string; contact: string; sun: string }): JSX.CSSProperties {
  return { '--shade': tokens.shade, '--contact': tokens.contact, '--sun': tokens.sun } as JSX.CSSProperties;
}

export function SillScene(props: SillSceneProps) {
  const { pots, pets = [], decor = [], coins = 0, tags = true, live = true, label } = props;
  const ref = useRef<HTMLDivElement>(null);
  const uid = useUid('sill');
  const widthU = useWidthUnits(ref, 130);
  const moment = useWindowMoment(props);
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);

  const world = useMemo(() => sillWorld(SILL_SPEC, pots, decor, room, moment.light.sun, widthU, moment.season), [pots, decor, room, moment.light.sun, widthU, moment.season]);
  const start = useMemo(() => {
    const spots = arrangePets(world.ground, pets, moment);
    return props.vignette ? stageVignette(props.vignette, 'sill', world.ground, moment, pets, spots) : spots;
    // Re-arrange when the routine changes, not every quarter hour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pets, props.vignette, moment.time]);
  const cast = useMemo(
    () => pets.map((p) => ({ key: petKey(p), species: speciesOf(p.petId), personality: p.personality, place: 'sill' as const, ground: world.ground, home: world.ground.perches.find((q) => q.owner === p.home) })),
    [pets, world],
  );
  // A staged vignette holds its places, then plays out once the scene is live.
  const views = useShelfLife(cast, start, { moment, live, sceneRef: ref, vignettes: !props.vignette, opening: props.vignette });

  // Open where the light is: the sunbeam by day, the lamp after dark.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const unit = el.clientHeight / 100;
    const target = lightTarget(world);
    el.scrollLeft = Math.max(0, target * unit - el.clientWidth / 2);
    // Only when the light moves to another place on the sill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.layout.width, moment.time]);

  return (
    <ScrollFrame
      sceneRef={ref}
      wall={room.wall}
      step={SILL_SPEC.pitch}
      label={label ?? 'The Sill'}
      night={room.night}
      time={moment.time}
      class={props.class}
      style={{ ...sceneTokens(room.tokens), background: room.wall, ...props.style }}
    >
      <div class={s.track} style={{ width: u(world.layout.width) }}>
        <SillSegment world={world} room={room} view={view} light={light} pots={pots} coins={coins} uid={uid} tags={tags} animated={live}>
          <PetLayer pets={pets} views={views} size={SILL_SPEC.scale.pet} light={light} castColor={room.sill} cast={world.cast} animated={live} />
        </SillSegment>
      </div>
    </ScrollFrame>
  );
}

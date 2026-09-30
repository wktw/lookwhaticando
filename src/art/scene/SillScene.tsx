/**
 * The Sill (DESIGN §8.4, §9.4): a long painted windowsill in front of a sash window, at pet eye
 * level, lit by one window. The habit pots stand in a row, then the coin jar; the lamp waits at the
 * right for the evening. The sunbeam crosses the sill with the real sun, and after dark the lamp's
 * pool takes over and every shade flips. Pets roam by personality and time of day.
 *
 * Fills its container (give it a height; ~300 px on phones) and scrolls sideways when it is longer
 * than the screen. Pets are buttons when the screen listens (`onPet`, `onOpenPet`): tap, stroke, boop and
 * carry (DESIGN §8.2), with a name tag after a tap that opens the Pet Card. `editDecor` turns on decor edit mode.
 */
import type { JSX, Ref } from 'preact';
import { forwardRef } from 'preact/compat';
import { useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { Hemisphere } from '@/art/light';
import type { Expression } from '@/art/pets/types';
import type { EditDecor, PetGesture, ShelfDecor, ShelfPet, SillExtras, SillPot } from './model';
import { petKey, speciesOf } from './model';
import type { Moment } from './time';
import { outsidePalette, ROOM } from './palette';
import { childLight } from './lighting';
import { arrangePets, homePerch } from './arrange';
import { SILL_SPEC } from './sill/layout';
import { openScroll, sillThings, sillWorld, withThings } from './sill/world';
import { SillSegment } from './sill/SillSegment';
import { PetLayer } from './actors/PetLayer';
import { usePetTouch } from './actors/usePetTouch';
import { u } from './actors/stand';
import { useWidthUnits, useWindowMoment } from './hooks';
import { useShelfLife } from './behavior/useShelfLife';
import { stageVignette } from './behavior/stage';
import { useUid } from './uid';
import { ScrollFrame } from './ScrollFrame';
import s from './shelf.module.css';
import { petNode } from './query';

/** What a screen can ask of a scene through its ref (DESIGN §8.2 choreography, the Pet Card's anchor). */
export interface ShelfSceneHandle {
  /** That pet shows an expression for a moment (a reaction the screen caused: fed, renamed…). */
  react(key: string, expression: Expression): void;
  /** Where that pet is on screen right now (for anchoring a popover), or null when it is not out here. */
  spotOf(key: string): DOMRect | null;
}

/** What both scenes take for touch and editing. */
export interface SceneTouchProps {
  /** A pet was touched (DESIGN §8.2): the screen pays the (capped) XP. `rect` is the pet's box on screen. */
  onPet?: (key: string, rect: DOMRect, gesture: PetGesture) => void;
  /** The name tag was tapped: open the Pet Card. */
  onOpenPet?: (key: string) => void;
  /** Pets are buttons even without handlers (gallery). Default: when `onPet` or `onOpenPet` is given. */
  interactive?: boolean;
  /** Decor edit mode (DESIGN §9.4). */
  editDecor?: EditDecor;
}

export interface SillSceneProps extends SceneTouchProps, SillExtras {
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

/** The scene handle's `spotOf`: the pet's touch target (or its actor) on screen. */
export function petRect(scene: HTMLElement | null, key: string): DOMRect | null {
  const actor = petNode(scene, key);
  if (!actor) return null;
  return (actor.querySelector('button') ?? actor).getBoundingClientRect();
}

export const SillScene = forwardRef(function SillScene(props: SillSceneProps, ref: Ref<ShelfSceneHandle>) {
  const { pots, pets = [], decor = [], coins = 0, tags = true, live = true, label } = props;
  const sceneRef = useRef<HTMLDivElement>(null);
  const uid = useUid('sill');
  const widthU = useWidthUnits(sceneRef, 130);
  const moment = useWindowMoment(props);
  const room = ROOM[moment.time];
  const view = outsidePalette(moment.time, moment.season);
  const light = childLight(moment.light);

  // Pets keep clear of the things on the sill a person can open (their buttons would otherwise cover the pets').
  const noted = !!props.note;
  const foundSeed = props.found?.seed;
  const world = useMemo(() => {
    const w = sillWorld(SILL_SPEC, pots, decor, room, moment.light.sun, widthU, moment.season);
    return withThings(w, sillThings(w, { note: noted, found: foundSeed }));
  }, [pots, decor, room, moment.light.sun, widthU, moment.season, noted, foundSeed]);
  const start = useMemo(() => {
    const spots = arrangePets(world.ground, pets, moment);
    return props.vignette ? stageVignette(props.vignette, 'sill', world.ground, moment, pets, spots) : spots;
    // Re-arrange when the routine changes, not every quarter hour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, pets, props.vignette, moment.time]);
  const cast = useMemo(
    () => pets.map((p) => ({ key: petKey(p), species: speciesOf(p.petId), petId: p.petId, personality: p.personality, place: 'sill' as const, ground: world.ground, home: homePerch(world.ground, p.home) })),
    [pets, world],
  );
  // A staged vignette holds its places, then plays out once the scene is live.
  const { views, director } = useShelfLife(cast, start, { moment, live, sceneRef, vignettes: !props.vignette, opening: props.vignette });
  const touch = usePetTouch({
    pets,
    views,
    sceneRef,
    groundOf: () => world.ground,
    onPet: props.onPet,
    onOpenPet: props.onOpenPet,
    interactive: props.interactive,
    hold: (k) => director.hold(k),
    release: (k, at) => director.release(k, at),
  });
  useImperativeHandle(ref, () => ({ react: (k, e) => touch.react(k, e), spotOf: (k) => petRect(sceneRef.current, k) }), [touch]);

  // Open where the light is: the sunbeam by day, the lamp after dark (keeping the last pots in frame).
  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const unit = el.clientHeight / 100;
    if (!unit) return;
    el.scrollLeft = openScroll(world, el.clientWidth / unit) * unit;
    // Only when the light moves to another place on the sill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.layout.width, moment.time]);

  const extras: SillExtras = { cutting: props.cutting, found: props.found, note: props.note, cake: props.cake };
  return (
    <ScrollFrame
      sceneRef={sceneRef}
      wall={room.wall}
      step={SILL_SPEC.pitch}
      label={label ?? 'The Sill'}
      night={room.night}
      time={moment.time}
      class={props.class}
      style={{ ...sceneTokens(room.tokens), background: room.wall, ...props.style }}
    >
      <div class={s.track} style={{ width: u(world.layout.width) }}>
        <SillSegment world={world} room={room} view={view} light={light} pots={pots} coins={coins} uid={uid} tags={tags} animated={live} extras={extras} edit={props.editDecor ? { decor: props.editDecor, sceneRef } : undefined}>
          <PetLayer pets={pets} views={views} size={SILL_SPEC.scale.pet} light={light} castColor={room.sill} cast={world.cast} animated={live} touch={touch} />
        </SillSegment>
      </div>
    </ScrollFrame>
  );
});

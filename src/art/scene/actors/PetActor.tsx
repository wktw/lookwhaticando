/**
 * A pet on the Shelf: PetArt in the scene's light, at a spot, with a long shadow when it stands in
 * the sunbeam. Moves are CSS transitions on transform (compositor only); walking adds a gait on an
 * inner wrapper (a cow's four-beat bob, a duck's waddle, small hops), all paused off screen.
 *
 * With `touch`, the pet is a real button named after it (DESIGN §8.2): tap, stroke, boop and a long press to carry
 * it (it follows the finger, legs dangling, and lands with a small squash where it is let go). After a tap its name
 * tag floats up; the tag is a button too, and opens the Pet Card.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Outfit } from '@/state/types';
import type { Expression } from '@/art/pets/types';
import type { Light } from '@/art/light';
import type { Species } from '@/catalog/types';
import { RIGS } from '@/art/pets/species/rigs';
import { rimFit, WORLD_SCALE } from '@/art/pets/world';
import type { PetGesture, PetSpot } from '../model';
import { depthScale, PET_BASELINE } from '../room';
import { Pet, type PetPose } from './adapters';
import { moveTo, u } from './stand';
import { CARRY_MS, classifyPress, gestureForKey, TAP_SLOP_PX, type Reaction } from './touch';
import s from '../shelf.module.css';

export interface ActorView extends PetSpot {
  /** Milliseconds for the move to this spot (0 = jump there). */
  move?: number;
  /** A two-stage hop up or down (a cat onto a pot rim). */
  hop?: boolean;
  /** A passing expression (a reaction); otherwise asleep or at rest. */
  expression?: Expression;
  /** Standing in the sun: throw a long shadow across the sill. */
  sunny?: boolean;
}

/** What a scene lets people do with a pet. */
export interface PetTouch {
  /** The button's accessible name (the pet's name). */
  label: string;
  onGesture(gesture: PetGesture, rect: DOMRect): void;
  /** Lifted by a long press, then let go `dx` px (scene pixels) from where it was. */
  onCarry(phase: 'lift' | 'drop', dx: number): void;
  /** The name tag is up (after a tap). */
  tagOpen?: boolean;
  /** Opens the Pet Card from the name tag. */
  onOpen?(): void;
}

export interface PetActorProps {
  id: string;
  petId: string;
  species: Species;
  view: ActorView;
  /** Canvas edge in units (the scene's pet size; a cow's is larger, WORLD_SCALE). */
  size: number;
  light: Light;
  outfit?: Outfit;
  /** The surface colour the long shadow shows (the bare sill through the beam). */
  castColor?: string;
  /** Per unit of height: [across, toward the front] (see castVector). */
  cast?: readonly [number, number];
  animated?: boolean;
  label?: string;
  touch?: PetTouch;
  /** A passing answer to a touch; `nonce` replays it. */
  reaction?: Reaction & { nonce: number };
}

const GAIT: Partial<Record<Species, string>> = {
  cow: s.gaitCow,
  duck: s.gaitDuck,
  frog: s.gaitHop,
  bunny: s.gaitHop,
  hamster: s.gaitScurry,
};

/** A rough silhouette per pose, for the long shadow and the touch target: [half width, height] on a cat's canvas. */
const SILHOUETTE: Record<PetPose, readonly [number, number]> = {
  sit: [15, 44],
  loaf: [22, 30],
  stand: [24, 38],
  walk: [24, 38],
  sleep: [21, 20],
  carry: [24, 44],
};

/** Pets in the sun throw a longer shadow than the pots do (DESIGN §10.4). */
const LONGER = 1.35;

/** How high a carried pet is lifted, as a share of its canvas. */
const LIFT = 0.36;

/** An open name tag clears ordinary scene art; decor editing and carried pets stay above it. */
const TAG_Z = 3000;

const CAT_SCALE = RIGS.cat!.scale;

/**
 * A pet's canvas in a scene: the pet size × its species' world scale; on a pot rim or beside a cutting's glass it
 * keeps the pot's size (a long or tall pet a little smaller on a rim, `rimFit`).
 */
export function actorSize(size: number, species: Species, perch: PetSpot['perch'], petId?: string): number {
  if (perch === 'rim') return petId ? size * rimFit(petId) : size;
  return perch === 'glass' ? size : size * WORLD_SCALE[species];
}

export function PetActor({ id, petId, species, view, size: baseSize, light, outfit, castColor, cast, animated = true, label, touch, reaction }: PetActorProps) {
  const size = actorSize(baseSize, species, view.perch, petId);
  const scale = depthScale(view.depth);
  const [carry, setCarry] = useState<{ dx: number; dy: number } | null>(null);
  const press = useRef<{ x: number; y: number; t: number; travel: number; at: { x: number; y: number }; timer?: ReturnType<typeof setTimeout>; lifted: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => () => clearTimeout(press.current?.timer), []);

  const pose: PetPose = carry ? 'carry' : view.pose;
  const walking = pose === 'walk';
  const gait = walking ? (GAIT[species] ?? s.gaitPad) : '';
  const expression: Expression = reaction?.expression ?? view.expression ?? (view.asleep ? 'sleep' : 'idle');
  const [hw0, h0] = SILHOUETTE[pose];
  const k = (RIGS[species]?.scale ?? CAT_SCALE) / CAT_SCALE;
  const [hw, h] = [hw0 * k, h0 * k];
  const showCast = !!(view.sunny && castColor && cast && !view.perch && !carry);
  const move = reaction?.move;

  const onPointerDown = (e: PointerEvent) => {
    if (!touch || e.button > 0) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.setPointerCapture?.(e.pointerId);
    const p = { x: e.clientX, y: e.clientY, t: e.timeStamp, travel: 0, at: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }, lifted: false, timer: undefined as ReturnType<typeof setTimeout> | undefined };
    p.timer = setTimeout(() => {
      if (press.current !== p || p.travel >= TAP_SLOP_PX * 2) return;
      p.lifted = true;
      setCarry({ dx: 0, dy: 0 });
      touch.onCarry('lift', 0);
    }, CARRY_MS);
    press.current = p;
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    p.travel = Math.max(p.travel, Math.hypot(e.clientX - p.x, e.clientY - p.y));
    if (p.lifted) setCarry({ dx: e.clientX - p.x, dy: Math.min(0, e.clientY - p.y) });
  };
  const onPointerUp = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p || !touch) return;
    clearTimeout(p.timer);
    if (p.lifted) {
      setCarry(null);
      touch.onCarry('drop', e.clientX - p.x);
      return;
    }
    const g = classifyPress({ at: p.at, travel: p.travel, held: e.timeStamp - p.t, facing: view.facing });
    if (g && g !== 'carry') touch.onGesture(g, (e.currentTarget as HTMLElement).getBoundingClientRect());
  };
  const onPointerCancel = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.lifted) {
      setCarry(null);
      touch?.onCarry('drop', 0);
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const g = touch && gestureForKey(e.key);
    if (!g || !touch) return;
    e.preventDefault();
    touch.onGesture(g, button.current?.getBoundingClientRect() ?? new DOMRect());
  };

  const lift = carry ? { transform: `translate(${carry.dx}px, calc(${carry.dy}px - ${+(LIFT * 100).toFixed(1)}%))` } : undefined;
  return (
    <div
      class={s.actor}
      data-pet={id}
      data-species={species}
      data-held={carry ? '' : undefined}
      style={{
        width: u(size),
        height: u(size),
        zIndex: carry ? 5000 : touch?.tagOpen ? TAG_Z : view.z,
        transform: moveTo(view.x, view.y, size, PET_BASELINE, scale),
        transformOrigin: `50% ${PET_BASELINE}%`,
        transitionDuration: view.move ? `${Math.round(view.move)}ms` : undefined,
      }}
    >
      {showCast && (
        <svg class={s.cast} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <ellipse
            cx={0}
            cy={-h / 2}
            rx={hw}
            ry={h / 2}
            fill={castColor}
            transform={`translate(50 ${PET_BASELINE}) matrix(1 0 ${+(-cast![0] * LONGER).toFixed(3)} ${+(-cast![1] * LONGER).toFixed(3)} 0 0)`}
          />
        </svg>
      )}
      <div class={s.lift} style={lift}>
        <div
          key={reaction?.nonce}
          class={[s.body, gait, view.hop ? s.hop : '', view.reach ? (view.facing === 'left' ? s.reachLeft : s.reachRight) : '', move === 'hop' ? s.hopTiny : move === 'lean' ? (view.facing === 'left' ? s.leanLeft : s.leanRight) : move === 'squash' ? s.squash : ''].filter(Boolean).join(' ')}
        >
          <Pet petId={petId} pose={pose} light={light} facing={view.facing} expression={expression} outfit={outfit} animated={animated} size="100%" title={touch ? undefined : label} shadow={!carry} />
        </div>
        {touch && (
          <button
            ref={button}
            type="button"
            class={s.petHit}
            aria-label={touch.label}
            // At least 44 px, centred on the pet and standing on its feet.
            style={{ left: `calc(50% - max(22px, ${+hw.toFixed(2)}%))`, width: `max(44px, ${+(hw * 2).toFixed(2)}%)`, top: `calc(${PET_BASELINE}% - max(44px, ${+h.toFixed(2)}%))`, height: `max(44px, ${+h.toFixed(2)}%)` } as JSX.CSSProperties}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onKeyDown={onKeyDown}
            onClick={(e) => {
              // Pointer taps are handled on pointerup; a click with no pointer (a screen reader) is a tap.
              if ((e as MouseEvent).detail === 0) touch.onGesture('tap', (e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
          />
        )}
        {touch?.tagOpen && (
          <NameTag name={touch.label} onOpen={touch.onOpen} style={{ left: '50%', top: `${PET_BASELINE - h - 3}%` }} />
        )}
      </div>
    </div>
  );
}

/** The name tag that floats up after a tap: paper, the name in Castoro; a button to the Pet Card when there is one. */
function NameTag({ name, onOpen, style }: { name: string; onOpen?: () => void; style: JSX.CSSProperties }) {
  return onOpen ? (
    <button type="button" class={s.nameTag} style={style} onClick={onOpen} aria-label={`${name}’s card`}>
      {name}
    </button>
  ) : (
    <span class={s.nameTag} style={style}>
      {name}
    </span>
  );
}

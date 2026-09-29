/**
 * What a pet does next (DESIGN §8.2): idle, wander, sit, nap or play, weighted by its personality
 * (`PERSONALITIES[].behavior`) and bent by the clock: morning stretches, afternoons in the sunbeam,
 * evenings gathered under the lamp, and everyone asleep from eleven. Pure and seeded, so it is tested.
 */
import type { Personality, Species } from '@/catalog/types';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import type { PetSpot } from '../model';
import type { PetPose } from '../actors/adapters';
import { AWAKE_POSE, REST_POSE, groundSpot, nearestFree, perchSpot, routineAt, type Ground, type Perch } from '../arrange';
import { clamp } from '../room';

export type ActKind = 'idle' | 'wander' | 'sit' | 'nap' | 'play';
export const ACT_KINDS: readonly ActKind[] = ['idle', 'wander', 'sit', 'nap', 'play'];

type Weights = Record<ActKind, number>;

const NEUTRAL: Weights = { idle: 3, wander: 3, sit: 3, nap: 2, play: 2 };

/** Personality weights bent by the time of day. */
export function actWeights(personality: Personality | undefined, hour: number, night: boolean): Weights {
  const base = (personality && PERSONALITY_BY_ID.get(personality)?.behavior) || NEUTRAL;
  const w: Weights = { ...base };
  const routine = night ? routineAt(hour) : 'day';
  if (routine === 'sleep') return { idle: w.idle * 0.05, wander: w.wander * 0.02, sit: w.sit * 0.05, nap: w.nap * 20 + 10, play: 0 };
  if (routine === 'lamp') return { ...w, wander: w.wander * 0.5, play: w.play * 0.3, sit: w.sit * 1.6, nap: w.nap * 1.4 };
  if (hour < 10) return { ...w, idle: w.idle * 1.4, nap: w.nap * 0.5 };
  if (hour >= 13 && hour < 17) return { ...w, nap: w.nap * 1.5, wander: w.wander * 0.8 };
  return w;
}

/** A weighted pick; `roll` is 0…1. */
export function pickAct(w: Weights, roll: number): ActKind {
  const total = ACT_KINDS.reduce((s, k) => s + Math.max(0, w[k]), 0);
  let r = clamp(roll, 0, 0.999999) * total;
  for (const k of ACT_KINDS) {
    r -= Math.max(0, w[k]);
    if (r < 0) return k;
  }
  return 'idle';
}

/** Walking pace in units per second: small things scurry, cows take their time. */
export const PACE: Record<Species, number> = { cat: 7, dog: 7, bunny: 6.5, frog: 5, bear: 4.2, hamster: 6, duck: 4.6, cow: 3.2 };

/** One step of an act: go to this spot (walking or hopping if it is far) and hold it for `hold` ms. */
export interface Step {
  spot: PetSpot;
  /** Travel time to the spot in ms (0 = already there). */
  move: number;
  walk: boolean;
  hop: boolean;
  hold: number;
}

export interface PlanInput {
  species: Species;
  personality?: Personality;
  /** Where it is now. */
  at: PetSpot;
  /** Its home rim, if it keeps a habit company. */
  home?: Perch;
  ground: Ground;
  hour: number;
  night: boolean;
  /** Where the others are (x), to keep a little apart. */
  taken: readonly number[];
  /** Perches someone is already on. */
  perchesTaken?: ReadonlySet<string>;
  rnd: () => number;
}

const between = (rnd: () => number, a: number, b: number) => a + rnd() * (b - a);

/** The next act as one or two steps. */
export function planAct(input: PlanInput): { kind: ActKind; steps: Step[] } {
  const { species, at, ground: g, rnd } = input;
  const kind = pickAct(actWeights(input.personality, input.hour, input.night), rnd());
  const routine = input.night ? routineAt(input.hour) : 'day';
  const rest: PetPose = REST_POSE[species];
  const awake: PetPose = AWAKE_POSE[species];
  const mid = (g.x0 + g.x1) / 2;
  const travel = (to: PetSpot, pose: PetPose, asleep: boolean, hold: number): Step[] => {
    const dist = Math.hypot(to.x - at.x, (to.y - at.y) * 2);
    const hop = !!to.perch !== !!at.perch || (to.perch === 'rim' && at.perch === 'rim');
    const facing = to.x < at.x - 0.5 ? 'left' : to.x > at.x + 0.5 ? 'right' : at.facing;
    if (dist < 1.5) return [{ spot: { ...to, pose, asleep, facing: at.facing }, move: 0, walk: false, hop: false, hold }];
    const move = hop ? 620 : Math.max(700, (dist / PACE[species]) * 1000);
    return [
      { spot: { ...to, pose: hop ? awake : 'walk', asleep: false, facing }, move, walk: !hop, hop, hold: 0 },
      { spot: { ...to, pose, asleep, facing: rnd() < 0.3 ? (facing === 'left' ? 'right' : 'left') : facing }, move: 0, walk: false, hop: false, hold },
    ];
  };

  // Where to go, if anywhere.
  const target = (): PetSpot => {
    if (input.home && (kind === 'nap' || kind === 'sit') && rnd() < 0.45) return perchSpot(input.home, rest, false, at.facing);
    const liked = g.perches.filter((q) => q.kind !== 'rim' && q.likes?.includes(species) && !input.perchesTaken?.has(q.id) && q.id !== at.perchId);
    if (liked.length && (kind === 'nap' || kind === 'sit' || kind === 'idle') && rnd() < 0.5) return perchSpot(liked[Math.floor(rnd() * liked.length)]!, rest, false, at.facing);
    let want: number;
    if (routine === 'lamp' && g.lampX != null) want = g.lampX - between(rnd, 0.5, 2.6) * g.petSize;
    else if (routine === 'day' && g.beam && (kind === 'nap' || input.personality === 'sunny' || rnd() < 0.35)) {
      want = between(rnd, g.beam.x0, g.beam.x1) + g.beam.slant * 0.6;
    } else want = kind === 'wander' ? between(rnd, g.x0, g.x1) : at.x + between(rnd, -1, 1) * g.petSize * 1.5;
    const x = nearestFree(g, want, input.taken);
    return groundSpot(g, x, between(rnd, g.d0 + 0.1, g.d1), awake, false, x < mid ? 'right' : 'left');
  };

  const bed = (): PetSpot | null => {
    const beds = g.perches.filter((q) => q.kind === 'bed' && !input.perchesTaken?.has(q.id));
    return beds.length && rnd() < 0.6 ? perchSpot(beds[Math.floor(rnd() * beds.length)]!, 'sleep', true, at.facing) : null;
  };

  switch (kind) {
    case 'nap': {
      const to = routine === 'sleep' && at.perch ? at : (bed() ?? target());
      return { kind, steps: travel(to, 'sleep', true, between(rnd, 22000, 48000)) };
    }
    case 'sit':
      return { kind, steps: travel(target(), rnd() < 0.5 ? rest : awake, false, between(rnd, 9000, 18000)) };
    case 'wander':
      return { kind, steps: travel(target(), awake, false, between(rnd, 4000, 9000)) };
    case 'play': {
      const to = at.perch ? target() : { ...at, x: nearestFree(g, at.x + (rnd() < 0.5 ? -1 : 1) * g.petSize * 0.8, input.taken) };
      const steps = travel(to, awake, false, between(rnd, 2500, 5000));
      if (steps[0]) steps[0].hop = !to.perch && species !== 'cow';
      return { kind, steps };
    }
    default:
      return { kind, steps: [{ spot: { ...at, pose: at.perch ? at.pose : rnd() < 0.5 ? awake : rest, asleep: false }, move: 0, walk: false, hop: false, hold: between(rnd, 5000, 11000) }] };
  }
}

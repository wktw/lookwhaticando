/**
 * The pets' director: gives each pet its next act on a timer, never per frame. A move is one signal
 * update (the actor re-renders once and CSS carries it across); arriving is another. It stops while
 * the scene is hidden, holds poses under reduced motion (relocating one pet by crossfade at most every
 * 30 s), and now and then lets a vignette play.
 */
import { signal, type Signal } from '@preact/signals';
import type { PlaceId, Personality, Species } from '@/catalog/types';
import type { PetSpot } from '../model';
import type { ActorView } from '../actors/PetActor';
import type { Ground, Perch } from '../arrange';
import type { Moment } from '../time';
import { seeded } from '../sill/scenery';
import { PACE, planAct, type Step } from './plan';
import { findVignette, vignetteById, type Vignette } from './vignettes';

export interface DirectorPet {
  key: string;
  species: Species;
  personality?: Personality;
  place: PlaceId;
  ground: Ground;
  home?: Perch;
}

export interface DirectorOptions {
  moment: Moment;
  /** Reduced motion: hold poses, relocate by crossfade. */
  reduced: () => boolean;
  /** The actor's element, for crossfades. */
  element?: (key: string) => HTMLElement | null;
  seed?: number;
  /** Let vignettes play (default true). */
  vignettes?: boolean;
}

/** Reduced motion relocates one pet at most this often (DESIGN §10.5). */
export const REDUCED_RELOCATE_MS = 30000;
const VIGNETTE_CHECK: readonly [number, number] = [40000, 90000];
const FIRST_VIGNETTE_MS = 6000;
const FADE_MS = 320;

export class Director {
  readonly views = new Map<string, Signal<ActorView>>();
  private pets = new Map<string, DirectorPet>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private busy = new Set<string>();
  private sceneTimer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private rnd: () => number;
  private moment: Moment;
  private turn = 0;

  constructor(
    pets: readonly DirectorPet[],
    start: ReadonlyMap<string, PetSpot>,
    private opts: DirectorOptions,
  ) {
    this.rnd = seeded(opts.seed ?? 11);
    this.moment = opts.moment;
    for (const p of pets) {
      const spot = start.get(p.key);
      if (!spot) continue;
      this.pets.set(p.key, p);
      this.views.set(p.key, signal<ActorView>({ ...spot, move: 0, sunny: !!p.ground.beam }));
    }
  }

  setMoment(m: Moment): void {
    this.moment = m;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.opts.reduced()) {
      this.sceneTimer = setTimeout(() => this.relocateOne(), REDUCED_RELOCATE_MS);
      return;
    }
    let i = 0;
    for (const key of this.pets.keys()) this.schedule(key, 1500 + (i++ % 6) * 900 + this.rnd() * 2500);
    if (this.opts.vignettes !== false) this.sceneTimer = setTimeout(() => this.tryVignette(), FIRST_VIGNETTE_MS);
  }

  stop(): void {
    this.running = false;
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    if (this.sceneTimer) clearTimeout(this.sceneTimer);
    this.sceneTimer = undefined;
    // Freeze anyone mid-walk where they are headed, standing still.
    for (const v of this.views.values()) if (v.peek().pose === 'walk') v.value = { ...v.peek(), move: 0, pose: 'stand' };
  }

  private schedule(key: string, ms: number): void {
    const old = this.timers.get(key);
    if (old) clearTimeout(old);
    this.timers.set(
      key,
      setTimeout(() => this.next(key), ms),
    );
  }

  private perchesTaken(except: string): Set<string> {
    const ids = new Set<string>();
    for (const [k, v] of this.views) if (k !== except && v.peek().perchId) ids.add(v.peek().perchId!);
    return ids;
  }

  private taken(except: string, ground: Ground): number[] {
    const xs: number[] = [];
    for (const [k, v] of this.views) if (k !== except && this.pets.get(k)?.ground === ground && !v.peek().perch) xs.push(v.peek().x);
    return xs;
  }

  private next(key: string): void {
    if (!this.running || this.busy.has(key)) return;
    const pet = this.pets.get(key)!;
    const view = this.views.get(key)!;
    const { steps } = planAct({
      species: pet.species,
      personality: pet.personality,
      at: view.peek(),
      home: pet.home,
      ground: pet.ground,
      hour: this.moment.hour,
      night: this.moment.light.night,
      taken: this.taken(key, pet.ground),
      perchesTaken: this.perchesTaken(key),
      rnd: this.rnd,
    });
    this.play(key, steps, () => this.schedule(key, 400 + this.rnd() * 1200));
  }

  /** Play steps in order, then call `done`. */
  private play(key: string, steps: readonly Step[], done: () => void): void {
    const view = this.views.get(key)!;
    const pet = this.pets.get(key)!;
    const run = (i: number) => {
      if (!this.running) return;
      const step = steps[i];
      if (!step) return done();
      view.value = { ...step.spot, move: step.move, hop: step.hop, sunny: !!pet.ground.beam && !step.spot.perch };
      const wait = step.move + step.hold;
      this.timers.set(
        key,
        setTimeout(() => run(i + 1), Math.max(16, wait)),
      );
    };
    run(0);
  }

  private tryVignette(): void {
    if (!this.running) return;
    const places = new Map<PlaceId, DirectorPet[]>();
    for (const p of this.pets.values()) if (!this.busy.has(p.key)) places.set(p.place, [...(places.get(p.place) ?? []), p]);
    for (const [place, pets] of places) {
      const ground = pets[0]!.ground;
      const found = findVignette({ place, ground, moment: this.moment, actors: pets.map((p) => ({ key: p.key, species: p.species, spot: this.views.get(p.key)!.peek() })) }, this.rnd());
      if (found) {
        this.stageVignette(found.vignette, found.cast, place, ground);
        break;
      }
    }
    const [a, b] = VIGNETTE_CHECK;
    this.sceneTimer = setTimeout(() => this.tryVignette(), a + this.rnd() * (b - a));
  }

  /** Play a vignette now by id, if it can (a staged gallery scene, a moment the screen asks for). */
  playVignette(id: string): boolean {
    const v = vignetteById(id);
    if (!v || !this.running || this.opts.reduced() || (v.ready && !v.ready())) return false;
    const pets = [...this.pets.values()].filter((p) => !this.busy.has(p.key));
    for (const place of new Set(pets.map((p) => p.place))) {
      const here = pets.filter((p) => p.place === place);
      const ground = here[0]!.ground;
      const cast = v.cast({ place, ground, moment: this.moment, actors: here.map((p) => ({ key: p.key, species: p.species, spot: this.views.get(p.key)!.peek() })) });
      if (cast) {
        for (const key of cast) {
          const t = this.timers.get(key);
          if (t) clearTimeout(t);
        }
        this.stageVignette(v, cast, place, ground);
        return true;
      }
    }
    return false;
  }

  private stageVignette(v: Vignette, cast: readonly string[], place: PlaceId, ground: Ground): void {
    const actors = [...this.pets.values()].filter((p) => p.place === place).map((p) => ({ key: p.key, species: p.species, spot: this.views.get(p.key)!.peek() }));
    const spots = v.stage({ place, ground, moment: this.moment, actors }, cast);
    const release = () => {
      for (const key of members) {
        this.busy.delete(key);
        this.schedule(key, 500 + this.rnd() * 3000);
      }
    };
    const members = cast.filter((key) => spots.has(key) && this.views.has(key));
    let arrived = 0;
    for (const key of members) {
      const to = spots.get(key)!;
      this.busy.add(key);
      const at = this.views.get(key)!.peek();
      const pet = this.pets.get(key)!;
      const dist = Math.hypot(to.x - at.x, to.y - at.y);
      const move = dist < 1 ? 0 : Math.max(700, (dist / PACE[pet.species]) * 1000);
      const steps: Step[] = [
        { spot: { ...to, pose: move ? 'walk' : to.pose, asleep: false, facing: to.x < at.x ? 'left' : 'right' }, move, walk: move > 0, hop: !!to.perch && !at.perch, hold: 0 },
        { spot: to, move: 0, walk: false, hop: false, hold: 0 },
      ];
      // A line sets off one after another, so the gait reads as a line, not a crowd.
      const delay = v.stagger ? members.indexOf(key) * v.stagger : 0;
      if (delay) steps.unshift({ spot: { ...at }, move: 0, walk: false, hop: false, hold: delay });
      if (v.procession) {
        // Walk on together, in step, the length of the line and a bit.
        const dir = to.facing === 'right' ? 1 : -1;
        const far = { ...to, x: Math.max(ground.x0 + 4, Math.min(ground.x1 - 4, to.x + dir * ground.petSize * 3)) };
        steps.push({ spot: { ...far, pose: 'walk' }, move: (Math.abs(far.x - to.x) / PACE[pet.species]) * 1000, walk: true, hop: false, hold: 0 });
        steps.push({ spot: { ...far, pose: 'stand' }, move: 0, walk: false, hop: false, hold: 0 });
      }
      this.play(key, steps, () => {
        arrived++;
        if (arrived === members.length) this.sceneTimer = setTimeout(release, v.hold);
      });
    }
  }

  /** Reduced motion: one pet fades out, and back in somewhere else. */
  private relocateOne(): void {
    if (!this.running) return;
    const keys = [...this.pets.keys()];
    if (keys.length) {
      const key = keys[this.turn++ % keys.length]!;
      const pet = this.pets.get(key)!;
      const view = this.views.get(key)!;
      const { steps } = planAct({ species: pet.species, personality: pet.personality, at: view.peek(), home: pet.home, ground: pet.ground, hour: this.moment.hour, night: this.moment.light.night, taken: this.taken(key, pet.ground), perchesTaken: this.perchesTaken(key), rnd: this.rnd });
      const last = steps[steps.length - 1]!;
      const el = this.opts.element?.(key);
      const place = () => {
        view.value = { ...last.spot, move: 0, hop: false, sunny: !!pet.ground.beam && !last.spot.perch };
      };
      if (el && typeof el.animate === 'function') {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' }).onfinish = () => {
          place();
          requestAnimationFrame(() => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, fill: 'forwards' }));
        };
      } else place();
    }
    this.sceneTimer = setTimeout(() => this.relocateOne(), REDUCED_RELOCATE_MS);
  }
}

/**
 * Game reducers run inside a copy-on-write transaction (DESIGN §11 "State": actions are pure
 * reducers that return the next state and the GameEvents to celebrate).
 *
 * Contract:
 * - The input state is never mutated. Every write goes through a section accessor below, which
 *   shallow-copies that object (and each parent on its path) the first time it is touched, so
 *   untouched sections keep their identity (cheap equality checks, cheap saves). Tests deep-freeze
 *   the input to prove it.
 * - Everything non-deterministic is injected through `Env`: the clock (`now`), the app day
 *   (`today`, already monotonic), the local wall-clock reader (for hour-based badges and turning
 *   `createdAt` into an app day) and the random source.
 * - `finish()` hands back `{ state, events, ...result }`.
 */
import type { GameEvent } from '@/state/api';
import type { AppState, DateKey, DayLog, Habit, PetState } from '@/state/types';
import type { LocalTimeReader } from './dates';
import type { Rng } from './rng';

/** Everything a reducer may know about the outside world. */
export interface Env {
  /** Epoch ms of the action, as read from the device clock. */
  readonly now: number;
  /** The app day of the action (DESIGN v1 §13.2): `settings.dayStartsAt`-aware and never earlier than `clock.maxDateKey`. */
  readonly today: DateKey;
  /** Local wall-clock reader (early-bird / wind-down hours, `createdAt` → app day). */
  readonly local: LocalTimeReader;
  readonly rng: Rng;
  /** The device's IANA time zone, when known (the hemisphere is inferred from it, §14.3). */
  readonly timeZone?: string;
}

/** What every game reducer returns: the next state, the events to celebrate, and its own result fields. */
export type Outcome<R extends object = object> = { state: AppState; events: GameEvent[] } & R;

type ObjectKey = { [K in keyof AppState]-?: AppState[K] extends object ? K : never }[keyof AppState];
type Ledger = AppState['ledger'];

/**
 * Maps keyed by ids (logs by habit, pets by id) are plain objects, so a key such as `__proto__` or
 * `toString` would read an inherited value and, assigned with brackets, set the map's prototype
 * instead of an own entry that JSON keeps (audit FS7). The validator refuses such ids at the trust
 * boundary (WP-A5); these keep the accessors right whatever id they are given.
 */
function ownValue<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}
function defineOwn<T>(map: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(map, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Objects used as memo keys (see economy.ts) are *sealed*: a transaction never writes into them in
 * place, even if it created them, so a memoised result keyed on an object can never go stale.
 */
const sealed = new WeakSet<object>();
export function seal(o: object): void {
  sealed.add(o);
}

export class Tx {
  readonly env: Env;
  readonly events: GameEvent[] = [];
  private cur: AppState;
  private readonly owned = new WeakSet<object>();

  constructor(state: AppState, env: Env) {
    this.cur = state;
    this.env = env;
  }

  /** The state as of now (read it freely; write only through the accessors). */
  get s(): AppState {
    return this.cur;
  }

  /** Shallow-copies `o` unless this transaction already owns it. */
  private own<T extends object>(o: T): T {
    if (this.owned.has(o) && !sealed.has(o)) return o;
    const copy = (Array.isArray(o) ? o.slice() : { ...o }) as T;
    this.owned.add(copy);
    return copy;
  }

  private root(): AppState {
    this.cur = this.own(this.cur);
    return this.cur;
  }

  /** A writable top-level section. */
  section<K extends ObjectKey>(key: K): AppState[K] {
    const r = this.root();
    r[key] = this.own(r[key] as object) as AppState[K];
    return r[key];
  }

  /** Sets a top-level field (use for scalars and optional fields such as `pendingReveal`). */
  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    const r = this.root();
    if (value === undefined) delete r[key];
    else r[key] = value;
  }

  /** A writable ledger map. */
  ledger<K extends keyof Ledger>(key: K): Ledger[K] {
    const l = this.section('ledger');
    l[key] = this.own(l[key]);
    return l[key];
  }

  /** A writable log map for one habit (created when missing). */
  logs(habitId: string): Record<DateKey, DayLog> {
    const all = this.section('logs');
    const map = this.own(ownValue(all, habitId) ?? {});
    defineOwn(all, habitId, map);
    return map;
  }

  /** A writable copy of one habit (throws when it does not exist). */
  habit(id: string): Habit {
    const list = this.section('habits');
    const i = list.findIndex((h) => h.id === id);
    if (i < 0) throw new Error(`Unknown habit ${id}`);
    const h = this.own(list[i]!);
    list[i] = h;
    return h;
  }

  /** A writable copy of one pet (throws when it does not exist). */
  pet(id: string): PetState {
    const pets = this.section('pets');
    const p = ownValue(pets, id);
    if (!p) throw new Error(`Unknown pet ${id}`);
    const copy = this.own(p);
    defineOwn(pets, id, copy);
    return copy;
  }

  /** A writable copy of a nested object held by a section object (e.g. a pet's outfit). */
  child<P extends object, K extends keyof P>(parent: P, key: K): NonNullable<P[K]> {
    const value = parent[key];
    if (value === null || typeof value !== 'object') throw new Error(`child: ${String(key)} is not an object`);
    const copy = this.own(value as object) as NonNullable<P[K]>;
    parent[key] = copy;
    return copy;
  }

  emit(...events: GameEvent[]): void {
    this.events.push(...events);
  }

  finish<R extends object>(result: R): Outcome<R>;
  finish(): Outcome;
  finish<R extends object>(result?: R): Outcome<R> {
    return { ...(result ?? ({} as R)), state: this.cur, events: this.events };
  }
}

/** Runs a reducer body in a fresh transaction. */
export function transact<R extends object>(state: AppState, env: Env, body: (tx: Tx) => R): Outcome<R> {
  const tx = new Tx(state, env);
  const result = body(tx);
  return tx.finish(result);
}

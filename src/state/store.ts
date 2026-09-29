/**
 * The app store: one signal holding AppState, plus action functions.
 *
 * CONTRACT: UI code reads `state.value` / selectors (state/selectors.ts) and calls the exported
 * actions. Actions delegate to pure reducers in src/domain/*, commit the new state, persist it
 * (wallet-changing actions write immediately, others debounced), and emit GameEvents (./api.ts).
 * UI never mutates state directly.
 *
 * How an action runs (`act`):
 * 1. Read the clock once; today = the app day of now (settings.dayStartsAt) but never earlier than
 *    clock.maxDateKey (DESIGN §13.2).
 * 2. In one copy-on-write transaction: open the day (rollover work if the app day advanced), then
 *    the reducer. The input state is never mutated.
 * 3. Commit: `state` and `today` update together; the save is written at once when the wallet,
 *    collection, pending reveal or lifetime changed, else debounced (250 ms); the theme is mirrored
 *    to its own key; the events are emitted after the commit.
 * While another window owns the save, or it was written by a newer app version, actions are no-ops.
 *
 * Everything browser-specific (localStorage, IndexedDB, Web Locks, DOM events, timers, crypto) is
 * reached through `StoreRuntime`, which tests replace with `configureStore`.
 */
import { batch, computed, signal } from '@preact/signals';
import type { AppState, DateKey, MeadowZoneId, PlacedDecor, Settings } from './types';
import type {
  ActionResult,
  CheckInResult,
  GameEvent,
  HabitInput,
  ImportPreview,
  MachineStatus,
  PetInteractionResult,
  PullOutcome,
  WishOutcome,
  ZonePurchase,
} from './api';
import type { MachineId, WearableSlot } from '@/catalog/types';
import { getMachine } from '@/catalog/machines';
import { SECRET_IDS } from '@/catalog/collectibles';
import { createInitialState } from './defaults';
import { emitGameEvents } from './events';
import {
  DEMO_KEY,
  SAVE_KEY,
  SaveQueue,
  UNDO_IMPORT_KEY,
  browserStorage,
  corruptKeyOf,
  loadSave,
  memoryStorage,
  mirrorTheme,
  peekRev,
  readJson,
  removeKey,
  removeNamespace,
  writeBackup,
  writeJson,
  type KeyValueStorage,
  type SaveStatus,
  type Timers,
} from './persist';
import { indexedDbSnapshotStore, memorySnapshotStore, snapshotMeta, takeDailySnapshot, type SnapshotStore } from './snapshots';
import { deviceLabel, describeBackup, encodePayload, makeBackup, parseBackupText } from './handoff';
import { validateState } from './validate';
import { buildDemo } from './demo';
import { appDayKey, monotonicDayKey, runtimeLocalTime, type LocalTimeReader } from '@/domain/dates';
import type { Rng } from '@/domain/rng';
import { transact, type Env, type Tx } from '@/domain/tx';
import { compactSave, openDay } from '@/domain/rollover';
import { rewardsPaused } from '@/domain/wallet';
import { machineProgress } from '@/domain/collection';
import { availableMachineIds, machineAvailability } from '@/domain/seasons';
import * as gacha from '@/domain/gacha';
import * as habitsDomain from '@/domain/habits';
import * as logging from '@/domain/logging';
import * as friendship from '@/domain/friendship';
import * as pantry from '@/domain/pantry';
import * as meadowDomain from '@/domain/meadow';
import * as profileDomain from '@/domain/profile';
import { readLetter } from '@/domain/letters';
import type { RuleEditTiming } from '@/domain/rules';

/* ------------------------------------------------------------------ */
/* Runtime (injectable)                                                */
/* ------------------------------------------------------------------ */

export interface LockManagerLike {
  request(name: string, options: { ifAvailable?: boolean; steal?: boolean }, callback: (lock: unknown) => Promise<unknown> | unknown): Promise<unknown>;
}

type Unlisten = () => void;

export interface StoreRuntime {
  /** localStorage (null → an in-memory fallback: nothing survives a reload). */
  storage: KeyValueStorage | null;
  snapshots: SnapshotStore | null;
  now: () => number;
  local: LocalTimeReader;
  rng: Rng;
  timers: Timers & { setInterval(fn: () => void, ms: number): unknown; clearInterval(handle: unknown): void };
  locks: LockManagerLike | null;
  /** Adds a DOM listener (window or document); null outside the browser. */
  listen: ((target: 'window' | 'document', type: string, fn: (e: Event) => void) => Unlisten) | null;
  /** Whether the page is hidden (visibilitychange). */
  hidden: () => boolean;
  /** True when running as an installed app (standalone display mode). */
  standalone: () => boolean;
  /** Asks the browser to keep storage (navigator.storage.persist). */
  persistStorage: () => void;
  appVersion: string;
  device: string;
}

function cryptoRng(): Rng {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    return () => {
      c.getRandomValues(buf);
      return buf[0]! / 4294967296;
    };
  }
  return Math.random;
}

function defaultRuntime(): StoreRuntime {
  const g = globalThis as unknown as {
    window?: Window;
    document?: Document;
    navigator?: Navigator & { standalone?: boolean };
    matchMedia?: (q: string) => MediaQueryList;
  };
  return {
    storage: browserStorage(),
    snapshots: indexedDbSnapshotStore(),
    now: () => Date.now(),
    local: runtimeLocalTime,
    rng: cryptoRng(),
    timers: {
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
      setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
      clearInterval: (h) => globalThis.clearInterval(h as ReturnType<typeof setInterval>),
    },
    locks: (g.navigator as { locks?: LockManagerLike } | undefined)?.locks ?? null,
    listen:
      g.window && g.document
        ? (target, type, fn) => {
            const t = target === 'window' ? g.window! : g.document!;
            t.addEventListener(type, fn);
            return () => t.removeEventListener(type, fn);
          }
        : null,
    hidden: () => g.document?.visibilityState === 'hidden',
    standalone: () => Boolean(g.navigator?.standalone) || Boolean(g.matchMedia?.('(display-mode: standalone)').matches),
    persistStorage: () => {
      void (g.navigator as { storage?: { persist?: () => Promise<boolean> } } | undefined)?.storage?.persist?.().catch(() => undefined);
    },
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    device: deviceLabel(),
  };
}

let rt: StoreRuntime = defaultRuntime();
let fallbackStorage: KeyValueStorage | null = null;
const storage = (): KeyValueStorage => rt.storage ?? (fallbackStorage ??= memoryStorage());
const snapshots = (): SnapshotStore => (rt.snapshots ??= memorySnapshotStore());

/** Replaces runtime adapters (tests, diagnostics). Call before `hydrate()`. */
export function configureStore(patch: Partial<StoreRuntime>): void {
  rt = { ...rt, ...patch };
}

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

export const state = signal<AppState>(createInitialState());

/** Today's app-day key (respects settings.dayStartsAt; monotonic). */
export const today = signal<DateKey>(appDayKey(Date.now(), 180));

/** The wall clock, refreshed by startClock() every 30 s (greetings, time blocks). */
export const now = signal<number>(Date.now());

/** True while running the isolated demo meadow (separate storage namespace). */
export const demoMode = signal(false);

/** True when this window lost the single-writer lock (another window owns the save). */
export const readOnly = signal<false | 'other-window' | 'newer-version' | 'storage-full'>(false);

export const wallet = computed(() => state.value.wallet);

/** The device clock is > 36 h behind the latest time seen: show the calm banner; rewards pause (§13.2). */
export const clockBehind = computed(() => rewardsPaused(state.value, now.value));

/** Last save outcome (You › Data storage status, diagnostics). */
export const saveStatus = signal<{ status: SaveStatus | 'idle'; rev: number; chars: number; at: number }>({ status: 'idle', rev: 0, chars: 0, at: 0 });

/** Something about loading the save the UI should explain (null when all is well). */
export const loadIssue = signal<null | { kind: 'recovered-from-backup' | 'corrupt-save' | 'newer-version'; details?: string[] }>(null);

/* ------------------------------------------------------------------ */
/* Core: act & commit                                                  */
/* ------------------------------------------------------------------ */

let queue: SaveQueue | null = null;
const currentKey = (): string => (demoMode.value ? DEMO_KEY : SAVE_KEY);

function todayFor(s: AppState, ms: number): DateKey {
  return monotonicDayKey(appDayKey(ms, s.settings.dayStartsAt, rt.local), s.clock.maxDateKey);
}

function envAt(ms: number, s: AppState): Env {
  return { now: ms, today: todayFor(s, ms), local: rt.local, rng: rt.rng };
}

const writable = (): boolean => readOnly.value !== 'other-window' && readOnly.value !== 'newer-version';

function makeQueue(key: string, rev: number): SaveQueue {
  return new SaveQueue({
    storage: storage(),
    key,
    appVersion: rt.appVersion,
    rev,
    now: rt.now,
    timers: rt.timers,
    compact: (s) =>
      transact(s, envAt(rt.now(), s), (tx) => {
        compactSave(tx);
        return {};
      }).state,
    onStatus: (status, info) => {
      saveStatus.value = { status, rev: info.rev, chars: info.chars ?? 0, at: rt.now() };
      if (status === 'storage-full') readOnly.value = 'storage-full';
      else if (status === 'saved' && readOnly.value === 'storage-full') readOnly.value = false;
    },
  });
}

/** Swaps the save queue (flushing the old one first). */
function switchQueue(key: string, rev: number): void {
  queue?.flush();
  queue?.dispose();
  queue = makeQueue(key, rev);
}

/** Whether a change must be written at once (wallet-changing, commit-before-animate). */
function urgent(prev: AppState, next: AppState): boolean {
  return prev.wallet !== next.wallet || prev.collection !== next.collection || prev.pendingReveal !== next.pendingReveal || prev.lifetime !== next.lifetime;
}

function persist(prev: AppState, next: AppState, force = false): void {
  if (!writable()) return;
  queue ??= makeQueue(currentKey(), 0);
  if (force || urgent(prev, next)) queue.saveNow(next);
  else queue.schedule(next);
  if (!demoMode.value && (prev.settings.theme !== next.settings.theme || prev.settings.reduceMotion !== next.settings.reduceMotion)) {
    mirrorTheme(storage(), next.settings);
  }
}

function setState(next: AppState, ms: number): void {
  batch(() => {
    state.value = next;
    today.value = todayFor(next, ms);
    now.value = ms;
  });
}

/** Runs a reducer in a transaction (after opening the day), commits, and returns its result + events. */
function act<R extends object>(body: (tx: Tx) => R, fallback: R): R & { events: GameEvent[] } {
  if (!writable()) return { ...fallback, events: [] };
  const ms = rt.now();
  const prev = state.value;
  const out = transact(prev, envAt(ms, prev), (tx) => {
    openDay(tx);
    return { r: body(tx) };
  });
  setState(out.state, ms);
  if (out.state !== prev) persist(prev, out.state);
  if (out.events.length > 0) emitGameEvents(out.events);
  return { ...out.r, events: out.events };
}

/** For actions returning a plain value. */
function actValue<R>(body: (tx: Tx) => R, fallback: R): R {
  return act((tx) => ({ v: body(tx) }), { v: fallback }).v;
}

/** For actions returning nothing. */
function actVoid(body: (tx: Tx) => unknown): GameEvent[] {
  return act(
    (tx) => {
      body(tx);
      return {};
    },
    {},
  ).events;
}

/** Replaces the whole state (import, snapshot restore, demo) and writes it at once. */
function replaceState(next: AppState): void {
  const ms = rt.now();
  const out = transact(next, envAt(ms, next), (tx) => {
    openDay(tx);
    return {};
  });
  const prev = state.value;
  setState(out.state, ms);
  persist(prev, out.state, true);
  if (!demoMode.value) mirrorTheme(storage(), out.state.settings);
}

/* ---------------- Boot ---------------- */

const LOCK_NAME = 'mochi-meadow:writer';
let releaseLock: (() => void) | null = null;
let unlisteners: Unlisten[] = [];
let lastSnapshotDay: DateKey | null = null;

function snapshotToday(): void {
  if (demoMode.value || !writable()) return;
  const s = state.value;
  const day = today.value;
  if (lastSnapshotDay === day || !s.profile.onboarded) return;
  lastSnapshotDay = day;
  void takeDailySnapshot(snapshots(), s, { day, now: rt.now(), weekStart: s.settings.weekStart, appVersion: rt.appVersion }).catch(() => {
    lastSnapshotDay = null;
  });
}

/** Holds the single-writer Web Lock while this window owns the save (best effort without Web Locks). */
function acquireLock(steal = false): void {
  const locks = rt.locks;
  if (!locks) return;
  releaseLock?.();
  releaseLock = null;
  let granted = false;
  locks
    .request(LOCK_NAME, steal ? { steal: true } : { ifAvailable: true }, (lock) => {
      if (!lock) {
        queue?.dispose();
        readOnly.value = 'other-window';
        return undefined;
      }
      granted = true;
      if (readOnly.value === 'other-window') readOnly.value = false;
      return new Promise<void>((resolve) => (releaseLock = resolve));
    })
    .catch(() => {
      // Our lock was stolen by another window ("Use here" over there): stop writing.
      if (!granted) return;
      queue?.dispose();
      queue = null;
      readOnly.value = 'other-window';
    });
}

/** Adopts a newer save written by another window (`storage` event). */
function adoptFromStorage(): void {
  const res = loadSave(storage(), currentKey());
  if (res.kind !== 'ok') return;
  setState(res.state, rt.now());
  if (queue) queue.rev = res.rev;
}

/** Load the persisted save (or start fresh), run migrations, acquire the writer lock, begin auto-saving. */
export function hydrate(): void {
  for (const u of unlisteners) u();
  unlisteners = [];
  releaseLock?.();
  releaseLock = null;
  queue?.dispose();
  queue = null;
  demoMode.value = false;
  readOnly.value = false;
  loadIssue.value = null;
  lastSnapshotDay = null;
  const store = storage();
  const res = loadSave(store, SAVE_KEY);
  let initial: AppState;
  let rev = 0;
  switch (res.kind) {
    case 'ok':
      initial = res.state;
      rev = res.rev;
      if (res.fromBackup) loadIssue.value = { kind: 'recovered-from-backup' };
      else writeBackup(store, SAVE_KEY, res.raw);
      break;
    case 'newer':
      initial = createInitialState(rt.now());
      readOnly.value = 'newer-version';
      loadIssue.value = { kind: 'newer-version' };
      break;
    case 'corrupt':
      initial = createInitialState(rt.now());
      loadIssue.value = { kind: 'corrupt-save', details: res.errors };
      try {
        store.setItem(corruptKeyOf(SAVE_KEY), res.raw);
      } catch {
        /* keep going: the corrupt text stays under the main key until the next save */
      }
      break;
    default:
      initial = createInitialState(rt.now());
  }
  queue = makeQueue(SAVE_KEY, rev);
  setState(initial, rt.now());
  if (writable()) {
    actVoid(() => undefined);
    mirrorTheme(store, state.value.settings);
  }
  if (readOnly.value !== 'newer-version') acquireLock();
  if (rt.listen) {
    unlisteners.push(
      rt.listen('window', 'storage', (e) => {
        const key = (e as StorageEvent).key;
        if (key !== currentKey()) return;
        const rev2 = peekRev(storage(), currentKey());
        if (rev2 !== null && (!queue || rev2 > queue.rev)) adoptFromStorage();
      }),
    );
  }
  snapshotToday();
}

/** "Use here": take the save over from another window (reloads it first). */
export function useHere(): void {
  if (readOnly.value !== 'other-window') return;
  const res = loadSave(storage(), currentKey());
  queue = makeQueue(currentKey(), res.kind === 'ok' ? res.rev : 0);
  if (res.kind === 'ok') setState(res.state, rt.now());
  readOnly.value = false;
  acquireLock(true);
}

/** Writes any pending save now (pagehide / hidden). */
export function flushSaves(): void {
  queue?.flush();
}

/** One clock tick: refresh `now`/`today`; on a new app day run the day's work and snapshot. */
function tick(): void {
  const ms = rt.now();
  const s = state.value;
  const t = todayFor(s, ms);
  if (t > s.clock.maxDateKey && writable()) actVoid(() => undefined);
  else
    batch(() => {
      now.value = ms;
      today.value = t;
    });
  snapshotToday();
}

/** Keep `today` current (day rollover on focus/resume + minute timer; daily restock). Returns a stop fn. */
export function startClock(): () => void {
  tick();
  const interval = rt.timers.setInterval(tick, 30_000);
  const offs: Unlisten[] = [];
  if (rt.listen) {
    offs.push(
      rt.listen('document', 'visibilitychange', () => (rt.hidden() ? flushSaves() : tick())),
      rt.listen('window', 'pageshow', () => tick()),
      rt.listen('window', 'focus', () => tick()),
      rt.listen('window', 'pagehide', () => flushSaves()),
    );
  }
  return () => {
    rt.timers.clearInterval(interval);
    for (const off of offs) off();
    flushSaves();
  };
}

/* ---------------- Habits ---------------- */
/** Creates a habit; throws HabitInputError (with `issues`) when the input is invalid (see validateHabitInput). */
export function createHabit(input: HabitInput): string {
  if (!writable()) throw new Error('Mochi Meadow is read-only in this window');
  return actValue((tx) => habitsDomain.createHabit(tx, input), '');
}
/** Cosmetic fields apply immediately; rule fields (schedule/target/step/tiny) append a new rule from `applyFrom`. */
export function updateHabit(id: string, patch: Partial<HabitInput>, applyFrom: RuleEditTiming = 'today'): void {
  actVoid((tx) => habitsDomain.updateHabit(tx, id, patch, applyFrom));
}
export function archiveHabit(id: string): void {
  actVoid((tx) => habitsDomain.archiveHabit(tx, id));
}
export function restoreHabit(id: string): void {
  actVoid((tx) => habitsDomain.restoreHabit(tx, id));
}
export function deleteHabit(id: string): void {
  actVoid((tx) => habitsDomain.deleteHabit(tx, id));
}
export function reorderHabits(ids: string[]): void {
  actVoid((tx) => habitsDomain.reorderHabits(tx, ids));
}
/** Pause from `start` (today or later) until `end` (inclusive, optional). */
export function pauseHabit(id: string, start: DateKey, end?: DateKey): void {
  actVoid((tx) => habitsDomain.pauseHabit(tx, id, start, end));
}
export function resumeHabit(id: string): void {
  actVoid((tx) => habitsDomain.resumeHabit(tx, id));
}
/** Move a habit's stats start earlier ("Start tracking Walk from Mon, Sep 22?"). No rewards before createdAt. */
export function setStartedOn(id: string, date: DateKey): void {
  actVoid((tx) => habitsDomain.setStartedOn(tx, id, date));
}
/** Accept "Ready to grow?" (+1★; the bigger rule applies from tomorrow). False when no offer stands. */
export function acceptGrowOffer(id: string, patch: Partial<HabitInput>): boolean {
  return actValue((tx) => habitsDomain.acceptGrowOffer(tx, id, patch), false);
}

/* ---------------- Logging ---------------- */
const NO_CHECKIN: Omit<CheckInResult, 'events'> = { coins: 0, completed: false, partial: false, rewarded: false };

/** Tap: +step toward target (day-based) or mark the day (flexible). Defaults to today. */
export function checkIn(habitId: string, date?: DateKey): CheckInResult {
  return act((tx) => logging.checkIn(tx, habitId, date ?? tx.env.today), NO_CHECKIN);
}
/** Log the tiny version for the day. */
export function checkInTiny(habitId: string, date?: DateKey): CheckInResult {
  return act((tx) => logging.checkInTiny(tx, habitId, date ?? tx.env.today), NO_CHECKIN);
}
/** −step (day-based) or un-mark (flexible). Refunds the coins if the balance allows. */
export function undoCheckIn(habitId: string, date?: DateKey): ActionResult {
  return { events: actVoid((tx) => logging.undoCheckIn(tx, habitId, date ?? tx.env.today)) };
}
export function setCount(habitId: string, date: DateKey, count: number): ActionResult {
  return { events: actVoid((tx) => logging.setCount(tx, habitId, date, count)) };
}
/** Rest day toggle (day-based habits; today, up to 14 days ahead, or within the 6-day window). */
export function toggleRest(habitId: string, date: DateKey): ActionResult {
  return { events: actVoid((tx) => logging.toggleRest(tx, habitId, date)) };
}
/** Global "Take today off" (max 4 per calendar month). */
export function toggleOffDay(date: DateKey): { ok: boolean; remaining: number } {
  const { ok, remaining } = act((tx) => logging.toggleOffDay(tx, date), { ok: false, remaining: 0 });
  return { ok, remaining };
}
export function setNote(habitId: string, date: DateKey, note: string): void {
  actVoid((tx) => logging.setNote(tx, habitId, date, note));
}
/** Calendar history edit (older than the 6-day window): toggles done/not-done, never touches rewards. */
export function editHistory(habitId: string, date: DateKey, done: boolean): void {
  actVoid((tx) => logging.editHistory(tx, habitId, date, done));
}

/* ---------------- Capsules ---------------- */
/** Everything a machine card shows: availability, lineup progress, pity countdowns, lucky meter, price. */
export function machineStatus(id: MachineId): MachineStatus {
  return machineStatusOf(state.value, today.value, id);
}

/** Pure form of machineStatus (selectors use it). */
export function machineStatusOf(s: AppState, day: DateKey, id: MachineId): MachineStatus {
  const m = getMachine(id);
  const avail = machineAvailability(id, day);
  const progress = machineProgress(s.collection, id);
  const pool = gacha.machinePool(id, s.collection);
  const pity = gacha.pityOf(s, id);
  const countdown = gacha.pityCountdown(pool, pity, s.collection);
  const secret = pool.find((p) => SECRET_IDS.has(p.id))?.id ?? pool.find((p) => p.rarity === 'ultra')?.id ?? pool[0]?.id ?? '';
  const bal = m.currency === 'coins' ? s.wallet.coins : s.wallet.stars;
  return {
    id,
    available: avail.available,
    ...(avail.activeUntil ? { activeUntil: avail.activeUntil } : {}),
    ...(avail.nextStart ? { nextStart: avail.nextStart } : {}),
    owned: progress.owned,
    total: progress.total,
    complete: progress.complete,
    rareIn: countdown.rareIn,
    ultraIn: countdown.ultraIn,
    dupStreak: pity.dupStreak,
    secretId: secret,
    canAfford: bal >= m.price,
    price: m.price,
    currency: m.currency,
  };
}
/** Machines on today (standard ones plus the season's). */
export function availableMachines(): MachineId[] {
  return availableMachineIds(today.value);
}
/** Decides the pull, commits it immediately (pendingReveal), then returns it for the reveal. */
export function pull(machineId: MachineId, opts: { useTicket?: boolean; free?: boolean } = {}): PullOutcome {
  const out = act((tx) => ({ o: gacha.pull(tx, machineId, opts) as PullOutcome }), { o: { ok: false, error: 'machine-unavailable' } as PullOutcome });
  return out.o.ok ? { ...out.o, events: out.events } : out.o;
}
/** Clear state.pendingReveal once the reveal has been shown. */
export function finishReveal(): void {
  actVoid((tx) => gacha.finishReveal(tx));
}
export function wish(itemId: string): WishOutcome {
  const out = act((tx) => ({ o: gacha.wish(tx, itemId) }), { o: { ok: false, error: 'not-wishable' } as WishOutcome });
  return out.o.ok ? { ...out.o, events: out.events } : out.o;
}
/** On a completed machine: 250 coins → 40 stardust. */
export function sparkleExchange(machineId: MachineId): ActionResult & { ok: boolean } {
  return act((tx) => gacha.sparkleExchange(tx, machineId), { ok: false });
}

/* ---------------- Pets & pantry ---------------- */
const NO_PET: Omit<PetInteractionResult, 'events'> = { xpGained: 0, level: 1, leveledUp: false, reaction: 'none' };
export function petPet(petId: string): PetInteractionResult {
  return act((tx) => friendship.petPet(tx, petId), NO_PET);
}
export function feedPet(petId: string, treatId: string): PetInteractionResult {
  return act((tx) => friendship.feedPet(tx, petId, treatId), NO_PET);
}
/** Bake 5 servings of an owned recipe for 10 coins. */
export function bakeTray(treatId: string): { ok: boolean } {
  return { ok: act((tx) => pantry.bakeTray(tx, treatId), { ok: false }).ok };
}
export function setOutfit(petId: string, slot: WearableSlot, itemId: string | null): void {
  actVoid((tx) => friendship.setOutfit(tx, petId, slot, itemId));
}
export function renamePet(petId: string, name: string): void {
  actVoid((tx) => friendship.renamePet(tx, petId, name));
}
export function toggleFavoritePet(petId: string): void {
  actVoid((tx) => friendship.toggleFavoritePet(tx, petId));
}
export function setBuddy(petId: string): void {
  actVoid((tx) => friendship.setBuddy(tx, petId));
}
export function toggleInMeadow(petId: string): void {
  actVoid((tx) => meadowDomain.toggleInMeadow(tx, petId));
}

/* ---------------- Meadow ---------------- */
export function buyZone(zone: MeadowZoneId): ZonePurchase {
  return actValue((tx) => meadowDomain.buyZone(tx, zone), { ok: false, error: 'not-enough-coins' } as ZonePurchase);
}
export function placeDecor(itemId: string, zone: MeadowZoneId, x: number, y: number): string | null {
  return actValue((tx) => meadowDomain.placeDecor(tx, itemId, zone, x, y), null);
}
export function moveDecor(placementId: string, patch: Partial<Pick<PlacedDecor, 'x' | 'y' | 'zone' | 'flip'>>): void {
  actVoid((tx) => meadowDomain.moveDecor(tx, placementId, patch));
}
export function removeDecor(placementId: string): void {
  actVoid((tx) => meadowDomain.removeDecor(tx, placementId));
}

/* ---------------- Letters, profile, settings ---------------- */
/** Marks a letter read; it stays in the Letterbox forever (DESIGN §13.10). */
export function dismissLetter(id: string): void {
  actVoid((tx) => readLetter(tx, id));
}
export function setName(name: string): void {
  actVoid((tx) => profileDomain.setName(tx, name));
}
export function setBirthday(mmdd: string | undefined): void {
  actVoid((tx) => profileDomain.setBirthday(tx, mmdd));
}
/** Settings patch (values are clamped/validated; weekStart & dayStartsAt keep `today` monotonic). */
export function updateSettings(patch: Partial<AppState['settings']>): void {
  actVoid((tx) => profileDomain.updateSettings(tx, patch as Partial<Settings>));
}
export function completeOnboarding(opts: { name: string; templateIds: string[]; dayStartsAt?: number; birthday?: string }): void {
  actVoid((tx) => habitsDomain.completeOnboarding(tx, opts));
  // §13.8: ask the browser to keep storage only once onboarded, and only in the installed app.
  if (!demoMode.value && rt.standalone()) rt.persistStorage();
  snapshotToday();
}

/* ---------------- Data ---------------- */
function backupJson(): string {
  return JSON.stringify(makeBackup(state.value, { now: rt.now(), appVersion: rt.appVersion, device: rt.device }));
}

/** Backup file contents (JSON envelope). Marks lastBackupAt. */
export function exportData(): string {
  const json = backupJson();
  actVoid((tx) => profileDomain.markBackup(tx));
  return json;
}
/** Compact clipboard payload 'MM1:' + base64url(gzip(json)) for Safari→app handoff and device moves. */
export async function exportPayload(): Promise<string> {
  const payload = await encodePayload(backupJson());
  actVoid((tx) => profileDomain.markBackup(tx));
  return payload;
}
/** Validate a backup (file text or MM1 payload) and describe it without applying. */
export async function previewImport(text: string): Promise<ImportPreview | { ok: false; error: string }> {
  const parsed = await parseBackupText(text);
  return parsed.ok ? describeBackup(parsed) : { ok: false, error: parsed.error };
}

export const UNDO_IMPORT_MS = 24 * 3_600_000;

async function snapshotCurrent(): Promise<string | null> {
  const s = state.value;
  if (!validateState(s).ok) return null;
  const ms = rt.now();
  const id = `pre-import-${ms}`;
  await snapshots().put({ ...snapshotMeta(s, 'pre-import', id, today.value, ms, rt.appVersion), state: s });
  return id;
}

/** Snapshot the current save, then replace it with the backup (never merge). Undo available for 24 h. */
export async function applyImport(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (demoMode.value) return { ok: false, error: 'demo-mode' };
  if (!writable()) return { ok: false, error: 'read-only' };
  const parsed = await parseBackupText(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const snapshotId = await snapshotCurrent().catch(() => null);
  if (snapshotId) writeJson(storage(), UNDO_IMPORT_KEY, { id: snapshotId, until: rt.now() + UNDO_IMPORT_MS });
  replaceState(parsed.state);
  return { ok: true };
}

/** Whether "Undo import" is still offered (within 24 h of an import). */
export function canUndoImport(): boolean {
  const info = readJson<{ id: string; until: number }>(storage(), UNDO_IMPORT_KEY);
  return info !== null && rt.now() < info.until;
}

export async function undoImport(): Promise<boolean> {
  const info = readJson<{ id: string; until: number }>(storage(), UNDO_IMPORT_KEY);
  if (!info || rt.now() >= info.until || demoMode.value || !writable()) return false;
  const snap = await snapshots().get(info.id);
  if (!snap || !validateState(snap.state).ok) return false;
  replaceState(snap.state);
  removeKey(storage(), UNDO_IMPORT_KEY);
  return true;
}

export async function listSnapshots(): Promise<{ id: string; savedAt: number; habits: number; checkins: number; kind: string; day: DateKey }[]> {
  const metas = await snapshots().list();
  return metas.map((m) => ({ id: m.id, savedAt: m.savedAt, habits: m.habits, checkins: m.checkins, kind: m.kind, day: m.day }));
}

/** Restores a snapshot (the current save is snapshotted first, so a restore can itself be undone). */
export async function restoreSnapshot(id: string): Promise<boolean> {
  if (demoMode.value || !writable()) return false;
  const snap = await snapshots().get(id);
  if (!snap || !validateState(snap.state).ok) return false;
  await snapshotCurrent().catch(() => null);
  replaceState(snap.state);
  return true;
}

/** Reset removes only mochi-meadow:* keys, never clear(). IndexedDB snapshots are kept as a safety net. */
export function resetAll(): void {
  queue?.dispose();
  removeNamespace(storage());
  demoMode.value = false;
  realState = null;
  lastSnapshotDay = null;
  queue = makeQueue(SAVE_KEY, 0);
  setState(createInitialState(rt.now()), rt.now());
}

let realState: AppState | null = null;

/** Opens the demo meadow in its own namespace; the real save is flushed and left untouched. */
export function enterDemo(): void {
  if (demoMode.value) return;
  queue?.flush();
  realState = state.value;
  demoMode.value = true;
  const res = loadSave(storage(), DEMO_KEY);
  switchQueue(DEMO_KEY, res.kind === 'ok' ? res.rev : 0);
  let demo: AppState;
  if (res.kind === 'ok') demo = res.state;
  else {
    const ms = rt.now();
    demo = buildDemo({ today: todayFor(realState, ms), now: ms, local: rt.local, name: realState.profile.name || 'Sam' });
  }
  demo = { ...demo, settings: { ...demo.settings, theme: realState.settings.theme, reduceMotion: realState.settings.reduceMotion } };
  replaceState(demo);
}

/** Leaves the demo: its save stays in its own namespace; the real save is reloaded untouched. */
export function exitDemo(): void {
  if (!demoMode.value) return;
  queue?.flush();
  demoMode.value = false;
  const res = loadSave(storage(), SAVE_KEY);
  switchQueue(SAVE_KEY, res.kind === 'ok' ? res.rev : 0);
  const real = res.kind === 'ok' ? res.state : (realState ?? createInitialState(rt.now()));
  realState = null;
  setState(real, rt.now());
}

/** Resets the clock guard to the device clock (diagnostics escape hatch after a mistaken far-future date). */
export function repairClock(): void {
  if (!writable()) return;
  const ms = rt.now();
  const s = state.value;
  replaceState({ ...s, clock: { ...s.clock, maxEpochMs: ms, maxDateKey: appDayKey(ms, s.settings.dayStartsAt, rt.local) } });
}

/** The local wall-clock reader the store runs on (selectors use it for hour-based views). */
export function storeLocal(): LocalTimeReader {
  return rt.local;
}

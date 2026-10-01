/**
 * Save migrations (DESIGN §11 "Persistence": migrations run on load; v1 §13.8: a save stamped with a
 * newer schema opens read-only). `decodeState` (./decode.ts) is the only caller that matters: every
 * historical source goes through it.
 *
 * - `ADDITIVE_DEFAULTS` first (inside `migrate`, at the save's own schema) repairs the omissions a real build of the save's own schema wrote,
 *   and nothing else (audit data-d6, DEC-E1). Each entry names the build that added the field; the
 *   list is exactly what the corpus in tests/fixtures/saves (every build since the first that ran,
 *   written by that build's own code) shows missing. Anything else missing is damage: the save is
 *   corrupt, falls back to `:backup`, and its bytes are kept for rescue. A new required field goes
 *   in here, with its build, in the same change that adds it to `createInitialState`.
 * - `MIGRATIONS[v]` then upgrades a state from schema v to v+1. They run in order, each on the
 *   output of the previous one, and must be pure. Schema 1 is the first shipped schema, so the table
 *   is empty today; the mechanism is exercised by tests with an injected table, and by a test-only
 *   schema-2 build (tests/unit/state/decode-schema2.test.ts) that runs the corpus through a stub.
 * - `repairDays` then (schema 1, also inside `migrate`) brings back inside the calendar a save names
 *   (`DAY_MIN`…`DAY_MAX`, src/domain/dayRange.ts) the days an earlier build let her pick outside it:
 *   "Start tracking from" before 1900, a pause or a season ending after 2999 (DEC-E1). Nothing else.
 * - The result still has to pass `validateState`; migration never hides corruption.
 */
import { isDateKey } from '@/domain/dates';
import { DAY_MAX, DAY_MIN } from '@/domain/dayRange';
import { SCHEMA_VERSION } from './types';

type Obj = Record<string, unknown>;
export type Migration = (state: Obj) => Obj;

/** v → v+1 upgrades. Add an entry and bump SCHEMA_VERSION together. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

/** A field a real build of `schema` wrote without, and the value it means when absent. */
export interface AdditiveDefault {
  /** The schema whose builds left it out (it is filled before that schema's migrations run). */
  schema: number;
  /** `section.field` (or a top-level `section`). */
  path: string;
  value: unknown;
  /** The commit that added it: builds before it wrote saves without it. */
  addedIn: string;
}

/**
 * The only omissions filled on load (DEC-E1: every shape a catkin build ever wrote). The builds
 * from f6ed7ea (the first that ran) to 57c0faa wrote settings without these three.
 */
export const ADDITIVE_DEFAULTS: readonly AdditiveDefault[] = [
  { schema: 1, path: 'settings.showCompanions', value: true, addedIn: '57c0faa' },
  { schema: 1, path: 'settings.compactToday', value: false, addedIn: '57c0faa' },
  { schema: 1, path: 'settings.quoteNotes', value: true, addedIn: '57c0faa' },
];

export type MigrateResult =
  | { ok: true; state: Obj; from: number; migrated: boolean; filled: string[]; repaired: string[] }
  | { ok: false; error: 'not-an-object' | 'no-version' | 'newer-version' | 'no-migration'; version?: number };

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Fills the allow-listed omissions of a state of `schema` (never overwriting, never changing the
 * input) and says which it filled. A section that is itself missing is not filled here: that is
 * damage, for the validator to report.
 */
export function fillAdditive(state: Obj, schema: number, defaults: readonly AdditiveDefault[] = ADDITIVE_DEFAULTS): { state: Obj; filled: string[] } {
  let out = state;
  const filled: string[] = [];
  for (const d of defaults) {
    if (d.schema !== schema) continue;
    const [section, field] = d.path.split('.') as [string, string | undefined];
    if (field === undefined) {
      if (out[section] !== undefined) continue;
      out = { ...out, [section]: structuredClone(d.value) };
    } else {
      const s = out[section];
      if (!isObj(s) || s[field] !== undefined) continue;
      out = { ...out, [section]: { ...s, [field]: structuredClone(d.value) } };
    }
    filled.push(d.path);
  }
  return { state: out, filled };
}

const beforeRange = (v: unknown): boolean => isDateKey(v) && v < DAY_MIN;
const afterRange = (v: unknown): boolean => isDateKey(v) && v > DAY_MAX;

/**
 * The days a schema-1 build let her pick outside the calendar a save names (DEC-E1; the WP-A5
 * review). Until this fix "Start tracking from…" took any day before the habit's start, and a pause's
 * "Back on…" and the editor's season end any later day, so a typo (1899, 3026) went into the save,
 * which the validator then refused whole. Each is brought back with its meaning kept, never refused:
 * - `startedOn`, and a rule's `from`, before `DAY_MIN` become `DAY_MIN` ("tracking from" is stats
 *   only; nothing can be logged that far back). A rule that then starts on the same day as a later
 *   one gives way to it (the later one is what applied there).
 * - a pause's `end` after `DAY_MAX` is dropped (a pause with no end: still paused, for as long);
 *   a pause that starts after `DAY_MAX` is dropped (it could never begin).
 * - `endsOn` after `DAY_MAX` is dropped (a season with no end date).
 * A value that isn't a day at all is left for the validator: that is damage. Never changes its input;
 * `repaired` names each path it changed.
 */
export function repairDays(state: Obj): { state: Obj; repaired: string[] } {
  const repaired: string[] = [];
  if (!Array.isArray(state.habits)) return { state, repaired };
  let changed = false;
  const habits = (state.habits as unknown[]).map((h, i) => {
    if (!isObj(h)) return h;
    const path = `habits[${i}]`;
    const next: Obj = { ...h };
    const before = repaired.length;
    if (beforeRange(h.startedOn)) {
      next.startedOn = DAY_MIN;
      repaired.push(`${path}.startedOn`);
    }
    if (Array.isArray(h.rules) && h.rules.some((r) => isObj(r) && beforeRange(r.from))) {
      const rules = (h.rules as unknown[]).map((r, j) => {
        if (!isObj(r) || !beforeRange(r.from)) return r;
        repaired.push(`${path}.rules[${j}].from`);
        return { ...r, from: DAY_MIN };
      });
      const atMin = (r: unknown): boolean => isObj(r) && r.from === DAY_MIN;
      const last = rules.map(atMin).lastIndexOf(true);
      next.rules = rules.filter((r, j) => !atMin(r) || j === last);
    }
    if (afterRange(h.endsOn)) {
      delete next.endsOn;
      repaired.push(`${path}.endsOn`);
    }
    if (Array.isArray(h.pauses) && h.pauses.some((p) => isObj(p) && (afterRange(p.start) || afterRange(p.end)))) {
      const pauses: unknown[] = [];
      (h.pauses as unknown[]).forEach((p, j) => {
        if (isObj(p) && afterRange(p.start)) return void repaired.push(`${path}.pauses[${j}]`);
        if (isObj(p) && afterRange(p.end)) {
          const open: Obj = { ...p };
          delete open.end;
          repaired.push(`${path}.pauses[${j}].end`);
          return void pauses.push(open);
        }
        pauses.push(p);
      });
      next.pauses = pauses;
    }
    if (repaired.length === before) return h;
    changed = true;
    return next;
  });
  return { state: changed ? { ...state, habits } : state, repaired };
}

/**
 * Upgrades a parsed save to the current schema: the allow-listed omissions of its own schema are
 * filled first (`filled` says which), out-of-calendar days a schema-1 build let her pick are brought
 * back (`repaired` says which), then the migrations run. Refuses saves from a newer schema
 * (the caller opens them read-only) and saves without a version. Never changes its input.
 */
export function migrate(raw: unknown, migrations: Readonly<Record<number, Migration>> = MIGRATIONS, target = SCHEMA_VERSION): MigrateResult {
  if (!isObj(raw)) return { ok: false, error: 'not-an-object' };
  const from = raw.version;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) return { ok: false, error: 'no-version' };
  if (from > target) return { ok: false, error: 'newer-version', version: from };
  const { state: complete, filled } = fillAdditive(raw, from);
  const { state: inRange, repaired } = from === 1 ? repairDays(complete) : { state: complete, repaired: [] as string[] };
  let state: Obj = inRange;
  for (let v = from; v < target; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, error: 'no-migration', version: v };
    state = { ...step(state), version: v + 1 };
  }
  return { ok: true, state, from, migrated: from !== target, filled, repaired };
}

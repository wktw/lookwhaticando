/**
 * Save migrations (DESIGN §11 "Persistence": migrations run on load; §13.8: a save stamped with a
 * newer schema opens read-only).
 *
 * - `MIGRATIONS[v]` upgrades a state from schema v to v+1. They run in order, each on the output of
 *   the previous one, and must be pure. Schema 1 is the first shipped schema, so the table is empty
 *   today; the mechanism is exercised by tests with an injected table.
 * - `fillDefaults` then repairs *additive* gaps within the current schema (a section or field added
 *   during development, e.g. an older save without `pantry`), taking defaults from a fresh state.
 *   It never overwrites a present value, so it is safe to run on every load.
 * - The result still has to pass `validateState`; migration never hides corruption.
 */
import { createInitialState } from './defaults';
import { SCHEMA_VERSION } from './types';

type Obj = Record<string, unknown>;
export type Migration = (state: Obj) => Obj;

/** v → v+1 upgrades. Add an entry and bump SCHEMA_VERSION together. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type MigrateResult =
  | { ok: true; state: Obj; from: number; migrated: boolean }
  | { ok: false; error: 'not-an-object' | 'no-version' | 'newer-version' | 'no-migration'; version?: number };

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Adds missing top-level sections and nested maps/fields from a fresh state (never overwrites). */
export function fillDefaults(state: Obj, now = 0): Obj {
  const fresh = createInitialState(now) as unknown as Obj;
  const out: Obj = { ...state };
  for (const [k, v] of Object.entries(fresh)) {
    if (out[k] === undefined) out[k] = structuredClone(v);
    else if (isObj(v) && isObj(out[k]) && k !== 'collection' && k !== 'pets' && k !== 'logs' && k !== 'badges' && k !== 'pantry' && k !== 'offDays' && k !== 'pity') {
      // Section objects with fixed fields (profile, settings, wallet, lifetime, ledger, meadow, clock).
      const section = { ...(out[k] as Obj) };
      for (const [fk, fv] of Object.entries(v)) if (section[fk] === undefined) section[fk] = structuredClone(fv);
      out[k] = section;
    }
  }
  return out;
}

/**
 * Upgrades a parsed save to the current schema. Refuses saves from a newer schema (the caller opens
 * them read-only) and saves without a version.
 */
export function migrate(raw: unknown, migrations: Readonly<Record<number, Migration>> = MIGRATIONS, target = SCHEMA_VERSION): MigrateResult {
  if (!isObj(raw)) return { ok: false, error: 'not-an-object' };
  const from = raw.version;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) return { ok: false, error: 'no-version' };
  if (from > target) return { ok: false, error: 'newer-version', version: from };
  let state: Obj = raw;
  for (let v = from; v < target; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, error: 'no-migration', version: v };
    state = { ...step(state), version: v + 1 };
  }
  return { ok: true, state: fillDefaults(state), from, migrated: from !== target };
}

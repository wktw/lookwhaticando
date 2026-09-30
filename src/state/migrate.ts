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
 * - The result still has to pass `validateState`; migration never hides corruption.
 */
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
  | { ok: true; state: Obj; from: number; migrated: boolean; filled: string[] }
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

/**
 * Upgrades a parsed save to the current schema: the allow-listed omissions of its own schema are
 * filled first (`filled` says which), then the migrations run. Refuses saves from a newer schema
 * (the caller opens them read-only) and saves without a version. Never changes its input.
 */
export function migrate(raw: unknown, migrations: Readonly<Record<number, Migration>> = MIGRATIONS, target = SCHEMA_VERSION): MigrateResult {
  if (!isObj(raw)) return { ok: false, error: 'not-an-object' };
  const from = raw.version;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) return { ok: false, error: 'no-version' };
  if (from > target) return { ok: false, error: 'newer-version', version: from };
  const { state: complete, filled } = fillAdditive(raw, from);
  let state: Obj = complete;
  for (let v = from; v < target; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, error: 'no-migration', version: v };
    state = { ...step(state), version: v + 1 };
  }
  return { ok: true, state, from, migrated: from !== target, filled };
}

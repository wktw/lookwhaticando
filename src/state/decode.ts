/**
 * The one decoder (WP-A4, INV-5): every state catkin takes in from anywhere goes through
 * `decodeState`: the main save and its `:backup`, an import, a daily copy, the copy an Undo goes
 * back to, and the live state before it is copied. So a schema bump has one place to be right in,
 * and a daily copy or an Undo from an older build is migrated like a load (P-persistence-04).
 *
 * It migrates (`migrate`: only the omissions a real build wrote are filled, `ADDITIVE_DEFAULTS`,
 * then the schema steps) and validates. Anything else missing is damage (data-d6): `corrupt`, never an empty history. A state
 * from a newer catkin is `newer`, with a presentation of it when it still reads as this schema's
 * (a newer version that only added fields), for showing it read-only, never for writing or
 * exporting it: its bytes are what a backup of it carries (FS2). Both keep what they were given
 * (`raw`), untouched. Nothing here throws or changes its input.
 */
import { SCHEMA_VERSION, type AppState } from './types';
import { migrate, type Migration } from './migrate';
import { validateState } from './validate';

/** Where a state comes from (for the result's readers; the rules are the same for all). */
export type DecodeSource = 'main' | 'backup-copy' | 'import' | 'snapshot' | 'undo' | 'current';

export type Decoded =
  | {
      kind: 'ok';
      state: AppState;
      /** The schema it was written in. */
      from: number;
      migrated: boolean;
      /** The allow-listed omissions that were filled (`settings.quoteNotes`…). */
      filled: string[];
    }
  | {
      kind: 'newer';
      version: number;
      raw: unknown;
      /** Only for the main save: the state as this schema reads it, for showing it read-only. */
      state?: AppState;
    }
  | {
      kind: 'corrupt';
      raw: unknown;
      reason: 'not-an-object' | 'no-version' | 'no-migration' | 'invalid';
      errors: string[];
    };

export interface DecodeOptions {
  /** The version its wrapper declares (an envelope's or a backup file's `v`): newer if either is. */
  declaredVersion?: unknown;
  /** For tests: a migration table and target schema other than this build's. */
  migrations?: Readonly<Record<number, Migration>>;
  target?: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const wholeVersion = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : undefined);

/** Reads `input` as a state of this build's schema (see the module comment). */
export function decodeState(input: unknown, source: DecodeSource, opts: DecodeOptions = {}): Decoded {
  const target = opts.target ?? SCHEMA_VERSION;
  const declared = wholeVersion(opts.declaredVersion);
  // A wrapper stamped with a newer schema is newer whatever its state looks like here (a newer
  // catkin may keep it in another shape): never damage, so its bytes are never started over.
  if (!isObj(input)) {
    if (declared !== undefined && declared > target) return { kind: 'newer', version: declared, raw: input };
    return { kind: 'corrupt', raw: input, reason: 'not-an-object', errors: ['state: not an object'] };
  }
  const own = wholeVersion(input.version);
  const newest = Math.max(own ?? 0, declared ?? 0);
  if (newest > target) {
    if (source !== 'main') return { kind: 'newer', version: newest, raw: input };
    const readable = validateState({ ...input, version: target });
    return readable.ok ? { kind: 'newer', version: newest, raw: input, state: readable.state } : { kind: 'newer', version: newest, raw: input };
  }
  if (own === undefined) return { kind: 'corrupt', raw: input, reason: 'no-version', errors: ['version: not a whole number'] };
  const m = migrate(input, opts.migrations, target);
  if (!m.ok) {
    if (m.error === 'newer-version') return { kind: 'newer', version: m.version ?? newest, raw: input };
    return { kind: 'corrupt', raw: input, reason: m.error === 'no-migration' ? 'no-migration' : m.error, errors: [`migration: ${m.error}`] };
  }
  const valid = validateState(m.state);
  if (!valid.ok) return { kind: 'corrupt', raw: input, reason: 'invalid', errors: valid.errors };
  return { kind: 'ok', state: valid.state, from: m.from, migrated: m.migrated, filled: m.filled };
}

/** Whether a state (the live one, before it is copied) reads as a good save of this schema. */
export function decodesAsSave(state: unknown): boolean {
  return decodeState(state, 'current').kind === 'ok';
}

/**
 * Consumer-safe validation and resource bounds (WP-A5 in docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md:
 * data-d7, FS7, FS8, P-persistence-06 and P-persistence-21). A state the validator accepts is one
 * every consumer can use: the fields they read are checked (complete letter unions, real calendar
 * values, timestamps inside a fixed ceiling), no id or map key is an `Object.prototype` name, the
 * envelope's own numbers are checked, an import is bounded before it is read or expanded, and an
 * imported clock guard is capped at when the backup was made (DEC-P14).
 *
 * Cases marked "failed before" failed against the code before WP-A5 (416f43d) on what it did; the
 * ones marked "new API" failed there only because the function, field, result or line did not
 * exist yet. Unmarked cases are guards that passed there too (see the plan's status note under WP-A5).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ERRORS } from '@/catalog/lines';
import { CLOCK_ROLLBACK_TOLERANCE_MS, isClockRolledBack } from '@/domain/dates';
import { setNote } from '@/domain/logging';
import { transact } from '@/domain/tx';
import { decodeState } from '@/state/decode';
import * as handoff from '@/state/handoff';
import { SAVE_KEY, backupKeyOf, corruptKeyOf, memoryStorage, parseEnvelope, readSave } from '@/state/persist';
import * as store from '@/state/store';
import { SCHEMA_VERSION, type AppState } from '@/state/types';
import { MAX_ITEMS, validateState } from '@/state/validate';
import { memoryShelfVM } from '@/state/views/pets';
import { importErrorText } from '@/features/you/ImportSheet';
import * as files from '@/features/you/files';
import { UTC, at } from '../domain/game';
import { fakeBrowser } from './fixtures';

vi.setConfig({ testTimeout: 30_000 });

type Obj = Record<string, unknown>;
const CORPUS = new URL('../../fixtures/saves/', import.meta.url);
const livedInRaw = (): string => readFileSync(new URL('b053e0a/main-demo.json', CORPUS), 'utf8');
const envOf = (raw: string) => JSON.parse(raw) as { v: number; rev: number; gen?: string; savedAt: number; state: Obj };
/** The lived-in sill (six habits, four pets, Sunday Notes and Herbarium pages), as written by b053e0a. */
const livedIn = (): Obj => envOf(livedInRaw()).state;
const SAVED_AT = envOf(livedInRaw()).savedAt;

const habitIds = (s: Obj) => (s.habits as Obj[]).map((h) => h.id as string);
const firstHabit = (s: Obj) => (s.habits as Obj[])[0]!;
const firstPet = (s: Obj) => Object.values(s.pets as Obj)[0] as Obj;
const weekly = (s: Obj) => (s.inbox as Obj[]).find((l) => l.kind === 'weekly')!;
const monthly = (s: Obj) => (s.inbox as Obj[]).find((l) => l.kind === 'monthly')!;

/** A Herbarium page from an older build: Monthly Bouquet stems, no pressings. */
const bouquet = (stems: unknown): Obj => ({ kind: 'monthly', id: 'bouquet-2026-07', month: '2026-07', achieved: 0, expected: 0, stars: 0, growingBonus: false, stems });

/**
 * Renames the first habit to `to` everywhere the save names it (its logs, ledger, pairings,
 * keepsake ids, letters), as JSON text, so a reserved name becomes an own key as JSON.parse makes it.
 */
function renameHabit(s: Obj, to: string): Obj {
  const from = firstHabit(s).id as string;
  return JSON.parse(JSON.stringify(s).split(from).join(to)) as Obj;
}

/** Sets an own key, as JSON.parse makes it, even under a name an object inherits. */
const setOwn = (o: Obj, k: string, value: unknown): void => void Object.defineProperty(o, k, { value, writable: true, enumerable: true, configurable: true });

/** A backup file around `state`, made at `exportedAt`. */
const backupText = (state: unknown, exportedAt: unknown = SAVED_AT): string =>
  JSON.stringify({ format: 'catkin-backup', v: 1, appVersion: 'test', exportedAt, device: 'Test · Node', state });

/** What a result said, in a word (so a failing case never prints a whole save or payload). */
const said = (r: { ok: boolean; error?: string }): string => (r.ok ? 'ok' : (r.error ?? 'error'));

afterEach(() => {
  store.configureStore({ locks: null });
});

/* ------------------------------------------------------------------ */
/* The rejection table                                                  */
/* ------------------------------------------------------------------ */

type Edit = (s: Obj) => Obj | void;
const REJECTED: [string, Edit][] = [
  // data-d7: the Monthly Bouquet's legacy stems are read with .map.
  ['stems: 7 (data-d7)', (s) => void (s.inbox as Obj[]).push(bouquet(7))],
  ['a stem that is not a stem', (s) => void (s.inbox as Obj[]).push(bouquet([{ habitId: habitIds(s)[0], plant: 'pothos', count: 'seven' }]))],
  ['a stem of 9 (stems are 0–7)', (s) => void (s.inbox as Obj[]).push(bouquet([{ habitId: habitIds(s)[0], plant: 'pothos', count: 9 }]))],
  // FS8 (R204): timestamps outside what a Date can hold, or past the fixed ceiling.
  ['profile.createdAt 1e20 (R204)', (s) => void ((s.profile as Obj).createdAt = 1e20)],
  ['a habit created at 1e20', (s) => void (firstHabit(s).createdAt = 1e20)],
  ['a pet that came home at 1e20', (s) => void (firstPet(s).obtainedAt = 1e20)],
  ['a check-in stamped at 1e20', (s) => void ((Object.values((s.logs as Obj)[habitIds(s)[0]!] as Obj)[0] as Obj).at = [1e20])],
  ['a clock guard at 1e20', (s) => void ((s.clock as Obj).maxEpochMs = 1e20)],
  ['a pin earned at 1e20', (s) => void ((s.badges as Obj)['first-sprout'] = 1e20)],
  ['a Sunday Note read at 1e20', (s) => void (weekly(s).readAt = 1e20)],
  ['a Sunday Note read at "yesterday"', (s) => void (weekly(s).readAt = 'yesterday')],
  ['a last backup at 1e20', (s) => void (s.lastBackupAt = 1e20)],
  // FS8: calendar values a consumer parses.
  ['month 2026-99 (FS8)', (s) => void (monthly(s).month = '2026-99')],
  ['month 2026-00', (s) => void (monthly(s).month = '2026-00')],
  ['birthday 02-30', (s) => void ((s.profile as Obj).birthday = '02-30')],
  ['birthday 13-01', (s) => void ((s.profile as Obj).birthday = '13-01')],
  ['a clock guard on 9999-12-31 (no day after it)', (s) => void ((s.clock as Obj).maxDateKey = '9999-12-31')],
  // (A habit started on 1000-01-01 is not here: "Start tracking from…" let her pick that day, so an
  // earlier build's save is repaired as it is read, DEC-E1; see reachable-inputs.test.ts.)
  ['a habit created on 1000-01-01 (no week before it)', (s) => void (firstHabit(s).createdOn = '1000-01-01')],
  // FS8: the Sunday Note's quote and P.S.
  ['quote {text: 7} (FS8)', (s) => void (weekly(s).quote = { habitId: habitIds(s)[0], date: '2026-08-18', text: 7 })],
  ['a quote on no day', (s) => void (weekly(s).quote = { habitId: habitIds(s)[0], date: 'Tuesday', text: 'slow start' })],
  ['a P.S. at no time of day (FS8)', (s) => void (weekly(s).ps = { kind: 'companion', petId: firstPet(s).id, habitId: habitIds(s)[0], days: 2, timeOfDay: 'teatime' })],
  ['a P.S. of an unknown kind', (s) => void (weekly(s).ps = { kind: 'postcard', petId: firstPet(s).id })],
  ['a found-thing P.S. with no day', (s) => void (weekly(s).ps = { kind: 'found', petId: firstPet(s).id, seed: 3 })],
  ['a highlight with a stage that is not a number', (s) => void (weekly(s).highlights = [{ kind: 'stageUp', habitId: habitIds(s)[0], stage: 'five', date: '2026-08-20' }])],
  ['a highlight on no day', (s) => void (weekly(s).highlights = [{ kind: 'newcomer', petId: firstPet(s).id, date: 'soon' }])],
  // data-d7: PlantLook evidence, and stacks.
  ['a look with no evidence band', (s) => void (s.plantLooks = { [habitIds(s)[0]!]: { looks: [{ colour: 'dawn', shape: 'classic', read: 'bloom', on: '2026-08-20', evidence: {} }], shown: 0, reads: { bloom: '2026-08-20' } } })],
  ['an anchor cycle', (s) => {
    const [a, b] = s.habits as Obj[];
    a!.anchorHabitId = b!.id;
    b!.anchorHabitId = a!.id;
  }],
  // FS8: numbers past what a count can be.
  ['coins past 2^53', (s) => void ((s.wallet as Obj).coins = 2 ** 60)],
  ['friendship XP 1e300', (s) => void (firstPet(s).xp = 1e300)],
  ['a count past the check-in cap', (s) => void ((Object.values((s.logs as Obj)[habitIds(s)[0]!] as Obj)[0] as Obj).count = 2_000_000)],
  // Resource bounds inside the state.
  ['a habit name of 20,000 characters', (s) => void (firstHabit(s).name = 'a'.repeat(20_000))],
  [`a habit with ${MAX_ITEMS + 1} pauses (review)`, (s) => void (firstHabit(s).pauses = Array.from({ length: MAX_ITEMS + 1 }, () => ({ start: '2026-08-01', end: '2026-08-02' })))],
  [`a collection of ${MAX_ITEMS + 1} entries (review)`, (s) => {
    const collection = s.collection as Obj;
    const more = MAX_ITEMS + 1 - Object.keys(collection).length;
    for (let i = 0; i < more; i++) collection[`decor-future-${i}`] = { count: 1, firstAt: 1 };
  }],
  // FS7: ids and keys that are Object.prototype names.
  ['a habit id __proto__ (FS7, R205)', (s) => renameHabit(s, '__proto__')],
  ['a habit id constructor', (s) => renameHabit(s, 'constructor')],
  ['a habit id toString', (s) => renameHabit(s, 'toString')],
  ['a pin key hasOwnProperty', (s) => void setOwn(s.badges as Obj, 'hasOwnProperty', 1)],
  ['a collection key __proto__', (s) => JSON.parse(JSON.stringify(s).replace('"collection":{', '"collection":{"__proto__":{"count":1,"firstAt":1},')) as Obj],
  ['a pantry key valueOf', (s) => void setOwn(s.pantry as Obj, 'valueOf', { servings: 1, restockedOn: '2026-08-20' })],
  ['a favourite treat called constructor', (s) => void (firstPet(s).favoriteTreat = 'constructor')],
  ['a reveal of an item called __proto__', (s) => void (s.pendingReveal = { machineId: 'cats', itemId: '__proto__', isNew: true, stardust: 0, fusedStars: 0, at: 1 })],
];

describe('the rejection table: accepted means a consumer can use it', () => {
  it('the lived-in sill itself is accepted (the table edits a good save)', () => {
    expect(validateState(livedIn()).ok).toBe(true);
  });

  it.each(REJECTED)('%s is rejected, without throwing (failed before)', (_name, edit) => {
    const s = livedIn();
    const next = (edit(s) as Obj | undefined) ?? s;
    expect(() => validateState(next)).not.toThrow();
    const res = validateState(next);
    expect(res.ok, res.ok ? 'accepted' : res.errors.join('; ')).toBe(false);
    // The same through the decoder every source uses, and through an import.
    expect(decodeState(next, 'import').kind).toBe('corrupt');
  });

  it.each(REJECTED.map(([name, edit]) => [name, edit] as const))('import: %s is a damaged backup, and nothing changes (failed before)', async (_name, edit) => {
    fakeBrowser();
    store.hydrate();
    const before = store.state.value;
    const s = livedIn();
    const next = (edit(s) as Obj | undefined) ?? s;
    expect(said(await handoff.parseBackupText(backupText(next)))).toBe('damaged-backup');
    expect(said(await store.applyImport(backupText(next)))).toBe('damaged-backup');
    expect(store.state.value).toBe(before);
  });

  it('data-d7: the Memory shelf of a save with stems:7 never gets built (failed before: it threw)', () => {
    const s = livedIn();
    (s.inbox as Obj[]).push(bouquet(7));
    const res = decodeState(s, 'import');
    expect(res.kind).toBe('corrupt');
    // What the validator used to let through: the selector throws on it.
    expect(() => memoryShelfVM(s as unknown as AppState)).toThrow();
  });

  it('R204: an import of createdAt 1e20 answers damaged-backup instead of throwing (failed before)', async () => {
    fakeBrowser();
    store.hydrate();
    const s = livedIn();
    (s.profile as Obj).createdAt = 1e20;
    const res = await store.applyImport(backupText(s)).catch((e: unknown) => ({ ok: false as const, error: `threw ${String(e)}` }));
    expect(said(res)).toBe('damaged-backup');
  });

  it('guards: what real saves hold stays accepted (unknown catalogue ids, generated h- ids, an older build’s Bouquet stems)', () => {
    const s = livedIn();
    firstHabit(s).icon = 'icon-from-a-later-catalogue';
    firstHabit(s).plant = 'plant-from-a-later-catalogue';
    firstPet(s).favoriteTreat = 'treat-from-a-later-catalogue';
    (s.collection as Obj)['item-from-a-later-catalogue'] = { count: 1, firstAt: 1 };
    (s.inbox as Obj[]).push(bouquet([{ habitId: habitIds(s)[0], plant: 'pothos', count: 3 }]));
    weekly(s).highlights = [{ kind: 'a-later-highlight', habitId: habitIds(s)[0] }];
    const res = validateState(s);
    expect(res.ok, res.ok ? '' : res.errors.join('; ')).toBe(true);
    expect(() => memoryShelfVM(res.ok ? res.state : (s as unknown as AppState))).not.toThrow();
  });

  it('guard: the renaming the FS7 rows use keeps a good save good with an ordinary id', () => {
    const res = validateState(renameHabit(livedIn(), 'h-renamed1'));
    expect(res.ok, res.ok ? '' : res.errors.join('; ')).toBe(true);
  });

  it('a birthday on 29 February is a real birthday', () => {
    const s = livedIn();
    (s.profile as Obj).birthday = '02-29';
    expect(validateState(s).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* FS7: own-property maps                                               */
/* ------------------------------------------------------------------ */

describe('FS7: a log write is always an own key that JSON keeps', () => {
  const env = (_s: AppState) => ({ now: at('2026-09-29', 12), today: '2026-09-29', local: UTC, rng: () => 0.5 });

  it('Tx.logs("__proto__") writes an own key, so the note survives a JSON round trip (failed before)', () => {
    const s = structuredClone(livedIn()) as unknown as AppState;
    const out = transact(s, env(s), (tx) => {
      tx.logs('__proto__')['2026-09-29'] = { kind: 'log', count: 0, note: 'kept' };
      return {};
    });
    expect(Object.prototype.hasOwnProperty.call(out.state.logs, '__proto__')).toBe(true);
    const round = JSON.parse(JSON.stringify(out.state)) as AppState;
    expect(Object.getOwnPropertyDescriptor(round.logs, '__proto__')?.value).toEqual({ '2026-09-29': { kind: 'log', count: 0, note: 'kept' } });
    // Nothing reached the prototype of the logs map, or of any object.
    expect(Object.getPrototypeOf(out.state.logs)).toBe(Object.prototype);
    expect(({} as Obj)['2026-09-29']).toBeUndefined();
  });

  it('Tx.logs("constructor") starts an empty own map instead of copying Object', () => {
    const s = structuredClone(livedIn()) as unknown as AppState;
    const out = transact(s, env(s), (tx) => ({ map: { ...tx.logs('constructor') } }));
    expect(out.map).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(out.state.logs, 'constructor')).toBe(true);
  });

  it('Tx.pet("toString") is an unknown pet, not a copy of a function (failed before)', () => {
    const s = structuredClone(livedIn()) as unknown as AppState;
    expect(() => transact(s, env(s), (tx) => (tx.pet('toString'), {}))).toThrow(/Unknown pet/);
  });

  it('setNote, then a JSON round trip, keeps every log as it was written', () => {
    const s = structuredClone(livedIn()) as unknown as AppState;
    const id = s.habits[0]!.id;
    const out = transact(s, env(s), (tx) => (setNote(tx, id, '2026-09-28', 'slow start, good walk'), {}));
    const round = JSON.parse(JSON.stringify(out.state)) as AppState;
    expect(round.logs).toEqual(out.state.logs);
    expect(round.logs[id]!['2026-09-28']!.note).toBe('slow start, good walk');
    expect(decodeState(round, 'import').kind).toBe('ok');
  });
});

/* ------------------------------------------------------------------ */
/* Envelope metadata                                                    */
/* ------------------------------------------------------------------ */

describe('FS8: the envelope’s own numbers', () => {
  it('exportedAt 1e20: not a backup, and the preview never throws (failed before)', async () => {
    fakeBrowser();
    store.hydrate();
    const text = backupText(livedIn(), 1e20);
    expect(said(await handoff.parseBackupText(text))).toBe('not-a-backup');
    const preview = await store.previewImport(text);
    expect(said(preview)).toBe('not-a-backup');
  });

  it('exportedAt -1 and "today" are not backups either (failed before)', async () => {
    expect(said(await handoff.parseBackupText(backupText(livedIn(), -1)))).toBe('not-a-backup');
    expect(said(await handoff.parseBackupText(backupText(livedIn(), 'today')))).toBe('not-a-backup');
  });

  it('a raw save envelope saved at 1e20, or at rev 1e309, is not a backup (failed before)', async () => {
    const env = envOf(livedInRaw());
    expect(said(await handoff.parseBackupText(JSON.stringify({ ...env, savedAt: 1e20 })))).toBe('not-a-backup');
    const huge = JSON.stringify(env).replace(`"rev":${env.rev}`, '"rev":1e309');
    expect(said(await handoff.parseBackupText(huge))).toBe('not-a-backup');
  });

  it('a local save at rev 1e309 is damaged: it falls back to :backup (failed before)', () => {
    const raw = livedInRaw();
    const huge = raw.replace(`"rev":${envOf(raw).rev}`, '"rev":1e309');
    expect(parseEnvelope(huge).kind).toBe('corrupt');
    const res = readSave(memoryStorage({ [SAVE_KEY]: huge, [backupKeyOf(SAVE_KEY)]: raw }), SAVE_KEY);
    expect(res.kind === 'ok' && res.fromBackup && res.damaged === huge).toBe(true);
  });

  it('a negative or fractional rev is damaged too (failed before)', () => {
    const raw = livedInRaw();
    const rev = `"rev":${envOf(raw).rev}`;
    expect(parseEnvelope(raw.replace(rev, '"rev":-3')).kind).toBe('corrupt');
    expect(parseEnvelope(raw.replace(rev, '"rev":2.5')).kind).toBe('corrupt');
    expect(parseEnvelope(raw.replace(rev, '"rev":"57"')).kind).toBe('corrupt');
  });

  it('a local save whose savedAt is not a timestamp is damaged: it falls back to :backup (review)', () => {
    const raw = livedInRaw();
    const bad = raw.replace(`"savedAt":${SAVED_AT}`, '"savedAt":1e20');
    expect(bad).not.toBe(raw);
    expect(parseEnvelope(bad)).toMatchObject({ kind: 'corrupt', errors: ['savedAt: not a timestamp'] });
    const res = readSave(memoryStorage({ [SAVE_KEY]: bad, [backupKeyOf(SAVE_KEY)]: raw }), SAVE_KEY);
    expect(res.kind === 'ok' && res.fromBackup && res.damaged === bad).toBe(true);
  });

  it('a newer catkin’s save at rev 1e309 is still newer, with no rev in its head (review)', () => {
    const raw = livedInRaw();
    const env = envOf(raw);
    const newer = JSON.stringify({ ...env, v: SCHEMA_VERSION + 1, state: { ...env.state, version: SCHEMA_VERSION + 1 } }).replace(`"rev":${env.rev}`, '"rev":1e309');
    const res = parseEnvelope(newer);
    expect(res.kind).toBe('newer');
    expect('rev' in res).toBe(false);
    // Guard: a usable rev stays in the head.
    const fine = parseEnvelope(JSON.stringify({ ...env, v: SCHEMA_VERSION + 1, state: { ...env.state, version: SCHEMA_VERSION + 1 } }));
    expect(fine.kind === 'newer' && fine.rev).toBe(env.rev);
  });

  it('guards: the corpus envelopes and a backup file keep their numbers', async () => {
    const env = parseEnvelope(livedInRaw());
    expect(env.kind === 'ok' && [env.rev, env.savedAt]).toEqual([57, SAVED_AT]);
    const parsed = await handoff.parseBackupText(backupText(livedIn()));
    expect(parsed.ok && parsed.savedAt).toBe(SAVED_AT);
  });
});

/* ------------------------------------------------------------------ */
/* P-persistence-06: resource bounds                                    */
/* ------------------------------------------------------------------ */

describe('P-persistence-06: an import is bounded before it is read or expanded', () => {
  it('new API: the limits are about 64 MB of file and 128 MB expanded', () => {
    expect(handoff.MAX_IMPORT_BYTES).toBe(64 * 1024 * 1024);
    expect(handoff.MAX_EXPANDED_BYTES).toBe(128 * 1024 * 1024);
  });

  it('new API: an oversized file is refused without being read (before, the sheet read it whole)', async () => {
    const text = vi.fn(async () => '{}');
    const file = { name: 'huge.json', size: 64 * 1024 * 1024 + 1, text } as unknown as File;
    await expect(files.readImportFile(file)).resolves.toEqual({ ok: false, error: 'too-large' });
    expect(text).not.toHaveBeenCalled();
  });

  it('new API: a file within the limit is read', async () => {
    const file = { name: 'backup.json', size: 10, text: async () => 'hello' } as unknown as File;
    await expect(files.readImportFile(file)).resolves.toEqual({ ok: true, text: 'hello' });
  });

  it('pasted text past the limit is too large, and is never parsed (failed before)', async () => {
    // 64 MB + 1 of text (the limit is checked as characters, before anything is parsed).
    const text = 'x'.repeat(64 * 1024 * 1024 + 1);
    const parse = vi.spyOn(JSON, 'parse');
    let res: unknown;
    let parses = 0;
    try {
      res = await handoff.parseBackupText(text);
      parses = parse.mock.calls.length;
    } finally {
      parse.mockRestore();
    }
    expect(said(res as { ok: boolean })).toBe('too-large');
    expect(parses).toBe(0);
  });

  it('a small CK1 payload that expands past the limit is too large, and decompression stops there (failed before)', async () => {
    // 8 MB of spaces gzip to a few KB; with a 1 MB limit it must stop early, not buffer all 8 MB.
    const bomb = await handoff.encodePayload(' '.repeat(8 * 1024 * 1024));
    expect(bomb.startsWith('CK1:')).toBe(true);
    expect(bomb.length).toBeLessThan(64 * 1024);
    expect(said(await handoff.decodePayload(bomb, { maxBytes: 1024 * 1024 }))).toBe('too-large');
    expect(said(await handoff.parseBackupText(bomb, { maxBytes: 1024 * 1024 }))).toBe('too-large');
  });

  it('a truncated CK1 payload is a damaged payload, not a throw', async () => {
    const good = await handoff.encodePayload(backupText(livedIn()));
    for (const part of [0.5, 0.9, 0.99]) {
      expect(said(await handoff.parseBackupText(good.slice(0, Math.floor(good.length * part))))).toBe('damaged-payload');
    }
  });

  it('with no override, a real bomb (200 MB of zeros in a few hundred KB) is too large on the import path (review)', async () => {
    // Compressed a megabyte at a time, so the test never holds 200 MB itself.
    const zip = new CompressionStream('gzip');
    const writer = zip.writable.getWriter();
    const out = new Response(zip.readable).arrayBuffer();
    const mb = new Uint8Array(1024 * 1024);
    for (let i = 0; i < 200; i++) await writer.write(mb);
    await writer.close();
    const bomb = 'CK1:' + Buffer.from(await out).toString('base64url');
    expect(bomb.length).toBeLessThan(handoff.MAX_IMPORT_BYTES);
    expect(bomb.length).toBeLessThan(1024 * 1024);
    fakeBrowser();
    store.hydrate();
    const before = store.state.value;
    expect(said(await store.previewImport(bomb))).toBe('too-large');
    expect(said(await store.applyImport(bomb))).toBe('too-large');
    expect(store.state.value).toBe(before);
  });

  it('decompression stops at the first chunk past MAX_EXPANDED_BYTES and cancels the stream (review)', async () => {
    // A stand-in DecompressionStream that hands out 8 MB chunks on demand (the same buffer each
    // time, so nothing here holds them): a reader that buffers to the end pulls all 1,000.
    const CHUNK = 8 * 1024 * 1024;
    const chunk = new Uint8Array(CHUNK);
    let pulls = 0;
    let cancelled = false;
    class Bomb {
      writable = new WritableStream<Uint8Array>();
      readable = new ReadableStream<Uint8Array>(
        {
          pull(c) {
            pulls++;
            if (pulls > 1000) c.close();
            else c.enqueue(chunk);
          },
          cancel() {
            cancelled = true;
          },
        },
        { highWaterMark: 0 },
      );
    }
    vi.stubGlobal('DecompressionStream', Bomb);
    try {
      expect(said(await handoff.parseBackupText('CK1:H4sIAAAAAAAA'))).toBe('too-large');
    } finally {
      vi.unstubAllGlobals();
    }
    const first = Math.floor(handoff.MAX_EXPANDED_BYTES / CHUNK) + 1; // the first chunk past the limit
    expect(cancelled).toBe(true);
    expect(pulls).toBeGreaterThanOrEqual(first);
    expect(pulls).toBeLessThanOrEqual(first + 1); // at most one read ahead
  });

  it('guards: a real CK1 backup under the limit still imports', async () => {
    const payload = await handoff.encodePayload(backupText(livedIn()));
    expect(said(await handoff.parseBackupText(payload))).toBe('ok');
  });

  it('new API: too-large has its own line (VOICE §18)', async () => {
    expect(ERRORS.tooLarge).toBe('That’s too big to be a Little by Little backup.');
    expect(importErrorText('too-large')).toBe(ERRORS.tooLarge);
    fakeBrowser();
    store.hydrate();
    expect(said(await store.applyImport('x'.repeat(64 * 1024 * 1024 + 1)))).toBe('too-large');
  });
});

/* ------------------------------------------------------------------ */
/* P-persistence-21 / DEC-P14: the imported clock guard                 */
/* ------------------------------------------------------------------ */

describe('DEC-P14: an imported clock guard is capped at when the backup was made, plus 36 hours', () => {
  /** The lived-in sill with a clock guard far ahead of its backup's date (a device whose clock ran fast). */
  function fastClock(): Obj {
    const s = livedIn();
    s.clock = { maxDateKey: '2031-06-01', maxEpochMs: Date.UTC(2031, 5, 1, 12), lastCheckinAt: Date.UTC(2031, 5, 1, 12) };
    return s;
  }

  it('the guard comes in capped, so rewards are not paused for years (failed before)', async () => {
    const parsed = await handoff.parseBackupText(backupText(fastClock()), { local: UTC });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const cap = SAVED_AT + CLOCK_ROLLBACK_TOLERANCE_MS;
    expect(parsed.state.clock.maxEpochMs).toBe(cap);
    expect(parsed.state.clock.lastCheckinAt).toBe(cap);
    // The day is capped at the backup's own day here (never ahead of it, so today never jumps forward).
    expect(parsed.state.clock.maxDateKey).toBe('2026-09-29');
    expect(isClockRolledBack(SAVED_AT, parsed.state.clock.maxEpochMs)).toBe(false);
  });

  it('after the import, today is today and rewards are paid (failed before)', async () => {
    const b = fakeBrowser({ start: '2026-09-29' });
    b.clock.now = SAVED_AT;
    store.hydrate();
    expect(said(await store.applyImport(backupText(fastClock())))).toBe('ok');
    expect(store.today.value).toBe('2026-09-29');
    expect(store.repairClock()).toEqual({ behind: false, resumesAt: null });
  });

  it('a raw save envelope is capped at its savedAt the same way (review)', async () => {
    const env = envOf(livedInRaw());
    const savedAt = SAVED_AT - 3 * 86_400_000; // three days before the backup file's time, so the cap is its own
    const parsed = await handoff.parseBackupText(JSON.stringify({ ...env, savedAt, state: fastClock() }), { local: UTC });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const cap = savedAt + CLOCK_ROLLBACK_TOLERANCE_MS;
    expect(parsed.state.clock.maxEpochMs).toBe(cap);
    expect(parsed.state.clock.lastCheckinAt).toBe(cap);
    expect(parsed.state.clock.maxDateKey).toBe('2026-09-26');
  });

  it('guards: a guard at or before the backup’s date comes in as it was', async () => {
    const s = livedIn();
    const parsed = await handoff.parseBackupText(backupText(s), { local: UTC });
    expect(parsed.ok && parsed.state.clock).toEqual(s.clock);
  });
});

/* ------------------------------------------------------------------ */
/* The local-load stage                                                 */
/* ------------------------------------------------------------------ */

describe('the local-load stage: a save these rules newly reject is visible and recoverable', () => {
  it('a main save with stems:7 opens its :backup and keeps the damaged text aside (failed before)', () => {
    const b = fakeBrowser();
    const env = envOf(livedInRaw());
    (env.state.inbox as Obj[]).push(bouquet(7));
    const bad = JSON.stringify(env);
    b.storage.setItem(SAVE_KEY, bad);
    b.storage.setItem(backupKeyOf(SAVE_KEY), livedInRaw());
    store.hydrate();
    expect(store.loadIssue.value?.kind).toBe('recovered-from-backup');
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(bad);
  });

  it('a main save with a __proto__ habit and no backup is kept byte for byte, with the damaged note (failed before)', () => {
    const b = fakeBrowser();
    const env = envOf(livedInRaw());
    const bad = JSON.stringify({ ...env, state: renameHabit(env.state, '__proto__') });
    b.storage.setItem(SAVE_KEY, bad);
    store.hydrate();
    expect(store.loadIssue.value?.kind).toBe('corrupt-save');
    expect(store.rescue.value).toEqual({ kind: 'damaged', raw: bad });
    expect(b.storage.getItem(corruptKeyOf(SAVE_KEY))).toBe(bad);
  });
});

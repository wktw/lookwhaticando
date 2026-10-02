/** The extra G2 costs must time real work and reject a deceptively fast no-op. */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { addDays } from '@/domain/dates';
import * as logging from '@/domain/logging';
import * as rollover from '@/domain/rollover';
import * as economy from '@/domain/economy';
import * as pantry from '@/domain/pantry';
import { mulberry32 } from '@/domain/rng';
import { transact, type Env } from '@/domain/tx';
import * as decoder from '@/state/decode';
import * as handoff from '@/state/handoff';
import * as validator from '@/state/validate';
import { makeBackup, MAX_IMPORT_BYTES } from '@/state/handoffCore';
import { createInitialState } from '@/state/defaults';
import type { AppState } from '@/state/types';
import { UTC, at } from '../domain/game';
import { bigSave, TODAY } from './bigsave';
import { measureMaintenance, measurePlainImport, measureMaintenanceAndImport } from '../../perf/operations';

const env: Env = { today: TODAY, now: at(TODAY, 21), local: UTC, rng: mulberry32(1) };
let dense: AppState;
let compacted: AppState;
beforeAll(() => {
  // A bounded two-habit fixture exercises the identical operations used on the final12-habit histories.
  dense = bigSave({ years: 1, habits: 2, notes: 'daily' });
  compacted = transact(dense, env, (tx) => { rollover.compactSave(tx); return {}; }).state;
  expect(validator.validateState(dense).ok).toBe(true);
  expect(validator.validateState(compacted).ok).toBe(true);
});
afterEach(() => vi.restoreAllMocks());
function clock() {
  let calls = 0;
  let active = false;
  return { now: () => { active = ++calls === 1; return calls * 10; }, active: () => active, calls: () => calls };
}
const backup = (state = compacted) => JSON.stringify(makeBackup(state, { now: env.now, appVersion: 'measurement-test', device: 'test' }));

describe('G2 maintenance samples', () => {
  it('times a real next-day open, including the provenance reconciler, with setup and guards outside the clock', () => {
    const timing = clock();
    const calls: Array<{ active: boolean; today: string }> = [];
    const prune = logging.pruneOldStamps;
    vi.spyOn(logging, 'pruneOldStamps').mockImplementation((tx) => { calls.push({ active: timing.active(), today: tx.env.today }); prune(tx); });
    const before = JSON.stringify(compacted);
    const sample = measureMaintenance(compacted, env, 'rollover', timing.now);
    expect(calls).toEqual([{ active: true, today: addDays(TODAY, 1) }]);
    expect(sample).toMatchObject({ ms: 10, mode: 'rollover', advancedTo: addDays(TODAY, 1), journalPreserved: true, stackingPreserved: true, foldedWitnesses: 1 });
    expect(sample.oldLiveDaysBefore).toBe(2);
    expect(sample.oldLiveDaysAfter).toBe(0);
    expect(timing.calls()).toBe(2);
    expect(JSON.stringify(compacted)).toBe(before);
  });

  it('times full-history compaction separately and leaves every note and stack verdict intact', () => {
    const timing = clock();
    const before = JSON.stringify(dense);
    const sample = measureMaintenance(dense, env, 'compact', timing.now);
    expect(sample).toMatchObject({ ms: 10, mode: 'compact', journalPreserved: true, stackingPreserved: true, foldedWitnesses: 1, oldLiveDaysAfter: 0 });
    expect(sample.oldLiveDaysBefore).toBeGreaterThan(400);
    expect(JSON.stringify(dense)).toBe(before);
  });

  it('rejects a same-day or omitted open instead of recording a fast rollover', () => {
    vi.spyOn(rollover, 'openDay').mockReturnValue(false);
    expect(() => measureMaintenance(compacted, env, 'rollover')).toThrow(/advance/i);
  });

  it('rejects a compaction that skips the provenance work even if its ledger changed', () => {
    vi.spyOn(logging, 'pruneOldStamps').mockImplementation(() => {});
    expect(() => measureMaintenance(dense, env, 'compact')).toThrow(/provenance/i);
  });

  it('rejects skipping ledger compaction even when provenance was reconciled', () => {
    vi.spyOn(economy, 'compactLedger').mockImplementation(() => {});
    expect(() => measureMaintenance(dense, env, 'compact')).toThrow(/ledger/i);
  });

  it('requires the actual next-morning restock rather than just updating the clock', () => {
    vi.spyOn(pantry, 'restockPantry').mockImplementation(() => {});
    expect(() => measureMaintenance(compacted, env, 'rollover')).toThrow(/restock/i);
  });

  it('rejects dropping the reversed-order verdict after stamps have gone', () => {
    const prune = logging.pruneOldStamps;
    vi.spyOn(logging, 'pruneOldStamps').mockImplementation((tx) => {
      prune(tx);
      for (const [id, logs] of Object.entries(tx.s.logs)) for (const [date, log] of Object.entries(logs)) {
        if (log.kind === 'log' && log.beforeAnchor) {
          const next = { ...log }; delete next.beforeAnchor;
          tx.logs(id)[date] = next;
        }
      }
    });
    expect(() => measureMaintenance(dense, env, 'compact')).toThrow(/fold|stack/i);
  });

  it('rejects any measurement that changes journal text', () => {
    const prune = logging.pruneOldStamps;
    vi.spyOn(logging, 'pruneOldStamps').mockImplementation((tx) => {
      prune(tx);
      const id = tx.s.habits[0]!.id;
      const day = Object.keys(tx.s.logs[id]!)[0]!;
      const log = tx.s.logs[id]![day]!;
      tx.logs(id)[day] = { ...log, note: 'Lost the original text.' };
    });
    expect(() => measureMaintenance(dense, env, 'compact')).toThrow(/journal/i);
  });
});

it('collects each real maintenance and import phase for every requested sample', async () => {
  const prune = vi.spyOn(logging, 'pruneOldStamps');
  const parse = vi.spyOn(handoff, 'parseBackupText');
  const report = await measureMaintenanceAndImport(dense, compacted, env, 2);
  expect(report.rollover).toHaveLength(2);
  expect(report.compact).toHaveLength(2);
  expect(report.pastedImport).toHaveLength(2);
  expect(prune).toHaveBeenCalledTimes(4);
  expect(parse).toHaveBeenCalledTimes(2);
  expect(report.rollover.every((sample) => sample.oldLiveDaysBefore === 2 && sample.journalPreserved)).toBe(true);
  expect(report.compact.every((sample) => sample.oldLiveDaysBefore > 400 && sample.journalPreserved)).toBe(true);
  expect(report.pastedImport.every((sample) => sample.outcome === 'accepted' && sample.journalPreserved)).toBe(true);
  expect(report.importUtf8Bytes).toBe(new TextEncoder().encode(parse.mock.calls[0]![0]).length);
});

describe('G2 pasted JSON import samples', () => {
  it('includes the actual JSON parse and shared decoder/validator inside the measured interval', async () => {
    const timing = clock();
    const text = backup();
    const stages: Array<{ stage: string; active: boolean }> = [];
    const parse = JSON.parse;
    vi.spyOn(JSON, 'parse').mockImplementation((input, reviver) => {
      if (input === text) stages.push({ stage: 'parse', active: timing.active() });
      return parse(input, reviver);
    });
    const decode = decoder.decodeState;
    vi.spyOn(decoder, 'decodeState').mockImplementation((...args) => { stages.push({ stage: 'decode', active: timing.active() }); return decode(...args); });
    const validate = validator.validateState;
    vi.spyOn(validator, 'validateState').mockImplementation((...args) => { stages.push({ stage: 'validate', active: timing.active() }); return validate(...args); });
    const sample = await measurePlainImport(text, compacted, UTC, timing.now);
    expect(stages).toEqual(expect.arrayContaining([{ stage: 'parse', active: true }, { stage: 'decode', active: true }, { stage: 'validate', active: true }]));
    expect(sample).toMatchObject({ ms: 10, outcome: 'accepted', inputCharacters: text.length, limitCharacters: MAX_IMPORT_BYTES, journalPreserved: true });
    expect(timing.calls()).toBe(2);
  });

  it('rejects a parser that substitutes an unrelated empty state', async () => {
    vi.spyOn(handoff, 'parseBackupText').mockResolvedValue({ ok: true, state: createInitialState(env.now), savedAt: env.now });
    await expect(measurePlainImport(backup(), compacted, UTC)).rejects.toThrow(/journal/i);
  });

  it('does not present a malformed otherwise-in-range backup as a valid fast import', async () => {
    const damaged = structuredClone(compacted);
    damaged.wallet.coins = -1;
    await expect(measurePlainImport(backup(damaged), compacted, UTC)).rejects.toThrow(/rejected.*damaged-backup/i);
  });

  it('records the actual pasted-text size refusal without parsing or silently trimming it', async () => {
    const text = ' '.repeat(MAX_IMPORT_BYTES + 1);
    const parse = vi.spyOn(JSON, 'parse');
    const sample = await measurePlainImport(text, compacted, UTC, clock().now);
    expect(sample).toMatchObject({ outcome: 'too-large', inputCharacters: MAX_IMPORT_BYTES + 1, limitCharacters: MAX_IMPORT_BYTES, journalPreserved: null });
    expect(parse).not.toHaveBeenCalled();
  });

  it('does not turn a different parser failure into a claimed size refusal', async () => {
    vi.spyOn(handoff, 'parseBackupText').mockResolvedValue({ ok: false, error: 'not-a-backup' });
    await expect(measurePlainImport(' '.repeat(MAX_IMPORT_BYTES + 1), compacted, UTC)).rejects.toThrow(/bound/i);
  });
});

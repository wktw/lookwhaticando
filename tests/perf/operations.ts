/** Measurement-only work for the A6/B4 costs delegated to G2. Not shipped by the app. */
import { addDays, type LocalTimeReader } from '@/domain/dates';
import { LEDGER_DAYS, ledgerKeyDate } from '@/domain/economy';
import { STAMP_DAYS } from '@/domain/logging';
import { firstCheckinAt } from '@/domain/provenance';
import { compactSave, openDay } from '@/domain/rollover';
import { mulberry32 } from '@/domain/rng';
import { keptTogetherDays } from '@/domain/stacking';
import { transact, type Env } from '@/domain/tx';
import { parseBackupText } from '@/state/handoff';
import { makeBackup, MAX_IMPORT_BYTES } from '@/state/handoffCore';
import type { AppState, DateKey } from '@/state/types';
import { validateState } from '@/state/validate';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
export function journal(s: AppState) {
  let count = 0; let characters = 0; let hash = 2166136261;
  for (const [id, logs] of Object.entries(s.logs)) for (const [day, log] of Object.entries(logs)) {
    if (!log.note) continue;
    count++; characters += log.note.length;
    const text = `${id}|${day}|${log.note}`;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return { count, characters, fingerprint: hash >>> 0 };
}
const journalKey = (s: AppState) => JSON.stringify(journal(s));
export const sameJournal = (a: AppState, b: AppState) => journalKey(a) === journalKey(b);
function oldLiveDays(s: AppState, today: DateKey) {
  const horizon = addDays(today, -STAMP_DAYS);
  return Object.values(s.logs).reduce((total, logs) => total + Object.entries(logs).filter(([day, log]) =>
    day < horizon && log.kind === 'log' && (log.at !== undefined || log.first !== undefined || log.done !== undefined)).length, 0);
}
function oldLedgerEntries(s: AppState, today: DateKey) {
  const horizon = addDays(today, -LEDGER_DAYS);
  return Object.keys(s.ledger.recent).filter((key) => ledgerKeyDate(key) < horizon).length
    + Object.keys(s.ledger.daily).filter((day) => day < horizon).length;
}

/** Fresh cloned inputs per sample. Only the real transaction is inside the timer. */
export function measureMaintenance(source: AppState, env: Env, mode: 'rollover' | 'compact', now = () => performance.now()) {
  const before = structuredClone(source);
  // Harness fixtures use UTC. Advancing the date and wall clock together prevents a same-day
  // early return; the original fixture is never modified or cumulatively aged between samples.
  const runEnv = { ...env, today: mode === 'rollover' ? addDays(env.today, 1) : env.today,
    now: env.now + (mode === 'rollover' ? 86_400_000 : 0), rng: mulberry32(1) };
  assert(before.clock.maxDateKey === env.today, 'Maintenance fixture must start on the recorded day');
  const witnessDay = addDays(runEnv.today, -STAMP_DAYS - 1);
  const followers = before.habits.filter((habit) => habit.anchorHabitId !== undefined);
  // The dense fixture originally waters every habit at the same time. Make one expiring day
  // per stacked pair observably out of order, so skipping the B4 fold cannot look fast and valid.
  for (const follower of followers) {
    const anchorTime = firstCheckinAt(before.logs[follower.anchorHabitId!]?.[witnessDay]);
    const log = before.logs[follower.id]?.[witnessDay];
    assert(anchorTime !== null && log?.kind === 'log', 'Maintenance fixture has no expiring stack witness');
    before.logs[follower.id]![witnessDay] = { ...log, at: [anchorTime - 60_000], first: anchorTime - 60_000, done: anchorTime - 60_000 };
  }
  assert(followers.length > 0 && validateState(before).ok, 'Maintenance fixture must contain valid stacked pairs');
  const beforeJournal = journalKey(before);
  const oldLiveDaysBefore = oldLiveDays(before, runEnv.today);
  assert(oldLiveDaysBefore > 0, 'Maintenance fixture has no old provenance to compact');
  const oldLedgerEntriesBefore = oldLedgerEntries(before, runEnv.today);
  assert(oldLedgerEntriesBefore > 0, 'Maintenance fixture has no old ledger entries');
  const pantryIds = Object.keys(before.pantry);
  assert(pantryIds.length > 0, 'Maintenance fixture must have owned pantry recipes');
  const togetherBefore = followers.map((follower) => keptTogetherDays(before, follower, runEnv.today));
  const start = now();
  const result = transact(before, runEnv, (tx) => {
    if (mode === 'rollover') return { advanced: openDay(tx) };
    compactSave(tx); return { advanced: false };
  });
  const ms = now() - start;
  // All semantic guards, walks and validation are outside the measured interval.
  if (mode === 'rollover') assert(result.advanced && result.state.clock.maxDateKey === runEnv.today, 'Rollover did not advance to the next app day');
  const restockedPantryEntries = pantryIds.filter((id) => result.state.pantry[id]?.restockedOn === runEnv.today && before.pantry[id]!.restockedOn < runEnv.today).length;
  if (mode === 'rollover') assert(restockedPantryEntries === pantryIds.length, 'Rollover skipped the next-morning pantry restock');
  const oldLiveDaysAfter = oldLiveDays(result.state, runEnv.today);
  assert(oldLiveDaysAfter === 0, 'Maintenance skipped old provenance reconciliation');
  const oldLedgerEntriesAfter = oldLedgerEntries(result.state, runEnv.today);
  assert(oldLedgerEntriesAfter === 0, 'Maintenance skipped old ledger compaction');
  const foldedWitnesses = followers.filter((follower) => {
    const log = result.state.logs[follower.id]?.[witnessDay];
    return log?.kind === 'log' && log.beforeAnchor === follower.anchorHabitId;
  }).length;
  assert(foldedWitnesses === followers.length, 'Maintenance lost the folded stack verdict');
  assert(followers.every((follower, i) => keptTogetherDays(result.state, follower, runEnv.today) === togetherBefore[i]), 'Maintenance changed kept-together stacking totals');
  assert(journalKey(result.state) === beforeJournal, 'Maintenance changed journal text');
  assert(validateState(result.state).ok, 'Maintenance produced an invalid save');
  return { ms, mode, advancedTo: result.state.clock.maxDateKey, witnessDay, foldedWitnesses, oldLiveDaysBefore, oldLiveDaysAfter,
    oldLedgerEntriesBefore, oldLedgerEntriesAfter, restockedPantryEntries,
    journalPreserved: true, stackingPreserved: true };
}

/** Actual plain pasted JSON path, including JSON.parse, migration, shared decoding and validation. */
export async function measurePlainImport(text: string, expected: AppState, local: LocalTimeReader, now = () => performance.now()) {
  const expectedJournal = journalKey(expected);
  const start = now();
  const parsed = await parseBackupText(text, { local });
  const ms = now() - start;
  const size = { inputCharacters: text.length, limitCharacters: MAX_IMPORT_BYTES };
  if (text.length > MAX_IMPORT_BYTES) {
    assert(!parsed.ok && parsed.error === 'too-large', 'Oversized pasted backup was not refused at the input bound');
    return { ms, ...size, outcome: 'too-large' as const, journalPreserved: null };
  }
  assert(parsed.ok, `Measured import rejected: ${parsed.ok ? '' : parsed.error}`);
  assert(journalKey(parsed.state) === expectedJournal, 'Imported journal text changed');
  return { ms, ...size, outcome: 'accepted' as const, journalPreserved: true };
}

export async function measureMaintenanceAndImport(dense: AppState, prepared: AppState, env: Env, samples: number) {
  // Backup creation/stringification is input setup, not part of the pasted-import interval.
  const text = JSON.stringify(makeBackup(prepared, { now: env.now, appVersion: 'scale-measurement', device: 'measurement harness' }));
  const rollover = []; const compact = []; const pastedImport = [];
  for (let i = 0; i < samples; i++) {
    rollover.push(measureMaintenance(prepared, env, 'rollover'));
    compact.push(measureMaintenance(dense, env, 'compact'));
    pastedImport.push(await measurePlainImport(text, prepared, env.local));
  }
  return { rollover, compact, pastedImport, importUtf8Bytes: new Blob([text]).size };
}

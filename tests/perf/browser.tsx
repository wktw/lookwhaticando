/** Production-compiled measurement entry. Never imported by the shipped app. */
import { render } from 'preact';
import { bigSave, TODAY } from '../unit/state/bigsave';
import { UTC, at } from '../unit/domain/game';
import { mulberry32 } from '@/domain/rng';
import { transact } from '@/domain/tx';
import { compactSave, openDay } from '@/domain/rollover';
import { checkIn, undoCheckIn } from '@/domain/logging';
import { setStartedOn } from '@/domain/habits';
import { streakInfo } from '@/domain/streaks';
import { trackingCtx } from '@/domain/economy';
import { encodeEnvelope, memoryStorage, SAVE_KEY } from '@/state/persist';
import { validateState } from '@/state/validate';
import type { AppState } from '@/state/types';
import { countCheckins, indexedDbSnapshotStore, memorySnapshotStore, snapshotMeta, type SnapshotKind } from '@/state/snapshots';
import { habitDetailVM } from '@/state/views/habit';
import { progressVM } from '@/state/views/progress';
import { todayVM } from '@/state/views/today';
import { memoryShelfVM } from '@/state/views/pets';
import { configureStore, hydrate, state } from '@/state/store';
import { Moments } from '@/features/habits/detail/Parts';
import { MemoryShelf } from '@/features/progress/Keepsakes';
import RitualReaderHost from '@/features/rituals/RitualReaderHost';
import { closeRitual } from '@/features/rituals/open';
import '@/styles/global.css';

const env = { today: TODAY, now: at(TODAY, 21), local: UTC, rng: mulberry32(1) };
const root = document.getElementById('scale-root')!;
const commitKey = 'scale:commit';
let prepared: AppState;
let years = 0;
const tick = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const painted = async () => { await tick(); await tick(); };
const elapsed = <T,>(fn: () => T): { ms: number; value: T } => { const start = performance.now(); const value = fn(); return { ms: performance.now() - start, value }; };
const elapsedAsync = async <T,>(fn: () => Promise<T>) => { const start = performance.now(); const value = await fn(); return { ms: performance.now() - start, value }; };
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function until(test: () => unknown) {
  const start = performance.now();
  while (!test()) { assert(performance.now() - start < 10_000, 'UI did not settle within 10 seconds (harness safety limit, not a performance budget)'); await tick(); }
}
function journal(s: AppState) {
  let count = 0; let characters = 0; let hash = 2166136261;
  for (const [id, logs] of Object.entries(s.logs)) for (const [day, log] of Object.entries(logs)) {
    if (!log.note) continue;
    count++; characters += log.note.length;
    const text = `${id}|${day}|${log.note}`;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return { count, characters, fingerprint: hash >>> 0 };
}
const sameJournal = (a: AppState, b: AppState) => JSON.stringify(journal(a)) === JSON.stringify(journal(b));

function prepare(n: number) {
  assert(n === 5 || n === 10, 'Supported fixtures are five and ten years');
  years = n;
  const dense = bigSave({ years, habits: 12, notes: 'daily' });
  prepared = transact(dense, env, (tx) => { compactSave(tx); return {}; }).state;
  assert(validateState(prepared).ok, 'Fixture must validate');
  assert(sameJournal(dense, prepared), 'Compaction changed journal text');
  const encoded = encodeEnvelope(prepared, 1, env.now, 'scale-measurement');
  configureStore({ storage: memoryStorage({ [SAVE_KEY]: encoded }), snapshots: memorySnapshotStore(), locks: null, listen: null, now: () => env.now, local: UTC, persistStorage: () => {}, afterFrame: undefined });
  hydrate();
  state.value = prepared;
  return { years, habits: prepared.habits.length, ...journal(prepared), encodedCharacters: encoded.length, encodedUtf8Bytes: new Blob([encoded]).size, utf16PayloadBytes: encoded.length * 2, checkins: countCheckins(prepared), letters: prepared.inbox.length };
}

function measureState(samples: number) {
  const progressCold: number[] = []; const progressWarm: number[] = [];
  const todayCold: number[] = []; const todayWarm: number[] = [];
  const detailCold: number[] = []; const detailWarm: number[] = [];
  const lifetimeWalk: number[] = []; const rejectedBackdate: number[] = [];
  const tap: Array<{ actionMs: number; serializeMs: number; commitMs: number; totalMs: number; outcome: string; previousKept: boolean }> = [];
  for (let i = 0; i < samples; i++) {
    // Each cold call receives fresh habit/log identities; clone cost is outside the measured phase.
    const p = structuredClone(prepared); progressCold.push(elapsed(() => progressVM(p, env)).ms); progressWarm.push(elapsed(() => progressVM(p, env)).ms);
    const t = structuredClone(prepared); todayCold.push(elapsed(() => todayVM(t, env)).ms); todayWarm.push(elapsed(() => todayVM(t, env)).ms);
    const h = structuredClone(prepared); detailCold.push(elapsed(() => habitDetailVM(h, env, h.habits[0]!.id)).ms); detailWarm.push(elapsed(() => habitDetailVM(h, env, h.habits[0]!.id)).ms);
    const w = structuredClone(prepared);
    lifetimeWalk.push(elapsed(() => w.habits.map((habit) => streakInfo(habit, w.logs[habit.id] ?? {}, trackingCtx(w, TODAY)))).ms);
    const impossible = elapsed(() => transact(w, env, (tx) => ({ changed: setStartedOn(tx, w.habits[0]!.id, '1000-01-01') })));
    assert(!impossible.value.changed && impossible.value.state === w, 'An unreasonable backdate mutated the save');
    rejectedBackdate.push(impossible.ms);

    const id = prepared.habits[0]!.id;
    const before = transact(prepared, env, (tx) => { undoCheckIn(tx, id, TODAY); return {}; }).state;
    assert(prepared.logs[id]?.[TODAY]?.count === 1 && (before.logs[id]?.[TODAY]?.count ?? 0) === 0, 'Watering sample did not begin with an undone daily check-in');
    localStorage.setItem(commitKey, 'previous durable copy');
    const begin = performance.now();
    const action = elapsed(() => transact(before, env, (tx) => { openDay(tx); checkIn(tx, id, TODAY); return {}; }).state);
    const serial = elapsed(() => encodeEnvelope(action.value, i + 2, env.now, 'scale-measurement'));
    let outcome = 'committed';
    const commit = elapsed(() => {
      try { localStorage.setItem(commitKey, serial.value); }
      catch (error) { outcome = error instanceof DOMException ? error.name : String(error); }
    });
    const totalMs = performance.now() - begin;
    // Validate outside all measured phases; a no-op must never masquerade as a fast action.
    assert(action.value !== before && action.value.logs[id]?.[TODAY]?.count === 1, 'The measured watering did not complete the daily habit');
    const kept = localStorage.getItem(commitKey);
    const previousKept = outcome === 'committed' ? kept === serial.value : kept === 'previous durable copy';
    assert(previousKept, 'Commit corrupted the previous durable value');
    assert(sameJournal(prepared, action.value), 'Watering changed journal text');
    tap.push({ actionMs: action.ms, serializeMs: serial.ms, commitMs: commit.ms, totalMs, outcome, previousKept });
    localStorage.removeItem(commitKey);
  }
  return { progressCold, progressWarm, todayCold, todayWarm, detailCold, detailWarm, lifetimeWalk, rejectedBackdate, tap };
}

async function measureSnapshots(samples: number) {
  const snapshots = indexedDbSnapshotStore();
  assert(snapshots, 'Chromium IndexedDB unavailable');
  const ids: string[] = []; const putMs: number[] = []; const listMs: number[] = [];
  try {
    // Full retention: seven daily, four weekly, and three pre-import saves.
    for (const [kind, count] of [['daily', 7], ['weekly', 4], ['pre-import', 3]] as const) for (let i = 0; i < count; i++) {
      const id = `scale-${kind}-${i}`; ids.push(id);
      const record = { ...snapshotMeta(prepared, kind as SnapshotKind, id, TODAY, env.now - i, 'scale-measurement'), state: prepared };
      putMs.push((await elapsedAsync(() => snapshots.put(record))).ms);
    }
    for (let i = 0; i < samples; i++) {
      const listed = await elapsedAsync(() => snapshots.list());
      listMs.push(listed.ms);
      assert(listed.value.length === 14 && listed.value.every((item) => !('state' in item)), 'Snapshot listing did not return fourteen metadata records');
    }
    const read = await elapsedAsync(() => snapshots.get(ids[0]!));
    assert(read.value && sameJournal(prepared, read.value.state), 'Snapshot read changed journal text');
    return { records: 14, putMs, listMs, readMs: read.ms, journalPreserved: true };
  } finally { for (const id of ids) await snapshots.remove(id); }
}

async function measureUI() {
  state.value = prepared;
  const vm = habitDetailVM(prepared, env, prepared.habits[0]!.id)!;
  const startMoments = performance.now();
  render(<div data-scale-pane style={{ height: '700px', overflow: 'auto', padding: '20px' }}><Moments vm={vm} /></div>, root);
  await painted();
  const momentsOpenMs = performance.now() - startMoments;
  const pane = root.querySelector<HTMLElement>('[data-scale-pane]')!;
  const quotes = pane.querySelectorAll('q');
  assert(quotes.length === years * 365, 'Rendered Moments lost notes');
  const oldest = quotes[quotes.length - 1]!;
  assert(oldest.textContent === vm.moments[vm.moments.length - 1]!.text, 'Oldest rendered note changed');
  const scrollStart = performance.now(); pane.scrollTop = pane.scrollHeight; await painted();
  const momentsScrollMs = performance.now() - scrollStart;
  const beforeStar = pane.scrollTop;
  const starDate = vm.moments[vm.moments.length - 1]!.date;
  const wasStarred = state.peek().logs[vm.habit.id]?.[starDate]?.starred === true;
  const star = oldest.closest('li')!.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
  const readStart = performance.now(); star.click(); await painted();
  const momentsStarMs = performance.now() - readStart;
  const isStarred = state.peek().logs[vm.habit.id]?.[starDate]?.starred === true;
  assert(isStarred !== wasStarred && star.getAttribute('aria-pressed') === String(isStarred), 'The measured star action did not change the saved note and its pressed state');
  const moments = { openMs: momentsOpenMs, scrollMs: momentsScrollMs, starMs: momentsStarMs, starChanged: isStarred !== wasStarred, notes: quotes.length, domNodes: pane.querySelectorAll('*').length, scrollPreserved: pane.scrollTop === beforeStar, reading: 'inline', filter: 'not available' };
  assert(moments.scrollPreserved && sameJournal(prepared, state.peek()), 'Starring changed scroll or journal text');
  render(null, root); await painted();

  state.value = prepared;
  const shelf = memoryShelfVM(prepared);
  const startMemory = performance.now();
  render(<div style={{ padding: '20px' }}><MemoryShelf shelf={shelf} retired={0} /><RitualReaderHost /></div>, root);
  await painted();
  const memoryOpenMs = performance.now() - startMemory;
  const row = root.querySelector<HTMLElement>('[data-memory="notes"]')!;
  const buttons = row.querySelectorAll<HTMLButtonElement>('button');
  assert(buttons.length === shelf.items.length, 'Rendered memory shelf lost letters');
  row.scrollLeft = row.scrollWidth; await painted();
  const returnScroll = row.scrollLeft;
  const button = buttons[buttons.length - 1]!; button.focus({ preventScroll: true });
  const readStartMemory = performance.now(); button.click();
  await until(() => document.querySelector('[data-state="open"] [role="dialog"]')); await painted();
  const readerMs = performance.now() - readStartMemory;
  const closeStart = performance.now(); closeRitual();
  await until(() => !document.querySelector('[data-state="open"] [role="dialog"]')); await painted();
  const memory = { openMs: memoryOpenMs, readerMs, returnMs: performance.now() - closeStart, letters: buttons.length, domNodes: row.querySelectorAll('*').length, scrollPreserved: Math.abs(row.scrollLeft - returnScroll) < 1, focusReturned: document.activeElement === button, filter: 'not available' };
  assert(memory.scrollPreserved, 'Memory shelf lost its return scroll');
  assert(memory.focusReturned, 'Memory reader did not return focus to its originating letter');
  assert(sameJournal(prepared, state.peek()), 'Reading a letter changed journal text');
  render(null, root); await painted();
  return { moments, memory };
}

const api = { prepare, measureState, measureSnapshots, measureUI };
declare global { interface Window { journalScale: typeof api } }
window.journalScale = api;

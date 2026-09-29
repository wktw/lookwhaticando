/**
 * The app store: one signal holding AppState, plus action functions.
 *
 * CONTRACT: UI code reads `state.value` / selectors (state/selectors.ts) and calls the exported
 * actions. Actions delegate to pure reducers in src/domain/*, commit the new state, persist it
 * (wallet-changing actions write immediately, others debounced), and emit GameEvents (./api.ts).
 * UI never mutates state directly.
 *
 * NOTE (foundation stub): the domain module replaces every body below with the real
 * implementation. Signatures are the contract; keep them stable (add, don't break).
 */
import { signal, computed } from '@preact/signals';
import type { AppState, DateKey, MeadowZoneId, PlacedDecor } from './types';
import type {
  CheckInResult,
  HabitInput,
  PullOutcome,
  WishOutcome,
  PetInteractionResult,
  MachineStatus,
  ImportPreview,
  ZonePurchase,
  ActionResult,
} from './api';
import type { MachineId, WearableSlot } from '@/catalog/types';
import { createInitialState } from './defaults';
import { itemsInMachine, getMachine } from '@/catalog';

export const state = signal<AppState>(createInitialState());

/** Today's app-day key (respects settings.dayStartsAt; monotonic). */
export const today = signal<DateKey>(new Date().toISOString().slice(0, 10));

/** True while running the isolated demo meadow (separate storage namespace). */
export const demoMode = signal(false);

/** True when this window lost the single-writer lock (another window owns the save). */
export const readOnly = signal<false | 'other-window' | 'newer-version' | 'storage-full'>(false);

export const wallet = computed(() => state.value.wallet);

/* ---------------- Boot ---------------- */
/** Load the persisted save (or start fresh), run migrations, acquire the writer lock, begin auto-saving. */
export function hydrate(): void {}
/** Keep `today` current (day rollover on focus/resume + minute timer; daily restock). Returns a stop fn. */
export function startClock(): () => void {
  return () => {};
}

/* ---------------- Habits ---------------- */
export function createHabit(_input: HabitInput): string {
  throw new Error('createHabit: implemented by domain module');
}
/** Cosmetic fields apply immediately; rule fields (schedule/target/step/tiny) append a new rule from `applyFrom`. */
export function updateHabit(_id: string, _patch: Partial<HabitInput>, _applyFrom: 'today' | 'next-period' = 'today'): void {}
export function archiveHabit(_id: string): void {}
export function restoreHabit(_id: string): void {}
export function deleteHabit(_id: string): void {}
export function reorderHabits(_ids: string[]): void {}
/** Pause from `start` (today or later) until `end` (inclusive, optional). */
export function pauseHabit(_id: string, _start: DateKey, _end?: DateKey): void {}
export function resumeHabit(_id: string): void {}
/** Move a habit's stats start earlier ("Start tracking Walk from Mon, Sep 22?"). No rewards before createdAt. */
export function setStartedOn(_id: string, _date: DateKey): void {}

/* ---------------- Logging ---------------- */
/** Tap: +step toward target (day-based) or mark the day (flexible). Defaults to today. */
export function checkIn(_habitId: string, _date?: DateKey): CheckInResult {
  return { events: [], coins: 0, completed: false, partial: false, rewarded: false };
}
/** Log the tiny version for the day. */
export function checkInTiny(_habitId: string, _date?: DateKey): CheckInResult {
  return { events: [], coins: 0, completed: false, partial: false, rewarded: false };
}
/** −step (day-based) or un-mark (flexible). */
export function undoCheckIn(_habitId: string, _date?: DateKey): ActionResult {
  return { events: [] };
}
export function setCount(_habitId: string, _date: DateKey, _count: number): ActionResult {
  return { events: [] };
}
/** Rest day toggle (day-based habits; today, up to 14 days ahead, or within the 6-day window). */
export function toggleRest(_habitId: string, _date: DateKey): ActionResult {
  return { events: [] };
}
/** Global "Take today off" (max 4 per calendar month). */
export function toggleOffDay(_date: DateKey): { ok: boolean; remaining: number } {
  return { ok: false, remaining: 0 };
}
export function setNote(_habitId: string, _date: DateKey, _note: string): void {}
/** Calendar history edit (older than the 6-day window): toggles done/not-done, never touches rewards. */
export function editHistory(_habitId: string, _date: DateKey, _done: boolean): void {}

/* ---------------- Capsules ---------------- */
export function machineStatus(id: MachineId): MachineStatus {
  const s = state.value;
  const items = itemsInMachine(id);
  const owned = items.filter((i) => s.collection[i.id]).length;
  const m = getMachine(id);
  const bal = m.currency === 'coins' ? s.wallet.coins : s.wallet.stars;
  const secret = items.find((i) => i.rarity === 'ultra') ?? items[0]!;
  return {
    id,
    available: true,
    owned,
    total: items.length,
    complete: owned === items.length,
    rareIn: 10,
    ultraIn: 40,
    dupStreak: 0,
    secretId: secret.id,
    canAfford: bal >= m.price,
    price: m.price,
    currency: m.currency,
  };
}
export function availableMachines(): MachineId[] {
  return ['kitty', 'moo', 'puppy', 'sakura', 'sweets', 'dreamy', 'pumpkin'];
}
/** Decides the pull, commits it immediately (pendingReveal), then returns it for the reveal. */
export function pull(_machineId: MachineId, _opts: { useTicket?: boolean; free?: boolean } = {}): PullOutcome {
  return { ok: false, error: 'machine-unavailable' };
}
/** Clear state.pendingReveal once the reveal has been shown. */
export function finishReveal(): void {}
export function wish(_itemId: string): WishOutcome {
  return { ok: false, error: 'not-enough-stars' };
}
/** On a completed machine: 250 coins → 40 stardust. */
export function sparkleExchange(_machineId: MachineId): ActionResult & { ok: boolean } {
  return { ok: false, events: [] };
}

/* ---------------- Pets & pantry ---------------- */
export function petPet(_petId: string): PetInteractionResult {
  return { events: [], xpGained: 0, level: 1, leveledUp: false, reaction: 'happy' };
}
export function feedPet(_petId: string, _treatId: string): PetInteractionResult {
  return { events: [], xpGained: 0, level: 1, leveledUp: false, reaction: 'happy' };
}
/** Bake 5 servings of an owned recipe for 10 coins. */
export function bakeTray(_treatId: string): { ok: boolean } {
  return { ok: false };
}
export function setOutfit(_petId: string, _slot: WearableSlot, _itemId: string | null): void {}
export function renamePet(_petId: string, _name: string): void {}
export function toggleFavoritePet(_petId: string): void {}
export function setBuddy(_petId: string): void {}
export function toggleInMeadow(_petId: string): void {}

/* ---------------- Meadow ---------------- */
export function buyZone(_zone: MeadowZoneId): ZonePurchase {
  return { ok: false, error: 'not-enough-coins' };
}
export function placeDecor(_itemId: string, _zone: MeadowZoneId, _x: number, _y: number): string | null {
  return null;
}
export function moveDecor(_placementId: string, _patch: Partial<Pick<PlacedDecor, 'x' | 'y' | 'zone' | 'flip'>>): void {}
export function removeDecor(_placementId: string): void {}

/* ---------------- Letters, profile, settings ---------------- */
export function dismissLetter(_id: string): void {}
export function setName(_name: string): void {}
export function setBirthday(_mmdd: string | undefined): void {}
export function updateSettings(patch: Partial<AppState['settings']>): void {
  state.value = { ...state.value, settings: { ...state.value.settings, ...patch } };
}
export function completeOnboarding(_opts: { name: string; templateIds: string[]; dayStartsAt?: number }): void {}

/* ---------------- Data ---------------- */
/** Backup file contents (JSON envelope). Marks lastBackupAt. */
export function exportData(): string {
  return JSON.stringify({ format: 'mochi-meadow-backup', v: state.value.version, exportedAt: Date.now(), state: state.value });
}
/** Compact clipboard payload 'MM1:' + base64url(gzip(json)) for Safari→app handoff and device moves. */
export async function exportPayload(): Promise<string> {
  return '';
}
/** Validate a backup (file text or MM1 payload) and describe it without applying. */
export async function previewImport(_text: string): Promise<ImportPreview | { ok: false; error: string }> {
  return { ok: false, error: 'not implemented' };
}
/** Snapshot the current save, then replace it with the backup. Undo available for 24 h. */
export async function applyImport(_text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: false, error: 'not implemented' };
}
export async function undoImport(): Promise<boolean> {
  return false;
}
export async function listSnapshots(): Promise<{ id: string; savedAt: number; habits: number; checkins: number }[]> {
  return [];
}
export async function restoreSnapshot(_id: string): Promise<boolean> {
  return false;
}
/** Reset removes only mochi-meadow:* keys, never clear(). */
export function resetAll(): void {
  state.value = createInitialState();
}
export function enterDemo(): void {}
export function exitDemo(): void {}

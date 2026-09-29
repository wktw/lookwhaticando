/**
 * The app store: one signal holding AppState, plus action functions.
 *
 * CONTRACT: UI code reads `state.value` / computed selectors and calls the exported
 * actions. Actions delegate to pure reducers in src/domain/*, commit the new state,
 * persist it, and emit GameEvents (see ./api.ts) for FX. UI never mutates state directly.
 *
 * NOTE (foundation stub): the domain module replaces the bodies below with the real
 * implementations. Signatures are the contract; keep them stable.
 */
import { signal, computed } from '@preact/signals';
import type { AppState, DateKey } from './types';
import type { CheckInResult, HabitInput, PullOutcome, WishOutcome, PetInteractionResult, MachineStatus } from './api';
import type { MachineId, WearableSlot, DecorSlot } from '@/catalog/types';
import { createInitialState } from './defaults';
import { emitGameEvents } from './events';
import { itemsInMachine, getMachine } from '@/catalog';

export const state = signal<AppState>(createInitialState());

function toKey(d: Date): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's local date key; refreshed on focus and every minute (see startClock). */
export const today = signal<DateKey>(toKey(new Date()));

export const wallet = computed(() => state.value.wallet);

function commit(next: AppState) {
  state.value = next;
}

/* ---------------- Habits ---------------- */
export function createHabit(_input: HabitInput): string {
  throw new Error('createHabit: implemented by domain module');
}
export function updateHabit(_id: string, _patch: Partial<HabitInput>): void {
  throw new Error('updateHabit: implemented by domain module');
}
export function archiveHabit(_id: string): void {}
export function restoreHabit(_id: string): void {}
export function deleteHabit(_id: string): void {}
export function reorderHabits(_ids: string[]): void {}
export function pauseHabit(_id: string): void {}
export function resumeHabit(_id: string): void {}

/* ---------------- Logging ---------------- */
/** +1 toward target (day-based) or mark the day done (flexible). Defaults to today. */
export function checkIn(_habitId: string, _date?: DateKey): CheckInResult {
  return { events: [], coins: 0, completed: false, rewarded: false };
}
/** −1 (day-based) or un-mark (flexible). */
export function undoCheckIn(_habitId: string, _date?: DateKey): void {}
export function setCount(_habitId: string, _date: DateKey, _count: number): void {}
export function toggleRest(_habitId: string, _date: DateKey): void {}

/* ---------------- Capsules ---------------- */
export function machineStatus(id: MachineId): MachineStatus {
  const s = state.value;
  const items = itemsInMachine(id);
  const owned = items.filter((i) => s.collection[i.id]).length;
  const m = getMachine(id);
  const bal = m.currency === 'coins' ? s.wallet.coins : s.wallet.stars;
  return { id, available: true, owned, total: items.length, complete: owned === items.length, rareIn: 10, ultraIn: 40, canAfford: bal >= m.price };
}

/** Stub pull (random item, pays price). Replaced by domain/gacha.ts implementation. */
export function pull(machineId: MachineId, opts: { useTicket?: boolean; free?: boolean } = {}): PullOutcome {
  const s = state.value;
  const m = getMachine(machineId);
  const items = itemsInMachine(machineId);
  const item = items[Math.floor(Math.random() * items.length)]!;
  const isNew = !s.collection[item.id];
  const wallet = { ...s.wallet };
  if (!opts.free && !opts.useTicket) {
    if (m.currency === 'coins') wallet.coins -= m.price;
    else wallet.stars -= m.price;
  }
  const collection = { ...s.collection, [item.id]: { count: (s.collection[item.id]?.count ?? 0) + 1, firstAt: Date.now() } };
  commit({ ...s, wallet, collection });
  const events = isNew ? [] : [{ type: 'stardust' as const, amount: 2, fused: 0 }];
  emitGameEvents(events);
  return { ok: true, machineId, itemId: item.id, rarity: item.rarity, isNew, stardust: isNew ? 0 : 2, fusedStars: 0, pity: { rareIn: 9, ultraIn: 39 }, paidWith: opts.free ? 'free' : opts.useTicket ? 'ticket' : m.currency, events };
}
export function wish(_itemId: string): WishOutcome {
  return { ok: false, error: 'not-enough-stars' };
}

/* ---------------- Pets ---------------- */
export function petPet(_petId: string): PetInteractionResult {
  return { events: [], xpGained: 0, level: 1, leveledUp: false, reaction: 'happy' };
}
export function feedPet(_petId: string, _treatId: string): PetInteractionResult {
  return { events: [], xpGained: 0, level: 1, leveledUp: false, reaction: 'happy' };
}
export function setOutfit(_petId: string, _slot: WearableSlot, _itemId: string | null): void {}
export function renamePet(_petId: string, _name: string): void {}
export function toggleFavoritePet(_petId: string): void {}
export function setBuddy(_petId: string): void {}
export function toggleInMeadow(_petId: string): void {}
export function setDecor(_slot: DecorSlot, _itemId: string | null): void {}

/* ---------------- Letters, profile, settings, data ---------------- */
export function dismissLetter(_id: string): void {}
export function setName(_name: string): void {}
export function updateSettings(patch: Partial<AppState['settings']>): void {
  commit({ ...state.value, settings: { ...state.value.settings, ...patch } });
}
export function completeOnboarding(_opts: { name: string; templateIds: string[] }): void {}
export function exportData(): string {
  return JSON.stringify({ v: state.value.version, savedAt: Date.now(), state: state.value });
}
export function importData(_json: string): { ok: true } | { ok: false; error: string } {
  return { ok: false, error: 'not implemented' };
}
export function resetAll(): void {
  commit(createInitialState());
}
export function loadDemo(): void {}

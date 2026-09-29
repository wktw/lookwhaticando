/**
 * Today's screen state that outlives a render: the selected day of the week strip, and the list's
 * group snapshot (DESIGN §9.1: "Order is stable, never regrouped on tap").
 *
 * The selected day is never silent and never sticky (DESIGN §5.3): it resets on rollover, after 60 s
 * or more hidden, and on leaving Today.
 */
import { signal } from '@preact/signals';
import type { AppState, DateKey, TimeOfDay } from '@/state/types';
import type { HabitCardVM, TodayVM } from '@/state/selectors';

/** The day the week strip has selected; null = today. */
export const selectedDay = signal<DateKey | null>(null);

/** How long Today may be hidden before a selected past day goes back to today. */
export const HIDDEN_RESET_MS = 60_000;

export function selectDay(date: DateKey | null, today: DateKey): void {
  selectedDay.value = date === null || date >= today ? null : date;
}

/* ------------------------------------------------------------------ */
/* The group snapshot                                                  */
/* ------------------------------------------------------------------ */

export type GroupKey = `block:${TimeOfDay}` | 'doneForPeriod' | 'thisMonth' | 'notToday';

export interface GroupSnapshot {
  key: GroupKey;
  /** Card ids in order, as they stood when the snapshot was taken. */
  ids: string[];
  /** Folded when the snapshot was taken (an earlier block all watered, or one of the rows). */
  folded: boolean;
  /** The block the wall clock was in. */
  current: boolean;
}

/** Where each habit sits on Today, taken on load and on a new day, and never on a tap. */
export function snapshotGroups(vm: Pick<TodayVM, 'blocks' | 'doneForPeriod' | 'thisMonth' | 'notToday'>): GroupSnapshot[] {
  const out: GroupSnapshot[] = vm.blocks.map((b) => ({ key: `block:${b.id}` as GroupKey, ids: b.cards.map((c) => c.id), folded: b.collapsed, current: b.current }));
  const rows: [GroupKey, HabitCardVM[]][] = [
    ['doneForPeriod', vm.doneForPeriod],
    ['thisMonth', vm.thisMonth],
    ['notToday', vm.notToday],
  ];
  for (const [key, cards] of rows) if (cards.length > 0) out.push({ key, ids: cards.map((c) => c.id), folded: true, current: false });
  return out;
}

/**
 * What the snapshot depends on: the day shown, and each habit's shape (which block it is in, its
 * rules, pauses and life). A check-in changes none of these, so tapping never regroups; adding,
 * editing, pausing or archiving a habit does.
 */
export function structureKey(s: Pick<AppState, 'habits' | 'offDays'>, date: DateKey, today: DateKey): string {
  const habits = s.habits
    .map((h) => [h.id, h.timeOfDay, h.order, h.rules.length, h.rules[h.rules.length - 1]?.from ?? '', h.pauses.length, h.pauses[h.pauses.length - 1]?.end ?? '', h.archivedOn ?? '', h.startedOn, h.anchorHabitId ?? ''].join(':'))
    .join('|');
  return `${today}#${date}#${habits}`;
}

/** Every card on the day by id, whichever group the view model has it in now. */
export function cardsById(vm: Pick<TodayVM, 'blocks' | 'doneForPeriod' | 'thisMonth' | 'notToday'>): Map<string, HabitCardVM> {
  const map = new Map<string, HabitCardVM>();
  for (const b of vm.blocks) for (const c of b.cards) map.set(c.id, c);
  for (const c of [...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday]) map.set(c.id, c);
  return map;
}

/** A card counts toward its block: watered, or resting within the allowance. */
export const cardSettled = (c: HabitCardVM): boolean => c.done || (c.rested && c.restState === 'allowed');

/**
 * The snapshot's groups with today's cards in them (a card no longer on the day drops out; a card
 * the view model has moved stays where it was). Empty groups are left out.
 */
export function liveGroups(snapshot: readonly GroupSnapshot[], byId: ReadonlyMap<string, HabitCardVM>): (GroupSnapshot & { cards: HabitCardVM[]; done: number })[] {
  return snapshot
    .map((g) => {
      const cards = g.ids.map((id) => byId.get(id)).filter((c): c is HabitCardVM => c !== undefined);
      return { ...g, cards, done: cards.filter(cardSettled).length };
    })
    .filter((g) => g.cards.length > 0);
}

/** The ids of the cards in view order (for the band, which pours on the pot of the card she tapped). */
export function orderedIds(groups: readonly { cards: readonly HabitCardVM[] }[]): string[] {
  return groups.flatMap((g) => g.cards.map((c) => c.id));
}

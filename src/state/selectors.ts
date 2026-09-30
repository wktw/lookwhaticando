/**
 * View-model selectors for the screens.
 *
 * Every view-model is a pure function of (state, view env) in ./views/* — unit-testable without a
 * store — and is exposed here as a memoised `computed` signal bound to the store:
 * - singletons: `todayView`, `progressView`, `walletView`, `capsulesView`, `wishListView`,
 *   `collectionView`, `petsView`, `shelfView`, `memoryShelfView`, `tuneView`, `badgesView`;
 * - parameterised: `selectToday(date)`, `selectHabitDetail(id)`, `selectCalendarMonth(habitId, month)`,
 *   `selectYearQuilt(year, habitId?)`, `selectSeries(machineId)`, `selectPet(id)`: each returns the
 *   same signal for the same arguments (a small LRU), so components can call them on every render.
 *
 * Views depend on the wall clock only through `clockKey` (the local hour, the time block, the
 * greeting period, the clock banner and the zone), so the 30-second clock tick doesn't recompute
 * the screens, yet they follow the local clock to the minute in any zone (audit data-d9).
 */
import { computed, type ReadonlySignal } from '@preact/signals';
import { greetingPeriod } from '@/catalog/lines';
import { zoneKey } from '@/domain/dates';
import { rewardsPaused } from '@/domain/wallet';
import type { MachineId } from '@/catalog/types';
import type { DateKey } from './types';
import { machineStatusOf, now, state, storeLocal, storeTimeZone, today } from './store';
import type { ViewEnv } from './views/common';
import { currentBlock, todayVM, type TodayVM } from './views/today';
import { habitDetailVM, habitEditorVM, type HabitDetailVM, type HabitEditorVM } from './views/habit';
import { calendarMonthVM, yearQuiltVM, type CalendarMonthVM, type YearQuiltVM } from './views/calendar';
import { progressVM, type ProgressVM } from './views/progress';
import { capsulesVM, collectionVM, seriesVM, walletVM, wishListVM, type CapsulesVM, type CollectionVM, type SeriesVM, type WalletVM, type WishListVM } from './views/capsules';
import { badgesVM, memoryShelfVM, petVM, petsVM, shelfVM, type MemoryShelfVM, type PetVM, type PetsVM, type ShelfVM } from './views/pets';
import { tuneVM, type TuneVM } from './views/season';

export * from './views/common';
export * from './views/today';
export * from './views/habit';
export * from './views/calendar';
export * from './views/progress';
export * from './views/capsules';
export * from './views/pets';
export * from './views/company';
export * from './views/season';

/**
 * The zone the device is in (`zoneKey`: its IANA name and UTC offsets). The runtime gives no event
 * for a move, so it is read again on every clock tick; it changes only when she changes zone
 * (audit P-history-04).
 */
const zone = computed(() => {
  void now.value;
  return zoneKey(storeLocal(), storeTimeZone());
});

/**
 * Everything the hour-based views read from the wall clock, as one key (audit data-d9): the local
 * hour, the time block (to the minute, with the day start), the greeting period, whether the clock
 * is behind, and the zone. It is worked out from the real local time on every tick but changes only
 * at those boundaries, about 25 times a day, so a block that starts at :30 or :45 (a fractional
 * zone, a 03:30 day start) starts on time instead of at the next UTC hour.
 */
const clockKey = computed(() => {
  const ms = now.value;
  const s = state.value;
  const t = storeLocal()(ms);
  return `${zone.value}|${t.hour}|${currentBlock(t.hour, s.settings.dayStartsAt, t.minute)}|${greetingPeriod(t.hour)}|${rewardsPaused(s, ms) ? 'behind' : 'ok'}`;
});

/** The view env for views that don't need the wall clock: new on a new day or in a new zone. */
const dayEnv = computed<ViewEnv>(() => {
  void zone.value;
  return { today: today.value, now: now.peek(), local: storeLocal(), timeZone: storeTimeZone() };
});
/** The view env for views that use the wall clock (greeting, current time block, clock banner): the real time as of the key's last change. */
const hourEnv = computed<ViewEnv>(() => {
  void clockKey.value;
  return { today: today.value, now: now.peek(), local: storeLocal(), timeZone: storeTimeZone() };
});

export const todayView: ReadonlySignal<TodayVM> = computed(() => todayVM(state.value, hourEnv.value));
export const progressView: ReadonlySignal<ProgressVM> = computed(() => progressVM(state.value, dayEnv.value));
export const walletView: ReadonlySignal<WalletVM> = computed(() => walletVM(state.value));
export const capsulesView: ReadonlySignal<CapsulesVM> = computed(() => {
  const s = state.value;
  const env = dayEnv.value;
  return capsulesVM(s, env, (id) => machineStatusOf(s, env.today, id));
});
export const wishListView: ReadonlySignal<WishListVM> = computed(() => wishListVM(state.value, dayEnv.value));
export const collectionView: ReadonlySignal<CollectionVM> = computed(() => collectionVM(state.value));
export const petsView: ReadonlySignal<PetsVM> = computed(() => petsVM(state.value));
export const shelfView: ReadonlySignal<ShelfVM> = computed(() => shelfVM(state.value));
/** The memory shelf (§9.2): Sunday Notes, Herbarium pages, anniversary notes, retired plants, seasons. */
export const memoryShelfView: ReadonlySignal<MemoryShelfVM> = computed(() => memoryShelfVM(state.value));
/** "Tune my habits" (§14.3), anytime. */
export const tuneView: ReadonlySignal<TuneVM> = computed(() => tuneVM(state.value, dayEnv.value));
export const badgesView = computed(() => badgesVM(state.value));

/** A small LRU of computed signals keyed by the selector's arguments. */
function memoSelector<A extends unknown[], T>(make: (...args: A) => ReadonlySignal<T>, limit = 24): (...args: A) => ReadonlySignal<T> {
  const cache = new Map<string, ReadonlySignal<T>>();
  return (...args: A) => {
    const key = JSON.stringify(args);
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const sig = make(...args);
    cache.set(key, sig);
    if (cache.size > limit) cache.delete(cache.keys().next().value!);
    return sig;
  };
}

/** Today for a selected day of the week strip (defaults to today). */
export const selectToday = memoSelector((date?: DateKey) => computed(() => todayVM(state.value, hourEnv.value, date)));
export const selectHabitDetail = memoSelector((id: string) => computed<HabitDetailVM | null>(() => habitDetailVM(state.value, dayEnv.value, id)));
/** The Habit Editor: an existing habit (id), or a new one (null), optionally from a template. */
export const selectHabitEditor = memoSelector((id: string | null, templateId?: string) => computed<HabitEditorVM | null>(() => habitEditorVM(state.value, dayEnv.value, id, templateId)));
export const selectCalendarMonth = memoSelector((habitId: string | null, month: string) => computed<CalendarMonthVM>(() => calendarMonthVM(state.value, dayEnv.value, habitId, month)));
export const selectYearQuilt = memoSelector((year: number, habitId: string | null = null) => computed<YearQuiltVM>(() => yearQuiltVM(state.value, dayEnv.value, year, habitId)));
export const selectSeries = memoSelector((machineId: MachineId) => computed<SeriesVM>(() => seriesVM(state.value, dayEnv.value, machineId)));
export const selectPet = memoSelector((id: string) => computed<PetVM | null>(() => petVM(state.value, dayEnv.value, id)));

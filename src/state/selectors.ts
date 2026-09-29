/**
 * View-model selectors for the screens.
 *
 * Every view-model is a pure function of (state, view env) in ./views/* — unit-testable without a
 * store — and is exposed here as a memoised `computed` signal bound to the store:
 * - singletons: `todayView`, `progressView`, `walletView`, `capsulesView`, `wishListView`,
 *   `collectionView`, `petsView`, `shelfView`, `lettersView`, `badgesView`;
 * - parameterised: `selectToday(date)`, `selectHabitDetail(id)`, `selectCalendarMonth(habitId, month)`,
 *   `selectYearQuilt(year, habitId?)`, `selectSeries(machineId)`, `selectPet(id)`: each returns the
 *   same signal for the same arguments (a small LRU), so components can call them on every render.
 *
 * Views depend on `now` only through the hour (greetings and time blocks), so the 30-second clock
 * tick doesn't recompute the screens.
 */
import { computed, type ReadonlySignal } from '@preact/signals';
import type { MachineId } from '@/catalog/types';
import type { DateKey } from './types';
import { machineStatusOf, now, state, storeLocal, today } from './store';
import type { ViewEnv } from './views/common';
import { todayVM, type TodayVM } from './views/today';
import { habitDetailVM, type HabitDetailVM } from './views/habit';
import { calendarMonthVM, yearQuiltVM, type CalendarMonthVM, type YearQuiltVM } from './views/calendar';
import { progressVM, type ProgressVM } from './views/progress';
import { capsulesVM, collectionVM, seriesVM, walletVM, wishListVM, type CapsulesVM, type CollectionVM, type SeriesVM, type WalletVM, type WishListVM } from './views/capsules';
import { badgesVM, lettersVM, petVM, petsVM, shelfVM, type LettersVM, type PetVM, type PetsVM, type ShelfVM } from './views/pets';

export * from './views/common';
export * from './views/today';
export * from './views/habit';
export * from './views/calendar';
export * from './views/progress';
export * from './views/capsules';
export * from './views/pets';

/** `now` rounded down to the hour: changes 24 times a day, not every tick. */
const hourNow = computed(() => Math.floor(now.value / 3_600_000) * 3_600_000);

/** The view env for views that don't need the wall clock (stable across ticks). */
const dayEnv = computed<ViewEnv>(() => ({ today: today.value, now: hourNow.peek(), local: storeLocal() }));
/** The view env for views that use the hour (greeting, current time block, clock banner). */
const hourEnv = computed<ViewEnv>(() => ({ today: today.value, now: hourNow.value, local: storeLocal() }));

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
export const lettersView: ReadonlySignal<LettersVM> = computed(() => lettersVM(state.value));
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
export const selectCalendarMonth = memoSelector((habitId: string | null, month: string) => computed<CalendarMonthVM>(() => calendarMonthVM(state.value, dayEnv.value, habitId, month)));
export const selectYearQuilt = memoSelector((year: number, habitId: string | null = null) => computed<YearQuiltVM>(() => yearQuiltVM(state.value, dayEnv.value, year, habitId)));
export const selectSeries = memoSelector((machineId: MachineId) => computed<SeriesVM>(() => seriesVM(state.value, dayEnv.value, machineId)));
export const selectPet = memoSelector((id: string) => computed<PetVM | null>(() => petVM(state.value, dayEnv.value, id)));

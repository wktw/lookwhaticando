/**
 * Event days (WP-B6, domain-d4 and the event-day half of P-history-04): the app day a pet came
 * home, the profile moved in and a habit was planted are kept as they were on the day, so a later
 * `dayStartsAt` change or a move to another time zone never moves a remembered date. Readers take
 * the stored day first; an older save has none, so `freezeEventDays` (run by `openDay` on every
 * open, and before a `dayStartsAt` change) works each one out once from its instant with the
 * settings and the clock the save has then, and stores it (DEC-P12f). It writes nothing when every
 * day is already stored, so it is idempotent, and a stale writer's replay is frozen the same way.
 */
import type { AppState, DateKey, PetState } from '@/state/types';
import { appDayKey, type LocalTimeReader } from './dates';
import type { Tx } from './tx';

/** The app day a pet came home. */
export function arrivalDay(s: Pick<AppState, 'settings'>, pet: Pick<PetState, 'obtainedAt' | 'arrivedOn'>, local: LocalTimeReader): DateKey {
  return pet.arrivedOn ?? appDayKey(pet.obtainedAt, s.settings.dayStartsAt, local);
}

/** The profile's first app day (moving in; the Memories rule's reference point). */
export function movedInOn(s: Pick<AppState, 'profile' | 'settings'>, local: LocalTimeReader): DateKey {
  return s.profile.createdOn ?? appDayKey(s.profile.createdAt, s.settings.dayStartsAt, local);
}

/**
 * Stores every event day an older save does not have yet (pets' arrival days, habits' creation
 * days and, once onboarded, the moving-in day), from the instants, with the current settings.
 */
export function freezeEventDays(tx: Tx): void {
  const s = tx.s;
  const { dayStartsAt } = s.settings;
  for (const p of Object.values(s.pets)) if (p.arrivedOn === undefined) tx.pet(p.id).arrivedOn = appDayKey(p.obtainedAt, dayStartsAt, tx.env.local);
  for (const h of s.habits) if (h.createdOn === undefined) tx.habit(h.id).createdOn = appDayKey(h.createdAt, dayStartsAt, tx.env.local);
  if (s.profile.createdOn === undefined) tx.section('profile').createdOn = appDayKey(s.profile.createdAt, dayStartsAt, tx.env.local);
}

/**
 * One shape for every in-app hand-off (WP-C7, P-ui-19's in-app subset): where to go, for which
 * thing, on which day, to do what. A hand-off lands in a state she can act on, with focus there,
 * instead of changing the route and leaving the rest to her (integration-i6, domain-w2-d2).
 *
 * - `today`: Today on `date` (a day on the week strip), with focus on `entityId`'s ring for that
 *   day. It closes Habit Detail first, since that is where the hand-off starts; there is no rule that
 *   a route change closes sheets.
 * - `pet`: the Pet Card of `entityId`, on the part `intent` names (the plant chooser, the Feed row).
 * - `shelf`: the Shelf; with `intent: 'place'`, in edit mode with `entityId` (decor) ready in the tray.
 *
 * Widgets and App Intents (RM-5) extend this shape with the save's `gen`, the occurrence date and a
 * command id, so that a command delivered twice or to another save does nothing.
 */
import type { DateKey } from '@/state/types';
import { today } from '@/state/store';
import { closeHabitDetail, openPetCard, type PetIntent } from '@/features/habits/open';
import { selectDay, todayFocus } from '@/features/today/state';
import { PLACE_SEGMENT, navigate } from './router';

export type HandOff =
  | { target: 'today'; entityId?: string; date?: DateKey; intent?: undefined }
  | { target: 'pet'; entityId: string; date?: undefined; intent?: PetIntent }
  | { target: 'shelf'; entityId?: string; date?: undefined; intent?: 'place' };

export function handOff(cmd: HandOff): void {
  switch (cmd.target) {
    case 'today': {
      closeHabitDetail();
      const day = today.peek();
      selectDay(cmd.date ?? null, day);
      todayFocus.value = cmd.entityId ? { habitId: cmd.entityId, date: cmd.date && cmd.date < day ? cmd.date : day } : null;
      navigate('today');
      return;
    }
    case 'pet':
      openPetCard(cmd.entityId, cmd.intent ? { intent: cmd.intent } : {});
      return;
    case 'shelf':
      navigate('shelf', cmd.intent === 'place' && cmd.entityId ? [PLACE_SEGMENT, cmd.entityId] : []);
      return;
  }
}

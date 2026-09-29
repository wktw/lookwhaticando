/**
 * The few words Today needs that the copy deck has no constant for yet: control names and
 * screen-reader labels, in the deck's voice (DESIGN §9.1 names the ⋯ menu's items). Everything a
 * person reads as copy comes from src/catalog/lines.ts via format.ts; see NOTES-w2-today.md for the
 * request to move these into lines.ts.
 */
import { SETTINGS } from '@/catalog/lines';

/** "Save" (the Habit Editor's button), for the Season Review's changed chips. */
export const SETTINGS_SAVE = SETTINGS.editor.save;

/** The Season Review's ask once the new season is under way (the deck's ask says "starts today"). */
export const SEASON_ASK_LATER = '{Season} is here. How should each habit go on?';

export const TODAY_COPY = {
  /** The day's progressbar name. */
  today: 'Today',
  whatCanIGet: 'What can I get?',
  /** The week strip. */
  week: 'The last 7 days',
  /** The ⋯ menu (DESIGN §9.1): Tiny version · Rest day · Add note · Details · Edit. */
  more: 'More for {habit}',
  menu: { tiny: 'Tiny version', howMany: 'How many…', rest: 'Rest day', note: 'Add a note', editNote: 'Edit the note', details: 'Details', edit: 'Edit' },
  /** A count habit's inline stepper and number pad. */
  howMany: 'How many for {habit}',
  pad: { done: 'Done', tiny: 'Tiny version' },
  /** Folded rows open and close. */
  show: 'Show',
  addHabit: 'Add a habit',
  /** The note field's sheet title. */
  noteTitle: 'A note for {habit}',
  /** Letters and stories on the sill. */
  open: 'Open',
  read: 'Read it',
  close: 'Close',
  putAway: 'Put it on the shelf',
  /** After a letter is put away: where it went (the Progress tab's Memory shelf). */
  filed: 'It’s on the {shelf} now, in Progress.',
  toCapsules: 'Go to Capsules',
  /** The Keeping Company offer's habit chips. */
  pickPlant: 'Pick a plant for {name}',
} as const;

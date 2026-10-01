/**
 * The calendar a save may name (WP-A5): every day a save holds lies between `DAY_MIN` and `DAY_MAX`,
 * a century inside the years `formatDateKey` knows (1000–9999) either way, so any consumer can step
 * a day, a week or a year from a day it holds without leaving the calendar. The validator refuses a
 * day outside it (src/state/validate.ts); every action that takes a day she picks refuses one too,
 * so the app never writes a save it can't read back (the converse of INV-6). Neither end is based
 * on now.
 */
export const DAY_MIN = '1900-01-01';
export const DAY_MAX = '2999-12-31';

/** True for a DateKey inside the calendar a save may name (compare as text: DateKeys sort as days). */
export const inDayRange = (day: string): boolean => day >= DAY_MIN && day <= DAY_MAX;

/**
 * The You screen's and onboarding's own words (section names, a few button labels, the About
 * pages): in lines.ts (VOICE §24), re-exported here. Everything else comes from `@/catalog/lines`
 * (SETTINGS, DATA, REMINDERS, INSTALL, ERRORS, EMPTY, ONBOARDING…).
 */
import { fillLine } from '@/catalog/lines';
import { YOU_UI as YOU, HABITS_COPY, PREFS_COPY, DATA_COPY, ABOUT_COPY, DIAG_COPY, ONBOARDING_COPY } from '@/catalog/lines';

/** The chrome words live in lines.ts (VOICE.md §24); re-exported for this feature's modules. */
export { YOU, HABITS_COPY, PREFS_COPY, DATA_COPY, ABOUT_COPY, DIAG_COPY, ONBOARDING_COPY };

/** "{habit}, 2 of 5." */
export const movedLine = (habit: string, pos: number, count: number) => fillLine(HABITS_COPY.moved, { habit, pos, count });

/**
 * Today's chrome (control names and screen-reader labels, DESIGN §9.1): `TODAY_COPY` and
 * `SEASON_ASK_LATER` live in lines.ts (VOICE §24) and are re-exported here.
 */
import { SEASON_ASK_LATER, SETTINGS, TODAY_COPY } from '@/catalog/lines';

/** The chrome words live in lines.ts (VOICE.md §24); re-exported for this feature's modules. */
export { SEASON_ASK_LATER, TODAY_COPY };

/** "Save" (the Habit Editor's button), for the Season Review's changed chips. */
export const SETTINGS_SAVE = SETTINGS.editor.save;


/**
 * The room's two shade inks and two contact inks (DESIGN §10.4), spelled once for every art module. They are the
 * values of `--shade` and `--contact` in tokens.css by day and in Lamplight (a unit test keeps them equal), so a
 * cabinet's crescent, a pet's and a plant's are the same lavender by day and the same indigo under the lamp.
 *
 * Art inside a themed page uses `var(--shade)` / `var(--contact)`; art that must look right whatever the page theme
 * (night art in the gallery, a scene with its own tokens) uses these.
 */
export const SHADE_DAY = 'rgba(94, 76, 154, 0.16)';
export const SHADE_LAMP = 'rgba(10, 8, 22, 0.3)';
export const CONTACT_DAY = 'rgba(59, 50, 54, 0.08)';
export const CONTACT_LAMP = 'rgba(0, 0, 0, 0.22)';

/**
 * White subjects (a snowman, an Odd-eyed White's coat) need a firmer crescent to keep an edge on the cream card: the
 * same lavender at 0.24 instead of 0.16 (the M1 art audit). In Lamplight the plain lamp shade already reads.
 */
export const SHADE_WHITE_DAY = 'rgba(94, 76, 154, 0.24)';

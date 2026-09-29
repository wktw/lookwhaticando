/**
 * Legacy drawing constants, kept because other art modules still import them while they are
 * restyled. The catkin pet art itself draws no outlines (DESIGN §10.4); see rig.ts.
 */

export const VIEWBOX = '0 0 100 100';
/** @deprecated catkin art has no outlines. Warm graphite ink. */
export const OUTLINE = '#5A3E45';
/** @deprecated catkin art has no outlines. */
export const STROKE = 2.4;
/** @deprecated use BLUSH from palette.ts. */
export const BLUSH = '#FF9FB8';
/** @deprecated use INK from palette.ts. */
export const EYE = '#4A3540';

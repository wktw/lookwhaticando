import type { JSX } from 'preact';

/** Draws an item on a 100×100 canvas (no <svg> wrapper). */
export type ItemRenderer = () => JSX.Element;

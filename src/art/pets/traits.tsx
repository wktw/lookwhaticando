import type { TraitArt, TraitId } from './types';
import { OUTLINE, STROKE } from './geometry';

const LEAF = '#9CCB86';
const LEAF_DARK = '#6FA35C';

/** Mochi's sprout: a short stem with two round leaves, growing from the top of the head. */
const sprout: TraitArt = {
  front: () => (
    <g class="pet-sprout" stroke={OUTLINE} stroke-width={STROKE * 0.85} stroke-linejoin="round" stroke-linecap="round">
      <path d="M50 29.5 C50 25 50.6 21.5 51.6 18.5" fill="none" />
      <path d="M51.3 19.5 C47 13.5 40 13.2 37.2 16.8 C41 21.5 47.2 22.4 51.3 19.5 Z" fill={LEAF} />
      <path d="M51.6 18.8 C54.6 12.2 61.8 10.8 65 14 C61.8 19.4 55.8 21 51.6 18.8 Z" fill={LEAF} />
      <path d="M49 18.4 C45.8 17.2 43 16.8 40.6 17" fill="none" stroke={LEAF_DARK} stroke-width={1.2} />
      <path d="M53.6 17.2 C56.4 15.6 59 14.8 61.6 14.6" fill="none" stroke={LEAF_DARK} stroke-width={1.2} />
    </g>
  ),
};

export const TRAITS: Partial<Record<TraitId, TraitArt>> = {
  sprout,
};

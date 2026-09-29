/**
 * Plant & pot art (habits-as-plants, DESIGN §5.5). STUB: the garden module replaces this
 * with parametric plants for every PlantSpeciesId at all 8 stages, and every PotId.
 */
import type { JSX } from 'preact';
import type { PlantSpeciesId, PotId } from '@/catalog/types';

export interface PlantArtProps {
  species: PlantSpeciesId;
  /** 0 Seed … 7 Evergreen */
  stage: number;
  pot: PotId;
  size?: number | string;
  /** Gentle idle sway. */
  animated?: boolean;
  /** Plays a one-shot "watered" wiggle when this number changes. */
  pulse?: number;
  title?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export const PLANT_STAGE_NAMES = ['Seed', 'Sprout', 'Seedling', 'Leafy', 'Budding', 'Blooming', 'Flourishing', 'Evergreen'] as const;

export function PlantArt({ size = 64, stage, title }: PlantArtProps) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M28 62 L72 62 L66 92 L34 92 Z" fill="#E9A07A" stroke="#5A3E45" stroke-width={2.4} stroke-linejoin="round" />
      {stage > 0 && <path d={`M50 62 L50 ${60 - stage * 5}`} stroke="#6FA35C" stroke-width={3} stroke-linecap="round" />}
    </svg>
  );
}

/** Standalone pot icon (collection book). */
export function PotArt({ size = 64 }: { pot: PotId; size?: number | string }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} aria-hidden>
      <path d="M24 48 L76 48 L68 88 L32 88 Z" fill="#E9A07A" stroke="#5A3E45" stroke-width={2.4} stroke-linejoin="round" />
    </svg>
  );
}

/** Registries used by the coverage test; the garden module fills these. */
export const PLANT_SPECIES_WITH_ART: ReadonlySet<PlantSpeciesId> = new Set();
export const POTS_WITH_ART: ReadonlySet<PotId> = new Set();

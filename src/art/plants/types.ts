import type { JSX } from 'preact';

/** One moment in a plant's life, as handed to species renderers. */
export interface Growth {
  /** 0 Seed … 7 Evergreen. */
  stage: number;
  /** 0..1 within the stage. */
  progress: number;
  /** Continuous growth: stage + progress (0..8). Handy for sizes that should never jump. */
  t: number;
  /** Extra flowers/fruit after Evergreen (0..6); always 0 below Evergreen. */
  blooms: number;
}

/**
 * A plant is drawn in three layers around the pot:
 * `back` is tucked into the soil (stems vanish under the soil mound and behind the rim),
 * `ground` lies on the soil and tucks behind the rim (moss, clover),
 * `front` spills over the rim (rosettes, fruit hanging over the edge).
 */
export interface PlantLayers {
  back?: JSX.Element | null;
  ground?: JSX.Element | null;
  front?: JSX.Element | null;
}

export interface PlantSpeciesArt {
  /** Draws stages 1 (Sprout) … 7 (Evergreen). Stage 0 (Seed) is shared. */
  render: (g: Growth) => PlantLayers;
  /** Seed coat color for stage 0. */
  seed: string;
  /** Optional stripes on the seed coat (sunflower seeds). */
  seedStripes?: string;
}

export interface PotArtDef {
  /** Draws the whole pot (body, rim, decorations). `uid` scopes clip paths; `sw` is the outline width. */
  render: (uid: string, sw: number) => JSX.Element;
  /** Where the Evergreen gold bow is tied (clear of any face); the golden watering can dangles from it. */
  charm: { x: number; y: number };
  /** The Evergreen gold ribbon band wrapped around the pot body (pots without a face). */
  ribbon?: string;
}

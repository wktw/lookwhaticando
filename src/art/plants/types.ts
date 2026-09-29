import type { JSX } from 'preact';
import type { PotId } from '@/catalog/types';
import type { Pt } from './geom';
import type { Kit } from './kit';

/** One moment in a plant's life, as handed to species renderers. */
export interface Growth {
  /** 0 Cutting … 7 Evergreen. */
  stage: number;
  /** 0..1 within the stage. */
  progress: number;
  /** Continuous growth: stage + progress (0..8). Sizes follow it, so nothing ever jumps or shrinks. */
  t: number;
  /** Flowers, berries or the species' peak feature showing (0..MAX_BLOOMS); always 0 before Blooming. */
  blooms: number;
}

/** Where a potted plant stands: the soil line at the pot's mouth, and the opening's half-width. */
export interface Mouth {
  y: number;
  hw: number;
}

/**
 * A plant is drawn in two layers around its pot: `back` stands in the soil behind the rim (stems vanish into the
 * soil), `front` spills over the rim (trailing vines, leaves and fruit hanging over the edge).
 */
export interface PlantLayers {
  back?: JSX.Element | null;
  front?: JSX.Element | null;
}

/** A cutting standing in a water glass (stages 0 and 1). */
export interface CuttingArt {
  /** Colour and width of the stem below the waterline, which the glass draws refracted. */
  stem: { color: string; w: number };
  /** Draws the part under water instead of a plain stem (a leaf cutting is a broad blade, not a stem). */
  below?: (k: Kit, x: number, water: number, node: number) => JSX.Element;
  /** The cutting above the waterline, its stem rising from `base`. */
  draw: (g: Growth, k: Kit, base: Pt) => JSX.Element;
}

/** Everything one drawing puts on the canvas, in paint order around its vessel. */
export interface Composed {
  /** Sways with the plant, behind the vessel. */
  back?: JSX.Element | null;
  /** The pot, glass or tray: never moves. */
  vessel: JSX.Element;
  /** Sways with the plant, in front of the vessel. */
  front?: JSX.Element | null;
  /** Half-width of the vessel's foot, for the contact shadow. */
  foot: number;
  /** Where the plant pivots when it sways or lifts, and where the watering glint shows. */
  pivot: Pt;
  /** Half-width of the soil or water surface at the pivot (for the glint). */
  surface: number;
  kind: 'pot' | 'glass' | 'dish' | 'forcing';
}

export interface SpeciesArt {
  /** Stages 0–1 as a cutting in a water glass. */
  cutting?: CuttingArt;
  /** Stages 0–1 drawn some other way (cat grass germinating in a glass dish). */
  start?: (g: Growth, k: Kit) => Composed;
  /** Stages 2 (Potted) … 7 (Evergreen), standing in soil at `m`. */
  potted?: (g: Growth, k: Kit, m: Mouth) => PlantLayers;
  /** The whole life in its own vessel (a tulip in a forcing glass); the pot choice only tints it. */
  own?: (g: Growth, k: Kit, pot: PotId) => Composed;
}

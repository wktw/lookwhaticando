import type { JSX } from 'preact';
import type { Species } from '@/catalog/types';
import type { MarkId, PetLook, Pose, TraitId } from '../types';
import type { Tones } from '../palette';
import type { FaceCtx } from '../face';
import type { LitKey, PoseRig, ShadeKey, SpeciesRig } from '../rig';

/** Everything a species renderer needs for one drawing. */
export interface DrawCtx {
  uid: string;
  rigId: string;
  rig: SpeciesRig;
  pose: Pose;
  p: PoseRig;
  look: PetLook;
  tones: Tones;
  face: FaceCtx;
  /** Shade and lit sides in the art's own frame (before a left-facing flip). */
  shade: ShadeKey;
  lit: LitKey;
  night: boolean;
  silhouette: boolean;
  animated: boolean;
  /** Something is worn on the head (a rabbit's ears then go over the brim). */
  hat: boolean;
  has: (m: MarkId) => boolean;
  trait: (t: TraitId) => boolean;
  /** A precomputed crescent for a part of this pose, or '' when there is none. */
  crescent: (part: 'body' | 'head' | 'tail' | 'tailCurl' | 'cast' | `front${number}` | `frontB${number}`, kind: string) => string;
}

export interface MarkArt {
  /** Drawn in the canonical body frame, clipped to the torso. */
  body?: (c: DrawCtx) => JSX.Element | null;
  /** Drawn in the head frame, clipped to the head. */
  head?: (c: DrawCtx) => JSX.Element | null;
}

export interface SpriteCtx {
  tones: Tones;
  look: PetLook;
  has: (m: MarkId) => boolean;
  trait: (t: TraitId) => boolean;
}

export interface SpeciesArt {
  species: Species;
  /** The rig (and its crescent id) for a look; long-bodied dogs use their own rig. */
  rigFor: (look: PetLook) => { id: string; rig: SpeciesRig };
  /** Ears, horns, eye bumps: head frame, behind the head shape. */
  ears: (c: DrawCtx) => JSX.Element | null;
  /** Ears drawn over hats instead (a rabbit's ears come through the brim). */
  earsOverHat?: (c: DrawCtx) => JSX.Element | null;
  /** Over the lit head, under the face (a dog's floppy ears, a lop's ears). Head frame. */
  overHead?: (c: DrawCtx) => JSX.Element | null;
  /** The face over the lit head: muzzle, eyes, nose, mouth, whiskers. Head frame. */
  face: (c: DrawCtx) => JSX.Element | null;
  /** Markings by id. */
  marks: Partial<Record<MarkId, MarkArt>>;
  /** Anatomy inside the torso outline (a frog's haunch and belly), canvas frame, clipped to the torso. */
  bodyDetail?: (c: DrawCtx) => JSX.Element | null;
  /** Behind the torso (a plume, a far wing), canvas frame. */
  behindBody?: (c: DrawCtx) => JSX.Element | null;
  /** Over the torso and legs, under the head (a ruff, a near wing, a mane). */
  overBody?: (c: DrawCtx) => JSX.Element | null;
  /** Over the whole pet (a wave, cheeks stuffed full). */
  top?: (c: DrawCtx) => JSX.Element | null;
  /** The ≤ 20 px sprite on the 100×100 canvas: silhouette, head, one species cue (DESIGN §10.4). */
  sprite: (c: SpriteCtx) => JSX.Element;
}

/** What each place on the Shelf provides: its size, how it is drawn, and the ground its pets use. */
import type { JSX } from 'preact';
import type { Light } from '@/art/light';
import type { PlaceId } from '@/catalog/types';
import type { Ground } from '../arrange';
import type { SillPot } from '../model';
import type { OutsidePalette, RoomPalette } from '../palette';
import type { Moment } from '../time';

export interface PlaceDrawProps {
  room: RoomPalette;
  view: OutsidePalette;
  light: Light;
  moment: Moment;
  uid: string;
  /** The Balcony Box's shelf holds retired plants (DESIGN §8.4). */
  retired?: readonly SillPot[];
}

export interface PlaceScene {
  id: PlaceId;
  /** Segment width in room units (the scene is 100 tall). */
  width: number;
  /** Drawn behind the pets (SVG content in segment units). */
  back: (p: PlaceDrawProps) => JSX.Element;
  /** Drawn in front of the pets standing in it (a saucer's lip, the front of the grass). */
  front?: (p: PlaceDrawProps) => JSX.Element;
  /** Paint order of the front layer: pets nearer than this stay in front of it. */
  frontZ?: number;
  /** The ground its pets use, in segment units. */
  ground: (room: RoomPalette, petSize: number) => Ground;
  /** Where its own lamp shines from after dark (the lamp's shade); otherwise light spills in from the right. */
  lampAt?: readonly [number, number];
  /**
   * The Sill's table lamp standing in this place (DESIGN §10.4: one lamp design, on the lamp's side of the room),
   * drawn by the segment: its foot at (x, y), its canvas edge `size`, on a small side table `table` units tall.
   * `lampAt` then defaults to its shade.
   */
  lamp?: { x: number; y: number; size: number; table?: number };
  /** Where its lamp's pool is brightest and how far it reaches, if not centred on the lamp. */
  pool?: { x: number; y: number; r: number };
  /** The crop the places map shows: [x, y, w, h] in segment units. */
  crop: readonly [number, number, number, number];
}

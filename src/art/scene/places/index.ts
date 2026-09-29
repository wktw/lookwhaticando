/** The places beyond the Sill, in the Shelf's left-to-right order (catalog `PLACES`). */
import type { PlaceId } from '@/catalog/types';
import { BALCONY_PLACE } from './balcony';
import { BOOKSHELF_PLACE } from './bookshelf';
import { GRASS_PLACE } from './grass';
import { POND_PLACE } from './pond';
import { QUILT_PLACE } from './quilt';
import type { PlaceScene } from './types';

export type RoomPlaceId = Exclude<PlaceId, 'sill'>;

export const PLACE_SCENES: Record<RoomPlaceId, PlaceScene> = {
  pond: POND_PLACE,
  grass: GRASS_PLACE,
  bookshelf: BOOKSHELF_PLACE,
  balcony: BALCONY_PLACE,
  quilt: QUILT_PLACE,
};

export type { PlaceScene, PlaceDrawProps } from './types';

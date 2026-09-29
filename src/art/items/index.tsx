/**
 * Item art for treats and decor on the 100×100 canvas, in the catkin language: flat, matte,
 * outline-free, lit by one window (DESIGN §10.4). Treats: ./treats.tsx. Decor icons: ./decor.tsx
 * (the drawings live in art/scene/decor, shared with the Shelf).
 */
import { contact, paint, shapes, solid, thin } from '@/art/scene/decor/kit';
import { rect } from '@/art/scene/decor/geo';

export type { ItemArtOptions, ItemRenderer } from './types';
export { TREAT_ART } from './treats';
export { DECOR_ART } from './decor';

const PARCEL = shapes('item-placeholder', { box: rect(20, 34, 60, 54, 2.4) });
const TWINE = '#A98262';

/** A plain brown-paper parcel tied with twine, for an item that has no art yet. */
export function PlaceholderItem() {
  const p = paint();
  return (
    <g>
      {contact(p, 50, 88, 30, 2.4)}
      {solid(p, PARCEL.box, '#D9B68C', thin(p, 'M50 34V88M20 60H80', TWINE, 1.6))}
      {thin(p, 'M50 34C44 26 38 28 40 32C42 36 48 35 50 34C52 35 58 36 60 32C62 28 56 26 50 34', TWINE, 1.4)}
    </g>
  );
}

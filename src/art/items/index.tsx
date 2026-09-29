/**
 * Item art for treats and decor (100×100 canvas, same outline language as pets).
 * Treats: ./treats.tsx (garden module). Decor: ./decor.tsx (world module).
 */
export type { ItemRenderer } from './types';
export { TREAT_ART } from './treats';
export { DECOR_ART } from './decor';

/** Neutral gift-box placeholder for items without art yet. */
export function PlaceholderItem() {
  return (
    <g stroke="#5A3E45" stroke-width={2.4} stroke-linejoin="round">
      <rect x={26} y={40} width={48} height={42} rx={6} fill="#FFE9EF" />
      <rect x={22} y={32} width={56} height={12} rx={4} fill="#FFC4D3" />
      <path d="M50 32 L50 82" fill="none" />
    </g>
  );
}

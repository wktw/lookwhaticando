import { C, item } from './kit';
import { heart } from '../pets/species/marks';

/** Face wear, drawn for eyes 14 units apart with the origin between them. */

export const sleepMask = item({
  slot: 'face',
  draw: () => (
    <g>
      <path d="M-12.6 -3.4C-15.6 -4.6 -18.6 -4 -20.4 -2.2L-19.4 -0.6C-17.6 -2 -15 -2.4 -12.4 -1.4Z" fill={C.lavenderDeep} />
      <path d="M-12 -3.6C-6 -6.2 6 -6.2 12 -3.6C13.2 -0.4 12.4 3 10 3.6C5 5 -5 5 -10 3.6C-12.4 3 -13.2 -0.4 -12 -3.6Z" fill={C.lavender} />
      <path class="pet-line" d="M-9.4 0.2Q-7 2.2 -4.6 0.2M4.6 0.2Q7 2.2 9.4 0.2" fill="none" stroke={C.lavenderDeep} stroke-width="0.8" stroke-linecap="round" />
    </g>
  ),
  icon: 'translate(59 51.5) scale(2.6)',
});

export const heartShades = item({
  slot: 'face',
  draw: () => (
    <g>
      <path d="M-2.6 -1.4Q0 -3 2.6 -1.4" class="pet-line" fill="none" stroke={C.rose} stroke-width="1" />
      <path d={heart(-7, 0.4, 9.6, 8.6)} fill={C.rose} />
      <path d={heart(7, 0.4, 9.6, 8.6)} fill={C.rose} />
      <path d={heart(-7, 0.4, 7, 6.2)} fill="#B85A72" opacity={0.85} />
      <path d={heart(7, 0.4, 7, 6.2)} fill="#B85A72" opacity={0.85} />
      <path d="M-9.4 -1.6L-7.4 -2.2L-8.2 0Z" fill={C.white} opacity={0.6} />
      <path d="M4.6 -1.6L6.6 -2.2L5.8 0Z" fill={C.white} opacity={0.6} />
    </g>
  ),
  icon: 'translate(50 50) scale(3.3)',
});

/**
 * The Evergreen keepsake (DESIGN §5.5): a tiny brass watering can hung from the rim on a thread. Matte brass, a
 * hard crescent on the shade side, nothing that glitters.
 */
import type { Pt } from './geom';
import { SHADE, type Kit } from './kit';
import { f } from './math';

const BRASS = '#D8B769';
const BRASS_DEEP = '#BE9A4E';

/** The can, 6 wide, hanging from a thread tied at the origin. */
const CAN = 'M-2.6 4.6H2.6L2.2 8.6Q2.1 9.2 1.5 9.2H-1.5Q-2.1 9.2 -2.2 8.6Z';
const SPOUT = 'M-2.4 6L-5.6 3.6L-5 3L-2.2 5.1Z';
const ROSE = 'M-6.4 2.6L-4.8 4.2L-4.2 3.6L-5.4 1.9Z';
const CAN_SHADE: Record<'left' | 'right' | 'top', string> = {
  left: 'M1.1 4.6H2.6L2.2 8.6Q2.1 9.2 1.5 9.2H0.7Q1.3 9 1.4 8.4Z',
  right: 'M-1.1 4.6H-2.6L-2.2 8.6Q-2.1 9.2 -1.5 9.2H-0.7Q-1.3 9 -1.4 8.4Z',
  top: 'M-2.3 7.8H2.3L2.2 8.6Q2.1 9.2 1.5 9.2H-1.5Q-2.1 9.2 -2.2 8.6Z',
};

export function WateringCanCharm({ at, k }: { at: Pt; k: Kit }) {
  const [x, y] = at;
  return (
    <g class="plant-charm" transform={`translate(${f(x)} ${f(y)})`}>
      <path d="M0 -0.4V4.8" stroke="#E9DFCF" stroke-width={0.45} stroke-linecap="round" />
      <path d="M1.4 5.1C2.8 3.4 4.4 4 4 5.8C3.8 6.8 3.2 7.2 2.4 7.4" fill="none" stroke={k.lit(BRASS_DEEP)} stroke-width={0.7} stroke-linecap="round" />
      <path d={SPOUT} fill={k.lit(BRASS_DEEP)} />
      <path d={ROSE} fill={k.lit(BRASS)} />
      <path d={CAN} fill={k.lit(BRASS)} />
      <path d={CAN_SHADE[k.light.from]} class={SHADE} />
    </g>
  );
}

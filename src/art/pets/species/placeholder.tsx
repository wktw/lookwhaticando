import type { SpeciesArt } from '../types';
import { OUTLINE, STROKE } from '../geometry';

/**
 * Generic stand-in used until a species has real art. Round ears + "u" mouth.
 * The art team replaces every use of this; a unit test asserts none remain.
 */
export const placeholder: SpeciesArt = {
  back: (ctx) => (
    <g fill={ctx.look.palette.body} stroke={OUTLINE} stroke-width={STROKE}>
      <circle cx={28} cy={36} r={8} />
      <circle cx={72} cy={36} r={8} />
    </g>
  ),
  mouth: (ctx) => {
    const { x, y } = ctx.anchors.mouth;
    return <path d={`M${x - 2.6} ${y - 0.4} Q${x} ${y + 2.6} ${x + 2.6} ${y - 0.4}`} fill="none" stroke={OUTLINE} stroke-width={1.6} stroke-linecap="round" />;
  },
};

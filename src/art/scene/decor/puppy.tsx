/** Puppy Park decor: tennis balls, dog house. */
import { DETAIL, HEART, INK, OUTLINE, Shadow, Shine, type DecorRenderer } from './kit';

function Ball({ x, y, r, turn }: { x: number; y: number; r: number; turn: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <circle r={r} fill="#E4F09A" {...INK} />
      <path d={`M${-r * 0.35} ${r * 0.94} Q${r * 0.55} ${r * 0.9} ${r * 0.62} 0 Q${r * 0.7} ${-r * 0.8} ${-r * 0.1} ${-r}`} fill="none" stroke="#FFFDF4" stroke-width={2.6} stroke-linecap="round" />
      <path d={`M${-r * 0.97} ${r * 0.2} Q${-r * 0.45} ${r * 0.1} ${-r * 0.5} ${-r * 0.85}`} fill="none" stroke="#FFFDF4" stroke-width={2.6} stroke-linecap="round" />
      <circle cx={-r * 0.35} cy={-r * 0.42} r={r * 0.22} fill="#fff" opacity={0.6} />
    </g>
  );
}

/** Three fuzzy balls, slightly slobbery. */
export const tennisBalls: DecorRenderer = () => (
  <g>
    <Shadow rx={36} ry={4} />
    <Ball x={50} y={52} r={15} turn={20} />
    <Ball x={32} y={78} r={15} turn={-30} />
    <Ball x={67} y={79} r={14} turn={60} />
  </g>
);

/** A sky-blue dog house with a bone name-plate over the door, and a bowl of kibble. */
export const dogHouse: DecorRenderer = () => (
  <g>
    <Shadow rx={42} ry={4} />
    <g {...INK}>
      <path d="M20 93 L20 55 L50 31 L80 55 L80 93 Z" fill="#C6E2F8" />
      <path d="M36 93 L36 73 Q36 60 50 60 Q64 60 64 73 L64 93 Z" fill="#7C5F69" />
      <path d="M10 60 L50 24 L90 60 L83.5 65 L50 35 L16.5 65 Z" fill="#F7A8BC" />
    </g>
    <path d="M40 91 L40 74 Q40 65 50 64" fill="none" stroke="#9A7C86" stroke-width={2.4} stroke-linecap="round" opacity={0.8} />
    <g {...DETAIL}>
      <path d="M24 72 L34 72 M24 82 L34 82 M66 72 L76 72 M66 82 L76 82 M30 62 L40 62 M60 62 L70 62" stroke="#9CC4E6" />
    </g>
    {/* bone name-plate */}
    <g transform="translate(50 49)">
      <g fill="#FFF8EC" {...INK} stroke-width={1.8}>
        <circle cx={-9} cy={-2.2} r={2.9} />
        <circle cx={-9} cy={2.2} r={2.9} />
        <circle cx={9} cy={-2.2} r={2.9} />
        <circle cx={9} cy={2.2} r={2.9} />
      </g>
      <rect x={-9} y={-3.2} width={18} height={6.4} fill="#FFF8EC" />
      <path d="M-8.4 -3.2 L8.4 -3.2 M-8.4 3.2 L8.4 3.2" stroke={OUTLINE} stroke-width={1.8} />
      <path d={HEART} transform="scale(0.42)" fill="#F58CAA" />
    </g>
    {/* kibble bowl */}
    <g {...INK} stroke-width={2}>
      <path d="M75 86 Q82 82.5 89 86 Z" fill="#C79A7C" />
      <path d="M72 86 L92 86 L89.5 92 Q89 93 87.5 93 L76.5 93 Q75 93 74.5 92 Z" fill="#FFB8CB" />
    </g>
    <Shine cx={30} cy={62} rx={2.2} ry={6} rotate={0} opacity={0.5} />
    <Shine cx={32} cy={44} rx={6} ry={1.8} rotate={-42} opacity={0.5} />
  </g>
);

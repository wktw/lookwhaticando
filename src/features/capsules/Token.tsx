import { OUTLINE } from '@/art/machines/geometry';

export type TokenKind = 'coin' | 'star' | 'ticket';

/** What goes into the slot, drawn around the origin in machine units: a paw coin, a star, or a ticket. */
export function Token({ kind }: { kind: TokenKind }) {
  if (kind === 'star') {
    return (
      <path
        d="M0 -11 L3.2 -3.8 L10.6 -3.2 L5 1.8 L6.7 9.6 L0 5.6 L-6.7 9.6 L-5 1.8 L-10.6 -3.2 L-3.2 -3.8 Z"
        fill="#FFD65C"
        stroke={OUTLINE}
        stroke-width={2.2}
        stroke-linejoin="round"
      />
    );
  }
  if (kind === 'ticket') {
    return (
      <g stroke={OUTLINE} stroke-width={2} stroke-linejoin="round">
        <path d="M-13 -8 L13 -8 Q13 -3 16 -3 L16 3 Q13 3 13 8 L-13 8 Q-13 3 -16 3 L-16 -3 Q-13 -3 -13 -8 Z" fill="#FFC4D3" />
        <path d="M-5 -6 L-5 6" stroke-dasharray="2 2.4" stroke-width={1.4} />
        <circle cx={4} cy={0} r={3} fill="#fff" stroke-width={1.4} />
      </g>
    );
  }
  return (
    <g stroke={OUTLINE} stroke-width={2.2}>
      <circle r={10} fill="#F6C544" />
      <circle r={7} fill="none" stroke="#FFE593" stroke-width={1.6} />
      <g fill="#E0A92C" stroke="none">
        <ellipse cx={0} cy={1.8} rx={3.2} ry={2.6} />
        <circle cx={-3.6} cy={-2} r={1.3} />
        <circle cx={-1.2} cy={-3.8} r={1.3} />
        <circle cx={1.2} cy={-3.8} r={1.3} />
        <circle cx={3.6} cy={-2} r={1.3} />
      </g>
    </g>
  );
}

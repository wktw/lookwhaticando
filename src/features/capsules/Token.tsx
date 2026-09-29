import { BRASS } from '@/art/machines/theme';

export type TokenKind = 'coin' | 'stamp' | 'ticket';

/**
 * What goes into the slot, drawn around the origin in cabinet units: a brass coin with a
 * pressed leaf, a paper stamp (No. 07 takes stamps), or a printed ticket stub.
 */
export function Token({ kind }: { kind: TokenKind }) {
  if (kind === 'stamp') {
    return (
      <g>
        <path
          fill="#FFFDF9"
          d="M-9 -11H9V-9.6A1.4 1.4 0 0 0 9 -6.8V-5.2A1.4 1.4 0 0 0 9 -2.4V-0.8A1.4 1.4 0 0 0 9 2V3.6A1.4 1.4 0 0 0 9 6.4V8A1.4 1.4 0 0 0 9 10.8V11H-9V10.8A1.4 1.4 0 0 0 -9 8V6.4A1.4 1.4 0 0 0 -9 3.6V2A1.4 1.4 0 0 0 -9 -0.8V-2.4A1.4 1.4 0 0 0 -9 -5.2V-6.8A1.4 1.4 0 0 0 -9 -9.6Z"
        />
        <rect x={-6.4} y={-8.4} width={12.8} height={16.8} rx={1} fill="#E7A2AE" />
        <path d="M-2.6 0.4 -0.6 2.6 3 -1.8" fill="none" stroke="#FFFDF9" stroke-width={1.6} stroke-linecap="round" stroke-linejoin="round" />
      </g>
    );
  }
  if (kind === 'ticket') {
    return (
      <g>
        <path d="M-13 -7H13V-2.4A2.4 2.4 0 0 0 13 2.4V7H-13V2.4A2.4 2.4 0 0 0 -13 -2.4Z" fill="#F6E6B4" />
        <path d="M-5.6 -5.4V5.4" stroke="#D9B85C" stroke-width={1} stroke-dasharray="1.6 1.6" />
        <rect x={-1.6} y={-2.6} width={10} height={1.8} rx={0.9} fill="#C9A656" />
        <rect x={-1.6} y={0.8} width={7} height={1.8} rx={0.9} fill="#C9A656" />
      </g>
    );
  }
  return (
    <g>
      <circle r={9.5} fill={BRASS.deep} />
      <circle r={8} fill={BRASS.base} />
      <path d="M-3.4 3.6C-3.8-1 -0.8-4.2 4-4.4 4.4 0.4 1.4 3.4-3.4 3.6Z" fill={BRASS.deep} />
      <path d="M-3.2 3.4 2.2-2.2" stroke={BRASS.base} stroke-width={0.9} stroke-linecap="round" />
    </g>
  );
}

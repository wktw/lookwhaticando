/** One brass coin with its pressed leaf (the wallet's coin, as the scene draws it). */
import type { JSX } from 'preact';
import { JAR_COLORS as C } from '../palette';

export function Coin({ class: cls, style, width, height }: { class?: string; style?: JSX.CSSProperties; width?: number | string; height?: number | string }) {
  return (
    <svg class={cls} style={style} width={width} height={height} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <circle cx={5} cy={5} r={4.6} fill={C.coinEdge} />
      <circle cx={4.75} cy={4.75} r={4.05} fill={C.coin} />
      <path d="M4.75 2.5C6.2 3.45 6.2 5.6 4.75 7M4.75 4.6l1.05-0.8" fill="none" stroke={C.coinLeaf} stroke-width={0.6} stroke-linecap="round" />
    </svg>
  );
}

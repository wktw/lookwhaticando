import type { JSX } from 'preact';
import { OUTLINE } from './geometry';
import { Sparkle, Star } from './parts';

/** The Wishing Well (star shop): a little stone well with a blush roof and a star in the water. */
export function WishingWellArt({ size = 96, class: cls, style }: { size?: number | string; class?: string; style?: JSX.CSSProperties }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  const sw = 2.6;
  return (
    <svg class={cls} style={style} viewBox="0 0 120 120" width={px} height={px} aria-hidden="true" focusable="false">
      <ellipse cx={60} cy={110} rx={42} ry={5} fill={OUTLINE} opacity={0.1} />
      <g stroke={OUTLINE} stroke-width={sw} stroke-linejoin="round" stroke-linecap="round">
        {/* posts and crossbar */}
        <path d="M30 76 L30 34 M90 76 L90 34" fill="none" stroke-width={sw + 5} />
        <path d="M30 76 L30 34 M90 76 L90 34" fill="none" stroke="#C99A7E" stroke-width={5} />
        <path d="M30 44 L90 44" fill="none" stroke-width={sw + 3.4} />
        <path d="M30 44 L90 44" fill="none" stroke="#B98A72" stroke-width={3.4} />
        {/* rope and bucket */}
        <path d="M66 44 L66 58" fill="none" stroke-width={1.6} />
        <path d="M59 58 L73 58 L71 70 L61 70 Z" fill="#FFE593" />
        <path d="M59 58 Q66 52 73 58" fill="none" stroke-width={1.6} />
        {/* roof */}
        <path d="M18 40 L60 12 L102 40 Q104 44 99 44 L21 44 Q16 44 18 40 Z" fill="#FFC4D3" />
        <path d="M34 36 L60 19 M50 40 L66 29 M72 40 L84 32" fill="none" stroke="#F58CAA" stroke-width={2} />
        <path d="M18 40 L60 12 L102 40 Q104 44 99 44 L21 44 Q16 44 18 40 Z" fill="none" />
        {/* well basin */}
        <path d="M22 72 L98 72 L94 104 Q93 108 88 108 L32 108 Q27 108 26 104 Z" fill="#E9E1F4" />
        <ellipse cx={60} cy={72} rx={38} ry={8} fill="#BBDCF6" />
        <path
          d="M28 86 L92 86 M27 97 L93 97 M44 72 L42 86 M76 72 L78 86 M58 86 L57 97 M36 97 L35 108 M84 97 L85 108"
          fill="none"
          stroke-width={1.5}
          opacity={0.45}
        />
      </g>
      <Star x={60} y={72} s={0.62} fill="#FFE593" />
      <Sparkle x={102} y={60} s={1} />
      <Sparkle x={14} y={62} s={0.75} fill="#FFF3C4" />
      <Sparkle x={96} y={14} s={0.7} fill="#FFF3C4" />
    </svg>
  );
}

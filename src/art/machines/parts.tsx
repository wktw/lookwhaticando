/** Small drawing primitives shared by the machine motifs (same cocoa outline language). */
import type { ComponentChildren } from 'preact';
import { OUTLINE } from './geometry';
import { SPARKLE_PATH } from './CapsuleArt';

const BLUSH = '#FF9FB8';

/**
 * Every primitive is positioned by an outer translate and animated on an inner group, because
 * a CSS animation's transform replaces an SVG element's own transform attribute.
 */
function Placed({ x, y, cls, children }: { x: number; y: number; cls?: string; children: ComponentChildren }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g class={cls}>{children}</g>
    </g>
  );
}

export function Sparkle({ x, y, s = 1, fill = '#FFE593', cls }: { x: number; y: number; s?: number; fill?: string; cls?: string }) {
  return (
    <Placed x={x} y={y} cls={cls}>
      <path d={SPARKLE_PATH} transform={`scale(${s})`} fill={fill} stroke="#fff" stroke-width={0.9 / s} />
    </Placed>
  );
}

/** Rounded five-point star. */
export function Star({ x, y, s = 1, fill = '#FFE593', cls }: { x: number; y: number; s?: number; fill?: string; cls?: string }) {
  return (
    <Placed x={x} y={y} cls={cls}>
      <path
        d="M0 -7 L2 -2.4 L6.7 -2 L3.2 1.2 L4.2 6 L0 3.5 L-4.2 6 L-3.2 1.2 L-6.7 -2 L-2 -2.4 Z"
        transform={`scale(${s})`}
        fill={fill}
        stroke={OUTLINE}
        stroke-width={1.6 / s}
        stroke-linejoin="round"
      />
    </Placed>
  );
}

export const HEART_PATH =
  'M0 7 C-2 5.2 -8.4 1 -8.4 -3 C-8.4 -6.4 -5.7 -8.4 -3.4 -8.4 C-1.6 -8.4 -0.5 -7.4 0 -6.2 C0.5 -7.4 1.6 -8.4 3.4 -8.4 C5.7 -8.4 8.4 -6.4 8.4 -3 C8.4 1 2 5.2 0 7 Z';

export function Heart({ x, y, s = 1, fill = '#F58CAA', cls }: { x: number; y: number; s?: number; fill?: string; cls?: string }) {
  return (
    <Placed x={x} y={y} cls={cls}>
      <g transform={`scale(${s})`}>
        <path d={HEART_PATH} fill={fill} stroke={OUTLINE} stroke-width={2 / s} stroke-linejoin="round" />
        <ellipse cx={-3.8} cy={-4.4} rx={1.8} ry={1.2} transform="rotate(-30 -3.8 -4.4)" fill="#fff" opacity={0.8} />
      </g>
    </Placed>
  );
}

/** Five-petal cherry blossom. */
export function Blossom({
  x,
  y,
  s = 1,
  fill = '#FFC4D3',
  center = '#F58CAA',
  rot = 0,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  center?: string;
  rot?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={OUTLINE} stroke-width={1.5 / s} stroke-linejoin="round">
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M0 0 C-4.6 -3 -5 -8.5 -1.6 -10 L0 -8.4 L1.6 -10 C5 -8.5 4.6 -3 0 0 Z" fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r={2.4} fill={center} stroke="none" />
      {[20, 92, 164, 236, 308].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.6} cy={Math.sin((a * Math.PI) / 180) * 3.6} r={0.7} fill="#FFE593" stroke="none" />
      ))}
    </g>
  );
}

export function Leaf({ x, y, s = 1, rot = 0, fill = '#C3DFB4' }: { x: number; y: number; s?: number; rot?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 C4 -3 10 -3 14 0 C10 3 4 3 0 0 Z" fill={fill} stroke={OUTLINE} stroke-width={1.6 / s} stroke-linejoin="round" />
      <path d="M1.5 0 L10 0" stroke={OUTLINE} stroke-width={1 / s} opacity={0.5} stroke-linecap="round" />
    </g>
  );
}

export function Snowflake({ x, y, s = 1, cls }: { x: number; y: number; s?: number; cls?: string }) {
  return (
    <Placed x={x} y={y} cls={cls}>
      <g transform={`scale(${s})`} stroke-linecap="round">
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 -7 L0 7" stroke={OUTLINE} stroke-width={4.2 / s} />
            <path d="M-2.4 -5.4 L0 -3.4 L2.4 -5.4 M-2.4 5.4 L0 3.4 L2.4 5.4" stroke={OUTLINE} stroke-width={3.6 / s} fill="none" stroke-linejoin="round" />
          </g>
        ))}
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 -7 L0 7" stroke="#fff" stroke-width={1.8 / s} />
            <path d="M-2.4 -5.4 L0 -3.4 L2.4 -5.4 M-2.4 5.4 L0 3.4 L2.4 5.4" stroke="#fff" stroke-width={1.3 / s} fill="none" stroke-linejoin="round" />
          </g>
        ))}
      </g>
    </Placed>
  );
}

/** A tiny kawaii face: open eyes (or sleepy arcs), blush, and a mouth. */
export function Face({
  x,
  y,
  spread = 13,
  eyes = 'open',
  mouth = 'u',
  scale = 1,
}: {
  x: number;
  y: number;
  spread?: number;
  eyes?: 'open' | 'sleepy';
  mouth?: 'u' | 'cat' | 'none';
  scale?: number;
}) {
  const s = scale;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[-1, 1].map((d) =>
        eyes === 'open' ? (
          <g key={d} class="machine-eye">
            <ellipse cx={d * spread} cy={0} rx={2.5} ry={3.1} fill={OUTLINE} />
            <circle cx={d * spread + 0.9} cy={-1.2} r={0.95} fill="#fff" />
          </g>
        ) : (
          <path
            key={d}
            d={`M${d * spread - 2.8} -0.6 Q${d * spread} 2.4 ${d * spread + 2.8} -0.6`}
            fill="none"
            stroke={OUTLINE}
            stroke-width={1.7}
            stroke-linecap="round"
          />
        ),
      )}
      <ellipse cx={-spread - 5} cy={4} rx={3.6} ry={2.1} fill={BLUSH} opacity={0.6} />
      <ellipse cx={spread + 5} cy={4} rx={3.6} ry={2.1} fill={BLUSH} opacity={0.6} />
      {mouth === 'u' && <path d="M-2.4 2.8 Q0 5.2 2.4 2.8" fill="none" stroke={OUTLINE} stroke-width={1.5} stroke-linecap="round" />}
      {mouth === 'cat' && (
        <g fill="none" stroke={OUTLINE} stroke-width={1.4} stroke-linecap="round" stroke-linejoin="round">
          <path d="M-1.5 1.6 L1.5 1.6 L0 3.2 Z" fill="#F58CAA" stroke="#F58CAA" stroke-width={1} />
          <path d="M-3.4 3.6 Q-1.7 5.8 0 3.6 Q1.7 5.8 3.4 3.6" />
        </g>
      )}
    </g>
  );
}

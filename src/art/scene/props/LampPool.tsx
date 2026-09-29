/** The lamp's warm pool after dark, as a light gradient (the only kind DESIGN §10.4 allows). */
import { LAMP_POOL } from '../palette';

/** A radial gradient for the pool, in user space: centre (cx, cy), radius r (x) and r * squash (y). */
export function LampPoolGradient({ id, cx, cy, r, squash = 1, strength = 1 }: { id: string; cx: number; cy: number; r: number; squash?: number; strength?: number }) {
  return (
    <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} gradientTransform={squash === 1 ? undefined : `translate(0 ${+(cy * (1 - squash)).toFixed(2)}) scale(1 ${squash})`}>
      {LAMP_POOL.map(([offset, color, opacity]) => (
        <stop key={offset} offset={offset} stop-color={color} stop-opacity={+(opacity * strength).toFixed(3)} />
      ))}
    </radialGradient>
  );
}

/** The same pool as a CSS background (for the Today band's pinned end). */
export function lampPoolCss(strength = 1): string {
  const stops = LAMP_POOL.map(([offset, color, opacity]) => {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${+(opacity * strength).toFixed(3)}) ${Math.round(offset * 100)}%`;
  });
  return `radial-gradient(closest-side, ${stops.join(', ')})`;
}

/** Small reusable path builders (hearts, stars, drops, petals) in canvas coordinates. */

const f = (n: number) => +n.toFixed(2);

/** A plump heart centered at (cx, cy), about 2·s wide. */
export function heartPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${f(cx + x * s)} ${f(cy + y * s)}`;
  return `M${p(0, 0.85)} C${p(-0.25, 0.62)} ${p(-1, 0.12)} ${p(-1, -0.36)} C${p(-1, -0.76)} ${p(-0.68, -1)} ${p(-0.4, -1)} C${p(-0.18, -1)} ${p(-0.06, -0.88)} ${p(0, -0.74)} C${p(0.06, -0.88)} ${p(0.18, -1)} ${p(0.4, -1)} C${p(0.68, -1)} ${p(1, -0.76)} ${p(1, -0.36)} C${p(1, 0.12)} ${p(0.25, 0.62)} ${p(0, 0.85)} Z`;
}

/** A soft five-point star (round the joins with stroke-linejoin when outlined). */
export function starPath(cx: number, cy: number, r: number, inner = 0.5): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Four-point ✦ sparkle, the universal "magic" motif. */
export function sparklePath(cx: number, cy: number, r: number): string {
  const p = (x: number, y: number) => `${f(cx + x * r)} ${f(cy + y * r)}`;
  return `M${p(0, -1)} C${p(0.15, -0.25)} ${p(0.25, -0.15)} ${p(1, 0)} C${p(0.25, 0.15)} ${p(0.15, 0.25)} ${p(0, 1)} C${p(-0.15, 0.25)} ${p(-0.25, 0.15)} ${p(-1, 0)} C${p(-0.25, -0.15)} ${p(-0.15, -0.25)} ${p(0, -1)} Z`;
}

/** A teardrop pointing up, about 2·s tall. */
export function dropPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${f(cx + x * s)} ${f(cy + y * s)}`;
  return `M${p(0, -1)} C${p(0.3, -0.5)} ${p(0.62, -0.1)} ${p(0.62, 0.3)} C${p(0.62, 0.72)} ${p(0.32, 1)} ${p(0, 1)} C${p(-0.32, 1)} ${p(-0.62, 0.72)} ${p(-0.62, 0.3)} C${p(-0.62, -0.1)} ${p(-0.3, -0.5)} ${p(0, -1)} Z`;
}

/** A notched sakura petal pointing up, about 2·s tall. */
export function petalPath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${f(cx + x * s)} ${f(cy + y * s)}`;
  return `M${p(0, 1)} C${p(-0.7, 0.6)} ${p(-0.75, -0.4)} ${p(-0.32, -1)} L${p(0, -0.72)} L${p(0.32, -1)} C${p(0.75, -0.4)} ${p(0.7, 0.6)} ${p(0, 1)} Z`;
}

/** A crescent moon opening to the right, radius r. */
export function crescentPath(cx: number, cy: number, r: number): string {
  return `M${f(cx)} ${f(cy - r)} A${r} ${r} 0 0 0 ${f(cx)} ${f(cy + r)} A${f(r * 1.2)} ${f(r * 1.2)} 0 0 1 ${f(cx)} ${f(cy - r)} Z`;
}

/** Pastel rainbow, used by sprinkles, rainbow bands and holo accents. */
export const RAINBOW = ['#F7A1B8', '#FFBE8F', '#FFE08A', '#A9E0C8', '#A7CDF2', '#C6B3F4'];

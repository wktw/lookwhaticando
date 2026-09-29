/** Drawing helpers for places: a solid with its precomputed crescent, toned for the hour. */
import type { Light, LightFrom } from '@/art/light';
import { CRESCENTS } from '../crescent/data';
import { tone } from '../palette';
import type { TimeOfDay } from '../time';

/** The light position crescents use: by day the window's, at night the lamp's (from the right). */
export function fromOf(light: Light): LightFrom {
  return light.night ? 'right' : light.from;
}

/** A painter for one render: colours toned for the hour, crescents for the light. */
export function painter(time: TimeOfDay, light: Light) {
  const from = fromOf(light);
  return {
    c: (hex: string) => tone(time, hex),
    shade: (id: string) => CRESCENTS[id]?.[from] ?? '',
    from,
  };
}

export type Painter = ReturnType<typeof painter>;

/** A flat shape and its hard shade crescent. */
export function Solid({ d, fill, crescent }: { d: string; fill: string; crescent?: string }) {
  return (
    <>
      <path d={d} fill={fill} />
      {crescent && <path d={crescent} fill="var(--shade)" />}
    </>
  );
}

const f = (n: number) => +n.toFixed(2);

/** A circle as path data (for combining many into one path). */
export const disc = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** An ellipse as path data. */
export const oval = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;

/** Control points of a heart leaf, stem at 0,0, tip at 0,7.6 (cubic segments). */
const HEART_LEAF: readonly (readonly [number, number])[] = [
  [0, 0.2],
  [1.2, -1], [3.7, -0.5], [3.4, 2.5],
  [3.1, 4.9], [1.2, 6.5], [0, 7.6],
  [-1.2, 6.5], [-3.1, 4.9], [-3.4, 2.5],
  [-3.7, -0.5], [-1.2, -1], [0, 0.2],
];

/** A heart-shaped pothos leaf hanging from (x, y), pointing along `angle` (degrees, 0 = down), as path data. */
export function pothosLeaf(x: number, y: number, angle: number, s: number): string {
  const a = (angle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const p = HEART_LEAF.map(([px, py]) => `${f(x + (px * cos - py * sin) * s)} ${f(y + (px * sin + py * cos) * s)}`);
  return `M${p[0]}C${p[1]} ${p[2]} ${p[3]}C${p[4]} ${p[5]} ${p[6]}C${p[7]} ${p[8]} ${p[9]}C${p[10]} ${p[11]} ${p[12]}Z`;
}

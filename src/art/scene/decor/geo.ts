/**
 * Path builders for item art on the 100×100 canvas. Pure string builders, run once at module load:
 * every shape is static path data, so nothing is measured or clipped while the app runs.
 */
export type Pt = readonly [number, number];

/** A number as short path text (two decimals at most). */
export const n = (v: number): string => String(+v.toFixed(2));
const pt = ([x, y]: Pt) => `${n(x)} ${n(y)}`;

const RAD = Math.PI / 180;

/** A closed ellipse, optionally rotated by `rot` degrees about its centre. */
export function ell(cx: number, cy: number, rx: number, ry = rx, rot = 0): string {
  const dx = rx * Math.cos(rot * RAD);
  const dy = rx * Math.sin(rot * RAD);
  const a = `A${n(rx)} ${n(ry)} ${n(rot)} 1 0`;
  return `M${n(cx - dx)} ${n(cy - dy)}${a} ${n(cx + dx)} ${n(cy + dy)}${a} ${n(cx - dx)} ${n(cy - dy)}Z`;
}

/** Many small round dots as one path (seeds, pricks, dimples): one DOM node instead of dozens. */
export function dots(pts: readonly Pt[], r: number): string {
  const a = `a${n(r)} ${n(r)} 0 1 0`;
  return pts.map(([x, y]) => `M${n(x - r)} ${n(y)}${a} ${n(2 * r)} 0${a} ${n(-2 * r)} 0Z`).join('');
}

/** Points along an ellipse from angle a0 to a1 (degrees, 0 = +x, 90 = down), inclusive. */
export function ellPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 8): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (a0 + ((a1 - a0) * i) / steps) * RAD;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });
}

/** A rectangle with rounded corners: one radius, or [top-left, top-right, bottom-right, bottom-left]. */
export function rect(x: number, y: number, w: number, h: number, r: number | readonly [number, number, number, number] = 0): string {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  return (
    `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}` +
    (tr ? `Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + tr)}` : '') +
    `V${n(y + h - br)}` +
    (br ? `Q${n(x + w)} ${n(y + h)} ${n(x + w - br)} ${n(y + h)}` : '') +
    `H${n(x + bl)}` +
    (bl ? `Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - bl)}` : '') +
    `V${n(y + tl)}` +
    (tl ? `Q${n(x)} ${n(y)} ${n(x + tl)} ${n(y)}` : '') +
    'Z'
  );
}

/** A closed polygon whose corners are rounded by `r` (one radius, or one per corner). */
export function poly(pts: readonly Pt[], r: number | readonly number[] = 0): string {
  const radius = (i: number) => (typeof r === 'number' ? r : (r[i] ?? 0));
  if (pts.every((_, i) => !radius(i))) return `M${pts.map(pt).join('L')}Z`;
  const out: string[] = [];
  pts.forEach((p, i) => {
    const prev = pts[(i + pts.length - 1) % pts.length]!;
    const next = pts[(i + 1) % pts.length]!;
    const rad = radius(i);
    if (!rad) {
      out.push(`${out.length ? 'L' : 'M'}${pt(p)}`);
      return;
    }
    const cut = (to: Pt) => {
      const len = Math.hypot(to[0] - p[0], to[1] - p[1]) || 1;
      const k = Math.min(rad, len / 2) / len;
      return [p[0] + (to[0] - p[0]) * k, p[1] + (to[1] - p[1]) * k] as const;
    };
    out.push(`${out.length ? 'L' : 'M'}${pt(cut(prev))}Q${pt(p)} ${pt(cut(next))}`);
  });
  return `${out.join('')}Z`;
}

/** An open polyline. */
export function line(pts: readonly Pt[]): string {
  return `M${pts.map(pt).join('L')}`;
}

/**
 * A smooth curve through the points (Catmull-Rom as cubic Béziers). Closed by default, for
 * organic silhouettes: cloth, hay, leaves, cushions.
 */
export function smooth(pts: readonly Pt[], closed = true, tension = 1): string {
  const count = pts.length;
  const at = (i: number) => (closed ? pts[(i + count) % count]! : pts[Math.max(0, Math.min(count - 1, i))]!);
  let d = `M${pt(pts[0]!)}`;
  const segments = closed ? count : count - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

/** Points rotated by `deg` degrees about (cx, cy). */
export function rotate(pts: readonly Pt[], deg: number, cx = 50, cy = 50): Pt[] {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c] as const);
}

/** Points moved by (dx, dy). */
export function move(pts: readonly Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy] as const);
}

/** Points scaled about (cx, cy). */
export function scale(pts: readonly Pt[], sx: number, sy = sx, cx = 50, cy = 50): Pt[] {
  return pts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy] as const);
}

/** A leaf or petal from `base` to `tip`, `w` wide at its widest, bowed sideways by `bend`. */
export function leaf(base: Pt, tip: Pt, w: number, bend = 0): string {
  const [bx, by] = base;
  const [tx, ty] = tip;
  const len = Math.hypot(tx - bx, ty - by) || 1;
  const ux = (tx - bx) / len;
  const uy = (ty - by) / len;
  const nx = -uy;
  const ny = ux;
  const at = (t: number, side: number): Pt => [bx + ux * len * t + nx * (side * w + bend * len), by + uy * len * t + ny * (side * w + bend * len)];
  const a1 = at(0.25, 0.62);
  const a2 = at(0.72, 0.5);
  const b1 = at(0.72, -0.5);
  const b2 = at(0.25, -0.62);
  return `M${pt(base)}C${pt(a1)} ${pt(a2)} ${pt(tip)}C${pt(b1)} ${pt(b2)} ${pt(base)}Z`;
}

/** A five-point (or n-point) star centred on (cx, cy). */
export function star(cx: number, cy: number, outer: number, inner: number, points = 5, rot = -90, r = 0): string {
  const pts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? inner : outer;
    const a = (rot + (i * 180) / points) * RAD;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return poly(pts, r);
}

/** A heart about `w` wide with its point at the bottom, centred on (cx, cy). `lean` tips it sideways. */
export function heart(cx: number, cy: number, w: number, lean = 0): string {
  const s = w / 12;
  const p = (x: number, y: number): string => {
    const xr = x + lean * (y + 6) * 0.06;
    return `${n(cx + xr * s)} ${n(cy + y * s)}`;
  };
  return (
    `M${p(0, 5.4)}C${p(-1.6, 3.9)} ${p(-6, 1)} ${p(-6, -2.1)}C${p(-6, -4.6)} ${p(-4.1, -6)} ${p(-2.5, -6)}` +
    `C${p(-1.2, -6)} ${p(-0.4, -5.3)} ${p(0, -4.3)}C${p(0.4, -5.3)} ${p(1.2, -6)} ${p(2.5, -6)}` +
    `C${p(4.1, -6)} ${p(6, -4.6)} ${p(6, -2.1)}C${p(6, 1)} ${p(1.6, 3.9)} ${p(0, 5.4)}Z`
  );
}

/** A trapezoid (pots, cups, jars seen from the front) with rounded corners. */
export function trap(cx: number, top: number, bottom: number, wTop: number, wBottom: number, r = 0): string {
  return poly(
    [
      [cx - wTop / 2, top],
      [cx + wTop / 2, top],
      [cx + wBottom / 2, bottom],
      [cx - wBottom / 2, bottom],
    ],
    r,
  );
}

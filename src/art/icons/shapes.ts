/**
 * Path builders shared by icons, currency, habit icons and badges. Each returns SVG path data,
 * so callers can memoize results at module level (they never change at runtime).
 */

type Pt = readonly [number, number];

/** Round to 2 decimals so generated paths stay compact. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * A plump star with softened points. `round` is how far (0..0.5 of each edge) the outer
 * corners are eased into curves; inner corners get half of that.
 */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5, round = 0.26): string {
  const verts: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    verts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  let d = '';
  verts.forEach((v, i) => {
    const prev = verts[(i + verts.length - 1) % verts.length]!;
    const next = verts[(i + 1) % verts.length]!;
    const t = i % 2 === 0 ? round : round * 0.5;
    const a = lerp(v, prev, t);
    const b = lerp(v, next, t);
    d += `${i === 0 ? 'M' : 'L'}${r2(a[0])} ${r2(a[1])}Q${r2(v[0])} ${r2(v[1])} ${r2(b[0])} ${r2(b[1])}`;
  });
  return `${d}Z`;
}

/**
 * A circle of radius `r` edged with `n` outward half-circle bumps (a pie crust or gear);
 * `bulge` < 1 flattens them. `start` rotates the first bump (degrees, 0 = up).
 */
export function scallopPath(cx: number, cy: number, r: number, n: number, bulge = 1, start = 0): string {
  const chord = 2 * r * Math.sin(Math.PI / n);
  const ar = r2((chord / 2) / Math.min(1, bulge));
  // Bumps sit *between* consecutive points, so offset by half a step to center one at `start`.
  const pt = (k: number): Pt => {
    const a = ((start - 90) * Math.PI) / 180 + ((k - 0.5) * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const p0 = pt(0);
  let d = `M${r2(p0[0])} ${r2(p0[1])}`;
  for (let k = 1; k <= n; k++) {
    const p = pt(k);
    d += `A${ar} ${ar} 0 0 1 ${r2(p[0])} ${r2(p[1])}`;
  }
  return `${d}Z`;
}

/**
 * A flower of `n` round petals: each petal is one cubic from valley to valley (radius `inner`)
 * reaching `outer` at its tip. Valleys meet cleanly, so the outline never loops on itself.
 * `start` rotates the first petal tip (degrees, 0 = up).
 */
export function flowerPath(cx: number, cy: number, inner: number, outer: number, n: number, start = 0): string {
  const step = (2 * Math.PI) / n;
  const half = Math.cos(step / 2);
  // Cubic midpoint = (P0 + 3P1 + 3P2 + P3) / 8; solve for the control radius that reaches `outer`.
  const ctrl = ((8 * outer) / half - 2 * inner) / 6;
  const polar = (rad: number, a: number): Pt => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const a0 = ((start - 90) * Math.PI) / 180 - step / 2;
  const p0 = polar(inner, a0);
  let d = `M${r2(p0[0])} ${r2(p0[1])}`;
  for (let k = 0; k < n; k++) {
    const a = a0 + k * step;
    const c1 = polar(ctrl, a);
    const c2 = polar(ctrl, a + step);
    const p = polar(inner, a + step);
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p[0])} ${r2(p[1])}`;
  }
  return `${d}Z`;
}

/**
 * A crescent: the disc (cx, cy, r) with the disc (bx, by, br) bitten out of it. The bite must
 * overlap the disc edge; the crescent's fat side faces away from the bite.
 */
export function crescentPath(cx: number, cy: number, r: number, bx: number, by: number, br: number): string {
  const dx = bx - cx;
  const dy = by - cy;
  const d = Math.hypot(dx, dy);
  const a = (r * r - br * br + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r * r - a * a));
  const mx = cx + (a * dx) / d;
  const my = cy + (a * dy) / d;
  const p1: Pt = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2: Pt = [mx - (h * dy) / d, my + (h * dx) / d];
  return `M${r2(p1[0])} ${r2(p1[1])}A${r} ${r} 0 1 0 ${r2(p2[0])} ${r2(p2[1])}A${br} ${br} 0 0 1 ${r2(p1[0])} ${r2(p1[1])}Z`;
}

/** The brand's 4-point "✦" sparkle. `pinch` (0..1) sets how thin the arms are. */
export function sparklePath(cx: number, cy: number, r: number, pinch = 0.2): string {
  const k = r * pinch;
  const q = (x: number, y: number, ex: number, ey: number) => `Q${r2(cx + x)} ${r2(cy + y)} ${r2(cx + ex)} ${r2(cy + ey)}`;
  return `M${r2(cx)} ${r2(cy - r)}${q(k, -k, r, 0)}${q(k, k, 0, r)}${q(-k, k, -r, 0)}${q(-k, -k, 0, -r)}Z`;
}

/** A plump, symmetric heart centered on (cx, cy) with total width `w`. */
export function heartPath(cx: number, cy: number, w: number): string {
  const s = w / 20;
  const p = (x: number, y: number) => `${r2(cx + x * s)} ${r2(cy + y * s)}`;
  return (
    `M${p(0, 8.2)}` +
    `C${p(-2.4, 6.6)} ${p(-10, 1.8)} ${p(-10, -3.2)}` +
    `C${p(-10, -6.6)} ${p(-7.4, -8.8)} ${p(-4.9, -8.8)}` +
    `C${p(-2.7, -8.8)} ${p(-1, -7.5)} ${p(0, -5.6)}` +
    `C${p(1, -7.5)} ${p(2.7, -8.8)} ${p(4.9, -8.8)}` +
    `C${p(7.4, -8.8)} ${p(10, -6.6)} ${p(10, -3.2)}` +
    `C${p(10, 1.8)} ${p(2.4, 6.6)} ${p(0, 8.2)}Z`
  );
}

/**
 * Path builders for scene shapes. They emit absolute M/L/C/Q/Z commands only, so the offline crescent
 * generator can read the very same strings the art fills.
 */

const n = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

/** A rounded rectangle (corner radius clamped to the shorter half-side). */
export function rrect(x: number, y: number, w: number, h: number, r = 0): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (k === 0) return `M${n(x)} ${n(y)}L${n(x + w)} ${n(y)}L${n(x + w)} ${n(y + h)}L${n(x)} ${n(y + h)}Z`;
  return (
    `M${n(x + k)} ${n(y)}L${n(x + w - k)} ${n(y)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + k)}` +
    `L${n(x + w)} ${n(y + h - k)}Q${n(x + w)} ${n(y + h)} ${n(x + w - k)} ${n(y + h)}` +
    `L${n(x + k)} ${n(y + h)}Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - k)}L${n(x)} ${n(y + k)}Q${n(x)} ${n(y)} ${n(x + k)} ${n(y)}Z`
  );
}

const KAPPA = 0.5523;

/** An ellipse as four cubic arcs. */
export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return (
    `M${n(cx - rx)} ${n(cy)}C${n(cx - rx)} ${n(cy - oy)} ${n(cx - ox)} ${n(cy - ry)} ${n(cx)} ${n(cy - ry)}` +
    `C${n(cx + ox)} ${n(cy - ry)} ${n(cx + rx)} ${n(cy - oy)} ${n(cx + rx)} ${n(cy)}` +
    `C${n(cx + rx)} ${n(cy + oy)} ${n(cx + ox)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}` +
    `C${n(cx - ox)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + oy)} ${n(cx - rx)} ${n(cy)}Z`
  );
}

/** The lower half of an ellipse closed by its diameter: a bowl or a saucer seen from the side. */
export function bowl(cx: number, cy: number, rx: number, ry: number): string {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return (
    `M${n(cx - rx)} ${n(cy)}L${n(cx + rx)} ${n(cy)}` +
    `C${n(cx + rx)} ${n(cy + oy)} ${n(cx + ox)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}` +
    `C${n(cx - ox)} ${n(cy + ry)} ${n(cx - rx)} ${n(cy + oy)} ${n(cx - rx)} ${n(cy)}Z`
  );
}

/** A trapezoid: top edge x0t…x1t at yt, bottom edge x0b…x1b at yb, bottom corners rounded by r. */
export function trapezoid(x0t: number, x1t: number, yt: number, x0b: number, x1b: number, yb: number, r = 0): string {
  if (r <= 0) return `M${n(x0t)} ${n(yt)}L${n(x1t)} ${n(yt)}L${n(x1b)} ${n(yb)}L${n(x0b)} ${n(yb)}Z`;
  const t = r / Math.max(1e-6, yb - yt);
  return (
    `M${n(x0t)} ${n(yt)}L${n(x1t)} ${n(yt)}L${n(x1b + (x1t - x1b) * t)} ${n(yb - r)}Q${n(x1b)} ${n(yb)} ${n(x1b - r)} ${n(yb)}` +
    `L${n(x0b + r)} ${n(yb)}Q${n(x0b)} ${n(yb)} ${n(x0b + (x0t - x0b) * t)} ${n(yb - r)}Z`
  );
}

/** A closed polygon through `pts`. */
export function poly(pts: readonly (readonly [number, number])[]): string {
  return `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
}

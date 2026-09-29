/**
 * Test helper: a bounding box of rendered SVG art in canvas units, computed from the DOM (jsdom has no
 * getBBox). Béziers count their control points, so the box is conservative (never smaller than the art).
 * Handles the path commands, transforms and shapes the art modules use.
 */
type Matrix = [number, number, number, number, number, number];
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

function parseTransform(value: string | null): Matrix {
  let m = IDENTITY;
  for (const [, fn, args] of (value ?? '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args!.split(/[\s,]+/).filter(Boolean).map(Number);
    let n: Matrix = IDENTITY;
    if (fn === 'translate') n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    else if (fn === 'scale') n = [a[0]!, 0, 0, a[1] ?? a[0]!, 0, 0];
    else if (fn === 'rotate') {
      const r = (a[0]! * Math.PI) / 180;
      n = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      if (a.length === 3) n = multiply(multiply([1, 0, 0, 1, a[1]!, a[2]!], n), [1, 0, 0, 1, -a[1]!, -a[2]!]);
    } else if (fn === 'matrix') n = a as Matrix;
    m = multiply(m, n);
  }
  return m;
}

/** Points on an SVG arc (endpoint parameterization, SVG 2 appendix B.2.4), sampled. */
function arcPoints(x1: number, y1: number, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, x2: number, y2: number): [number, number][] {
  if (!rx || !ry) return [[x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy;
  const yp = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const scale = Math.max(1, Math.sqrt((xp * xp) / (rx * rx) + (yp * yp) / (ry * ry)));
  rx *= scale;
  ry *= scale;
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / (rx * rx * yp * yp + ry * ry * xp * xp)));
  const cxp = (k * rx * yp) / ry;
  const cyp = (-k * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = angle(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = angle((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  return Array.from({ length: 17 }, (_, i) => {
    const t = t1 + (dt * i) / 16;
    return [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  });
}

/** Every endpoint and control point of a path (absolute and relative commands). */
export function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: [number, number][] = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T': {
        x = ox + num();
        y = oy + num();
        if (cmd.toUpperCase() === 'M') {
          sx = x;
          sy = y;
          cmd = rel ? 'l' : 'L';
        }
        out.push([x, y]);
        break;
      }
      case 'H':
        x = ox + num();
        out.push([x, y]);
        break;
      case 'V':
        y = oy + num();
        out.push([x, y]);
        break;
      case 'C':
      case 'S':
      case 'Q': {
        const n = cmd.toUpperCase() === 'C' ? 3 : 2;
        for (let j = 0; j < n; j++) out.push([ox + num(), oy + num()]);
        [x, y] = out.at(-1)!;
        break;
      }
      case 'A': {
        const [rx, ry, rot, large, sweep] = [num(), num(), num(), num(), num()];
        const ex = ox + num();
        const ey = oy + num();
        out.push(...arcPoints(x, y, rx, ry, rot, !!large, !!sweep, ex, ey));
        x = ex;
        y = ey;
        break;
      }
      case 'Z':
        x = sx;
        y = sy;
        break;
      default:
        i++;
    }
  }
  return out;
}

function shapePoints(el: Element): [number, number][] {
  const n = (name: string) => Number(el.getAttribute(name) ?? 0);
  switch (el.tagName.toLowerCase()) {
    case 'path':
      return pathPoints(el.getAttribute('d') ?? '');
    case 'circle':
      return [
        [n('cx') - n('r'), n('cy') - n('r')],
        [n('cx') + n('r'), n('cy') + n('r')],
      ];
    case 'ellipse':
      return [
        [n('cx') - n('rx'), n('cy') - n('ry')],
        [n('cx') + n('rx'), n('cy') - n('ry')],
        [n('cx') - n('rx'), n('cy') + n('ry')],
        [n('cx') + n('rx'), n('cy') + n('ry')],
      ];
    case 'rect':
      return [
        [n('x'), n('y')],
        [n('x') + n('width'), n('y') + n('height')],
      ];
    default:
      return [];
  }
}

/** The box of every drawn shape inside `root`, in canvas units; `stroked` adds half of each outline. */
export function shapeBoxes(root: Element, { stroked = false } = {}): Box[] {
  const boxes: Box[] = [];
  const walk = (el: Element, m: Matrix, stroke: string | null, width: number) => {
    const tag = el.tagName.toLowerCase();
    // Definitions draw nothing, and clipped content stays inside a shape that is drawn elsewhere.
    if (tag === 'clippath' || tag === 'radialgradient' || tag === 'lineargradient' || tag === 'defs' || el.hasAttribute('clip-path')) return;
    const own = multiply(m, parseTransform(el.getAttribute('transform')));
    const s = el.getAttribute('stroke') ?? stroke;
    const w = Number(el.getAttribute('stroke-width') ?? width);
    const pad = stroked && s && s !== 'none' ? (w / 2) * Math.sqrt(Math.abs(own[0] * own[3] - own[1] * own[2])) : 0;
    const points = shapePoints(el);
    if (points.length) {
      const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      for (const [px, py] of points) {
        const tx = own[0] * px + own[2] * py + own[4];
        const ty = own[1] * px + own[3] * py + own[5];
        box.x0 = Math.min(box.x0, tx - pad);
        box.y0 = Math.min(box.y0, ty - pad);
        box.x1 = Math.max(box.x1, tx + pad);
        box.y1 = Math.max(box.y1, ty + pad);
      }
      boxes.push(box);
    }
    for (const child of el.children) walk(child, own, s, w);
  };
  walk(root, IDENTITY, null, 1);
  return boxes;
}

/** Bounding box of everything drawn inside `root`. */
export function artBounds(root: Element, options: { stroked?: boolean } = {}): Box {
  return shapeBoxes(root, options).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }), {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  });
}

/** A rough measure of how much is drawn: the summed size (width + height) of every shape. */
export function drawnMass(root: Element): number {
  return shapeBoxes(root).reduce((sum, b) => sum + (b.x1 - b.x0) + (b.y1 - b.y0), 0);
}

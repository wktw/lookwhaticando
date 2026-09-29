import type { Pose } from './types';
import type { Placement, SpeciesRig } from './rig';

/**
 * Rough bounds of a pet's drawing per rig and pose, from the rig's own path data: the control
 * polygon of every shape (a superset of the curve), with the head's ears or horns taken from its
 * `top` anchor. Used to fit a pet to a tile; computed once per rig and pose, then cached.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi;

/** The extent of absolute path data (M, L, H, V, C, S, Q, T, A, Z). */
export function pathBox(d: string, box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }): Box {
  const add = (x: number, y: number) => {
    if (x < box.x0) box.x0 = x;
    if (x > box.x1) box.x1 = x;
    if (y < box.y0) box.y0 = y;
    if (y > box.y1) box.y1 = y;
  };
  let cx = 0;
  let cy = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi)) {
    const n = (args!.match(NUM) ?? []).map(Number);
    switch (cmd!.toUpperCase()) {
      case 'H':
        for (const x of n) add((cx = x), cy);
        break;
      case 'V':
        for (const y of n) add(cx, (cy = y));
        break;
      case 'A':
        for (let i = 0; i + 6 < n.length; i += 7) {
          // Endpoints, grown by the radius: a safe superset for the short arcs the rigs use.
          const r = Math.max(n[i]!, n[i + 1]!);
          add((cx = n[i + 5]!) - r, (cy = n[i + 6]!) - r);
          add(cx + r, cy + r);
        }
        break;
      case 'Z':
        break;
      default:
        for (let i = 0; i + 1 < n.length; i += 2) add((cx = n[i]!), (cy = n[i + 1]!));
    }
  }
  return box;
}

/** A head-frame box placed in the canvas (the four corners, rotated and scaled). */
export function placeBox(b: Box, at: Placement, out: Box) {
  const a = ((at.r ?? 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  for (const [x, y] of [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ] as const) {
    const px = at.x + (x * cos - y * sin) * at.s;
    const py = at.y + (x * sin + y * cos) * at.s;
    out.x0 = Math.min(out.x0, px);
    out.x1 = Math.max(out.x1, px);
    out.y0 = Math.min(out.y0, py);
    out.y1 = Math.max(out.y1, py);
  }
}

/** The head's box in its own frame, ears and horns included. */
export function headBox(rig: SpeciesRig): Box {
  const b = pathBox(rig.head.d);
  const w = rig.head.wide ?? 0;
  return { x0: Math.min(b.x0, -w), x1: Math.max(b.x1, w), y0: Math.min(b.y0, rig.head.top), y1: b.y1 };
}

const cache = new Map<string, Box>();

/** The drawing's bounds for a rig and pose, in canvas units (before species scale). */
export function poseBounds(rigId: string, rig: SpeciesRig, pose: Pose): Box {
  const key = `${rigId}/${pose}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = rig.poses[pose];
  const box = pathBox(p.body);
  for (const l of [...(p.back ?? []), ...(p.front ?? [])]) pathBox(l.d, box);
  if (p.tail) pathBox(p.tail.d, box);
  placeBox(headBox(rig), p.head, box);
  cache.set(key, box);
  return box;
}

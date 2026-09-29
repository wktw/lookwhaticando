/**
 * Decor between the store and the scene. The store keeps a placement as fractions of its place (`PlacedDecor`: `x`
 * 0..1 across the place's floor, `y` 0 back … 1 front); the scene lays out in room units. The scene owns the
 * conversion: `decorToScene` hands a placement to a scene as-is, the scene resolves it against the floor it draws
 * (`fracToScene`), and edits come back through `sceneToFrac`. Keepsakes place as decor too (DESIGN §14.1).
 */
import type { KeepsakeKind, PlacedDecor } from '@/state/types';
import { DECOR_ENTRIES, type DecorEntry } from './decor';
import { KEEPSAKE_ART } from './objects/keepsakes';
import type { ShelfDecor } from './model';
import { clamp, clamp01 } from './room';

/** The floor a placement is measured against: its walkable span and depth band (a place's `Ground`). */
export interface DecorFloor {
  x0: number;
  x1: number;
  d0: number;
  d1: number;
}

/** A store placement for a scene. `kindOf` names a keepsake's kind (`keepsakeOfItem(state, id)?.kind`). */
export function decorToScene(d: PlacedDecor, kindOf?: (itemId: string) => KeepsakeKind | null | undefined): ShelfDecor {
  const keepsake = d.itemId.startsWith('keepsake:') ? (kindOf?.(d.itemId) ?? undefined) : undefined;
  return { key: d.id, itemId: d.itemId, place: d.place, frac: { x: clamp01(d.x), y: clamp01(d.y) }, flip: !!d.flip, ...(keepsake ? { keepsake } : {}) };
}

/** Where a stored placement stands on a floor, in room units. */
export function fracToScene(floor: DecorFloor, frac: { x: number; y: number }): { x: number; depth: number } {
  return { x: floor.x0 + clamp01(frac.x) * (floor.x1 - floor.x0), depth: floor.d0 + clamp01(frac.y) * (floor.d1 - floor.d0) };
}

/** A spot on a floor, as the store keeps it (the inverse of `fracToScene`). */
export function sceneToFrac(floor: DecorFloor, x: number, depth: number): { x: number; y: number } {
  const w = floor.x1 - floor.x0 || 1;
  const h = floor.d1 - floor.d0 || 1;
  return { x: +clamp01((x - floor.x0) / w).toFixed(4), y: +clamp01((clamp(depth, floor.d0, floor.d1) - floor.d0) / h).toFixed(4) };
}

/** The same, named for the store side (`PlacedDecor.x/y` from a scene spot). */
export const sceneToDecor = (x: number, depth: number, floor: DecorFloor): { x: number; y: number } => sceneToFrac(floor, x, depth);

/** The art entry for a placed item: a decor collectible, or a keepsake by its kind. */
export function decorEntry(d: Pick<ShelfDecor, 'itemId' | 'keepsake'>): DecorEntry | undefined {
  const direct = DECOR_ENTRIES[d.itemId];
  if (direct) return direct;
  if (d.keepsake) return KEEPSAKE_ART[d.keepsake];
  if (d.itemId.startsWith('keepsake-')) return KEEPSAKE_ART[d.itemId.slice('keepsake-'.length) as KeepsakeKind];
  return undefined;
}

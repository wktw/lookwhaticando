/**
 * Arranging habits (You › Habits): pure helpers for moving one id in a list, by a step (the
 * arrow keys and the up/down buttons) or to a slot (a drag), and for finding the slot a drag is
 * over from the rows' midpoints.
 */

/** `ids` with `id` moved to `to` (clamped). The same array when nothing moves. */
export function moveTo<T>(ids: readonly T[], id: T, to: number): readonly T[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const target = Math.max(0, Math.min(ids.length - 1, to));
  if (target === from) return ids;
  const next = ids.slice();
  next.splice(from, 1);
  next.splice(target, 0, id);
  return next;
}

/** `ids` with `id` moved `by` places (−1 up, +1 down, ±Infinity to an end). */
export function moveBy<T>(ids: readonly T[], id: T, by: number): readonly T[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const to = by === Infinity ? ids.length - 1 : by === -Infinity ? 0 : from + by;
  return moveTo(ids, id, to);
}

/**
 * The slot a dragged row belongs in: the index of the first row (other than the dragged one)
 * whose middle is below the pointer, counted in the list without the dragged row.
 */
export function slotAt(y: number, mids: readonly number[], dragged: number): number {
  let slot = 0;
  for (let i = 0; i < mids.length; i++) {
    if (i === dragged) continue;
    if (y > mids[i]!) slot++;
  }
  return slot;
}

/** The arrow key a keyboard move answers to, as a step (null for any other key). */
export function keyStep(key: string): number | null {
  switch (key) {
    case 'ArrowUp':
      return -1;
    case 'ArrowDown':
      return 1;
    case 'Home':
      return -Infinity;
    case 'End':
      return Infinity;
    default:
      return null;
  }
}

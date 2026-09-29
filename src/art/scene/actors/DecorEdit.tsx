/**
 * Decor edit mode (DESIGN §9.4): a dashed hit box over every placed item, which is a real button. Drag it to move it
 * (across and back to front), or with the keyboard: Arrow keys move it, F flips it, Delete or Backspace removes it.
 * Positions go back to the store as fractions of the place (`sceneToFrac`), the scene's own conversion.
 */
import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import type { EditDecor } from '../model';
import { clamp, depthOf, type RoomRows } from '../room';
import { sceneToFrac, type DecorFloor } from '../decorPlace';
import type { PlacedDecor } from '../sill/world';
import { u } from './stand';
import s from '../shelf.module.css';

/** One arrow press moves an item this far across (units) or back to front (depth). */
export const EDIT_STEP = { x: 2, depth: 0.06 } as const;

export interface DecorEditLayerProps {
  decor: readonly PlacedDecor[];
  floor: DecorFloor;
  rows: RoomRows;
  place: PlaceId;
  edit: EditDecor;
  sceneRef: { current: HTMLElement | null };
}

/** The item's name for its button. */
export function decorLabel(d: Pick<PlacedDecor, 'itemId'>): string {
  if (d.itemId.startsWith('keepsake')) return 'Keepsake';
  return getCollectible(d.itemId)?.name ?? 'Decor';
}

/** Where a key moves an item (x, depth), or null for any other key. */
export function nudge(key: string, x: number, depth: number, floor: DecorFloor): { x: number; depth: number } | null {
  if (key === 'ArrowLeft') return { x: clamp(x - EDIT_STEP.x, floor.x0, floor.x1), depth };
  if (key === 'ArrowRight') return { x: clamp(x + EDIT_STEP.x, floor.x0, floor.x1), depth };
  if (key === 'ArrowUp') return { x, depth: clamp(depth - EDIT_STEP.depth, floor.d0, floor.d1) };
  if (key === 'ArrowDown') return { x, depth: clamp(depth + EDIT_STEP.depth, floor.d0, floor.d1) };
  return null;
}

export function DecorEditLayer({ decor, floor, rows, place, edit, sceneRef }: DecorEditLayerProps) {
  return (
    <>
      {decor
        .filter((d) => !d.routine)
        .map((d) => (
          <DecorHit key={d.key} d={d} floor={floor} rows={rows} place={place} edit={edit} sceneRef={sceneRef} />
        ))}
    </>
  );
}

function DecorHit({ d, floor, rows, place, edit, sceneRef }: { d: PlacedDecor } & Omit<DecorEditLayerProps, 'decor'>) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const size = d.size * d.scale;
  const x0 = d.x + ((d.entry.bounds[0] - 50) / 100) * size;
  const w = ((d.entry.bounds[1] - d.entry.bounds[0]) / 100) * size;
  const h = size * 0.8;
  const top = d.hanging ? d.y : d.y - h;
  const unit = () => (sceneRef.current?.clientHeight ?? 100) / 100;
  const commit = (x: number, depth: number) => edit.onMove(d.key, sceneToFrac(floor, x, depth), place);
  const style: JSX.CSSProperties = {
    left: u(x0),
    top: u(top),
    width: u(Math.max(w, 6)),
    height: u(Math.max(h, 6)),
    zIndex: 4000,
    transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
  };
  return (
    <button
      type="button"
      class={s.decorHit}
      style={style}
      data-edit={d.key}
      aria-label={`${edit.label?.(d.key) || decorLabel(d)}. ${edit.hint ?? 'Arrow keys move it, F flips it, Delete removes it.'}`}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY };
        setDrag({ dx: 0, dy: 0 });
      }}
      onPointerMove={(e) => {
        if (start.current) setDrag({ dx: e.clientX - start.current.x, dy: d.hanging ? 0 : e.clientY - start.current.y });
      }}
      onPointerUp={(e) => {
        const st = start.current;
        start.current = null;
        setDrag(null);
        if (!st) return;
        const dx = (e.clientX - st.x) / unit();
        const dy = d.hanging ? 0 : (e.clientY - st.y) / unit();
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        const depth = d.hanging ? d.depth : depthOf(rows, d.y + dy);
        commit(clamp(d.x + dx, floor.x0, floor.x1), clamp(depth, floor.d0, floor.d1));
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          return edit.onFlip(d.key);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          return edit.onRemove(d.key);
        }
        const to = nudge(e.key, d.x, d.depth, floor);
        if (!to) return;
        e.preventDefault();
        e.stopPropagation();
        commit(to.x, to.depth);
      }}
    />
  );
}

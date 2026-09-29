import { useEffect, useRef } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { EMPTY, capitalise, fillLine } from '@/catalog/lines';
import { placePhrase } from '@/catalog/format';
import { CollectibleArt } from '@/art/CollectibleArt';
import type { ShelfVM } from '@/state/selectors';
import { Button } from '@/ui/Button';
import { SHELF_COPY, decorLabel, placeName } from './copy';
import { MAX_DECOR_PER_PLACE } from './model';
import { FitObject } from './FitObject';
import s from './ShelfScreen.module.css';

export interface DecorTrayProps {
  /** The place in view: new things go there. */
  place: PlaceId;
  inventory: ShelfVM['inventory'];
  /** Things already in that place (24 at most, DESIGN §8.3). */
  count: number;
  /** Things placed anywhere on the Shelf (her decor, whether or not it is all out). */
  placedAnywhere: number;
  /** The placed thing she last touched. */
  selected: ShelfVM['decor'][number] | null;
  onAdd: (itemId: string, label: string) => void;
  onFlip: (placementId: string) => void;
  onRemove: (placementId: string) => void;
  onDone: () => void;
}

/**
 * Decor edit mode (DESIGN §9.4): the scene's things become draggable buttons (Arrow keys move one,
 * F flips it, Delete puts it away); this tray adds owned decor and keepsakes to the place in view, and
 * flips or puts away the one she last touched, for touch and for anyone who prefers a button.
 */
export function DecorTray({ place, inventory, count, placedAnywhere, selected, onAdd, onFlip, onRemove, onDone }: DecorTrayProps) {
  const full = count >= MAX_DECOR_PER_PLACE;
  const where = placeName(place);
  const label = decorLabel;
  // Decorate gave way to this tray: focus comes here, to its heading.
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  return (
    <section class={s.tray} aria-labelledby="shelf-decorate">
      <div class={s.trayHead}>
        <div class={s.trayTitles}>
          <h2 id="shelf-decorate" class={s.trayTitle} ref={title} tabIndex={-1} aria-describedby="shelf-decorate-place">
            {SHELF_COPY.decor.title}
          </h2>
          <span class={s.trayPlace} id="shelf-decorate-place">
            {where} · {fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: count, total: MAX_DECOR_PER_PLACE })}
          </span>
        </div>
        <Button size="sm" icon="check" onClick={onDone}>
          {SHELF_COPY.done}
        </Button>
      </div>
      {placedAnywhere > 0 && <p class={s.trayHint}>{SHELF_COPY.decor.hint}</p>}

      {selected && (
        <div class={s.selected} role="group" aria-label={label(selected)}>
          <span class={s.selectedName}>{label(selected)}</span>
          <Button variant="secondary" size="sm" onClick={() => onFlip(selected.id)}>
            {SHELF_COPY.decor.flip}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onRemove(selected.id)}>
            {SHELF_COPY.decor.putAway}
          </Button>
        </div>
      )}

      {full && <p class={s.trayNote}>{fillLine(SHELF_COPY.decor.full, { Place: capitalise(placePhrase(place)) })}</p>}
      {inventory.length === 0 ? (
        <p class={s.trayNote}>{placedAnywhere > 0 ? SHELF_COPY.decor.allOut : EMPTY.decor}</p>
      ) : (
        <ul class={s.inventory} aria-label={fillLine(SHELF_COPY.decor.add, { place: where })}>
          {inventory.map((i) => (
            <li key={i.itemId}>
              <button type="button" class={s.invTile} disabled={full} onClick={() => onAdd(i.itemId, label(i))} aria-label={`${label(i)}${i.unplaced > 1 ? `, ${i.unplaced}` : ''}`}>
                <span class={s.invArt} aria-hidden="true">
                  {i.keepsake ? <FitObject keepsake={i.keepsake.kind} size={52} /> : <CollectibleArt id={i.itemId} size={52} px={52} animated={false} />}
                </span>
                <span class={s.invName}>{label(i)}</span>
                {i.unplaced > 1 && (
                  <span class={s.invCount} aria-hidden="true">
                    ×{i.unplaced}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

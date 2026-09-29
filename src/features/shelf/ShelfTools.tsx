import type { PlaceId } from '@/catalog/types';
import { Button } from '@/ui/Button';
import { SHELF_COPY, placeName } from './copy';
import s from './ShelfScreen.module.css';

export interface ShelfToolsProps {
  /** The places in the scene, the Sill first. */
  places: readonly PlaceId[];
  /** The place most in view (marked current). */
  inView: PlaceId;
  onGo: (place: PlaceId) => void;
  onDecorate: () => void;
  onBasket: () => void;
}

/**
 * Under the scene: a jump to each opened place (the one in view is current), and the Shelf's tools:
 * decor edit mode, and the basket and pantry. (The Field Guide has its own card below.)
 */
export function ShelfTools({ places, inView, onGo, onDecorate, onBasket }: ShelfToolsProps) {
  return (
    <div class={s.tools}>
      {places.length > 1 && (
        <nav class={s.placeNav} aria-label={SHELF_COPY.placesNav}>
          <ul>
            {places.map((id) => (
              <li key={id}>
                <button type="button" class={s.placeChip} aria-current={id === inView ? 'true' : undefined} onClick={() => onGo(id)}>
                  {placeName(id)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div class={s.toolRow}>
        <Button variant="secondary" size="sm" icon="frame" onClick={onDecorate} data-decorate>
          {SHELF_COPY.decorate}
        </Button>
        <Button variant="secondary" size="sm" icon="bowl" onClick={onBasket}>
          {SHELF_COPY.basket}
        </Button>
      </div>
    </div>
  );
}

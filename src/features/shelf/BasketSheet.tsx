import { EMPTY, PET_CARD, fillLine } from '@/catalog/lines';
import { counted } from '@/catalog/format';
import { CollectibleArt } from '@/art/CollectibleArt';
import { walletView } from '@/state/selectors';
import { bakeTray, state } from '@/state/store';
import { BAKE } from '@/domain/pantry';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { SHELF_COPY } from './copy';
import { pantryRows, type TreatRow } from './model';
import { stable } from './stable';
import s from './Sheets.module.css';

/** The basket's and the pantry's rows, kept while the treats and servings are the same. */
export const basketRows = stable(() => pantryRows(state.value.collection, state.value.pantry));

/**
 * Baking is for a treat that is running out (DESIGN §8.2: optional, never the point of the pantry):
 * offered at 1 serving or none, never for a harvest (those come from her own Blooming plants).
 */
export const canOfferBake = (t: Pick<TreatRow, 'servings' | 'harvest'>): boolean => !t.harvest && t.servings <= 1;

/** Bake a tray: 5 servings for 10 coins (DESIGN §8.2). A true line either way. */
export function bake(treat: Pick<TreatRow, 'id' | 'name'>): boolean {
  const r = bakeTray(treat.id);
  if (!r.ok) return false;
  haptic('light');
  sfx.play('pop');
  toast({ message: fillLine(PET_CARD.baked, { treat: treat.name.toLowerCase() }), tone: 'butter', key: `bake-${treat.id}` });
  return true;
}

export interface BasketSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The basket and the pantry (DESIGN §8.2, VOICE §9 Treats): harvests from her own Blooming plants,
 * and every treat she owns, each restocking 2 servings a morning (up to 5). A treat down to its last
 * serving offers "Bake a tray · 10 coins" as a quiet row action.
 */
export function BasketSheet({ open, onClose }: BasketSheetProps) {
  const rows = basketRows.value;
  const coins = walletView.value.coins;
  return (
    <Sheet open={open} onClose={onClose} title={SHELF_COPY.basketSheet.title} size="md" detents={['medium', 'large']}>
      <div class={s.body}>
        <Shelf id="basket-harvest" title={SHELF_COPY.basketSheet.basket} empty={EMPTY.basket} rows={rows.basket} coins={coins} />
        <Shelf id="basket-pantry" title={SHELF_COPY.basketSheet.pantry} empty={EMPTY.pantry} rows={rows.pantry} coins={coins} />
        {rows.pantry.length + rows.basket.length > 0 && <p class={s.note}>{SHELF_COPY.basketSheet.restock}</p>}
      </div>
    </Sheet>
  );
}

function Shelf({ id, title, empty, rows, coins }: { id: string; title: string; empty: string; rows: TreatRow[]; coins: number }) {
  return (
    <section class={s.group} aria-labelledby={id}>
      <h3 class={s.groupTitle} id={id}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p class={s.empty}>{empty}</p>
      ) : (
        // A tab stop, so the sheet scrolls from the keyboard when no row has a button.
        <ul class={s.list} tabIndex={0} aria-labelledby={id}>
          {rows.map((t) => (
            <li key={t.id} class={s.row}>
              <span class={s.rowArt} aria-hidden="true">
                <CollectibleArt id={t.id} size={44} px={44} animated={false} />
              </span>
              <span class={s.rowText}>
                <span class={s.rowName}>{t.name}</span>
                <span class={s.rowMeta}>{t.servings > 0 ? counted(t.servings, SHELF_COPY.basketSheet.servings) : SHELF_COPY.basketSheet.none}</span>
              </span>
              {canOfferBake(t) && (
                <Button variant="quiet" size="sm" disabled={coins < BAKE.coins} onClick={() => bake(t)} aria-label={`${PET_CARD.buttons.bakeTray}, ${t.name}`}>
                  {PET_CARD.buttons.bakeTray}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

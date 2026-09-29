import { EMPTY, PET_CARD, fillLine } from '@/catalog/lines';
import { counted } from '@/catalog/format';
import { CollectibleArt } from '@/art/CollectibleArt';
import { bakeTray } from '@/state/store';
import { BAKE } from '@/domain/pantry';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { SHELF_COPY } from './copy';
import type { TreatRow } from './model';
import s from './Sheets.module.css';

export interface BasketSheetProps {
  open: boolean;
  rows: { basket: TreatRow[]; pantry: TreatRow[] };
  coins: number;
  onClose: () => void;
}

/** Bake a tray: 5 servings for 10 coins (DESIGN §8.2). A true line either way. */
export function bake(treat: TreatRow): boolean {
  const r = bakeTray(treat.id);
  if (!r.ok) return false;
  haptic('light');
  sfx.play('pop');
  toast({ message: fillLine(PET_CARD.baked, { treat: treat.name.toLowerCase() }), tone: 'butter', key: `bake-${treat.id}` });
  return true;
}

/**
 * The basket and the pantry (DESIGN §8.2, VOICE §9 Treats): harvests from her own Blooming plants,
 * and every treat she owns, each restocking 2 servings a morning (up to 5), with "Bake a tray".
 */
export function BasketSheet({ open, rows, coins, onClose }: BasketSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={SHELF_COPY.basketSheet.title} size="md" detents={['medium', 'large']}>
      <div class={s.body}>
        <Shelf title={SHELF_COPY.basketSheet.basket} empty={EMPTY.basket} rows={rows.basket} coins={coins} />
        <Shelf title={SHELF_COPY.basketSheet.pantry} empty={EMPTY.pantry} rows={rows.pantry} coins={coins} />
        {rows.pantry.length + rows.basket.length > 0 && <p class={s.note}>{SHELF_COPY.basketSheet.restock}</p>}
      </div>
    </Sheet>
  );
}

function Shelf({ title, empty, rows, coins }: { title: string; empty: string; rows: TreatRow[]; coins: number }) {
  return (
    <section class={s.group}>
      <h3 class={s.groupTitle}>{title}</h3>
      {rows.length === 0 ? (
        <p class={s.empty}>{empty}</p>
      ) : (
        <ul class={s.list}>
          {rows.map((t) => (
            <li key={t.id} class={s.row}>
              <span class={s.rowArt} aria-hidden="true">
                <CollectibleArt id={t.id} size={44} px={44} animated={false} />
              </span>
              <span class={s.rowText}>
                <span class={s.rowName}>{t.name}</span>
                <span class={s.rowMeta}>{t.servings > 0 ? counted(t.servings, SHELF_COPY.basketSheet.servings) : SHELF_COPY.basketSheet.none}</span>
              </span>
              <Button variant="secondary" size="sm" disabled={coins < BAKE.coins} onClick={() => bake(t)} aria-label={`${PET_CARD.buttons.bakeTray}, ${t.name}`}>
                {PET_CARD.buttons.bakeTray}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

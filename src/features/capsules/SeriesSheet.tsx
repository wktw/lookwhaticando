import type { MachineDef, Rarity } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import { itemsInMachine } from '@/catalog/collectibles';
import { state } from '@/state/store';
import { CollectibleArt } from '@/art/CollectibleArt';
import { shade, tint } from '@/art/machines/color';
import { Sheet } from './ui/Sheet';
import { Pill } from './ui/CandyButton';
import { RARITY_LABEL } from './copy';
import s from './Sheets.module.css';

export interface SeriesSheetProps {
  machine: MachineDef;
  open: boolean;
  onClose: () => void;
}

/**
 * The series lineup card (DESIGN §13.1), like a blind-box poster: every item in the machine,
 * owned ones in color with their count, the rest as silhouettes, and the Secret kept a "?"
 * until you find it.
 */
export function SeriesSheet({ machine, open, onClose }: SeriesSheetProps) {
  const collection = state.value.collection;
  const items = itemsInMachine(machine.id);
  const owned = items.filter((i) => collection[i.id]).length;
  const byRarity = (r: Rarity) => items.filter((i) => i.rarity === r).sort((a, b) => Number(b.category === 'pet') - Number(a.category === 'pet'));
  const theme = machine.theme;
  const posterVars = {
    '--poster': tint(theme.body === '#FFFFFF' ? theme.trim : theme.body, 0.55),
    '--poster-ink': theme.ink,
    '--poster-edge': shade(theme.body === '#FFFFFF' ? theme.trim : theme.body, 0.12),
  } as Record<string, string>;

  return (
    <Sheet open={open} title="Lineup" onClose={onClose}>
      <div class={s.poster} style={posterVars}>
        <p class={s.posterKicker}>Series lineup</p>
        <p class={s.posterTitle}>{machine.name}</p>
        <p class={s.posterCount}>
          <b class="num">{owned}</b> of <span class="num">{items.length}</span> found
        </p>
      </div>

      {RARITIES.map((r) => {
        const group = byRarity(r);
        if (group.length === 0) return null;
        return (
          <section key={r} class={s.group}>
            <h3 class={s.groupHead}>
              <Pill tone={r}>{RARITY_LABEL[r]}</Pill>
              <span class={s.groupOdds}>{machine.odds[r]}% chance</span>
            </h3>
            <ul class={s.lineup}>
              {group.map((item) => {
                const have = collection[item.id];
                const secret = r === 'ultra' && !have;
                return (
                  <li key={item.id} class={[s.tile, have ? s.owned : s.missing, r === 'ultra' ? s.secretTile : ''].join(' ')}>
                    <span class={s.tileArt}>
                      {secret ? (
                        <span class={s.secretMark} aria-hidden="true">
                          ?
                        </span>
                      ) : (
                        <CollectibleArt id={item.id} size="100%" silhouette={!have} />
                      )}
                    </span>
                    <span class={s.tileName}>{secret ? 'Secret' : item.name}</span>
                    {have ? (
                      <span class={s.count}>
                        <span class="sr-only">Owned, </span>×{have.count}
                      </span>
                    ) : (
                      <span class="sr-only">Not found yet</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </Sheet>
  );
}

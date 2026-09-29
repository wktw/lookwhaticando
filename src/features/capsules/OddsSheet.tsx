import type { MachineDef } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import { itemsInMachine } from '@/catalog/collectibles';
import { NEW_ITEM_WEIGHT, PITY_RARE, PITY_ULTRA, STARDUST_FOR_DUPLICATE, STARDUST_PER_STAR, WISH_PRICE, seriesLabel } from '@/catalog/machines';
import { machineStatus } from '@/state/store';
import { Sheet } from './ui/Sheet';
import { Pill } from './ui/CandyButton';
import { pityLines, tierLabel } from './copy';
import s from './Sheets.module.css';

export interface OddsSheetProps {
  machine: MachineDef;
  open: boolean;
  onClose: () => void;
}

const TONE = { common: 'common', uncommon: 'uncommon', rare: 'rare', ultra: 'ultra' } as const;

/** One decimal, without a trailing ".0". */
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/** Transparent, generous randomness (DESIGN §3.6, §7.1), in plain words. */
export function OddsSheet({ machine, open, onClose }: OddsSheetProps) {
  const status = machineStatus(machine.id);
  const items = itemsInMachine(machine.id);
  const now = pityLines(status.rareIn, status.ultraIn);
  // "Right now" only says something when a counter has moved off its fresh value.
  const moved = (status.rareIn !== null && status.rareIn !== PITY_RARE) || (status.ultraIn !== null && status.ultraIn !== PITY_ULTRA);
  const allOwned = status.rareIn === null && status.ultraIn === null;
  const unit = machine.currency === 'stars' ? 'stamps' : 'coins';
  return (
    <Sheet open={open} title="Odds" onClose={onClose}>
      <p class={s.lead}>
        Every capsule is a surprise, and the odds are printed here. This is how {seriesLabel(machine)} works, for {machine.price} {unit} a capsule.
      </p>

      <table class={s.odds}>
        <caption class="sr-only">The chance of each tier, and of each item in it, per capsule</caption>
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">Chance</th>
            <th scope="col">Each</th>
            <th scope="col">A repeat</th>
          </tr>
        </thead>
        <tbody>
          {RARITIES.map((r) => {
            const n = items.filter((i) => i.rarity === r).length;
            return (
              <tr key={r}>
                <th scope="row">
                  <Pill tone={TONE[r]}>{tierLabel(r)}</Pill>
                  <span class={s.kinds}>{n === 1 ? '1 kind' : `${n} kinds`}</span>
                </th>
                <td class="num">{machine.odds[r]}%</td>
                <td class="num">{n ? pct(machine.odds[r] / n) : '–'}</td>
                <td class={s.nowrap}>
                  <span class="num">+{STARDUST_FOR_DUPLICATE[r]}</span> swaps
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p class={s.footnote}>Each item's chance is before new-first weighting, which only ever raises the chance of something new.</p>

      <ul class={s.promises}>
        <li>
          <b>
            A Rare within {PITY_RARE} capsules, and a Super rare within {PITY_ULTRA}
          </b>
          , on every series, each counted on its own. A guaranteed pull picks something you don't have yet whenever it can.
          {moved && now.length ? ` Right now: ${now.join('; ')}.` : ''}
          {allOwned ? ' Every Rare and Super rare here is already yours.' : ''}
        </li>
        <li>
          <b>New things first.</b> Anything you don't have yet is {NEW_ITEM_WEIGHT}× as likely as a repeat of the same tier, and after four repeats in a row the
          next capsule is new.
        </li>
        <li>
          <b>Repeats go onto the swap shelf.</b> {STARDUST_FOR_DUPLICATE.common}, {STARDUST_FOR_DUPLICATE.uncommon}, {STARDUST_FOR_DUPLICATE.rare} or{' '}
          {STARDUST_FOR_DUPLICATE.ultra} swaps, by tier, and every {STARDUST_PER_STAR} swaps make a stamp.
        </li>
        <li>
          <b>Anything can be chosen.</b> At the counter, a Special Order trades {WISH_PRICE.common} to {WISH_PRICE.ultra} stamps for any item you don't have
          yet. Seasonal items can be ordered once their season has visited.
        </li>
      </ul>
    </Sheet>
  );
}

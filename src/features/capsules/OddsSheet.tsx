import type { MachineDef } from '@/catalog/types';
import { NEW_ITEM_WEIGHT, PITY_RARE, PITY_ULTRA, STARDUST_FOR_DUPLICATE, seriesLabel } from '@/catalog/machines';
import { capsulesView, selectSeries } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { RarityPill } from '@/ui/Pill';
import { pityLines, priceLabel } from './copy';
import s from './Sheets.module.css';

export interface OddsSheetProps {
  machine: MachineDef;
  open: boolean;
  onClose: () => void;
}

/** One decimal, without a trailing ".0". */
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * The odds, printed (DESIGN §3.6, §7.1; the words are VOICE §10's). The numbers come from the
 * series view (selectSeries) and the pity from the cabinet's card (capsulesView), the same
 * sources the rest of the counter reads.
 */
export function OddsSheet({ machine, open, onClose }: OddsSheetProps) {
  const series = selectSeries(machine.id).value;
  const card = capsulesView.value.machines.find((m) => m.id === machine.id);
  const now = card ? pityLines(card.rareIn, card.ultraIn) : [];
  // "Right now" only says something when a counter has moved off its fresh value.
  const moved = !!card && ((card.rareIn !== null && card.rareIn !== PITY_RARE) || (card.ultraIn !== null && card.ultraIn !== PITY_ULTRA));
  const [classic, special, rare, superRare] = series.tiers.map((t) => STARDUST_FOR_DUPLICATE[t.rarity]);
  return (
    <Sheet open={open} title="Odds" onClose={onClose}>
      <p class={s.lead}>
        Every capsule is one of these tiers, at these odds. {seriesLabel(machine)} is {priceLabel(machine)} a capsule.
      </p>

      <table class={s.odds}>
        <caption class="sr-only">The chance of each tier, and of each thing in it, per capsule</caption>
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">Chance</th>
            <th scope="col">Each</th>
            <th scope="col">A repeat</th>
          </tr>
        </thead>
        <tbody>
          {series.tiers.map((t) => (
            <tr key={t.rarity}>
              <th scope="row">
                <RarityPill rarity={t.rarity} size="sm" />
                <span class={s.kinds}>{t.items.length === 1 ? '1 kind' : `${t.items.length} kinds`}</span>
              </th>
              <td class="num">{t.odds}%</td>
              <td class="num">{t.items.length ? pct(t.eachPct) : '–'}</td>
              <td class={s.nowrap}>
                <span class="num">+{STARDUST_FOR_DUPLICATE[t.rarity]}</span> swaps
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class={s.footnote}>Each thing’s chance is before new-first weighting, which only ever raises the chance of something new.</p>

      <ul class={s.promises}>
        <li>Things you don’t have yet are {NEW_ITEM_WEIGHT} times as likely.</li>
        <li>
          A Rare turns up within {PITY_RARE} capsules, and a Super rare within {PITY_ULTRA}.
          {moved && now.length ? ` Right now: ${now.join(' ')}` : ''}
        </li>
        <li>Once every Rare in a series is yours, that count goes away.</li>
        <li>After 4 repeats in a row, the next one is always new.</li>
        <li>
          Ones you already had go on the swap shelf: {classic}, {special}, {rare} or {superRare} swaps, by tier. Every 10 swaps make a stamp.
        </li>
        <li>Each series has one Secret, shown as a ? until it turns up.</li>
      </ul>
    </Sheet>
  );
}

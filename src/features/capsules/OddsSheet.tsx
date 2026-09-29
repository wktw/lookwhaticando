import type { MachineDef } from '@/catalog/types';
import { RARITIES } from '@/catalog/types';
import { NEW_ITEM_WEIGHT, PITY_RARE, PITY_ULTRA, STARDUST_FOR_DUPLICATE, STARDUST_PER_STAR, WISH_PRICE } from '@/catalog/machines';
import { machineStatus } from '@/state/store';
import { Sheet } from './ui/Sheet';
import { Pill } from './ui/CandyButton';
import { RARITY_LABEL } from './copy';
import s from './Sheets.module.css';

export interface OddsSheetProps {
  machine: MachineDef;
  open: boolean;
  onClose: () => void;
}

/** Transparent, generous randomness (DESIGN §3.6, §6.3–6.4), said plainly and kindly. */
export function OddsSheet({ machine, open, onClose }: OddsSheetProps) {
  const status = machineStatus(machine.id);
  return (
    <Sheet open={open} title="Odds & promises" onClose={onClose}>
      <p class={s.lead}>Every capsule is a surprise, never a mystery. Here's exactly how {machine.name} works.</p>

      <table class={s.odds}>
        <caption class="sr-only">Chance of each rarity per pull</caption>
        <thead>
          <tr>
            <th scope="col">Rarity</th>
            <th scope="col">Chance</th>
            <th scope="col">If it's a repeat</th>
          </tr>
        </thead>
        <tbody>
          {RARITIES.map((r) => (
            <tr key={r}>
              <th scope="row">
                <Pill tone={r}>{RARITY_LABEL[r]}</Pill>
              </th>
              <td class="num">{machine.odds[r]}%</td>
              <td>
                <span class="num">+{STARDUST_FOR_DUPLICATE[r]}</span> stardust
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul class={s.promises}>
        <li>
          <span aria-hidden="true">✨</span>
          <p>
            <b>Rare or better at least every {PITY_RARE} pulls</b> on each machine, and its Secret within {PITY_ULTRA}. Right now: Rare+ within{' '}
            <b class="num">{status.rareIn}</b>, the Secret within <b class="num">{status.ultraIn}</b>.
          </p>
        </li>
        <li>
          <span aria-hidden="true">🌱</span>
          <p>
            <b>New things come first.</b> Anything you don't own yet is {NEW_ITEM_WEIGHT}× as likely as a repeat of the same rarity.
          </p>
        </li>
        <li>
          <span aria-hidden="true">💫</span>
          <p>
            <b>Repeats still count.</b> They turn into stardust, and every {STARDUST_PER_STAR} stardust fuses into a star. A repeat friend also visits their
            twin for extra friendship.
          </p>
        </li>
        <li>
          <span aria-hidden="true">⭐</span>
          <p>
            <b>You can always choose.</b> The Wishing Well trades stars for any item you're missing ({WISH_PRICE.common}–{WISH_PRICE.ultra} stars), seasonal
            ones too, any time of year.
          </p>
        </li>
      </ul>
    </Sheet>
  );
}

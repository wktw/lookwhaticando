import type { MachineDef } from '@/catalog/types';
import { capsulesView, selectSeries } from '@/state/selectors';
import { CoinIcon, StampIcon } from '@/art/icons';
import { pillFace } from '@/art/machines/theme';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { collectedLabel, currencyWord, luckyLabel, monthDayOfKey, pityLines } from './copy';
import s from './CapsulesScreen.module.css';

export interface MachineInfoProps {
  machine: MachineDef;
  onLineup: () => void;
  onOdds: () => void;
  onOrder: () => void;
}

/**
 * The series beside its cabinet: name, price, what's in the Field Guide, pity, the lucky meter,
 * and the sheets. Everything it says comes from the cabinet's card in capsulesView (and the
 * series view for the counts), the same numbers the rest of the counter reads.
 */
export function MachineInfo({ machine, onLineup, onOdds, onOrder }: MachineInfoProps) {
  const card = capsulesView.value.machines.find((m) => m.id === machine.id);
  const series = selectSeries(machine.id).value;
  const pct = series.total ? Math.round((series.owned / series.total) * 100) : 0;
  const pity = card ? pityLines(card.rareIn, card.ultraIn) : [];
  const until = card?.seasonal?.until ? `until ${monthDayOfKey(card.seasonal.until)}` : null;
  const lucky = Math.max(0, Math.min(4, card?.luckyPips ?? 0));

  return (
    <section class={s.info} aria-labelledby={`info-${machine.id}`}>
      <p class={s.infoKicker}>{machine.number ?? (until ? `Seasonal edition · ${until}` : 'Seasonal edition')}</p>
      <h2 id={`info-${machine.id}`} class={s.infoTitle}>
        {machine.name}
      </h2>
      <p class={s.tagline}>{machine.tagline}</p>

      <div class={s.facts}>
        {card?.free ? (
          <Pill tone="sage" icon={<CoinIcon size={16} />}>
            Your first capsule is on the house
          </Pill>
        ) : (
          <Pill tone="butter" icon={machine.currency === 'stars' ? <StampIcon size={16} /> : <CoinIcon size={16} />}>
            <span class="num">{machine.price}</span> {currencyWord(machine)}
          </Pill>
        )}
        {machine.id === 'night' && <Pill tone="lavender">Better odds, paid in stamps.</Pill>}
        {series.complete && <Pill tone="sage">Every one collected</Pill>}
      </div>

      <div class={s.series}>
        <p class={s.seriesHead}>{collectedLabel(series.owned, series.total)}</p>
        <div
          class={s.bar}
          role="progressbar"
          aria-label={`${machine.name} in the Field Guide`}
          aria-valuemin={0}
          aria-valuemax={series.total}
          aria-valuenow={series.owned}
          aria-valuetext={collectedLabel(series.owned, series.total)}
        >
          <span style={{ width: `${pct}%`, background: pillFace(machine) }} />
        </div>
      </div>

      <ul class={s.promises}>
        {pity.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li class={s.lucky}>
          <span class={s.luckyDots} aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} class={i < lucky ? s.dotOn : s.dotOff} />
            ))}
          </span>
          {luckyLabel(lucky)}
        </li>
      </ul>

      <div class={s.infoActions}>
        <Button variant="secondary" size="sm" onClick={onOdds}>
          Odds
        </Button>
        <Button variant="secondary" size="sm" onClick={onLineup}>
          The lineup
        </Button>
        <Button variant="secondary" size="sm" onClick={onOrder}>
          Special Order
        </Button>
      </div>
    </section>
  );
}

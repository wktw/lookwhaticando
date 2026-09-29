import type { MachineDef } from '@/catalog/types';
import { machineStatus } from '@/state/store';
import { CoinIcon, StarIcon } from '@/art/icons';
import { untilLabel } from '@/art/machines/CabinetArt';
import { pillFace } from '@/art/machines/theme';
import { PillButton, Pill } from './ui/CandyButton';
import { collectedLabel, currencyWord, luckyLabel, pityLines } from './copy';
import s from './CapsulesScreen.module.css';

export interface MachineInfoProps {
  machine: MachineDef;
  onLineup: () => void;
  onOdds: () => void;
  onOrder: () => void;
}

/** The series beside its cabinet: name, price, what's collected, pity, the lucky meter, and the sheets. */
export function MachineInfo({ machine, onLineup, onOdds, onOrder }: MachineInfoProps) {
  const status = machineStatus(machine.id);
  const pct = status.total ? Math.round((status.owned / status.total) * 100) : 0;
  const pity = pityLines(status.rareIn, status.ultraIn);
  const until = untilLabel(machine);
  const lucky = Math.max(0, Math.min(4, status.dupStreak));

  return (
    <section class={s.info} aria-labelledby={`info-${machine.id}`}>
      <p class={s.infoKicker}>{machine.number ?? `Seasonal edition · ${until ?? ''}`}</p>
      <h2 id={`info-${machine.id}`} class={s.infoTitle}>
        {machine.name}
      </h2>
      <p class={s.tagline}>{machine.tagline}</p>

      <div class={s.facts}>
        <Pill tone="butter">
          {machine.currency === 'stars' ? <StarIcon size={16} /> : <CoinIcon size={16} />}
          <span class="num">{machine.price}</span> {currencyWord(machine)} a capsule
        </Pill>
        {status.complete && <Pill tone="sage">Every one collected</Pill>}
      </div>

      <div class={s.series}>
        <p class={s.seriesHead}>{collectedLabel(status.owned, status.total)}</p>
        <div
          class={s.bar}
          role="progressbar"
          aria-label={`${machine.name} collected`}
          aria-valuemin={0}
          aria-valuemax={status.total}
          aria-valuenow={status.owned}
          aria-valuetext={collectedLabel(status.owned, status.total)}
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
          {luckyLabel(status.dupStreak)}
        </li>
      </ul>

      <div class={s.infoActions}>
        <PillButton variant="secondary" size="sm" onClick={onLineup}>
          Lineup
        </PillButton>
        <PillButton variant="secondary" size="sm" onClick={onOdds}>
          Odds
        </PillButton>
        <PillButton variant="secondary" size="sm" onClick={onOrder}>
          Special Order
        </PillButton>
      </div>
    </section>
  );
}

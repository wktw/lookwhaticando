import { useMemo } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { itemsInMachine } from '@/catalog/collectibles';
import { machineStatus, state } from '@/state/store';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CoinIcon, Icon, StarIcon } from '@/art/icons';
import { Pill } from './ui/CandyButton';
import { currencyWord, machineCandy, monthDay, pityHint, priceLabel } from './copy';
import s from './CapsulesScreen.module.css';

export interface MachineInfoProps {
  machine: MachineDef;
  onLineup: () => void;
  onOdds: () => void;
}

/** Name, tagline, price, series progress, pity hint, season, and the Lineup / Odds entry points. */
export function MachineInfo({ machine, onLineup, onOdds }: MachineInfoProps) {
  const status = machineStatus(machine.id);
  const collection = state.value.collection;
  const items = useMemo(() => itemsInMachine(machine.id), [machine.id]);
  // Three teasers for the lineup card: owned ones first, the Secret never spoiled.
  const teasers = useMemo(
    () => [...items.filter((i) => i.rarity !== 'ultra')].sort((a, b) => Number(!!collection[b.id]) - Number(!!collection[a.id])).slice(0, 3),
    [items, collection],
  );
  const pct = status.total ? Math.round((status.owned / status.total) * 100) : 0;

  return (
    <section class={s.info} aria-labelledby={`info-${machine.id}`} style={{ '--accent-theme': machineCandy(machine).lip } as Record<string, string>}>
      {machine.seasonal && (
        <Pill tone="butter" class={s.season}>
          <span aria-hidden="true">{machine.seasonal.emoji}</span> In season · until {monthDay(machine.seasonal.end)}
        </Pill>
      )}
      <div class={s.infoHead}>
        <h2 id={`info-${machine.id}`} class={s.infoTitle}>
          {machine.name}
        </h2>
        <button type="button" class={s.oddsButton} onClick={onOdds}>
          <Icon name="info" size={18} />
          Odds
        </button>
      </div>
      <p class={s.tagline}>{machine.tagline}</p>

      <div class={s.facts}>
        <Pill tone="butter" title={priceLabel(machine)}>
          {machine.currency === 'stars' ? <StarIcon size={18} /> : <CoinIcon size={18} />}
          <span class="num">{machine.price}</span>
          <span class="sr-only"> {currencyWord(machine)} per pull</span>
        </Pill>
        <Pill tone="rare">{pityHint(status.rareIn)}</Pill>
      </div>

      <div class={s.series}>
        <div class={s.seriesHead}>
          <span>
            Series <b class="num">{status.owned}</b>
            <span class={s.muted}> / {status.total}</span>
          </span>
          {status.complete && <span class={s.complete}>Set complete ✓</span>}
        </div>
        <div class={s.bar} role="progressbar" aria-label={`${machine.name} series`} aria-valuemin={0} aria-valuemax={status.total} aria-valuenow={status.owned}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <button type="button" class={s.lineupButton} onClick={onLineup}>
        <span class={s.lineupText}>
          <b>See the lineup</b>
          <small>Every friend in the series</small>
        </span>
        <span class={s.teasers} aria-hidden="true">
          {teasers.map((t) => (
            <span key={t.id} class={s.teaser}>
              <CollectibleArt id={t.id} size="100%" silhouette={!collection[t.id]} />
            </span>
          ))}
          <span class={`${s.teaser} ${s.teaserSecret}`}>?</span>
        </span>
        <Icon name="chevron-right" size={20} />
      </button>
    </section>
  );
}

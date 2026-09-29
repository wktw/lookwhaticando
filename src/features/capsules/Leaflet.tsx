import type { JSX } from 'preact';
import type { MachineDef } from '@/catalog/types';
import { seriesLabel } from '@/catalog/machines';
import { state } from '@/state/store';
import { CollectibleArt } from '@/art/CollectibleArt';
import { collectedLabel, tierLabel } from './copy';
import { byTier, leafletEntries, type LeafletEntry } from './leaflet';
import { cx } from './ui/CandyButton';
import s from './Leaflet.module.css';

/** A printed tick box: empty, or ticked. */
function Tick({ on }: { on: boolean }) {
  return (
    <svg class={s.tickBox} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <rect x={0.75} y={0.75} width={10.5} height={10.5} rx={2} fill="none" stroke="currentColor" stroke-width={1.1} opacity={0.55} />
      {on && <path d="M2.8 6.2 5 8.4 9.4 3.4" fill="none" stroke="currentColor" stroke-width={1.6} stroke-linecap="round" stroke-linejoin="round" />}
    </svg>
  );
}

/** A small tick on a paper disc, for the corner of a collected cell. */
function CellTick() {
  return (
    <svg class={s.cellTick} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <circle cx={6} cy={6} r={6} style={{ fill: 'var(--paper)' }} />
      <path d="M3.2 6.2 5.1 8.1 8.9 3.9" fill="none" style={{ stroke: 'var(--print)' }} stroke-width={1.7} stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** The Secret's one four-point sparkle (the same mark as the reveal card's). */
export function LeafletSparkle() {
  return (
    <svg class={s.sparkle} viewBox="-10 -10 20 20" aria-hidden="true" focusable="false">
      <path d="M0 -9C0.8 -2.4 2.4 -0.8 9 0 2.4 0.8 0.8 2.4 0 9-0.8 2.4-2.4 0.8-9 0-2.4-0.8-0.8-2.4 0-9Z" fill="currentColor" />
    </svg>
  );
}

function paperVars(machine: MachineDef): JSX.CSSProperties {
  return { '--leaf-paper': machine.theme.trim, '--leaf-ink': machine.theme.ink, '--leaf-accent': machine.theme.body } as JSX.CSSProperties;
}

function entryLabel(e: LeafletEntry): string {
  const name = e.hidden ? 'the Secret, not found yet' : e.item.name;
  return `${e.number}, ${name}${e.count ? `, collected${e.count > 1 ? `, ${e.count}` : ''}` : ''}`;
}

/**
 * The small paper leaflet that stands beside a cabinet (DESIGN §7.1): the numbered lineup as a
 * checklist, ticked for what you have, a "?" for the Secret until it's pulled, and the tiers
 * printed Classic / Special / Rare / Super rare. Tapping it opens the full leaflet.
 */
export function LeafletCard({ machine, onOpen }: { machine: MachineDef; onOpen: () => void }) {
  const entries = leafletEntries(machine.id, state.value.collection);
  const owned = entries.filter((e) => e.count > 0).length;
  return (
    <button
      type="button"
      class={s.card}
      style={paperVars(machine)}
      onClick={onOpen}
      aria-label={`Lineup leaflet, ${collectedLabel(owned, entries.length)}. Open the lineup.`}
    >
      <span class={s.kicker}>{machine.number ? `${machine.number} · Lineup` : 'Lineup'}</span>
      <span class={s.name}>{machine.name.replace(/ Edition$/, '')}</span>
      <span class={s.count}>{collectedLabel(owned, entries.length)}</span>
      {byTier(entries).map((g) => (
        <span key={g.tier} class={s.group}>
          <span class={s.tier}>{tierLabel(g.tier)}</span>
          <span class={s.cells}>
            {g.entries.map((e) => (
              <span key={e.item.id} class={cx(s.cell, e.count > 0 && s.cellOn, e.hidden && s.cellSecret)}>
                {e.hidden ? '?' : e.number}
                {e.hidden && <LeafletSparkle />}
                {e.count > 0 && <CellTick />}
              </span>
            ))}
          </span>
        </span>
      ))}
    </button>
  );
}

/** The leaflet, full size (the Lineup sheet): every item printed with its number and a tick box. */
export function LeafletFull({ machine }: { machine: MachineDef }) {
  const entries = leafletEntries(machine.id, state.value.collection);
  const owned = entries.filter((e) => e.count > 0).length;
  return (
    <div class={s.full} style={paperVars(machine)}>
      <header class={s.fullHead}>
        <p class={s.kicker}>{machine.number ? `${seriesLabel(machine)} · Lineup` : `${machine.name} · Lineup`}</p>
        <p class={s.fullName}>{machine.name}</p>
        <p class={s.fullCount}>{collectedLabel(owned, entries.length)} · one Secret · each about the size of your thumb</p>
      </header>
      {byTier(entries).map((g) => (
        <section key={g.tier} class={s.fullGroup} aria-label={tierLabel(g.tier)}>
          <h3 class={s.fullTier}>
            {tierLabel(g.tier)} <span class={s.odds}>{machine.odds[g.tier]}%</span>
          </h3>
          <ul class={s.items}>
            {g.entries.map((e) => (
              <li key={e.item.id} class={cx(s.item, e.count > 0 && s.itemOn)} aria-label={entryLabel(e)}>
                <span class={s.itemArt} aria-hidden="true">
                  {e.hidden ? (
                    <span class={s.secretMark}>
                      ?
                      <LeafletSparkle />
                    </span>
                  ) : <CollectibleArt id={e.item.id} size="100%" />}
                </span>
                <span class={s.itemText} aria-hidden="true">
                  <span class={s.itemNo}>{e.number}</span>
                  <span class={s.itemName}>{e.hidden ? 'Secret' : e.item.name}</span>
                </span>
                <span class={s.itemTick} aria-hidden="true">
                  <Tick on={e.count > 0} />
                  {e.count > 1 && <span class={s.times}>×{e.count}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

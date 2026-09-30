import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MACHINES, MACHINE_BY_ID, getMachine } from '@/catalog/machines';
import type { MachineDef, MachineId } from '@/catalog/types';
import { capsulesView } from '@/state/selectors';
import type { PendingReveal } from '@/state/types';
import { finishReveal, saveEpoch, state } from '@/state/store';
import { MachineCarousel } from './MachineCarousel';
import { MachineInfo } from './MachineInfo';
import { WalletStrip } from './WalletStrip';
import { LineupSheet } from './LineupSheet';
import { OddsSheet } from './OddsSheet';
import { SpecialOrderSheet } from './SpecialOrder';
import { RevealOverlay, type PlaceHandlers } from './RevealOverlay';
import { useSceneLight } from './sceneLight';
import { capsuleShell, revealFromPending, type RevealData } from './reveal';
import s from './CapsulesScreen.module.css';

/** The cabinet you were last looking at, kept while you visit other tabs. */
const lastMachine = signal<string>(MACHINES[0]!.id);

type SheetName = 'lineup' | 'odds' | 'order' | null;

/** Cabinets on the counter today (capsulesView): every numbered series, and the seasonal edition in season. */
export function availableCabinets(): MachineDef[] {
  return capsulesView.value.machines.map((m) => getMachine(m.id));
}

/** Cabinets whose next capsule is the free first one (onboarding's "Not yet, I'll earn it" left it waiting). */
export function freeCabinets(): ReadonlySet<MachineId> {
  return new Set(capsulesView.value.machines.filter((m) => m.free).map((m) => m.id));
}

const shellOf = (p: PendingReveal) => capsuleShell(MACHINE_BY_ID.get(p.machineId)?.theme.capsules ?? ['#DDD4F1', '#F6E6B4'], 0);

/** An order's reveal on show, and the save it was shown in (`saveEpoch`). */
type Ordered = { data: RevealData; epoch: number };

/** A Special Order the store committed but whose reveal never finished (a reload mid-reveal): "Your order: a Siamese." */
function unfinishedOrder(): Ordered | null {
  const p = state.value.pendingReveal;
  if (!p?.order) return null;
  const data = revealFromPending(p, shellOf(p));
  return data ? { data, epoch: saveEpoch.value } : null;
}

/**
 * A capsule the store committed but that was never opened (commit before animate, §7.1), whichever
 * cabinet it came from: the counter opens on that cabinet, whose machine then shows it, or, when
 * the cabinet has left the counter since (its season ended), shows it over the counter itself
 * (integration-i3). The store's pendingReveal is the only authority for it (WP-A8).
 */
function unfinishedReveal(machines: readonly MachineDef[]): { pending: PendingReveal; onCounter: boolean } | null {
  const p = state.value.pendingReveal;
  if (!p || p.order) return null;
  return { pending: p, onCounter: machines.some((m) => m.id === p.machineId) };
}

/**
 * The Capsules screen (DESIGN §9.3): the wallet strip, the cabinet carousel with each lineup
 * leaflet, the series info (price, collected, pity, the lucky meter), and the Odds, Lineup and
 * Special Order sheets. Cabinet and info sit side by side on wide screens.
 */
export function CapsulesScreen({ onPlace, onLetThemChoose }: PlaceHandlers & { children?: ComponentChildren }) {
  const light = useSceneLight();
  const machines = availableCabinets();
  const free = freeCabinets();
  const epoch = saveEpoch.value;
  const waiting = unfinishedReveal(machines);
  // A capsule waits in a cabinet on the counter: open on that one, not on the last one you looked at.
  const arrived = useRef(false);
  if (!arrived.current) {
    arrived.current = true;
    if (waiting?.onCounter) lastMachine.value = waiting.pending.machineId;
  }
  // …and the same when another save comes in while the counter is open.
  useEffect(() => {
    const w = unfinishedReveal(availableCabinets());
    if (w?.onCounter && lastMachine.peek() !== w.pending.machineId) lastMachine.value = w.pending.machineId;
  }, [epoch]);
  const found = machines.findIndex((m) => m.id === lastMachine.value);
  const index = found < 0 ? 0 : found;
  const machine = machines[index]!;
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [ordered, setOrdered] = useState<Ordered | null>(unfinishedOrder);
  const orderButton = useRef<HTMLElement | null>(null);

  // A capsule whose cabinet has left the counter: shown here, until it has been opened once.
  const away = waiting && !waiting.onCounter ? waiting.pending : null;
  const awayKey = away ? `${epoch}:${away.machineId}:${away.itemId}:${away.at}` : null;
  const [closedAway, setClosedAway] = useState<string | null>(null);
  const awayReveal = useMemo(() => (away ? revealFromPending(away, shellOf(away)) : null), [awayKey]);

  return (
    <section class={s.screen} aria-labelledby="capsules-title">
      <header class={s.header}>
        <h1 id="capsules-title" class={s.title}>
          Capsules
        </h1>
        <WalletStrip />
      </header>

      <div class={s.layout}>
        <div class={s.machineCol}>
          <MachineCarousel
            machines={machines}
            index={index}
            onIndex={(i) => (lastMachine.value = machines[i]!.id)}
            busy={busy}
            onBusyChange={setBusy}
            onLineup={() => setSheet('lineup')}
            light={light}
            free={free}
            onPlace={onPlace}
            onLetThemChoose={onLetThemChoose}
          />
        </div>
        <div class={s.infoCol}>
          <MachineInfo
            machine={machine}
            onLineup={() => setSheet('lineup')}
            onOdds={() => setSheet('odds')}
            onOrder={() => {
              orderButton.current = document.activeElement as HTMLElement | null;
              setSheet('order');
            }}
          />
          <p class={s.pastSeasons}>Seasonal editions come back every year. Once one has visited, its things can be ordered at the counter any time.</p>
        </div>
      </div>

      <LineupSheet machine={machine} open={sheet === 'lineup'} onClose={() => setSheet(null)} />
      <OddsSheet machine={machine} open={sheet === 'odds'} onClose={() => setSheet(null)} />
      <SpecialOrderSheet
        open={sheet === 'order'}
        machineId={machine.id}
        onClose={() => setSheet(null)}
        onOrdered={(r) => {
          // The reveal opens over the sheet as it slides away; focus comes home to Special Order.
          setSheet(null);
          setOrdered({ data: r, epoch: saveEpoch.peek() });
        }}
      />
      {away && awayReveal && awayKey !== closedAway && (
        <RevealOverlay
          key={awayKey}
          data={awayReveal}
          light={light}
          onClose={() => {
            // Only this capsule, in the save it was shown in; every way out lands here.
            finishReveal({ machineId: away.machineId, itemId: away.itemId, at: away.at, epoch });
            setClosedAway(awayKey);
          }}
          onPlace={onPlace}
          onLetThemChoose={onLetThemChoose}
        />
      )}
      {ordered && (
        <RevealOverlay
          data={ordered.data}
          light={light}
          onClose={() => {
            // Placing it and "Let {name} choose" close the reveal first, so every way out lands here.
            // Only the order's reveal, and only in the save it was shown in.
            finishReveal({ itemId: ordered.data.itemId, order: true, epoch: ordered.epoch });
            setOrdered(null);
          }}
          returnFocus={() => orderButton.current}
          onPlace={onPlace}
          onLetThemChoose={onLetThemChoose}
        />
      )}
    </section>
  );
}

import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { useRef, useState } from 'preact/hooks';
import { MACHINES } from '@/catalog/machines';
import { today } from '@/state/store';
import { machineAvailability } from '@/domain/seasons';
import { MachineCarousel } from './MachineCarousel';
import { MachineInfo } from './MachineInfo';
import { WalletStrip } from './WalletStrip';
import { LineupSheet } from './LineupSheet';
import { OddsSheet } from './OddsSheet';
import { SpecialOrderSheet } from './SpecialOrder';
import { RevealOverlay, type PlaceHandlers } from './RevealOverlay';
import { inSeason } from './season';
import { useSceneLight } from './sceneLight';
import type { RevealData } from './reveal';
import s from './CapsulesScreen.module.css';

/** The cabinet you were last looking at, kept while you visit other tabs. */
const lastMachine = signal<string>(MACHINES[0]!.id);

type SheetName = 'lineup' | 'odds' | 'order' | null;

/** Cabinets on the counter today: every numbered series, and the seasonal edition in season. */
export function availableCabinets(dateKey: string = today.value) {
  return MACHINES.filter((m) => machineAvailability(m.id, dateKey).available && inSeason(m, dateKey));
}

/**
 * The Capsules screen (DESIGN §9.3): the wallet strip, the cabinet carousel with each lineup
 * leaflet, the series info (price, collected, pity, the lucky meter), and the Odds, Lineup and
 * Special Order sheets. Cabinet and info sit side by side on wide screens.
 */
export function CapsulesScreen({ onPlace, onLetThemChoose }: PlaceHandlers & { children?: ComponentChildren }) {
  const light = useSceneLight();
  const machines = availableCabinets();
  const found = machines.findIndex((m) => m.id === lastMachine.value);
  const index = found < 0 ? 0 : found;
  const machine = machines[index]!;
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [ordered, setOrdered] = useState<RevealData | null>(null);
  const orderButton = useRef<HTMLElement | null>(null);

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
          <p class={s.pastSeasons}>Seasonal editions come back every year. Once a season has visited, its lineup can be ordered at the counter any time.</p>
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
          setOrdered(r);
        }}
      />
      {ordered && (
        <RevealOverlay
          data={ordered}
          light={light}
          onClose={() => setOrdered(null)}
          returnFocus={() => orderButton.current}
          onPlace={onPlace}
          onLetThemChoose={onLetThemChoose}
        />
      )}
    </section>
  );
}

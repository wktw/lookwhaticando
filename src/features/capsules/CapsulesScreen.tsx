import { signal } from '@preact/signals';
import { useRef, useState } from 'preact/hooks';
import { MACHINES } from '@/catalog/machines';
import { machineStatus } from '@/state/store';
import { MachineCarousel } from './MachineCarousel';
import { MachineInfo } from './MachineInfo';
import { WalletStrip } from './WalletStrip';
import { SeriesSheet } from './SeriesSheet';
import { OddsSheet } from './OddsSheet';
import { WishingWellCard, WishingWellSheet } from './WishingWell';
import { RevealOverlay } from './RevealOverlay';
import type { RevealData } from './reveal';
import s from './CapsulesScreen.module.css';

/** The machine you were last looking at, kept while you visit other tabs. */
const lastMachine = signal<string>(MACHINES[0]!.id);

type SheetName = 'lineup' | 'odds' | 'wish' | null;

/**
 * Capsules tab (DESIGN §9.3): wallet, the machine carousel with the pull, the machine's
 * series info, and the Wishing Well. Side by side on wide screens.
 */
export function CapsulesScreen() {
  const machines = MACHINES.filter((m) => machineStatus(m.id).available);
  const found = machines.findIndex((m) => m.id === lastMachine.value);
  const index = found < 0 ? 0 : found;
  const machine = machines[index]!;
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [granted, setGranted] = useState<RevealData | null>(null);
  const wishButton = useRef<HTMLButtonElement>(null);

  return (
    <section class={s.screen} aria-labelledby="capsules-title">
      <header class={s.header}>
        <h1 id="capsules-title">Capsules</h1>
        <WalletStrip />
      </header>

      <div class={s.layout}>
        <div class={s.machineCol}>
          <MachineCarousel machines={machines} index={index} onIndex={(i) => (lastMachine.value = machines[i]!.id)} busy={busy} onBusyChange={setBusy} />
        </div>
        <div class={s.infoCol}>
          <MachineInfo machine={machine} onLineup={() => setSheet('lineup')} onOdds={() => setSheet('odds')} />
          <WishingWellCard onOpen={() => setSheet('wish')} buttonRef={wishButton} />
          <p class={s.pastSeasons}>
            <span aria-hidden="true">🍂</span> Seasonal series come back every year, and their friends can be wished for any time.
          </p>
        </div>
      </div>

      <SeriesSheet machine={machine} open={sheet === 'lineup'} onClose={() => setSheet(null)} />
      <OddsSheet machine={machine} open={sheet === 'odds'} onClose={() => setSheet(null)} />
      <WishingWellSheet
        open={sheet === 'wish'}
        machineId={machine.id}
        onClose={() => setSheet(null)}
        onGranted={(r) => {
          // The reveal opens over the sheet as it slides away; focus comes home to the well card.
          setSheet(null);
          setGranted(r);
        }}
      />
      {granted && <RevealOverlay data={granted} onClose={() => setGranted(null)} returnFocus={() => wishButton.current} />}
    </section>
  );
}

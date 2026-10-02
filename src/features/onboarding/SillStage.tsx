/**
 * The sill at the top of onboarding's first three steps: the Today band, pinned to morning light
 * ("An empty sill in morning light", DESIGN §9.6). Her picks stand on it as cuttings in water
 * glasses with their paper tags; once they are planted, they are the real habits, and step 3's
 * waterings pour onto them and drop coins into the jar (`stageBand`).
 */
import { plantPresentation } from '@/state/views/plantPresentation';
import { createRef } from 'preact';
import { useMemo } from 'preact/hooks';
import { WindowsillBand, momentAt, type WindowsillBandHandle } from '@/art/scene';
import type { SillPot } from '@/art/scene';
import type { PlantSpeciesId } from '@/catalog/types';
import { hemisphereOf } from '@/domain/hemisphere';
import { state, today, now, storeLocal } from '@/state/store';
import s from './Onboarding.module.css';

export interface StagePot {
  habitId: string;
  name: string;
  species: PlantSpeciesId;
}

/** The band's handle, for step 3's choreography (pour, coin to the jar). */
export const stageBand = createRef<WindowsillBandHandle>();

/** Half past eight: the new place in morning light, whatever the hour. */
function morning(hemisphere: 'north' | 'south') {
  const d = new Date();
  d.setHours(8, 30, 0, 0);
  return momentAt(d, hemisphere);
}

function tz(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function SillStage({ pots, habitIds }: { pots: StagePot[] | null; habitIds: string[] }) {
  const app = state.value;
  const hemisphere = hemisphereOf(app, tz());
  const moment = useMemo(() => morning(hemisphere), [hemisphere]);
  const day = today.value;
  const sill: SillPot[] = pots
    ? pots.map((p) => ({ habitId: p.habitId, name: p.name, species: p.species, stage: 0, pot: 'terracotta' }))
    : habitIds
        .map((id) => app.habits.find((h) => h.id === id))
        .filter((h): h is NonNullable<typeof h> => !!h)
        .map((h) => {
          const log = app.logs[h.id]?.[day];
          const damp = !!log && log.kind === 'log' && log.count > 0;
          const { resident: _resident, ...plant } = plantPresentation(app, h.id, { today: day, now: now.value, local: storeLocal() })!;
          return { habitId: h.id, name: h.name, ...plant, damp };
        });
  return (
    <div class={s.sill}>
      <WindowsillBand ref={stageBand} pots={sill} coins={app.wallet.coins} moment={moment} hemisphere={hemisphere} tags />
    </div>
  );
}

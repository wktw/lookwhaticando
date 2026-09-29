import { useState } from 'preact/hooks';
import type { MachineId } from '@/catalog/types';
import { getMachine, seriesLabel } from '@/catalog/machines';
import { FIRST_CAPSULE_MACHINES } from '@/domain/gacha';
import { CabinetArt } from '@/art/machines/CabinetArt';
import { CapsuleMachine } from './CapsuleMachine';
import type { PlaceHandlers } from './RevealOverlay';
import { useSceneLight } from './sceneLight';
import s from './FirstPick.module.css';

export interface FirstPickProps extends PlaceHandlers {
  /** The first capsule has been opened and put away: onboarding moves on. */
  onDone?: (machineId: MachineId) => void;
}

/**
 * Onboarding's first pick (DESIGN §1 "Many animals", §9.6 step 4): the first-capsule cabinets
 * (the domain's FIRST_CAPSULE_MACHINES: Cats · Cows · Dogs · Pond), in a 2×2 grid on a phone and
 * a row on wide screens. Choosing one brings it forward for the first capsule, which is on the
 * house (`pull(id, { free: true })`): a coin in, the handle, the twist.
 */
export function FirstPick({ onDone, onPlace, onLetThemChoose }: FirstPickProps) {
  const light = useSceneLight();
  const [picked, setPicked] = useState<MachineId | null>(null);

  if (picked) {
    return (
      <section class={s.pick} aria-label={`${seriesLabel(getMachine(picked))}, your first capsule`}>
        <CapsuleMachine
          machine={getMachine(picked)}
          active
          free
          light={light}
          onPlace={onPlace}
          onLetThemChoose={onLetThemChoose}
          onRevealClosed={() => onDone?.(picked)}
        />
      </section>
    );
  }

  return (
    <section class={s.pick} aria-labelledby="first-pick-title">
      <h2 id="first-pick-title" class={s.title}>
        Who comes home first?
      </h2>
      <p class={s.lead}>Your first capsule is on the house. Choose a cabinet.</p>
      <div class={s.row}>
        {FIRST_CAPSULE_MACHINES.map((id) => {
          const m = getMachine(id);
          return (
            <button key={id} type="button" class={s.cabinet} onClick={() => setPicked(id)} aria-label={`${seriesLabel(m)}. ${m.tagline}`}>
              {/* The first capsule is on the house, so no price is printed on the cabinet. */}
              <CabinetArt machine={m} light={light} price={null} />
              <span class={s.tagline}>{m.tagline}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}


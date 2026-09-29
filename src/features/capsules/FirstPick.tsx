import { useState } from 'preact/hooks';
import type { MachineId } from '@/catalog/types';
import { getMachine, seriesLabel } from '@/catalog/machines';
import { CabinetArt } from '@/art/machines/CabinetArt';
import { CapsuleMachine } from './CapsuleMachine';
import type { PlaceHandlers } from './RevealOverlay';
import { useSceneLight } from './sceneLight';
import s from './FirstPick.module.css';

export interface FirstPickProps extends PlaceHandlers {
  /** The first capsule has been opened and put away: onboarding moves on. */
  onDone?: (machineId: MachineId) => void;
}

const PAIR: MachineId[] = ['cats', 'cows'];

/**
 * Onboarding's "Cats or Cows?" (DESIGN §9.6 step 4): the two cabinets side by side. Choosing
 * one brings it forward for the first pull, which is on the house (`pull(id, { free: true })`):
 * insert, turn, twist.
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
        Cats or Cows?
      </h2>
      <p class={s.lead}>Your first capsule is on the house. Choose a cabinet.</p>
      <div class={s.row}>
        {PAIR.map((id) => {
          const m = getMachine(id);
          return (
            <button key={id} type="button" class={s.cabinet} onClick={() => setPicked(id)} aria-label={`${seriesLabel(m)}. ${m.tagline}`}>
              <CabinetArt machine={m} light={light} />
              <span class={s.name}>{m.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The name the onboarding brief uses. */
export { FirstPick as CatsOrCowsPick };

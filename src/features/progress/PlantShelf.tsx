/**
 * Plants (DESIGN §9.2): every habit's plant, standing on shelf tiers in habit order, the retired
 * ones on the balcony shelf below. Each is drawn on the scene canvas (every stage to one scale, the
 * pot's foot on the plank), and each is a button that opens its Habit Detail.
 */
import { PlantArt } from '@/art/plants';
import type { GardenPlantVM } from '@/state/selectors';
import { openHabitDetail } from '@/features/habits/open';
import { fillLine } from '@/catalog/lines';
import { haptic } from '@/fx/haptics';
import { state } from '@/state/store';
import { cx } from '@/ui/cx';
import { lookArtOf } from './looks';
import { PROGRESS_UI, stageName } from './copy';
import s from './PlantShelf.module.css';

export function PlantShelf({ garden, balcony = false }: { garden: readonly GardenPlantVM[]; balcony?: boolean }) {
  return (
    <ul class={cx(s.shelf, balcony && s.balcony)} data-shelf={balcony ? 'balcony' : 'plants'}>
      {garden.map((g) => (
        <li key={g.habitId} class={s.slot}>
          <button
            type="button"
            class={s.plant}
            aria-label={fillLine(g.retired ? PROGRESS_UI.plants.retired : PROGRESS_UI.plants.open, { habit: g.habitName, stage: stageName(g.plant.displayStage) })}
            onClick={() => {
              haptic('tick');
              openHabitDetail(g.habitId);
            }}
          >
            <span class={s.art} aria-hidden="true">
              <PlantArt species={g.plant.species} stage={g.plant.displayStage} progress={g.plant.progress} blooms={g.plant.blooms} pot={g.plant.pot} flourishes={g.plant.flourishes} look={lookArtOf(state.value, g.habitId)} withPot size="100%" animated={false} />
            </span>
            <span class={s.name} aria-hidden="true">
              {g.habitName}
            </span>
            <span class={s.stage} aria-hidden="true">
              {stageName(g.plant.displayStage)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

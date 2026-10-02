/**
 * Plants (DESIGN §9.2): every habit's plant, standing on shelf tiers in habit order, the retired
 * ones on the balcony shelf below. Each is drawn on the scene canvas (every stage to one scale, the
 * pot's foot on the plank), and each is a button that opens its Habit Detail.
 *
 * A slot redraws only when its own plant changes: the looks are kept per habit while their inputs
 * are the same objects, and each slot compares what it draws, so a coin or a pet moving elsewhere
 * in the store doesn't redraw every plant.
 */
import { memo } from 'preact/compat';
import { computed } from '@preact/signals';
import { PlantArt } from '@/art/plants';
import type { GardenPlantVM } from '@/state/selectors';
import { openHabitDetail } from '@/features/habits/open';
import { fillLine } from '@/catalog/lines';
import { haptic } from '@/fx/haptics';
import { state, today, now, storeLocal } from '@/state/store';
import { cx } from '@/ui/cx';
import { plantPresentation, type PlantPresentation } from '@/state/views/plantPresentation';
import { PROGRESS_UI, stageName } from './copy';
import s from './PlantShelf.module.css';

let presentationMemo = new Map<string, PlantPresentation>();
/** Keep each plant object stable until something it draws changes. Coins and pet XP do not. */
const presentations = computed(() => {
  const s = state.value;
  const env = { today: today.value, now: now.value, local: storeLocal() };
  const map = new Map<string, PlantPresentation>();
  let changed = presentationMemo.size !== s.habits.length;
  for (const h of s.habits) {
    const next = plantPresentation(s, h.id, env)!;
    const old = presentationMemo.get(h.id);
    const same = old && JSON.stringify(old) === JSON.stringify(next);
    map.set(h.id, same ? old : next);
    if (!same) changed = true;
  }
  if (changed) presentationMemo = map;
  return presentationMemo;
});

export function PlantShelf({ garden, balcony = false }: { garden: readonly GardenPlantVM[]; balcony?: boolean }) {
  const plants = presentations.value;
  return (
    <ul class={cx(s.shelf, balcony && s.balcony)} data-shelf={balcony ? 'balcony' : 'plants'}>
      {garden.map((g) => {
        const plant = plants.get(g.habitId);
        return plant ? <PlantSlot key={g.habitId} g={g} plant={plant} /> : null;
      })}
    </ul>
  );
}

const samePlant = (a: GardenPlantVM, b: GardenPlantVM): boolean =>
  a === b ||
  (a.habitId === b.habitId &&
    a.habitName === b.habitName &&
    a.retired === b.retired &&
    a.plant.species === b.plant.species &&
    a.plant.displayStage === b.plant.displayStage &&
    a.plant.progress === b.plant.progress &&
    a.plant.blooms === b.plant.blooms &&
    a.plant.pot === b.plant.pot &&
    JSON.stringify(a.plant.flourishes) === JSON.stringify(b.plant.flourishes));

const PlantSlot = memo(
  function PlantSlot({ g, plant }: { g: GardenPlantVM; plant: PlantPresentation }) {
    const stage = stageName(g.plant.displayStage);
    return (
      <li class={s.slot}>
        <button
          type="button"
          class={s.plant}
          aria-label={fillLine(g.retired ? PROGRESS_UI.plants.retired : PROGRESS_UI.plants.open, { habit: g.habitName, stage })}
          onClick={() => {
            haptic('tick');
            openHabitDetail(g.habitId);
          }}
        >
          <span class={s.art} aria-hidden="true">
            <PlantArt {...plant} withPot size="100%" animated={false} />
          </span>
          <span class={s.name} aria-hidden="true">
            {g.habitName}
          </span>
          <span class={s.stage} aria-hidden="true">
            {stage}
          </span>
        </button>
      </li>
    );
  },
  (a, b) => a.plant === b.plant && samePlant(a.g, b.g),
);

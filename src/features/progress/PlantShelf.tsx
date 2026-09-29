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
import { PlantArt, type PlantLookArt } from '@/art/plants';
import type { GardenPlantVM } from '@/state/selectors';
import { openHabitDetail } from '@/features/habits/open';
import { fillLine } from '@/catalog/lines';
import { haptic } from '@/fx/haptics';
import { state } from '@/state/store';
import { cx } from '@/ui/cx';
import { lookArtOf } from './looks';
import { PROGRESS_UI, stageName } from './copy';
import s from './PlantShelf.module.css';

let lookMemo: { looks: unknown; habits: unknown; map: Map<string, PlantLookArt | undefined> } | null = null;
/** Each habit's look as PlantArt takes it, recomputed only when the looks or the habits change. */
const looksByHabit = computed(() => {
  const { plantLooks, habits } = state.value;
  if (lookMemo && lookMemo.looks === plantLooks && lookMemo.habits === habits) return lookMemo.map;
  const prev = lookMemo?.map;
  const map = new Map<string, PlantLookArt | undefined>();
  for (const h of habits) {
    const next = lookArtOf({ plantLooks, habits }, h.id);
    const old = prev?.get(h.id);
    // Keep the old object when it says the same, so the slot's comparison holds.
    map.set(h.id, old && next && old.colour === next.colour && old.shape === next.shape && old.partnerColour === next.partnerColour ? old : next);
  }
  lookMemo = { looks: plantLooks, habits, map };
  return map;
});

export function PlantShelf({ garden, balcony = false }: { garden: readonly GardenPlantVM[]; balcony?: boolean }) {
  const looks = looksByHabit.value;
  return (
    <ul class={cx(s.shelf, balcony && s.balcony)} data-shelf={balcony ? 'balcony' : 'plants'}>
      {garden.map((g) => (
        <PlantSlot key={g.habitId} g={g} look={looks.get(g.habitId)} />
      ))}
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
  function PlantSlot({ g, look }: { g: GardenPlantVM; look: PlantLookArt | undefined }) {
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
            <PlantArt species={g.plant.species} stage={g.plant.displayStage} progress={g.plant.progress} blooms={g.plant.blooms} pot={g.plant.pot} flourishes={g.plant.flourishes} look={look} withPot size="100%" animated={false} />
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
  (a, b) => a.look === b.look && samePlant(a.g, b.g),
);

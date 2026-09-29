# Garden module: notes for the lead

## How to drive `PlantArt` (for Today, Progress, Habit Detail, Meadow)

- `stage` / `progress`: from sunshine and the thresholds in DESIGN §5.5
  (`progress = (sun - threshold[stage]) / (threshold[stage + 1] - threshold[stage])`, 0 at Evergreen).
- `blooms`: after Evergreen, `floor((sun - 180) / 30)`. Pass the raw count: PlantArt ignores blooms below
  stage 7, draws at most `MAX_BLOOMS` (6, exported) and adds a golden sparkle once the cap is reached.
- `pulse`: pass anything that changes on each check-in (e.g. that day's count or a check-in counter). The watering
  wiggle, droplets and sparkle play only when the value changes after mount, so lists never wiggle on first render.
  Reduced motion hides the droplets and stops all loops.
- `animated`: gentle idle sway (CSS transform only). Fine for a list of ~10 plants; leave it off in dense grids.
- `title`: gives the SVG `role="img"` + `aria-label`; without it the art is `aria-hidden`.

## Contract-change requests

1. **`MeadowScene` planters (src/art/scene/index.tsx, world module)**: `planters?: { species: string; stage: number; pot: string }[]`
   is typed with plain strings. Please type them as `{ species: PlantSpeciesId; stage: number; pot: PotId; progress?: number; blooms?: number }`
   so the planter box can pass straight through to `PlantArt` without casts and show the same in-stage detail.
2. **DESIGN §5.5 pot list vs catalog**: the doc lists "Strawberry, Moon, Snow Globe Base, Gold" pots and a "Cat Face" pot,
   while `catalog/types.ts` has `kitty, frog, pumpkin, snowy, heart, starlight` (no strawberry/moon/gold). Art follows the
   catalog; the doc line should be updated to match.
3. **Optional, `CollectibleArt` (plants)**: it renders plant unlocks at stage 5 in a terracotta pot. Stage 5 reads well in the
   collection book; if the lead wants unlocks to feel more rewarding on the reveal card, stage 6 is the fullest non-Evergreen look.

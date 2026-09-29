# Garden module: notes for the lead

## How to drive `PlantArt` (for Today, Progress, Habit Detail, Meadow)

- `stage` / `progress`: from sunshine and the thresholds in DESIGN §5.5. Within stages 0–6,
  `progress = (sun - th[stage]) / (th[stage + 1] - th[stage])`; at Evergreen (stage 7) there is no next threshold, so pass
  `0` (or leave it out). PlantArt is defensive anyway: NaN or non-numeric progress counts as 0, and progress, stage and
  blooms are clamped, so bad input can never produce broken path data.
- `blooms`: superseded (M1): pass the view model's `plant.blooms` (`artBlooms` in domain/growth.ts): undefined below
  Evergreen, so the art follows the stage, and 5 + the extra blooms at Evergreen. See NOTES-plants.md.
- `pulse`: pass the card's `waterings` (SillPotVM `pulse`), a counter that rises with every watering tap. The watering wiggle,
  droplets and sparkle play only when the value goes **up** after mount: the first render, an undo (the value going down)
  and remounts never water the plant. Under reduced motion nothing moves; the droplets and sparkle just fade in and out.
- `animated`: gentle idle sway. Loops pause automatically while a plant is scrolled off screen (one shared
  IntersectionObserver), and below 64px only the sway runs (no twinkles, no charm swing). Recommended for the windowsill,
  Habit Detail and the Meadow planters; on dense lists (Today cards) prefer `animated={false}` and let `pulse` carry the
  feedback. Not yet measured on a real iPhone: please profile the Today screen on device before turning it on there.
- `size`: numbers are px. Below 64px the Evergreen charm, sparkles and watering droplets are drawn larger so they still
  read on a 40px habit card. String sizes (e.g. `"100%"`) are treated as large.
- `title`: gives the SVG `role="img"` + `aria-label`; without it the art is `aria-hidden`.
- Evergreen reward: warm glow (theme-aware via `--plant-glow*` in `plant.css`), a gold ribbon on pots without a face, a gold
  bow tied clear of any pot face with the golden watering can dangling from it, and sparkles.

## Contract-change requests

1. **DESIGN §5.5 pot list vs catalog**: the doc lists "Strawberry, Moon, Snow Globe Base, Gold" pots and a "Cat Face" pot,
   while `catalog/types.ts` has `kitty, frog, pumpkin, snowy, heart, starlight` (no strawberry/moon/gold). Art follows the
   catalog; the doc line should be updated to match.
2. **Optional, `CollectibleArt` (plants)**: it renders plant unlocks at stage 5 in a terracotta pot. Stage 5 reads well in the
   collection book; if the lead wants unlocks to feel more rewarding on the reveal card, stage 6 is the fullest non-Evergreen look.
3. **Shared shape primitives**: treat art (`src/art/items/treats.tsx`) imports `Blob`, `Merged`, `Shine`, `circleD`, `leafD`,
   `FINE` and `SPARKLE_D` from `src/art/plants/parts.tsx`. Other item/decor modules will want the same helpers. Suggest moving
   them to a shared `src/art/shapes.tsx` (owned by the lead) and having both plants and items import from there. No behaviour
   change; it only removes the cross-module dependency.

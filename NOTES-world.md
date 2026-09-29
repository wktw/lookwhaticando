# World module: notes for the lead

## Using the Meadow (for the Meadow screen)

```tsx
import { MeadowScene, groundToStyle, DECOR_DEFAULT_POS, PET_UNITS, timeOfDayAt } from '@/art/scene';

const decor = Object.entries(state.meadow.decor).map(([slot, itemId]) => ({ itemId: itemId!, ...DECOR_DEFAULT_POS[slot as DecorSlot] }));

<MeadowScene time={timeOfDayAt(now)} decor={decor} planters={topPlants} onGroundTap={(x, y) => …} style={{ width: '100%', height: '100%' }}>
  {pets.map((p) => (
    <button style={groundToStyle(p.x, p.y, { size: PET_UNITS })} aria-label={p.name}>…<PetArt size="100%" …/></button>
  ))}
</MeadowScene>
```

- The scene needs a definite size (it is a `container-type: size` container): give it a height or an aspect-ratio.
  It is tuned for aspect ratios 0.55–4. Everything scales with the scene height, so wider scenes show more meadow.
- Ground coordinates: x 0..1 left→right, y 0..1 horizon→front edge; negative y is sky (see `src/art/scene/ground.ts`).
  `groundToStyle` sets `left/top/zIndex` plus the individual `translate` and `scale` properties, so `transform` stays free
  for hops, flips and wander motion. `groundPoint(x, y)` gives the same numbers for rAF loops writing styles directly.
- Children share the ground's stacking context, so pets depth-sort with decor and the planter. Flat decor (picnic
  blanket, puddle) always sits under pets.
- The planter box is in the front-left corner; with 3–5 plants it covers roughly x < 0.45–0.6, y > 0.75 on a phone.
  Pets there are (correctly) drawn behind it, so keep wander targets out of that corner when planters are shown.
- The stepping-stone path runs right of centre towards the cottage; the default decor slots stay clear of it.
- Photo mode: every layer is an `<svg>` painted with attributes, so it can be serialized per element and drawn at its
  client rect in DOM order. The dawn mist and night fireflies are CSS-only; skip them or draw them by hand.

## Using the windowsill (for the Today screen)

```tsx
<WindowsillScene time={timeOfDayAt(now)} style={{ width: '100%', height: '170px' }}>
  <div style={sillSlotStyle(0, n, 62)}><PetArt petId={buddy} size="100%" animated /></div>
  {plants.map((p, i) => <div style={sillSlotStyle(i + 1, n, 48)}><PlantArt … size="100%" /></div>)}
</WindowsillScene>
```

`sillSlotStyle(index, count, sizePct)` centres the row, spaces it by the scene height and squeezes it to fit narrow
windows (up to `SILL_MAX_ITEMS` = 6). Frame, curtains and sill follow the app's light/night theme; the sky outside
follows `time`.

## Contract-change requests

None required. Additive API only: `onGroundTap`, `groundPoint`, `pointToGround`, `HORIZON`, `PET_UNITS`,
`MAX_PLANTERS`, `PlanterPlant.progress/blooms` (passed through to `PlantArt`), `sillSlotStyle`, `SILL_SURFACE`,
`SILL_MAX_ITEMS`, `TIMES_OF_DAY`, `decorFootprint` (also re-exported from `@/art/items/decor`).

Two notes for other modules:

- **garden**: the planter and the sill assume `PlantArt` stands its pot on the bottom of the 100×100 canvas (pot base
  near y ≈ 92–94, like pets). The planter's rim covers canvas y ≥ 84.
- **meadow screen**: `AppState.meadow.decor` stores one item per slot (no position), so decor positions come from
  `DECOR_DEFAULT_POS`. If free placement is wanted later, store `{ itemId, x, y }` and pass it straight through.

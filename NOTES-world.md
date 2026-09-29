# World module: notes for the lead

## Using the Meadow (for the Meadow screen)

```tsx
import { MeadowScene, groundToStyle, placeDecor, decorGroundRect, planterGroundRect, PET_UNITS, timeOfDayAt } from '@/art/scene';

// aspect = the scene's width ÷ height (measure it, e.g. with a ResizeObserver, and recompute on resize).
const decor = placeDecor(state.meadow.decor, aspect);

<MeadowScene time={timeOfDayAt(now)} decor={decor} planters={topPlants} label="Your meadow" onGroundTap={(x, y) => …} style={{ width: '100%', height: '100%' }}>
  {pets.map((p) => (
    <button style={groundToStyle(p.x, p.y, { size: PET_UNITS })} aria-label={p.name}>…<PetArt size="100%" …/></button>
  ))}
</MeadowScene>
```

- The scene needs a definite size (it is a `container-type: size` container): give it a height or an aspect-ratio.
  It is tuned for aspect ratios 0.55–4.
- Ground coordinates: x 0..1 left→right, y 0..1 horizon→front edge; negative y is sky (see `src/art/scene/ground.ts`).
  `groundToStyle` sets `left/top/zIndex` plus the individual `translate` and `scale` properties, so `transform` stays free
  for hops, flips and wander motion. `groundPoint(x, y)` gives the same numbers for rAF loops writing styles directly.
- Sizes are in meadow units (`--u`, set by the scene): 1% of the scene height, shrinking to 0.8% on tall portrait scenes
  (narrower than 0.7 : 1), which then gain sky and grass instead of cropping art. `groundToStyle` already uses it.
- **Place decor with `placeDecor(slots, aspect)`** (or `decorDefaultPos(slot, aspect, itemId)`). The scenery is laid out
  per aspect (layout.ts), and these defaults are computed from the same layout: back-left stands just right of the tree's
  swing and lantern, back-right beyond the garden gate, ground items off the stepping-stone path, fairy lights drape over
  the tree canopy, balloons tie to the swing branch, a rainbow rises from behind the hills left of the sun.
  `DECOR_DEFAULT_POS` is only the phone-portrait (0.7) answer for an unknown item.
- **Steering pets**: `decorGroundRect(itemId, x, y, aspect)` returns the patch of ground an item covers (`flat: true` for
  the blanket and puddle, which pets may walk onto); `planterGroundRect(count, aspect)` returns the planter box's corner;
  `pathAt(y, aspect)` gives the path's centre. Children share the ground's stacking context, so pets depth-sort with decor.
- Everything in the scene is attribute-painted SVG (fireflies, butterflies and dawn mist included), so photo mode can
  serialize it per element and draw each at its client rect in DOM order. Only transforms/opacity animate, each on a
  small outer element; the static layers are memoized, so re-rendering pets never rebuilds the scenery.

## Using the windowsill (for the Today screen)

```tsx
const sizes = [46, 60, 46, 46]; // % of the scene height: pots ≈ 46, the buddy ≈ 60
const styles = sillLayout(sizes, 1); // the buddy (index 1) is drawn over its neighbours
<WindowsillScene time={timeOfDayAt(now)} style={{ width: '100%', height: '170px' }}>
  <div style={styles[1]}><PetArt petId={buddy} size="100%" animated /></div>
  {plants.map((p, i) => <div style={styles[i < 1 ? i : i + 1]}><PlantArt … size="100%" /></div>)}
</WindowsillScene>
```

`sillLayout(sizes, front)` gives bigger things more room, centres the row and squeezes it to fit narrow windows (up to
`SILL_MAX_ITEMS` = 6). `sillSlotStyle(index, count, size, front?)` is the even-spacing variant. Frame, curtains and sill
follow the app's light/night theme; the sky outside follows `time`.

## Contract-change requests

None required. Additive API only: `label`/`onGroundTap` props, `placeDecor`, `decorDefaultPos`, `decorGroundRect`,
`planterGroundRect`, `pathAt`, `groundPoint`, `pointToGround`, `depthAt`, `HORIZON`, `PET_UNITS`, `unitScale`,
`decorUnitScale`, `MAX_PLANTERS`, `PlanterPlant.progress/blooms` (passed through to `PlantArt`), `sillLayout`,
`sillRow`, `sillSlotStyle`, `SILL_SURFACE`, `SILL_MAX_ITEMS`, `TIMES_OF_DAY`, `decorFootprint` (also re-exported from
`@/art/items/decor`). `DecorArtOptions` gained `night` and `line` (outline scale); `DECOR_ART` icons pass neither.

Notes for other modules:

- **garden**: the planter and the sill assume `PlantArt` stands its pot on the bottom of the 100×100 canvas (pot base
  near y ≈ 92–94, like pets). The planter's rim covers canvas y ≥ 84. Planter plants render with `animated` off (they
  are scenery); the sill may animate them.
- **meadow screen**: `AppState.meadow.decor` stores one item per slot (no position), so decor positions come from
  `placeDecor`. If free placement is wanted later, store `{ itemId, x, y }` and pass it straight through.
- **pets**: pets keep their daytime colours at night while decor takes on the moonlight, which keeps the pets the stars
  of the night scene. If the pets module adds a night tone, `nightTone(hex)` in `src/art/scene/decor/kit.tsx` is the
  scene's recipe.

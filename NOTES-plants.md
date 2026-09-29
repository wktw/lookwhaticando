# Plants module: notes for the lead

The catkin plant art: 16 species drawn from life at 8 stages, 12 pots, the water glass (and cat grass's seed dish,
the tulip's forcing glass), Windowlight crescents per light, Lamplight, damp soil, watering, and the paper plant tag.
Gallery: `/gallery.html?only=garden` (sections `garden-matrix`, `garden-night`, `garden-light`, `garden-pots`,
`garden-cards`, `garden-small`, `garden-glass`, `garden-blooms`, `garden-water`, `garden-tags`).

## How to drive `PlantArt`

```tsx
<PlantArt species="begonia" stage={5} progress={0.4} pot="cream" light={windowLight(now)} damp={doneToday} pulse={checkins} size={120} title="Read, polka-dot begonia, Blooming" />
```

- `stage` 0–7 = Cutting, Rooting, Potted, Leafy, Budding, Blooming, Flourishing, Evergreen (`PLANT_STAGE_NAMES`).
  Stages 0–1 draw a glass, never a pot: a cutting in a water glass (cat grass: oat seeds in a glass dish). The tulip
  lives its whole life in a forcing glass.
- `progress` 0..1 adds continuous growth inside a stage (a leaf growing in, roots lengthening). NaN counts as 0.
- `blooms` **changed meaning**: it is now "how many flowers, berries or peak features are showing" from Blooming on
  (0..`MAX_BLOOMS` = 6), ignored before Blooming. Left out, it follows the stage (Blooming 2–3, Flourishing 4,
  Evergreen 5). Foliage plants map it to their peak: pothos vine length, pilea pups, monstera aerial roots, snake plant
  flower spikes, cat grass oat heads. The old "extra blooms after Evergreen" count is gone.
- `light?: Light` (default `DAY_LIGHT`): crescents sit on the side `shadeSide()` gives, the contact shadow falls away
  from the light, the shade side of every plant takes its darker inks, the sunflower faces `light.from`, and at night
  (`light.night`) lit colours warm toward the lamp, the midnight glaze gets a lamp rim, and the prayer plant folds its
  leaves up.
- `damp` darkens the soil (watered today). `pulse`: pass a monotonic check-in counter; each increase after mount plays
  a leaf lift and a glint on the soil and dampens it. Reduced motion keeps the glint (a crossfade) and the soil change.
- `animated`: gentle sway (±1°), paused off screen; held still under reduced motion.
- Decorative by default; `title` gives `role="img"` + `aria-label`.

`PotArt` takes `pot`, `size`, `light`, `damp`, `title`. `PlantTag` takes `name`, `note?`, `size` (px of the name),
`stand` (`'stake'` | `'propped'`) and `maxWidth` (em); long names end in an ellipsis, the full text stays in the DOM
and in `title`.

### Canvas geometry (for residents, tags and props)

Every drawing is on a 100 × 100 canvas: the vessel's foot stands on y = 95, centred on x = 50; classic pots have their
rim top at y ≈ 62. `POT_GEOMETRY[pot]` (exported from `@/art/plants`) gives each pot's `rim {y, x0, x1}` (where a cat
can loaf), `mouth {y, hw}` and `foot`. The water glass spans x 38–62, rim at y 59.4.

## Contract-change requests

1. **Treat art still imports plant helpers** (`src/art/items/treats.tsx` → `Blob`, `Merged`, `Shine`, `circleD`,
   `leafD`, `FINE`, `SPARKLE_D` from `src/art/plants/parts.tsx`, and `f`, `lerp` from `plants/math.ts`). I kept
   `parts.tsx` as a deprecated, self-contained shim so treats keep compiling (it no longer imports from the pets
   module). Items module: please stop importing from `art/plants`; lead: delete `src/art/plants/parts.tsx` once nothing
   imports it.
2. **Stage names in fx** (`tests/unit/fx/celebrationPlan.test.ts`, `src/dev/sections-fxui.tsx`) still use "Seedling" and
   "Sprout". The stages are now Cutting, Rooting, Potted, Leafy, Budding, Blooming, Flourishing, Evergreen; the
   celebration copy for stages 1–2 should become Rooting ("white roots in the glass") and Potted.
3. **`blooms` semantics** (see above): `src/art/scene/meadow/Planter.tsx` documents `blooms` as "extra blooms after
   Evergreen". Please pass the Blooms Like You count (or leave it out) and update that comment.
4. **Lamplight in the light theme**: crescents paint with `var(--shade)`, which follows the theme. If a scene shows
   Lamplight while the UI theme is light, set the night value on the scene container
   (`--shade: rgba(10, 8, 22, 0.3); --contact: rgba(0, 0, 0, 0.22)`) so crescents deepen with the lamp. No token change
   is needed; a shared `--shade-lamp` token would make this tidier if the lead prefers.
5. **Stage 0 "beside its empty pot"** (DESIGN §5.5): `PlantArt` draws the glass alone, so a card stays one object. The
   sill scene can stand the habit's `PotArt` beside the glass using `POT_GEOMETRY`.
6. **Tulip pots**: the tulip grows in a forcing glass for its whole life; its `pot` only tints the glass (terracotta
   and gourd give amber glass, blush/rosy/teacup rose, ticking/mug blue, midnight cobalt, tin green, the rest clear).
   The Habit Editor's pot picker could say "Grows in a forcing glass; the pot sets the glass colour" for tulips.
7. **Gallery title** (`src/dev/gallery.tsx`) still reads "Mochi Meadow · Art Gallery".

## Known gaps

- At 40 px a young plant (a cutting in its glass) is small in its square, as in the Today style frames; the canvas
  keeps one scale at every stage so pots match from card to card. Cards that want bigger young plants can use 48–56 px.
- Per-leaf crescents are not drawn; the shade side is carried by darker leaf inks (DESIGN §10.4: two inks and a
  pre-mixed third). Pots, the glasses, the tulip bulb and cup, and strawberry flowers do have hard crescents.
- DOM weight at Evergreen is 50–190 elements per plant (catnip and hoya are the heaviest); repeated shapes are
  memoised constants with one-decimal path data, and there are no filters or clip paths.

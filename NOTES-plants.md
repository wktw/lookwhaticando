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
- `fit`: `'scene'` (default) keeps every stage on the same 100-unit canvas so pots match in scale on the sill;
  `'icon'` crops to the plant at its stage (a committed square frame per species × stage, `iconFrames.ts`), so a
  cutting in its glass fills a 40 px Today card. **Today cards, the collection book and any small tile should pass
  `fit="icon"`.** Frames are generated from the painted bounds of every pot, light, progress and bloom count
  (`GEN_ICON_FRAMES=1 npx vitest run src/art/plants/iconFrames.gen.test.tsx`); a test fails if any plant is cropped.
- `withPot`: stages 0–1 (and the tulip) stand the habit's chosen pot, empty, behind the glass on the shade side
  ("a cutting in a water glass beside its empty pot", DESIGN §5.5). For scenes and detail views; ignored by `icon`.
- `animated`: gentle sway (±1°), paused off screen; held still under reduced motion.
- Decorative by default; `title` gives `role="img"` + `aria-label`.

`PotArt` takes `pot`, `size`, `light`, `damp`, `title`. `PlantTag` takes `name`, `note?`, `size` (px of the name),
`stand` (`'stake'` | `'propped'`) and `maxWidth` (em); long names end in an ellipsis, the full text stays in the DOM
and in `title`.

### Canvas geometry (for residents, tags and props)

Every drawing is on a 100 × 100 canvas: the vessel's foot stands on y = 95, centred on x = 50; classic pots have their
rim top at y ≈ 62. `POT_GEOMETRY[pot]` (exported from `@/art/plants`) gives each pot's `rim {y, x0, x1}` (where a cat
can loaf), `mouth {y, hw}` and `foot`. `tagAnchor(pot)` gives the soil point where a `PlantTag`'s stake goes in (place
the tag so its stake's foot lands there; the gallery's `garden-tags` shows how). The water glass spans x 38–62, rim
at y 59.4.

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
5. **Stage 0 "beside its empty pot"** (DESIGN §5.5): resolved here. Pass `withPot` in the sill scene and the plant
   detail view; leave it off (or use `fit="icon"`) on cards.
6. **Tulip pots**: the tulip grows in a forcing glass for its whole life; its `pot` only tints the glass (terracotta
   and gourd give amber glass, blush/rosy/teacup rose, ticking/mug blue, midnight cobalt, tin green, the rest clear).
   The Habit Editor's pot picker could say "Grows in a forcing glass; the pot sets the glass colour" for tulips.
7. **Gallery title** (`src/dev/gallery.tsx`) still reads "Mochi Meadow · Art Gallery".
8. **Today card framing**: the Today card (and any 40–64 px plant tile) should pass `fit="icon"` to `PlantArt`.

## Known gaps

- `fit="icon"` frames are per stage, so a card's plant is re-framed when it moves up a stage (it steps from a close
  crop of the glass to a wider crop of the pot). Tall plants (a flowering tulip or sunflower) are already full height
  and gain little from the crop.
- Per-leaf crescents are not drawn; the shade side is carried by darker leaf inks (DESIGN §10.4: two inks and a
  pre-mixed third). Pots, the glasses, the tulip bulb and cup, and strawberry flowers do have hard crescents.
- DOM weight at Evergreen (terracotta): catnip 46 elements / 21 KB (was 138 / 35 KB), snake plant 74 / 28 KB,
  Christmas cactus 92 / 18 KB, hoya 140 / 27 KB, begonia 145 / 19 KB, pothos 136 / 14 KB; the rest 33–103 elements
  and 6–17 KB. `geom.bake` + `ink.InkRuns` merge repeated shapes into one path per run of one ink (catnip's leaves and
  flower spikes, the snake plant's flowers); hoya, begonia and pothos leaves still render one group per leaf and are
  the next to convert. No filters or clip paths.

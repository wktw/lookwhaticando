# shelf: notes and contract requests for the lead

The Meadow is gone. `src/art/scene` is now the Shelf: `SillScene`, `WindowsillBand`, `ShelfScene`, `PlaceArt`,
the places (`places/`), the pets' behaviour (`behavior/`) and the vignette registry. Gallery: `src/dev/sections-world.tsx`
(section ids start with `shelf-`).

## Contract requests

1. **`src/art/light.ts` was left unchanged.** Editing it (to add helpers) was refused by the session's permission
   classifier as a shared resource, so the helpers live in `src/art/scene/lighting.ts`: `LIGHT_FROMS`,
   `towardLight(from)`, `childLight(light)`, `lightAtSun(sun, night)`. If other modules want them, move
   `LIGHT_FROMS` and `towardLight` into `@/art/light` and re-export from `lighting.ts`.
   `tests/unit/light.test.ts` is also unchanged.

2. **pets** (`@/art/pets`):
   - `PetArt` `pose` and `light` are passed through a narrow cast in `src/art/scene/actors/adapters.ts`
     (`TODO(integration)`). Once they are on `PetArtProps`, make `Pet` a plain re-export.
   - Please export the feet baseline on the 100 canvas (`PET_BASELINE`; the scene assumes **94**, see
     `src/art/scene/room.ts`).
   - Please export a pose anchor for the top of a lying cow's back (`loaf`), as a share of the canvas above the feet.
     The cat-on-cow vignette assumes **0.24** (`COW_BACK` in `behavior/vignettes.ts`).
   - Expressions used: `idle`, `sleep`, `surprised` (a resident's look-up), all in both the old and new sets.

3. **plants** (`@/art/plants`):
   - `PlantArt` `light` and `damp` go through the same cast (`adapters.ts`).
   - `PlantTag` did not exist in this worktree. `SillTag` in `src/art/scene/actors/PotSlot.tsx` stands in with the
     same props (`name`, `note`); swap it for `PlantTag` (`TODO(integration)`).
   - Please export the pot rim geometry (the scene assumes rim top **y 66**, x **27…73**, pot foot **y 95**,
     `POT_RIM` / `PLANT_BASELINE` in `room.ts`). Per pot, if the mug or teacup differ.

4. **items** (`src/art/scene/decor`):
   - The scene consumes `DECOR_ENTRIES` exactly as the brief's `DecorEntry` contract. It assumes decor stands on
     **y ≈ 93** of its canvas (`DECOR_BASELINE`) and that `hang: 'window'` art hangs from the top centre of its
     canvas (placed under the window's meeting rail).
   - Beds are a local table, `NAP_SPOTS` in `src/art/scene/sill/world.ts` (matchbox bed, dog bed, bread basket,
     cardboard box, odd mitten, hot water bottle, reading chair, window seat, teacup bath): how far above its
     baseline a pet lies, as a share of the canvas. An optional `nap?: number` on `DecorEntry` would replace it.
   - `src/art/scene/paths.ts` keeps `SPARKLE` and `CRESCENT`, which the old decor files import.

5. **ui / Today screen** (`WindowsillBand`):
   - Pass `collapse` as a `ReadonlySignal<number>` (0 open … 1 collapsed) and the band writes two CSS variables with
     no re-render. `bandCollapse()` exports the math (168 → 64 px; the band keeps 168 px of layout and is translated
     up by `clip`, so the sticky header should reserve `height` px).
   - Choreography through a ref (`WindowsillBandHandle`): `pour(habitId)`, `coinToJar()`, `react(petKey)`.
     `bandResidents(pots, pets)` lists who can react. Reduced motion: state changes at once.
   - `onWindowTap` renders a real button over the glass ("Open the Shelf"). Route it to `#/shelf`.
   - The greeting chip (top left) and wallet pill (top right) are the screen's; the gallery mocks them.
     The band keeps its top ~40% (about 64 px of the 168) as window, clear of pots, for them to sit on.
     Collapsed to 64 px, the pots' rims and bodies stay in view under the chips.

6. **routes**: `src/features/meadow/MeadowScreen.tsx` keeps the named `MeadowScreen` export (and adds a default
   export). The tab in `src/app/routes.ts` is still labelled "Meadow" with the `tab-meadow` icon: please rename
   the label to "Shelf" (the screen's own heading already says Shelf). It renders `ShelfScene` with demo data from `./demo.ts` and the places map (`PlaceArt`, locked with
   prices). Wire it to the store when the Shelf state lands.

7. **state**: the Shelf needs, per pet, `place?: PlaceId` and `home?: habitId`; per decor, `place`, `x`, `depth`,
   `flip`; and the owned places. The scene's input types are `SillPot`, `ShelfPet`, `ShelfDecor`
   (`src/art/scene/model.ts`). `AppState.meadow` (zones) is Meadow-era.

8. **tokens**: scenes set their own `--shade`, `--contact` and `--sun` from the scene's light
   (`palette.ts` `ROOM[time].tokens`, the same values as `tokens.css` day and night), so a night scene on a day
   page is still lit by the lamp. If the token values change, update `palette.ts` too, or add light-specific
   tokens (`--shade-day`, `--shade-lamp`, …) and point both at them.

9. **the sunbeam colour**: the beam is painted with the scene palette's opaque butter light (`ROOM[time].beam`,
   `#FFF0C6` by day, matching the E-frames) rather than the translucent `--sun` token, which reads muddy over
   the sill. `--sun` is still set inside the scene for child art. If the lead prefers the token, set
   `--sun` to an opaque value or add `--sun-beam`.

10. **pets, for the vignettes**: the cat-on-cow vignette is gated out of the registry until the lying cow lands
    (`LYING_COW_READY = false` in `behavior/vignettes.ts`, `TODO(integration)`): with the old round cow a cat on
    its back hides the cow. Flip it to `true` once the pets module's long lying cow is in. `findVignette` and
    `stageVignette` skip any vignette whose `ready()` is false.

11. **plants, for tags** (`PlantTag`): the Sill's tags now stand on the side of the pot away from the resident's
    head (each rim perch has a fixed `facing`; the tag takes the other side), size to their text (no max-width,
    no ellipsis), use type floors of 11 px (name) and 10 px (note), and drop the note on scenes under 220 px
    tall rather than truncate it. When `PlantTag` lands, please give it a `side?: 'left' | 'right'` prop and the
    same floors; `SillTag`, `tagStake` and `tagBox` in `actors/PotSlot.tsx` show the geometry.

12. **ui / Today screen, collapse**: `BAND_FOLLOW` is now 0.4, so at 64 px the pot rims and the residents' heads
    sit in the lower 40 px (the pot feet run under the bottom edge). The band no longer animates `clip-path`:
    it is a fixed 168 px `overflow: hidden` box with the band translated up inside it (compositor only). The
    screen's greeting chip should shrink as it collapses (the gallery mocks this).

13. **ui / Shelf screen**: `ShelfScene` and `SillScene` now render a frame (`ScrollFrame`) around the scroller:
    `class` and `style` go on the frame, the scroller is keyboard focusable (Arrow keys step one pot pitch,
    Home/End go to the ends) with a focus ring, a wall-coloured fade marks an end that has more room beyond, and
    on `(hover: hover) and (pointer: fine)` two 44 px chevrons scroll it. The band's pot row takes Arrow keys too.

14. **light.ts**: the winter/summer sunbeam length is a per-season factor (`BEAM_BY_SEASON` in `sill/world.ts`)
    because `SUNRISE`/`SUNSET` are not exported from `@/art/light`. If they are exported, derive it from day length.

15. **time**: scenes follow the clock with `useWindowMoment` (`hooks.ts`): a timeout to the next quarter hour and
    a re-read on `visibilitychange`, re-rendering only when the quarter hour changes (≤ 96 a day). Pinned
    `moment`/`now` props still win.

## How it is built (for reviewers)

- Room units: a scene is 100 units tall (`1cqh`); it lays itself out by its height and scrolls sideways.
- Crescents for the scene's own objects (jar, lamp, saucer, tray, books, box, quilt) are precomputed strings in
  `crescent/data.ts`, generated offline by `crescent/crescents.test.ts` from the shapes in `props/shapes.ts` and
  `places/shapes.ts` (`WRITE_CRESCENTS=1 npx vitest run src/art/scene/crescent`). The test fails if they drift.
- Night is opaque indigo planes (`ROOM.night`), with the lamp's pool painted as a light gradient on the wall,
  frame and sill only (not the glass), under everyone; its stops run amber → rose → violet (`LAMP_POOL`) so the
  falloff never passes through grey. There is no dark veil over the pets any more.
- The season shows through the glass: the plane tree's boughs across the top of the panes (`boughsFor`, blossom,
  full leaf, amber, bare wood with snow), a per-season sky tint and a longer winter beam. The moon hangs a pane
  or so left of the lamp, where the scene opens after dark, and the boughs keep clear of it.
- A unit test pins `ROOM[*].tokens` to `tokens.css` (`--shade`, `--contact`, `--sun`, day and night).
- Cast shadows in the sunbeam are the bare sill showing through the beam (sill-coloured shapes), so they need no
  clipping and vanish outside the sun by themselves.
- Pets: one `@preact/signals` signal per pet; a move is one update and CSS carries it (transform only). The director
  runs on timers, stops off screen (IntersectionObserver) and in hidden tabs, and under reduced motion relocates one
  pet by crossfade (Web Animations, which the global reduced-motion CSS does not cancel) at most every 30 s.

14. **ui / Today screen, collapsed chip** (round 2): the band's pots, residents and pours slide right as it
    collapses, by `chipInset` px at 64 px (default `BAND_CHIP_INSET` = 116, a "Tue 29 · 3 of 5" chip at 16 px
    from the left plus a gap), so the short date chip never sits over a resident. Pass the real chip's width
    if it differs. The window and sill stay put (the `translate` property, no re-layout).

15. **global CSS** (round 2, FYI): `src/styles/global.css` sets `svg { overflow: visible }`, which beats any
    `overflow="hidden"` attribute on a nested `<svg>`. The Shelf now clips with an inline style
    (`GLASS_CLIP`); other modules relying on the attribute to clip are silently unclipped.

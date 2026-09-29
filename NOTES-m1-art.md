# M1 art fixes: contracts and requests for the lead

Branch `m1/art`. Everything below is in `src/art/**`, `src/dev/sections-*.tsx` (not fxui), `public/icons`,
`public/splash`, `scripts/generate-icons.mjs` and the index.html marker blocks. Where a finding also needs a change
outside that, the exact request is under **Requests**.

## Contracts the screens and the logic side build on

### Pets on the Shelf (`ShelfPet`, `@/art/scene`)
- `place?: PlaceId`: the place it is out in. A place that is not in `places` falls back to the Sill.
- `favouriteSpot?: string`: `'pot:<habitId>'` (that pot's rim, or beside its cutting's glass), `'decor:<PlacedDecor.id>'`
  (that bed or box), or a place id (only a preference; `place` still decides where it is drawn). A pet goes to its
  favourite spot after the residents and before the rest, while the spot is free.
- `home?: habitId`: the companion lives in that plant (the rim, or the routine's object on a routine day).
- Map from the VM as `{ key: pet.id, petId: pet.itemId, name, personality, outfit, home: companionOf, place: pet.place, favouriteSpot }`.

### Touch and the Pet Card (`SillScene`, `ShelfScene`)
- `onPet?(key, rect: DOMRect, gesture: 'tap' | 'stroke' | 'boop' | 'carry')`: each pet is a real `<button>` named after
  the pet (`aria-label` = its name). Keys: Enter or Space tap, B boop, S stroke. The screen pays the (capped) XP.
- `onOpenPet?(key)`: the name tag that floats up after a tap is a button ("{name}’s card") that opens the Pet Card.
- `interactive?: boolean`: buttons without handlers (the gallery).
- `ref: ShelfSceneHandle` = `{ react(key, expression), spotOf(key): DOMRect | null }` (anchor the Pet Card popover).
- `editDecor?: { onMove(key, frac: {x, y}, place), onFlip(key), onRemove(key) }`: every placed item becomes a draggable
  keyboard button (arrows move it, F flips, Delete or Backspace removes). `key` is `PlacedDecor.id`. Positions come back
  as the store keeps them (fractions of the place).
- `PetArt` has `pose="carry"` (the pet lifted by the scruff, legs dangling).

### Decor between the store and the scene
- Pass `decor={placed.map((d) => decorToScene(d, (id) => keepsakeOfItem(state, id)?.kind))}`. The scene resolves the
  0..1 fractions against the place it draws; `sceneToDecor(x, depth, floor)` is the inverse. A keepsake placed as
  `'keepsake:<id>'` draws from its kind (`KEEPSAKE_ART`, 12 families and the brass seed).

### Today band and Sill extras (`WindowsillBand`, `SillScene`, `ShelfScene`)
- `cutting?: { stage: 0..7, overall: 0..1 }`: the Cutting (CuttingVM).
- `found?: { seed: number, label?, onTap? }`: today's found thing (one of seven, by seed); a button when `onTap` is given.
- `note?: { kind: 'sundayNote' | 'herbarium' | 'anniversary' | 'story', label?, onOpen }`: a clipped note, a real button.
- `cake?: boolean`: her birthday.
- Per pot (`SillPot`): `bow?: boolean` (came-home day), `routine?: Routine` (the companion's routine today; its object
  stands by the pot and the companion settles on it), `look?: { colour, shape, partnerColour? }`, `flourishes?: 0..8`.
- The band hides the plant tags by default; `tagFor={habitId}` shows one (the pot just tapped), `tags` shows all.

### Plants
- `blooms` means flowers **showing** from Blooming on (0..6). Leave it out below Evergreen so it follows the stage;
  at Evergreen pass `Math.min(6, 5 + extraBlooms)`. An explicit 0 draws none.
- `look` (Blooms Like You) and `flourishes` on `PlantArt`, `SillPot` and `CardPlant`.
- `CardPlant` (import from `@/art/plants/CardPlant`, not the index, to keep the entry chunk lean):
  `{ species, stage, progress?, blooms?, pot, damp?, look?, flourishes?, residentPetId?, residentExpression?, icon?,
  tone?, size = 56, light?, animated?, pulse?, title? }`. The resident peeks at ≤ 20 px; the habit icon is on a stake.
- `PlantArt fit="icon" withPot` now shows a cutting beside its empty pot, framed to hold both.
- `PlantTag` has `side` and the 11/10 px floors. `iconFrame` and `ICON_FRAMES` are exported.

### One light (`@/art/scene`)
- `setWindowHemisphere(settings.hemisphere or todayVM.season.hemisphere)` once at start-up and when it changes.
- `useArtLight()` / `artLight` / `artLightNow()`: the light for art outside a scene (the lamp in Lamplight, else the
  window at this hour). `CollectibleArt`, `CardPlant` and the Progress art read it by default. Scenes use `windowMoment`.

### CollectibleArt
- New props: `fit` (default true: a pet fills its tile, sitting), `px` (give it with `size="100%"` so a pet's small-size
  floors apply), `light` (default: the app light), `muted` (Field Guide "not yet": 35% saturation, no CSS filter).
  A pet's `silhouette` is PetArt's own.

### Progress and rituals (`@/art/progress`)
- `DayGlyph({ state: DayState, fraction })`, `Pressing({ species, share, rests })`,
  `NoteCard({ kind, sketch?: Routine, pressings? })`, `MonthJar({ stems: { habitId, plant }[] })`.
- `ObjectArt({ keepsake } | { routine })` (from `@/art/scene`) for the memory shelf and the Pet Card.

### Icons
- `<Icon name="tab-shelf" species={...} />`: the closest pet's species on the pot rim; `null` before the first pet (a
  sprig in the pot); left out, the cat.
- App icon and launch screen now live in `src/art/icons/appIcon.tsx` (`AppIconArt`, `IconScene`, `squirclePath`,
  `FAVICON_TILE`, `WALL_SHADOW_OPACITY`, `AppIconShape`) and `src/art/icons/splash.tsx` (`LaunchArt`). The PNGs, the
  favicon and the startup images are regenerated from them.

### Round 2 (M1 recheck)
- **Busy Sill opens on its pots.** `SillLayout.homeX1` (new) is where the window would end without the room added for
  tall decor. The sun crosses the sill only up to there and the lamp stands just past it (`lamp.x = home width - 22`),
  so both stay by the pots. The decor stretch runs on past the lamp, in front of the glass. `openScroll` keeps the
  last pot in frame by day as well as at night.
- **Stored Sill decor (`PlacedDecor.x/y` on the Sill)** is measured against `sillFloor(spec, pots)`: the Sill's natural
  length for its pots, from the window's left edge, with no room added for the screen or for tall decor. The same
  stored spot is the same place on a phone and a desktop, and adding tall decor moves nothing. Adding a habit adds a
  pot's length to the floor, so a placement moves along by at most one pot. `SillWorld.floor` is that floor (the edit
  layer uses it). Pets still roam the whole sill (`ground.x0/x1`).
- **Rim residents keep their weight on the rim.** `Perch.span` is a rim's x range. `seatDx`/`seatOn` keep at least
  `RIM_CONTACT` (62%) of a resident's contact shadow over the rim. A long or tall pet lies a little smaller on a rim
  (`RIM_SIZE` in `@/art/pets/world`: cow 0.75, dog 0.76, bear 0.9, and a look drawn bigger than its species comes back
  to its species' size). `seatOn(..., petId?)`, `actorSize(..., petId?)`, `PlanInput.petId` and `DirectorPet.petId`
  are optional additions. Pass the pet id where you have it.
- **Maskable icon**: `ICON_PLACE.maskable` keeps both animals inside the 80% safe circle, and a test pins it.
  `public/icons/icon-maskable-512.png` is regenerated. The other icons and splashes came out byte-identical.
- **Correction:** round 1 said every place uses the Sill's table lamp. The Sill, the Bookshelf and the Quilt do. The
  Balcony Box keeps its jam-jar lantern on the plant stand on purpose, because it is the one outdoor place (see
  request 13).

## Requests (outside my area)

1. **App icon / splash (#18)**: make `src/app/AppIconArt.tsx` `export * from '@/art/icons/appIcon';` and
   `src/app/SplashArt.tsx` `export { LaunchArt as SplashArt } from '@/art/icons/splash';` (then `SplashArt.module.css`
   can go). The install guide and `sections-fxui.tsx` (fxui-appicon, fxui-splash) then show the new icon. Fix DESIGN
   §1's App icon row (DESIGN:34) to describe the cat and the calf.
2. **Shelf tab (#19)**: in `src/app/TabBar.tsx` and `src/app/Sidebar.tsx`, pass
   `species={featured ? getCollectible(featured)?.species ?? null : null}` with `featured = featuredPetId(state)`
   (src/domain/friendship.ts:79, favourite → out → most XP) to `<Icon name="tab-shelf" …/>`. In `src/app/routes.ts:26`
   use `'tab-shelf'` instead of `'tab-meadow'` and drop the TODO.
3. **fxui demos (#20)**: in `src/dev/sections-fxui.tsx:386` use `pet-cow-holstein` or `pet-duck-yellow` for the best-friends
   demo, and vary the celebration pets at :1149 (e.g. dog-corgi, duck-yellow, cow-beltie, frog-tree).
4. **One light (#36)**: `src/features/capsules/sceneLight.ts` → `export { useArtLight as useSceneLight, artLightNow as sceneLight } from '@/art/scene';`
   (keep `isLamplight` as `readLamplight`), and `src/ui/art/objects.tsx` `themeLight()` → `return artLightNow();`.
   Call `setWindowHemisphere` from the app shell when settings load or change.
5. **Shade tokens (#53)**: add to `src/styles/tokens.css` `--shade-day: rgba(94, 76, 154, 0.16); --shade-lamp: rgba(10, 8, 22, 0.3);
   --contact-lamp: rgba(0, 0, 0, 0.22);` (the values of `src/art/shade.ts`, which the art and the tokens test already
   share). Machines no longer use `rgba(12, 9, 26, .34)`.
6. **Sparkle (#57)**: rename `src/ui/Sparkle.tsx` → `SecretSparkle` (keep `SPARKLE_PATH` for `fx/SparkleBurst`), and
   use it only for the Secret pill. The art-side leftovers (ART_OUTLINE, pets/geometry, plants/parts, scene SPARKLE,
   MeadowLegacy, Paint.ink) are deleted.
7. **Progress art location (#37)**: the four components are in `src/art/progress`. If the screens want them under
   `src/ui/art`, re-export: `export { DayGlyph, Pressing, NoteCard, MonthJar } from '@/art/progress';`. Logic: add
   `monthJar: { habitId, plant }[]` to todayVM.
8. **Capsule chute (#52)**: the pile's `#<uid>-glint` symbol is now a thin lit-side arc. For the one capsule in the chute
   or close-up, `src/features/capsules/CapsuleMachine.tsx:69` (`capsule(tint)`) should use `#${uid}-glint-close`.
9. **CollectibleArt consumers (#13)**: pass `px` with `size="100%"` in `RevealCard`, `Leaflet`, `SpecialOrder`,
   `RevealOverlay` (e.g. `px={150}`), and `muted` for "not yet" tiles in the Field Guide.
10. **Bundle**: `src/fx/CelebrationArt.tsx` should import `PlantArt` from `@/art/plants/PlantArt` and be lazy (the build
    finding); the entry chunk is 899 KB vs 885 KB at the base (the looks, flourishes, one light and carry pose).
11. **Blooms (#1, logic)**: see "Plants" above for the art contract.
12. **Voice (not art)**: RevealCard still says "Find them a place" / "Let them choose" and "The secret one!" (seen in the
    capsule cards screenshot).
13. **DESIGN §10.4 (one lamp design)**: record the Balcony Box as the one exception. It is outdoors, so its night light is
    the jam-jar lantern on the plant stand (`BALCONY_PLACE.lampAt`), and the pool is anchored to the lantern. Every indoor
    place uses the Sill's table lamp.
14. **DESIGN §9.4 / model docs**: a Sill placement's `x` is a fraction of the Sill's natural length for its pots
    (`sillFloor`), not of the visible sill. The store needs no change: fractions stay 0..1.

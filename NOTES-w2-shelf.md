# Wave 2 · the Shelf (branch `w2/shelf`)

The Shelf screen (`#/shelf`), the Pet Card sheet, the Field Guide, decor edit mode, the places map
and the basket, wired to the store. The demo household (`src/features/shelf/demo.ts`) is gone.

## What is where

- `src/features/shelf/ShelfScreen.tsx`: the screen. The `ShelfScene` (the Sill first, then each opened
  place) with the real household, the line from the sill (a caption, announced when things settle),
  the place jumps, Decorate and Basket, then the pets, the Field Guide card and the places map. The
  paper below the scene mounts the frame after the first paint.
- `model.ts`: pure adapters (pots in her habit order, pets out with home/place/favourite spot, decor via
  `decorToScene`, room per place, the place in view, the pantry and basket rows, the sill's extras).
- `captions.ts`: the caption matrix by the hour (`tap`/`evening`/`night`, `morning`/`afternoon`), never
  one of the last 5.
- `PetRoster.tsx`, `ShelfTools.tsx`, `PlacesMap.tsx`, `DecorTray.tsx`, `BasketSheet.tsx`, `FieldGuide.tsx`.
- `copy.ts`: the chrome words (see requests below).
- `src/features/pets/PetCardHost.tsx` + `PetCard.tsx` + `petCopy.ts`: the Pet Card for any screen
  (`openPetCard(id)`).

## Requests for the lead

1. **playwright.config.ts: a project for `e2e/shelf.spec.ts`.** No project's `testMatch` picks it up,
   so `npm run e2e` skips it. The spec sets its own viewports and colour schemes, so one project is
   enough:
   `{ name: 'shelf', testMatch: /shelf\.spec\.ts$/, use: { browserName: 'chromium' } }`.
   Until then it runs with a scratch config that spreads the real one (`.shots/pw-shelf.config.ts`,
   gitignored): `npx playwright test -c .shots/pw-shelf.config.ts`.
2. **VOICE.md rows for the Shelf's chrome** (all in `src/features/shelf/copy.ts` and
   `src/features/pets/petCopy.ts` `PET_CARD_UI`; please move them to lines.ts with the rows):
   - Section and button names: "Out on the Shelf", "Indoors", "Pets", "Places", "Decorate", "Done",
     "Basket", "Basket and pantry", "The basket", "The pantry", "Go there", "Go to Capsules", "Flip",
     "Put away", "Keep it", "Not now" (rename), "Or one of these", "Head" · "Face" · "Neck" · "Outfit".
   - "Drag a thing to move it. Tap one to flip it or put it away."
   - "{Place} has room for 24 things." · "{thing}, on {place}." · "{thing}, put away."
   - "Open {place}?" (the confirm before coins go).
   - Not enough coins for a place, in the capsule notices' shape: "{Place} is {price} coins. There are
     {count} in the jar." / "There’s 1 in the jar." / "Watering fills the jar."
   - "{count} here" (pets in a place), "More in the morning" (a treat with no servings left, instead
     of a 0), "Each treat restocks 2 servings every morning, up to 5."
   - The jar, said once above the places while one is out of reach: "There are {count} coins in the
     jar." / "There’s 1 coin in the jar." / "Watering fills the jar."
   - Decor edit mode when everything she owns is already out (instead of EMPTY.decor, which says
     decor "goes here"): "Everything you have is out. More comes from the capsules."
   - The found thing's VoiceOver label: "{A}, from {name}" ("A button, from Pudding").
   - Pet Card: "{name} keeps it company" (a Find-a-plant chip for a habit that has a companion),
     "Move {name} out of {plant}?" (asked before that companion moves out),
     "Friendship: {level}" (the dots' label), "Indoors, {name} rests and waits for a place on
     the Shelf.", "The Shelf has room for {count} pets out. Bring someone indoors first.", "Favourite"
     (the treat's tag and the heart button), "Left by the pot" (keepsakes), "Things to wear come from
     the capsules."
   - Field Guide: "{owned} of {total}", "Visits {from} to {to}", "This page is full.", "Pages",
     "Moonlit" (its page, beside the species pages and the category pages).
3. **A shared opener for the waiting note.** The note clipped to the sill is a button on the Shelf too;
   with nothing to open it here, a Sunday Note / Herbarium page / anniversary takes her to Today (where
   its card is) and a story opens Habit Detail. An `openLetter(id)` beside `openPetCard` in
   `src/features/habits/open.ts` would let the Shelf open it in place.
4. **Art: the Shelf scene's render cost.** On the 3-year × 20-habit save, in a production build on this
   (heavily shared, load ≈ 13 on 4 cores) container, switching to the Shelf takes 110–200 ms of render
   (Capsules: 25–100 ms on the same run). A CPU profile puts most of it in the art chunk
   (`ObjectArt-*.js` ≈ 150 ms self time) and in forced layout; my own parts (pets, Field Guide, places)
   now mount after the first paint. Worth a look in the scene: the 20 pots' `PlantArt`, the retired
   plants and each place's backdrop are all drawn on the first frame even off screen.
5. **Art: carrying a pet to another place.** A carry lands on the pet's own floor
   (`usePetTouch` → `nearestFree` on its ground), so a drop can't move a pet between places; the Pet
   Card's "Move {name}" does it. If the scene reported the place under the drop, the screen would call
   `setPetPlace` (NOTES-open item 4 describes it).
6. **Art: decor edit mode labels.** `DecorEdit.tsx` names every item "Keepsake" (not what it is) and
   has inline English ("Arrow keys move it, F flips it, Delete removes it."); `decorLabel` in
   `src/features/shelf/copy.ts` words a keepsake by its thing ("A paper bookmark").
7. **Memories: which rule wins.** The card now lists `pet.moments` (the day it came home, each
   "Look at us" bloom) with `pet.memories`, oldest first (DESIGN §14.1: a bloom "makes a Memory").
   Came-home always exists, so VOICE §17's `EMPTY.memories` ("Memories start once you’re best
   friends.") never shows now. Either keep it that way (and retire the line), or say which of the two
   the card should follow.
8. **Art: `ObjectArt` `fit`.** At tile size a flat keepsake (the paper bookmark) is a sliver on the
   100 canvas. `src/features/shelf/FitObject.tsx` crops the svg to its measured box; a `fit` prop on
   `ObjectArt` (like PetArt's) would do it in the art.
9. **Art: `ShelfSceneHandle.fracAtView(place)`.** A new thing in decor edit mode lands at the view's
    middle, measured on the floor the scene keeps fractions on (`decorXAtView` in model.ts uses
    `sillFloor(SILL_SPEC, pots)` and each place's `ground`). The scene could answer this itself with
    `sceneToFrac` on its own floor, so the screen never repeats the scene's geometry.
10. **tests/unit/voice.test.ts: a longer timeout.** The voice lint scans all of src; alone it takes
    about 5.4 s (over the default 5 s), and under load it times out, failing the full `npx vitest run`.
    `it(..., 30_000)` or `vi.setConfig` in that file would keep it green.
11. **Pets in edit mode.** While she decorates, the pets aren't buttons (`interactive={false}`): the
   decor hit boxes sit above them and axe flagged the obscured pet buttons (target-size).

## Known gaps

- Photo mode (stretch) is not built.
- A carried pet can't be dropped into another place (request 5).
- The Pet Card's feed row shows the favourite and 5 more; "Basket and pantry" (every treat, and a
  bake for any at its last serving) opens over the card when there are more.
- The basket holds harvest-only treats (cat grass, catnip, lavender shortbread); strawberries are a
  starter recipe, so they are in the pantry even though her strawberry plant tops them up.

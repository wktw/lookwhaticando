# Open after M1: for the screen builders

The four M1 fix areas (logic, art, ui, build) were merged and their cross-area requests landed in the
M1 integration (see `git log`). This file replaces NOTES-m1-logic.md, NOTES-m1-art.md, NOTES-m1-ui.md
and NOTES-m1-build.md: what is still open, and the contracts the screens build on. The older module
NOTES-*.md files are reference for their modules; the items in them that M1 closed are marked done.

## Still open

These wait on screens that are still stubs (Today, Progress, You) or on the Shelf screen being wired
to the store. Each names the contract that is already in place.

1. **Today: the window band.** Build `WindowsillBand`'s `pots` and `pets` with `bandPots(vm)` and
   `bandPets(vm, state)` (`src/state/views/today.ts`): card order, the current block first, only
   residents who are out. `pour(habitId)` already falls back to `coinToJar()` for a pot off the band.
2. **Today: the first-capsule card.** `todayVM.firstCapsuleWaiting` is true while the onboarding
   capsule is still on the house: show `TODAY_LINES.firstCapsuleWaiting` ("Your first capsule is waiting
   on the Capsules tab."), else `TODAY_LINES.firstCapsule` when `firstCapsule` (VOICE §16 step 6).
3. **Today: the month jar.** `todayVM.monthJar` feeds `MonthJar` from `@/art/progress` (import the
   Progress art from there; no `src/ui/art` re-export is needed).
4. **The Shelf screen, wired to the store.** `src/features/shelf/ShelfScreen.tsx` still shows the demo
   household (`./demo`: a cat, a cow, a bunny and a dog on the sill, a black cat and a hamster on the
   bookshelf). Map `shelfView.out` to `ShelfPet` as `{ key: pet.id, petId: pet.itemId, name, personality,
   outfit, home: companionOf, place: pet.place, favouriteSpot }`; a drop onto a place calls
   `store.setPetPlace(petId, place)` (`false` = refused, `null` = back to the Sill); decor goes through
   `decorToScene` / `sceneToDecor`. The Sill opens scrolled to its last pot (`openScroll`), so with the
   demo's five pots the first 390 px show the bunny and the dog; the cat and the cow sit in the first
   two pots, one swipe to the left.
5. **The Field Guide** (You): "not yet" tiles use `<CollectibleArt muted size="100%" px={…} />` (35%
   saturation, no CSS filter); only a Secret is a "?". The lineup leaflet on the cabinet keeps its
   tiles in full colour on purpose (it is the printed lineup, not the Field Guide).
6. **You › Accessibility: the keyboard-shortcuts switch.** `Settings.keyboardShortcuts` is stored and
   validated (absent = on with a mouse or trackpad, off on touch): "Keyboard shortcuts: 1–5 switch tabs,
   N plants a habit" (the copy wants a row in VOICE.md). Listen for `'ck:new-habit'`
   (`NEW_HABIT_EVENT`); the old `'mm:new-habit'` alias is gone.
7. **First boot of the file:// build offers *Import a backup*** (DESIGN §11).
8. **Manifest screenshots.** When Today is built, set `SCREENSHOTS[0].route` to `today` in
   `scripts/manifest-assets.mjs`, re-run `npm run manifest-assets`, and update the labels in
   `MANIFEST.screenshots` (vite.config.ts).
9. **e2e.** When onboarding starts gating the first boot, `openRoute` in `e2e/support.ts` must start from a
   finished onboarding.

Declined, with the reason:

- **Delete `EVERGREEN_LINE` (logic request 2).** It is derived from `STAGE_LINES[7]` (its second
  sentence), so there is still one source. The Evergreen banner's title already says "The Walk plant is
  Evergreen"; the full line would say it twice.
- **Move the file:// ribbon into App.tsx (build request 6, optional).** It works where it is
  (`src/main.tsx`, `data-test-copy`, asserted by `e2e/single-file.spec.ts`).
- **The cabinet's price chip** now steps aside whenever its type would print under 11 px (every phone and
  the desktop carousel today): the price is in MachineInfo's 16 px pill. A bigger chip would need a
  redraw of the slot plate; not needed for M1.

## Contracts the screens build on

### From logic (`src/domain`, `src/state`, `src/catalog`)

**Rule: the view models return kinds and numbers for anything VOICE.md governs.** The words come
from `src/catalog/format.ts`, and every template in it lives in `src/catalog/lines.ts`. Both are
exported from `@/catalog`. A formatter that would say a 0, or what's undone, returns `null`, and
the screen then shows nothing.

#### Today (`todayVM` / `selectToday`)

- **Greeting.** `greeting.timeOfDay` is gone. Use `greeting.period` (`greetingPeriod(hour)`) with
  `GREETINGS[birthday ? 'birthday' : period]`.
- **Date fields.** New: `shortDate` ("Sep 29"), `weekdayName`, and
  `backdating: { date, weekdayName, rewards }`. `backdatingBanner(date)` gives "Logging for Sat,
  Sep 27"; `forDayLabel(habit, date)` gives "Walk for Saturday".
- **The card.**
  - `subtitle` is a `StatusLine` union with the kinds `rested | count | tiny | period |
    period-done | streak | consistency | rooting | new | none`. Word it with
    `statusLine(card.subtitle, weekStart)`.
  - `pace` is `{ checkins, target, met, period: {kind, every}, current, from, to }`. It has no
    deadline and no `needed`.
  - `streak` is `{ length, unit, polarity, start, end }` (`runText(streak, 'card' | 'long')`).
  - `ariaLabel` is gone. Use `cardAriaLabel(card)`: the name, or "Drink water, 5 of 8 glasses"
    once there is a watering.
  - New: `waterings`, a monotonic tap counter for the plant art's `pulse`.
- **Vine chip and the day.** `vineChip(progress, coinsToday)` and `dayProgressAria(progress)`
  return `null` before the first watering, so the bar gets no value text. `weekDayAria(day)` and
  `blockSummary(block)` drop the counts at 0.
- **Rows.** `restingRow(paused)` and `TODAY_LINES.rows` ("Watered for the week", "This month",
  "Other days").
- **Letters.** `letterWaiting` is `{ id, kind: 'sundayNote' | 'herbarium' | 'anniversary' }`, for
  `TODAY_LINES.letterWaiting[kind]`.
- **The sill.** `sill[]` follows card order (the current block first). Each pot has `name`,
  `note`, `species` (was `plant`), `blooms` (undefined below Evergreen) and `pulse`.
  - A companion sits in its pot only while it is out.
  - A pet spending the day in another place never sits in a sill pot.
  - `bandPots(vm)` and `bandPets(vm, state)` build the band's inputs.

#### Plants

- `PlantVM.blooms` is what PlantArt takes. `PlantVM.extraBlooms` is the domain count (the domain's
  `bloomsFor` became `extraBloomsFor`, plus `artBlooms`).
- `nextLine` is gone. Use `forecastLine(plant)` ("4 more waterings to Blooming.").

#### Progress (`progressVM`)

- **Hero and week.** `hero.soFar` becomes `hero.daysSoFar {days, span}` (`monthSoFarLine`, or
  `soFarLine(hero.tally)` below 10 expected). `week.label` is gone (`weekLine(week.tally)`).
- **Trend.** `trend` is `{ kind: 'up' | 'level' | 'fact' | 'none', deltaPts, previous, fact? }`
  (`trendLine`). The old `'same'`, `text` and `comparedWith` are gone.
- **The other rows.**
  - `showedUp`, `goals` and `rests` lose `text` (`showedUpLine`, `goalsLine`, `restsLine`).
  - `recentMonths[]` gains `days` (`monthBarLabel`).
  - `records.bestStreak` is `{habitId, name, length, unit, polarity}` (`recordLines`), and
    `insights.busiestTime` loses `label` (`insightLines`).
  - `bestFact()` returns data (`bestFactLine`).
- **The year.** `YearQuiltVM.summary.text` is gone. Use
  `yearSummaryLine({ year, ...summary })` ("312 waterings in 2026, across 180 days").

#### Habit Detail and the editor

- `stats.phrase` is a `HabitPhrase` (`consistencyText`), and `pause.label` is gone (`pause.back`
  and `pause.upcoming` are dates).
- `upcoming` and `history[]` carry `change: RuleChange` (`ruleChangeText`) plus a ready `label`.
- `scheduleLabel` now reads "3 times a week", not "3× a week" (`scheduleText`, `SCHEDULE_LINES`).
- The habit-editor VM is `selectHabitEditor(id | null, templateId?)`, which returns
  `HabitEditorVM`.
- `HabitIssue.message` now comes from `HABIT_ISSUES` (`habitIssueMessage(code, max)`).

#### Pets and the Shelf

- `PetSummaryVM` (so `shelfView.out` and `indoors` too) gains `place` and `outfit`.
- `PetsVM` gains `closest: { id, species } | null`, for the Shelf tab's silhouette (§1 Many
  animals).
- `PetVM` gains:
  - `spot` (level 4 and up), `bestFriend` (level 8 and up) and `suggestedPlace`;
  - `memories: PetMemory[]`, dated, for `memoryText`;
  - `likes`, which is `{kind:'treat', treatId} | {kind:'tag', tag} | {kind:'plant', plant}`;
  - `company.knownFor.since`. "Known for" is sticky once shown.
- `BadgeVM.hidden` is true for "Key under the mat" until it is earned.
- The Field Guide category label for pets is 'Pets'.

#### Store

New:

- `setPetPlace(petId, place | null): boolean`
- `letPetChoose(petId): { habitId, place } | null`
- `exportCsv(): { name, text }`
- `wateringTimeFile(slot): { name, text } | null`
- `selectHabitEditor`

Changed:

- `buyPlace` returns `movedIn: string[]`.
- `completeOnboarding({ name, templateIds, customHabits?, dayStartsAt?, birthday })` returns the
  new habit ids, 3 at most across starters and "Make my own".
- `pull(m, { free: true })` works on all four cabinets.

#### Events (`GameEvent`)

- `plantStage` no longer sends `stageName`. Word it from `stage`.
- `letter` carries `kind`.
- Coins and stamps gain `reason: 'spend'` with a negative amount; the celebration planner skips any amount ≤ 0, so a paid pull never shows a bonus.
- The stamp reasons are `showup | letter | herbarium | badge | fusion | grow | album | spend`.
  `bloom` became `herbarium`, and `gift` became `grow` or `album`. These reasons exist only in
  events, never in the save, so no migration is needed.

#### Domain and state

- **Capsules.** `FIRST_CAPSULE_MACHINES` holds four cabinets. `WISH_PRICE.common` is 3 (the stamp
  pace, DESIGN §6). `OwnedItem.ordered` marks a copy that came from a Special Order, so the
  collect-N pins count capsule copies only.
- **Pets.** `PetState` gains `place`, `spot`, `bestFriend`, `bestFriendsOn` and `memories`, all
  optional and validated. `CompanyPair.knownForSince` is new.
- **Welcome home.** A partial tap no longer uses up Welcome home.
- **Sunday Note.** It arrives from 18:00 (`SUNDAY_NOTE_HOUR`) on the week's last day, so on
  Sunday with a Monday week. The store's tick delivers it without a reload.
- **Places.** Never-placed pets settle into open places they love once a day
  (`settleUnplacedPets`).
- **Onboarding.** `ONBOARDING_STARTERS` holds the eight onboarding chips. `MachineDef.seasonal.emoji`
  is gone.

#### Copy constants added to lines.ts

`STATUS_LINE`, `PERIOD_WORDS`, `RUN`, `CONSISTENCY_LINES`, `TODAY_LINES`, `COUNTS`,
`PROGRESS_LINES` (alias `PROGRESS_HERO`), `PET_CARD`, `MEMORIES`, `PLACE_LINES` (alias
`PLACES_OPENED`), `COMPANION`, `STORIES`, `KEEPSAKE_CAPTIONS`, `LOOKS`, `TIME_NUDGE`,
`SEASON_REVIEW`, `BIRTHDAY`, `CAME_HOME`, `ONBOARDING`, `EMPTY`, `ERRORS`, `INSTALL`,
`REMINDERS`, `DATA`, `SETTINGS`, `WALLET`, `CATEGORY_LABELS`, `CAPSULE_NOTICES`,
`SCHEDULE_LINES`, `HABIT_ISSUES`, `STAGE_NAMES`. They are copied from VOICE.md, and VOICE.md wins
on any user-facing string.

Since then (integration): `todayVM.monthJar`, `todayVM.firstCapsuleWaiting`, `closestPet(state)`
(`src/state/views/pets.ts`, the Shelf tab's species without the whole pets view), `choseLine(name,
chose, habit)` in format.ts for "Let {name} choose", and in lines.ts `PERFECT_DAY`, `WELCOME_HOME`,
`KEEPSAKE_NOTE`, `KEEPSAKE_THINGS`, `SEASON_REVIEW.waiting`, `TODAY_LINES.firstCapsuleWaiting`. The
events' `plantStage.stageName` is gone and `letter.kind` is required.

### From art (`src/art/**`)

#### Pets on the Shelf (`ShelfPet`, `@/art/scene`)
- `place?: PlaceId`: the place it is out in. A place that is not in `places` falls back to the Sill.
- `favouriteSpot?: string`: `'pot:<habitId>'` (that pot's rim, or beside its cutting's glass), `'decor:<PlacedDecor.id>'`
  (that bed or box), or a place id (only a preference; `place` still decides where it is drawn). A pet goes to its
  favourite spot after the residents and before the rest, while the spot is free.
- `home?: habitId`: the companion lives in that plant (the rim, or the routine's object on a routine day).
- Map from the VM as `{ key: pet.id, petId: pet.itemId, name, personality, outfit, home: companionOf, place: pet.place, favouriteSpot }`.

#### Touch and the Pet Card (`SillScene`, `ShelfScene`)
- `onPet?(key, rect: DOMRect, gesture: 'tap' | 'stroke' | 'boop' | 'carry')`: each pet is a real `<button>` named after
  the pet (`aria-label` = its name). Keys: Enter or Space tap, B boop, S stroke. The screen pays the (capped) XP.
- `onOpenPet?(key)`: the name tag that floats up after a tap is a button ("{name}’s card") that opens the Pet Card.
- `interactive?: boolean`: buttons without handlers (the gallery).
- `ref: ShelfSceneHandle` = `{ react(key, expression), spotOf(key): DOMRect | null }` (anchor the Pet Card popover).
- `editDecor?: { onMove(key, frac: {x, y}, place), onFlip(key), onRemove(key) }`: every placed item becomes a draggable
  keyboard button (arrows move it, F flips, Delete or Backspace removes). `key` is `PlacedDecor.id`. Positions come back
  as the store keeps them (fractions of the place).
- `PetArt` has `pose="carry"` (the pet lifted by the scruff, legs dangling).

#### Decor between the store and the scene
- Pass `decor={placed.map((d) => decorToScene(d, (id) => keepsakeOfItem(state, id)?.kind))}`. The scene resolves the
  0..1 fractions against the place it draws; `sceneToDecor(x, depth, floor)` is the inverse. A keepsake placed as
  `'keepsake:<id>'` draws from its kind (`KEEPSAKE_ART`, 12 families and the brass seed).

#### Today band and Sill extras (`WindowsillBand`, `SillScene`, `ShelfScene`)
- `cutting?: { stage: 0..7, overall: 0..1 }`: the Cutting (CuttingVM).
- `found?: { seed: number, label?, onTap? }`: today's found thing (one of seven, by seed); a button when `onTap` is given.
- `note?: { kind: 'sundayNote' | 'herbarium' | 'anniversary' | 'story', label?, onOpen }`: a clipped note, a real button.
- `cake?: boolean`: her birthday.
- Per pot (`SillPot`): `bow?: boolean` (came-home day), `routine?: Routine` (the companion's routine today; its object
  stands by the pot and the companion settles on it), `look?: { colour, shape, partnerColour? }`, `flourishes?: 0..8`.
- The band hides the plant tags by default; `tagFor={habitId}` shows one (the pot just tapped), `tags` shows all.

#### Plants
- `blooms` means flowers **showing** from Blooming on (0..6). Leave it out below Evergreen so it follows the stage;
  at Evergreen pass `Math.min(6, 5 + extraBlooms)`. An explicit 0 draws none.
- `look` (Blooms Like You) and `flourishes` on `PlantArt`, `SillPot` and `CardPlant`.
- `CardPlant` (import from `@/art/plants/CardPlant`, not the index, to keep the entry chunk lean):
  `{ species, stage, progress?, blooms?, pot, damp?, look?, flourishes?, residentPetId?, residentExpression?, icon?,
  tone?, size = 56, light?, animated?, pulse?, title? }`. The resident peeks at ≤ 20 px; the habit icon is on a stake.
- `PlantArt fit="icon" withPot` now shows a cutting beside its empty pot, framed to hold both.
- `PlantTag` has `side` and the 11/10 px floors. `iconFrame` and `ICON_FRAMES` are exported.

#### One light (`@/art/scene`)
- `setWindowHemisphere(settings.hemisphere or todayVM.season.hemisphere)` once at start-up and when it changes.
- `useArtLight()` / `artLight` / `artLightNow()`: the light for art outside a scene (the lamp in Lamplight, else the
  window at this hour). `CollectibleArt`, `CardPlant` and the Progress art read it by default. Scenes use `windowMoment`.

#### CollectibleArt
- New props: `fit` (default true: a pet fills its tile, sitting), `px` (give it with `size="100%"` so a pet's small-size
  floors apply), `light` (default: the app light), `muted` (Field Guide "not yet": 35% saturation, no CSS filter).
  A pet's `silhouette` is PetArt's own.

#### Progress and rituals (`@/art/progress`)
- `DayGlyph({ state: DayState, fraction })`, `Pressing({ species, share, rests })`,
  `NoteCard({ kind, sketch?: Routine, pressings? })`, `MonthJar({ stems: { habitId, plant }[] })`.
- `ObjectArt({ keepsake } | { routine })` (from `@/art/scene`) for the memory shelf and the Pet Card.

#### Icons
- `<Icon name="tab-shelf" species={...} />`: the closest pet's species on the pot rim; `null` before the first pet (a
  sprig in the pot); left out, the cat.
- App icon and launch screen now live in `src/art/icons/appIcon.tsx` (`AppIconArt`, `IconScene`, `squirclePath`,
  `FAVICON_TILE`, `WALL_SHADOW_OPACITY`, `AppIconShape`) and `src/art/icons/splash.tsx` (`LaunchArt`). The PNGs, the
  favicon and the startup images are regenerated from them.

#### Round 2 (M1 recheck)
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
  `public/icons/icon-maskable-512.png` is regenerated (and, in the integration, the 192 px one, now from generate-icons).
- **Correction:** round 1 said every place uses the Sill's table lamp. The Sill, the Bookshelf and the Quilt do. The
  Balcony Box keeps its jam-jar lantern on the plant stand on purpose, because it is the one outdoor place (see
  DESIGN §10.4).

Since then (integration): the capsule reveal, the order grid and the leaflet pass `px`; the capsule in
the chute uses `#<uid>-glint-close`; `CabinetArt` hides its price chip below 240 px wide
(`PRICE_CHIP_MIN_WIDTH`); `sceneLight`/`useSceneLight` (capsules) and `themeLight` (ui) are the one light,
and the shell calls `setWindowHemisphere`; tokens.css names `--shade-day`, `--shade-lamp`,
`--contact-day`, `--contact-lamp`; `SecretSparkle` (`src/ui/SecretSparkle.tsx`) is the Secret's only
sparkle.

### From ui (`src/ui`, `src/fx`, `src/app`)

- `toast({ actions })`: up to two buttons (`ToastAction[]`, `MAX_ACTIONS = 2`), in order. The single
  `action` still works (it goes first).
- `showCheckInNote({ habitId, habitName, coins, kind?, tiny?, count?, unit?, date?, events?, note?,
  onUndo, onAddNote? })`: words the note from lines.ts CHECKIN_TOASTS ('watered' | 'count' |
  'tiny' | 'noCoins' | 'history'; inferred when `kind` is left out). Pass the check-in result's
  `events` so the harvest line and the companion's aside (from companionXp) show. With
  `onAddNote` it offers "Undo" and "Add a note".
- `showUncheckNote({ habitId, habitName, refunded, spent? })`: the un-watering note.
- Screen readers hear a burst of waterings as "3 habits watered. Plus 14 coins. Undo available."
- `pushLayer(id, { moment: true })`: a full-screen moment (the capsule reveal, the epic card).
  While one is open, celebration banners and toasts wait (timers stopped) and arrive after it.
  Sheets opened above a moment stack normally and make it inert.
- The capsules feature's own sheet, button, scroll lock and focus trap are gone: it uses
  `@/ui/Sheet` (new `aside` prop for header extras), `@/ui/Button` (new `face` prop for a
  series' painted face, and `buttonRef`) and `@/ui/Pill`.
- `CelebrationArt` is no longer imported statically anywhere: use `LazyCelebrationArt` from
  `@/fx/celebrationArtLoader` (a same-size blank until the art chunk arrives). The entry chunk
  is now 320 KB / 114 KB gzip (was 885 / 304).
- `CelebrationContext` gained optional `petSpecies`, `petFriend`, `albumName`, `lamplight`, and
  `HabitInfo` optional `stage` and `avoid`.
- `ObjectArt` names are `'watering-can' | 'note' | 'drop'`; `EmptyPot` and `CuttingGlass` are gone
  from `@/ui/art/objects` (use `PotArt pot="terracotta"` and `PlantArt species="pothos" stage={0}`).
  The celebration art spec still accepts `{ type: 'object', name: 'pot' | 'cutting' }` and draws
  those with PotArt and PlantArt.
- `@/fx/frameMonitor`: `watchScene(root)` (ScreenHost runs it for the Shelf). It sets
  `<html data-lite>` when the median frame is over 25 ms, `data-offscreen` on pets off screen and
  `data-flick="on|off"` on each `.pet-art`, so art must keep the class names `.pet-tailflick`,
  `.pet-earflick`, `.pet-throat`, `.pet-wag`, `.pet-twitch`, `.pet-chew`, `.pet-wave`,
  `.pet-bob`, `.pet-waddle`, `.pet-hop` and `.plant-sway` (all stop in lite mode and on pets
  that are not among the nearest few; `.pet-breathe` and `.pet-blink` always run). A new small
  idle loop in the art needs adding to the two rules in src/styles/global.css.
- Tab changes are announced ("Capsules"), and after keyboard navigation focus goes to the
  screen's `h1` (given `tabIndex=-1` if it has none). Every screen needs exactly one `h1`.
- Single-key shortcuts: `shortcutsEnabled()`, `NEW_HABIT_EVENT = 'ck:new-habit'`.
- Reveal buttons: "Find {name} a plant" · "Let {name} choose" · "Not now" for a new pet; "Find it a
  place" for decor. `PlaceHandlers.onPlace(itemId)` / `onLetThemChoose(itemId)` are unchanged.

Since then (integration): a Special Order's reveal clears `pendingReveal` when it closes and resumes as
an order after a reload (CapsulesScreen); "Let {name} choose" calls `store.letPetChoose` and toasts
`choseLine(…)` when no host handles it.

### From build

- Each screen renders exactly one visible `h1` inside `<main>`. The e2e specs wait for `main h1` on every route and
  check the theme, console errors, axe (WCAG 2.2 AA plus best practice) and 320 px reflow.
- When onboarding starts gating the first boot, update `openRoute` in `e2e/support.ts` so it starts from a finished
  onboarding.
- First-paint budget: 150 KB of JavaScript, gzipped (`npm run size`, which counts the entry plus its static imports).
  Import screens, art libraries and celebration art lazily. Nothing on the shell path may statically import `@/art/*`
  galleries, `CollectibleArt`, `PetArt` or `CelebrationArt`.
- Any fixed UI at the top of the screen must pad by `var(--safe-top)`. On file:// this includes the ribbon.
- The voice lint reads every string under `src`. Put `// voice-ignore` on a line only for developer-facing strings.

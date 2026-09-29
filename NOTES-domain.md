# Domain notes for other teams

Requests, readings and integration notes from the logic layer (`src/domain`, `src/state`) for the catalog, the
screens and the shell. The bible is `docs/DESIGN.md` (catkin, v2). Code comments cite its sections; "v1 §13.x" cites
the audit amendments of the archived first bible (`docs/archive/DESIGN-v1-mochi.md` §13), now folded into the catkin
sections listed at the end.

## catkin adaptation (stage A): what the screens use

There is no mascot, no buddy and no meadow any more. Every change below is in the logic layer's contract.

### State (`src/state/types.ts`)

- `profile.buddy` is gone. A new save owns **no pets**; the first comes from the "Cats or Cows?" capsule.
- `meadow: { zones, decor }` → `shelf: { places: PlaceId[]; decor: PlacedDecor[] }`. `places` always starts with
  `'sill'` and stays in Shelf order. `PlacedDecor.zone` → `PlacedDecor.place` (`PlaceId` from `@/catalog/types`).
  `MeadowZoneId` is gone.
- `PetState.daily.buddy` is gone (no buddy XP). `PetState.inMeadow` keeps its name, like `stars` and `stardust`: it
  means **out on the Shelf**.
- New, optional: `found?: FoundThing[]` (`{ date, petId, seed }`), the found things of the last 14 app days.
- New once-keys: `'gift|first-capsule'` (the onboarding capsule was pulled) and `'found|<date>'`.
- Storage: `catkin:v1`, `catkin:demo:v1`, `catkin:theme`, `catkin:undo-import`; the writer lock `catkin:writer`;
  IndexedDB `catkin`. Backups are `{ format: 'catkin-backup', … }`; the clipboard handoff is `CK1:` (gzip) or `CK0:`
  (plain fallback). There were no users, so there is no migration from the Mochi keys.

### Store (`src/state/store.ts`)

- `pull(machineId, { free: true })` is onboarding's "Cats or Cows?" capsule (see the reading below). The domain's
  `canPullFree(state, machineId)` says when to offer it; `capsulesVM().machines[i].free` carries it.
- `buyZone` → `buyPlace(place: PlaceId): PlacePurchase` (`{ ok: true; place } | { ok: false; error }`). Nothing
  outside the logic layer called `buyZone`, so there is no alias.
- `toggleInMeadow` → `togglePetOut(petId)`. `setBuddy` is gone.
- `placeDecor(itemId, place, x, y, flip?)` and `moveDecor(id, { x, y, place, flip })` take a place.
- Series ids are catkin's: `cats cows dogs pond garden pantry night` and `autumn winter valentine spring summer`.

### Events (`src/state/api.ts`)

- New: `{ type: 'foundThing'; petId; date; seed; swaps }` (a `stardust` event follows).
- `coins` with a negative amount and `reason: 'gift'`: the free capsule spending First Sprout's top-up.
- `PetInteractionResult.line` is gone: the screen picks the caption (`lines.ts`) from the pet's personality and
  species. `ZonePurchase` → `PlacePurchase`.

### Views (`src/state/views/*`, `src/state/selectors.ts`)

View models carry data, not catalog prose or emoji; the screens word them from `src/catalog/lines.ts`.

- `todayVM`: `greeting` is `{ timeOfDay, hour, name, birthday }` (no `text`). `buddy` is gone. `sill[i].resident` is
  `{ petId, companion } | null`: until Keeping Company, the pets out take the pots in order (favourites first, then the
  closest friends), so each habit is "watered by whoever is nearest" and `companion` is false. `sill[i].done` is damp
  soil. New: `cutting` (The Cutting) and `found` (today's found thing). `firstCapsule` is unchanged.
- The card status line follows §9.1.1 to the end: a new plant reads `{ kind: 'rooting', text: 'Rooting · 2 more to
  pot up' }`, or `'Just planted'` (no emoji).
- `progressVM`: `sprout` → `cutting: CuttingVM` (`{ stage, progress, overall, toNext, framed }`); `garden[i].greenhouse`
  → `retired`; the best fact and rests lines lost their emoji.
- `meadowView`/`meadowVM` → `shelfView`/`shelfVM`: `{ places, capacity, out, indoors, decor, inventory, cutting }`.
- `petsVM`: `{ pets, out, capacity, featured }`. `PetSummaryVM`: `inMeadow` → `out`, new `featured`; `buddy`, `mochi`
  gone. `PetVM`: `nameLocked` and `personalityEmoji` gone; `perks` are `{ level, perk: LevelPerk, unlocked }` ids;
  `favoriteTreat.hint` is `{ kind: 'tag', tag } | { kind: 'plant', plant } | { kind: 'unknown' }`.
- `walletVM`: the "What can I get?" `lines` became numbers: `coinsFacts { capsules, toNext, price }` and
  `stampsFacts { nightPulls, nightPrice, canOrderClassic, classicPrice }`; `dust` is `{ have, of }`.
- `MachineCardVM`: new `label` ("No. 02 · Cows") and `free`; `seasonal` is `{ until }`; `pityHint` → `pity: { tier,
  within } | null`; `luckyText` gone. `CapsulesVM.away[i]` is `{ id, name, back }`.
- `WishItemVM.note` → `arrives: DateKey | null`. `BookItemVM.from` is the series label ("No. 01 · Cats") or
  Starter / Exclusive / Harvest, and `visits` is month/day bounds. `BadgeVM.emoji` is gone.
- `lettersVM` was renamed in stage B (`memoryShelfVM`, below).

### Domain helpers the screens may call

`featuredPetId(state)` (a favourite out, else any favourite, else the closest friend out, else the closest friend),
`theCutting(lifetimeSunshine(ledger.sunshine))`, `canPullFree`, `isFirstCapsule`, `LEVEL_PERKS`, `FOUND_THING_LEVEL`,
`sillResidents(state)`, `favoriteHint(treatId)`.

## Spec readings (stage A)

1. **The onboarding capsule and First Sprout are one gift.** §9.6 has both: step 3 tops the jar up to 25 coins and step
   4 pulls a free capsule. Taken before any check-in, the free capsule costs nothing and First Sprout never pays
   (it only pays before the first pull). Taken after First Sprout, it spends exactly the coins First Sprout added
   (capped by the jar), so the coins her check-ins earned stay hers and the gift is never two capsules. It is offered
   once, on Cats or Cows only, as the first pull; it doesn't touch pity.
2. **Every first capsule is a pet.** A new save owns none, and "animals are on Today at all times" (§10.1): the first
   pull ever, free or paid, on any series, is a guaranteed Classic or Special pet from that series and doesn't
   advance pity. This replaces the old rule (first pull on Kitty or Moo).
3. **Found things: one a day for the whole Shelf.** §8.2 says an L6 pet "leaves a small found thing on the sill on
   days you check in (1 swap, never a chore)". The logic leaves one a day: on the first reward-path check-in of an
   app day, one pet out on the Shelf at level ≥ 6 (chosen at random) leaves it, and the swap is collected at once. With
   one per L6 pet, ten old friends would mint a stamp a day. Rests, history edits and closing days leave nothing, and
   it is never taken back.
4. **The Cutting** sums `ledger.sunshine` over every key, deleted habits included (their ids are never reused), so it
   only grows. Its stages have no names in the bible, so the view gives numbers and `overall` (0–1) for the vine.
5. **Memories rule**: a seasonal edition has "visited" once it was on for at least one day since the profile was
   created. A profile created mid-season can order that season's items at once (the old reading, "a window that
   *started* after creation", made her wait a year for the season she met on day one).
6. **Levels**: L9 changes nothing new and bond levels 11–15 are cosmetic, as in §8.2.
7. **No XP from check-ins without a companion.** §8.2 lists petting, treats, a companion's check-ins and
   duplicate pulls. The buddy bonus is gone; companion XP comes with `Habit.companionId` (stage B).

## The three pillars and the rituals (stage B): what the screens use

All new state is optional, so older saves stay valid; `validate.ts` checks every field and its
cross-references. Nothing here pays except Grow's stamp (§14.3) and the Sunday Note / Herbarium
stamps of §6 (unchanged, upward differences only).

### State (`src/state/types.ts`)

- `Habit`: `companionId?` (§14.1), `why?` (≤ 140), `anchorHabitId?` (stacking), `endsOn?` ("just this
  season"), `ribbon?` (retired with a ribbon: its last day), `timeNudge?: 'moved' | 'left'`.
- `DayLog.starred?: true`: only a starred note is ever quoted in a Sunday Note.
- `PetState.daily.company?`: XP its habit's check-ins paid today (≤ 30).
- `LedgerEntry.co?: { pet, sun, watered? }`: the companion's share of an occurrence (internal).
- `company?: { pairs: Record<'<petId>|<habitId>', CompanyPair>; offer: { shownOn?, declines } }`, where
  `CompanyPair = { petId, habitId, since, sunshine, waterings, stories?: { start|why|lookAtUs: { on, readAt? } }, whyAsked? }`.
- `keepsakes?: Keepsake[]` (`{ id: 'k-<habitId>-<stage>', habitId, petId, stage: 1|4|5|7, kind, date, note? }`,
  `kind` one of the 12 families or `'brass-seed'`).
- `plantLooks?: Record<habitId, { looks: PlantLook[]; shown: number | null; chosen?; reads: { bloom?, evergreen? } }>`
  (`PlantLook = { colour, shape, read, on, evidence }`; `shown: null` is Classic).
- `stageDates?: Record<habitId, { [stage]: DateKey }>`: the day each stage was first reached.
- `seasons?: { pending?: SeasonRecord; filed: SeasonRecord[] }` (`SeasonRecord = { key, name, start, end,
  hemisphere, plants (≤ 8: { habitId, plant, fromStage, toStage, waterings, petId? }), waterings, filed? }`).
- `Letter`: weekly gains `waterings`, `highlights` (≤ 2 `SundayHighlight`s), `ps` (`SundayPS`); monthly gains
  `pressings` (`HerbariumPressing[]`), `margin`, `firstPage` (it no longer writes `stems`); new kind
  `'anniversary'` (`{ id, date, years, firstHabitId?, waterings, stars: 0 }`).
- `Settings`: `showCompanions?` (default on), `hemisphere?: 'north' | 'south'` (absent = inferred),
  `compactToday?`, `quoteNotes?` (default on).
- Once-keys: `'company|<habitId>|<date>'` (compacted with the window), `'anniversary|<YYYY>'`.

### Store (`src/state/store.ts`)

`setCompanion(habitId, petId | null)` · `noteCompanionOffer()` (call when the offer is shown) ·
`declineCompanionOffer()` · `readStory(habitId, story)` · `answerWhy(habitId, text | null)` ·
`setKeepsakeNote(id, text)` · `placeDecor('keepsake:<id>', place, x, y)` places a keepsake ·
`setPlantLook(habitId, index | null)` · `answerTimeNudge(habitId, move)` ·
`resolveSeasonReview(choices | 'skip')` ([] = "Keep everything") · `tuneHabits(choices)` ·
`starNote(habitId, date, starred)` · `updateSettings({ showCompanions, hemisphere, compactToday, quoteNotes })`.
`HabitInput` gains `why`, `anchorHabitId`, `endsOn` (validated: `anchor-self|unknown|archived|cycle`,
`ends-on`, `why`). `StoreRuntime.timeZone?` (the device zone; onboarding stores the inferred hemisphere).

### Events (`src/state/api.ts`)

`companion` (moved in) · `companionXp { petId, habitId, date, xp }` · `story { petId, habitId, story }` ·
`keepsake { keepsakeId, petId, habitId, stage, kind }` · `look { habitId, colour, shape, read }` ·
`seasonReview { season, key }` · `retired { habitId, ribbon }`. The anniversary note arrives as `letter`.

### Views

- `HabitCardVM`: `damp`, `companion: { petId, routine: { petId, routine, phase } | null } | null`,
  `after: { habitId, name } | null`, `look: { colour, shape } | null`, `endsOn`. Cards (and `liveHabits`)
  are in stack order: a follower right after its anchor.
- `SillPotVM`: `damp`, `routine`, `bow` (the resident's came-home day), `look`; `resident` is the
  companion (`companion: true`), else the nearest pet out not already living in a pot.
- `TodayVM`: `letterWaiting` is now `{ id, kind: 'sundayNote' | 'herbarium' | 'anniversary' } | null`
  (oldest unread); new `showCompanions`, `compactToday`, `season { name, start, end, hemisphere }`,
  `seasonReview: SeasonReviewVM | null`, `storyWaiting`, `birthday: { petIds } | null`, `cameHome`,
  `companionOffer: { petId, suggested, habitIds } | null`.
- `HabitDetailVM`: `why`, `companion: CompanionVM | null` (`{ petId, since, waterings, stories: StoryVM[],
  askWhy, moment, routine }`, `StoryVM = { id, unlocked, on, read, remaining }`), `keepsakes`, `looks { looks,
  shown, tag, waiting }`, `journal: JournalEntry[]`, `timeNudge { from, to, band, usualMinute } | null`,
  `after { habitId, name, keptTogether }`, `followers`, `checkinsToBlooming`, `endsOn`, `ribbon`, `tune`.
- `PetSummaryVM.habitId`; `PetVM`: `cameHomeYears`, `company { habitId, since, knownFor, history }`,
  `suggestedHabit`, `keepsakes`, `moments` (came home, each "Look at us").
- `ShelfVM`: `keepsakes`; `inventory` and `decor` carry `keepsake` for keepsake items.
- `lettersVM`/`lettersView` → `memoryShelfVM`/`memoryShelfView`: `{ unread, next, items: RitualVM[],
  sundayNotes, herbarium: { year, pages }[], retired, seasons }`. A `SundayNoteVM` carries no tally.
- New: `seasonReviewVM` (inside `todayVM`: the time-lapse, counts, the season starting, the finished
  "just this season" habits) and `tuneVM`/`tuneView` ("Tune my habits", and the review card's chips).
- Helpers: `checkinsToStage`, `ritualKind`, `ritualDate`, `companionVM`, `petCompanyVM`, `keepsakeVM`.

### Domain helpers the screens may call

`companionOfferOpen`, `suggestHabitFor` ("Let them choose"), `companionXpFor`, `STORY_SUNSHINE`,
`routineOf`, `ROUTINES`, `KEEPSAKE_FAMILIES`, `readTimes`/`eligibleTimes`, `justThisSeasonEnd`,
`seasonAt`, `nextSeasonStart`, `inferHemisphere`, `hemisphereOf`, `freshStartOptions`, `tinierPatch`,
`growPatch`, `gardenJournal`, `keptTogetherDays`, `stackOrder`, `anniversaryOf`, `cameHomeToday`.

## Spec readings (stage B)

1. **Stories** unlock on companion sunshine 7 · 21 · 42 (a faithful week is 7 sunshine for every rhythm;
   21 and 42 are Budding's and Blooming's thresholds); Look at us also needs the plant at Blooming. One
   story per check-in at most (like one stage per check-in), in order, never taken back.
2. **Companion sunshine** is kept per occurrence in the ledger entry, so an un-check inside the window
   takes it back from the pet that had it (even after a move) and a rule edit re-prices it. Growth while
   a *different* pet holds the day's share goes to nobody.
3. **Companion XP**: the tiny version counts as a completing check-in (full XP); once per occurrence
   (an un-check and re-check can't pay twice); the 30-a-day cap is per pet per action day; only
   reward-path check-ins (the 6-day window), never history, never a flexible check-in beyond `times`.
4. **The offer's counters are global**: one offer a day in all, and after 3 declines in all it never
   comes back. Pairing by hand is always possible, and pairing counts as the day's offer.
5. Archiving, retiring or deleting a habit frees its companion (and its followers stop following it).
   Pairing records stay (a pet that returns to a plant carries on), except a deleted habit's.
6. **Keepsakes** need a companion when the plant first reaches the stage; pairing later brings none for
   stages already reached. Learn (laptop, lightbulb, language) keeps the *read* family's bookmark. The
   caption is her latest Moment at that moment, copied (editable).
7. **Routines**: 'starting' from Potted on days the habit was done, 'settled' every day from Blooming
   (the plant's shown stage). The 14 ids and the icon map mirror `ARCHETYPES`/`ARCHETYPE_BY_ICON` in the
   voice module's `lines.ts`.
8. **The colour**: a day's time is its last live stamp; bands Dawn < 9:00 ≤ Sunlit < 18:00 ≤ Twilight;
   "usually" = a band with ≥ 60% of the eligible days, else Wildflower; only the stamps still kept (120
   days), so the Evergreen re-read reflects now. A read with < 10 eligible days waits and is retried on
   later check-ins (it never guesses a colour). A burst is ≥ 3 habits' stamps inside one 120-s window.
9. **The shape**: Paired beats Petite; Petite counts the whole history. A kept-together day is one where
   both were done and, when both were live, the follower came at or after the anchor.
10. A new look is shown unless she chose one herself; a re-read equal to a look she has adds nothing.
11. **The nudge** uses the Today blocks (morning < 11:00 ≤ midday < 17:00 ≤ evening) with the same ≥ 60%
    of ≥ 10 days; "offered once" means either answer closes it for good.
12. **Journal**: nothing inks before day 8; the steadiest day from day 15 (ties to the earlier day of her
    week); the tiny sentence appears only for a habit that has or had a tiny version.
13. **Seasons** are meteorological (Mar/Jun/Sep/Dec 1 in the north, six months on in the south); the
    southern-zone list is in `hemisphere.ts`, and onboarding stores the inference.
14. **The review card** is only for the season just ended, only if she opened the app during it and it
    had a watering. Seasons she never opened the app in are filed silently; a season with no watering is
    not filed; a card still pending when the next season begins is filed as skipped.
15. **Fresh start**: Tinier = half the count, one fewer time, a rarer every, or daily → 5 a week (edits
    "this period"); Grow = one more step / time / weekday, from tomorrow, paying its stamp only while
    "Ready to grow?" stands; Rest = paused through the day before the next season; Finish = archived as of
    yesterday (today if already watered) with a ribbon.
16. **Just this season** retires on the first open after `endsOn`, archived as of `endsOn`; restoring it
    takes the ribbon off (and a past `endsOn`).
17. **Sunday Note**: highlights in order stage-up · newcomer · every day (else the most watered) · new
    plant · tiny (≥ 2 days) · kept together (≥ 3 days), the first two kept; the P.S. is the companion
    watered on the most days (at Potted or later), else a found thing; contents are frozen when written.
18. **Herbarium page**: habits watered or rested that month; margin note priority bloom · came home ·
    planted; the first page is marked.
19. **Birthday cards** come from the pets out on the Shelf. **Came-home days** use the arrival's app day.
    The **anniversary note** is written on the first open within 7 days of the day, pays nothing, and is
    an inbox item of kind `'anniversary'`.
20. **Show companions** off hides companions, stories and the offer from the screens; pairing, XP and
    stories carry on underneath (it is a display setting).

## Requests from stage B

- **voice** (`src/catalog/lines.ts`): import `ROUTINES`/`routineOf` from `@/domain/routines` (or keep
  `ARCHETYPE_BY_ICON` identical: the ids and the map here are yours, copied); keepsake captions key on
  `Keepsake.kind` (the 12 families + `'brass-seed'`); the Sunday Note `ps.companion` gives `days` and the
  habit's `timeOfDay` for {times}; the Garden Journal records are `JournalEntry`.
- **ui**: call `noteCompanionOffer()` when the offer is shown and `declineCompanionOffer()` on "Not now";
  show the Season Review card from `todayVM().seasonReview`; "Just this season" sets
  `endsOn: tuneView.season.justThisSeasonEnd`.

## Catalog

- Done: the Duffle Coat (No. 03 Dogs) and the Glass Float (No. 04 Pond), one Super rare each, so every series keeps
  §7.1's strict ordering (`tests/unit/domain/gacha.test.ts` checks every series, no exceptions).
- Every template grows a free starter plant in a free pot (tested), so the old starter-swap map is gone.
- `catalog/badges.ts` still carries an `emoji` per pin; the views no longer pass it on.

## UI / shell integration

- **Pre-paint theme.** The store mirrors `{ "theme": …, "reduceMotion": … }` to `catkin:theme` at boot and on every
  change (not in the demo). The pre-paint script in `index.html` reads only that key and sets `data-theme`,
  `data-motion`, `color-scheme` and one `theme-color` (#FAF6EF / #1E1A22, as `src/app/theme.ts` on `catkin/ui`).
- **Grouping never jumps.** `todayVM` reports the current grouping; snapshot which group each card is in on load and
  on day change, so a tap never moves a card.
- **Delete vs the balcony shelf.** "Keep the plant on the balcony shelf?" (default yes) maps to
  `deleteHabit(id, { keepPlant: true })`: the habit is archived and its plant stays (`progressVM().garden[i].retired`).
  A plain delete removes the habit and its logs; its sunshine stays in The Cutting.
- Earlier store additions still stand: `acceptGrowOffer`, `useHere`, `flushSaves`, `canUndoImport`, `repairClock`,
  `configureStore`, `machineStatusOf`, `storeLocal`, the signals `now`, `clockBehind`, `saveStatus`, `loadIssue`,
  `updateHabit(…, 'tomorrow')`, `deleteHabit(id, { keepPlant })`, `editHistory` returning `false` when refused,
  `applyImport(text, { withoutUndo })` and `'no-undo'`, and `pull`'s `'storage-full'`.

## Spec amendments (folded into DESIGN.md)

The logic team's readings after the adversarial audits are now short clarifications in the catkin bible:

| Reading | catkin section |
|---|---|
| "This period" edits keep or cut the period; day-based edits after today's reward apply tomorrow | §5.1 |
| Tiny is a level only; graduation pays once per genuinely bigger rule, then 28 days closed | §5.2 |
| Calendar edits refused inside the 6-day window and for flexible un-ticks reaching into it | §5.3 |
| The current period's remaining days are *open* days; rolling windows end today only if it counts | §5.4 |
| Completed occurrences from the creation day; the calendar-pace cap; Flourishes are a high-water mark | §5.5 |
| Perfect day: off days, in-target flexible check-ins, rest allowance, resume after a paid day | §6 |
| Rung measure: Σ achieved per met period, calendar length, since the creation day | §6 |
| Sunday Note and Herbarium page move only by the delta of a reward-path change | §6 |
| Pity counts only while its tier is armed; the Moonlit slot weighs half an item | §7.1 |
| Memories rule: from the first day she has the app while the season is on | §7.3 |
| The free capsule and First Sprout are one gift; every first capsule is a pet | §9.6 |
| Offer counters shared; XP once per occurrence; story thresholds 7 · 21 · 42; keepsakes need a companion at the stage | §14.1 |
| Colour bands and the 60% rule; reads wait for 10 days; Paired over Petite; kept-together; the nudge | §14.2 |
| Meteorological seasons; which season gets the card; Grow's stamp; archive as of the last day | §14.3 |
| Only starred notes are quoted; the anniversary note's week of grace | §13 |

## Open (not changed)

- Restoring a snapshot, or importing a backup from before some pulls, gives back the coins spent on them. Stopping this
  needs an append-only pull journal outside snapshots.
- An old habit's rung can still be reached by many history-ticked days plus one real check-in. Capping the measure at
  rewarded occurrences would also make legitimate streaks that began before a reinstall unpayable.
- If a refund can't be afforded when a habit is deleted, deleting it and creating it again can pay today's check-in a
  second time. The daily 40-coin full-rate budget bounds this, and it earns no more than creating a new habit would.

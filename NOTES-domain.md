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
- Unchanged for now (stage B renames them at the view layer): `lettersVM` (Sunday Notes, Herbarium pages).

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
7. **No XP from check-ins until Keeping Company.** §8.2 lists petting, treats, a companion's check-ins and duplicate
   pulls. The buddy bonus is gone; companion XP arrives with `Habit.companionId` (stage B).

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

## Open (not changed)

- Restoring a snapshot, or importing a backup from before some pulls, gives back the coins spent on them. Stopping this
  needs an append-only pull journal outside snapshots.
- An old habit's rung can still be reached by many history-ticked days plus one real check-in. Capping the measure at
  rewarded occurrences would also make legitimate streaks that began before a reinstall unpayable.
- If a refund can't be afforded when a habit is deleted, deleting it and creating it again can pay today's check-in a
  second time. The daily 40-coin full-rate budget bounds this, and it earns no more than creating a new habit would.

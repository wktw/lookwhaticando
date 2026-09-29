# M1 logic fixes: notes for the lead and the screen builders

Branch `m1/logic`. It fixes every finding in the M1 triage whose area is "logic". This file lists
the requests for files outside the logic area (`src/domain`, `src/state`, `src/catalog`, the docs),
then the contract changes the screens build on.

## Requests to other areas (in merge order)

1. **fx, blocker at merge: `src/fx/celebrationPlan.ts`.** Spending money now emits events with a
   negative amount:
   - `{ type: 'coins', amount: -25, reason: 'spend' }` for a paid capsule or opening a place;
   - `{ type: 'stars', amount: -n, reason: 'spend' }` for a Night capsule or a Special Order.

   The `gift` coin event was already negative for the onboarding capsule. In `planCelebration`, the
   `coins` case skips only `refund` and the `stars` case adds every non-fusion amount, so a pull
   would put -25 into `bonus.coins`. In both cases, add `if (e.amount <= 0) break;` before summing,
   as `walletDelta` already does.
2. **fx: `src/fx/copy.ts`.**
   - Replace the local `STAGE_NAMES` with `export { STAGE_NAMES } from '@/catalog/lines'`. There
     is now one list; `domain/growth.ts` re-exports it too.
   - Delete `EVERGREEN_LINE`. `celebrationPlan.ts:248` uses `STAGE_LINES[7]` (with `{Plant}`)
     instead.
   - NOTES-voice request 2 still stands. For rung, ladder and pin copy, use `STATUS_LINE`, `RUN`,
     `runText` and `COUNTS` from lines.ts and format.ts.
3. **art: `src/art/plants`.**
   - `PLANT_STAGE_NAMES` re-exports `STAGE_NAMES` from `@/catalog/lines`.
   - `blooms` needs no change: the view models send `undefined` below Evergreen and
     `min(6, 5 + extraBlooms)` at Evergreen. `bloomCount` already follows the stage when it gets
     `undefined`.
4. **art: `src/art/scene/WindowsillBand.tsx`.**
   - Build `pots` and `pets` with `bandPots(vm)` and `bandPets(vm, state)` from
     `src/state/views/today.ts`. They already have the `SillPot` and `ShelfPet` shapes, in card
     order with the current block first, and only residents who are out.
   - `pour(habitId)` should fall back to `coinToJar()` when the pot isn't among the 6 on the band.
     Today it returns silently.
5. **art: `src/art/scene/ShelfScene.tsx:92`.**
   - `where()` already reads `ShelfPet.place`. Pass `place` from `shelfView.out[i].place`
     (`PetSummaryVM.place`, always an open place).
   - For the Shelf interaction API (the art blocker), a drop onto a place calls
     `store.setPetPlace(petId, place)`. `false` means refused (the place is full or not open).
     `null` sends the pet back to the Sill.
6. **features: `src/features/capsules/FirstPick.tsx:15`.**
   - Replace `PAIR` with `FIRST_CAPSULE_MACHINES` from `@/domain/gacha` (Cats, Cows, Dogs, Pond).
   - Lay them out 2×2 at 390 px, with `price={null}`.
   - Heading: "Who comes home first?". Lead: "Your first capsule is on the house. Choose a
     cabinet."
7. **features: `src/features/capsules/RevealCard.tsx:277,282`.**
   - The buttons read "Find {name} a plant" and "Let {name} choose" (VOICE.md §10, DESIGN §7.2
     step 7).
   - "Let {name} choose" calls `store.letPetChoose(petId)`. It returns
     `{ habitId, place }` for "{name} chose {plant}, for the sun." or "{name} chose the Saucer
     Pond." (`PLACE_LINES`, `movedToPlaceLine`).
   - A Special Order's reveal resumes from `pendingReveal` with `order: true`, so the reveal says
     "Your order: a Siamese.".
8. **features: `src/features/capsules/copy.ts` and `names.ts`.**
   - Re-export `REVEAL_LINES`, `SECRET_REVEAL`, `DUPLICATE_LINES` and `NAME_SUGGESTIONS`
     (personalities.ts) rather than keeping copies.
   - `CATEGORY_LABEL` there says `pet: 'Animals'`. Use `CATEGORY_LABELS` from lines.ts, which
     says 'Pets', like the view model.
9. **dev gallery.**
   - `src/dev/sections-capsules.tsx:516`: the section title becomes "Onboarding: Who comes home
     first?".
   - `src/dev/sections-fxui.tsx:1108,1112,1150`: drop `stageName` from the `plantStage`
     fixtures.
   - `sections-fxui.tsx:1166`: add `kind: 'sundayNote'` to the `letter` fixture.
   - Once those land, `src/state/api.ts` can remove the deprecated optional `stageName?` and make
     `letter.kind` required. I'll do that on request.
10. **`tests/unit/voice.test.ts`.**
    - Delete `KNOWN_EXCEPTIONS`, `KNOWN_TEXT_EXCEPTIONS` and `KNOWN_FLAVOR_EXCEPTIONS`. Every
      string they excused is fixed in collectibles.ts, and `seasonal.emoji` is gone from
      `MachineDef`.
    - Extend `VOICE_SCAN_DIRS` to the screens.
    - The view models return no display text any more. `tests/unit/state/m1-views.test.ts` runs
      every formatter's output through a copy of the core rules across a matrix of schedules.
      Exporting `lint()` from a shared helper would let that test use the real one.

## Contract changes the screens build on

**Rule: the view models return kinds and numbers for anything VOICE.md governs.** The words come
from `src/catalog/format.ts`, and every template in it lives in `src/catalog/lines.ts`. Both are
exported from `@/catalog`. A formatter that would say a 0, or what's undone, returns `null`, and
the screen then shows nothing.

### Today (`todayVM` / `selectToday`)

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

### Plants

- `PlantVM.blooms` is what PlantArt takes. `PlantVM.extraBlooms` is the domain count (the domain's
  `bloomsFor` became `extraBloomsFor`, plus `artBlooms`).
- `nextLine` is gone. Use `forecastLine(plant)` ("4 more waterings to Blooming.").

### Progress (`progressVM`)

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

### Habit Detail and the editor

- `stats.phrase` is a `HabitPhrase` (`consistencyText`), and `pause.label` is gone (`pause.back`
  and `pause.upcoming` are dates).
- `upcoming` and `history[]` carry `change: RuleChange` (`ruleChangeText`) plus a ready `label`.
- `scheduleLabel` now reads "3 times a week", not "3× a week" (`scheduleText`, `SCHEDULE_LINES`).
- The habit-editor VM is `selectHabitEditor(id | null, templateId?)`, which returns
  `HabitEditorVM`.
- `HabitIssue.message` now comes from `HABIT_ISSUES` (`habitIssueMessage(code, max)`).

### Pets and the Shelf

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

### Store

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

### Events (`GameEvent`)

- `plantStage` no longer sends `stageName`. Word it from `stage`.
- `letter` carries `kind`.
- Coins and stamps gain `reason: 'spend'` with a negative amount (see request 1).
- The stamp reasons are `showup | letter | herbarium | badge | fusion | grow | album | spend`.
  `bloom` became `herbarium`, and `gift` became `grow` or `album`. These reasons exist only in
  events, never in the save, so no migration is needed.

### Domain and state

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

### Copy constants added to lines.ts

`STATUS_LINE`, `PERIOD_WORDS`, `RUN`, `CONSISTENCY_LINES`, `TODAY_LINES`, `COUNTS`,
`PROGRESS_LINES` (alias `PROGRESS_HERO`), `PET_CARD`, `MEMORIES`, `PLACE_LINES` (alias
`PLACES_OPENED`), `COMPANION`, `STORIES`, `KEEPSAKE_CAPTIONS`, `LOOKS`, `TIME_NUDGE`,
`SEASON_REVIEW`, `BIRTHDAY`, `CAME_HOME`, `ONBOARDING`, `EMPTY`, `ERRORS`, `INSTALL`,
`REMINDERS`, `DATA`, `SETTINGS`, `WALLET`, `CATEGORY_LABELS`, `CAPSULE_NOTICES`,
`SCHEDULE_LINES`, `HABIT_ISSUES`, `STAGE_NAMES`. They are copied from VOICE.md, and VOICE.md wins
on any user-facing string.

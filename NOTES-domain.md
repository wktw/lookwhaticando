# Domain notes for other teams

These are requests and integration notes from the domain/state module (`src/domain`, `src/state`).
They cover the catalog, the UI and the shell.

## Catalog change requests

1. **Puppy Park's lineup breaks the §13.6 ordering.** It has 8 Classic, 5 Special, 4 Rare and 2 Super rare items.
   At 10% ÷ 4 and 5% ÷ 2, each Rare item and each Super rare item has the same 2.5% chance. §13.6 says every
   rarer item must be less likely than every commoner one, and asks for 8/5/5/3 in a big series. Adding one
   Super rare (or one Rare and one Super rare) fixes it.
   `tests/unit/domain/gacha.test.ts` holds Puppy Park to ≥ for now; remove it from `TIED_BY_CATALOG` once
   the catalog is fixed.
   Sakura Garden and Sweet Treats are 8/5/4/3, and Rainy Day is 8/4/3/2. Those still keep the ordering
   strict, so no change is needed.
2. **Some templates use plant species that only come from capsules.** Strength training uses cactus. Yoga and
   Meditate use lavender. In bed by 11, Clean the bathroom and Phone-free bedtime use lily. Meal prep uses
   strawberry. A new save owns none of these. `habitInputFromTemplate` swaps in an owned starter plant:
   cactus → succulent, lavender → tulip, lily → daisy, strawberry → tulip. `createHabit` refuses plants and
   pots that aren't owned. Consider giving the templates starter plants so the preview matches what gets
   planted.

## UI / shell integration

- **Pre-paint theme script.** The store mirrors `{ "theme": "night", "reduceMotion": "auto" }` to the key
  `mochi-meadow:theme` on every change and at boot. It skips this in the demo. `index.html` can read that
  small key instead of parsing the whole save.
- **Grouping never jumps (§13.11).** `todayVM` reports the current grouping: folded blocks, "Done for the
  week" and "This month". Take a snapshot of which group each card is in on load and on day change, so a tap
  never moves a card.
- **Store API additions** (all additive):
  - `acceptGrowOffer(id, patch)`
  - `useHere()`
  - `flushSaves()`
  - `canUndoImport()`
  - `repairClock()`: a diagnostics escape hatch after a far-future device date
  - `configureStore()`: for tests
  - `machineStatusOf(state, day, id)`
  - `storeLocal()`
  - signals `now`, `clockBehind`, `saveStatus`, `loadIssue`
  - `updateHabit`'s timing also accepts `'tomorrow'`
  - `listSnapshots()` rows also carry `kind` and `day`
- **Selectors** live in `src/state/selectors.ts`. Every one is a pure function in `src/state/views/*`, plus a
  memoised signal. The parameterised signals are `selectToday(date)`, `selectHabitDetail(id)`,
  `selectCalendarMonth(habitId, month)`, `selectYearQuilt(year)`, `selectSeries(id)` and `selectPet(id)`.
- **New GameEvents.** `harvest` fires when a treat drops in the basket. `album` fires when a species album is
  complete. A `coins` event with a negative `amount` means a refund or the sparkle exchange.
- **Delete vs the Greenhouse.** "Keep the plant in the greenhouse?" (§13.10) needs the habit record to draw
  the plant. Offer *Archive* for "keep the plant": archived habits already sit on the Greenhouse shelf in
  `progressVM().garden`. *Delete* removes the plant with the habit.
- **Not modelled yet.** These have no state in the v1 contract: the L6 "gifts under the tree", Memory
  polaroids (`memoriesFor(xp)` gives the count; the dated events still need storage) and the
  "Meadow-versary" letter.
- **Upstream §13.11** (on the main branch, newer than this worktree's DESIGN.md) is followed where it touches
  the domain:
  - the card status line priority
  - the "This month" row
  - rests in numbers
  - the quilt not drawn before tracking starts
  - the Moonlit variants sharing one slot. That slot weighs half an item, so Dreamy's printed Rares stay
    strictly more likely than its Super rares: 20% ÷ 6 would otherwise equal 10% ÷ 3.

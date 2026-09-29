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
  - stage 4: `deleteHabit(id, { keepPlant })` · `editHistory` returns `false` when refused (days
    inside the 6-day window, or un-ticking a flexible check-in whose period still reaches into the
    window: point the user to the week strip) · `applyImport(text, { withoutUndo })` returns
    `{ ok: false, error: 'no-undo' }` when the pre-import snapshot couldn't be taken: ask "We
    couldn't keep an undo copy. Import anyway?" and retry with `withoutUndo: true` · `pull` can
    return `error: 'storage-full'` (the pull was rolled back, nothing to reveal) · `repairClock()`
    now only re-reads the clock and returns `{ behind, resumesAt }`; it never lowers the guard
  - stage 4 view fields: `WeekStripDay.state` (the shared day-state glyph), `DayProgressVM.nothingDue`
    (the vine is empty rather than fully bloomed when nothing day-based is due), `HabitDetailVM.upcoming`
    ("From Oct 1: Mon/Wed/Fri" for a rule edit waiting to start), `GrowthInfo.paced`
- **Selectors** live in `src/state/selectors.ts`. Every one is a pure function in `src/state/views/*`, plus a
  memoised signal. The parameterised signals are `selectToday(date)`, `selectHabitDetail(id)`,
  `selectCalendarMonth(habitId, month)`, `selectYearQuilt(year)`, `selectSeries(id)` and `selectPet(id)`.
- **New GameEvents.** `harvest` fires when a treat drops in the basket. `album` fires when a species album is
  complete. A `coins` event with a negative `amount` means a refund or the sparkle exchange.
- **Delete vs the Greenhouse.** "Keep the plant in the greenhouse?" (§13.10, default yes) maps to
  `store.deleteHabit(id, { keepPlant: true })`, which archives the habit so its plant stays on the
  Greenhouse shelf (`progressVM().garden`). A plain delete removes the habit and its logs, but the
  sunshine it grew stays in Mochi's lifetime sprout gauge.
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

## Spec amendment requests (stage 4, after the adversarial audits)

The domain follows these readings. Please fold them into DESIGN.md §13 so the spec and the code agree.

1. **§13.2 "this period" edits.** When a flexible edit keeps the period geometry (same unit and
   `every`; only `times` changes), the new rule takes over the whole current period. When the
   geometry changes (weekly ↔ monthly, another `every`, flexible → day-based), the new rule starts
   today, and the old period is *cut*: it is judged as it stood that day, with its full goal, and the
   days it lost count as still open. No edit can turn a past day or a closed period into a new
   shortfall.
2. **§13.2 day-based edits after today's check-in was rewarded** apply from tomorrow, so a changed
   target can't turn the next +1 into a refund or an un-check into a payment. The detail view shows the
   pending rule.
3. **§13.3 current period.** `remainingActiveDays(T…end)` becomes *open days*: today counts only while
   it can still take a check-in, and future off days and paused days still count as open. With the
   literal formula, a day off or a pause could *raise* the expected count, because round(times ×
   activeFrac) often keeps the goal while one fewer day remains. That broke "transparent for every
   habit".
4. **§13.3 rolling windows** end today if today already counts, otherwise yesterday (as in upstream
   §13.11). This applies to both the per-habit and the aggregate phrases.
5. **§13.4 stage cap.** `completedOccurrences` counts only days from the habit's creation day.
   History filled in before the habit existed never earned sunshine. The stage is also capped at the
   calendar pace, stageFromSunshine(days since creation + 6), so switching to a rarer rule for one
   check-in can't grow a plant faster than real time. Honest play never meets this cap.
6. **§13.5 rung measure.** The flexible occurrence-equivalent is Σ achieved per met period, not
   periods × times. The two agree for every full period. A scaled-down period (created mid-week,
   paused, cut by an edit) counts only what it asked for and got. Streak *length* is the calendar
   weeks or months the run covers. Rungs pay only on the streak since the creation day.
7. **§13.5 perfect day.** A "Take today off" day is neither perfect nor imperfect. Only *in-target*
   flexible check-ins count toward done. A rest excuses a habit only within the weekly allowance, and
   rests that already completed a paid perfect day keep using it after an un-rest. Resuming a habit
   whose pause excused today's paid perfect day brings it back tomorrow.
8. **§13.5 graduation.** "Ready to grow?" pays +1★ only for a genuinely bigger rule, and the offer then
   stays closed for 28 days, even if the pending rule is withdrawn.
9. **§13.5 / §13.10 letters and bouquets.** Once written, they change only by the delta of a
   reward-path change inside the window. History edits and habit deletions never move them.
10. **§13.2 calendar edits** are refused for days inside the 6-day window, and for un-ticking a
    flexible check-in whose period still reaches into it.
11. **§13.2 tiny version** is a level only. Logging it never changes the count, so Undo restores the day
    exactly. It is refused on rules without a tiny version.
12. **§13.10 Flourishes** are a high-water mark (`once['flourish|<habitId>']`): they are permanent
    visitors. Blooms still follow the sunshine held.
13. **§13.6 pity** counts only pulls made while its tier still has something unowned. A fully owned
    tier's counter is 0, so it can't fire the moment a Moonlit variant joins the tier.
14. **§13.10 vs §9.6.** The free first pull is refused once First Sprout has paid. Onboarding earns the
    first capsule.
15. **Open, not changed:**
    - §13.6's Memories rule ("wishable after its first visit") is read as *from the first day* of that
      visit. Say "after it ends" if that is the intent.
    - Restoring a snapshot, or importing a backup from before some pulls, gives back the coins spent on
      them. Stopping this needs an append-only pull journal outside snapshots, which is design work
      for M2.
    - An old habit's rung can still be reached by many history-ticked days plus one real check-in.
      §13.2 says rungs *reached through history edits* go unpaid, and here the last step is a real
      check-in. Capping the measure at rewarded occurrences would also make legitimate streaks that
      began before a reinstall unpayable.
    - If a refund can't be afforded when a habit is deleted, deleting it and creating it again can
      pay today's check-in a second time. The daily 40-coin full-rate budget bounds this, and it
      earns no more than creating a new habit would.

# Wave 2 · Progress (+ Habit Detail, the ritual reader)

Branch `w2/progress`. Everything here is inside `src/features/progress/**`, `src/features/habits/detail/**`,
`src/features/rituals/**` and `e2e/progress.spec.ts`.

## What is built

- **Progress** (`#/progress`, `ProgressScreen`): hero (showing up over 30 days, this month's weighted % from 10
  expected, "4 of 4 so far" before that, the week, up/level or the month's best fact, goals, rests, the month's jar),
  recent months (labelled bars, this month on a dotted track), plants on shelf tiers with a balcony tier (tap → Habit
  Detail), the calendar (habit filter radiogroup, day glyphs, a table with roving focus and arrow keys, a day's notes,
  history edits with "Fixes history. No coins for this one.", the last 6 days pointed to the week strip, "Start
  tracking from…" before the start), the year (one SVG, 53 × 7 from 600 px, scrolls on phones, aria-hidden with its
  summary), records, insights, pins (earned, then the 4 nearest "not yet" outlines and one "{n} more pins" button,
  hidden ones off the shelf, a sheet with how each is earned) and the memory shelf (notes, pages, anniversary,
  seasons, and a link to the balcony tier for retired plants, which are drawn once, on Plants).
- **Habit Detail** (`HabitDetailHost`, default export, opened by `openHabitDetail(id)`): large plant with its
  companion on the rim, stage line and forecast in waterings, graduation offers, the time nudge, the plant tag with the
  look in plain words and the look chooser, the Garden Journal (ink and pencil), stat tiles, Why it matters, Moments
  (newest first, star for the Sunday Note), the history calendar, the rung ladder, the companion and its three stories
  (read, the "Why it matters" question), and the actions (Edit, Pause "Back on…", Bring it back, Start tracking from…,
  Tune my habits, Archive, Delete → straight to "Keep the plant on the balcony shelf?"; an archived habit comes back
  to the sill, and its Delete says "The plant and its history go too."). The rung ladder shows for day-based habits
  (daily, certain days); weekly and monthly habits get their longest run in words.
- **Rituals** (`src/features/rituals/`): `openRitual(letterId)` / `openSeason(key)` (`open.ts`), the reader
  (`RitualReaderHost`, default export, lazy), and `words.ts`, which words a Sunday Note, a Herbarium page, the
  anniversary note and a season from their frozen data with the lines.ts templates.

Render time on a 3-year × 20-habit save (production build, 390 px, `perf.cjs`, machine load 6–10): the hero,
months and plants in 35–90 ms warm (about 180 ms cold, most of it `progressView`, request 11); the rest follows in
four idle steps (calendar · year · records and pins · memory shelf), the whole screen at 200–400 ms warm, with 0–2
long tasks of 50–57 ms. The owned unit tests are 157 in 4 files (Progress 20, Habit Detail 13, copy, rituals words); an earlier note said 220, which was wrong.

## Requests for the lead

1. **Run `e2e/progress.spec.ts` in `npm run e2e`.** No project in `playwright.config.ts` matches it. Add one (the
   spec sets its own viewports and colour schemes):
   `{ name: 'progress', testMatch: /progress\.spec\.ts$/, use: { ...desktop } }`.
   (I ran it with a scratch config that spreads the repo config and adds exactly that project: 13/13 pass.)
2. **Mount the ritual reader in the shell**, so Today's note on the sill can open it (`openRitual(vm.letterWaiting.id)`).
   In `src/app/SheetHosts.tsx`:
   `const Ritual = useLazyHost(ritualRequest.value !== null, () => import('@/features/rituals/RitualReaderHost'));`
   and render `{Ritual && <Ritual />}` (import `ritualRequest` from `@/features/rituals/open`). The Progress screen
   also mounts it; only the first mounted host draws, so both can stay.
3. **The shell's desktop column is 472 px, not 720.** `.main`'s padding in `src/app/App.module.css` (≥ 900 px) is
   `calc((100% - var(--content-max)) / 2)`, and `100%` there is the viewport, not the column beside the sidebar.
   Suggested: `max(32px, calc((100vw - var(--sidebar-w) - var(--content-max)) / 2))`. Progress centres its own 720 px
   column inside whatever the shell gives it (works before and after the fix); Today and You will want the fix.
4. **Copy to move into lines.ts / VOICE.md.** Held in `src/features/progress/copy.ts` (`PROGRESS_UI`, `DETAIL_UI`):
   - verbatim from VOICE §7 with no constant yet: "A bigger pot?" · "{habit} has been steady for 4 weeks. Make it a
     little bigger? +1 stamp" · "Grow it" · "Keep it as it is" · "Make it tinier?" · "A smaller version still counts,
     and still waters the plant." · "Make it tinier"; VOICE §5 "Pause {habit}" · "Back on…".
   - new, wants a VOICE row: section names ("Recent months", "Plants", "Balcony shelf", "Calendar", "The year",
     "Records", "Insights", "The plant tag", "Garden Journal", "How it’s going", "Moments", "History", "In a row",
     "Keeping company", "Look after it"); the calendar ("Show habit", "All habits", "Water it for {date}", "Not
     watered after all", "The last 6 days are watered from the week strip on Today.", "That day is watered from the
     week strip on Today.", "Open Today"); day words for screen readers ("watered", "the tiny version", "resting", "a
     day off"); "{Mon} · {days} days · so far"; pins ("not yet", "Earned {date}", "{have} of {need}"); memory "New";
     Habit Detail ("Lately", "Now", "Longest run: {run}", "Waterings", "Since {date}", "New rhythm", "Star this note",
     "Only notes you’ve starred are quoted in the Sunday Note.", "About {count} more waterings together.", "After the
     one before it.", "Resting until {date}", "Resting from {date}", "On the balcony shelf since {date}", "Finished
     {date}, with a ribbon", "Until you bring it back", "Start tracking from…", "Bring it back to the sill", "Archive",
     "Delete", "Edit"); the journal's {when} words ("before 9 am, usually", "in the middle of the day, usually", "after
     6 pm, usually", "at all sorts of times"); clock times ("7:30 am", `clockText`).
   - added in review round 1, want VOICE rows: the ring's caption "of this month’s waterings"; the calendar's
     ", a note" for a day with a note ("Monday, September 14, watered, a note"); pins "1 more pin" / "{count} more
     pins"; the memory shelf's "1 plant on the balcony shelf" / "{count} plants on the balcony shelf"; Habit Detail
     "Pause" (the visible word; "Pause {habit}" stays the accessible name), "Rungs reached: {count} of {total}"
     (screen readers), "{habit} is tinier now." (after "Make it tinier"), and "New" on an unread story.
   - removed as unused: "Days showing up, month by month.", "Notes on {date}", "Open", "This week", "This month",
     "Days", and "not yet" as a visible line (it stays only in a pin's accessible name, "{name}, not yet").
   - `SEASON_LABEL` (Spring…) and the P.S. counts ("four evenings", "every day", `psTimes`) are in `rituals/words.ts`.
5. **format.ts plurals on a one-day window.** `showedUpLine({days: 1, span: 1})` gives "You showed up 1 of the last 1
   days", and `CONSISTENCY_LINES.days.one` gives "1 of the last 1 day". Progress hides both on day one; the
   formatters could return null (or "1 of 1 so far") for a one-day span.
6. **Voice lint timeout.** `tests/unit/voice.test.ts` › "every UI string…" takes 3.7 s alone and times out at the 5 s
   default under a loaded machine (it failed once in the full run while other worktrees were building, and passes
   alone). Suggest `it(…, { timeout: 20_000 })`.
7. **Art (optional).** A `NoteCard kind="season"` for filed seasons on the memory shelf (they use the `story` card
   now). Habit Detail's large plant composes `PlantArt` back/front with `PetArt` on the rim using `cardFrame` /
   `cardSpots` from `@/art/plants/CardPlant` (`HeroPlant.tsx`); a `CardPlant` option for a bigger resident (it caps
   it at 20 px) would replace it.
8. **Logic (optional).** The rung ladder labels rungs by `tier` (occurrence-equivalents). For weekly and monthly
   habits a `lengthOf(tier, unit)` would let the ladder say "3 weeks", "6 weeks"… The ladder shows the tiers as
   numbers and the longest run in words.

## How to look at it

- `node scripts/shoot.mjs "/#/progress" out.png --seed-file=<save.json> [--w=1280 --h=800] [--dark] [--full]`
  (the flag takes a save envelope; `--seed=<n>` in the brief isn't a mode of the script).
  A demo envelope: `encodeEnvelope(buildDemo({ today, now }), 1, now, 'x')` (see `e2e/progress.spec.ts`).

## Added in review round 1

9. **Logic: decline an offer.** "Keep it as it is" on "A bigger pot?" and "Make it tinier?" can only close the card
   for this visit; the offer is back the next time Habit Detail opens. Suggest `declineOffer(habitId, kind: 'grow' |
   'tinier')` in the store (remembered until the offer's conditions are met afresh, e.g. another 4 steady weeks).
10. **Art: Herbarium pressings per species.** `Pressing` draws the same green sprig for every foliage plant (only
    flowering species get a petal ink), so a page can't tell the plants apart. A per-species silhouette (pothos
    trail, monstera split leaf, snake plant blade, pilea coins…) in the plant's own inks, flattened, would meet
    DESIGN §13's "flattened silhouettes in the plant's colours". The reader passes `species` already, so it would
    pick them up with no change here.
11. **Logic: a cheaper `progressView`.** On a 3-year × 20-habit save it costs about 155–175 ms cold and about 50 ms
    after any store change (a coin, a pet moving), since it recomputes whole from `state`. Splitting it into parts
    keyed on `habits`/`logs` (records, recent months, garden) would let a coin change cost nothing here. The screen
    already keeps the plants, the month's jar and the calendar from redrawing when their own inputs are unchanged.


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
  summary), records, insights, pins (earned, "not yet" outlines, hidden ones off the shelf, a sheet with how each is
  earned) and the memory shelf (notes, pages, anniversary, retired plants, seasons).
- **Habit Detail** (`HabitDetailHost`, default export, opened by `openHabitDetail(id)`): large plant with its
  companion on the rim, stage line and forecast in waterings, graduation offers, the time nudge, the plant tag with the
  look in plain words and the look chooser, the Garden Journal (ink and pencil), stat tiles, Why it matters, Moments
  (newest first, star for the Sunday Note), the history calendar, the rung ladder, the companion and its three stories
  (read, the "Why it matters" question), and the actions (Edit, Pause "Back on…", Bring it back, Start tracking from…,
  Tune my habits, Archive, Delete → "Keep the plant on the balcony shelf?"; an archived habit comes back to the sill).
- **Rituals** (`src/features/rituals/`): `openRitual(letterId)` / `openSeason(key)` (`open.ts`), the reader
  (`RitualReaderHost`, default export, lazy), and `words.ts`, which words a Sunday Note, a Herbarium page, the
  anniversary note and a season from their frozen data with the lines.ts templates.

First render on a 3-year × 20-habit save (production build, 390 px): 36–54 ms to the screen on the page (the calendar,
the year, records, pins and the memory shelf follow one frame later).

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

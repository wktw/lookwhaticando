# Wave 2 · Today and the Habit Editor

Branch `w2/today`. Owned: `src/features/today/**`, `src/features/habits/editor/**`, `e2e/today.spec.ts`,
this file.

## What is built

- **Today** (`src/features/today/TodayScreen.tsx`, DESIGN §9.1)
  - The windowsill band (`Band.tsx`): `WindowsillBand` with the view model's pots (looks, bows, routines,
    flourishes) and residents, the Cutting, a found thing (opens its pet's card), the note on the sill (a
    letter or a story, opens it), the birthday cake. Sticky; 168 → 64 px driven by scroll with no Preact
    render (a `clip-path` and two CSS variables, and the band's own collapse signal). The greeting is the
    screen's only `h1`; the long date; the wallet pill (AnimatedNumber, `data-wallet-target`, opens "What
    can I get?"); the vine chip as the day's `progressbar`; collapsed: short date · mini ring · wallet.
    Tapping the window opens the Shelf. The band's pots follow the list's snapshot order, so a watered pot
    never jumps along the sill.
  - The week strip (`WeekStrip.tsx`): `DayGlyph` flowers sized by fullness, moons, just the date when
    empty, a dot for today, a hairline before a new week. A radiogroup with roving focus. A past day shows
    the sticky "Logging for Sat, Sep 27 · Back to today" banner, an oat page and "Walk for Saturday" names;
    it resets on rollover, after 60 s hidden, and on leaving Today.
  - The list (`HabitList.tsx`, `state.ts`): grouped by time block, current first, from a snapshot taken on
    load and on a new day or a changed habit (never on a tap); earlier blocks all watered fold ("Morning
    3/3 · Walk · Stretch"); "Watered for the week/month…", "This month", "Other days" and "Resting: 2
    habits · back Oct 6" are folded rows. First card top: 256 px on a phone (tested in e2e).
  - The card (`HabitCard.tsx`): `CardPlant` (resident ≤ 20 px, icon on a stake, damp soil), Castoro name,
    italic anchor or "After Walk", `statusLine()`, ⋯ (44×44) and `CheckRing` (count, tiny, rest). A long
    press opens the number pad (count habits) or logs the tiny version; a full count habit tapped again
    opens the inline stepper. Compact Today shrinks it.
  - The ⋯ menu (`CardMenu.tsx`): a real `menu` (arrows, Home/End, Esc back to ⋯): Tiny version · Rest day ·
    Add a note / Edit the note · Details · Edit.
  - Check-in choreography (`checkin.ts`): store first, then `celebrateCheckIn` (chime, +chip, one coin),
    `band.pour` at 200 ms, the resident looks up at 400 ms, the coin lands on the jar and drops in
    (`coinToJar` on landing, one per flight), the note at 520 ms (`showCheckInNote` with the events, Undo
    and Add a note). Undo/un-watering: `undoCheckIn` + `showUncheckNote` (refund, or "spent already").
    Quiet rewards: no coins, no wallet, the rest plays. The burst rule, the celebration queue and the
    perfect day's petals are the fx layer's, fed by the store's events.
  - Cards on Today (`Notices.tsx`, `SillSheets.tsx`, `SeasonReview.tsx`): clock notice, the day off, the
    empty sill, nothing on, everything resting, the first capsule (waiting on the Capsules tab / water
    anything), a letter waiting (a reader for the Sunday Note, the Herbarium page and the anniversary;
    closing files it with `dismissLetter`), a story waiting (`readStory`; Why it matters asks once with
    `answerWhy`), the Keeping Company offer (latched for the day once `noteCompanionOffer` marks it shown;
    habit chips, "Let {name} choose", "Not now" = `declineCompanionOffer`), the Season Review (a time-lapse
    of up to 8 plants, one row per habit that opens its fresh-start chips, Keep everything, Later), the
    birthday and came-home days. "Take today off" is a toggle with its confirm and allowance.
  - Sheets: the note field, the number pad, the wallet ("What can I get?").
- **The Habit Editor** (`src/features/habits/editor/`): opened by `openHabitEditor({ id?, templateId? })`
  (and by the N shortcut on Today). Name with a suggested icon (`suggestHabitIcon`) and a searchable icon
  picker; ideas by group; colour; plant and pot (owned, and teasers "In No. 05 · Garden" for the rest);
  how often (every day / certain days / N a week every 1–4 / N a month every 1, 2, 3, 6, 12) with the
  summary in words; how much (amount, step, unit presets); the tiny version (and its amount); when;
  after… and a habit to follow; do it or avoid it; about how long (the 3-long-habits note); why it
  matters; just this season; who keeps it company; from when (today / next period / tomorrow) when the
  rule changes; archive (confirm) and delete ("Keep it on the balcony" / "Delete everything"). Field notes
  from `HABIT_ISSUES`. Every choice is a radiogroup with roving focus (`RadioTiles.tsx`).

## How to view

- `npm run dev`, then `#/today`. To see a busy household: in the console on the dev server,
  `const d = await import('/src/state/demo.ts'), p = await import('/src/state/persist.ts'), t = await import('/src/domain/dates.ts'); localStorage.setItem('catkin:v1', p.encodeEnvelope(d.buildDemo({ today: t.appDayKey(Date.now(), 180), now: Date.now(), name: 'Sam' }), 1, Date.now(), 'dev')); location.reload()`.
- Screenshots: `node scripts/shoot.mjs "/#/today" .shots/today.png --seed-file=<envelope.json>`.

## Tests

- `src/features/today/today.logic.test.ts` (20): the snapshot never regroups, the ring's actions and
  names, the band's greeting and inputs, rows, the strip, letters and the season in words, the editor's
  form rules.
- `src/features/today/TodayScreen.test.tsx` (8): one h1, the empty sill, watering + Undo + the notes, no
  regrouping on taps, the count ring and the number pad, the strip's arrows and the banner, the ⋯ menu and
  a rest day, planting a habit in the editor (field note, then the card on Today).
- `e2e/today.spec.ts` (10): phone and desktop × light and dark (empty sill → plant from an idea → water →
  Undo; a busy demo household: axe, first-card budget, menu, past day, collapse), 320 px reflow, quiet
  rewards.

## Requests for the lead

1. **Playwright projects for the screen specs.** `playwright.config.ts` matches only `routes`, `layout` and
   `single-file` specs, so `e2e/today.spec.ts` runs in no project under `npm run e2e`. It sets its own
   viewport and colour scheme per `describe`, so one project is enough:
   `{ name: 'screens', testMatch: /(today|progress|you|shelf)\.spec\.ts$/, use: { ...desktop } }`. I ran it
   with a scratch config that adds exactly that (10/10 green).
2. **Shell: the desktop content column is 472 px, not 720.** `App.module.css` `.main` at ≥ 900 px pads
   with `max(32px, calc((100% - var(--content-max)) / 2))`, but a percentage padding resolves against the
   containing block (the 1280 px body), not the 1032 px main: (1280 − 720) / 2 = 280 px a side. Use
   `calc((100vw - var(--sidebar-w) - var(--content-max)) / 2)` or a max-width inner wrapper. Today looks
   right at 472 px but was designed for the 720 px column.
3. **Art: `muteTree` gives duplicate keys** for muted plants (pilea, snake plant, lavender, orchid,
   violet): `<CollectibleArt id="plant-pilea" muted />` logs "two or more children with the same key" in
   dev, which fails any e2e that watches console errors. The editor's locked teasers use the unmuted
   drawing at 45% opacity until it is fixed; switch them to `muted` after.
4. **fx: Quiet rewards is not read by the fx layer.** Today passes `coins: 0` to the note and skips
   `celebrateCheckIn`'s coin flight when `settings.quietRewards` is on, but `CelebrationHost` still shows
   coin amounts on banners (rungs, perfect day, period goals) and the sidebar wallet stays. DESIGN
   principle 4 wants the whole app to be just the tracker: the host and the shell should read the setting.
5. **Copy to move into lines.ts** (they live in `src/features/today/copy.ts` and
   `src/features/habits/editor/copy.ts`, in the deck's voice, all linted): the ⋯ menu's items ("Rest day",
   "Details", "Edit", "Edit the note"), "More for {habit}", "The last 7 days", "What can I get?" as the pill's
   name, the number pad's "Done", "Go to Capsules", "Read it", "Put it on the shelf", the editor's small
   labels ("A new habit", "Edit {habit}", "Ideas", "Find an icon", "Unit", "Each tap adds", "Amount", "How
   many times", "Every", "Which days", "Or follow a habit", "Tiny amount", "Until {date}, then it goes to the
   balcony shelf with a ribbon.", "From when?", "From today" / "From next {period}" / "From tomorrow",
   "Archive", "Delete", "Keeps {habit} company", "In {series}", "Saved.").
6. **The letters in words belong in format.ts.** `src/features/today/letterText.ts` words a `RitualVM`
   (Sunday Note, Herbarium page, anniversary) from `SUNDAY_NOTE`, `HERBARIUM` and `CAME_HOME`; the
   Progress screen's memory shelf needs the same words. Move `letterText` (and `LetterSheet` if the Memory
   shelf wants the reader) into shared code, and Today will import it from there.
7. **`EmptyState` always renders an `h3`.** Under a screen's `h1` with no `h2` that fails axe's
   heading-order; Today's empty sill has its own markup with an `h2`. An `as` prop on `EmptyState` would let
   screens pick the level.
8. **"Start tracking Walk from Mon, Sep 22?"** (`TODAY_LINES.startEarlier`): `liveHabits` leaves a habit out
   of every day before its `startedOn`, so on a past day of the strip a newer habit is simply not there and
   the question never comes up from Today. If it should, the view model needs those habits in `notToday`
   (or a flag) for past days; Habit Detail's "Start tracking from…" covers it meanwhile.
9. **Manifest screenshots** (NOTES-open item 8): Today is built; `SCREENSHOTS[0].route` can be `today`.

## Known gaps

- The desktop layout follows the shell's (too narrow) column; see request 2.
- The Season Review's time-lapse grows each plant from its first stage to its last (150 ms a stage);
  residents sit beside them but don't move.
- The number pad's quick adds are +1, +step and +2×step (no free typing).

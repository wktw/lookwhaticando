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

- `src/features/today/today.logic.test.ts` (25): the snapshot never regroups, the ring's actions and
  names, the band's greeting and inputs, rows, the strip, letters and the season in words, the editor's
  form rules.
- `src/features/today/TodayScreen.test.tsx` (12: also slow taps and the hold, ⋯ › How many…, the strip
  that stays put, the editor's focus on a note and its question before closing): one h1, the empty sill, watering + Undo + the notes, no
  regrouping on taps, the count ring and the number pad, the strip's arrows and the banner, the ⋯ menu and
  a rest day, planting a habit in the editor (field note, then the card on Today).
- `e2e/today.spec.ts` (14, phone = iPhone 13 with touch: also a slow tap, the long press and ⋯ to the
  pad, the strip on a past day, a pour bringing its pot into view, and a timing check behind
  `E2E_PERF=1`): phone and desktop × light and dark (empty sill → plant from an idea → water →
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
9. **Art: a spot for the month jar in the band.** `todayVM.monthJar` (NOTES-open item 3) is ready, but the
   band's pinned end (jamb, the Cutting, the note, the coin jar, the lamp, a found thing, the cake) has no
   room left for `MonthJar`, and an overlay from the screen would sit on the pots. A `monthJar?: { stems }`
   prop on `WindowsillBand` (drawn at the sill's front by the coin jar, say) would let Today pass it through.
10. **Art: `PlantArt` composes on every render.** On a 3-year × 20-habit save most of Today's first render
   is `composePlant`/`composeBase` (the band's six pots and the cards). Today now draws only the first six
   card plants at once and the rest as they scroll near, and never re-renders an unchanged card, but a
   memo inside `PlantArt` keyed on (species, stage, pot, progress bucket, light) would help every screen.
11. **Manifest screenshots** (NOTES-open item 8): Today is built; `SCREENSHOTS[0].route` can be `today`.

### Added in review round 1

12. **Route: make Today `wide`** (`src/app/routes.ts`), or fix request 2. At ≥ 1100 px Today now lays out
    two columns (the list, and the sill's rail at 320 px, sticky) in up to 1040 px centred on the shell's
    column: it widens itself past the shell's padding (`width: min(1040px, 100vw − sidebar − 64px)`,
    centred with a negative margin), which works before and after the padding fix. With `wide: true`
    (or the fixed padding) it would no longer need to reach past the shell.
13. **Sound: start the engine before the first tap** (`src/fx/sound.ts`). Creating the `AudioContext`
    takes about 75 ms and `installAudioUnlock` does it inside the first pointerdown. Today now calls
    `sfx.unlock()` from `requestIdleCallback` after it first draws (it starts suspended and the first tap
    only resumes it); Chrome logs "The AudioContext was not allowed to start" as a warning for that. A
    build-without-start in the fx layer (create at idle, resume on the gesture, no silent buffer) would
    do it for every screen and without the warning.
14. **fx: `celebrateCheckIn` under reduced motion runs its float text and coin flight inside the tap**
    (its own `later` calls `fn()` at once). Today's own choreography now waits for the frame after the
    tap; the fx layer's could do the same (the reservation still has to be made in the tap).
15. **Store: save after the frame.** On a 3-year × 20-habit save about 8 ms of a check-in's 16 ms in
    the store is `saveNow` (`encodeEnvelope` + `localStorage.setItem`) inside the tap; an idle or
    next-task save (with the unload flush it already has) would halve a tap's cost.
16. **Voice lint timeout** (`tests/unit/voice.test.ts`): the "every UI string" case needs 4–5.5 s of its
    5 s default when run alone and times out in a full `npx vitest run` on a busy machine. Give it
    `{ timeout: 30_000 }`.
17. **Band: a pot beyond the sixth.** Today now fills the band's six with the cards still to water at
    snapshot time (current block first), and scrolls the pot into view before `pour`. A tap on a
    seventh habit still pours nowhere (`WindowsillBand` slices to `BAND_MAX_POTS`; the fallback is the
    jar). A "guest" pot, or letting the band swap the tapped pot in, would finish §9.1's choreography.
18. **Art: 44 px hit areas** for the note on the sill (29 × 29) and the found thing (20 × 20) in
    `WindowsillBand` (invisible rects around the drawings).
19. **Logic: a flexible habit's status line.** Yoga reads "3 weeks in a row" until watered, then "1 of
    2 this week" (DESIGN §9.1.1 puts the pace line first). `todayVM` could return the pace kind for
    flexible habits from 0 ("2 this week" if "0 of 2" is off-voice). The vine chip also doesn't move on
    a flexible check-in; a small "this week" tick, or counting it in `progress`, would show the tap
    counted.
20. **Copy: the Season Review's ask after its first day.** `SEASON_REVIEW.ask` says "Autumn starts
    today" on every day the card waits. Today uses a local `'{Season} is here. How should each habit go
    on?'` (`copy.ts`, `SEASON_ASK_LATER`) when today is past `next.start`; it belongs in lines.ts as
    `askLater`. Also new in `copy.ts` for lines.ts: `menu.howMany` ("How many…"), `filed` ("It’s on the
    {shelf} now, in Progress."), and in the editor's `copy.ts`: `ideaGroups`, `more` ("Colour, plant,
    amount and more"), `leaveTitle`, `leaveNew`, `leaveEdit`, `keepEditing`, `leave`.
21. **Toasts over sheets.** A check-in note still up when a sheet opens sits over the sheet's title
    and close button. The Habit Editor now puts Today's check-in notes away when it opens; the toaster
    could sit under an open sheet (or below its header) everywhere.
22. **Playwright: a touch phone project.** `e2e/today.spec.ts` sets an iPhone 13 (Chromium, touch) on
    its phone describes itself, so request 1's single `screens` project (Desktop Chrome) is enough.

## Review round 1 (what changed)

- Card: ⋯ sits over the words' top right (still 44 × 44), so the status and anchor lines wrap to full
  width instead of truncating; the ring comes before ⋯ for VoiceOver and Tab. A hold is armed only
  where it does something (`holdAction`: the pad for a count, the tiny version), at 500 ms, cancelled
  past 8 px, with a cue (the ring settles to 0.94, a faint sprout fades in for the tiny version).
- The band: the greeting (h1) comes first in the DOM; the wallet pill is 44 px tall, shows 0, and
  steps aside on a Mac or PC (the sidebar has the wallet; the jar still takes the coins); the six pots
  are the ones still to water at snapshot time; a pot out of view scrolls in before the pour.
- The past-day banner sits under the strip (the strip never moves). Folded rows and block labels are
  named in words ("Morning, 1 of 1 watered: Take vitamins"). ⋯ › "How many…" opens the number pad.
- Wide screens (≥ 1100 px): two columns, the sill's notes in a sticky rail.
- Speed: the band's scene and the notes draw one frame after the list; plants beyond the first three
  draw in idle batches (never on scroll); a watering redraws the band after the tap's frame; the
  choreography (and a partial tap's chime) never runs inside the tap; sound warms up while idle.
- Sheets: the letter and story art inside the sheet, the letter's title visible, a toast says where
  a filed letter went, and only "Not now" answers the story's question. The companion offer's chips
  run across the card. 44 px buttons throughout. "Take today off?" says it once.
- The Habit Editor: long choices (ideas' groups, how often, how long, from when) as wrapping chips;
  name, ideas, how often and when first, the rest behind "Colour, plant, amount and more" (open for an
  edit, and opened by a note in it); focus moves to the first field to fix; closing a form with
  something in it asks ("Keep editing" is the default and Esc); "Just this season" has its visible
  label; no placeholder in Unit. A latent bug is gone: the form remounted (losing what was typed) on
  the host's first re-render after opening.
- Measured on this machine (load average 8–14) against a production build and the 3-year × 20-habit
  save: switching to Today paints its first card in 40–60 ms (was 177–340); a tap reaches its frame in
  23–48 ms (median 31 with motion, 48 with reduced motion; was 32–76); scrolling stays at 16.7 ms
  frames with motion on (one 50–66 ms frame with reduced motion). The rest of a tap is the store (see
  request 15) and native style for the card.

## Known gaps

- The desktop layout reaches past the shell's column on its own; see requests 2 and 12.
- The Season Review's time-lapse grows each plant from its first stage to its last (150 ms a stage);
  residents sit beside them but don't move.
- The month jar isn't on Today yet (request 9).
- Timing: see "Review round 1" above. The one-frame tap target (16.7 ms) is not met yet on this
  machine: about half of a tap is the store's check-in and its immediate save (request 15), and with
  reduced motion the fx layer's float text and coin run inside the tap (request 14).
- The first tap after a cold load still pays for sound's engine if it comes before the page's first
  idle moment (request 13).
- The number pad's quick adds are +1, +step and +2×step (no free typing).

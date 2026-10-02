# catkin voice: the copy deck

This is the final copy for every moment in catkin, and the rules behind it. It extends
[DESIGN §12](./DESIGN.md#12-voice). Where a line is data (captions, stage lines, reveal lines, note
templates), `src/catalog/lines.ts` is the source and this deck quotes it. Slots are written in braces:
{habit} is the habit's name as she wrote it, {name} is a pet's name, and {plant} is the habit's plant: "the
Read plant", or the plant's own name when the habit's name wouldn't read as a label ("the snake plant" for
Tidy for 10 minutes). A capitalised slot opens a sentence: {Plant} is "The Read plant", and {Count} is a
number spelled out ("Nineteen").

**How the lint reads this file.** `tests/unit/voice.test.ts` checks every "double-quoted" string here
against the rules below, the same way it checks the catalog and (after integration) the UI. Banned words
appear only in `backticks`, which the lint skips. If you add copy to this deck, put it in double quotes.

---

## 1. Principles

**The plant-sitter's note.** Brief, kind, specific, observed. A friend is looking after her plants and
her cat for a week, and leaves a note on the counter. Present tense, plain words, sentence case,
numerals. Warmth comes from specifics (names, plants, times), not adjectives.

- **The test:** would a friend text this about her own cat and her own plants? "Walk, watered. +5 ·
  Pudding opened one eye." passes. `Great job watering your Walk plant! 🌱` does not.
- **Who reads it.** Millennial women who love cats, cows, plants, making things and making progress.
  Warm and a little funny, the way real animals are funny: the cow that stands in the one sunbeam, the
  cat that sits on the page you're reading. Never cheesy, precious or corporate.
- **The animals never speak and never get pronouns.** Every owner decides who her pet is, so lines lead
  with the name and never say `he`, `she`, `they` or `it` about a pet. "Pudding would like the sun to
  stay exactly where it is." Pets don't think out loud, sign cards or say hello; the narrator only
  reports what they do.
- **The narrator reports; the animal is the funny one.** End on the concrete thing (the pot, the dish, the
  rim, the glass), not on a wink. No `, which says a lot`, no `as if it were a play`, no `very` plus a
  feeling. A pet can't know about rest days or perfect days; it can see damp soil, a moon on a pot and a
  full saucer.
- **Real behaviour, real species.** A slow blink is a cat's. A cud-chew is a cow's. A throat puff is a
  frog's. No paws on frogs or ducks, no wings on cows, no sighs from frogs. Plants never get faces or
  feelings.
- **Say only what's true.** Every pet is alone on the sill for its first days, so no line assumes a
  friend. A new plant is a cutting in a glass, so no pot or soil until it's potted. The evening is the
  lamp, after sunset for most of the year. Captions carry the conditions they need (`minStage`,
  `minLevel`, species), and `pickLine` checks them.
- **Growth only adds, and the copy says so.** Nothing wilts, droops or goes brown. A plant "is resting",
  never neglected.
- **Rest is part of the routine.** Show it, don't preach it: "Yoga is resting today. Nothing here wilts."
  That reassurance is said once, on the rest-day toast, and nowhere else.
- **Coming back is noticed kindly.** The app never mentions a gap. The welcome is the same as any
  ordinary day, plus a ticket.
- **Say what's true now.** Not what's missing, not what used to be, not what could happen.
- **Calm.** No countdowns, no FOMO, no guilt, no red. A seasonal series says "until Nov 10", and that's
  all.

### Style

- **Numbers:** numerals everywhere: "26 of the last 30 days", "+5", "4 more waterings to Blooming". Spell
  a count out only where it opens a sentence in a note ("Nineteen waterings."), inside a note's P.S.
  ("P.S. Juniper slept on the book four evenings."), in an engraved pin name ("Fifty waterings") or at
  the start of a tiny label ("Four glasses"). `numberWord()` in lines.ts does it.
- **Punctuation:** full stops. A middle dot joins the parts of a status line: "3 of 5 · +18 coins". One
  exclamation mark exists in the whole app, on the Secret reveal. No dashes as punctuation in copy; use a
  full stop or a middle dot. Apostrophes are curly, always: "Today’s off." The lint fails a straight one.
- **Spelling** follows the catalog: colour, favourite, savoury, moisturiser. Dates are short and
  American-ordered: "Sep 22", "Mon, Sep 22". Times: "7:30 am", "6 pm", "7 am" (no ":00"). The examples in
  this deck are all in 2025: "Mon, Sep 22" and "Week of Sep 22" start the same week.
- **Emoji:** none in UI chrome, ever. A note may carry at most one (Emoji 12.0 or earlier, never
  currency); catkin's own notes use none. The only emoji she sees are ones she typed. No dingbats as
  decoration either: no sparkles, stars, hearts, moons or flowers. The check mark stays: "Tiny version ✓".
- **Verbs:** a check-in is a watering. Buttons, toasts and notes say "water" and "watered", and period
  goals say "watered for the week". The word `check-in` is for help text and screen readers only where
  "watering" would confuse.
- **Habit names are hers.** Print them exactly as typed, in Castoro. Refer to the plant as {plant} ("the
  Read plant"), never with a possessive on her words.
- **Plural and drink items.** A treat can be "blueberries" or "barley tea", and a thing to wear can be
  "earmuffs", so no line puts a verb or a pronoun after {treat} or {wear} (`the {treat} is`, `had it`),
  and a pet "has" a treat rather than eating or carrying it.
- **Capital letters:** sentence case everywhere. Proper names keep capitals: series ("No. 02 · Cows"),
  places ("The Sill", "Saucer Pond"), stages ("Blooming"), tiers ("Rare"), the Field Guide, Special
  Order, the Window Seat, Sunday Note, Herbarium page.

## 2. Never

The lint fails the build on these in any copy. Each has a plainer thing to say (section 3).

| Never | Examples |
|---|---|
| Puns | `purrfect`, `moo-tivation`, `pawsome`, `unbe-leaf-able`, `toadally`, `holy cow`, `one nap at a time` |
| Cheering | `yay`, `woohoo`, `hooray`, `yippee` |
| Bestie talk and baby talk | `bestie`, `bff`, `smol`, `floof`, `teeny`, `fur baby`, `doggo`, `kitty`, `nom`, `yummy`, `boop`, `blep`, `tummy`, `toe beans`, `snuggle`, `zoomies`, `all gone`, stretched words like `sooo` |
| The C word | `cozy`, `cosy`, `coziest` |
| Exclamation marks | anywhere but the Secret reveal |
| Pep talk | `you got this`, `keep it up`, `kept it up`, `great job`, `nice work`, `well done`, `you did it`, `way to go`, `proud of you`, `amazing`, `awesome`, `look at you go`, `don't give up`, `ready to grow` |
| Platitudes | `grow at your own pace`, `one day at a time`, `progress not perfection`, `every step counts`, `baby steps`, `start small`, `small wins`, `rest is productive`, `be kind to yourself`, `you deserve`, `journey`, `your future self` |
| Counts of what is undone | `3 habits left`, `2 to go`, `1 more by Sun`, `remaining`, `almost there`, `only 2 more`, `not done yet`, `0 in the jar`, `incomplete`, `you haven't`, `don't forget`, `last chance`, `hurry` |
| Any mention of a gap | `welcome back`, `you're back`, `good to see you again`, `it's been a while`, `it's been 5 days`, `long time no see`, `where have you been`, `while you were away`, `since your last visit`, `comeback`, `absence` |
| Comparisons to a better past | `fewer than last week`, `down from`, `dropped to`, `slipping`, `not as often`, `you used to`, a date that moves later when she rests |
| The five words | `missed`, `failed`, `lost`, `broken`, `behind` (as in `falling behind`; "behind the pot" is fine), and `catch up` |
| A streak of nothing | `0 days`, `zero`, and the word `streak` itself |
| Pet pronouns and pet speech | `he`, `she`, `they`, `its` for a pet; `I`, `me`, `my` in a pet's mouth; `Pudding says…`; a pet that `waves a hand to say hello` |
| Emoji and decoration | any emoji in chrome; sparkle, star, heart, moon and flower dingbats used as decoration (`✦`, `☾`, `✩`, `⋆`, `❁`) |
| Straight apostrophes | `Today's`; write "Today’s" |
| Old names | `stars` or `stardust` as currency, `badge`, `rewards`, `Mochi`, `meadow`, `Wishing Well`, `wish`, `weekly letter`, `crank`, `machine`, `unlock`, `level up`, `achievement`, `Congratulations`, `Oops`, `Common`, `Uncommon`, `Ultra rare`, `check in` |

## 3. Substitutions

| Instead of | Say |
|---|---|
| `streak` | "in a row" ("12 days in a row"), or the rolling phrase "26 of the last 30 days" |
| `missed a day`, `broke your streak` | nothing. Say nothing. The card shows the rolling phrase. |
| `welcome back` | "Everything kept." |
| `you haven't watered Walk` | nothing. The pot is simply not damp yet. |
| `check in`, `complete`, `done` | "water", "watered", and "watered for the week" for a period goal |
| `uncheck` | "not watered after all" |
| `done` for an avoid habit | "held off" ("Held off 12 days") |
| `badge`, `achievement` | "pin" |
| `stars` | "stamps" |
| `stardust` | "swaps" |
| `crank`, `machine` | "handle", "cabinet" |
| `pull` (in the UI) | "capsule" ("a Rare within the next 10 capsules") |
| `Common`, `Uncommon`, `Ultra rare` | "Classic", "Special", "Super rare" |
| `Wishing Well`, `wish` | "Special Order", "order" |
| `weekly letter`, `monthly letter` | "Sunday Note", "Herbarium page" |
| `friends` (pets as a category) | "pets" |
| `Find them a plant` | "Find {name} a plant" |
| `unlock` | the verb it is: "earn", "open", "order" |
| `level up` | the behaviour: "Pudding looks up when you water now." |
| `rewards` | the thing: "+5", "a ticket", "1 stamp". The setting keeps its DESIGN name, "Quiet rewards". |
| `Congratulations`, `Success` | what's true now: "Backup saved." |
| `Oops`, `Uh oh`, `Error` | what happened and what to do |
| `Are you sure?` | the consequence: "Delete Walk? The plant and its history go too." |
| `cozy` | name the thing: "the lamp’s on", "warm", "the quilt" |
| `reminder` | "watering time" |
| `resume` | "bring it back" |

## 4. Currency

Four resources, each a real object, each with one job (DESIGN §6). The internal ids never reach the UI.

| Say | Singular | Object | Never say |
|---|---|---|---|
| "coins" | "1 coin" | brass coins with a pressed leaf, in a glass jar | `gold` |
| "stamps" | "1 stamp" | a shop loyalty card that fills | `stars` |
| "swaps" | "1 swap" | duplicates on the swap shelf | `stardust`, `dust` |
| "tickets" | "a ticket" | a printed stub | `tokens` |

- Amounts gained: "+5", "+18 coins", "+1 stamp", "+4 swaps", "a ticket". In the check-in chip, the coin
  token stands in for the word: "+5".
- Prices: "25 coins", "3 stamps". Inline tokens are drawn SVG ({coin}, {stamp}, {swap}, {ticket}), never
  emoji.
- The wallet sheet, "What can I get?":
  - "Coins come from watering, and buy capsules (25 each) and new places for the Shelf."
  - "Stamps buy No. 07 · Night and Special Orders, and come from the Showing-up ladder, Sunday Notes, Herbarium pages, pins, swaps, and growing a habit a little bigger."
  - "Swaps come from capsules you already had, and from the small things pets leave on the sill. Every 10 make a stamp."
  - "Tickets come from the Showing-up ladder, welcome-home days and your birthday. Each one is a free capsule from any series."

## 5. Today

### Dated notes and removal (WP-C6)

DEC-V: pending owner approval. The same sheet opens from Today, Moments and the Calendar.
The title includes the full day and year, so an old note never looks like today’s.

| Moment | Line |
|---|---|
| Title | "A note for {habit} · {date}" (for example, "A note for Walk · Monday, September 29, 2025") |
| Edit button, accessible name | "Edit the note for {habit} · {date}" (visible label: "Edit the note") |
| Field placeholder | "A line about this day" |
| Remove button and confirmation button | "Remove note" |
| Confirmation title | "Remove this note?" |
| Confirmation | "This removes the note and its star from {habit} on {date}." |
| Optional checkbox, initially off | "Also remove it from Sunday Notes" |
| Retained copies | "Daily and weekly copies keep the note until those copies age out. Copies kept before imports or restores may keep it longer. Erase everything removes local copies. Keepsake captions and exported backup files are unchanged." |
| A different save replaced the open note | "The save changed while this note was open. Close it and open the note again." |
| The note’s habit or day can no longer be changed | "This note can’t be changed here now. Close it and open the note again." |

Save keeps "Save note" and "Noted."; the safe cancellation is "Keep editing". A refusal while
another window owns the save reuses "This window can’t change the save right now.". Clearing
a kept note and choosing Save asks the same removal question as Remove note. The optional
Sunday Note choice removes only quotations that refer to this habit and day. Other keepsake
captions and exported files are unchanged. Ordinary note edits use the existing save status and
retry; "Noted." means the change was accepted here, not that a failing device write succeeded.

### Greetings

Top left of the band, on the card chip, above the long date. From `GREETINGS` in lines.ts. With no name
set, the name and its comma drop out ("Morning."). The words a friend would use: no `Good afternoon`,
and never "Evening" at 2 am.

| When (clock hour) | Greeting |
|---|---|
| 4 to 6 | "Early start, {userName}." or "Morning, {userName}. The lamp’s still on." |
| 6 to 12 | "Morning, {userName}." |
| 12 to 17 | "Afternoon, {userName}." |
| 17 to 22 | "Evening, {userName}." |
| 22 to 4 | "Hello, {userName}. The lamp’s on." or "Hello, {userName}. Everything on the sill is asleep." |
| Her birthday | "Happy birthday, {userName}." |

The long date: "Monday, September 29". The vine chip on the sill ledge: "3 of 5 · +18 coins" (before any
coins today, just "3 of 5"). With only flexible habits watered and nothing day-based on: "2 watered". With
nothing on at all, the chip isn't there. Collapsed band: "Sep 29", the mini ring, the wallet. Tapping the
window: "Open the Shelf".

### The card status line

One line under the habit name, first match wins (DESIGN §9.1.1). It never shows a streak under 3, never a
0, never red, and never what's left or a deadline.

| Case | Line |
|---|---|
| Count in progress | "5/8 glasses" |
| Tiny version logged | "Tiny version ✓" |
| Flexible, in progress | "2 of 3 this week" (nothing after it); before the first watering of the period, "3 this week" (the same shape, never a 0) |
| Flexible, met | "Watered for the week ✓" (monthly: "Watered for the month ✓"; every 2 weeks "Watered for the fortnight ✓"; quarterly "Watered for the quarter ✓") |
| 3 or more in a row, daily | "12 days" |
| 3 or more in a row, certain days | "12 in a row" |
| 3 or more in a row, weekly or monthly | "4 weeks in a row", "3 months in a row" |
| Avoid habit, 3 or more | "Held off 12 days" (certain days: "Held off 12 in a row"; weekly: "Held off 4 weeks in a row") |
| 10 or more expected | "26 of the last 30 days", "11 of your last 13 Mon/Wed/Fri", "3 of the last 4 weeks", "5 of the last 6 months" |
| New plant | "Rooting · 2 more to pot up" |
| Brand new | "Just planted" |
| Resting today | "Resting today" (with the moon) |

The line is built by `statusLine()` in `src/catalog/format.ts` from the card's `subtitle` data (kind and
numbers only); the same function is used by the card, its screen-reader description and the fx layer.

Below 10 expected occurrences there are no percentages: "4 of 4 so far". The anchor sits above it in
Castoro italic: "After I pour my coffee", or for a stacked habit, "After Walk".

Collapsed rows: "Morning 3/3" · "Watered for the week" · "This month" · "Other days" ·
"Resting: 2 habits · back Oct 6".

### Check-in toasts and asides

From `CHECKIN_TOASTS` and `CHECKIN_ASIDES` in lines.ts. The toast lasts 4 seconds, with "Undo" and "Add a
note". About 1 in 4 gets an aside from the habit's companion, or whoever is nearest (`ASIDE_CHANCE`).

| Moment | Toast |
|---|---|
| Watered | "{habit}, watered. +{coins}" → "Walk, watered. +5" |
| With an aside | "Walk, watered. +5 · Pudding opened one eye." |
| Count habit, target reached | "{habit}, watered. {count} {unit}. +{coins}" → "Drink water, watered. 8 glasses. +4" |
| Count habit, partial tap | no toast; the ring ticks, and screen readers hear "5 of 8 glasses" |
| Tiny version | "{habit}, watered: the tiny version. +{coins}" → "Walk, watered: the tiny version. +3" |
| Past the daily budget, or a flexible extra | "{habit}, watered." (the chip shows +1 or nothing) |
| History edit, older than 6 days | "{habit}, watered for {date}. History only, no coins." |
| Undo, or uncheck | "{habit}, not watered after all. The {coins} coins went back in the jar." / "Walk, not watered after all. The coin went back in the jar." |
| Uncheck after the coins were spent | "{habit}, not watered after all. The coins were spent already, and stay spent." |
| Uncheck with nothing to refund | "{habit}, not watered after all." |
| Note saved | "Noted." |

Asides, awake (all species): "{name} watched the water go in." · "{name} moved a little closer." · "{name}
did a small hop." · "{name} stretched." · "{name} watched from the next pot." · "{name} didn’t move, but
noticed." From friendship level 2 (the level that announces it), also "{name} looked up."

Asides, awake, per species: cats "{name} gave a slow blink." and "{name} flicked an ear." · cows "{name}
kept chewing the cud." and "{name} did a nose-lick." · frogs "{name}’s throat puffed out." · rabbits
"{name}’s nose twitched." · hamsters "{name} stuffed one cheek." · dogs "{name} wagged." · ducks "{name}
stretched a wing." · bears "{name} sat up."

Asides, asleep (night, or mid-nap): "{name} opened one eye." · "{name} slept through it." · "{name}
shifted, still asleep." · "{name} stirred, then settled." · cats "{name} twitched an ear, asleep." · cows
"{name} kept chewing, eyes shut." · dogs "{name}’s tail thumped once." · ducks "{name} stayed tucked under
one wing." · hamsters, only between 23:00 and 06:00, "{name} is up anyway. Hamsters keep late hours."

The add-a-note field: placeholder "A line about today", button "Save note". Moments list it as "Mon, Sep
22 · Walk" with her words below. Closing it with a changed line asks first, in the Habit Editor's
words (`EDITOR_COPY`, §24): "Leave without saving?", "Your changes aren’t saved yet.", with "Keep
editing" (the default) and "Leave it". No new line.

For screen readers, after 1.2 seconds of quiet: "Walk, watered. Plus 5 coins." Several at once: "3
habits watered. Plus 14 coins."

### Rest, off days, pauses

| Moment | Copy |
|---|---|
| Rest day set | "{habit} is resting today. Nothing here wilts." |
| Rest day cleared | "{habit} is back on for today." |
| Rest days ahead | "Resting Sat and Sun" |
| Rest allowance, in the editor | "Up to 2 rest days a week count as watered. More still get a moon, and the numbers count the first 2." |
| Take today off (button) | "Take today off" |
| Confirm | "Take today off? Every habit rests, the same as a rest day." |
| Off day set | "Today’s off. Every plant is resting." |
| Off day cleared | "Today’s back on." |
| Off-day allowance | "Days off this month: 2. Up to 4 count as rests." |
| Pause | "Pause {habit}" → "Back on…" → "{habit} is resting until {date}." |
| Pause with no end | "{habit} is resting until you bring it back." |
| Bring it back | "{habit} is back on the sill." |
| Today's collapsed row | "Resting: 2 habits · back Oct 6" |

### A past day, backfill and history

- The banner: "Logging for Sat, Sep 27 · Back to today". Buttons end "for Saturday": "Walk for
  Saturday".
- Logging before a habit started: "Start tracking Walk from Mon, Sep 22?" · "Start from Sep 22" · "Not
  now".
- Calendar edits older than the 6-day window: "Fixes history. No coins for this one."
- An editor open on another day when Today goes back to today (a new day, or a minute hidden). The
  number pad keeps its day, and its title names it ("Drink water for Saturday"), while that day is
  still on the week strip. The ⋯ menu, the inline stepper, "Take today off?" and a number pad whose
  day has left the strip close instead, and when that day is not today one note says which day was
  left as it was. {day} is the weekday for a day in the last six ("Back to today. Drink water for
  Saturday is as you left it."), and the date for a day a week back or more ("Back to today. Drink
  water for Thu, Sep 24 is as you left it."): a day a week back has today's weekday, and "Thursday"
  on a Thursday would read as today. DEC-V: pending owner approval.
  - A habit's editor: "Back to today. {habit} for {day} is as you left it."
  - "Take today off?": "Back to today. {day} is as you left it."
- The clock guard: "The clock on this device reads earlier than catkin last saw. Coins and stamps wait
  until it’s right again."

### Perfect day

Every habit that's on is watered or resting (DESIGN §6). Up to 12 petals, in the plants' own colours.

- Day: "Everything’s watered. The whole sill is in the sun."
- Lamplight (from 8 pm): "Everything’s watered. The whole sill is in the lamplight."
- The chip: "+12". As an "also" line under a bigger moment: "Everything watered". (`perfect day` is the
  internal name only; written on screen, it grades every other day.)

### Period goals

- Week: "{habit}, watered for the week. +10" → "Yoga, watered for the week. +10"
- Month: "{habit}, watered for the month. +20" → "Look over the budget, watered for the month. +20"

### Rungs, in a row

Per habit, coins only, at 3, 7, 14, 21, 30, 45, 60, 90, 120, 180 and 365, paying 10, 20, 30, 35, 40, 50,
60, 80, 100, 150 and 250.

| Unit | Toast |
|---|---|
| Days | "Walk: 7 days in a row. +20" |
| Times (certain days) | "Yoga: 21 in a row. +35" |
| Weeks | "Yoga: 3 weeks in a row. +10" |
| Months | "Look over the budget: 3 months in a row. +10" |
| Avoid habits | "No snooze: held off 14 days. +30" |
| The last rung | "Walk: 365 days in a row. +250" |

### The Showing-up ladder

Account level: the distinct days with at least one watering. It only goes up.

- "Showing up: 7 days. 1 stamp, onto the card."
- "Showing up: 21 days. 2 stamps and a ticket."
- "Showing up: 180 days. 6 stamps and 2 tickets."
- At 365: "Showing up: 365 days. 12 stamps, 3 tickets, and the Window Seat."
  Then: "The Window Seat is yours: a cushioned seat built into the window, with the best light in the
  place."
- Every 100 after: "Showing up: 465 days. 6 stamps and a ticket."

### Welcome home

The first watering after 3 or more quiet days: 20 coins and a ticket. The copy is the same as any ordinary
day, plus the ticket. It never says how long, and the pet line is an ordinary one: no `seems glad`, no
`as ever`, no pet that has to look twice to see who it is.

- "Everything kept. There’s a ticket on the sill."
- With a pet: "Everything kept. Pudding is on the warm pot, and there’s a ticket on the sill."
- The chip: "+20 coins · a ticket". The pet line comes from the `welcomeHome` captions.

## 6. Progress

The one screen that looks back, so it only ever looks back at what happened. A number that went down is
simply not shown.

- The hero: "You showed up 26 of the last 30 days".
- This month so far: "September so far: 22 of 29 days". Below 10 expected waterings, no percentage: "4 of 4
  so far".
- This week: "6 of 7 this week".
- The comparison with the same days last month shows only when it's up or level: "Up on the same days
  last month" · "Level with the same days last month". When it's down, that line isn't there, and one fact
  from the month stands in its place: "62 waterings so far in September. Walk is the steadiest." (a closed
  month: "62 waterings in August. Walk was the steadiest.").
- Goals: "3 goals on track" (one: "1 goal on track"). When none are, the line isn't there.
- Rests, last 30 days: "2 rests · 1 day off". None: no line.
- Recent months, one calm bar each, labelled "Aug · 24 days".
- The year strip's summary: "312 waterings in 2025, across 180 days" (one: "1 watering in 2025, across 1 day").
- Records: "Waterings: 312" · "Tiny versions: 8" · "Longest run: Walk, 21 days in a row" · "Best month:
  August" · "Everything watered: 14 days" · "Days showing up: 180".
- Insights: "Thursdays are the steadiest." · "Walk is the steadiest habit." · "Evenings are when most
  watering happens."
- The calendar's history note: "Fixes history. No coins for this one."

The words come from `src/catalog/format.ts` (`PROGRESS_LINES` in lines.ts); the view model carries the
numbers.

## 7. Plants

### Plant stages

From `STAGE_LINES` in lines.ts. Cutting · Rooting · Potted · Leafy · Budding · Blooming · Flourishing ·
Evergreen. {Plant} is "The Read plant", or "The snake plant" for a long habit name.

| Stage | Line |
|---|---|
| Cutting | "{Plant} is a cutting in a glass of water. It roots with the first watering." |
| Rooting | "White roots are showing in the glass. {Plant} is rooting." |
| Potted | "{Plant} is potted up." → "The Read plant is potted up." |
| Leafy | "{Plant} has put out new leaves." |
| Budding | "There’s a bud on {plant}, still closed tight." |
| Blooming | the species line below (fallback "{Plant} is Blooming.") |
| Flourishing | "{Plant} is spilling over the rim of the pot." |
| Evergreen | "{Plant} is Evergreen. There’s a small brass watering can on the pot now." |

A multi-stage jump plays as a time-lapse and announces only the last stage.

**Blooming, species-true** (`BLOOM_LINES`), used on Habit Detail and in the banner. Foliage plants never
"flower" in the copy; they reach their peak form.

- Golden Pothos: "{Plant} is trailing past the edge of the sill."
- Chinese Money Plant: "{Plant} has a crown of round leaves, and a small pup at the base."
- Polka-dot Begonia: "{Plant} has pink flowers under the spotted leaves."
- Snake Plant: "{Plant} has sent up a spike of small cream flowers, which snake plants hardly ever do."
- Cat Grass: "{Plant} is thick and tall enough to lie in."
- Monstera: "{Plant} has opened a first split leaf."
- Strawberry: "{Plant} has white flowers and the first small berries."
- Lavender: "{Plant} has purple spikes, and the sill smells of lavender."
- Catnip: "{Plant} has small white flowers at the tips."
- Hoya: "{Plant} has a cluster of star-shaped flowers."
- Moth Orchid: "{Plant} has opened the first flower on the long stem."
- Prayer Plant: "{Plant} has a new striped leaf, and folds up every evening."
- African Violet: "{Plant} has small purple flowers above the soft leaves."
- Tulip: "{Plant} has opened a single cup."
- Christmas Cactus: "{Plant} is flowering pink at the tips of the stems."
- Sunflower: "{Plant} has opened one flower, turned towards the window."

In a note, the same moment in the past tense (`BLOOM_EVENTS`): "The Walk plant grew thick enough to lie
in on Thursday." · "The Read plant trailed past the edge of the sill on Monday." Where the species
doesn't matter: "reached Blooming".

**Forecast** on Habit Detail, in waterings, never sunshine numbers and never a date (a date slides later
whenever she rests): "4 more waterings to Blooming." · "1 more watering to Blooming." · at Evergreen,
"Evergreen. Small visitors arrive from here on." (`STAGE_FORECAST`, worded by `forecastLine()`).

**Flourishes** after Evergreen (`FLOURISH_LINES`): "A ladybird has moved into {plant}." · "A bee visits
{plant} now." · "A robin looks in at {plant} from the ledge most mornings." · "A butterfly stops at
{plant} most afternoons." · "There’s a new shoot at the base of {plant}." · "Moss has grown round the
foot of {plant}." · "{Plant} has grown taller than the window latch." · "{Plant} has a ribbon tied round
the pot."

**Graduation**, offered and never automatic:

- "A bigger pot?" · "Walk has been steady for 4 weeks. Make it a little bigger? +1 stamp" · "Grow it" ·
  "Keep it as it is"
- "Make it tinier?" · "A smaller version still counts, and still waters the plant." · "Make it tinier" ·
  "Keep it as it is"

**The Cutting**, the lifetime pothos in a jar on the window frame: "The cutting in the jar has roots." ·
"The cutting is potted up." · "The vine has reached the window frame." · "The vine goes all the way round
the window now."

### Harvest

A completing watering on a Blooming-or-later edible plant drops one serving into the basket, as the toast's
aside (`HARVEST_LINES`):

- Cat grass: "A pinch of cat grass, into the basket."
- Catnip: "A few catnip leaves, into the basket."
- Strawberry: "One strawberry, into the basket."
- Lavender: "Lavender for shortbread, into the basket."

In full: "Cat grass, watered. +4 · A pinch of cat grass, into the basket."

## 8. Pins

Enamel pins on Progress. Unearned pins show as outlines with the description. Names are engraved, so
their numbers are spelled out. From `src/catalog/badges.ts`.

| Pin | How it's earned |
|---|---|
| "First watering" | "Water a habit for the first time." |
| "Everything watered" | "Water every habit that’s on for the day. Rest days count as watered." |
| "A whole week, all watered" | "Water every habit that’s on, every day for a week. Rest days count as watered." |
| "Ten waterings" | "Water habits 10 times in all." |
| "Fifty waterings" | "Water habits 50 times in all." |
| "A hundred waterings" | "Water habits 100 times in all." |
| "Two hundred and fifty waterings" | "Water habits 250 times in all." |
| "Five hundred waterings" | "Water habits 500 times in all." |
| "A thousand waterings" | "Water habits 1,000 times in all." |
| "First rest day" | "Give any habit a rest day. It shows as a moon." |
| "Key under the mat" | "Comes with your first welcome-home ticket." (its outline stays hidden until it's earned) |
| "First capsule" | "Turn the handle on any capsule cabinet." |
| "Foil edge" | "Open a Rare, or anything rarer." |
| "Holographic stripes" | "Open a Super rare. A Secret counts." |
| "Ten in the Field Guide" | "Collect 10 different things from the capsules." |
| "Twenty-five in the Field Guide" | "Collect 25 different things from the capsules." |
| "Fifty in the Field Guide" | "Collect 50 different things from the capsules." |
| "A hundred in the Field Guide" | "Collect 100 different things from the capsules." |
| "A full lineup" | "Tick off every item on one series leaflet." |
| "First bloom" | "Grow a habit’s plant to Blooming." |
| "Brass watering can" | "Grow a habit’s plant all the way to Evergreen." |
| "First treat" | "Give a pet a treat from the pantry." |
| "A favourite treat" | "Find out which treat a pet likes best." |
| "Something to wear" | "Put something to wear on a pet." |
| "Brass name tag" | "Reach friendship level 10 with a pet: best friends." |
| "Before seven" | "Water a habit before 7 am." |
| "Under the lamp" | "Water habits 3 times between 7 and 10 pm." |
| "A full Field Guide page" | "Collect everything on one page of the Field Guide." |
| "First harvest" | "Water cat grass, catnip, strawberry or lavender once it’s Blooming, and a serving drops into the basket." |
| "A steady month" | "Water at least 80% of what’s on in a calendar month." |

The pin banner: eyebrow "A new pin", title the pin's name, text its description, amount "+2 stamps".
As an "also" line: "Fifty waterings, a new pin". The shelf's heading: "Pins".

### Keepsakes you earn

Things that come from showing up rather than from a capsule (`EXCLUSIVE_LINES`), each announced once:

- The Window Seat: "The Window Seat is yours: a cushioned seat built into the window, with the best light in the place."
- The Laurel Sprig: "A laurel sprig, from the first plant to reach Evergreen. It’s in the wardrobe now."
- The Paper Party Hat: "A paper party hat, folded from a birthday card. It’s in the wardrobe now."
- The Tiny Cake: "A tiny cake, three layers and one candle. It’s on the Shelf now."
- The Reading Chair: "The Cats page is full. A reading chair, for the Shelf."
- The Pasture Fence: "The Cows page is full. A length of pasture fence, for the Shelf."
- The Stepping Stones: "The Pond Club page is full. Stepping stones, for the Shelf."
- Anything else: "{A}, yours to keep. It’s on the Shelf now."

## 9. Pets

### Captions

The caption matrix is `CAPTIONS` in lines.ts: 10 personalities × 15 contexts (tap, checkin, morning,
afternoon, evening, night, rainy, restDay, perfectDay, welcomeHome, fed, fedFavourite, newWear, resident,
newArrival), at least 4 lines each, plus shared and species-true lines. `pickLine(context, personality,
species, seed, recent, situation)` never repeats one of the last 5 in a context, and only picks lines that
are true: the species, the plant's stage (no pot round a cutting) and the pet's friendship level (a
behaviour a level announces doesn't show before it). `night` always wins; `rainy` replaces tap, morning,
afternoon and evening when the window shows rain. A taste:

- Sleepy, morning: "{name} is up, technically."
- Curious, evening: "{name} is looking at the reflection in the dark window."
- Sassy, fed: "{name} left exactly half of the {treat}, as a statement."
- Sassy, evening: "{name} would like the lamp a little to the left."
- Foodie, checkin: "{name} came over, saw it was only water, and left."
- Dramatic, rainy: "{name} is pressed flat against the glass, watching the rain."
- Dreamy, newArrival: "{name} hasn’t quite noticed the move yet."
- Cows, rest day: "{name} is lying down and chewing the cud, which is resting, for a cow."
- Rabbits, perfect day: "{name} did a binky: a jump with a twist in the middle."
- Hamsters, night: "{name} is awake, actually, and filling both cheeks."

**Personalities** (label and blurb): "Sleepy" "Can sleep anywhere, and does." · "Playful" "Plays with
anything that moves, and a few things that don’t." · "Curious" "Has to see what that is." · "Shy" "Watches
from behind the pots at first." · "Sassy" "Knows which spot is best, and takes it." · "Gentle" "Calm
company. Moves slowly, and sits close." · "Foodie" "Knows where the treats are kept, and when." ·
"Dramatic" "Always lies down in the way." · "Sunny" "Happiest in the brightest spot." · "Dreamy" "Watches
the window for hours."

### Friendship levels

Plain names, and a line that says what the pet does now (`FRIENDSHIP_LEVELS`). Nothing ever decays, and
no level mentions a number of friendship points.

| Level | Name | Line |
|---|---|---|
| 1 | "New here" | "{name} is new here." |
| 2 | "Looks up" | "{name} looks up when you water now." |
| 3 | "Knows you" | cats "{name} slow-blinks back at you now." · cows "{name} does a nose-lick when you say hello now." · dogs "{name} wags when you say hello now." · rabbits "{name} hops over when you say hello now." · frogs "{name} stays put when you say hello now." · ducks "{name} waddles over when you say hello now." · bears "{name} sits up when you say hello now." · hamsters "{name} comes out of the bedding when you say hello now." |
| 4 | "Has a favourite spot" | "{name} has claimed a favourite spot on the sill." |
| 5 | "Follows the sun" | "{name} follows the sunbeam along the sill now." |
| 6 | "Brings you things" | "{name} leaves small things on the sill now, on days you water. A button, a leaf, a bead." |
| 7 | "Naps near you" | "{name} naps at the front of the sill now, nearest you." |
| 8 | "Afternoon naps" | "{name} naps next to {friend} now, most afternoons." Alone on the sill: "{name} naps in the same spot every afternoon now." |
| 9 | "Waits for you" | "{name} is usually waiting at the front of the sill now." |
| 10 | "Best friends" | "{name} is your best friend now. There’s a small brass tag to show it." |

Bond levels, after best friends. Each says what the pet does now, and none of them is a family word:

| Level | Name | Line |
|---|---|---|
| 11 | "Settled in" | "{name} has settled in for good, and falls asleep mid-stroke now." |
| 12 | "Part of the furniture" | "{name} is part of the furniture now, with a cushion that has a dent in it." |
| 13 | "Has a routine" | "{name} has a routine now: the sunbeam after lunch, the lamp after dark." |
| 14 | "Knows every pot" | "{name} knows every pot on the sill now, and which ones are warm." |
| 15 | "Old friends" | "{name} is an old friend now, and here for good." |

The best-friends banner: eyebrow "Best friends", title "You and {name}", text "There’s a small brass tag
to show it." Memories arrive along the way after that, from real days, and read like dates in a diary:
"Came home Sep 29" · "The day Read bloomed" · "Best friends, Nov 2". Each one: "A new Memory on {name}’s
card: ‘{memory}’."

### The found thing

From level 6, on days she waters, a pet leaves something small on the sill (`FOUND_LINE`, `FOUND_THINGS`):
"{name} left a {found} on the sill. +1 swap" → "Pudding left a bottle top on the sill. +1 swap". The things:
a button, a leaf, a bead, a blue thread, a seed, a bottle top, a feather.

### The Pet Card and gestures

- Fields: "Likes" · "Known for" · "Favourite spot" · "Came home" · "Friendship" · "Personality" ·
  "Favourite treat" · "Wardrobe" · "Keeps {habit} company" · "Memories".
- "Likes": the treat hint until the favourite is found ("Perks up at anything sweet"), then "{treat}, most
  of all".
- "Favourite spot", from level 4: a place ("The Saucer Pond") or a pot ("The Read plant"). Before level 4 the
  row isn't there.
- "Best friend", from level 8: "{friend}". Alone on the sill, the row isn't there.
- Buttons for every gesture: "Say hello" (tap) · "Stroke" · "Touch nose" (for ducks, "Touch beak"; for
  frogs, "Touch head") · "Pick up" and "Put down" · "Feed" · "Rename" · "Find {name} a plant".
- The name tag that floats up after a tap: "{name}’s card".
- A sleeping pet, tapped: the `night` captions, never grumpiness.

### Treats and the pantry

- Fed: the `fed` captions ("{name} had the {treat}.").
- Favourite treat found: "{name}’s favourite is the {treat}. It’s on the Pet Card now." Then the
  `fedFavourite` captions ("{name} knows which treat is the good one now: the {treat}.").
- The hint until it's found (`TREAT_TAG_HINTS`): "Watches the fruit bowl closely" · "Perks up at anything
  sweet" · "Prefers something savoury" · "Always interested in your cup" · "Comes over at the sound of a
  crunch" · "Likes things fresh from the garden".
- Full for today (the fourth treat): "{name} has had enough for today." No friendship number, ever.
- Pantry restock, each morning: "The pantry restocked: 2 servings of each treat."
- Bake a tray: button "Bake a tray · 10 coins", then "Baked: 5 servings of {treat}, in the pantry."
- More than 6 treats: the Feed row shows the first 6, then "All treats ({count})", which opens the rest
  in the card (WP-C7). DEC-V: pending owner approval.
- A treat run out for today: "That’s the last of the {treat} for today. 2 more servings in the morning."
- Something new to wear: the `newWear` captions, which name it ("{name} looks well in the {wear}.").
  Buttons "Put it on" · "Take it off".

## 10. Capsules

### The cabinets

- Carousel card: "No. 01 · Cats" · "25 coins" · a seasonal one "Autumn Edition · until Nov 10" · "7 of 19
  in the Field Guide", and before the first one is yours "19 in the lineup" (never a 0).
- Night: "No. 07 · Night" · "3 stamps" · "Better odds, paid in stamps."
- Pity, while it matters: "A Rare within the next 10 capsules." · "The next capsule is a Rare or better."
  · "A Super rare within the next 40." Hidden once every item in that tier is yours.
- The lucky meter: "Lucky meter · 3 of 4" and, at 4, "The next one is new."
- Links: "Odds" · "The lineup" · "Special Order".

### Insert, turn, open

| Step | Copy |
|---|---|
| Pay | "Put a coin in" · Night: "Put 3 stamps in" · with a ticket: "Use a ticket" |
| Turn | "Turn the handle" (keyboard hint: "Space or Enter turns it") |
| The capsule lands | screen reader: "A capsule, Rare finish, in the tray." |
| Open | "Twist to open, or tap" · button name: "Open capsule, Rare finish" |
| A Secret | "Tap" · "Again" · "Once more" |
| Quick open (setting) | "Skip the wait when opening capsules" |

### The reveal

The insert prints the series, the item and its number ("No. 02 · Cows · Belted Galloway · 5 of 9"), the
tier word and its finish, one line from `REVEAL_LINES`, then the item's flavor text.

| Tier (finish) | Line |
|---|---|
| Classic (matte paper) | "{series}. {A}." → "No. 02 · Cows. A Holstein." |
| Special (two-colour print) | "{series}. {A}, one of the Specials." → "No. 02 · Cows. A Belted Galloway, one of the Specials." |
| Rare (foil edge) | "{series}. {A}, one of the Rares." → "No. 01 · Cats. A Siamese, one of the Rares." |
| Super rare (holographic) | "{series}. {A}, one of the Super rares." |
| Secret (holographic, with a ?) | "{series}, the secret one! {A}, {secretLine}" |

The Secret carries the only exclamation mark in catkin, and one sparkle. Each series Secret has its own
line (`SECRET_LINES`), and each says something the flavor text below it doesn't:

- "No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft."
- "No. 01 · Cats, the secret one! A Maine Coon, with a tail as long as the rest put together, and already asleep across two pots."
- "No. 03 · Dogs, the secret one! A Samoyed, white all over, and already shedding a little on the sill."
- "No. 04 · Pond, the secret one! A Mandarin Duck, asleep on one leg on the saucer’s rim, bill tucked into the back feathers."
- "No. 05 · Garden, the secret one! An Angora, sitting in the draught from the window, fur lifting in it."
- "No. 06 · Pantry, the secret one! A Spectacled Bear Cub, sitting up and holding both back feet, the way bear cubs do."
- "No. 07 · Night, the secret one! A Night-sky Cow, lying down already, with one star right on the nose."
- "Autumn Edition, the secret one! A Pumpkin Spice Cow, already lying in the fallen leaves, chewing the cud."
- "Winter Edition, the secret one! An Eider Duckling, the size of an egg cup, and asleep before the capsule was all the way open."
- "Valentine Edition, the secret one! A Lilac Birman, already kneading the paper insert."
- "Spring Edition, the secret one! A Crested Duck, with a crest that wobbles a moment after every nod."
- "Summer Edition, the secret one! A Golden Frog, waving one front foot, the way golden frogs do."

New or not:

- New: the word "New" on the insert.
- A duplicate: "{A}, again. Onto the swap shelf · +{swaps} swaps" → "A Holstein, again. Onto the swap
  shelf · +2 swaps" · "Blueberries, again. Onto the swap shelf · +2 swaps"
- A duplicate pet: "An Orange Tabby, again. Onto the swap shelf · +2 swaps · Pudding came over to look."
  The friendship it earns shows as dots on the Pet Card.
- Swaps into a stamp: "The swap shelf is full: 10 swaps, traded for 1 stamp."
- The screen reader hears one sentence: "No. 02 · Cows. A Belted Galloway, one of the Specials.
  Two-colour print. New."

A new pet, on the insert:

- Name field label "Name", with a suggestion filled in and "Another name" to reroll.
- "Came home: today" (tap to change the date).
- "Find {name} a plant" · "Let {name} choose" · "Not now".
- Then: "{name} moved into {plant}." Or, from "Let {name} choose": "{name} chose {plant}, for the
  sun."

### The odds sheet

Title "Odds". Rows "Classic 60%" · "Special 25%" · "Rare 10%" · "Super rare 5%" (Night: 40, 30, 20, 10),
then each item's own odds. The explanations:

- "Every capsule is one of these tiers, at these odds."
- "Things you don’t have yet are 3 times as likely."
- "A Rare turns up within 10 capsules, and a Super rare within 40."
- "Once every Rare in a series is yours, that count goes away."
- "After 4 repeats in a row, the next one is always new."
- "Ones you already had go on the swap shelf: 2, 4, 8 or 15 swaps, by tier. Every 10 swaps make a stamp."
- "Each series has one Secret, shown as a ? until it turns up."

### The lineup

Title "The lineup". Each item: its number and name, a tick when it's yours, "not yet" when it isn't, and a
single "?" for the Secret.

### Special Order

At the counter, for stamps: "Anything not yet in the Field Guide, for stamps."

- Prices: "Classic 3 · Special 4 · Rare 8 · Super rare 15 · Moonlit 8"
- Confirm: "Order the Siamese for 8 stamps?" · "Order" · "Not now"
- It arrives with the reveal: "Your order: a Siamese." An unknown Secret stays a "?" tile, and ordering it
  plays the full Secret reveal.
- A completed series: "Trade 250 coins for 40 swaps".
- Nothing left to order: "Everything in the Field Guide is yours."

#### The Memories rule

A seasonal edition's items can be ordered only after that season has visited since she started.

- On a seasonal tile: "Can be ordered once the Winter Edition has visited. It visits Nov 11 to Jan 14,
  every year."
- After it has: nothing. The tile is simply orderable.

### Capsule notices (errors)

Calm, plain, and each with the way forward. No emoji, no `Almost`, and never a count of 0: with nothing
in the jar or on the card, the notice leaves the count out.

| Error | Notice |
|---|---|
| Not enough coins | "No. 01 · Cats is 25 coins a capsule. There are 18 in the jar." · with an empty jar, "No. 01 · Cats is 25 coins a capsule. Watering fills the jar." · link "Water something on Today" |
| Not enough stamps | "No. 07 · Night is 3 stamps. There’s 1 on the card." · with none, "No. 07 · Night is 3 stamps. The card fills from showing up." · link "Where stamps come from" |
| No ticket | "Tickets come from the Showing-up ladder, welcome-home days and your birthday." |
| Series not here now | "The Winter Edition is here from Nov 11 to Jan 14." (and, if it has visited, "Anything it has brought before can be ordered at the counter.") |
| A capsule already in the tray | "There’s a capsule in the tray. Open that one first." |
| Special Order, not enough stamps | "A Rare is 8 stamps at the counter. There are 5 on the card." · with none, "A Rare is 8 stamps at the counter. The card fills from showing up." |
| Special Order, already yours | "Already in the Field Guide." |
| Special Order, not sold | "This one isn’t sold at the counter. It comes from showing up." |
| Special Order, season not yet visited | "The Winter Edition hasn’t visited yet. Its things can be ordered once it has." |
| A capsule that couldn’t be saved (storage full or unavailable) | "This capsule couldn’t be saved, so it wasn’t opened. Nothing was spent." |
| A capsule in a browser that keeps nothing | "This browser isn’t keeping catkin’s save, so the capsule stayed closed. Nothing was spent." |
| A capsule while this window is still getting ready | "One moment: catkin is still getting ready in this window. Nothing was spent." |
| Special Order that couldn’t be saved | "That order couldn’t be saved, so it wasn’t placed. No stamps were spent." |
| Special Order in a browser that keeps nothing | "This browser isn’t keeping catkin’s save, so the order wasn’t placed. No stamps were spent." |
| Special Order while this window is still getting ready | "One moment: catkin is still getting ready in this window. No stamps were spent." |

## 11. Places

The places map: "The Sill" "free" · "Saucer Pond" "400 coins" · "Cat-grass Tray" "700 coins" ·
"Bookshelf" "1,000 coins" · "Balcony Box" "1,500 coins" · "The Quilt" "2,500 coins". Button "Open for
400 coins". Each one adds "Room for 2 more pets".

Pets out on the Shelf each spend the day in one place. Opening a place moves the pets who love it most
into it (up to its room). On the Pet Card: "Spends the day in" with the place's name, and "Move {name}" →
the open places as chips → "{name} moved to the Saucer Pond." / "{name} moved back to the Sill." From "Let
{name} choose": "{name} chose the Saucer Pond."

Once per save, when a save’s Balcony Box was already open before every pet loved it (DEC-P10): its never-placed pets
settle there, and Today says so once, with the existing line and a Pet Card button: "{name} moved to the Balcony Box." ·
"{name}’s card". It adds no new line. DEC-V: pending owner approval (a new moment for existing lines).

Opened, with the pet who loves it most, or without:

- "The Saucer Pond is open. {name} went straight to the lily pad." / "The Saucer Pond is open: a saucer of
  water, a pebble island and one lily pad."
- "The Cat-grass Tray is open. {name} is out in the grass already." / "The Cat-grass Tray is open. A
  pasture, at this size."
- "The Bookshelf is open. {name} is on the top shelf, under the lamp." / "The Bookshelf is open: two
  shelves of paperbacks and a reading lamp."
- "The Balcony Box is open. There’s weather out there now, and room to roam."
- "The Quilt is open: a folded patchwork quilt, deep enough to disappear into."

## 12. Rituals

### Sunday Note

A small card clipped to the sill, arriving as "There’s a note on the sill." Built by `SUNDAY_NOTE` in
lines.ts, in this order:

1. Opener: "Week of {weekOf}."
2. Waterings, spelled out, from 5 up (`WATERINGS_MIN`): "{Count} waterings." Below 5 the note skips the
   count and opens with its first highlight, because a bare "Two waterings." reads as a grade.
3. Up to two highlights, most specific first:
   - "{Plant} {stageEvent} on {weekday}."
   - "{Plant} {stageEvent} on {weekday}, and {name} has napped in it every afternoon since." Only when the
     plant is Potted or later and the day was Friday or earlier; otherwise "{Plant} {stageEvent} on
     {weekday}, and {name} has kept it company since."
   - "{habit}, watered every day."
   - "{habit}, watered on {count} days." (one day: "{habit}, watered on 1 day.")
   - "{name} came home on {weekday}." / "{name} came home on {weekday} and moved into {plant}."
   - "{Plant} was planted on {weekday}, as a cutting."
   - "The tiny version of {habit} was enough on {count} days."
   - "{habit} came right after {anchor} on {count} days."
   - {stageEvent} is one of "was planted as a cutting", "put down roots", "was potted up", "put out new
     leaves", "showed a first bud", the species' Blooming ("grew thick enough to lie in"), "spilled over
     the rim", "turned Evergreen". The species is the plant's when the note was written; a note written before
     the plant was kept with it says "reached Blooming".
4. Her own words, only from a note she starred: "On {weekday} you wrote: ‘{quote}’."
5. The P.S.: with a companion, "P.S. {name} {routine} {times}." ({routine} from `SUNDAY_ROUTINES`, {times}
   like "four evenings"). The companion is the pet that shared the most days with a habit that week, and
   {times} counts only those days; the routine is the one the habit had when the note was written, so an icon
   change later never rewrites it. A note written before the routine was kept with it says only what is known:
   "P.S. {name} kept {plant} company {times}." (`companionPlain`; {plant} as in the highlights). DEC-V: pending
   owner approval. Without a companion, only something that happened: "P.S. On {weekday}, {name} left a
   {found} on the sill." · "P.S. {name} and {friend} napped in a pile on {weekday}." · "P.S. {name} spent
   the afternoons in the sunbeam." (the last only when the pet's afternoons were on the sill, and never two
   weeks running).
6. The stamps: "One stamp, enclosed." / "{Count} stamps, enclosed."

Never a percentage. A week with no watering sends no note, and nothing mentions it.

Examples:

- "Week of Sep 22. Nineteen waterings. The Read plant showed a first bud on Thursday, and Juniper has napped in it every afternoon since. P.S. Juniper slept on the book four evenings. Three stamps, enclosed."
- "Week of Oct 6. The Yoga plant was planted on Monday, as a cutting. On Tuesday you wrote: ‘slow start, good walk’. P.S. On Wednesday, Pudding left a button on the sill. One stamp, enclosed."
- "Week of Oct 13. Twenty-six waterings. Humbug came home on Saturday and moved into the Walk plant. Drink water, watered every day. P.S. Humbug waited by the door five mornings. Two stamps, enclosed."

### Herbarium page

On the 1st, the month's stems are pressed (`HERBARIUM`). It arrives as "There’s a page on the sill."

- Title: "{Month}, pressed." → "September, pressed."
- Each pressing: "{habit} · {count}" → "Walk · 24". With rests: "Yoga · 7 · 2 rests".
- The footnote: "Rest days are pressed as the small flowers."
- One margin note, if true: "{Plant} reached Blooming this month." · "{name} came home on {date}." ·
  "{Plant} was planted this month." The very first page: "The first page."
- The stamps: "Two stamps, enclosed."

No percentage, and a quiet month's page is as full a page as any.

### The Memory shelf

Section title "Memory shelf". Items: "Sunday Note · Week of Sep 22" · "September, pressed" · "Walk ·
retired Aug 30" · "Summer, on the sill".

### Season Review and the fresh-start chips

On the first open of a new season, a Today card: never modal, skippable, 15 seconds at most.

- Title: "{Season}, on the sill." → "Summer, on the sill."
- The note when the card arrives: "{Season}, on the sill. It’s on Today."
- Each plant, counts only: "Walk · Cutting to Blooming · 71 waterings".
- Then: "Autumn starts today. How should each habit go on?"
- Chips, per habit: "Keep going" (preselected) · "Tinier" · "Grow" · "Rest till next season" · "Finish"
- What each does, under the chip: "Just as it is." · "A smaller version, for autumn." · "A little more. +1
  stamp" · "Paused until Dec 1." · "To the balcony shelf, with a ribbon."
- The one-tap: "Keep everything". Skip: "Later". Done: "All set for autumn."
- A "just this season" habit: "Walk was just for summer. It’s on the balcony shelf now, with a ribbon."
- From Habit Detail and You, anytime: "Tune my habits".

### Birthday

Optional; set in Profile ("Birthday", helper "For a small surprise on the day. Optional.").

- The greeting: "Happy birthday, {userName}."
- The card: "There’s a tiny cake on the sill, and a ticket."
- Each pet leaves a one-line card, in the narrator's voice: "{name} sat by the cake all morning." ·
  "{name} left a leaf next to the cake." · "{name} is wearing the paper party hat, more or less." ·
  "{name} has been keeping an eye on the candle."

### Came-home days and the moving-in anniversary

- A pet's came-home day, yearly, with a small bow on the pot: "{name} came home a year ago today." /
  "{name} came home 3 years ago today."
- The moving-in anniversary, as a note: "A year on this sill. The first cutting was {habit}." / "Two
  years on this sill. {Count} waterings since the first one."

## 13. Keeping Company

### The offer, and its decline

Offered after naming at a reveal, in the Habit Editor and on the Pet Card, at most once a day, and never
again after 3 declines.

- At a reveal: "Find {name} a plant" · "Let {name} choose" · "Not now"
- Habit Editor: "Who keeps it company?" · the pets as chips · "No one, for now"
- Pet Card: "Keeps {habit} company" or "Find {name} a plant". Opened from a reveal's "Find {name} a
  plant", the card opens on the plants to choose from. With no habit on the sill yet: "{name} would
  like a plant to keep company. Plants grow from habits, starting as a cutting in a glass of water." ·
  "Add a habit" (WP-C7; not "{name} keeps a plant company", which reads as untrue of a pet with no
  plant). DEC-V: pending owner approval.
- Moved in: "{name} moved into {plant}."
- A decline says nothing back. It just closes.
- Moving out: "Move {name} out" → "{name} moved back to the sill."

### The three stories

Unlocked by companion sunshine only. They arrive as "There’s a story on the plant tag for {habit}." The
story names (The start, Why it matters, Look at us) are titles on the tag; the text opens on the facts.

**The start** (about a week):

- "The start. {name} moved into {plant} on {date}. {Count} waterings later, {name} has a favourite side
  of the pot."

**Why it matters** (about 3 weeks of company; asks once and keeps her answer as the habit's why):

- The ask: "{name} has kept {habit} company since {date}. If you like, write down why it’s on the sill."
- Field placeholder: "A line, just for you". Buttons: "Keep it" · "Not now".
- Kept: "Why it matters: ‘{why}’." It shows on Habit Detail and is editable in the Habit Editor.

**Look at us** (at Blooming; quotes her Moments and makes a Memory):

- "{Plant} is Blooming, and {name} is asleep under it. On {momentDate} you wrote: ‘{moment}’."
- Without a Moment: "{Plant} is Blooming, and {name} is asleep under it. {Count} waterings, from a
  cutting."
- The Memory it makes: "The day {habit} bloomed".

### Keepsake captions

At Rooting, Budding, Blooming and Evergreen the companion leaves a small dated keepsake by the pot. The
caption is prefilled from her latest Moment ("{date} · ‘{moment}’"), otherwise from its family:

| Family | Caption |
|---|---|
| move | "{date} · Left by the pot: a pebble from the path." |
| read | "{date} · Left by the pot: a paper bookmark." |
| hydrate | "{date} · Left by the pot: a piece of sea glass." |
| rest | "{date} · Left by the pot: a small feather." |
| mind | "{date} · Left by the pot: a smooth grey stone." |
| create | "{date} · Left by the pot: a scrap of yarn." |
| tidy | "{date} · Left by the pot: a spare button." |
| cook | "{date} · Left by the pot: a dried bean." |
| care | "{date} · Left by the pot: a hair tie." |
| garden | "{date} · Left by the pot: a seed." |
| connect | "{date} · Left by the pot: a folded note." |
| plan | "{date} · Left by the pot: a paperclip." |
| Evergreen | "{date} · Left by the pot: a brass seed." |

When it arrives, a note names the thing, in the caption's words: "{name} left {thing} by the pot." → "Pudding left a
pebble from the path by the pot." (`KEEPSAKE_NOTE`, `KEEPSAKE_THINGS`).

### Known for

The companion relates to the habit's objects the way real animals do (`KNOWN_FOR`, 14 archetypes from the
habit's icon, through `knownFor(icon)`). The routine shows from Potted on days the habit was done; the
settled line is permanent from Blooming. A day without it looks exactly like an ordinary day.

| Archetype | Starting | Settled |
|---|---|---|
| read | "Has started sleeping on your book in the evenings." | "Sleeps on the open book whenever you read." · "Keeps your place in the book, by lying on it." |
| learn | "Has started lying on the warm laptop." | "Lies on the warm laptop whenever you study." |
| walk | "Has started waiting by the door when it’s nearly time to go out." | "Knows when you’re about to head out." |
| mat | "Has started lying on the mat." | "Is on the mat before you’ve finished unrolling it." |
| water | "Has started drinking from the bowl whenever you have a drink." (frogs: "Has started sitting in the water dish whenever you have a drink.") | "Drinks from the bowl every time you do." |
| sleep | "Has started getting into bed before you." | "Is in bed before you every night." |
| mind | "Has started sitting with you, very still, when you take a quiet minute." | "Breathes slowly with you, or seems to." |
| create | "Has started sitting on whatever you’re making." | "Sleeps in whatever bag or case you’ve left open." |
| tidy | "Has started sitting in the laundry basket." | "Inspects each tidy surface, then sits on it." |
| cook | "Has started watching from the kitchen counter when you cook." · "Has started inspecting every shopping bag as it comes in." | "Waits by the chopping board, hopeful." |
| care | "Has started sitting on the bathroom mat while you get ready." | "Watches the whole routine from the edge of the sink." |
| plan | "Has started sitting on the papers." | "Sits on the papers you need, every time." |
| connect | "Has started sitting close by whenever you call someone." | "Sits by the phone whenever it rings." |
| garden | "Has started following the watering can round the room." | "Checks each real plant after you water it." |

Two icons have their own objects (`KNOWN_FOR_BY_ICON`): Pet care, "Has started watching when you fill the
real bowls." · "Sits by the real food bowls at feeding time, as if it helps."; Journal, "Has started lying
across the open journal." · "Lies on the page you’re writing on." The Anything icon uses mind.

## 14. Blooms Like You

When a plant first blooms, its look comes from how she keeps the habit. The plant tag explains it in plain
words, and it pays nothing.

- Colours: "Dawn" ("you usually water it before 9") · "Sunlit" ("you usually water it in the middle of
  the day") · "Twilight" ("you usually water it after 6 pm") · "Wildflower" ("you water it at all sorts
  of times").
- Shapes: "Classic" · "Petite" ("the tiny version counted on 9 days") · "Paired" ("on 18 days it came
  right after Walk").
- The tag: "Dawn · Paired: you usually water it before 9, and on 18 days it came right after Walk."
- Choosing: "Show this look" · "Classic". Helper: "Classic is always here, if you prefer it."
- Re-read at Evergreen, adding a look: "A new look for {plant}: Twilight."

**The move-it-to-Evening nudge:** "You set Walk for mornings but usually water it after 6 pm. Move it to
Evening?" · "Move to Evening" · "Leave it in Morning". Offered once; a "Leave it" is remembered.

**Habit stacking:** the anchor line "After Walk" and "Right after Walk on 18 days".

## 15. Garden Journal

On Habit Detail: up to five plain sentences that ink in from week 2 (`GARDEN_JOURNAL`). Until then each
shows a pencil line saying when it fills in, counted in waterings, never a deadline.

| Sentence | Inked | Pencil |
|---|---|---|
| Usual time | "You usually water it around 7:30 am." | "Your usual time fills in after 6 more waterings." (or "after 1 more watering.") |
| Steadiest day | "Thursdays are when it’s watered most." | "The steadiest day fills in after the second week." |
| Tiny days | "The tiny version was enough on 5 days." | "Tiny days fill in the first time you use the tiny version." |
| Days in a pair | "Watered right after Walk on 18 days." | "Days in a pair fill in once it follows another habit." |
| Why it looks this way | "It blooms Dawn because you water it before 9 am, usually." (or "at all sorts of times") | "Why it looks the way it does fills in at Blooming." |

## 16. Onboarding

Ninety seconds or less to the first capsule, and every step skippable ("Skip").

1. An empty sill in morning light. "New place. Which plants came with you?" An optional field: label "Your
   name", helper "For the greeting. Optional."
2. "Pick up to 3." Chips: "Drink water" · "Walk" · "Read" · "Stretch" · "Journal" · "Tidy for 10
   minutes" · "Take vitamins" · "Skincare", then "More ideas" and "Make my own". Under them: "More can go
   on the sill anytime." Each chosen habit appears on the sill as a cutting in a water glass.
3. "Anything already done today?" Live water buttons. The first watering plays in full: "Walk, watered.
   +5". The jar tops up: "There are 25 coins in the jar. That’s a capsule."
4. "Who comes home first?" Four cabinets, two by two: "No. 01 · Cats" · "No. 02 · Cows" · "No. 03 · Dogs"
   · "No. 04 · Pond", with no price. Under the heading: "Your first capsule is on the house. Choose a
   cabinet." Then "Put a coin in" · "Turn the handle" · "Twist to open, or tap". The first capsule is always
   a pet.
5. "Name" (a suggestion filled in, "Another name") · "Came home: today" · "Find {name} a plant".
6. The other way out: "Not yet, I’ll earn it" → Today, with a pinned card. While the free capsule is still
   on the house: "Your first capsule is waiting on the Capsules tab." Otherwise: "Your first capsule: water
   anything."

Before step 1, on iPhone and Mac Safari tabs, the install gate (section 19).

## 17. Empty states

| Screen | Copy |
|---|---|
| Today, no habits | "An empty sill. Add a habit, and it starts as a cutting in a glass of water." · "Add a habit" |
| Today, nothing on today | "Nothing’s on today. The plants are fine." |
| Today, everything resting | "Everything is resting today." |
| Week strip, a day with nothing | just the date, no words |
| Progress, first days | "This fills in as you water." |
| Calendar, a day without notes | "No notes on Sep 12." |
| Records | "Records fill in as you go." |
| Insights | "Insights fill in after 2 weeks of watering." |
| Pins | "Your pins go on this shelf as you earn each one." |
| Memory shelf | "Sunday Notes, Herbarium pages and retired plants are kept here." |
| Habit Detail, Moments | "Notes you add after watering show up here." |
| Shelf, no pets | "The sill is ready for someone. Your first capsule is on the Capsules tab." |
| Field Guide, an empty page | "Cows come from the No. 02 cabinet." Each unowned tile reads "not yet". |
| The basket | "Harvests land here, from Blooming cat grass, catnip, strawberries and lavender." |
| The pantry | "Treats you collect restock here every morning." |
| Decor, edit mode | "Decor from capsules goes here." |
| Pet Card, Memories | "Memories start once you’re best friends." |
| Habits, archived | "Nothing archived." |
| Icon picker, no match | "No icon for that. The watering can suits anything." |
| Reminders | "No watering times set." |
| Snapshots | "The first daily copy is made tonight." |
| Special Order, all yours | "Everything in the Field Guide is yours." |

## 18. Errors and recovery

Say what happened and what to do. Never `failed`, never `Oops`, never a code in the main line.

| When | Copy |
|---|---|
| A screen doesn't load | "This screen didn’t load. Your plants and coins are saved." · "Reload" |
| A sheet doesn't open: its part of catkin hasn’t downloaded (offline before it was ever kept, or an update took the old part away). A small sheet; "Try again" keeps what was asked for, "Close" lets it go (WP-C4). DEC-V: pending owner approval | "This didn’t open" · "It needs a connection the first time it opens. Your plants and coins are saved." · "Try again" · "Close" |
| A sheet is slow to open the first time: its part of catkin is still downloading (only before catkin has been kept for offline). After a moment, the same small sheet, its "Try again" busy; "Close" lets it go. If the part can't come, the sheet says the line above (WP-C4 follow-up, P-ui-23). DEC-V: pending owner approval | "One moment" · "Try again" · "Close" |
| A save doesn't go through | "That change didn’t save yet. catkin is trying again, and your last backup is safe." |
| Nothing can be kept in this browser | "This browser isn’t keeping catkin’s save right now. Save a backup before you close it." |
| The demo waits for a save | "The demo opens once your last change is saved." |
| Open in another window | "catkin is open in another window · Use here" |
| A save from a newer catkin | "This save is from a newer catkin, so it opens read-only here. Update to make changes." |
| Started over in another window (this window follows, and the note has a Close button). DEC-V: pending owner approval | "catkin was started over in another window, so it starts fresh here too. The daily copies stay on this device." |
| The device clock went back | "The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again." |
| The save couldn't be read, so catkin opened the one before it (its `:backup`); the note has these buttons and Close. DEC-V: pending owner approval | "catkin couldn’t read the latest save on this device, so it opened the one before it." · "Save a backup" · "Daily copies" |
| The save couldn't be read at all, so its file is kept as it was: aside (its `:corrupt`), or, while there is no room to put it aside yet, where it was, with every change waiting and the note for a save that doesn't go through beside it. The note has these buttons and Close. DEC-V: pending owner approval (the wording is chosen to be true in both states) | "catkin couldn’t read the save on this device. The file is kept just as it was." · "Save the damaged file" · "Daily copies" · "Import a backup" |
| A full disk: a later change could only be saved by taking the room the damaged file was kept in, so its text is only in this window now (gone on reload). This note replaces the one above (with its Daily copies and Import a backup when that one showed) and has no Close; it goes once the damaged file is saved. DEC-V: pending owner approval | "catkin needed the room to save your changes, so the damaged file isn’t kept on this device any more. Save it now to keep it." · "Save the damaged file" |
| A save that doesn't go through: the note above gains two buttons. After a Try again that still didn't save, a note says so. DEC-V: pending owner approval | "Try again" · "Save a backup" → "Still not saved. catkin keeps trying." |
| Nothing can be kept in this browser, and a save from a newer catkin: the notes above gain "Save a backup" (for a newer catkin's save, its own bytes). There is no Try again: a browser that keeps nothing can only be tried again by reloading | "Save a backup" |
| Reload app, or the update's Reload, while a change isn't written yet (the note's button reloads all the same). DEC-V: pending owner approval | "Your latest changes aren’t saved yet. Reloading now would clear anything that isn’t saved." · "Reload anyway" |
| Safari tab storage | "In a Safari tab, a save can be cleared after 7 days. Keep catkin on your Home Screen to keep it safe." |
| Copy didn't work | "Couldn’t copy. Select the text and copy it by hand." |
| Share sheet unavailable | "Saved to Downloads instead." |
| Import, not a backup | "That file isn’t a catkin backup." |
| Import, from a newer catkin | "This backup is from a newer catkin. Update, then import it." |
| Import, too big to be a backup: a file over 64 MB (refused before it is read), or pasted text or a CK1 payload that is, or expands, past the bounds (a lived-in backup is well under 1 MB). Nothing changes. DEC-V: pending owner approval | "That’s too big to be a catkin backup." |
| The file:// build | "Test copy · saved only in this browser, for this file" |
| Diagnostics | "Copy report" |

## 19. Install guide

- The gate on iPhone and Mac Safari tabs: "Keep catkin on your Home Screen" · "Just peek" (opens the demo).
- iPhone and iPad, Safari: "Tap Share." · "Tap Add to Home Screen." · "Open catkin from there."
- Mac, Safari: "Choose File › Add to Dock." · "Open catkin from the Dock."
- Chrome and Edge: "Click Install in the address bar." · "Open catkin from your apps."
- Android: "Tap the menu, then Install app."
- Windows, the single file: "Double-click catkin.html. It works offline, in this browser."
- Moving plants into the installed app: "Move my plants into the app" → "Copied. Open catkin from your Home
  Screen and tap Paste my plants." · "Paste my plants"
- Updates: "A new version is ready · Reload" · "Up to date." · "Check for updates" · "Reload app".

## 20. Reminders

Web push would need a server, so reminders are calendar events she adds herself (DESIGN §11.1).

- Settings: "Watering time" with rows "Morning" · "Midday" · "Evening", a time each, and "Add to
  calendar". Helper: "catkin can’t send notifications, so it makes a calendar event that repeats every
  day. Your calendar does the reminding."
- The `.ics` event: SUMMARY "Watering time", DESCRIPTION "Morning plants: Walk, Stretch, Take vitamins.",
  alarm text "Watering time". With no habits in that block: DESCRIPTION "Morning plants." Built by
  `wateringTimeIcs()` in `src/domain/profile.ts`; the file is "catkin-watering-time-morning.ics".
- Never `Don't forget`, never a count, never a name of a pet.

## 21. Data

Under You › Data.

| Action | Copy |
|---|---|
| Save a backup | "Save a backup" → "Backup saved." (file "catkin-backup-2025-09-29.json") |
| Copy backup | "Copy backup" → "Copied. Paste it somewhere safe, like a note to yourself." |
| Import | "Import a backup" |
| Import preview | "This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20." · "Import" · "Keep what’s here" |
| Import, while a chosen file, the clipboard or a pasted backup is still being read and described (whatever was described before has gone, so there is nothing to import yet). DEC-V: pending owner approval | "Reading the backup…" |
| Imported | "Imported. You can undo this for 24 hours." |
| Undo import | "Undo import" → "Back to how things were before the import." |
| Imported with no Undo (she confirmed importing anyway, or there was no lasting copy and nothing yet to lose). DEC-V: pending owner approval | "Imported. There is no Undo import this time." |
| Snapshots | "Daily copies, kept on this device: 7 daily and 4 weekly." · "Restore this copy" |
| Restored (the note carries "Undo") | "Back to the copy from Sep 20." · "Undo" |
| Restore with no copy of what's here (asked once more, like import). DEC-V: pending owner approval | "Restore without an undo?" · "catkin couldn’t keep a copy of what’s here, so there is no undo for this restore." · "Restore this copy" · "Keep what’s here" |
| Undo a restore (the row after a restore; DEC-P13's generic label). DEC-V: pending owner approval | "Undo last replacement" → "Back to how things were before the restore." |
| An import, restore or Undo whose save couldn't be written (nothing changed). DEC-V: pending owner approval | "That couldn’t be saved on this device, so nothing changed." |
| The save changed while an import, restore or Undo was under way (Start over, the demo, another window). DEC-V: pending owner approval | "The save changed just then, so nothing was replaced. Try again." |
| A daily copy that can't be read right now. DEC-V: pending owner approval | "That copy can’t be read on this device right now, so nothing changed." |
| A copy that is gone (its Undo goes too). DEC-V: pending owner approval | "That copy isn’t on this device any more, so nothing changed." |
| An Undo that is no longer on offer (over 24 hours, or the save shown has been replaced since, say from another window; its copy may still be under Daily copies). DEC-V: pending owner approval | "That Undo isn’t on offer any more, so nothing changed." |
| A daily copy a newer catkin kept (restoring it is refused, and nothing changes). DEC-V: pending owner approval | "That copy is from a newer catkin. Update, then restore it." |
| CSV | "Export waterings as CSV" (file "catkin-waterings-2025-09-29.csv"; columns "date", "habit", "count", "target", "state"; states "watered", "tiny", "partial", "rest") |
| CSV from a newer catkin’s save shown read-only: only what this catkin can read, labelled partial in its note and its file name. DEC-V: pending owner approval | "Saved the waterings this catkin can read. A backup keeps the whole newer save." (file "catkin-waterings-2025-09-29-partial.csv") |
| CSV from a newer catkin’s save this catkin can’t read at all (no file). DEC-V: pending owner approval | "This catkin can’t read the waterings in a newer save. A backup keeps all of it." |
| Storage | "Saved on this device" / "Saved in this browser tab" |
| Storage, while a change didn't save yet, or nothing can be kept (the §18 lines) | "That change didn’t save yet. catkin is trying again, and your last backup is safe." / "This browser isn’t keeping catkin’s save right now. Save a backup before you close it." |
| Storage, while this window waits to become the one that saves. DEC-V: pending owner approval | "Getting ready to save" |
| Daily copies that can't be read right now (the sheet says so, never the empty line). DEC-V: pending owner approval | "The daily copies can’t be read on this device right now." · "Try again" |
| A damaged save kept aside (a row until Start over, and the §18 note's button). DEC-V: pending owner approval | "Save the damaged file" → "The damaged file is saved." (file "catkin-damaged-save-2025-09-29.txt", its bytes exactly as they were) |
| Last backup | "Last backup: Sep 20" / "No backup yet" |
| The nudge | "Worth saving a backup: the last one is from Aug 2." |
| Start over | "Start over" → "Start over? Every habit, plant and pet on this device goes. Save a backup first, just in case." · "Start over" · "Keep everything" |
| The demo | "Try the demo" · "Leave the demo" |

Habits: "Archive {habit}? The plant moves to the balcony shelf, and you can bring it back anytime." ·
"Delete {habit}? The plant and its history go too." · "Keep the plant on the balcony shelf?" · "Keep it on
the balcony" · "Delete everything" · "Walk is back on the sill. The time it spent archived counts as a
pause."

## 22. Settings

| Setting | Label | Helper |
|---|---|---|
| Name | "Your name" | "For the greeting." |
| Birthday | "Birthday" | "For a small surprise on the day. Optional." |
| Week starts | "Week starts on" | "Changes apply from next week." |
| Day starts | "Day starts at" | "Late nights count towards the day before, until this time." |
| Theme | "Look" | "Automatic" · "Day" · "Lamplight" |
| Sounds | "Sounds" | "Small real sounds: a coin, water, a purr." |
| Volume | "Volume" | |
| Haptics | "Haptics" | "Where your device supports it." |
| Reduce motion | "Reduce motion" | "Automatic" · "On" · "Off" |
| Quick open | "Quick open" | "Skip the wait when opening capsules." |
| Quiet rewards | "Quiet rewards" | "Hide coins, capsules and the wallet. Just the tracker." |
| Compact Today | "Compact Today" | "Smaller cards, more habits on screen." |
| Companions | "Show companions" | "Show who keeps each habit company, on its card." |
| Quoted notes | "Quote my notes in the Sunday Note" | "Only notes you’ve starred." |
| Hemisphere | "Where’s your summer?" | "June to August" · "December to February" |
| Reminders | "Watering time" | see section 20 |

The Habit Editor: "Name" · "Icon" · "Colour" · "Plant" · "Pot" · "How often" ("Every day" · "On certain
days" · "A few times a week" · "A few times a month") · "How much" · "Tiny version" (placeholder "Shoes
on, step outside") · "About how long?" ("Under 5 minutes" · "5 to 30 minutes" · "Longer") · "When"
("Morning" · "Midday" · "Evening" · "Anytime") · "After…" (placeholder "After I pour my coffee") · "Build
or avoid" ("Do it" · "Avoid it") · "Why it matters" · "Who keeps it company?" · "Just this season" ·
"Plant it" (new) / "Save" (edit). With 3 long habits already: "3 long habits is the most at once. Pick a
shorter time, or pause one of the others."

The editor's field notes say what to do, never "invalid": "Give it a name, up to 60 characters." · "Pick an
icon." · "That plant is still in a capsule." · "Pick at least one day." · "Pick another habit to follow." ·
"The tiny version needs a few words." · "Make the tiny version smaller than the whole amount." (all in
`HABIT_ISSUES`, lines.ts, by issue code).

How often, as a habit's summary (Habit Detail, the history): "Every day" · "Mon/Wed/Fri" · "3 times a
week" · "Once every 2 weeks" · "Twice a month" · "Once a quarter" · "Once a year". A change: "From Oct 6:
Mon/Wed/Fri"; the first rule: "Since Sep 22: Every day"; a count habit adds its amount: "Every day · 8
glasses". (`SCHEDULE_LINES` in lines.ts, worded by `scheduleText` and `ruleChangeText` in format.ts.)

About: "Look after the little things." · "Your habits grow the plants. The plants become a home." · "How it
works" · "Credits" · "Version {version}".

## 23. Screen readers

- Check buttons are named with the habit ("Walk") and use pressed state, never `not done`.
- Count buttons: "Add 1 glass to Drink water", described by "5 of 8 glasses".
- Day progress: "3 of 5 watered". The week strip's days: "Saturday, September 27, 3 of 5 watered" (nothing on:
  "Saturday, September 27").
- A habit card: "Walk" with pressed state; a count habit "Drink water, 5 of 8 glasses".
- The capsule flow: "Put a coin in" → "Turn the handle" → "Open capsule, Rare finish", and the reveal as
  one sentence (section 10).
- Pets: "Pudding, orange tabby, asleep" for the art; the caption is the live text.

## 24. Screen chrome

The screens' own small words: section names, buttons, labels and a few notes, each in `src/catalog/lines.ts`
under the constant named. Same rules as everywhere (section 1).

### Today (`TODAY_COPY`)

| Key | Line |
|---|---|
| today | "Today" |
| whatCanIGet | "What can I get?" |
| week | "The last 7 days" |
| more | "More for {habit}" |
| menu.tiny | "Tiny version" |
| menu.howMany | "How many…" |
| menu.rest | "Rest day" |
| menu.note | "Add a note" |
| menu.editNote | "Edit the note" |
| menu.details | "Details" |
| menu.edit | "Edit" |
| howMany | "How many for {habit}" |
| pad.done | "Done" |
| pad.tiny | "Tiny version" |
| show | "Show" |
| addHabit | "Add a habit" |
| noteTitle | "A note for {habit}" |
| open | "Open" |
| read | "Read it" |
| close | "Close" |
| toCapsules | "Go to Capsules" |
| pickPlant | "Pick a plant for {name}" |

### Today: the Season Review after its first day (`SEASON_ASK_LATER`)

| Key | Line |
|---|---|
| (the line) | "{Season} is here. How should each habit go on?" |

### The Habit Editor (`EDITOR_COPY`)

| Key | Line |
|---|---|
| newTitle | "A new habit" |
| editTitle | "Edit {habit}" |
| ideas | "Ideas" |
| ideaGroups | "Kinds of ideas" |
| more | "Colour, plant, amount and more" |
| leaveTitle | "Leave without saving?" |
| leaveNew | "The habit isn’t planted yet." |
| leaveEdit | "Your changes aren’t saved yet." |
| keepEditing | "Keep editing" |
| leave | "Leave it" |
| searchIcons | "Find an icon" |
| chooseIcon | "Choose an icon" |
| suggested | "Suggested from the name" |
| unit | "Unit" |
| step | "Each tap adds" |
| amount | "Amount" |
| times | "How many times" |
| every | "Every" |
| days | "Which days" |
| follow | "Or follow a habit" |
| followHelp | "On Today, it comes just after {habit}." |
| tinyCount | "Tiny amount" |
| seasonHelp | "Until {date}, then it goes to the balcony shelf with a ribbon." |
| whyPlaceholder | "A line, just for you" |
| applyFrom | "From when?" |
| applyOptions.today | "From today" |
| applyOptions.next-period | "From next {period}" |
| applyOptions.tomorrow | "From tomorrow" |
| archive | "Archive" |
| delete | "Delete" |
| keepsCompany | "Keeps {habit} company" |
| locked | "In {series}" |
| planted | "{Plant} is a cutting in a glass of water now." |
| saved | "Saved." |

### The Shelf (`SHELF_COPY`)

| Key | Line |
|---|---|
| title | "Shelf" |
| sceneLabel | "The Shelf: the sill and the places you have opened" |
| placesNav | "Go to a place on the Shelf" |
| decorate | "Decorate" |
| done | "Done" |
| basket | "Basket" |
| fieldGuide | "Field Guide" |
| pets | "Pets" |
| out | "Out on the Shelf" |
| indoors | "Indoors" |
| places | "Places" |
| decor.title | "Decorate" |
| decor.hint | "Drag a thing to move it. Tap one to flip it or put it away." |
| decor.keys | "Arrow keys move it, F flips it, Delete removes it." |
| decor.add | "Add to {place}" |
| decor.flip | "Flip" |
| decor.putAway | "Put away" |
| decor.full | "{Place} has room for 24 things." |
| decor.keepsake | "Keepsake" |
| decor.placed | "{thing}, on {place}." |
| decor.removed | "{thing}, put away." |
| decor.allOut | "Everything you have is out. More comes from the capsules." |
| basketSheet.title | "Basket and pantry" |
| basketSheet.basket | "The basket" |
| basketSheet.pantry | "The pantry" |
| basketSheet.servings.one | "1 serving" |
| basketSheet.servings.other | "{count} servings" |
| basketSheet.none | "More in the morning" |
| basketSheet.restock | "Each treat restocks 2 servings every morning, up to 5." |
| fieldGuideSheet.title | "Field Guide" |
| fieldGuideSheet.pages | "Pages" |
| fieldGuideSheet.notYet | "not yet" |
| fieldGuideSheet.secret | "Secret" |
| fieldGuideSheet.of | "{owned} of {total}" |
| fieldGuideSheet.visits | "Visits {from} to {to}" |
| fieldGuideSheet.pageFull | "This page is full." |
| fieldGuideSheet.moonlit | "Moonlit" |
| placeMap.here | "{count} here" |
| placeMap.short | "{Place} is {price} coins. There are {count} in the jar." |
| placeMap.shortOne | "{Place} is {price} coins. There’s 1 in the jar." |
| placeMap.shortNone | "{Place} is {price} coins. Watering fills the jar." |
| placeMap.go | "Go to {place}" |
| placeMap.visit | "Go there" |
| placeMap.confirm | "Open {place}?" |
| placeMap.jar | "There are {count} coins in the jar." |
| placeMap.jarOne | "There’s 1 coin in the jar." |
| placeMap.jarNone | "Watering fills the jar." |
| foundLabel | "{A}, from {name}" |
| capsules | "Go to Capsules" |

### The Pet Card (`PET_CARD_UI`)

| Key | Line |
|---|---|
| friendshipAria | "Friendship: {level}" |
| out | "Out on the Shelf" |
| outHint | "Indoors, {name} rests and waits for a place on the Shelf." |
| noRoom | "The Shelf has room for {count} pets out. Bring someone indoors first." |
| keep | "Keep it" |
| cancel | "Not now" |
| nameHint | "Or one of these" |
| slots.head | "Head" |
| slots.face | "Face" |
| slots.neck | "Neck" |
| slots.body | "Outfit" |
| wearing | "Wearing" |
| nothingToWear | "Things to wear come from the capsules." |
| noTreats | "Treats you collect restock here every morning." |
| servingsOne | "1 serving" |
| servings | "{count} servings" |
| servingsNone | "More in the morning" |
| favourite | "Favourite" |
| markFavourite | "Favourite" |
| keepsakes | "Left by the pot" |
| allTreats | "All treats ({count})". Under the Feed row's first 6 when there are more: it opens the rest in the card, fed and baked the same way (WP-C7; it replaces the "Basket and pantry" link, which fed nothing). DEC-V: pending owner approval |
| noPlants | "{name} would like a plant to keep company. Plants grow from habits, starting as a cutting in a glass of water." Above "Add a habit" (`EMPTY.addHabit`), when the card is opened to find a plant and there is no live habit (WP-C7). DEC-V: pending owner approval |
| indoors | "Indoors" |
| keptBy | "{name} keeps it company" |
| moveOutAsk | "Move {name} out of {plant}?" |

### Progress (`PROGRESS_UI`)

| Key | Line |
|---|---|
| title | "Progress" |
| sections.months | "Recent months" |
| sections.plants | "Plants" |
| sections.balcony | "Balcony shelf" |
| sections.calendar | "Calendar" |
| sections.year | "The year" |
| sections.records | "Records" |
| sections.insights | "Insights" |
| sections.pins | "Pins" |
| sections.memory | "Memory shelf" |
| hero.ringCaption | "of this month’s waterings" |
| soFarMark | "so far" |
| calendar.prev | "Previous month" |
| calendar.next | "Next month" |
| calendar.filter | "Show habit" |
| calendar.all | "All habits" |
| calendar.water | "Water it for {date}" |
| calendar.unwater | "Not watered after all" |
| calendar.windowNote | "The last 6 days are watered from the week strip on Today." |
| calendar.openToday | "Open Today" |
| calendar.refused | "That day is watered from the week strip on Today." |
| calendar.watered | "watered" |
| calendar.tiny | "the tiny version" |
| calendar.rest | "resting" |
| calendar.off | "a day off" |
| calendar.paused | "resting" |
| calendar.note | "a note" |
| calendar.part | "{count} of {target}" |
| calendar.partUnit | "{count} of {target} {unit}" |
| year.prev | "Previous year" |
| year.next | "Next year" |
| plants.open | "{habit}, {stage}" |
| plants.retired | "{habit}, on the balcony shelf" |
| pins.notYet | "not yet" |
| pins.earned | "Earned {date}" |
| pins.progress | "{have} of {need}" |
| pins.stamps.one | "+1 stamp" |
| pins.stamps.other | "+{count} stamps" |
| pins.pinLabel | "{name}, not yet" |
| pins.more.one | "1 more pin" |
| pins.more.other | "{count} more pins" |
| memory.new | "New" |
| memory.balcony.one | "1 plant on the balcony shelf" |
| memory.balcony.other | "{count} plants on the balcony shelf" |

### Habit Detail (`DETAIL_UI`)

| Key | Line |
|---|---|
| forecastEvergreen | "Evergreen" |
| sections.tag | "The plant tag" |
| sections.journal | "Garden Journal" |
| sections.stats | "How it’s going" |
| sections.why | "Why it matters" |
| sections.moments | "Moments" |
| sections.history | "History" |
| sections.ladder | "In a row" |
| sections.company | "Keeping company" |
| sections.actions | "Look after it" |
| ladder.reached | "Rungs reached: {count} of {total}" |
| stats.lately | "Lately" |
| stats.now | "Now" |
| stats.longest | "Longest run" |
| stats.longestLine | "Longest run: {run}" |
| stats.waterings | "Waterings" |
| stats.newRhythm | "New rhythm" |
| stats.since | "Since {date}" |
| stats.tiny | "Tiny versions: {count}" |
| star | "Star this note" |
| starred | "Starred for the Sunday Note" |
| quoteHelp | "Only notes you’ve starred are quoted in the Sunday Note." |
| grow.title | "A bigger pot?" |
| grow.text | "{habit} has been steady for 4 weeks. Make it a little bigger? +1 stamp" |
| grow.textQuiet | "{habit} has been steady for 4 weeks. Make it a little bigger?" |
| grow.yes | "Grow it" |
| grow.no | "Keep it as it is" |
| tinier.title | "Make it tinier?" |
| tinier.text | "A smaller version still counts, and still waters the plant." |
| tinier.yes | "Make it tinier" |
| tinier.no | "Keep it as it is" |
| tinier.done | "{habit} is tinier now." |
| story.new | "New" |
| story.remaining.one | "About 1 more watering together." |
| story.remaining.other | "About {count} more waterings together." |
| story.waits | "After the one before it." |
| actions.edit | "Edit" |
| actions.pause | "Pause {habit}" |
| actions.pauseShort | "Pause" |
| actions.backOn | "Back on…" |
| actions.backOnLabel | "Back on" |
| actions.pauseOpen | "Until you bring it back" |
| actions.bringBack | "Bring it back" |
| actions.startFrom | "Start tracking from…" |
| actions.startFromLabel | "Start tracking from" |
| actions.archive | "Archive" |
| actions.restore | "Bring it back to the sill" |
| actions.delete | "Delete" |
| actions.tune | "Tune my habits" |
| actions.cancel | "Not now" |
| actions.confirmArchive | "Archive" |
| pausedUntil | "Resting until {date}" |
| pausedOpen | "Resting until you bring it back" |
| pauseFrom | "Resting from {date}" |
| archivedOn | "On the balcony shelf since {date}" |
| ribbon | "Finished {date}, with a ribbon" |
| looks.label | "Which look" |
| looks.stake | "Classic" |
| close | "Close" |

### You (`YOU_UI`)

| Key | Line |
|---|---|
| title | "You" |
| sinceLine | "On this sill since {date}" |
| sections.profile | "Profile" |
| sections.habits | "Habits" |
| sections.days | "Your days" |
| sections.look | "Look and sound" |
| sections.today | "Today and capsules" |
| sections.access | "Accessibility" |
| sections.data | "Your data" |
| sections.install | "On your Home Screen" |
| sections.about | "About" |

### You › Habits (`HABITS_COPY`)

| Key | Line |
|---|---|
| arrange | "Arrange" |
| done | "Done" |
| archived | "Archived" |
| bringBack | "Bring it back" |
| bringBackLabel | "Bring it back: {habit}" |
| editWord | "Edit" |
| move | "Move {habit}" |
| moveUp | "Move {habit} up" |
| moveDown | "Move {habit} down" |
| moveHint | "Drag, or use the arrow keys." |
| moved | "{habit}, {pos} of {count}." |
| resting | "Resting" |

### You › Look and sound, Today and capsules (`PREFS_COPY`)

| Key | Line |
|---|---|
| weekdays.0 | "Sunday" |
| weekdays.1 | "Monday" |
| shortcuts.label | "Keyboard shortcuts" |
| shortcuts.helper | "1–5 switch tabs, N plants a habit." |
| birthdayMonth | "Month" |
| birthdayDay | "Day" |
| notSet | "Not set" |
| off | "Off" |

### You › Your data (`DATA_COPY`)

| Key | Line |
|---|---|
| snapshotsRow | "Daily copies" |
| snapshotsKept | "Kept on this device: 7 daily and 4 weekly." |
| snapshotKinds.daily | "Daily copy" |
| snapshotKinds.weekly | "Weekly copy" |
| snapshotKinds.pre-import | "Before an import" |
| snapshotLine | "{habits} habits · {waterings} waterings" |
| restoredSnapshot | "Back to the copy from {date}." |
| chooseFile | "Choose a file" |
| pasteLabel | "Or paste a backup here" |
| pasteHelper | "A backup starts with CK1, or it is a catkin backup file." |
| reading | "Reading the backup…" (DEC-V: pending owner approval) |
| noUndoTitle | "Import without an undo?" |
| noUndo | "catkin couldn’t keep a copy of what’s here, so there is no Undo import this time." |
| importAnyway | "Import anyway" |
| cannotOpen | "This browser can’t open that backup. Try the backup file instead." |
| readOnly | "This window can’t change the save right now." |
| inDemo | "Leave the demo to import a backup. The demo keeps its own plants." |
| startOverAgainTitle | "Start over now?" |
| startOverAgain | "Everything here goes. The daily copies stay on this device." |
| demoLine | "A made-up sill with a few months of watering. Your own sill stays just as it is." |
| demoPill | "The demo" |
| copyTitle | "Your backup" |
| copyHelper | "Select it all, copy it, and keep it somewhere safe." |
| csvSaved | "Waterings saved." |
| storageAcquiring | "Getting ready to save" (DEC-V: pending owner approval) |
| snapshotsError | "The daily copies can’t be read on this device right now." (DEC-V: pending owner approval) |
| damagedFile | "catkin-damaged-save-{date}.txt" (DEC-V: pending owner approval) |
| damagedSaved | "The damaged file is saved." (DEC-V: pending owner approval) |
| fileBuild | "Saved in this browser, for this file" |

### You › About (`ABOUT_COPY`)

| Key | Line |
|---|---|
| principlesTitle | "What catkin keeps to" |
| principles[0] | "Growth only adds. A resting plant keeps every leaf." |
| principles[1] | "With Quiet rewards on, catkin is just the tracker." |
| principles[2] | "The odds are printed on every cabinet." |
| how[0].title | "Your habits are plants" |
| how[0].text | "Each habit starts as a cutting in a glass of water. Watering it counts the day, and the plant grows as you keep the habit: roots, a pot, leaves, buds, flowers." |
| how[1].title | "Showing up, over time" |
| how[1].text | "Progress reads as days you showed up, like 26 of the last 30. Rest days and paused habits count as rest." |
| how[2].title | "Coins and capsules" |
| how[2].text | "Watering drops brass coins in the jar. The capsule cabinets take coins, and each capsule holds a small animal, something to wear, a treat or a bit of decor." |
| how[3].title | "Pets and plants" |
| how[3].text | "Pets keep habits company. Each pet moves into a plant and is there on the sill at every watering. The friendship grows with the habit." |
| how[4].title | "Kept on this device" |
| how[4].text | "Your plants live in this browser or on your Home Screen. There is no account. Save a backup now and then." |
| how[5].title | "Sound and haptics" |
| how[5].text | "Both are extras. Everything works with both off." |
| credits[0].title | "Drawn in code" |
| credits[0].text | "Every plant, pot, pet and cabinet is drawn by hand as code, lit by one window." |
| credits[1].title | "Type" |
| credits[1].text | "Castoro by Tiffany Wardle and Nunito by Vernon Adams, both under the SIL Open Font License." |
| credits[2].title | "Made with" |
| credits[2].text | "Preact, Vite and Workbox." |
| build.pwa | "Home Screen app" |
| build.tab | "In the browser" |
| build.single | "Single file" |
| build.dev | "Development" |
| updatesSingle | "This copy updates when you download a new catkin.html." |
| updatesOther | "Updates arrive with the hosted app." |
| checking | "Checking" |
| diagnosticsIn | "Diagnostics in {n} taps" |

### You › Diagnostics (`DIAG_COPY`)

| Key | Line |
|---|---|
| title | "Diagnostics" |
| back | "You" |
| lead | "What this device says about catkin. Copy the report to share it." |
| device | "This device" |
| copied | "Report copied." |
| measure | "Measure frame timing" |
| checkClock | "Check the clock" |

### Onboarding (`ONBOARDING_COPY`)

| Key | Line |
|---|---|
| next | "Next" |
| plantOne | "Plant it" |
| plantMany | "Plant these" |
| makeOwnLabel | "Your own habit" |
| add | "Add" |
| lessIdeas | "Fewer ideas" |
| pickFull | "That’s 3. More can go on the sill anytime." |
| remove | "Take {habit} off the sill" |
| toToday | "On to Today" |
| choose | "Who comes home first? Choose a cabinet" |
| notice | "Name" |
| nameIdeas | "Name ideas" |
| anotherName | "Another name" |
| plantsLead | "Tap a plant, and {name} moves in." |
| stepOf | "Step {n} of {count}" |
| useHere | "Choose Use here above to carry on in this window." Under the shell's "catkin is open in another window · Use here" note, at the top of an onboarding step, when this window couldn't plant the picks (they stay picked) or move to the next step (WP-C5). A newer catkin's save says the Data line instead: "This window can’t change the save right now." DEC-V: pending owner approval |


### Modal notes (WP-C3, 2 October 2026)

No new copy. The number pad keeps "Add a note" available as a stable button; the temporary
"Undo" and "Add a note" actions appear inside the active sheet. Existing availability announcements
wait until those actions can be reached, and keep their approved wording.

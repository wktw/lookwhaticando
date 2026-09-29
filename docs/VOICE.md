# catkin voice: the copy deck

This is the final copy for every moment in catkin, and the rules behind it. It extends
[DESIGN §12](./DESIGN.md#12-voice). Where a line is data (captions, stage lines, reveal lines, note
templates), `src/catalog/lines.ts` is the source and this deck quotes it. Slots are written in braces:
{habit} is the habit's name as she wrote it, {name} is a pet's name, {plant} is "the Read plant". A
capitalised slot like {Count} is a number spelled out, because it opens a sentence ("Nineteen").

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
- **Real behaviour, real species.** A slow blink is a cat's. A cud-chew is a cow's. A throat puff is a
  frog's. No paws on frogs or ducks, no wings on cows. Plants never get faces or feelings.
- **Growth only adds, and the copy says so.** Nothing wilts, droops or goes brown. A plant "is resting",
  never neglected.
- **Rest is part of the routine.** Show it, don't preach it: "Yoga is resting today. Nothing here wilts."
- **Coming back is noticed kindly.** The app never mentions a gap. The welcome is the same as any
  ordinary day, plus a ticket.
- **Say what's true now.** Not what's missing, not what used to be, not what could happen.
- **Calm.** No countdowns, no FOMO, no guilt, no red. A seasonal series says "until Nov 10", and that's
  all.

### Style

- **Numbers:** numerals everywhere: "26 of the last 30 days", "+5", "4 more waterings to Blooming". Spell
  a count out only where it opens a sentence in a note ("Nineteen waterings."), in an engraved pin name
  ("Fifty waterings") or at the start of a tiny label ("Four glasses"). `numberWord()` in lines.ts does
  it.
- **Punctuation:** full stops. A middle dot joins the parts of a status line: "3 of 5 · +18 coins". One
  exclamation mark exists in the whole app, on the Secret reveal. No dashes as punctuation in copy; use a
  full stop or a middle dot. Apostrophes are curly in the UI: "Today’s off."
- **Spelling** follows the catalog: colour, favourite, savoury, moisturiser. Dates are short and
  American-ordered: "Sep 22", "Mon, Sep 22". Times: "7:30 am", "6 pm".
- **Emoji:** none in UI chrome, ever. A note may carry at most one (Emoji 12.0 or earlier, never
  currency); catkin's own notes use none. The only emoji she sees are ones she typed.
- **Verbs:** a check-in is a watering. Buttons, toasts and notes say "water" and "watered". The word
  `check-in` is for help text and screen readers only where "watering" would confuse.
- **Habit names are hers.** Print them exactly as typed, in Castoro. Refer to the plant as "the Read
  plant" or "your Read plant", never with a possessive on her words.
- **Capital letters:** sentence case everywhere. Proper names keep capitals: series ("No. 02 · Cows"),
  places ("The Sill", "Saucer Pond"), stages ("Blooming"), tiers ("Rare"), the Field Guide, Special
  Order, the Window Seat, Sunday Note, Herbarium page.

## 2. Never

The lint fails the build on these in any copy. Each has a plainer thing to say (section 3).

| Never | Examples |
|---|---|
| Puns | `purrfect`, `moo-tivation`, `pawsome`, `unbe-leaf-able`, `toadally`, `holy cow` |
| Cheering | `yay`, `woohoo`, `hooray`, `yippee` |
| Bestie talk and baby talk | `bestie`, `bff`, `smol`, `floof`, `teeny`, `fur baby`, `doggo`, `kitty`, `nom`, `yummy`, `boop`, `blep`, stretched words like `sooo` |
| The C word | `cozy`, `cosy`, `coziest` |
| Exclamation marks | anywhere but the Secret reveal |
| Pep talk | `you got this`, `keep it up`, `great job`, `well done`, `proud of you`, `amazing`, `awesome`, `look at you go`, `don't give up` |
| Platitudes | `grow at your own pace`, `one day at a time`, `progress not perfection`, `every step counts`, `baby steps`, `be kind to yourself`, `you deserve`, `journey`, `your future self` |
| Counts of what is undone | `3 habits left`, `2 to go`, `remaining`, `not done yet`, `incomplete`, `you haven't`, `don't forget`, `last chance`, `hurry` |
| Any mention of a gap | `welcome back`, `it's been a while`, `long time no see`, `where have you been`, `while you were away`, `since your last visit`, `comeback`, `absence` |
| Comparisons to a better past | `fewer than last week`, `down from`, `dropped to`, `slipping`, `not as often`, `you used to` |
| The five words | `missed`, `failed`, `lost`, `broken`, `behind` (as in `falling behind`; "behind the pot" is fine), and `catch up` |
| A streak of nothing | `0 days`, `zero`, and the word `streak` itself |
| Pet pronouns and pet speech | `he`, `she`, `they`, `its` for a pet; `I`, `me`, `my` in a pet's mouth; `Pudding says…` |
| Emoji and decoration | any emoji in chrome; sparkle, star, heart and flower dingbats used as decoration |
| Old names | `stars` or `stardust` as currency, `badge`, `Mochi`, `meadow` as the world, `Wishing Well`, `letter` for a note |

## 3. Substitutions

| Instead of | Say |
|---|---|
| `streak` | "in a row" ("12 days in a row"), or the rolling phrase "26 of the last 30 days" |
| `missed a day`, `broke your streak` | nothing. Say nothing. The card shows the rolling phrase. |
| `welcome back` | "Everything kept." |
| `you haven't watered Walk` | nothing. The pot is simply not damp yet. |
| `check in`, `complete`, `done` | "water", "watered" |
| `done` for an avoid habit | "kept it up" ("Kept it up 12 days") |
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
| `rewards` | the thing: "+5", "a ticket", "1 stamp" |
| `Congratulations`, `Success` | what's true now: "Backup saved." |
| `Oops`, `Uh oh`, `Error` | what happened and what to do |
| `Are you sure?` | the consequence: "Delete Walk? The plant and its history go too." |
| `cozy` | name the thing: "the lamp’s on", "warm", "the quilt" |
| `reminder` | "watering time" |

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
  - "Stamps come from the Showing-up ladder, Sunday Notes, Herbarium pages, pins and swaps, and buy No. 07 · Night and Special Orders."
  - "Swaps come from capsules you already had. Every 10 make a stamp."
  - "Tickets come from the Showing-up ladder and welcome-home days. Each one is a free capsule from any series."

## 5. Today

### Greetings

Top left of the band, on the card chip, above the long date. From `GREETINGS` in lines.ts. With no name
set, the name and its comma drop out ("Good morning.").

| When (clock hour) | Greeting |
|---|---|
| 4 to 6 | "Early start, {userName}." or "Morning, {userName}. The light’s only just in." |
| 6 to 12 | "Good morning, {userName}." |
| 12 to 17 | "Good afternoon, {userName}." |
| 17 to 22 | "Good evening, {userName}." |
| 22 to 4 | "Hello, {userName}. The lamp’s on." or "Evening, {userName}." |
| Her birthday | "Happy birthday, {userName}." |

The long date: "Tuesday, September 29". The vine chip on the sill ledge: "3 of 5 · +18 coins".
Collapsed band: "Sep 29", the mini ring, the wallet. Tapping the window: "Open the Shelf".

### The card status line

One line under the habit name, first match wins (DESIGN §9.1.1). It never shows a streak under 3, never a
0, never red, and never what's left.

| Case | Line |
|---|---|
| Count in progress | "5/8 glasses" |
| Tiny version logged | "Tiny version ✓" |
| Flexible, in progress | "2 of 3 this week · 1 more by Sun" |
| Flexible, met | "Done for the week ✓" (monthly: "Done for the month ✓") |
| 3 or more in a row, daily | "12 days" |
| 3 or more in a row, certain days | "12 in a row" |
| 3 or more in a row, weekly or monthly | "4 weeks in a row", "3 months in a row" |
| Avoid habit, 3 or more | "Kept it up 12 days" |
| 10 or more expected | "26 of the last 30 days", "11 of your last 13 Mon/Wed/Fri", "3 of the last 4 weeks", "5 of the last 6 months" |
| New plant | "Rooting · 2 more to pot up" |
| Brand new | "Just planted" |
| Resting today | "Resting today" (with the moon) |

Below 10 expected occurrences there are no percentages: "4 of 4 so far". The anchor sits above it in
Castoro italic: "After I pour my coffee", or for a stacked habit, "After Walk".

Collapsed rows: "Morning 3/3" · "Done for the week" · "This month" · "Not today" ·
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
| Undo, or uncheck | "{habit}, unchecked. The {coins} coins went back in the jar." / "Walk, unchecked. The coin went back in the jar." |
| Uncheck after the coins were spent | "{habit}, unchecked. The coins were already spent, and stay spent." |
| Uncheck with nothing to refund | "{habit}, unchecked." |
| Note saved | "Noted." |

Asides, awake (all species): "{name} looked up." · "{name} watched the water go in." · "{name} moved a
little closer." · "{name} did a small hop." · "{name} stretched." · "{name} watched from the next pot." ·
"{name} didn’t move, but noticed."

Asides, awake, per species: cats "{name} gave a slow blink." and "{name} flicked an ear." · cows "{name}
kept chewing the cud." and "{name} did a nose-lick." · frogs "{name}’s throat puffed out." · rabbits
"{name}’s nose twitched." · hamsters "{name} stuffed one cheek." · dogs "{name} wagged." · ducks "{name}
stretched a wing." · bears "{name} sat up."

Asides, asleep (night, or mid-nap): "{name} opened one eye." · "{name} slept through it." · "{name}
shifted, still asleep." · "{name} sighed and slept on." · cats "{name} twitched an ear, asleep." · cows
"{name} kept chewing, eyes shut." · dogs "{name}’s tail thumped once." · ducks "{name} stayed tucked under
one wing." · hamsters "{name} is up anyway. Hamsters keep late hours."

The add-a-note field: placeholder "A line about today", button "Save note". Moments list it as "Mon, Sep
22 · Walk" with her words below.

For screen readers, after 1.2 seconds of quiet: "Walk, watered. Plus 5 coins." Several at once: "3
habits watered. Plus 14 coins."

### Rest, off days, pauses

| Moment | Copy |
|---|---|
| Rest day set | "{habit} is resting today. Nothing here wilts." |
| Rest day cleared | "{habit} is back on for today." |
| Rest days ahead | "Resting Sat and Sun" |
| Rest allowance, in the editor | "2 rest days a week count as watered. More still show a moon; in the numbers, only 2 count." |
| Take today off (button) | "Take today off" |
| Confirm | "Take today off? Every habit rests, and it counts as a rest everywhere." |
| Off day set | "Today’s off. Every plant is resting, and nothing wilts." |
| Off day cleared | "Today’s back on." |
| Off-day allowance | "Days off this month: 2 of 4" |
| Pause | "Pause {habit}" → "Back on…" → "{habit} is resting until {date}." |
| Pause with no end | "{habit} is resting until you resume it." |
| Resume | "{habit} is back on the sill." |
| Today's collapsed row | "Resting: 2 habits · back Oct 6" |

### A past day, backfill and history

- The banner: "Logging for Sat, Sep 27 · Back to today". Buttons end "for Saturday": "Walk for
  Saturday".
- Logging before a habit started: "Start tracking Walk from Mon, Sep 22?" · "Start from Sep 22" · "Not
  now".
- Calendar edits older than the 6-day window: "Fixes history, no rewards."
- The clock guard: "The clock on this device reads earlier than catkin last saw. Coins and stamps wait
  until it’s right again."

### Perfect day

Every habit that's on is watered or resting (DESIGN §6). Up to 12 petals, in the plants' own colours.

- Day: "Everything’s watered. The whole sill is in the sun."
- Lamplight (from 8 pm): "Everything’s watered. The whole sill is in the lamplight."
- The chip: "+12". As an "also" line under a bigger moment: "Perfect day".

### Period goals

- Week: "{habit}, done for the week. +10" → "Yoga, done for the week. +10"
- Month: "{habit}, done for the month. +20" → "Look over the budget, done for the month. +20"

### Rungs, in a row

Per habit, coins only, at 3, 7, 14, 21, 30, 45, 60, 90, 120, 180 and 365.

| Unit | Toast |
|---|---|
| Days | "Walk: 7 days in a row. +20" |
| Times (certain days) | "Yoga: 12 in a row. +35" |
| Weeks | "Yoga: 4 weeks in a row. +30" |
| Months | "Look over the budget: 3 months in a row. +80" |
| Avoid habits | "No snooze: kept it up 14 days. +30" |
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
- On Progress: "You showed up 26 of the last 30 days".

### Welcome home

The first watering after 3 or more quiet days: 20 coins and a ticket. The copy is the same as any ordinary
day, plus the ticket. It never says how long.

- "Everything kept. There’s a ticket on the sill."
- With a pet: "Everything kept. Pudding is on the warm pot, and there’s a ticket on the sill."
- The chip: "+20 coins · a ticket". The pet line comes from the `welcomeHome` captions.

## 6. Plants

### Plant stages

From `STAGE_LINES` in lines.ts. Cutting · Rooting · Potted · Leafy · Budding · Blooming · Flourishing ·
Evergreen.

| Stage | Line |
|---|---|
| Cutting | "Your {habit} plant is a cutting in a glass of water. It roots with the first watering." |
| Rooting | "White roots are showing in the glass. Your {habit} plant is rooting." |
| Potted | "Your {habit} plant is potted up." |
| Leafy | "Your {habit} plant has put out new leaves." |
| Budding | "Your {habit} plant has a bud." |
| Blooming | "Your {habit} plant is in flower." (or the species line below) |
| Flourishing | "Your {habit} plant is spilling over the rim of the pot." |
| Evergreen | "Your {habit} plant is Evergreen. There’s a small brass watering can on the pot now." |

A multi-stage jump plays as a time-lapse and announces only the last stage.

**Blooming, species-true** (`BLOOM_LINES`), used on Habit Detail and in the banner:

- Golden Pothos: "Your {habit} plant is trailing past the edge of the sill."
- Chinese Money Plant: "Your {habit} plant has a crown of round leaves, and a small pup at the base."
- Polka-dot Begonia: "Your {habit} plant has pink flowers under the spotted leaves."
- Snake Plant: "Your {habit} plant has sent up a spike of small cream flowers, which snake plants hardly ever do."
- Cat Grass: "Your {habit} plant is thick and tall enough to lie in."
- Monstera: "Your {habit} plant has opened its first split leaf."
- Strawberry: "Your {habit} plant has white flowers and the first small berries."
- Lavender: "Your {habit} plant has purple spikes, and the sill smells of lavender."
- Catnip: "Your {habit} plant has small white flowers at the tips."
- Hoya: "Your {habit} plant has a cluster of star-shaped flowers."
- Moth Orchid: "Your {habit} plant has opened the first flower on the long stem."
- Prayer Plant: "Your {habit} plant has a new striped leaf, and folds up every evening."
- African Violet: "Your {habit} plant has small purple flowers above the soft leaves."
- Tulip: "Your {habit} plant has opened a single cup."
- Christmas Cactus: "Your {habit} plant is flowering pink at the tips of the stems."
- Sunflower: "Your {habit} plant has opened one flower, turned towards the window."

**Forecast** on Habit Detail, in waterings and never sunshine numbers: "4 more waterings to Blooming,
around Oct 14." · "1 more watering to Blooming." · at Evergreen, "Evergreen. Small visitors arrive from
here on."

**Flourishes** after Evergreen (`FLOURISH_LINES`): "A ladybird has moved into your {habit} plant." · "A
bee visits your {habit} plant now." · "A small snail lives on your {habit} plant’s pot." · "A butterfly
stops at your {habit} plant most afternoons." · "Your {habit} plant has started to trail." · "Moss has
grown round the foot of your {habit} plant." · "Your {habit} plant has a second shoot." · "Your {habit}
plant has a ribbon tied round the pot."

**Graduation**, offered and never automatic:

- "Ready to grow?" · "Walk has been steady for 4 weeks. Make it a little bigger? +1 stamp" · "Grow it" ·
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

## 7. Pins

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
| "Welcome home" | "Comes with your first welcome-home ticket." |
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
| "Before seven" | "Water a habit before 7:00 am." |
| "Under the lamp" | "Water habits 3 times between 7 and 10 pm." |
| "A full Field Guide page" | "Collect everything on one page of the Field Guide." |
| "First harvest" | "Pick a treat from an edible plant that’s Blooming." |
| "A steady month" | "Water at least 80% of what’s on in a calendar month." |

The unlock banner: eyebrow "A new pin", title the pin's name, text its description, rewards "+2 stamps".
As an "also" line: "Fifty waterings, a new pin". The shelf's heading: "Pins".

## 8. Pets

### Captions

The caption matrix is `CAPTIONS` in lines.ts: 10 personalities × 15 contexts (tap, checkin, morning,
afternoon, evening, night, rainy, restDay, perfectDay, welcomeHome, fed, fedFavourite, newWear, resident,
newArrival), at least 4 lines each, plus shared and species-true lines. `pickLine(context, personality,
species, seed, recent)` never repeats one of the last 5 in a context. A taste:

- Sleepy, afternoon: "{name} moved along with the sunbeam without waking up."
- Curious, evening: "{name} is looking at the reflection in the dark window."
- Sassy, fed: "{name} left exactly half of the {treat}, as a statement."
- Foodie, checkin: "{name} came over, saw it was only water, and left."
- Dramatic, rainy: "{name} is taking the rain very hard."
- Dreamy, resident: "{name} likes the shade {plant} makes."
- Cows, rest day: "{name} is lying down and chewing the cud, which is resting, for a cow."
- Hamsters, night: "{name} is awake, actually, and filling both cheeks."

**Personalities** (label and blurb): "Sleepy" "Can sleep anywhere, and does." · "Playful" "Plays with
anything that moves, and a few things that don’t." · "Curious" "Has to see what that is." · "Shy" "Takes a
while. Worth the wait." · "Sassy" "Has opinions about everything, starting with where you sit." · "Gentle"
"Calm company. Makes room for the small ones." · "Foodie" "Knows where the treats are kept, and when." ·
"Dramatic" "Every small thing is an occasion." · "Sunny" "Happiest in the brightest spot." · "Dreamy"
"Somewhere else, pleasantly."

### Friendship levels

Plain names, and a line that says what the pet does now (`FRIENDSHIP_LEVELS`). Nothing ever decays.

| Level | Name | Line |
|---|---|---|
| 1 | "New here" | "{name} is new here." |
| 2 | "Looks up" | "{name} looks up when you water now." |
| 3 | "Knows you" | cats "{name} slow-blinks back at you now." · cows "{name} does a nose-lick when you say hello now." · everyone else "{name} blinks back at you now." |
| 4 | "Has a favourite spot" | "{name} has claimed a favourite spot on the sill." |
| 5 | "Follows the sun" | "{name} follows the sunbeam along the sill now." |
| 6 | "Brings you things" | "{name} leaves small things on the sill now, on days you water. A button, a leaf, a bead." |
| 7 | "Naps near you" | "{name} naps against the edge of the screen now, as close to you as possible." |
| 8 | "Has a best friend" | "{name} naps next to {friend} now, most afternoons." |
| 9 | "Always nearby" | "{name} is usually within reach now." |
| 10 | "Best friends" | "{name} and you are best friends. There’s a small brass tag to show it." |

Bond levels, after best friends. Each adds a dated Memory:

| Level | Name | Line |
|---|---|---|
| 11 | "Old friends" | "{name} and you: old friends. A new Memory on the Pet Card." |
| 12 | "Part of the furniture" | "{name} is part of the furniture now. A new Memory on the Pet Card." |
| 13 | "Family" | "{name} is family. A new Memory on the Pet Card." |
| 14 | "One of the household" | "{name} is one of the household. A new Memory on the Pet Card." |
| 15 | "Kin" | "{name} and you are kin. A new Memory on the Pet Card." |

The best-friends banner: eyebrow "Best friends", title "{name} and you", text "There’s a small brass tag
to show it." Memories read like dates in a diary: "Came home Sep 29" · "The day Read bloomed" · "Best
friends, Nov 2".

### The Pet Card and gestures

- Fields: "Likes" · "Known for" · "Favourite spot" · "Came home" · "Friendship" · "Personality" ·
  "Favourite treat" · "Wardrobe" · "Keeps {habit} company" · "Memories".
- Buttons for every gesture: "Say hello" (tap) · "Stroke" · "Touch nose" (for ducks, "Touch beak"; for
  frogs, "Touch head") · "Pick up" and "Put down" · "Feed" · "Rename" · "Find {name} a plant".
- The name tag that floats up after a tap: "{name}’s card".
- A sleeping pet, tapped: the `night` captions, never grumpiness.

### Treats and the pantry

- Fed: the `fed` captions ("{name} had the {treat}.").
- Favourite treat found: "{name}’s favourite is the {treat}. It’s on the Pet Card now." Then the
  `fedFavourite` captions.
- The hint until it's found (`TREAT_TAG_HINTS`): "Watches the fruit bowl closely" · "Perks up at anything
  sweet" · "Prefers something savoury" · "Always interested in your cup" · "Comes over at the sound of a
  crunch" · "Likes things fresh from the garden".
- Full for today (the fourth treat): "{name} is full, and very content." No XP message, ever.
- Pantry restock, each morning: "The pantry restocked: 2 servings of each treat."
- Bake a tray: button "Bake a tray · 10 coins", then "A tray of {treat}: 5 servings, in the pantry."
- A treat run out for today: "The {treat} is all gone for today. 2 more servings in the morning."
- Something new to wear: the `newWear` captions. Buttons "Put it on" · "Take it off".

## 9. Capsules

### The cabinets

- Carousel card: "No. 01 · Cats" · "25 coins" · a seasonal one "Autumn Edition · until Nov 10" · "7 of 19
  in the Field Guide".
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
| Classic (matte paper) | "{series}. {A}." → "No. 02 · Cows. A Belted Galloway." |
| Special (two-colour print) | "{series}. {A}, one of the Specials." |
| Rare (foil edge) | "{series}. A Rare: {a}." → "No. 01 · Cats. A Rare: a Siamese." |
| Super rare (holographic) | "{series}. A Super rare: {a}." |
| Secret (holographic, with a ?) | "{series}, the secret one! {A}, {secretLine}" |

The Secret carries the only exclamation mark in catkin, and one sparkle. Each series Secret has its own
line (`SECRET_LINES`):

- "No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft."
- "No. 01 · Cats, the secret one! A Maine Coon, with tufted ears and a tail as long as the rest put together."
- "No. 03 · Dogs, the secret one! A Samoyed, white all over, and already shedding a little on the sill."
- "No. 04 · Pond, the secret one! A Mandarin Duck, orange sails up, in colours that look painted on by hand."
- "No. 05 · Garden, the secret one! An Angora, mostly fluff, with a nose in there somewhere, twitching."
- "No. 06 · Pantry, the secret one! A Spectacled Bear Cub, with cream rings round the eyes and a very studious stare."
- "No. 07 · Night, the secret one! A Night-sky Cow, with the whole night sky for patches, and one star right on the nose."
- "Autumn Edition, the secret one! A Pumpkin Spice Cow, cream with pumpkin-spice patches, and already lying in the leaves."
- "Winter Edition, the secret one! An Eider Duckling, the size of an egg cup, and softer than anything else on the sill."
- "Valentine Edition, the secret one! A Lilac Birman, with lilac points, white mittens, and blue eyes on you already."
- "Spring Edition, the secret one! A Crested Duck, with a pom-pom of feathers that wobbles a moment after every nod."
- "Summer Edition, the secret one! A Golden Frog, waving one front foot, the way golden frogs do."

New or not:

- New: the word "New" on the insert.
- A duplicate: "Another {item}. Onto the swap shelf · +{swaps} swaps" → "Another Holstein. Onto the swap
  shelf · +2 swaps"
- A duplicate pet: "Another Orange Tabby. Onto the swap shelf · +2 swaps · Pudding +20 friendship"
- Swaps into a stamp: "The swap shelf is full: 10 swaps, traded for 1 stamp."
- The screen reader hears one sentence: "No. 02 · Cows. A Belted Galloway. Special, two-colour print.
  New."

A new pet, on the insert:

- Name field label "Name", with a suggestion filled in and "Another name" to reroll.
- "Came home: today" (tap to change the date).
- "Find {name} a plant" · "Let {name} choose" · "Not now".
- Then: "{name} moved into the {habit} plant." Or, from "Let {name} choose": "{name} chose the {habit}
  plant, for the sun."

### The odds sheet

Title "Odds". Rows "Classic 60%" · "Special 25%" · "Rare 10%" · "Super rare 5%" (Night: 40, 30, 20, 10),
then each item's own odds. The explanations:

- "Every capsule is one of these tiers, at these odds."
- "Things you don’t have yet are 3 times as likely."
- "A Rare turns up within 10 capsules, and a Super rare within 40."
- "Once every Rare in a series is yours, that count goes away."
- "After 4 you already had, in a row, the next one is new."
- "Ones you already had go on the swap shelf: 2, 4, 8 or 15 swaps, by tier. Every 10 swaps make a stamp."
- "Each series has one Secret, shown as a ? until it turns up."

### The lineup

Title "The lineup". Each item: its number and name, a tick when it's yours, "not yet" when it isn't, and a
single "?" for the Secret.

### Special Order

At the counter, for stamps: "Anything not yet in the Field Guide, for stamps."

- Prices: "Classic 2 · Special 4 · Rare 8 · Super rare 15 · Moonlit 8"
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

Calm, plain, and each with the way forward. No emoji, no "Almost".

| Error | Notice |
|---|---|
| Not enough coins | "No. 01 · Cats is 25 coins a capsule. There are 18 in the jar." · link "Water something on Today" |
| Not enough stamps | "No. 07 · Night is 3 stamps. There’s 1 on the card." · link "Where stamps come from" |
| No ticket | "Tickets come from the Showing-up ladder and welcome-home days." |
| Series not here now | "The Winter Edition is here from Nov 11 to Jan 14." (and, if it has visited, "Anything it has brought before can be ordered at the counter.") |
| A capsule already in the tray | "There’s a capsule in the tray. Open that one first." |
| Special Order, not enough stamps | "A Rare is 8 stamps at the counter. There are 5 on the card." |
| Special Order, already yours | "Already in the Field Guide." |
| Special Order, not sold | "This one isn’t sold at the counter. It comes from showing up." |
| Special Order, season not yet visited | "The Winter Edition hasn’t visited yet. Its things can be ordered once it has." |

## 10. Places

The places map: "The Sill" "free" · "Saucer Pond" "400 coins" · "Cat-grass Tray" "700 coins" ·
"Bookshelf" "1,000 coins" · "Balcony Box" "1,500 coins" · "The Quilt" "2,500 coins". Button "Open for
400 coins". Each one adds "Room for 2 more pets".

Opened, with the pet who loves it most, or without:

- "The Saucer Pond is open. {name} went straight to the lily pad." / "The Saucer Pond is open: a saucer of
  water, a pebble island and one lily pad."
- "The Cat-grass Tray is open. {name} is out in the grass already." / "The Cat-grass Tray is open. A
  pasture, at this size."
- "The Bookshelf is open. {name} is on the top shelf, under the lamp." / "The Bookshelf is open: two
  shelves of paperbacks and a reading lamp."
- "The Balcony Box is open. There’s weather out there now, and room to roam."
- "The Quilt is open. There will be a nap pile by evening."

## 11. Rituals

### Sunday Note

A small card clipped to the sill, arriving as "There’s a note on the sill." Built by `SUNDAY_NOTE` in
lines.ts, in this order:

1. Opener: "Week of {weekOf}."
2. Waterings, spelled out: "One watering." / "{Count} waterings."
3. Up to two highlights, most specific first:
   - "The {habit} plant {stageEvent} on {weekday}."
   - "The {habit} plant {stageEvent} on {weekday}, and {name} has napped in it every afternoon since."
   - "{habit} was watered every day."
   - "{habit} was watered on {count} days."
   - "{name} came home on {weekday}." / "{name} came home on {weekday} and moved into the {habit} plant."
   - "{habit} was planted on {weekday}, as a cutting."
   - "The tiny version of {habit} was enough on {count} days."
   - "{habit} and {anchor} were kept together on {count} days."
   - {stageEvent} is one of "was planted as a cutting", "put down roots", "was potted up", "put out new
     leaves", "showed a first bud", "opened a first flower", "spilled over the rim", "turned Evergreen".
4. Her own words, if she wrote any: "On {weekday} you wrote: ‘{quote}’."
5. The P.S.: with a companion, "P.S. {name} {routine} {times}." ({routine} from `SUNDAY_ROUTINES`, {times}
   like "four evenings"). Without one: "P.S. {name} spent the afternoons in the sunbeam." · "P.S. {name}
   left a {found} on the sill on {weekday}." · "P.S. {name} and {friend} napped in a pile on {weekday}."
6. The stamps: "One stamp, enclosed." / "{Count} stamps, enclosed."

Never a percentage. A week with no watering sends no note, and nothing mentions it.

Examples:

- "Week of Sep 22. Nineteen waterings. The Read plant showed a first bud on Thursday, and Juniper has napped in it every afternoon since. P.S. Juniper slept on the book four evenings. Three stamps, enclosed."
- "Week of Oct 6. Four waterings. Yoga was planted on Monday, as a cutting. On Tuesday you wrote: ‘slow start, good walk’. P.S. Pudding spent the afternoons in the sunbeam. One stamp, enclosed."
- "Week of Oct 13. Twenty-six waterings. Humbug came home on Saturday and moved into the Walk plant. Drink water was watered every day. P.S. Humbug waited by the door five mornings. Two stamps, enclosed."

### Herbarium page

On the 1st, the month's stems are pressed (`HERBARIUM`). It arrives as "There’s a page on the sill."

- Title: "{Month}, pressed." → "September, pressed."
- Each pressing: "{habit} · {count}" → "Walk · 24". With rests: "Yoga · 7 · 2 rests".
- The footnote: "Rest days are pressed as the small flowers."
- One margin note, if true: "{habit} flowered this month." · "{name} came home on {date}." · "{habit}
  was planted this month." The very first page: "The first page."
- The stamps: "Two stamps, enclosed."

No percentage, and a quiet month's page is as full a page as any.

### The Memory shelf

Section title "Memory shelf". Items: "Sunday Note · Week of Sep 22" · "September, pressed" · "Walk ·
retired Aug 30" · "Summer, on the sill".

### Season Review and the fresh-start chips

On the first open of a new season, a Today card: never modal, skippable, 15 seconds at most.

- Title: "{Season}, on the sill." → "Summer, on the sill."
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

## 12. Keeping Company

### The offer, and its decline

Offered after naming at a reveal, in the Habit Editor and on the Pet Card, at most once a day, and never
again after 3 declines.

- At a reveal: "Find {name} a plant" · "Let {name} choose" · "Not now"
- Habit Editor: "Who keeps it company?" · the pets as chips · "No one, for now"
- Pet Card: "Keeps {habit} company" or "Find {name} a plant"
- Moved in: "{name} moved into the {habit} plant."
- A decline says nothing back. It just closes.
- Moving out: "Move {name} out" → "{name} moved back to the sill."

### The three stories

Unlocked by companion sunshine only. They arrive as "There’s a story on the {habit} plant’s tag."

**The start** (about a week):

- "The start. {name} moved into the {habit} plant on {date}. It was a cutting in a glass of water then.
  {Count} waterings later, {name} has a favourite side of the pot."

**Why it matters** (about 3 weeks; asks once and keeps her answer as the habit's why):

- The ask: "{name} has kept {habit} company for 3 weeks. Why does {habit} matter to you?"
- Field placeholder: "A line, just for you". Buttons: "Keep it" · "Not now".
- Kept: "Why it matters: ‘{why}’." It shows on Habit Detail and is editable in the Habit Editor.

**Look at us** (at Blooming; quotes her Moments and makes a Memory):

- "Look at us. The {habit} plant is in flower, and {name} is asleep under it. On {momentDate} you wrote:
  ‘{moment}’."
- Without a Moment: "Look at us. The {habit} plant is in flower, and {name} is asleep under it. {Count}
  waterings, from a cutting."
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

### Known for

The companion relates to the habit's objects the way real animals do (`KNOWN_FOR`, 14 archetypes from the
habit's icon). The routine shows from Potted on days the habit was done; the settled line is permanent from
Blooming. A day without it looks exactly like an ordinary day.

| Archetype | Starting | Settled |
|---|---|---|
| read | "Has started sleeping on your book in the evenings." | "Sleeps on the open book whenever you read." |
| learn | "Has started lying on the warm laptop." | "Lies on the warm laptop whenever you study." |
| walk | "Has started waiting by the door when it’s nearly time to go out." | "Knows when you’re about to head out." |
| mat | "Has started lying on the mat." | "Joins in on the mat, mostly by lying on it." |
| water | "Has started drinking from the bowl whenever you have a drink." (frogs: "Has started sitting in the water dish whenever you have a drink.") | "Drinks from the bowl every time you do." |
| sleep | "Has started getting into bed before you." | "Is in bed before you every night." |
| mind | "Has started sitting with you, very still, when you take a quiet minute." | "Breathes slowly with you, or seems to." |
| create | "Has started sitting on whatever you’re making." | "Sleeps in the craft basket while you work." |
| tidy | "Has started sitting in the laundry basket." | "Inspects each tidy surface, then sits on it." |
| cook | "Has started watching from the kitchen counter when you cook." | "Waits by the chopping board, hopeful." |
| care | "Has started sitting on the bathroom mat while you get ready." | "Watches the whole routine from the edge of the sink." |
| plan | "Has started sitting on the papers." | "Sits on the papers you need, every time." |
| connect | "Has started sitting close by whenever you call someone." | "Lies across your lap whenever someone’s over." |
| garden | "Has started following the watering can round the room." | "Follows the watering can from plant to plant." |

## 13. Blooms Like You

When a plant first blooms, its look comes from how she keeps the habit. The plant tag explains it in plain
words, and it pays nothing.

- Colours: "Dawn" ("you usually water it before 9") · "Sunlit" ("you usually water it in the middle of
  the day") · "Twilight" ("you usually water it after 6 pm") · "Wildflower" ("you water it at all sorts
  of times").
- Shapes: "Classic" · "Petite" ("the tiny version counted on 9 days") · "Paired" ("18 days you did it
  right after Walk").
- The tag: "Dawn · Paired: you usually water it before 9, and 18 days you did it right after Walk."
- Choosing: "Show this look" · "Classic". Helper: "Classic is always here, if you prefer it."
- Re-read at Evergreen, adding a look: "A new look for the {habit} plant: Twilight."

**The move-it-to-Evening nudge:** "You set Walk for mornings but usually water it after 6 pm. Move it to
Evening?" · "Move to Evening" · "Leave it in Morning". Offered once; a "Leave it" is remembered.

**Habit stacking:** the anchor line "After Walk" and "Kept together 18 days".

## 14. Garden Journal

On Habit Detail: up to five plain sentences that ink in from week 2 (`GARDEN_JOURNAL`). Until then each
shows a pencil line saying when it fills in, counted in waterings, never a deadline.

| Sentence | Inked | Pencil |
|---|---|---|
| Usual time | "You usually water it around 7:30 am." | "Your usual time fills in after 6 more waterings." |
| Steadiest day | "Thursdays are when it’s watered most." | "The steadiest day fills in after the second week." |
| Tiny days | "The tiny version was enough on 5 days." | "Tiny days fill in the first time you use the tiny version." |
| Kept together | "Watered right after Walk on 18 days." | "Kept-together days fill in once it follows another habit." |
| Why it looks this way | "It blooms Dawn because you usually water it before 9." | "Why it looks the way it does fills in at Blooming." |

## 15. Onboarding

Ninety seconds or less to the first capsule, and every step skippable ("Skip").

1. An empty sill in morning light. "New place. Which plants came with you?" An optional field: label "Your
   name", helper "For the greeting. Optional."
2. "Pick up to 3." Chips: "Drink water" · "Walk" · "Read" · "Stretch" · "Journal" · "Tidy for 10
   minutes" · "Take vitamins" · "Skincare", then "More ideas" and "Make my own". Under them: "Start small.
   You can add more anytime." Each chosen habit appears on the sill as a cutting in a water glass.
3. "Anything already done today?" Live water buttons. The first watering plays in full: "Walk, watered.
   +5". The jar tops up: "There are 25 coins in the jar. That’s one capsule."
4. "Cats or Cows?" Two cabinets. "Put a coin in" · "Turn the handle" · "Twist to open, or tap". The first
   capsule is always a pet.
5. "Name" (a suggestion filled in, "Another name") · "Came home: today" · "Find {name} a plant".
6. The other way out: "Not yet, I’ll earn it" → Today, with a pinned card: "Your first capsule: water
   anything."

Before step 1, on iPhone and Mac Safari tabs, the install gate (section 18).

## 16. Empty states

| Screen | Copy |
|---|---|
| Today, no habits | "An empty sill. Add a habit, and it starts as a cutting in a glass of water." · "Add a habit" |
| Today, nothing on today | "Nothing’s on today. The plants are fine." |
| Today, everything resting | "Everything is resting today. Nothing here wilts." |
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

## 17. Errors and recovery

Say what happened and what to do. Never `failed`, never `Oops`, never a code in the main line.

| When | Copy |
|---|---|
| A screen doesn't load | "This screen didn’t load. Your plants and coins are saved." · "Reload" |
| A save doesn't go through | "That change didn’t save. catkin will try again; a backup keeps everything safe meanwhile." |
| Open in another window | "catkin is open in another window · Use here" |
| A save from a newer catkin | "This save is from a newer catkin, so it opens read-only here. Update to make changes." |
| The device clock went back | "The clock on this device reads earlier than catkin last saw. Coins and stamps wait until it’s right again." |
| Safari tab storage | "In a Safari tab, a save can be cleared after 7 days. Keep catkin on your Home Screen to keep it safe." |
| Copy didn't work | "Couldn’t copy. Select the text and copy it by hand." |
| Share sheet unavailable | "Saved to Downloads instead." |
| Import, not a backup | "That file isn’t a catkin backup." |
| Import, from a newer catkin | "This backup is from a newer catkin. Update, then import it." |
| The file:// build | "Test copy · saved only in this browser, for this file" |
| Diagnostics | "Copy report" |

## 18. Install guide

- The gate on iPhone and Mac Safari tabs: "Keep catkin on your Home Screen" · "Just peek" (opens the demo).
- iPhone and iPad, Safari: "Tap Share." · "Tap Add to Home Screen." · "Open catkin from there."
- Mac, Safari: "Choose File › Add to Dock." · "Open catkin from the Dock."
- Chrome and Edge: "Click Install in the address bar." · "Open catkin from your apps."
- Android: "Tap the menu, then Install app."
- Windows, the single file: "Double-click catkin.html. It works offline, in this browser."
- Moving plants into the installed app: "Move my plants into the app" → "Copied. Open catkin from your Home
  Screen and tap Paste my plants." · "Paste my plants"
- Updates: "A new version is ready · Reload" · "Up to date." · "Check for updates" · "Reload app".

## 19. Reminders

Web push would need a server, so reminders are calendar events she adds herself (DESIGN §11.1).

- Settings: "Watering time" with rows "Morning" · "Midday" · "Evening", a time each, and "Add to
  calendar". Helper: "catkin can’t send notifications, so it makes a calendar event that repeats every
  day. Your calendar does the reminding."
- The `.ics` event: SUMMARY "Watering time", DESCRIPTION "Morning plants: Walk, Stretch, Take vitamins.",
  alarm text "Watering time".
- Never `Don't forget`, never a count, never a name of a pet.

## 20. Data

Under You › Data.

| Action | Copy |
|---|---|
| Save a backup | "Save a backup" → "Backup saved." (file "catkin-backup-2026-09-29.json") |
| Copy backup | "Copy backup" → "Copied. Paste it somewhere safe, like a note to yourself." |
| Import | "Import a backup" |
| Import preview | "This backup has 5 habits, 312 waterings and 7 pets. Saved Sep 20." · "Import" · "Keep what’s here" |
| Imported | "Imported. You can undo this for 24 hours." |
| Undo import | "Undo import" → "Back to how things were before the import." |
| Snapshots | "Daily copies, kept on this device: 7 daily and 4 weekly." · "Restore this copy" |
| CSV | "Export waterings as CSV" |
| Storage | "Saved on this device" / "Saved in this browser tab" |
| Last backup | "Last backup: Sep 20" / "No backup yet" |
| The nudge | "Worth saving a backup: the last one is from Aug 2." |
| Start over | "Start over" → "Start over? Every habit, plant and pet on this device goes. Save a backup first, just in case." · "Start over" · "Keep everything" |
| The demo | "Try the demo" · "Leave the demo" |

Habits: "Archive {habit}? The plant moves to the balcony shelf, and you can bring it back anytime." ·
"Delete {habit}? The plant and its history go too." · "Keep the plant on the balcony shelf?" · "Keep it on
the balcony" · "Delete everything" · "Walk is back on the sill. The time it spent archived counts as a
pause."

## 21. Settings

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
| Hemisphere | "Where’s your summer?" | "June to August" · "December to February" |
| Reminders | "Watering time" | see section 19 |

The Habit Editor: "Name" · "Icon" · "Colour" · "Plant" · "Pot" · "How often" ("Every day" · "On certain
days" · "A few times a week" · "A few times a month") · "How much" · "Tiny version" (placeholder "Shoes
on, step outside") · "About how long?" ("Under 5 minutes" · "5 to 30 minutes" · "Longer") · "When"
("Morning" · "Midday" · "Evening" · "Anytime") · "After…" (placeholder "After I pour my coffee") · "Build
or avoid" ("Do it" · "Avoid it") · "Why it matters" · "Who keeps it company?" · "Just this season" ·
"Plant it" (new) / "Save" (edit). With 3 long habits already: "3 long habits is the most at once. Pick a
shorter time, or pause one of the others."

About: "Look after the little things." · "Your habits grow the plants. The plants become a home." · "How it
works" · "Credits" · "Version {version}".

## 22. Screen readers

- Check buttons are named with the habit ("Walk") and use pressed state, never `not done`.
- Count buttons: "Add 1 glass to Drink water", described by "5 of 8 glasses".
- Day progress: "3 of 5 watered".
- The capsule flow: "Put a coin in" → "Turn the handle" → "Open capsule, Rare finish", and the reveal as
  one sentence (section 9).
- Pets: "Pudding, orange tabby, asleep" for the art; the caption is the live text.

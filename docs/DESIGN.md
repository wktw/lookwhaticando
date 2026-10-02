# Little by Little: Design Bible (v2)

> **Look after the little things.**
> *Your habits grow the plants. The plants become a home.*

This is the single source of truth for every product, creative and technical decision in Little by Little. It builds on the
client's concept ([`ORIGINAL_CONCEPT.md`](./ORIGINAL_CONCEPT.md)). It also replaces the first design direction, "Mochi
Meadow" (archived in [`archive/DESIGN-v1-mochi.md`](./archive/DESIGN-v1-mochi.md)), which the client turned down as
"done many times". Every rule here has come through at least one adversarial audit ([`AUDITS.md`](./AUDITS.md)). When
code and this document disagree, fix one of them the same day.

---

## 0. The pitch

Little by Little is a habit tracker for iPhone and Mac. **Every habit is a real houseplant** on your windowsill. It starts as a
cutting in a glass of water, roots, gets potted up, and grows as you keep the habit. Watering it *is* the check-in.
Check-ins earn brass coins for the **capsule machines** on the side table. They're full of cats, cows and small
friends the size of a capsule toy, who **move into the plants your habits grow**. There is a cow living in your water
habit and a cat asleep in your reading plant. Nothing wilts. Missing a day costs nothing, and coming back is noticed
kindly. Progress is shown as **showing up over time** ("26 of the last 30 days"), never as a streak that falls to zero.

The habit tracker comes first. Hide every game element and it is still an excellent tracker. The game exists so that
opening the tracker is something to look forward to.

## 1. Brand

| | |
|---|---|
| **Name** | **Little by Little**, with those capitals. Chosen on 2 October 2026 under the owner’s delegated naming decision. It describes the app’s central idea: habits, plants and friendships grow through small repeated actions. |
| **Wordmark** | **Castoro**, set on two lines: “Little”, then “by Little”. The full name stays legible in the phone header and desktop sidebar. The mark remains a willow sprig: a twig with three soft silver-grey catkins. There are no cat ears on the letters and no faces on the mark. |
| **Tagline** | "Look after the little things." |
| **Explainer** | "Your habits grow the plants. The plants become a home." |
| **App icon** | A small black cat loafing on the rim of a terracotta pot with two leaves, and a small Holstein calf sitting on the sill at the pot's right, in a slanting diagonal window beam. Both are PetArt's own drawings (pet-cat-black loafing, pet-cow-holstein sitting) and cast hard shadows on a soft lavender wall. The launch screen shows the same cat and calf, without the room, above the wordmark (`src/art/icons/appIcon.tsx`, `splash.tsx`). It must stay legible at 29 px on light and dark wallpapers: the cat fills ≥ 35% of the icon width, and the calf reads as a calf (horn buds, muzzle, black-and-white patches) at 29 px. |
| **Many animals** | Little by Little is not a cat app. Eight species live here: cats, cows, dogs, rabbits, frogs, ducklings, bear cubs and hamsters. Cats are about a quarter of the pets (21 of 88). Every surface shows the mix. The app icon pairs the black cat with a small Holstein calf. The Shelf tab shows the silhouette of *your* closest pet. The first pick offers four cabinets (Cats · Cows · Dogs · Pond). Every demo, example and screenshot uses a mixed cast. Candidate new species for later updates: a lamb and a hedgehog. |
| **No mascot** | Every app in the genre is fronted by a chatty mascot. Little by Little deliberately has none. **The animals never speak.** Personality shows through what real animals do (the slow blink, the loaf, the cud-chew, the throat-puff) and through short third-person captions. |
| **Narrator** | An unnamed voice that writes like a friend's plant-sitting note: brief, kind, specific, observed. "Walk, watered. +5 · Pudding opened one eye." (§12) |
| **Compatibility identifiers** | Storage keys `catkin:*`, IndexedDB database `catkin`, writer lock `catkin:writer`, backup format `catkin-backup`, and clipboard handoff prefixes `CK1:` / `CK0:` retain their original values. The PWA manifest identity and launch URL also stay unchanged. A display-name change must not create a fresh household or split ownership between app versions. |

## 2. Platform

Little by Little is an **installable Progressive Web App**. This follows directly from the requirements:

| Requirement | Native SwiftUI | **PWA (chosen)** |
|---|---|---|
| iPhone | ✅ | ✅ Add to Home Screen: full-screen, offline, own icon |
| Mac | ✅ | ✅ Safari *File › Add to Dock*, or Chrome/Edge *Install* |
| **Test on a Windows PC** | ❌ needs macOS + Xcode | ✅ any browser, or double-click one HTML file |
| Friends install their own copy | ❌ sideloading / paid account | ✅ send a link |
| Private, offline, local-first | ✅ | ✅ service worker + on-device storage |

Delivery: the **hosted PWA** (GitHub Pages, deployed by CI) · a **single-file build** (`catkin.html`, everything
inlined, runs by double-click) · **local dev** (`npm run dev`). A Capacitor wrap stays possible later with no rewrite.

## 3. Principles

1. **Growth only adds.** Plants, friendship, the collection and lifetime check-ins only ever go up. **Nothing wilts,
   droops or goes brown**, and the copy says so.
2. **Rest is part of the routine.** Rest days, off days and pauses are first-class and never count against you.
3. **Coming back is noticed kindly.** The app never mentions a gap.
4. **The tracker stands alone.** With *Quiet rewards* on, it's a complete, beautiful habit tracker.
5. **The collection lives inside the progress.** Animals live in the plants your habits grow and sit on your real habit
   cards. The game layer and the tracking layer are one surface, not two tabs.
6. **Transparent, generous randomness.** Odds are displayed. Pity exists. New items are favoured. Every duplicate still
   counts toward something. Any item can eventually be *chosen*.
7. **Delight scales with meaning.** A check-in gets a ≤ 700 ms flourish that never blocks the next tap. The big
   moments are reserved for pulls, blooms and milestones.
8. **Calm by default.** No red, no guilt, no countdowns, no FOMO. Seasonal series return every year, and once a season has
   visited, its items can be ordered any time.
9. **Real things, slightly shrunk.** Every object is something she already has (a sill, a mug, a jar of cuttings, a
   capsule machine). There are no fairy doors, toadstool houses or pixie dust. The scale is the setting, never the joke.
10. **Sound and haptics are garnish.** Every moment must land with both off.

## 4. Information architecture

Five destinations: a bottom tab bar on phones, and a left sidebar at ≥ 900 px (Mac/PC).

| Tab | Icon | Purpose |
|---|---|---|
| **Today** | a sill with a pot | Check in, the day's progress, the windowsill band, the wallet |
| **Progress** | a pressed leaf | Consistency, trends, calendar, the year, plants, records, pins, the memory shelf |
| **Capsules** | a small capsule cabinet | The series, pulls, reveals, Special Order, lineups |
| **Shelf** | your closest pet on a pot (§1) | The home: plants, places, pets, decor, the Field Guide |
| **You** | a willow sprig | Habits, preferences, reminders, data, install guide, about |

Overlays (sheets, never routed): Habit Editor · Habit Detail · Pet Card · Capsule Reveal (full-screen) · Special
Order · Lineup · Odds · Wallet ("What can I get?") · Sunday Note · Herbarium page · Season Review. Tab state is mirrored
to `location.hash` (`#/today`, `#/progress`, `#/capsules`, `#/shelf`, `#/you`).

## 5. The habit system

### 5.1 Model (as built in `src/state/types.ts`)

A habit has a name, a custom **icon** (`catalog/habitIcons.ts`, 48 drawn icons, suggested automatically from the name), a
colour family, a **plant species** and a **pot**, and a list of **versioned rules**. Each rule has a `from` date, a
schedule, a target, a step and an optional tiny version. Every day and period is judged by the rule in effect *then*,
so edits never rewrite history. Other fields: `effort` (light/steady/big), `timeOfDay`
(morning/midday/evening/anytime), optional `anchor` ("After I pour my coffee"), `polarity` (build/avoid, which changes
copy only), optional `dueDay` (monthly, display only), `why` (≤ 140 chars, §14.1), `anchorHabitId` (habit stacking,
§14.2), `endsOn` ("just this season", §14.3), `companionId` (§14.1), `createdAt` (immutable), `startedOn`,
`archivedOn`, `pauses[]` and `order`.

**Schedules**: `daily` · `days` (UI: "On certain days") · `weekly {times, every 1–4}` (every 2 = biweekly) · `monthly
{times, every 1|2|3|6|12}` (every 3 = quarterly). Periods with `every > 1` start at the start of the rule's `from`
period. `expectedPerWeek` = 7, |days|, times/every, or times×12/52/every.

**Edits "this period"**: when a flexible edit keeps the period geometry (same unit and `every`; only `times` changes),
the new rule takes over the whole current period. When the geometry changes (weekly ↔ monthly, another `every`,
flexible → day-based), the new rule starts today and the old period is *cut*: it is judged as it stood that day, with
its full goal, and the days it lost count as still open. Those lost days are read as they stood at the cut: the ones
already paused or taken off when the edit was made stay inactive (their count is kept on the new rule, `cutInactive`),
and the rest stay active whatever later happens to the habit. So the edit keeps the goal the period had, and Finish,
Archive, Restore, a pause, a resume or a day off never move a cut period into or out of a shortfall (WP-B5). A day-based edit made after today's check-in was rewarded applies from tomorrow (the detail
view shows the pending rule). No edit, and no later lifecycle action, can turn a past day or a closed period into a
new shortfall.

**DayLog** is either `{kind:'log', count, level?:'tiny', at?:number[], note?}` or `{kind:'rest'}`, never both. `at`
records the times of **live** check-ins only (≤ 24). Backfill and history edits never write it.

### 5.2 Tapping, targets & the tiny version

* Target 1–100 000, step ≥ 1. With target 1, a tap toggles. With target > 1, each tap adds `step` until done, and after
  that tapping opens an inline stepper. A long-press opens a number pad (+1, +step, +2×step, Done, Tiny). Over-target
  values are allowed ("10 / 8") but earn no extra coins. Unit presets: glasses 1, pages 5, minutes 5, steps 1000, km 1.
* A partial tap gets a ring tick and a haptic, with no coin chip and no celebration. Every completing check-in shows a
  4-second **Undo** toast, which offers "Add a note".
* **Tiny version** (optional per rule, e.g. "Shoes on, step outside"): logged by long-press or from the ⋯ menu. It
  counts as **done** for streaks and consistency, and earns ⌈pay/2⌉ and 50% sunshine. The split is shown openly ("26 of 30
  days · 8 tiny"). Tiny is a *level* on the day: logging it never changes the count (so Undo restores the day exactly),
  and it is refused on rules without a tiny version. **Graduation** is *offered*, never automatic: at ≥ 85% over 28
  days with ≤ 25% tiny, "A bigger pot?" (+1 stamp on accept, only for a genuinely bigger rule; the offer then stays
  closed for 28 days, even if the pending rule is withdrawn). Below 40%, "Make it tinier?".

### 5.3 Day boundary, rest, pause, backfill

* **Day boundary**: `settings.dayStartsAt` (0–360 min, default 180 = 3:00 am). `today` is monotonic. If the device clock
  is more than 36 h behind the latest seen, rewards pause and a calm banner appears.
* **Rest** (day-based habits only) can be set for today, up to 14 days ahead, or within the 6-day window. The weekly
  allowance is `max(1, floor(scheduledDaysPerWeek/3))` (daily = 2). Allowed rests are transparent everywhere. Rests
  over the allowance still show a moon and are never red, but they count as not-done in the math.
* **Take today off** (global, max 4 per calendar month) is transparent for every habit.
* **Pauses** may start today or later ("Back on Oct 6"). Resume sets end = yesterday. Restoring an archived habit adds a
  pause over the archived stretch. Today shows one collapsed row: "Resting: 2 habits · back Oct 6".
* **Backfill**: rewards come only from the 6-day window, for days ≥ the habit's `createdAt` day, through the
  check-in path. Logging before `startedOn` asks "Start tracking Walk from Mon, Sep 22?". That moves `startedOn` to the
  exact day, at most ten years back and never before 2000-01-01; a flexible habit keeps its period grid (`gridFrom` on
  its first rule when `every > 1`), so the periods already lived keep their place, goals and grants, and the new days
  join earlier periods of the same grid (WP-B5). The calendar edits older days as
  **history only**: those edits never touch the wallet, sunshine or once-keys. It refuses days inside the 6-day window,
  and un-ticking a flexible check-in whose period still reaches into the window (both go through the week strip).
* **Selected past day is never silent**: a sticky "Logging for Sat, Sep 27 · Back to today" banner, a shifted
  background, and button names ending "for Saturday". The selection resets on rollover, after ≥ 60 s hidden, and on leaving Today.

### 5.4 Consistency & streaks (exact)

For a flexible period *p*: `target_p = round(times × activeFrac_p)`, `achieved_p = min(times, checkinDays_p)`,
`expected_p = max(target_p, achieved_p)`. Skip the period if both are 0. For the **current** period:
`expected_p = achieved_p + max(0, target_p − achieved_p − remainingActiveDays)`, so only a shortfall that can no longer be made
up counts. `remainingActiveDays` counts *open* days: today only while it can still take a check-in, and future off days
and paused days still count as open (so a day off or a pause can never raise what is expected). Day-based: past
scheduled active days count, and today counts only if done. A period spanning two months belongs to the month of its
**last** day.

* Percentages are hidden below 10 expected occurrences ("4 of 4 so far"). Rolling windows end today if today already
  counts, otherwise yesterday, for the per-habit and the aggregate phrases alike.
* Phrases per kind: "26 of the last 30 days" · "11 of your last 13 Mon/Wed/Fri" · "3 of the last 4 weeks" · "5 of the
  last 6 months". Aggregate: **"You showed up 26 of the last 30 days"** (days with ≥ 1 check-in), plus the weighted %
  and "3 goals on track" (no line when none are). Rests: "26 of 28 days · 2 rests".
* Month-to-date is compared with the same elapsed span of last month: "Up on the same days last month" · "Level with
  the same days last month". A quieter month drops that line and shows its **best fact** instead ("62 waterings so far in
  September. Walk is the steadiest."), never the higher previous number, and never in red.
* **Streaks**: day-based streaks count consecutive done scheduled days, and allowed rests, off days, pauses and unscheduled days
  are transparent. Flexible streaks count consecutive met periods. Today pending never breaks anything. A streak of 0 is never shown;
  the card falls back to the rolling phrase.

### 5.5 Plants: stages & growth

Each habit's plant grows on **sunshine**, a ledger like coins. Each rewarded occurrence records `7 / expectedPerWeek`
(tiny = 50%). Flexible check-ins beyond `times` give none. Only un-checking the same occurrence in the refund window
removes it. Grants are kept unrounded, and every threshold (stages, blooms, Flourishes, The Cutting, companion
stories) counts a total within 1/1000 sunshine of it as reached, so nine Mon/Wed/Fri check-ins (9 × 7/3) reach
Budding's 21 on the ninth (`domain/precision.ts`).

| Stage | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Name | **Cutting** | **Rooting** | **Potted** | **Leafy** | **Budding** | **Blooming** | **Flourishing** | **Evergreen** |
| Sunshine ≥ | 0 | 1 | 4 | 10 | 21 | 42 | 90 | 180 |
| Looks like | cutting in a water glass beside its empty pot | white roots through the glass | potted up (~the 4th watering) | fuller foliage | buds / a new unfurl | first flowers / peak leaf | abundant | lush + a tiny brass watering-can charm |

* Stage = `min(stageFromSunshine, completedOccurrences)`: each check-in advances at most one stage. Completed
  occurrences count only days from the habit's creation day (history filled in before it existed earned nothing), and
  the stage is also capped at the calendar pace, `stageFromSunshine(days since creation + 6)`, so switching to a rarer
  rule for one check-in can't grow a plant faster than real time (honest play never meets this cap). **Display stage =
  max(stage, bestStage)**, so plants never shrink. Multi-stage jumps play as a quick time-lapse (150 ms per stage).
* `progress` (0–1 within a stage) adds continuous detail. After Evergreen, **Flourishes** arrive every +60 sunshine (8
  permanent visitors: a ladybird, a bee, a snail, a butterfly, a hanging trail, a moss collar, a second shoot, a ribbon).
  They are a high-water mark: an un-check inside the refund window can take sunshine back, never a visitor.
* Foliage species "bloom" as their peak form (a monstera's first split leaf, a pothos trailing past the sill). The stage
  names stay universal, and Habit Detail uses a species-true caption.
* **Toxicity-aware**: cats never nibble pothos, monstera or lilies. Only cat grass and catnip are eaten. Cats sit in, sleep
  beside and nap under plants.

**Plant roster** (★ free starters): Golden Pothos ★ · Chinese Money Plant (pilea) ★ · Polka-dot Begonia ★ · Snake
Plant ★ · Cat Grass ★ · Monstera · Hoya · Moth Orchid · African Violet · Prayer Plant (calathea) · Strawberry · Lavender
· Catnip · Tulip (a bulb in a forcing glass) · Christmas Cactus (winter series).
**Pots** (★ free): Terracotta ★ · Cream Glaze ★ · Blush Glaze ★ plus collectible pots (§8).

## 6. The economy

Four resources, each drawn as a real object, and each with one job (internal ids unchanged):

| Display name | Object | Internal | Earned by | Spent on |
|---|---|---|---|---|
| **Coins** | brass coins with a pressed leaf, kept in a glass jar | `coins` | check-ins, perfect days, period goals, rungs, welcome home | coin series (25 each) |
| **Stamps** | a shop loyalty card that fills | `stars` | the Showing-up ladder, Sunday Notes, Herbarium pages, pins, swaps, Grow | No. 07 Night (3), Special Order |
| **Swaps** | duplicates set on the swap shelf | `stardust` | duplicate pulls (2/4/8/15) | auto: **every 10 swaps → 1 stamp** |
| **Tickets** | a printed stub | `tickets` | the Showing-up ladder, welcome home | one free pull on any series |

**Earning** (as specified and tested in `src/domain/economy.ts`):
* Check-in: light 4 · steady 5 · big 7 coins (at most 3 active *big* habits; effort is chosen by "About how long?").
  Tiny = ⌈pay/2⌉.
* A **40-coin daily full-rate budget** per wall-clock action day, then 1 coin each. Flexible check-ins beyond `times` pay 1 coin
  with no bonus and no sunshine.
* The ledger stores the amount paid per (habit, date). Unchecking refunds it if the balance allows. A re-check pays
  `min(original, current)`. Balances never go negative.
* **Period goal met**: +10 (weekly kinds) / +20 (monthly), once per (habit, periodStart).
* **Perfect day**: every scheduled day-based habit is done or allowed-rest, and done ≥ max(2, ⌈⅔ scheduled⌉) (in-target
  flexible check-ins count). Pays 2 × done, clamped 4–16, once per date. A "Take today off" day is neither perfect nor
  imperfect. A rest excuses a habit only within the weekly allowance, and a rest that completed a paid perfect day keeps
  using the allowance after an un-rest. Resuming a habit whose pause excused today's paid perfect day brings it back
  tomorrow, and so does restoring one whose archive (e.g. Finish) excused it.
* **Welcome home**: the first check-in after ≥ 3 quiet calendar days gives 20 coins + 1 ticket (at most every 14 days). The copy
  never mentions the gap: "Everything kept. There's a ticket on the sill."
* **Streak rungs** (per habit, coins only): at 3/7/14/21/30/45/60/90/120/180/365 (occurrence-equivalent) they pay
  10/20/30/35/40/50/60/80/100/150/250, once per (habit, tier). The flexible occurrence-equivalent is Σ achieved per met
  period (a period scaled down by a mid-period start, a pause or a cut counts only what it asked for and got). Streak
  *length* is the calendar weeks or months the run covers, and rungs pay only on the streak since the creation day.
* **The Showing-up ladder** (account level; the source of stamps and tickets). `showUpDays` = distinct app days with ≥ 1
  rewarded check-in. Rungs 7:1 · 14:2 · 21:2+🎟 · 30:3+🎟 · 45:3 · 60:4+🎟 · 90:5+🎟 · 120:5+🎟 · 180:6+2🎟 · 250:8+2🎟 ·
  **365: 12 + 3🎟 + the Window Seat**, then 6 + 🎟 every +100 days.
* **Sunday Note**: 1 stamp for any check-in that week, +1 at ≥ 60%, +1 at ≥ 85% (bonus tiers need ≥ 5 expected). **Herbarium
  page** (monthly): 1 stamp for showing up, +1 ≥ 70%, +1 ≥ 85%, +1 when ≥ 5 pts above last month (bonus tiers need ≥ 10
  expected). Both pay **upward differences** when a backfill raises the tier, and never downward. Once written, they change
  only by the delta of a reward-path change inside the window: history edits and habit deletions never move them.
* **Evergreen reward**: the first plant to reach Evergreen grants the **Laurel Sprig** (an exclusive head wearable).

Expected pace: 5 daily habits at ~80% ≈ 25–35 coins/day, which is about **one capsule a day**, plus stamps weekly. Long-term coin
goals are the **Places** (§8.4).

**Stamp pace** (tested in `tests/unit/domain/stamp-pace.test.ts`): at that pace stamps arrive at **4–6 a week** from the
ladder, Sunday Notes, Herbarium pages and swaps, plus about 30 once from the first months' pins. That buys a chosen Classic
or a No. 07 Night capsule every few days, never as many things as the capsules bring: over the first 10 weeks, even a player
who spends every stamp on the cheapest Special Order chooses fewer than half as many things as she opens. So a chosen
Classic costs what a Night capsule does (3 stamps), and the collect-N pins ("Collect 10 different things from the capsules")
count only things that came out of a capsule, so ordering can't pay for the next order.

## 7. Capsules: series, machines, the pull

### 7.1 Series

Tabletop **capsule cabinets** named like real blind-box series. Each has a numbered lineup leaflet with checkmarks:

| Series | Price | Contents |
|---|---|---|
| **No. 01 Cats** | 25 coins | real coats, collars & knits, cat treats, cat-scale decor |
| **No. 02 Cows** | 25 coins | real breeds, bells & bandanas, dairy treats, pasture decor |
| **No. 03 Dogs** | 25 coins | real breeds, bandanas & knits, dog treats |
| **No. 04 Pond** | 25 coins | frogs and ducks, rain things, pond decor |
| **No. 05 Garden** | 25 coins | bunnies, **plant species and pots for your habits**, garden decor |
| **No. 06 Pantry** | 25 coins | hamsters, bears, treats, kitchen-scale decor |
| **No. 07 Night** | **3 stamps** | night-coat variants, pyjamas & lamps, **Moonlit** variants of pets you own. Better odds (40/30/20/10) |
| **Seasonal editions** | 25 coins | **Autumn** Sep 1–Nov 10 · **Winter** Nov 11–Jan 14 · **Valentine** Jan 15–Feb 29 · **Spring** Mar 1–May 31 · **Summer** Jun 1–Aug 31. Fixed calendar dates, returning every year. |

**Odds** (coin series): Classic 60 · Special 25 · Rare 10 · Super rare 5. Tier odds, and printed-item odds under equal
ownership, decrease with rarity (big series 8/5/5/3, seasonal 7/4/3/2, Night 5/4/5/3). Current item chances also
reflect ownership and guarantees: an owned item can be less likely than an unowned item in a rarer tier. The
odds sheet labels its ordinary, pre-weighting figures and explains this difference. **Each series has one
Secret** (a Super rare), shown on the lineup as a "?" with one sparkle. **Pity**: Rare within 10 pulls (forces the rare
tier only). Super rare within 40 (independent). A pity roll picks an **unowned** item where possible, and counters hide once their tier is fully owned.
A counter counts only pulls made while its tier still has something unowned, so it can't fire the moment a Moonlit
variant joins the tier. Night's Moonlit variants share one Rare slot weighing half a printed item.
The **lucky meter**: after 4 duplicates in a row, the next pull is guaranteed new ("●●●○ next one's new"). New-first weighting is 3×.
**Commit before animate**: the pull is decided and saved (`pendingReveal`) before anything moves, so a reload resumes the reveal.

**Display tiers**: **Classic · Special · Rare · Super rare · Secret**. Each has a static **print finish** that survives
reduced motion: Classic = matte paper · Special = two-colour print · Rare = foil-edged insert · Super rare = holographic
stripes · Secret = holo stripes + "?". The tier word is always printed.

### 7.2 The pull (the signature interaction)

1. Choose a cabinet (a scroll-snapped carousel, with the lineup leaflet beside it).
2. **Insert a brass coin** (it arcs into the slot with a soft clink).
3. **Turn the handle**: drag it around (the capsules tumble inside the cabinet window in a real physics sim, ticking every
   30°). At 300° there's a ka-chunk. Tapping the handle auto-turns, and Space/Enter turns it from the keyboard.
4. A capsule drops into the tray. **One half is clear**, so a silhouette shows through, and the shell carries its finish.
5. **Twist to open** (a circular drag), or tap. A Secret takes three taps, each one cracking the shell further.
6. The halves part, and the figure steps out onto a **folded paper insert**: the reveal card ("No. 02 · Cows · Belted Galloway ·
   5 of 9", one observed line, the finish). NEW, or "Onto the swap shelf · +4 swaps". A new pet gets a name field with
   5 species suggestions and a reroll, plus a **"came home" date**.
7. **"Find {name} a plant"**: drag the pet onto a habit's plant (the pet keeps that habit company, §14.1) or onto an open
   place, or **"Let {name} choose"**: species preferences pick the plant (`suggestHabitFor`) and, when a place it loves is
   open, where it spends its time (`suggestPlaceFor`). "Not now" keeps the pet on the sill.

*Quick open* skips the anticipation. *Reduced motion*: static cabinet, crossfades, no tumbling.

### 7.3 Special Order & the swap shelf

**Special Order** (at the counter): any unowned item for stamps, Classic 3 · Special 4 · Rare 8 · Super rare 15 · Moonlit
8 (the stamps pace, §6). An order is committed before it animates, like a pull (`pendingReveal` with `order: true`); unlike a capsule's, an order's reveal never holds the cabinets: the next pull replaces it. **Memories rule**: a seasonal edition's items become orderable only after that season has visited since the
profile was created: from the first day she has the app while the season is on (a profile created mid-season has seen
that visit). An unowned Secret appears as a "?" tile, and ordering it plays the full reveal. **Swap-in**: on a
completed series, 250 coins → 40 swaps.

## 8. Pets, places, items

### 8.1 Species & characters

Eight species: **cat, cow, dog, bunny, frog, bear, hamster, duck**. At least 70% of pets are **real coats and breeds**.
Cats: orange tabby, grey tabby, tuxedo, calico, black, tortie, Siamese, cow cat, Maine Coon, odd-eyed white. Cows:
Holstein, Jersey, Belted Galloway, Brown Swiss, Dexter, Hereford, Highland. Fantasy lives **only in colour and pattern**
(a strawberry-milk cow, Moonlit variants), and there are **no animals made of food**. Characters are drawn in *true postures*
(§10.4): a cat loaf, a curled cat, a cow folded in a cow-loaf, a waddling duck.

### 8.2 Friendship & care

* Levels 1–10 at `0,20,50,100,170,260,380,540,750,1000` XP, then bond levels 11–15 at `1300,1650,2050,2500,3000`. Nothing
  ever decays, and there are no needs.
* XP: petting/stroke/boop 1 each (5/day), treats 4 (favourite 12, first favourite per day only; 3 counted treats/day), a
  companion's habit check-ins `min(30, round(5 × 7/expectedPerWeek))` (§14.1), duplicate pull +20.
* Levels change **behaviour**, not just pins: L2 looks up when you water · L3 **slow-blinks back** (cats) / nose-licks
  (cows) · L4 claims a favourite spot (stored as the pet's `spot`: the place or pot it uses most, else its species'
  favourite place) · L5 follows the sunbeam · L6 leaves a small **found thing** on the sill on days you check in (a button,
  a leaf, a bead; 1 swap, never a chore) · L7 naps at the front of the sill, nearest you · L8 naps next to a best friend
  (the pet’s choice, rather than a measured time together) · L10 **best friends** (a tiny brass tag). Every 150 XP after L10 adds a dated **Memory** from real
  events ("Came home Sep 29", "The day Read bloomed").
* **Gestures** (Shelf): tap = look up + a tiny hop · stroke (drag ≥ 40 px) = happy squint, purr, lean-in · boop (top 30%
  face zone) = a cat blep, a cow nose-lick, a bunny ear flop · carry (300 ms long-press) = lift with dangling feet, a springy
  pendulum, a squash on drop · gaze = pupils follow the pointer within 150 px. The reactions are unlimited, and only the XP is capped. Every gesture
  has a button equivalent. The pet card opens from a **name tag** that floats up after a tap.
* **Time of day**: morning stretches · afternoons follow the **real sunbeam** · 20:00–23:00 gather under the lamp · 23:00–06:00
  sleep. Tapping a sleeping pet gets a yawn and a slow blink, never grumpiness.
* **Personalities** (10, rolled on arrival): Sleepy, Playful, Curious, Shy, Sassy, Gentle, Foodie, Dramatic, Sunny, Dreamy.
  They show as behaviour weights and third-person captions only ("Pudding would like the sun to stay exactly where it is").
* **Pantry**: each owned treat restocks **2 servings every morning** (banks up to 5). *Bake a tray* makes 5 for 10 coins.
  **Harvest**: a completing check-in on a Blooming-or-later **edible** plant (cat grass, catnip, strawberry, lavender)
  drops one serving into the basket, at most one per plant per day.
* **Sound**: sparse, real-ish animal sounds (a cat's trill, a purr under a stroke, a tiny high moo, a duck's soft wek,
  a frog's double croak). No speech blips.

### 8.3 Wearables, treats, decor

* **Wearables** (4 slots: head, face, neck, body), things real pets believably wear: tiny knits, bandanas, collars with tags,
  bells, bonnets, berets, flower crowns, knit caps. About 20% are **found objects**: a thimble hat, a bottle-cap
  beret, a sock-cuff sweater, a ribbon scarf. Owning an item lets any pet wear it.
* **Treats**: real kitchen treats at pet scale, plus harvests from her own plants.
* **Decor**: household things at capsule scale, placed freely anywhere (flip, depth-sorted with pets, ≤ 24 per place):
  a matchbox bed, a thread-spool stool, a button rug, a jam-jar lantern, a book stack, a capsule-half bed, a tea-light
  tin, a knit blanket, a teacup bath.

### 8.4 Places (where pets live; the long-term coin goal)

| Place | Price | Who loves it |
|---|---|---|
| **The Sill** | free | everyone: the habit pots in a row, the coin jar, the afternoon sunbeam (8 pets out) |
| **Saucer Pond** | 400 | frogs, ducks |
| **Cat-grass Tray** | 700 | cows (their pasture), bunnies |
| **Bookshelf** | 1,000 | cats (height, a trailing pothos, the reading lamp) |
| **Balcony Box** | 1,500 | everyone: seasons, stars, room to roam; retired plants live on its shelf |
| **The Quilt** | 2,500 | the night nap pile, stargazing |

Each place adds room for 2 more pets (8 → 18). Species prefer places but none is restricted. Every pet out on the Shelf
spends the day in a **place** (`PetState.place`; absent or not open = the Sill). The Sill holds everyone; every other place
holds as many pets as the room it adds. Opening a place moves in the pets out who love it most and have never been placed
(companions stay with their pots), up to its room, and each new day a never-placed pet settles the same way
(`settleUnplacedPets`: a duck that came home after the pond opened). Every species loves the Balcony Box ("everyone": an
empty `loves` list), after the places its own species loves, so a pet goes there only when its own place is closed or full
(`lovedPlaces`). A save whose Balcony Box opened before it counted for everyone settles its never-placed pets there once, on
its next open, and Today says so once ("{name} moved to the Balcony Box.", DEC-P10); the Pet Card moves a pet to any open place with room ("Move {name}"),
and "Let {name} choose" picks by the same preferences (`suggestPlaceFor`). Plants live on the sill (it scrolls sideways,
and overflow goes to the plant stand). **Residency**: a habit's companion lives in its plant (§14.1): while it is out, the Today band
shows it in its pot, whatever place it spends the Shelf's day in (a companion brought indoors leaves its pot to the
nearest pet on the Sill; a pet spending the day in another place never sits in a sill pot as the nearest).

### 8.5 The Field Guide (collection)

One page per species ("Cats", "Cows", "Pond Club"…) with real art for owned items. Unowned items show at 35% saturation with
a dashed outline and "not yet". Only a Secret is a "?". A pet's entry reads like an adoption profile: **Likes · Known for ·
Favourite spot · Came home**. Species pages have completion rewards (stamps + an exclusive decor for Cats, Cows and Pond Club).

## 9. Screens

### 9.1 Today

* **The windowsill band** (168 px → 64 px sticky on scroll): the nearest stretch of the sill, lit by **Windowlight**.
  It shows the real sky through the window, the sunbeam crossing the sill, today's habit pots (up to 6, scrolling sideways),
  and whoever lives in them. The greeting ("Afternoon, Sam.") and long date sit top-left on an 85% card chip. The wallet
  pill sits top-right. The vine chip on the sill ledge reads "3 of 5 · +18 coins". Collapsed: short date · mini ring · wallet.
  Tapping the window opens the Shelf.
* **Week strip** (56 px): the last 7 app days. Each day is a **flower sized by how full it was**, a **moon** for rest/off, and just the
  date for an empty day. Today has a dot. It's a `radiogroup` with roving focus.
* **Habit list**, grouped by time block, current block first, with completed earlier blocks collapsed ("Morning 3/3"). Flexible habits sit in
  their block with a pace line and fold into "Watered for the week". Monthly habits not yet met go in one "This month" row.
  "Other days" (habits with nothing on that day) and "Resting" rows are collapsed. Order is stable (never regrouped on tap). **First card top ≤ safe-top + 260 px.**
* **Habit card** (a nursery plant tag): the plant in its pot with its **resident** peeking (≤ 20 px) and the habit's icon on a
  little stake · the name in **Castoro** · the anchor or "After Walk" in **Castoro italic** · the status line (§9.1.1) · the **check
  button**, a 48 px ring that **fills like water rising in a glass** (a meniscus, 240 ms) before a hairline check draws. Count
  habits show the water level ("5/8"). A rested habit shows a soft moon, and Tiny shows a small sprout. ⋯ (44×44) → Tiny version ·
  Rest day · Add note · Details · Edit. Pots watered today have **damp soil**.
* **Check-in choreography** (≤ 700 ms, never blocks): the ring fills → a hairline check → in the band, a thin stream of water pours
  onto that pot, it takes one growth step, and its resident reacts (an ear flick, a look up) → a brass coin clinks into the
  jar (the counter rolls once per burst) → a rising water-drop chime → the toast "Walk, watered. +5 · Pudding opened one eye.
  · Undo". There is no confetti. A **perfect day** gets ≤ 12 petals in the plants' own colours and "Everything's watered. The whole
  sill is in the sun."
* **Burst rule**: rapid check-ins each play their own ring and chip, but only one coin flies at a time and the live region
  announces once after 1.2 s of quiet. **Celebration queue**: all events from one action merge into one banner, anchored in
  the band. Priority (`PRIORITY` in src/fx/celebrationPlan.ts): an exclusive > plant Blooming/Evergreen (a new look, then a
  keepsake, as its first "also" lines) > Showing-up rung > perfect day > in-a-row rung > pin > full Field Guide page > best
  friends > companion moved in > story on the tag > welcome home > period goal > small stage > favourite found > friendship
  level > found thing > first harvest > swaps to a stamp > season review > note on the sill. Silent in the planner:
  companion XP (it feeds the check-in note's aside), retired, restock, check-in, uncheck. Notes that point somewhere (the note
  on the sill, a story, a found thing, the season review) keep their own toast beside a banner.
  Nothing opens modally at launch. Notes and pages arrive **on the sill** ("There's a note on the sill") and open on tap.

#### 9.1.1 Card status line (first match wins)
resting today "Resting today" · count in progress "5/8 glasses" · tiny logged "Tiny version ✓" · flexible "2 of 3 this week"
(nothing after it: no deadline, no count of what's left) / "Watered for the week ✓" · 3 or more in a row "12 days" ("12 in
a row" for day-sets, "4 weeks in a row" for weekly, "Held off 12 days" for avoid) · ≥ 10 expected "26 of the last 30
days" · otherwise **"Rooting · 2 more to pot up"** for new plants, or "Just planted". The view model returns the kind and
the numbers (`StatusLine`); `statusLine()` in `src/catalog/format.ts` words it from VOICE.md §5.

### 9.2 Progress

Hero ("You showed up 26 of the last 30 days", the weighted % with its threshold rule, the week chip, month-to-date vs. the same span,
"3 goals on track") → **Recent months** (calm labelled bars) → **Plants** (every habit's plant on shelf tiers; tap →
Habit Detail) → **Calendar** (a month grid of day glyphs; tap a day for its notes; history edits carry "fixes history, no
rewards") → **The year** (a horizontally scrolling strip of day flowers; 53×7 at ≥ 600 px; aria-hidden with a text
summary) → **Records** · **Insights** → **Pins** (enamel pins for achievements; unearned pins are outline-only) → **Memory
shelf** (Sunday Notes, Herbarium pages, retired plants, seasons).

**Habit Detail**: a large plant with its residents · "4 more waterings to Blooming." (never sunshine numbers, never a date) ·
the **plant tag** (its bloom look in plain words, §14.2) · the **Garden Journal** sentences · stat tiles · "Why it matters"
(if set) · **Moments** (notes, newest first) · the history calendar · the rung ladder · graduation offers · actions (Edit,
Pause "Back on…", Resume, Start tracking from…, Archive, Delete → "Keep the plant on the balcony shelf?", **Tune my habits**).

### 9.3 Capsules

The wallet strip (coins · stamps · a 10-segment swap ring around the stamp · tickets) · the **cabinet carousel** (only
available series; seasonal "until Nov 10"; the lineup leaflet beside each cabinet) · price, "Series 7 / 19", pity and the
lucky meter · **Odds** sheet (tier and per-item odds, pity, new-first, swaps) · **Lineup** sheet · **Special Order**
sheet · wide screens place the cabinet and its info side by side.

### 9.4 Shelf

A horizontally scrolling home: **The Sill** first, then each opened place. It's rendered at pet eye level with
**Windowlight**: the real sunbeam by time and season, and Lamplight at night with every shadow flipping to the other side. Pets roam and
behave by species, personality and time. There are cross-pet vignettes (a cat asleep on a cow's back; a nap pile on the Quilt; ducks
in a line; a bunny sniffing a new leaf, never damaging it). Decor edit mode (drag, flip, remove) · the places map (open new
places with coins) · the **Pet Card** (Likes · Known for · Favourite spot · Came home · friendship dots · personality ·
favourite treat or its hint · wardrobe · feed from the pantry · keeps which habit company · Memories · rename) · the **Field
Guide** · the basket (harvest + pantry) · **photo mode** (stretch; renders from the scene model, never the DOM).

Decor positions are stored as fractions (`PlacedDecor.x/y`, 0..1). In a place they are fractions of the place's floor; on the
Sill, `x` is a fraction of the Sill's natural length for its pots (`sillFloor`, from the window's left edge, with no room added
for the screen or for tall decor), so the same stored spot is the same place on a phone and a desktop. Adding a habit adds a
pot's length, so a placement moves along by at most one pot.

### 9.5 You

Profile (name, birthday) · Habits (arrange, archived, restore) · Preferences (week starts, day starts at, theme, sounds
+ volume, haptics where supported, reduce motion, quick open, **Quiet rewards**, **Compact Today**, show companions,
hemisphere) · Reminders (Morning/Midday/Evening "watering time" calendar files, `wateringTimeIcs`) · Data (Save a backup → share/download,
Copy backup (CK1), Import with preview + Undo 24 h, snapshots, CSV (`exportCsv`), storage status, last backup) · Demo · Install guide
(per OS) · About (principles, "How it works", credits, version/build, Check for updates, Reload app, 7 taps →
Diagnostics).

### 9.6 Onboarding (≤ 90 s to the first pull; every step skippable)

1. An empty sill in morning light. One line: **"New place. Which plants came with you?"** An optional name field sits on
   the same screen.
2. **Pick up to 3 habits** from 8 starter chips (Drink water, Walk, Read, Stretch, Journal, Tidy for 10 minutes, Take vitamins,
   Skincare) plus "More ideas" and "Make my own", with the copy "More can go on the sill anytime." Each chosen habit appears on
   the sill as **a cutting in a water glass**. Custom habits from "Make my own" join the same step (at most 3 in all).
3. **"Anything already done today?"**: live check buttons. The first watering plays the full choreography, and a one-time
   top-up brings the jar to exactly 25 coins.
4. **"Who comes home first?"**: four cabinets, No. 01 · Cats, No. 02 · Cows, No. 03 · Dogs and No. 04 · Pond, in a 2×2 grid
   at phone width, with no price ("Your first capsule is on the house. Choose a cabinet."). Insert, turn, twist. The first
   pull is a guaranteed Classic/Special pet from that series, and it doesn't advance pity.
   It and step 3's top-up are one gift of one capsule: taken before any check-in it is free (and the top-up never
   comes); taken after the top-up, the coin she inserts is the top-up. Every save's first capsule, on any series, is a
   pet, since a new save owns none.
5. Name the pet (suggestions + reroll) · a **came-home date** · **"Find {name} a plant"** (the pet moves into one of her
   new cuttings' pots, keeping that habit company) or "Let {name} choose" → Today.
6. "Not yet, I'll earn it" → Today with a pinned card: "Your first capsule: water anything."
Day start and birthday live in Preferences/Profile. The install-first gate (§11.1) comes before step 1 on iOS/macOS
Safari tabs.

## 10. Visual system

### 10.1 Colour (tokens in `src/styles/tokens.css`; names are stable, values themed)

**Paper** (day): paper `#FAF6EF` · oat `#F1E9DD` · card `#FFFDF9` · ink (warm graphite) `#3B3236` · ink-2 `#66585D` · ink-3
`#6F6065` · hairline `#E6DCD0`. Families (100 / 300 / **500** / 700 text-safe):
blush = strawberry milk `#EFB4C1` · peach = terracotta `#DDA088` · butter `#F2D98A` · sage = matcha `#B5CC9C` · mint
`#A9D3C0` · sky = ramune `#B3D1E8` · lavender = wisteria `#C8BAE6` · lilac `#DDB6DA`.
**Lamplight** (night): indigo paper `#1E1A22` · card `#2D2733` · ink `#F4EDE6` · lamp amber `#FFC98A`. Night is lit by one warm
lamp pool, not a generic dark mode.
**Rules**: labels on any −500 face use `--on-accent` (graphite), never white · `--focus` rings · `--control-border`
rings · text over scenes sits on an 85% card chip · every text pair ≥ 4.5:1, UI pairs ≥ 3:1 (enforced by test). **Keep the
cute**: strawberry-milk pink stays visible, animals are on Today at all times, and a Secret gets one sparkle.

### 10.2 Type

**Castoro** (display, one weight, roman + italic) is the voice: greeting, habit names, stage names, series names, notes, big
numbers. The **italic** is used like the Latin name on a nursery tag (anchors, "after coffee"). **Nunito** (bundled on every
platform) is the interface. Small caps with +8% tracking for section labels. Sentence case everywhere. **No emoji in UI
chrome.** Currency and rarity use inline SVG tokens (`{coin}`, `{stamp}`, `{swap}`, `{ticket}`). Dynamic Type follows iOS text size
(`font: -apple-system-body`), and display sizes are capped.

### 10.3 Shape & components

Paper cards (radius 14, 1 px hairline, barely-there warm shadow) · sheets (radius 24) · **pill buttons** with flat fills that
sink 1 px and deepen 6% when pressed (a matte press, not a glossy candy lip) · the **water-fill check ring** · hairline rules
instead of heavy boxes · 44 px minimum targets.

### 10.4 Illustration: "printed miniature, lit by one window"

* **Flat, matte, outline-free shapes.** Edges come from value contrast, never outlines. No gradients except light (the sky, the
  sunbeam). No SVG filters or blend modes in any animated path. There is no texture, or at most one static ≤ 3% paper grain on large
  background planes only.
* **Windowlight**: one global light direction for the whole scene, from the real window (computed from local time and
  season, updated in 15-minute steps). Every standing shape has a lit side and a **hard-edged shade crescent** (lavender ink)
  on the side away from the window, plus a flat contact shadow. The sunbeam is a pale cream parallelogram with the
  window-bar shadows inside it, and pets inside it cast floor shadows. At night the lamp becomes the source from the other side and
  every shade flips. Crescents are **precomputed** per pose × 2 facings × 3 light positions (no runtime clip math).
  **The clock sets the light, the theme sets the paper**: the scenes and every drawing outside a scene (card plants, capsule
  art, the kit's small objects) read the same window moment (`windowMoment` / `artLight` in `src/art/scene/moment.ts`), so
  a Lamplight page at noon still shows the noon window, and a Paper page at night shows the lamp. A card never disagrees
  with the band above it.
  **One lamp design**: every indoor place (the Sill, the Bookshelf, the Quilt…) uses the Sill's table lamp. The one exception
  is the Balcony Box, which is outdoors: its night light is the jam-jar lantern on the plant stand (`BALCONY_PLACE.lampAt`),
  and its pool is anchored to the lantern.
* **Animals: true postures, small.** Real silhouettes and anatomy. Heads 20–40% oversized, never blobs. At most 3 fills + ink
  per animal (~25 nodes). **Eyes**: solid graphite dots. **Mouth**: none at rest; only for a yawn, a blep or chewing.
  **Blush**: only as a reaction. **Happy** = a squint + blush + posture, never an open-mouthed grin. A cow's happy is a
  nose-lick, a frog's is a throat puff. Dark coats get a pale eye ring or muzzle and a rim light on the lamp side.
  **Size floor**: curled/sleeping poses only ≥ 48 px; ≤ 32 px shows the loaf with closed eyes; 20 px uses a dedicated
  3-shape sprite. Every species must read as a flat silhouette at 32 px, and every cow ≤ 32 px shows horns and a muzzle.
* **Plants**: botanically true (monstera fenestrations, pothos variegation, begonia polka dots, calathea stripes). Leaves
  overlap in two translucent inks with a static pre-mixed third tone. Plants never get faces. Paper plant tags carry the
  habit's name.
* **Objects**: ordinary things drawn simply and exactly (terracotta with a darker rim, a water glass with roots, a chipped
  mug, book spines, a jam jar, a capsule with one clear half).

### 10.5 Motion

Unhurried: `cubic-bezier(.2,.8,.2,1)`, with no overshoot in the interface. Animals move with weight (a cow's four-beat walk with a
1-unit bob, a cat's two-stage hop, the slow blink at 400 ms close / hold / 400 ms open). Celebrations are **≤ 12 petals or leaves
in the plants' own colours, never confetti**, and a rare reveal gets one foil glint. **Reduced motion**: check-ins fill instantly;
the cabinet is static with a crossfade; the reveal is a 200 ms fade on a static glow; pets hold poses and relocate by crossfade at most
every 30 s; the sunbeam still moves (it is light, not motion); blinking and breathing ≤ 1.5% stay.

## 11. Technical architecture

Vite 7 · Preact 10 · TypeScript strict · @preact/signals · CSS Modules + tokens · vite-plugin-pwa (Workbox) · Vitest ·
Playwright. Layout: `src/app` (shell, routes) · `src/state` (types, store, selectors, persistence) · `src/domain` (pure,
tested logic) · `src/catalog` (static data) · `src/art` (code-drawn SVG) · `src/fx` (sound, haptics, petals, coin flight,
celebration queue, physics) · `src/ui` (kit) · `src/features/*` (screens).

* **State**: one serializable `AppState` signal. Actions are pure reducers in `src/domain`, called by `src/state/store.ts`,
  which commits, persists and emits **GameEvents**.
* **Persistence**: localStorage envelope `{v, appVersion, rev, savedAt, state}` under `catkin:v1`. try/catch every write.
  Compact the ledger to the 7-day window. Daily IndexedDB snapshots (7 daily + 4 weekly, validated). Single writer via Web Locks
  (other windows show "Little by Little is open in another window · Use here"). Newer-schema saves open read-only. Wallet-changing
  actions write immediately. The demo lives in `catkin:demo:v1`. Reset removes only `catkin:*` keys.
* **Dates** are local app-day keys with UTC-noon arithmetic (DST-safe). **Randomness** is injectable (crypto in
  production, seeded in tests).
* **Builds**: `npm run build` → PWA in `dist/`. `npm run build:single` → `dist-single/catkin.html`. **Gates**: typecheck ·
  unit tests (domain, catalog, contrast, art coverage) · build · Playwright e2e and the layout budget.

### 11.1 iPhone & Mac specifics

* **Install-first gate**: iOS/iPadOS Safari and macOS Safari tabs with no save get "Keep Little by Little on your Home Screen"
  (illustrated per OS version). "Just peek" opens the demo.
* **Handoff**: "Move my plants into the app" copies `CK1:` + base64url(gzip(JSON)), and the app offers "Paste my plants". The same payload
  moves between devices.
* A save in a non-standalone Safari tab gets a calm banner about the 7-day eviction. `persist()` is called only after onboarding in
  standalone mode.
* The document scrolls (tap-status-bar-to-top works). Overlays use `position:fixed; inset:0`. The tab bar gets
  `max(8px, env(safe-area-inset-bottom))`. The keyboard is tracked via `visualViewport` → `--kb`. Inputs ≥ 16 px. Theme is in its own
  key and applied pre-paint. Startup images come light and dark.
* **Haptics**: a `HapticTap` overlay (a real `<input type=checkbox switch>` the finger hits) for discrete taps on iOS 18+;
  `navigator.vibrate` elsewhere. **Audio**: `audioSession.type='ambient'` before the AudioContext is created, which is lazy and resumed in gestures.
* **Reminders**: optional Morning/Midday/Evening "watering time" static `.ics` files (floating local time, daily,
  DISPLAY alarm), opened by a real tap. Web Push would need a server, so it's out of scope.
* **Updates**: checked on resume (> 30 min). A waiting worker applies on cold launch before input, otherwise on the next hide→show, and
  never during a sheet, a reveal or onboarding. About has *Check for updates* and *Reload app*.
* **Performance**: the cabinet's capsules may render on `<canvas>` from pre-rasterized sprites. Shelf pets are absolutely
  positioned elements moved with `translate3d`. Loops pause when hidden or off-tab. **Auto-lite** kicks in at median frame > 25 ms.
  Budget: p95 ≤ 16.7 ms.
* **file:// build**: one self-contained `catkin.html`: no service worker, no launch-screen links, the apple-touch-icon
  inlined, and no `public/` folder copied. A "Test copy · saved only in this browser, for this file" ribbon (the shell pads
  by `--safe-top`, which grows by the ribbon's 28 px). First boot offers *Import a backup*.
* **Diagnostics** (`#/diagnostics`): display-mode, storage, envelope, SW, audio, share, haptics, viewport, frame timing,
  *Copy report*.

### 11.2 Accessibility contract

WCAG AA (test-enforced) · focus-visible rings · every icon button named · sheets trap and restore focus, Esc closes ·
target-1 check buttons are `<button aria-pressed>` named with the habit, with the status described · count buttons: "Add 1
glass to Drink water" described by "5 of 8 glasses" · the week strip is a radiogroup · day progress is a `progressbar` with valuetext
· the capsule flow moves focus Insert → "Turn the handle" → "Open capsule, Rare finish" and announces the reveal as a sentence ·
every drag, stroke, long-press or twist has a button/menu equivalent · rarity and day state are never shown by colour alone (§7.1,
§10.4) · Dynamic Type with `data-type="large"` reflow (no horizontal overflow at 320 px or 200% zoom) · reduced motion
per §10.5.

## 12. Voice

**On any user-facing string, VOICE.md wins.** This section keeps the principles; the copy deck (`docs/VOICE.md`) holds every
line, and where a quoted line here and the deck differ, the deck is right and this file is fixed the same day.

**The plant-sitter's note.** Brief, kind, specific, observed. Present tense, plain words, sentence case, numerals.
Warmth comes from specifics (names, plants, times), not adjectives.

* **Animals never speak.** They are described in the third person ("Pepper would like the sun to stay exactly where
  it is"). Copy never gives a pet a pronoun: every owner decides who their pet is, so lines lead with the name.
* **Never**: puns ("purrfect", "moo-tivation"), "yay", "bestie", baby talk, the word "cozy", exclamation marks (one is
  allowed on a Secret reveal), pep talk ("you got this"), platitudes ("grow at your own pace"), counts of what is undone,
  any mention of a gap, comparisons to a better past, "missed / failed / lost / broken / behind", a streak of 0.
* **Emoji**: none in UI chrome. At most one in a note, from Emoji ≤ 12.0. Never currency emoji.
* **Test**: would a friend text this about her own cat and her own plants?

| Moment | Line |
|---|---|
| Check-in | "Walk, watered. +5" (now and then: "· Pudding opened one eye.") |
| Perfect day | "Everything's watered. The whole sill is in the sun." |
| Rest day | "Yoga is resting today. Nothing here wilts." |
| Welcome home | "Everything kept. There's a ticket on the sill." |
| Reveal | "No. 02 · Cows. A Belted Galloway, black with a white belt all the way round." |
| Secret | "No. 02 · Cows, the secret one! A Highland, about the size of your thumb, who would like somewhere soft." |
| Sunday Note | "Week of Sep 22. Nineteen waterings. The Read plant showed a first bud on Thursday, and Juniper has napped in it every afternoon since. Three stamps, enclosed." |

The copy deck is `docs/VOICE.md`, and the caption matrix is `src/catalog/lines.ts` (10 personalities × contexts × ≥ 4
third-person lines, no line repeated within the last 5 in a context). A lint test fails the build on banned words.

## 13. Rituals

* **Sunday Note** (weekly): a small card pinned to the sill with a paper clip, in the narrator's voice. It has two real highlights (the top
  habit, a plant stage-up, a newcomer), a quoted note if one exists (only a note she starred), a companion's P.S. line ("Juniper slept on the book four
  evenings"), and the stamps enclosed. It never shows a percentage. Kept in the memory shelf. The P.S. names the pet that
  shared the most days with a habit that week, and counts only those days: days the habit showed up, the pet kept it company
  at the day's close (a pet paired on Sunday shares Sunday, not the six days before), and its routine had started at Potted.
  A stage-up names its companion only if that pet has kept the plant company since that day. A written note keeps the
  routine (the habit's icon) and the plant species it was written with, so an icon or plant edit never rewrites it; names
  follow renames, and "Quote my notes" stays live. A note written before these were kept is worded generically.
* **Remembered days stay where they fell.** A pet's came-home day, the moving-in day and a habit's planting day are stored
  as app days at the event (`arrivedOn`, `Profile.createdOn`, `Habit.createdOn`), so a new day start or a move to another
  time zone changes only the days that follow. An older save gets them once, worked out with the settings it has then.
  A pet's Memories carry the day of their event: the favourite found (`favoriteKnownOn`; an older save's unknown day makes
  no Memory), and "The day Read bloomed" only for a pet that kept the plant company on the day it bloomed, dated that day.
* **This month's flowers → Pressing Day**: through the month, a jar on the sill fills with a stem from each habit you showed up
  for (watered, or its Tiny version, on a day of its lifetime, as the Herbarium page counts it; a partial count earns none).
  On the 1st, the stems are pressed into a **Herbarium page**: each habit's pressing is sized by how often it was watered and
  labelled in small type ("Walk · 24"). Rest days press as a small flower. There's no percentage on the page, and a quiet month's page is
  as beautiful as any other.
* **Season Review** (§14.3). **Birthday** (optional): each pet (out or indoors) leaves a one-line card and there's a tiny cake on the sill, plus 1 ticket. **Came-home
  days** for each pet (a small bow and a line), and a yearly **moving-in anniversary** note (on the first open within a week of
  the day; it pays nothing).
* **The Cutting** (lifetime gauge): a pothos cutting in a jar on the window frame, there from day one. It grows on lifetime
  sunshine across all habits (thresholds 0/5/20/50/105/210/450/900): roots, then a pot, then a vine trailing along the window
  frame until it frames the whole window. **The Window Seat** (365 show-up days) is a cushioned seat built into the window, with the
  best light in the place.

## 14. The three cozy-game pillars (Animal Crossing × Stardew Valley × Pokémon)

Researched, designed by three independent designers and judged by a gimmick detector, a habit-centrality judge and a
target-user panel (AUDITS.md). **Every pillar is driven by real habit data and makes the tracker itself more meaningful.**

### 14.1 Keeping Company *(AC's neighbours who know you · Pokémon's buddy · Stardew's heart events)*

* **Residency = companionship.** Any pet may keep **one** habit company and each habit has at most one companion (optional).
  The companion **lives in that habit's plant**: it peeks from the pot on the card (≤ 20 px) and waters with you in the sill
  band. Habits without one are watered by whoever is nearest. Offered after naming at a reveal ("Find {name} a plant"),
  in the Habit Editor ("Who keeps it company?") and on the Pet Card, at most once per day, and never again after 3 declines
  (the counters are shared by all three; pairing by hand always works). Archiving, retiring or deleting a habit frees its
  companion. Each pairing keeps the spans the pet kept the plant company (`CompanyPair.stints`): a day belongs to the pet
  that keeps it company at the day's close, and a habit retired on a day keeps its companion's span through that day.
  A pet an older build paired again (it leaves the spans closed) keeps the plant company from the first open that sees it.
* **Friendship grows through the habit**: each completing check-in gives its companion `min(30, round(5 × 7/expectedPerWeek))`
  XP (≤ 30/day from habits), once per occurrence (tiny included, a count habit's day-end tiny too), on the reward path only.
  A flexible rule's occurrence is a place among the period's `times`, not a date: moving a check-in to another day pays
  nothing new, and an Undo and re-check of an occurrence brings neither XP nor a story.
* **Routines, not performances.** From Potted on, the companion **relates to the habit's objects the way real animals do**, and never
  performs the human activity: it sleeps on the open book (Read), lies on the yoga mat (Stretch), sits in the laundry
  basket (Tidy), drinks from its bowl when you log water, waits by the door at your walk time (Walk), lies on the warm laptop
  (Learn), sits on the papers (Budget), and so on (14 archetypes mapped from the habit icon). The pet card gains a **Known
  for** line: "Has started sleeping on your book in the evenings." The routine shows only on days the habit was done, and becomes
  permanent from Blooming. **A missed day looks exactly like an ordinary day.**
* **Three stories**, unlocked only by **companion sunshine** (sunshine grown while paired; petting can never unlock them):
  **The start** (~1 week), **Why it matters** (~3 weeks; asks once and stores `Habit.why`, which is also editable in the Habit
  Editor from day 0), **Look at us** (at Blooming; quotes her Moments and makes a Memory). In check-in-equivalents: 7 · 21 · 42
  companion sunshine (a faithful week is 7 for every rhythm), Look at us with the plant at Blooming, one story per check-in.
  Companion sunshine follows the day like sunshine: an un-check inside the refund window takes it back.
* **Keepsakes**: at Rooting, Budding, Blooming and Evergreen the companion leaves a small dated keepsake by the pot, from 12
  activity families (move, read, hydrate, rest, mind, create, tidy, cook, care, garden, connect, plan) plus a brass
  seed for Evergreen, when the plant first reaches the stage with a companion (none afterwards for stages already reached).
  The caption is prefilled from her latest Moment. Keepsakes are placeable on the Shelf and never a currency. The
  **same activity art** draws the routine props and the Sunday Note sketches.

### 14.2 Blooms Like You *(Pokémon's branching evolution · AC's hybrid flowers)* + Garden Journal + stacking

* When a plant first reaches **Blooming**, its look is computed from *how* she keeps the habit, and re-read at Evergreen. Looks are only
  ever added, and she chooses which to show (Classic is always available). **Colour** from when she usually checks in: **Dawn ·
  Sunlit · Twilight · Wildflower** (anytime). The classifier uses live check-ins only, and a day's time is the live check-in that made it
  count (`DayLog.done`: the completing tap or the tiny version, never a later over-target tap, pad entry or undo; it describes completion,
  not last activity, DEC-P11). A completion taken back by an undo or a decrease is not read: a day that then closes on its tiny count
  reads the tap that reached it, from the stamps. An older build's day reads the stamp that completed it only when every tap was live, and is left out
  otherwise. It drops catch-up bursts (≥ 3 habits within
  120 s, measured in time, across the day start) and 23:00–03:59, and needs ≥ 10 eligible days (a read waits for them rather than guess). Bands: Dawn before 9:00,
  Sunlit 9:00–17:59, Twilight from 18:00; "usually" is a band holding ≥ 60% of the eligible days of the kept stamps (120 days),
  else Wildflower. **Shape**: **Classic · Petite** (tiny on ≥ 25% of days, ≥ 5 days) **·
  Paired** (stacked on ≥ 14 kept-together days: petals take the partner's card colour, the pots sit side by side, a bee visits;
  Paired wins over Petite). A kept-together day: both done, the follower's first live check-in (`DayLog.first`, which the 24-stamp cap
  never drops) at or after its anchor's when both were live. It is a historical fact: when a day's stamps go after 120 days, a day the
  follower was checked in before its anchor keeps that verdict (`DayLog.beforeAnchor`), so compaction never changes the count. Days are
  read against the current anchor (DEC-P12h); a day compacted under another anchor is unknown against a new one and counts on showing
  up, as backfill does (WP-B4).
  **An honest alternative (WP-D6, DEC-P11):** once a plant has reached Blooming and completed ten scheduled
  occurrences, an outstanding time read offers a deliberate colour choice. The count follows the existing
  growth occurrence evaluator: flexible periods count at most their target waterings, backfill may count,
  and no empty pause, day off or out-of-lifetime day supplies a completion. The count survives timestamp
  compaction; no old clock time is reconstructed. The offer is explained on the plant tag, and a colour
  is saved only after selection and confirmation. It is not a time claim and never informs the time nudge
  or the Garden Journal’s usual time. `PlantLooks.confirmed` is optional, separate from inferred `looks`
  and their evidence, and keeps colour, genuine shape, choice date, visibility and a fixed Paired partner.
  It takes display precedence only when `confirmed.shown` is true; choosing Classic or an earned look
  clears that flag. Later natural reads keep every option and preserve the gardener’s selection.
  The snake plant’s authored cream flowers take the four colours. Plants without authored petals disclose
  that their colour choice stays on the tag; leaves retain their own colour, and Paired retains its bee.
  The Garden Journal states uncertainty without promising that the next watering or Blooming supplies a time.
  **No performance-graded looks.** It pays nothing. The **plant tag** explains it in plain words ("Dawn · Paired: you usually
  water it before 9, and 18 days you did it right after Walk"). A mismatch offers "You set Walk for mornings but usually
  water it after 6 pm. Move it to Evening?" (one tap; ≥ 60% of ≥ 10 eligible days in another Today block, by Today's own rule: the hours before the day start are
  the previous day's evening; offered once, either answer closes it).
* **Garden Journal** (Habit Detail): up to 5 plain sentences that ink in from week 2 (usual time, steadiest weekday, tiny saves,
  kept-together count, why it looks like this), with pencil placeholders that say when they'll fill in. The forecast is in check-ins, never
  a deadline.
* **Habit stacking** (`anchorHabitId`): the follower sorts right after its anchor, with "After Walk" and a kept-together count.
* **Damp soil** marks pots watered today. There is no dry state.

### 14.3 Season Review *(Stardew's seasons as chapters · AC's real calendar)*

Hemisphere-correct seasons ("Where's your summer?", inferred from the time zone and stored at onboarding; meteorological: Mar,
Jun, Sep, Dec 1 in the north, six months on in the south). The window scenery and Shelf skins follow them;
capsule series keep fixed dates. On the first open of a new season, a Today card (never modal, skippable, ≤ 15 s) shows
a time-lapse of up to 8 plants through the season just ended, with residents beside them and captions in counts only. Then
**fresh-start chips** per habit: **Keep going** (preselected) · **Tinier** · **Grow** (if eligible) · **Rest till next
season** · **Finish** (to the balcony shelf with a ribbon), plus a one-tap **Keep everything**. "Just this season" habits
(`endsOn`) retire with a ribbon and are never shown as incomplete. **Tune my habits** is available anytime. It pays nothing
beyond Grow's stamp (paid only while "A bigger pot?" stands), and seasons that passed unopened are filed silently. The card is
for the season just ended, when she opened the app in it and something was watered; a card still waiting when the next season
begins is filed. Rest runs to the day before the next season; Finish and a finished "just this season" archive the habit as of
its last day, so no later day is ever expected of it (today is kept when it already shows up as it will once closed: watered,
the tiny version, or a count at its Tiny count). Finished on the day it was created with nothing watered (or archived
before its first day), a habit has no day at all: it is kept `unstarted`, with `archivedOn = startedOn` so older builds
still read the save, and its first day is never a missed day. Restoring it brings it back from that day, with the days in
between paused (WP-B5). The flag counts only while it matches (archived on `startedOn`): an older build that restores or
backdates the habit keeps the field without knowing it, and the habit then reads by its dates; the save is not corrupt.

## 15. Milestones & adversarial audits

| # | Milestone | Audit |
|---|---|---|
| M0 | Spec | 6 lens critics → 6 skeptics (done: 51 accepted / 21 rejected) |
| M0.5 | Cozy-game pillars · creative re-direction | research → 3 designers → 3 judges; 5 concepts → 4 judges → style frames → visual jury (done) |
| M1 | Domain + art systems | adversaries write failing tests for the domain; art-direction review of every drawing from renders |
| M2 | Integrated app | multi-lens experience review (flows, visuals, a11y, performance, voice) with verification |
| M3 | Release candidate | judges' panel scoring + top-issue fixes |

# Mochi Meadow — Design Bible & Engineering Contract

> **Take care of your real life. Grow a tiny meadow of friends.**

This document is the single source of truth for every creative and technical decision in Mochi Meadow.
It builds on the concept in [`ORIGINAL_CONCEPT.md`](./ORIGINAL_CONCEPT.md), resolves every one of its open
questions (§25), and is written precisely enough that independent engineers and illustrators can build
matching pieces in parallel. When the code and this doc disagree, fix one of them. Don't leave them out of sync.

---

## 0. The one-paragraph pitch

Mochi Meadow is a soft, pastel habit tracker for iPhone and Mac. Every habit you keep is a **potted plant**
that grows with each check-in. Plants never wilt and they never shrink. Check-ins earn **coins**, and coins
turn the crank of hand-drawn **capsule machines** full of cats, cows, bunnies, frogs, bears, hamsters and
ducks, plus the hats, sweaters and treats that go with them. Your new friends move into the **Meadow**, where they
wander, nap, and get to know you. Missing a day costs you nothing. You just don't earn that day's
reward, and coming back after a break earns a *Welcome back* bonus. Progress shows **consistency over time**
("26 of the last 30 days"), not a streak counter waiting to hit zero.

## 1. Brand

| | |
|---|---|
| **Name** | **Mochi Meadow**: *mochi* for soft, round and sweet (the whole illustration style is built on the mochi-blob silhouette); *meadow* for cows, plants, flowers and a place that grows. |
| **Mascot** | **Mochi**, a round cream "cow cat" (a real-world term for cats with cow-like patches) with cocoa cow spots and a two-leaf **sprout** growing from the top of her head. One character that stands for all three loves in the brief: **cats, cows, plants**. Mochi is the starter pet and the default Today-screen buddy. |
| **Voice** | Warm, brief, a little silly, never saccharine. A cheerful friend, not a coach. Uses "we" and "you", with light emoji. **Never** uses "failed", "lost", "broken", "missed" or "0-day streak". |
| **Tagline** | "Take care of your real life. Grow a tiny meadow of friends." |

## 2. Platform decision

**Mochi Meadow is an installable Progressive Web App (PWA).** This choice follows directly from the requirements:

| Requirement | Native SwiftUI | **PWA (chosen)** |
|---|---|---|
| Runs on iPhone | ✅ | ✅ Add to Home Screen → full-screen, offline, own icon |
| Runs on Mac | ✅ (Catalyst/multiplatform) | ✅ Safari → *File › Add to Dock*, or Chrome/Edge *Install* |
| **Testable on a Windows PC** | ❌ requires macOS + Xcode | ✅ any modern browser, or double-click a single HTML file |
| Friends can install their own copy | ❌ needs sideloading, a paid dev account or 7-day re-signing | ✅ send a link |
| Offline / private / local-first | ✅ | ✅ service worker + on-device storage |

Delivery targets:

1. **Hosted PWA** (GitHub Pages, deployed by CI) is the primary way to install on iPhone and Mac.
2. **Single-file build** (`MochiMeadow.html`) has everything inlined. Double-click it on any PC and it runs, with no server and no install.
3. **Local dev**: `npm install && npm run dev`.

If a native iOS build is ever wanted, the same codebase can be wrapped with Capacitor without rewriting anything.

## 3. Design principles (ours, extending the concept's §24)

1. **Growth is monotonic.** Plants, friendship, collection, lifetime check-ins: every visible measure of *you*
   only goes up. Streaks exist, but they are one number among many and are never shown as "0".
2. **Rest is part of the routine.** Rest days and pauses are first-class and never count against you.
3. **Return is rewarded.** Coming back after a gap earns a bonus. The app celebrates re-starts.
4. **The tracker stands alone.** With every game element hidden, it would still be an excellent habit tracker.
5. **Collected things decorate your real progress.** Unlocked plant species and pots appear *on your habit cards*,
   so the game layer loops back into the utility layer.
6. **Transparent, generous randomness.** Odds are displayed. Pity timers exist. New items are favored over
   duplicates. Every duplicate still earns progress. Any specific item can eventually be *chosen* (the Wishing Well).
7. **Delight scales with meaning.** A check-in gets a ≤700 ms flourish that never blocks the next tap. Capsules,
   rare pulls, milestones and perfect days get the big moments.
8. **Calm by default.** No red badges, no guilt notifications, no countdown timers, no FOMO pressure. Seasonal
   items return every year, and anything seasonal can be wished for out of season.

## 4. Information architecture

Five destinations. On phones they sit in a bottom tab bar with a raised center Capsules button. On wide
screens (≥ 900 px, i.e. Mac/PC) they become a left sidebar.

| Tab | Icon | Purpose |
|---|---|---|
| **Today** | sun-with-sprout | Check off habits, see the day's progress, buddy reactions, wallet |
| **Progress** | little chart/quilt | Consistency, trends, calendar, quilt, garden shelf, records, badges |
| **Capsules** (center, raised) | gumball machine | Machines, pulls, reveals, Wishing Well, set progress |
| **Meadow** | paw/house | Living scene with your pets, pet sheets, wardrobe, treats, collection book, photo mode |
| **You** | flower/gear | Habits management, preferences, data, install guide, about |

Overlays: Habit Editor (sheet), Habit Detail (sheet), Pet Sheet, Capsule Reveal (full-screen), Wishing Well
(sheet), Weekly Letter (modal card), Celebration (toast/banner/confetti), Onboarding (full-screen flow).

Routing: tab state is mirrored to `location.hash` (`#/today`, `#/progress`, `#/capsules`, `#/meadow`, `#/you`) so the
back button and deep links work on desktop. Sheets aren't routed.

## 5. The habit system (utility layer)

### 5.1 Habit model

```ts
type Habit = {
  id: string;
  name: string;            // "Drink water"
  emoji: string;           // "💧" (shown on card next to name)
  color: PastelKey;        // card accent: blush | peach | butter | sage | mint | sky | lavender | lilac
  plant: PlantSpeciesId;   // which plant grows for this habit
  pot: PotId;              // cosmetic pot
  schedule: Schedule;
  target: number;          // day-based only: count needed per scheduled day (1..99). e.g. 8 glasses
  unit?: string;           // "glasses", "pages"
  effort: 'tiny' | 'steady' | 'big';
  createdOn: DateKey;      // first day the habit counts
  archivedOn?: DateKey;    // hidden from Today; history kept
  pauses: { start: DateKey; end?: DateKey }[];  // inclusive; open-ended while paused
  order: number;
  reminder?: string;       // "HH:MM", used for calendar (.ics) export
  notes?: string;
};

type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }   // 0 = Sunday … 6 = Saturday; at least 1 day
  | { kind: 'weekly'; times: number }       // flexible: N times per week (1–7)
  | { kind: 'monthly'; times: number };     // flexible: N times per month (1–10)
```

`daily` and `weekdays` are **day-based**: each scheduled day is an occurrence with a count target.
`weekly` and `monthly` are **flexible**: any day works, and the goal is N check-in days within the period. A
flexible check-in is at most one per day (tap toggles).

### 5.2 Logs

```ts
logs: Record<HabitId, Record<DateKey, DayLog>>;
type DayLog = { count: number; rest?: true };   // rest = "Rest day" (skip)
```

* Day-based: the day is **done** when `count >= target`. Tap = +1. The detail view allows setting an exact count.
* Flexible: `count` is 0 or 1.
* **Rest day** (`rest: true`): the habit is skipped that day on purpose. It is neither done nor due, and it is
  excluded from consistency and transparent to streaks. No coins.
* **Pause** (`pauses`): like rest days but covering a range ("vacation mode").
* **Backdating**: the Today week strip lets you log any of the **last 6 days**, and those logs earn rewards normally.
  The Progress calendar can edit any older date. Those edits fix history but **earn no rewards** (a small
  note says so). Future dates can't be logged.

### 5.3 Consistency, precisely

"Consistency" = *achieved occurrences ÷ expected occurrences* over a window, where nothing that hasn't had a
chance to happen yet counts against you.

For habit *h* and window [*a*, *b*], evaluated on *today* **T**:

**Active days** are days *d* with `createdOn ≤ d`, not after `archivedOn`, not in a pause, and not a rest day.

*Day-based habits.* Consider each active scheduled day *d* in the window with *d ≤ T*:
* *d < T*: expected += 1, achieved += done(d).
* *d = T*: counts **only if done** (expected += 1, achieved += 1). Today is never held against you.

*Flexible habits.* The unit is a **period** (a week, using the user's week-start setting, or a calendar month).
Include every period whose last day falls inside [*a*, *b*], plus the current period if *T* ∈ [*a*, *b*].
For each included period:
* `activeFrac` = active days in period ÷ total days in period.
* `expected = round(times × activeFrac)`. Skip the period if expected = 0.
* `achieved = min(expected, check-in days in period)`.
* **Current (unfinished) period**: `expected = achieved` (it can only help you).

Aggregate consistency is Σachieved ÷ Σexpected across habits. When Σexpected = 0, show "—" plus a friendly empty
state, never "0%".

Headline phrases produced by the stats module:
* "You checked in **26 of the last 30 days**" (day-based, rolling 30).
* "**87%** consistent this month", "**6 / 7** this week".
* "**↑ 6 pts** vs August" (or when lower: "August was 91%. Every check-in counts 🌿"). Never red, never "down".
* Recent months series: `81% → 87% → 91%`.

### 5.4 Streaks

* **Day-based**: consecutive *scheduled, active* days that are done, counting back from today if today is done,
  otherwise from yesterday. Today pending never breaks a streak. Rest days, pauses and unscheduled days are
  transparent (they neither extend nor break it). Unit label: "days" for daily and "in a row" for weekday habits.
* **Weekly**: consecutive weeks where the period target was met. The current week counts only if already met.
  Unit: "weeks".
* **Monthly**: same, in months.
* A streak of 0 is **never displayed**. When the current streak is 0, the card shows the rolling consistency instead
  ("4 of the last 7 days").
* Iconography: a small **flower** (🌼-style custom glyph), never fire.

**Milestone ladders** (per habit, rewarded **once per habit per rung**, the first time the habit's *best* streak reaches it):

| Day-based (days) | Weekly (weeks) | Monthly (months) |
|---|---|---|
| 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 365 | 2, 4, 6, 8, 12, 16, 26, 39, 52 | 2, 3, 6, 9, 12, 18, 24 |

Each rung maps to a **reward tier** by its "day-equivalent" (days, weeks × 7, months × 30), taking the largest
day-rung ≤ that equivalent:

| Tier (day rung) | 3 | 7 | 14 | 21 | 30 | 45 | 60 | 90 | 120 | 180 | 365 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Coins | 15 | 25 | 40 | 50 | 60 | 75 | 90 | 120 | 150 | 200 | 365 |
| Stars | 0 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 5 | 6 | 12 |
| Tickets | 0 | 0 | 0 | 1 | 1 | 0 | 1 | 1 | 1 | 2 | 3 |
| Exclusive | | | | | | | | *Evergreen Crown* | | | *Golden Mochi* |

Exclusives appear in no machine. **Evergreen Crown** (head wearable) unlocks at the first 90-tier rung on any
habit. **Golden Mochi** (legendary mascot variant) unlocks at the first 365-tier rung.

### 5.5 Plant growth (habits as plants)

Every habit grows its own plant. Growth is measured in **sunshine**, which is **monotonic** (it never decreases) and
**frequency-normalised**, so a monthly habit kept faithfully grows as fast as a daily one kept faithfully:

* Each *achieved occurrence* (as defined in 5.3, counting all history, current period included) yields
  `sunshine = 7 / expectedPerWeek`, where expectedPerWeek = 7 (daily), |days| (weekdays), times (weekly),
  times × 12 / 52 (monthly).
* Extra flexible check-ins beyond a period's target give no sunshine.
* Only real completions count. Rest and pause days neither add nor remove.

| Stage | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Name | Seed | Sprout | Seedling | Leafy | Budding | Blooming | Flourishing | Evergreen |
| Sunshine ≥ | 0 | 1 | 4 | 10 | 21 | 42 | 90 | 180 |

(Roughly: a sprout on day 1, the first bud after 3 weeks, first bloom after 6 weeks, flourishing at 3 months, and
a sparkling *Evergreen* plant with a tiny golden watering-can charm at ~6 months of faithful practice.) Reaching
Blooming or Evergreen triggers a celebration and a badge.

**Plant species** (renderable at all 8 stages; free ones are marked ★): Tulip ★, Daisy ★, Sunflower ★, Succulent ★,
Monstera ★, Sakura Bonsai, Strawberry, Lavender, Cactus, Lemon Tree, Lily of the Valley, Mushroom Patch.
**Pots** (free ★): Terracotta ★, Cream ★, Blush ★, Sage, Cow Print, Cat Face, Frog, Strawberry, Moon, Pumpkin, Snow Globe
Base, Heart, Gold. Non-free species and pots come from capsules.

### 5.6 Habit templates (onboarding & "New habit")

Grouped chips. Each template has a name, emoji, schedule, target/unit, effort, plant and color.

* **Body**: Drink water 💧 (daily, 8 glasses, tiny), Take vitamins 💊 (daily, tiny), Walk 🚶‍♀️ (daily, steady),
  Stretch 🧘‍♀️ (daily, tiny), Strength training 🏋️‍♀️ (3×/week, big), Yoga 🧘 (2×/week, steady), Sleep by 11 😴 (daily, steady)
* **Mind**: Read 📖 (daily, steady), Journal ✍️ (daily, tiny), Meditate 🌙 (daily, tiny), Practice a hobby 🎨 (3×/week, steady), Learn something 🧠 (weekly 2×, steady)
* **Home**: Tidy 10 min 🧹 (daily, tiny), Water the plants 🪴 (weekly 2×, tiny), Meal prep 🥗 (weekly 1×, big),
  Clean the bathroom 🛁 (weekly 1×, big), Deep clean ✨ (monthly 1×, big), Change filters 🔧 (monthly 1×, tiny)
* **Heart & life**: Call family 📞 (weekly 1×, steady), Skincare 🧴 (daily, tiny), Review budget 💰 (monthly 1×, steady),
  Date night 💕 (monthly 2×, steady), Something creative 🧶 (weekly 2×, steady)

## 6. The economy

Four resources, each with one clear job:

| Resource | Icon | Earned by | Spent on |
|---|---|---|---|
| **Coins** | gold coin with embossed paw | Check-ins, perfect days, period goals, comebacks, milestones | Coin machines (25 each) |
| **Stars** | butter-yellow 5-point star | Milestones, weekly letters, monthly bloom, badges, **stardust fusion** | Dreamy machine (3), Wishing Well |
| **Stardust** | sparkle ✦ in a little jar | Duplicate pulls | Auto-fuses: **every 10 stardust → 1 star** (with a satisfying animation) |
| **Tickets** | pink capsule ticket | Milestones (21+ tiers) | One free pull on *any* machine, including Dreamy |

### 6.1 Earning

| Event | Reward |
|---|---|
| Check-in completes an occurrence | Tiny **3** · Steady **5** · Big **8** coins |
| Day's 13th+ rewarded completion (anti-busywork guardrail) | **1** coin each |
| Flexible period goal met (e.g. 3rd yoga this week) | +**10** (weekly) / +**20** (monthly) coins |
| **Perfect day** (all day-based habits scheduled that day done, ≥1 scheduled) | +2 × scheduled count, clamped to **5–20** coins |
| **Welcome back** (first completion after the habit's streak had lapsed; the habit had ≥1 earlier completion) | +**3** coins, gentle message. Once per gap |
| Streak milestone | See §5.4 table |
| **Weekly letter** (shown on first open of a new week, for last week) | ≥50% → 1★, ≥75% → 2★, ≥90% → 3★ (needs ≥5 expected occurrences) |
| **Monthly bloom** (first open of a new month) | ≥80% last month → 3★ |
| Badges | 1–5★ each (§6.5) |
| Onboarding gift | 50 coins + one free first pull (guaranteed cat) |

**Reward integrity.** Rewards are tracked in a *ledger* keyed by `(habitId, date)`. Unchecking refunds the
check-in's coins **if the balance allows**, and then the grant is cleared so re-checking pays again. If the coins
were already spent, the grant stays recorded and re-checking won't pay twice. Balances never go negative. Perfect-day,
period-goal, welcome-back and milestone bonuses are granted **at most once per key**, and they are never clawed back.

Expected pace: 5 daily habits at ~80% ≈ 25–35 coins/day, so **about one capsule a day** plus weekly premium pulls. That is
generous by design.

### 6.2 Machines

| Machine | Theme colors | Price | Contents |
|---|---|---|---|
| **Kitty Capsule** | blush pink / cream | 25🪙 | Cats, cat toys, cat accessories |
| **Moo Moo Milk Bar** | cream / strawberry-milk / cocoa spots | 25🪙 | Cows, dairy & farm items, cowgirl hat, cow-print things |
| **Sakura Garden** | sakura pink / sage | 25🪙 | Bunnies, frogs, florals, **plant species & pots** |
| **Sweet Treats** | peach / butter | 25🪙 | Hamsters, bears, **treats**, dessert hats |
| **Dreamy Night** | lavender / indigo | **3⭐** | Cloud & star variants, pajamas, moon items, night decor. Better odds |
| **Seasonal** (rotates by date) | per season | 25🪙 | See below. Returns every year |

Seasons (inclusive, by month/day, every year): **Pumpkin Patch** 🎃 Sep 1–Nov 10 · **Snow Globe** ❄️ Nov 11–Jan 14 ·
**Love Letters** 💌 Jan 15–Feb 29 · **Rainy Day** ☔ Mar 1–May 31 · **Beach Day** 🏖️ Jun 1–Aug 31.
Out-of-season items stay visible in the collection book and can be wished for.

### 6.3 Pull odds (displayed in-app)

| Rarity | Coin machines | Dreamy Night |
|---|---|---|
| Common | 60% | 40% |
| Uncommon | 25% | 30% |
| Rare | 10% | 20% |
| Ultra Rare | 5% | 10% |

* **Pity**: Rare-or-better guaranteed at least once every **10 pulls** per machine. Ultra guaranteed within
  **40 pulls** per machine. Counters are shown ("Rare+ within 3 pulls ✨").
* **New-first weighting**: within the rolled rarity, unowned items weigh **3×** owned ones.
* If a rarity tier is empty in a machine, fall to the nearest non-empty tier below, then above.
* **Completed machine**: once you own everything in a machine, pulls still work (all duplicates → stardust), and
  a "Set complete ✓" ribbon appears.

### 6.4 Duplicates and the Wishing Well

* Duplicate → **stardust**: Common 2 · Uncommon 4 · Rare 8 · Ultra 15. Every 10 fuses into 1★.
* Duplicate **pet** → also **+20 friendship** for that pet ("A visit from their twin!").
* **Wishing Well** (star shop): pick any **unowned** item from any machine (seasonal included, any time of year)
  for Common 2★ · Uncommon 4★ · Rare 8★ · Ultra 15★. Exclusive milestone items can't be wished for.
  This makes the gacha completable by choice. Randomness adds fun without holding anything back.

### 6.5 Badges (achievements)

Each badge is a small illustrated medal with a star reward:
First check-in (1★) · First perfect day (1★) · Perfect week (3★) · 10 / 50 / 100 / 250 / 500 / 1000 check-ins
(1 / 2 / 3 / 4 / 5 / 8★) · First rest day, "Rest is part of the routine" (1★) · First welcome back, "Comeback" (1★) ·
First capsule (1★) · First rare-or-better (1★) · First ultra rare (2★) · 10 / 25 / 50 / 100 collectibles (2 / 3 / 5 / 8★) ·
Complete any machine set (5★) · First Blooming plant (2★) · First Evergreen plant (5★) · First treat fed (1★) ·
Favorite discovered (1★) · First outfit (1★) · Best friends, a pet at max friendship (3★) · Early bird, a check-in
before 7:00 (1★) · Night owl, a check-in after 22:00 (1★) · Steady month, ≥80% in a month (3★).

## 7. Pets (light virtual pet, concept option B)

### 7.1 Friendship

* 10 levels (hearts). Cumulative XP thresholds: `0, 10, 25, 45, 70, 100, 140, 190, 250, 320`.
* **Pet (tap)**: +1 XP (max 5 XP/pet/day). **Treat**: +4 XP, or +12 if it's their favorite (max 3 counted treats per pet
  per day; after that the pet is "so full 😋", a cute reaction with no XP). **Duplicate pull**: +20. **Buddy bonus**: the
  Today-screen buddy gains +1 per habit check-in (max 10/day).
* **Never decays. No hunger. No sickness. No sadness.** (Concept §17.)
* Level perks (unlockable reactions): L2 *wave*, L3 *hop*, L5 *twirl*, L7 *heart-eyes*, L10 *best-friend sparkle crown* (+3★ badge).

### 7.2 Personality & favorites (rolled when a pet is obtained)

* **Personality** (one of 10): Sleepy, Playful, Curious, Shy, Sassy, Gentle, Foodie, Dramatic, Sunny, Dreamy.
  It flavors meadow behavior (Sleepy naps more, Playful hops, Curious wanders farther, Shy stays near edges) and speech lines.
* **Favorite treat**: rolled from the full treat list. It is hidden until discovered, with a hint by treat tag
  ("Loves something fruity 🍓"). Feeding the favorite shows heart-eyes, gives +12 XP and earns the badge the first time.
* Pets can be **renamed**, **favorited** (pinned first), set as **Buddy**, and placed **in the meadow**
  (up to 8 out at once; others "napping in the cottage").

### 7.3 Wardrobe

Four slots per pet: **head**, **face**, **neck**, **body**. Owning an item lets *any* pet wear it, including several
pets at once. Outfits are saved per pet.

## 8. Collectibles catalog (summary; the code catalog is authoritative)

Categories: **pet**, **wearable** (head/face/neck/body), **treat**, **decor**, **plant** (species unlock), **pot**.
Rarities: common, uncommon, rare, ultra. Pets make up ~40% of each machine, and the rest is items. The full list, with IDs,
names, flavor text, rarity and machine, lives in `src/catalog/`. Species: **cat, cow, bunny, frog, bear, hamster, duck**.

## 9. Screens

### 9.1 Today

1. **Header**: time-aware greeting ("Good morning, Sam ☀️"), long date, **wallet pill** (🪙 coins, ⭐ stars; tap → Wallet sheet).
2. **Buddy corner**: the buddy pet idles beside the greeting with an occasional speech bubble (a daily rotating line). It hops
   and shows a heart on every check-in, and dances on a perfect day.
3. **Week strip**: the last 7 days (6 back + today). Each bubble shows the weekday letter, the date, and a tiny completion ring.
   Selecting a past day shows "Logging for Sat, Sep 27" with a return-to-today pill.
4. **Day progress card**: "3 of 5 done" and a **vine progress bar**: a vine that grows across the bar and sprouts a leaf per
   completion, then blooms into a flower at 100%. Shows "+18 🪙 today".
5. **Habit list** in three sections: *Today* (day-based scheduled), *This week* (weekly), *This month* (monthly).
   Unscheduled day-based habits appear collapsed under "Not today". Paused habits are hidden. Order is stable, so habits
   never jump when checked.
6. **Habit card**: small potted plant (live stage) · emoji + name · subtitle (streak with the flower glyph, OR
   "26 of last 30 days", OR "2 of 3 this week", OR "5/8 glasses") · big round **check button** (≥ 48 px target).
   Count habits show a segmented ring and +1 per tap. A "⋯" button (and long-press) opens actions: *Rest day*, *Set
   count*, *Details*, *Edit*.
7. **Empty state**: Mochi holding a seed. "Let's plant your first habit!"
8. **Add habit** button in the list footer and header.

**Check-in choreography** (≤ 700 ms, never blocks input): button squish (80 ms) → fill + check-stroke draw (220 ms) →
6-particle sparkle burst → "+5" coin chip floats up and a coin flies to the wallet on a curved path, where the counter
bounces → plant wiggles and drips two water droplets → vine grows → buddy hops with a heart → soft two-note chime + haptic tick.

### 9.2 Progress

Scrolling sections: **Hero** (month consistency ring with a big friendly %, a week chip, a trend line that is never negative
in tone) → **Recent months** bars (6 months, labelled %) → **Garden shelf** (every habit's plant on wooden shelves, stage name
under each; tap → Habit Detail) → **Calendar** (month grid; each day is a soft circle filled by that day's completion; tap a
day → that day's log, editable) → **Quilt** (the year as a patchwork: 53×7 rounded patches in pastel intensity) → **Records**
(total check-ins, best streak, best month, perfect days) → **Insights** (strongest weekday, most consistent habit, busiest
time of day) → **Badges** grid.

**Habit Detail sheet**: large plant with "12 ☀ to Blooming" progress; stat tiles (current streak, best streak, total, last-30
line); this week / this month; 6-month mini bars; history calendar (editable); milestone ladder (earned / next); actions:
Edit, Pause/Resume, Archive, Delete (confirm), **Add reminder to Calendar** (.ics with RRULE + VALARM; iPhone/Mac Calendar
does the notifying, since reminders that work without a server are otherwise impossible on the web).

### 9.3 Capsules

* Wallet strip (coins, stars, tickets, stardust jar).
* **Machine carousel**: scroll-snapped, one machine per page, with dots. Each shows name, price chip, set progress
  ("7 / 18"), odds ⓘ, pity hint, and "Until Nov 10" for the seasonal machine.
* **The pull** (the app's signature moment):
  1. Tap **Insert 25🪙** → a coin arcs into the slot (clink). The crank glows and wobbles: "Turn me!".
  2. **Drag the crank around** (a circular gesture tracked by angle). Capsules inside the glass dome are **physically
     simulated** (circle-circle collisions, gravity, damping) and tumble as it turns, with a ratchet click every 30°.
     After 300° it goes *ka-chunk*. For accessibility, **tap the crank** to auto-turn instead.
  3. A capsule drops through the chute, rolls out and bounces. Its shell hints at rarity: common is solid pastel,
     uncommon has a two-tone sheen, rare has a glowing aura and orbiting sparkles, and ultra has a holographic
     rainbow shimmer and a gentle shake.
  4. **Tap to open** (ultra: three taps, each crack growing). The halves burst apart, light rays spin, and the item
     springs up with confetti tuned to its rarity.
  5. **Reveal card**: art, name, rarity pill, flavor text, **NEW!** or "Duplicate → +4 ✦". For pets:
     personality, then "Name them" / "To the meadow". Then "Pull again" / "Done".
* **Quick open** preference skips straight to the reveal card.
* **Wishing Well** card → sheet with a filterable grid of unowned items and star prices.

### 9.4 Meadow

* A full-bleed illustrated SVG scene whose **sky follows the real time of day**: dawn (5–8), day (8–17),
  golden hour (17–20) and night (20–5, with moon, stars and fireflies). Clouds drift. A big round tree, a fence,
  distant sage hills, flowers, and a **planter box** holding your top habit plants.
* **Decor slots** for owned decor: back-left, back-right, ground-left, ground-center, ground-right, sky.
* **Pets roam**: each one runs a small behavior state machine (idle → wander → sit → play/nap) influenced by personality
  and time of day (they nap at night). They face their direction of travel and are depth-sorted by y.
* **Tap a pet**: bounce, hearts, a personality speech bubble, +XP. **Long-press / double-tap**: opens the Pet Sheet.
* **Treat tray**: drag a treat onto a pet to feed it (a tap-to-select-then-tap-pet fallback is also available).
* **Pet Sheet**: big animated portrait, name (editable), species/variant, personality, friendship hearts + XP bar,
  favorite treat (or its hint), wardrobe (4 slots, owned items grid), Feed, Set as buddy, In meadow toggle, Favorite.
* **Collection book**: tabs by category with a grid; unowned items are soft silhouettes with "?", grouped by machine.
* **Photo mode** 📸: renders the current scene (SVG → canvas → PNG) with a scalloped frame and date stamp, then
  shares via the Web Share API (the iOS share sheet) or downloads.

### 9.5 You

Profile (name, buddy) · Habits (reorder, edit, archive/restore, delete) · Preferences (week starts Mon/Sun,
theme Auto/Light/Night, sounds, haptics, reduce motion Auto/On/Off, quick capsule open) · Data (export JSON,
import JSON, storage status, **Load demo meadow**, reset everything with a double confirm) · Install guide
(illustrated steps for iPhone, Mac and PC) · About (principles, credits, version).

**Demo meadow** seeds ~120 days of realistic history (with realistic dips), a wallet, and a dozen pets. It lets
anyone evaluate every screen instantly, and it can be reset.

### 9.6 Onboarding (≈60 seconds; teaches the whole loop)

1. A capsule wobbles on screen → tap → **Mochi pops out**. "Hi! I'm Mochi. Let's grow something together."
2. "What should I call you?" (optional).
3. **Pick a few habits** from template chips (2–5 suggested) or "I'll make my own".
4. "Every check-in earns coins. Coins turn capsule machines. Machines hold friends." A 3-panel illustrated
   explainer, swipeable, skippable.
5. **Your first capsule is on us**: a free pull that is guaranteed to be a cat → it moves into the Meadow → land on Today.

## 10. Visual design system

### 10.1 Color tokens

Light ("Morning Meadow"):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFF9F2` | app background (warm cream) |
| `--bg-2` | `#FFF1E6` | grouped background / wells |
| `--card` | `#FFFFFF` | cards |
| `--ink` | `#4A3540` | primary text (warm plum-cocoa; never pure black) |
| `--ink-2` | `#7A6370` | secondary text |
| `--ink-3` | `#B7A3AD` | tertiary / placeholders |
| `--line` | `#F0E2DA` | hairlines |
| `--blush-100/300/500/700` | `#FFE9EF` `#FFC4D3` `#F58CAA` `#C23F68` | primary accent (700 = AA text) |
| `--peach-100/300/500/700` | `#FFEEDF` `#FFCBA8` `#FF9E6E` `#B85A2B` | |
| `--butter-100/300/500/700` | `#FFF7D9` `#FFE593` `#F6C544` `#9A7200` | coins, stars |
| `--sage-100/300/500/700` | `#EBF5E6` `#C3DFB4` `#8EC07C` `#4F7F41` | plants, success |
| `--mint-100/300/500/700` | `#E3F7F1` `#B3E6D6` `#6CCBAE` `#2E7D66` | |
| `--sky-100/300/500/700` | `#E7F3FD` `#BBDCF6` `#7DB7E8` `#2F6E9E` | |
| `--lavender-100/300/500/700` | `#F2EDFE` `#D6C8F8` `#A993EA` `#6A51BF` | dreamy, rare |
| `--lilac-100/300/500/700` | `#FBEAFB` `#F0C6F0` `#D98ED9` `#8E4A8E` | |

Night ("Moonlight Meadow"): `--bg #221C30`, `--bg-2 #2B2440`, `--card #342C4B`, `--ink #F8EEF3`, `--ink-2 #CBBCD0`,
`--ink-3 #8D7F9C`, `--line #43395C`. Pastels keep their hue with the 100-level shades rebased to deep tints
(e.g. blush-100 → `#4A3048`). Night is triggered by *Auto* (system) or chosen explicitly.

Rarity: **common** `sage-500`, **uncommon** `sky-500`, **rare** `lavender-500`, **ultra** a holographic gradient
`#FFB3C7 → #FFE593 → #B3E6D6 → #BBDCF6 → #D6C8F8` with a slow shimmer.

### 10.2 Type

* **Fredoka** (600/700) for display, numbers, buttons, tab labels. Round, chunky, friendly.
* **Nunito** (400/600/700/800) for body, highly readable at small sizes.
* Scale (px): 34 display · 28 title · 22 headline · 18 body-lg · 16 body · 14 caption · 12 micro. Numbers use `tabular-nums`.
* Both are bundled and self-hosted (offline-safe).

### 10.3 Shape, depth, spacing

* Radii: 10 · 16 · 22 (cards) · 30 (sheets) · pill.
* **Candy buttons**: a solid pastel face with a 4 px darker "lip" underneath. On press, the face drops 3 px and the lip shrinks.
  Tactile and toy-like.
* Shadows are warm-tinted, never grey: `0 1px 0 rgba(74,53,64,.05), 0 10px 30px -12px rgba(74,53,64,.22)`.
* Spacing on a 4 px grid, with a 16 px page gutter (20 px on ≥ 390 px wide). Content max-width is 720 px in the wide layout, and the Meadow runs full-bleed.

### 10.4 Illustration style guide (all art is code-drawn SVG)

* **Silhouette**: the *mochi blob*. Head and body are one soft, slightly pear-shaped mass sitting on the ground, about
  as wide as it is tall, with two tiny feet nubs. Species identity comes from ears, horns, snout, beak, eye placement,
  tail and pattern, **not** from body shape.
* **Outline**: 2.4 units (on a 100-unit canvas) in cocoa `#5A3E45`, with round caps and joins. Never pure black.
* **Eyes**: cocoa ovals (~3.4 × 4.2) set low and wide, each with a white highlight dot upper-right. **Blush**: `#FF9FB8` ellipses at 55% opacity.
* **Mouth**: cat "ω", others a tiny "u". Cows have a pale muzzle oval with two nostril dots.
* **Shading**: one soft top-left highlight (white, ~35%) and one bottom shade (cocoa, ~7%). No gradients on the body
  except in special variants.
* **Palette**: pastel fills only. Saturated color is reserved for tiny accents (a strawberry, a bell).
* **Idle life**: breathing (a 1.5% vertical scale at 3.2 s), blinking every 3–6 s at random, a tail sway, and the occasional ear twitch.
* **Sparkles**: 4-point ✦ stars in butter/white are the universal "magic" motif.

### 10.5 Motion

* Pops: `cubic-bezier(.34,1.56,.64,1)`. Moves: `cubic-bezier(.22,1,.36,1)`. Micro 120–180 ms · standard 240–320 ms ·
  celebrations 0.8–2.2 s.
* **Reduced motion** (OS setting or pref): no wandering, confetti becomes a fade-in sparkle, the capsule opens with a fade,
  and there is no parallax.

### 10.6 Sound & haptics

* All sounds are **synthesized with WebAudio** (no files): tap *pop*, check *two-note chime*, coin *ting*, crank *ratchet*,
  capsule *thunk*, reveal *arpeggio* (a longer shimmer for rare, a glissando for ultra), perfect-day *melody*, and pet voices
  (a cat chirp sweep, a cow's soft low "moo" with vibrato, a duck's "wek", a frog's "ribbit" pair, and so on).
* `navigator.audioSession.type = 'ambient'` where supported, so iPhone's silent switch is respected.
* **Haptics**: `navigator.vibrate` where available. On iOS 18+ Safari, the `<input type="checkbox" switch>` toggle trick
  gives a real system haptic tick. Both are toggleable.

## 11. Technical architecture

* **Stack**: Vite 7 · Preact 10 · TypeScript (strict) · @preact/signals · CSS Modules + global tokens ·
  vite-plugin-pwa (Workbox) · Vitest · Playwright.
* **Layout**:

```
src/
  main.tsx                  bootstraps store, theme, SW, renders <App/>
  app/                      App shell, tab bar/sidebar, routing, overlays host
  state/                    types.ts (AppState etc.), store.ts (signals + actions), persist.ts, migrate.ts, demo.ts
  domain/                   PURE logic, fully unit-tested: dates, schedule, stats, streaks, growth, economy,
                            gacha, friendship, badges, seasons, ics, rng
  catalog/                  collectibles, machines, templates, species, treats, personalities, lines
  art/                      code-drawn SVG: pets/, wearables/, plants/, machines/, scene/, icons/, CollectibleArt.tsx
  fx/                       confetti, sparkles, coinFly, sound, haptics, physics (capsule dome)
  ui/                       Button, Card, Sheet, Toggle, Segmented, Chip, Toast, Dialog, Ring, EmptyState …
  features/
    today/ progress/ capsules/ meadow/ you/ onboarding/ habits/ (editor & detail)
  styles/                   tokens.css, global.css, fonts
```

* **State**: one serializable `AppState` in a signal. Actions are pure reducers in `domain/`, called by thin wrappers in
  `store.ts` that also emit **FX events** (coin gained, milestone, perfect day, pull result) on a tiny event bus that
  the FX layer subscribes to. That keeps logic testable and visuals decoupled.
* **Persistence**: `localStorage` key `mochi-meadow:v1` holding a versioned envelope `{v, savedAt, state}`. Saves are
  debounced (250 ms) and flushed on `pagehide`/`visibilitychange`. The previous good save is kept as `…:backup`.
  Migrations run on load. `navigator.storage.persist()` is requested. Export/import uses the same envelope.
* **Dates**: `DateKey = 'YYYY-MM-DD'` in *local* time. All date math runs on keys through UTC-noon arithmetic, so
  it is DST-safe. Day rollover is detected on focus and by a minute timer.
* **Randomness**: `crypto.getRandomValues` in production and an injectable seeded PRNG (mulberry32) in tests.
* **Service worker**: precaches the app shell, fonts and icons. When an update is ready, the user sees a gentle
  "A fresh version is ready 🌱 Refresh" toast. It is disabled in the single-file build.
* **Builds**: `npm run build` produces the PWA in `dist/`. `npm run build:single` produces `dist-single/MochiMeadow.html` with everything inlined.
* **Quality gates**: `npm run check` = typecheck + unit tests + build. Playwright e2e covers the core flows
  on iPhone and desktop viewports, and a screenshot script supports visual audits.
* **CI/CD**: GitHub Actions runs the checks and deploys to GitHub Pages.

### 11.1 iPhone/Mac specifics

`viewport-fit=cover` + safe-area insets · `apple-mobile-web-app-capable` + `status-bar-style: default`, adapted per theme ·
apple-touch-icon (180 px) · startup images for current iPhone sizes · `touch-action: manipulation` (no double-tap zoom) ·
`overscroll-behavior: none` on the shell · `-webkit-tap-highlight-color: transparent` · `100dvh` layouts · an in-app
install prompt that detects iOS Safari and shows illustrated *Share → Add to Home Screen* steps · hover states and keyboard
shortcuts on Mac/PC (`1`–`5` for tabs, `N` for new habit, `Space` to turn the crank, `Esc` to close sheets).

### 11.2 Accessibility

WCAG AA contrast for all text (the `-700` shades exist for accent text) · every icon button has an `aria-label` ·
habit check buttons are real `<button>` elements with `aria-pressed` and a live-region announcement ("Walk done, plus 5 coins") ·
sheets trap focus and close on Esc · visible `:focus-visible` rings · capsule crank has a tap alternative ·
decorative SVG gets `aria-hidden` · rem-based type that respects user font-size settings · reduced-motion support.

## 12. Milestones & adversarial audits

| # | Milestone | Audit (independent reviewers, adversarial) |
|---|---|---|
| M0 | This spec | **Spec audit**: critics review from product, habit-science, economy, iOS-PWA feasibility and accessibility perspectives. Findings folded back into this doc. |
| M1 | Foundation + domain logic + art systems | **Correctness & craft audit**: adversarial edge-case hunt on domain math (DST, week boundaries, leap years, exploit attempts) and a visual art-direction review from rendered screenshots. |
| M2 | All screens integrated | **Experience audit**: e2e flows on iPhone + desktop viewports, screenshot critique, accessibility pass, performance check. |
| M3 | Polish & ship | **Judges' panel**: fresh-eyes reviewers score the app like competition judges, and the top issues get fixed before release. |

Audit logs are kept in [`AUDITS.md`](./AUDITS.md).

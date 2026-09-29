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

---

## 13. Amendments from the M0 audit

The M0 panel critiqued this spec from six perspectives, and skeptics then tried to refute each finding. These
amendments **override** earlier sections wherever they conflict. (Full log in `AUDITS.md`.)

### 13.1 Art & collection (decided by the lead ahead of the full verdicts)

* **Puppies return** (they were in the concept). New species **dog** and a new standard machine **Puppy Park**
  (Corgi, Pomeranian, Dachshund, Shiba, Golden Pup, Dalmatian, Frenchie, Samoyed, secret: Cotton Candy Pom), with
  dog treats, a dog house, tennis balls, a hoodie and a tiny backpack.
* **Species have their own silhouettes.** Every pet stays in the *mochi family* (soft, seated, head and body fused),
  but proportions vary by species: a rounder, wider hamster; a taller pear-shaped bunny; a flatter, wider frog; a sturdy,
  broad-faced cow; a pear duck with a head tuft; a round bear; a slightly longer-snouted dog. `BODIES[species]` in
  `art/pets/geometry.ts` carries each path and its half-width sampler, so neck and body wear still hugs every species.
  Species also get their own *idle personality* (cats knead and swish, cows chew and flick ears, bunnies twitch noses,
  frogs puff throats, dogs wag, hamsters nibble, ducks bob).
* **Plants never look static.** `PlantArt` takes `progress` (0–1 within a stage) for continuous detail such as an extra leaf,
  a fattening bud or a deepening color, and `blooms` for growth *after* Evergreen: extra flowers or fruit, one per 30
  sunshine, visually capped at 6, with a golden sparkle at the cap.
* **Custom habit icons replace emoji.** System emoji clash with the hand-drawn art and render differently on iPhone,
  Mac and Windows. `catalog/habitIcons.ts` lists 48 icons drawn in the brand style (`art/habit-icons`). `Habit.icon` holds
  the icon id, and icons are suggested automatically from the habit name. Emoji may still appear inside *copy*.
* **Capsules are blind boxes, not loot.** Each machine is a **series** with a lineup card (like a blind-box poster).
  Its ultra item is the series **Secret**, shown as a "?" silhouette until pulled. Copy says "series", "lineup" and
  "secret", never "loot" or "gacha".
* **Today feels like the world.** Today's header is a **windowsill scene**: the time-of-day sky outside the window,
  the buddy lounging on the sill, and your most-grown habit plants in their pots. When a habit is checked, its plant on the
  sill gets watered and the buddy reacts right there.

### 13.2 Habits & tracking (from the habit-science review, adopted)

**Versioned rules.** A habit's schedule, target, step and tiny version live in `rules[]`, each with a `from`
date. Every day and period is evaluated with the rule in effect then, so edits never rewrite history. An edit to a
day-based habit applies from today. For a flexible habit the user chooses between *this period* and *next period*.
When both rules are day-based, a streak continues across the edit. When the kind changes (day-based ↔ flexible), the
old streak is kept as best and a new one starts, labelled "New rhythm" (never "0").

**Schedules.** `daily` · `days` (on certain weekdays; UI label "On certain days") · `weekly {times, every 1–4}`
(every 2 = biweekly) · `monthly {times, every 1|2|3|6|12}` (every 3 = quarterly). A period with `every > 1` starts
at the start of the rule's `from` period. `expectedPerWeek` = 7, |days|, times/every, or times×12/52/every.
`dueDay` on monthly habits is display-only.

**Targets and taps.** `target` is 1–100 000 and `step` ≥ 1. If target = 1, a tap toggles. If target > 1, each tap adds
`step` until done. After that, tapping opens an inline stepper instead of adding silently. A long-press opens a
number pad with chips (+1, +step, +2×step, Done). Over-target values are allowed ("10 / 8") but earn no extra coins.
Partial taps get a ring tick and a haptic but no coin chip and no celebration. Every completing check-in shows a
4-second **Undo** snackbar. Unit presets: glasses 1, pages 5, minutes 5, steps 1000, km 1. Quantity-per-period for
flexible habits is v2.

**Tiny version.** The optional `tiny {label, count?}` on each rule is logged by long-press on the check button
or from the actions menu ("Did the tiny version"), stored as `level:'tiny'`. It counts as **done** for streaks and
consistency ("showed up"), and earns ⌈coins/2⌉ and 50% sunshine. Stats show the split openly: "26 of 30 days · 8
tiny". A count habit that reached `tiny.count` but not the target is recorded as tiny at day end. **Graduation**: at
≥85% over the last 28 days with ≤25% tiny, the habit detail *offers* "Ready to grow?" (+1★ on accept; new rule from
tomorrow). Below 40% it gently offers "Make it tinier?". Neither is ever automatic.

**Time of day & anchors.** Each habit has `timeOfDay` (morning / midday / evening / anytime) and an optional `anchor`
("After I pour my coffee…", shown as the card's second line). Today groups habits by time block. The current block
comes first, and completed earlier blocks collapse ("Morning 3/3"). Flexible habits sit in their block with a pace
line ("1 more by Sun"). Once met, they fold into "Done for the week" and can still be tapped. `polarity:'avoid'`
changes copy only ("Kept it up").

**Day boundary.** `settings.dayStartsAt` (0–360 min, default 180 = 3:00 am). App day = local date of
(now − dayStartsAt). `today` is monotonic (never earlier than `clock.maxDateKey`). If the device clock is > 36 h
behind `clock.maxEpochMs`, a calm banner appears and no rewards are paid until it catches up. Early-bird and night-owl
badges use wall-clock time from live `at` stamps only.

**Rest, off days, pauses.**
* Rest (day-based habits only) can be set for today, up to 14 days ahead, or within the 6-day window. Each habit has
  a weekly allowance of `max(1, floor(scheduledDaysPerWeek / 3))` (daily = 2). Allowed rests are fully
  transparent to streaks, consistency and rewards. Rests beyond the allowance still show the moon and are never red,
  but they count as not-done in all math.
* **Take today off** (global, max 4 per calendar month) is transparent for every habit. For flexible habits it
  reduces active days.
* Pauses may start today or later (for example "Back on Oct 6"). Resume sets end = yesterday. Overlapping pauses merge.
  Today shows one collapsed row: "Resting: 2 habits · back Oct 6".
* Restoring an archived habit adds a pause covering the archived stretch.
* A `DayLog` is either `{kind:'log', count, level?, at?, note?}` or `{kind:'rest'}`, never both.

**Backfill & history.** Rewards can come only from the 6-day window (today−6 … today), for days ≥ the habit's
`createdAt` date, through the check-in path. Logging a day before `startedOn` asks "Start tracking Walk from
Mon, Sep 22?", and accepting moves `startedOn` earlier (no rewards before `createdAt`). The Progress calendar edits
older days as history only (done/not-done). Those edits never touch the wallet, sunshine or once-keys in either
direction, and any rung they reach counts as reached but unpaid.

**Notes & moments.** Each logged day may carry a note (≤ 280 chars). After a check-in, the snackbar offers "Add a
note". Notes appear in Habit Detail as newest-first **Moments** and in the calendar day sheet, and the Weekly Letter
quotes one.

### 13.3 Consistency & streak math (exact)

For a flexible period *p* (week or month, `every`-aware):
`target_p = round(times × activeFrac_p)`, `achieved_p = min(times, checkinDays_p)`,
`expected_p = max(target_p, achieved_p)`. Skip the period only if both are 0. For the **current** period:
`expected_p = achieved_p + max(0, target_p − achieved_p − remainingActiveDays(T…end))`, so only a shortfall that can no
longer be made up counts. Day-based: past scheduled active days count (done = 1); today counts only if done.

* A period that spans two months belongs to the month containing its **last** day, even while it is current.
* Percentages are hidden until the window has ≥ 10 expected occurrences ("4 of 4 so far").
* Per-habit phrases: daily "N of the last 30 days"; days "N of your last 13 Mon/Wed/Fri"; weekly "N of the last 4
  weeks"; monthly "N of the last 6 months". Aggregate: **"You showed up N of the last 30 days"** (days with ≥ 1
  check-in), plus the occurrence-weighted % and "Weekly & monthly goals: 3 of 5 on track".
* Month-to-date is compared with the **same elapsed span** of last month ("↑ 6 pts vs Sep 1–12"). Whole months are
  compared only once they close. Lower numbers are never shown in red or with the word "down".
* Streaks: day-based count consecutive done scheduled days (allowed rests, off days, pauses and unscheduled days are
  transparent). Flexible count consecutive met periods (a period with target 0 and no check-ins is transparent). The
  current period counts only if already met. Today pending never breaks anything.

### 13.4 Growth (plants)

Sunshine is a **ledger**, like coins. Each rewarded occurrence records `7 / expectedPerWeek(rule)` (tiny = 50%).
Flexible check-ins beyond `times` give none. Only un-checking the same occurrence inside the refund window removes it.
Stage = `min(stageFromSunshine, completedOccurrences)`, so each check-in advances at most one stage and a monthly
habit can't jump from Seed to Budding. **Display stage = max(stage, bestStage)**, which means plants never shrink. After
Evergreen, `blooms = min(6, floor((sunshine − 180) / 30))`. When one action crosses stages, stages animate in turn
(~350 ms each) with at most one badge celebration.

### 13.5 Economy v2 (from the economy review, adopted)

* **Check-in pay**: light 4 · steady 5 · big 7 coins (at most 3 *big* habits active; a 4th shows "Big is for the heavy
  lifts. You have 3 already."). Effort is picked by "About how long?" (<5 min / 5–30 / 30+). Tiny = ⌈pay/2⌉.
* **Daily full-rate budget**: 40 coins from check-ins per *wall-clock action day* (not the log's date). Beyond it,
  each check-in pays 1 coin.
* The ledger stores the amount paid per (habit, date). Unchecking refunds it if the balance allows. A re-check pays
  `min(original, current rate)`. Balances never go negative.
* Flexible check-ins beyond `times`: 1 coin, no bonus, no sunshine.
* **Period goal met**: +10 (weekly kinds) / +20 (monthly kinds), paid once per (habit, periodStart) when check-in days
  first reach `max(1, target_p)`.
* **Perfect day**: every scheduled day-based habit is done or allowed-rest, AND done ≥ max(2, ⌈⅔ × scheduled⌉)
  (flexible check-ins that day count toward "done"). Pays 2 × done, clamped to 4–16.
* **Welcome home** (replaces per-habit welcome back): the first check-in after ≥ 3 consecutive calendar days with
  zero check-in actions grants 20 coins + 1 ticket, at most once per 14 days. Measured from `clock.lastCheckinAt`.
  The copy never mentions the gap.
* **Streak rungs (per habit, coins only)** at 3/7/14/21/30/45/60/90/120/180/365 pay 10/20/30/35/40/50/60/80/100/150/250.
  Tier = the largest rung ≤ the occurrence-equivalent (day-based: streak count; flexible: streak periods × times).
  Paid once per (habit, tier).
* **Showing-up ladder (account level; the source of stars and tickets)**: `showUpDays` = distinct app days with ≥ 1
  rewarded check-in. Rungs 7:1★ · 14:2★ · 21:2★+1🎟 · 30:3★+1🎟 · 45:3★ · 60:4★+1🎟 · 90:5★+1🎟 · 120:5★+1🎟 ·
  180:6★+2🎟 · 250:8★+2🎟 · **365: 12★+3🎟 + Golden Mochi**, then 6★+1🎟 every +100 days forever. It can't be farmed by
  adding habits, and rests can't inflate it.
* **Evergreen Crown**: granted when the first plant reaches Evergreen.
* **Weekly letter**: ≥50% 1★ · ≥75% 2★ · ≥90% 3★ (needs ≥ 5 expected). **Monthly bloom**: ≥50% 1★ · ≥70% 2★ · ≥85% 3★,
  plus 1★ "Growing" when the month is ≥ 5 pts above the previous one (needs ≥ 10 expected). Both are granted on first
  open, store the tier paid, and pay **upward differences** if a backfill inside the window raises the tier ("+1★
  added. You logged Sunday! 🌿"). They never pay downward.

### 13.6 Capsules v2

* Tiers re-balanced so every individual rarer item is less likely than every individual commoner one: big series
  8/5/5/3 (common/uncommon/rare/ultra), seasonal 7/4/3/2, Dreamy 5/4/5/3. Each series has exactly one **Secret**
  (`SECRET_IDS`). The odds sheet shows tier odds *and* the per-item chance ("each Ultra ≈ 2.2%").
* Pity: rare pity (10 pulls) forces the **rare** tier only; ultra pity (40) stays independent. A pity roll picks an
  **unowned** item of that tier when one exists. A counter is hidden once its tier is fully owned.
* **Lucky meter**: after 4 consecutive duplicates in a machine, the next pull is guaranteed new (if anything is
  unowned). It shows as 4 pips: "●●●○ next one's new!".
* New-first weighting 3× stays.
* **Memories rule**: seasonal items become wishable only after that season has run once since the profile was
  created ("Arrives Jun 1 · wishable after its first visit"). There's no FOMO, since they return every year.
* **Moonlit variants**: once you own a pet, its code-drawn *Moonlit* night-palette variant (`moonlit:<petId>`, rare,
  star-speckled) joins the Dreamy Night pool and the Wishing Well (8★). Stars stay meaningful for years, and the
  concept's "color variants" arrive at almost no art cost.
* **Completed machine**: pulling still works, and a one-tap **Sparkle exchange** turns 250🪙 into 40✦.
* **Commit before animate**: a pull is decided and persisted immediately (`pendingReveal`). The reveal renders from it
  and is cleared on Done, so a reload resumes the reveal instead of losing or re-rolling it.

### 13.7 Pets, pantry & meadow v2

* **Treats are recipes.** Each owned treat restocks 1 free serving every morning (up to 3 banked), so feeding never
  costs anything and creates no obligation. "Bake a tray" makes 5 servings for 10🪙 (optional).
* Friendship levels 1–10 at `0,10,25,45,70,100,140,190,250,320` XP, then cosmetic **bond levels** 11–15 at
  `420,540,680,840,1000` (heart emote, name sparkle, a shared nap with the buddy). There is no decay and there are no needs. Petting
  reactions are never capped (only the XP is). The Today buddy gains +1 XP per completing check-in (max 10/day).
* **Meadow zones (the long-term coin goal)**, bought on a little map with prices always shown: Pond 400 · Orchard
  700 · Cottage Porch 1,000 · Greenhouse 1,500 · Star Hill 2,500. Each zone is a new stretch of the scrolling meadow
  and adds room for 2 more pets out (8 → 18). Decor is placed **freely** (drag anywhere; flip), not in fixed slots.
* **Species albums**: the collection book has one page per species ("The Whole Herd", "Cat Café", "Pond Club" for
  frogs and ducks…). Unowned pets are silhouettes labelled with where and when they visit. Completing an album
  earns 5★ and an exclusive album decor.
* Pets don't all sleep at dusk. Night has cozy activities (stargazing, chasing fireflies), and naps start after 23:00 for
  Sleepy pets only.

### 13.8 Platform & persistence (from the iOS/PWA review, adopted)

* **Install-first gate** on iOS/iPadOS Safari and macOS Safari when not standalone and no save exists: a full-screen
  "Plant Mochi on your Home Screen" page with illustrated steps per OS version. "Just peek" opens the **demo meadow**,
  which lives in its own namespace (`mochi-meadow:demo:v1`), shows a visible "Demo meadow · your real meadow is safe"
  pill, and has *Exit demo*.
* **Handoff**: "Move my meadow into the app" copies `MM1:` + base64url(gzip(JSON)) to the clipboard. The installed app
  offers "Paste my meadow". The same payload moves a meadow between devices (Universal Clipboard), with no server.
* A save in a non-standalone Safari tab shows a calm permanent banner ("This copy lives in Safari and can be cleared
  after 7 days away. Move it into the app").
* **Storage**: localStorage is the synchronous primary under `mochi-meadow:v1`, with the envelope `{v, appVersion, rev,
  savedAt, state}`. Every write is in try/catch. On QuotaExceeded the app compacts and retries, then shows a
  non-dismissable "couldn't save, export a backup" banner. The ledger is compacted to the 7-day window. **Daily
  snapshots** go to IndexedDB (7 daily + 4 weekly, only when `validateState` passes), with *Restore a snapshot* in
  You › Data. Saves stamped with a newer schema (`v > SCHEMA_VERSION`) are opened read-only. A **single writer** is
  enforced via Web Locks (another window shows "Mochi Meadow is open in another window · Use here"), and `storage` events
  adopt a newer `rev`. Wallet-changing actions write immediately, and everything else is debounced (250 ms) and
  flushed on pagehide/hidden. `persist()` is called only after onboarding in standalone mode. Reset removes only
  `mochi-meadow:*` keys.
* **Export/import**: a `File` is shared via `navigator.share({files})` when `canShare` allows it (Save to Files /
  AirDrop on iOS), and `<a download>` is used otherwise, plus *Copy backup* (the MM1 payload). Import validates the
  file, shows a preview ("12 habits, 1,284 check-ins, 23 friends, saved Sep 27"), snapshots first, replaces (never merges),
  and offers *Undo import* for 24 h. The copy says "Each device grows its own meadow". A gentle backup nudge appears
  30 days after the last export.
* **Reminders**: optional Morning/Midday/Evening "meadow time" reminders. Static `.ics` files (`public/cal/meadow-
  <block>-HHMM.ics`, one per 15-min slot, floating local time, `RRULE:FREQ=DAILY`, `VALARM` DISPLAY) are opened by a
  real user tap on `<a target=_blank>`, which works from an iOS Home Screen app. Disabling a reminder reminds the user to
  delete it from Calendar. Web Push would need a server and is out of scope.
* **Updates**: a check on resume (> 30 min since the last one). A waiting worker is applied immediately on cold launch
  before any input, otherwise on the next hide→show. It never interrupts a sheet, reveal or onboarding. You › About
  has *Check for updates*, the build hash and *Reload app*.
* **iOS layout**: the document scrolls (tap-status-bar-to-top works). Full-screen layers use `position:fixed; inset:0`
  (never dvh). The tab bar is padded with `max(8px, env(safe-area-inset-bottom))`. The keyboard is tracked with
  `visualViewport` → `--kb`. Inputs are ≥ 16px. Theme lives in its own key, and an inline head script sets `data-theme` before
  first paint. Startup images come in light and dark. Dynamic Type is supported via `font: -apple-system-body`
  on the root.
* **Haptics**: iOS 26.5 closed the programmatic switch trick, so a `HapticTap` overlay (a real
  `<input type=checkbox switch>` the finger actually hits, sitting over the real button) is used on discrete taps:
  check, +1, capsule open taps, insert coin, tap-to-turn. Crank detents use audio plus a visual snap. **Sound and
  haptics are garnish, and every moment must land with both off.**
* **Audio**: `navigator.audioSession.type='ambient'` is set before the AudioContext is created. The context is created
  lazily in a gesture and resumed in gestures.
* **Performance**: dome capsules may be drawn on a `<canvas>` from pre-rasterized sprites (no SVG filters in any
  animated path). Meadow pets are absolutely positioned elements moved with `translate3d`. All loops pause when hidden
  or off-tab. An **auto-lite** mode kicks in when the median frame time is > 25 ms (Low Power Mode). Budget: p95 ≤ 16.7 ms.
* **file:// build**: a "Test copy · saved only in this browser, for this file" ribbon. Install prompts and `persist()`
  are hidden. First boot offers *Import a backup*. The build guard fails on dynamic imports or relative asset URLs.
* **Diagnostics**: tapping the version 7× in About opens `#/diagnostics` (display-mode, storage persisted/estimate,
  envelope size/rev, SW state, audio, canShare, switch support + a *Test haptic*, viewport and safe-area probes, frame
  timing, UA) with *Copy report*.
* **Touch**: callouts and selection are disabled on interactive art. Long-press (450 ms), double-tap and drag are
  implemented with pointer events. Right-click/`contextmenu` maps to actions menus on Mac. Shortcuts are ignored while
  typing or when a modifier key is held.

### 13.9 Scope

v1 includes everything above plus CSV export (`date,habit,count,target,level,rest,note`), an **Arrange** mode on Today,
`manifest.shortcuts`, and **Quiet rewards** (hides coin chips, wallet and capsule prompts; the tracker alone must still
be excellent). v2: Dye Studio (recolor wearables/decor/pots), quantity-per-period, limit habits, CSV import, timers,
Web Push. Not possible in a PWA: iOS widgets, Lock Screen, Live Activities, HealthKit.

### 13.10 Delight, character & rituals (from the delight review, adopted; overrides 13.5/13.7 where noted)

**Mochi, the character.** Mochi is the narrator and appears in no machine. She is unique (never duplicated, always
in the meadow, never "napping in the cottage"). Her personality is fixed as **Sunny**, and her favorite treat is fixed as
**Strawberry Milk**, known from day one: she teaches the favorites mechanic, and it's a reason to visit the Moo Moo Milk
Bar. Her **name is locked**; every other pet can be renamed. She wears a signature **cowbell collar** in its own layer
under any neck wear, and a soft pink **cow-muzzle patch** around her ω mouth so she reads as part-cow even at 40 px.
Her two-note jingle (E6→B5) is the audio logo. Her **sprout is a whole-meadow gauge**. It grows through the 8 stage
names driven by *lifetime sunshine across all habits* (thresholds 0/5/20/50/105/210/450/900), and at stage 5 it blooms
in the color of her most-checked habit. The 365-day Showing-up reward is no longer a second Mochi. It is the **Blossom
Sprout**, a Mochi look in which her sprout becomes a tiny blossoming tree with fairy lights.

**Onboarding earns the first capsule.** No 50-coin gift. After picking ≤ 3 habits: *"Anything already done
today?"* lists them with live check buttons. The first check-in ever plays the full choreography and pays a one-time
**First Sprout** top-up that brings the wallet to exactly 25🪙, with the counter visibly rolling up. Mochi hops toward
Capsules. The user picks **Kitty Capsule or Moo Moo Milk Bar**, inserts the coin and turns the crank; the result is a
guaranteed Classic or Special **pet** from that series. If she chooses "Not yet, I'll earn it", Today shows a pinned card, "Your
first capsule: check in anything ✨", which pays the same top-up on the first real check-in. Every new pet gets a
**first hello**: it walks into the meadow and nose-boops Mochi. Naming offers 5 species-specific suggestions plus a 🎲
reroll (`NAME_SUGGESTIONS`). Onboarding also asks (optionally) "Night owl? Your day can end at 3 am" and "Birthday? (for
cake 🎂)".

**Blind-box language.** Display tiers are **Classic · Special · Rare · Super rare**, plus the series **Secret** (a
sparkling "?" on the lineup card). Lineup cards look like gashapon leaflets, with checkmarks on owned items.

**Species are species** (pairs with 13.1). Meadow scale: hamster 0.65× · frog 0.8× · duck 0.85× · bunny 0.9× · cat 1.0× ·
dog 1.05× · cow 1.25× · bear 1.3×. Signature idles: cats loaf and knead on soft decor and do zoomies at golden hour; cows
graze with a chewing jaw, lie in a "cow loaf", swish their tails and jingle as they walk; bunnies binky and flop; frogs
sit on lily pads and catch fireflies at night; ducks waddle, and other ducks fall in line behind them; hamsters inflate
their cheeks when fed and pop out of planter pots; bears scratch their backs on the big tree; dogs wag, fetch tennis balls
and roll over. **Cross-pet vignettes** (when two idle pets are close; 20% per idle tick; 60 s cooldown): a cat naps on a
cow's back; a nap pile at night; a duck parade; a bunny nibbles a planter leaf, which grows back with a sparkle (plants
are never damaged). **Toys** (`TOY_IDS`): Playful and Curious pets walk over and play. Voices are Animal-Crossing-style
blips (60–90 ms syllables at a species base pitch: hamster 880 Hz, bunny 740, cat 660 with an upward bend, duck 520 nasal,
frog 330 double pulse, cow 196 low-passed with 5 Hz vibrato, bear 165, dog 440 with a quick "arf" envelope), shaped by
personality. No realism. Acceptance: every species is identifiable as a flat silhouette at 32 px.

**Touch vocabulary** (Meadow): *tap* → bounce + hearts; *stroke* (drag ≥ 40 px across the body) → a happy squint and
purr (a cow leans in and rings its bell), with hearts along the finger path; *boop* (tap in the top 30% face zone) → a cat
blep, a cow nose-lick, a bunny ear flop; *carry* (300 ms long-press) → lift the pet, feet dangling on a springy pendulum,
then a squash on drop, and it stays where you put it; *gaze* → pupils follow the finger or pointer within 150 px. Stroke and boop
share the 5 XP/day petting cap, but the reactions are unlimited. The Pet Sheet opens from a **name tag** that floats up
after any tap. **Evenings are cozy**: 20:00–23:00 pets gather by a lantern, wear owned pajamas (an optional preference) and
stargaze. Sleep is 23:00–06:00. Tapping a sleeping pet gets a yawn, a stretch and a slow blink, never grumpiness.

**Friendship (overrides 13.7 thresholds).** Levels 1–10 at `0, 20, 50, 100, 170, 260, 380, 540, 750, 1000` XP, then
bond levels 11–15 at `1300, 1650, 2050, 2500, 3000`. Levels change behavior: L2 waves · L3 uses your name · L4 claims a
favorite spot · L5 twirls · **L6 leaves a small gift under the tree** on days you check in (a clover, 1 stardust, or a flower;
gifts never expire and never pile up as a chore) · L7 heart-eyes · L8 naps next to the buddy · L10 Best Friends crown. After
L10, every 150 XP adds a dated **Memory** polaroid generated from real events ("The day we met, Sep 29"). Only the first
favorite treat each day pays +12.

**Pantry & harvest (refines 13.7).** Each owned treat recipe restocks **2 free servings every morning (bank up to 5)**.
**Harvest**: a completing check-in on a Blooming-or-later plant drops one serving of that plant's harvest treat
(`HARVEST_BY_PLANT`) into the basket by the tree (at most 1 per plant per day), which ties the garden to the pets. Favorite
hints can point at plants ("Loves something from a lemon tree 🍋"). *Bake a tray* (5 servings for 10🪙) stays optional.

**Plants keep living** (pairs with 13.1/13.4). Multi-stage jumps play as a quick time-lapse (150 ms per stage). After
Evergreen, **Flourishes** arrive every +60 sunshine, one of 8 permanent visitors: ladybug, bee, butterfly, snail in a tiny hat,
fairy lights, birdhouse, seasonal blossoms, rainbow ribbon. An archived habit's plant moves to a **Greenhouse shelf** as a
permanent trophy, and Delete asks "Keep the plant in the greenhouse?" (default yes).

**Windowsill (Today header).** A 168 px scene band that collapses to 64 px on scroll (sticky, scroll-linked). The buddy
sits on the sill beside today's habit pots (up to 6, with more in a horizontal scroll). After a check-in, without blocking taps,
the buddy hops to that pot and tips a tiny watering can. The pot drips and grows one step. Rapid check-ins coalesce: only
the latest pot is watered and the others sparkle. On a perfect day every pot blooms at once and the buddy dances. Tapping
the window zooms into the Meadow (View Transitions where supported, else a crossfade). The habit's icon sits on a little
**garden-stake marker** in its pot, so each card has one combined visual. **Compact Today** (a preference) hides the band.

**Rituals (override 13.5 letter/bloom stars).**
* **Weekly Letter**, written by the buddy in its personality voice, arrives as an envelope sealed with wax stamped with
  its paw print (a hoof for cows); tapping it unfolds the letter (600 ms). Contents: a greeting, two data highlights (top habit
  by check-ins, a plant stage-up, a new friend), a quoted note if one exists, and a P.S. with a doodle of the buddy doing
  your top habit (12 activity doodles). The letter never shows a percentage on its face. Stars: **1★ for any check-in that
  week, +1★ at ≥ 60%, +1★ at ≥ 85%** (the bonus tiers need ≥ 5 expected; upward top-ups as in 13.5). Letters are kept forever
  in a **Letterbox** in Progress.
* **Monthly Bouquet** (always given, no threshold): on the first open of a new month, every habit with ≥ 1 check-in adds
  `clamp(round(checkIns/4), 1, 7)` stems of its plant species. Non-flowering species add a sprig instead. The stems are wrapped in paper in that month's color
  and placed on a **Bouquet Shelf** in Progress (12 per year). Stars: **1★ for showing up, +1★ ≥ 70%, +1★ ≥ 85%, +1★
  Growing** (≥ 5 pts above the previous month); the bonus tiers need ≥ 10 expected.
* **Birthday** (optional): on the day, every meadow pet wears a party hat, a cake decor appears, each pet leaves a
  one-line card, and she gets 1 ticket plus the exclusive Party Hat and Birthday Cake. Each pet's "gotcha day" gets a bow and a
  line. The install anniversary brings a "Meadow-versary" letter from Mochi.
* A lower month shows its **best fact** instead ("62 check-ins in September. Walks were your steadiest 🌿"). It never
  prints the higher previous number.
* The Night owl badge is replaced by **Wind-Down** (3 check-ins between 19:00 and 22:00), because late-night phone use isn't
  something to reward. "Date night" is renamed **Quality time** (partner, friends, or just you).

**Creativity.** Decor is freeform: drag anywhere, flip, depth-sorted with pets, up to 24 per zone, with sky decor on its
own layer. **Seasonal meadow skins** follow the season table: falling leaves and pumpkins; snow; sakura petals; rain and
puddles (ducks splash); summer fireflies. **Photo Studio** (stretch): choose up to 4 pets, "Say cheese", 5 frames, stickers
and a caption, output 9:16, 4:5 or 1:1, saved to a Scrapbook in IndexedDB. Postcards that send a visiting pet to a friend are v2.

**Voice & copy.** `docs/VOICE.md` is the copy deck and `src/catalog/lines.ts` is the line matrix (10 personalities × 12
contexts × ≥ 4 lines, 60 Mochi lines, 30 data-aware templates; no line repeats within the last 5 used in a context).
The register is warm and dry, like a millennial group chat. Currency and rarity symbols are inline SVG tokens (`{coin}`,
`{star}`, `{dust}`, `{ticket}`), never 🪙 in copy. Decorative emoji: at most one per string, from Emoji ≤ 12.0.

### 13.11 Accessibility, legibility & calm (from the a11y + judge reviews, adopted)

**Contrast (enforced by `tests/unit/contrast.test.ts`).** Every text pair is ≥ 4.5:1 and every UI pair ≥ 3:1, in both themes.
Labels and icons on any −500 face (candy buttons, pills, chips, price tags) use `--on-accent` (#3A2A33), never white and
never inherited ink. `--ink-3` is readable secondary text. `--ink-disabled` is for disabled/decorative marks only.
`--focus` draws the 3px focus ring (with a 2px card halo). `--control-border` draws unchecked rings, input borders and
toggle tracks. Text over illustrated scenes sits on a `--card` chip at 85% opacity (radius 16), never directly on sky.
Currency icons always carry the cocoa outline, even at 16px.

**Never color or motion alone.** Capsule shells carry **static patterns** that survive reduced motion: Classic solid ·
Special two-tone with a white seam · Rare star-speckled with a butter band · Super rare holographic stripes · Secret
holo stripes with an embossed "?". Rarity pills always print the tier word. Unowned collectibles get a dashed outline
and a "?", and unearned badges are outline-only medals. **Day-state glyphs** are shared by the week strip, calendar, quilt
and detail views: done = sage disk + check; tiny = sage-300 disk + check; partial = sage arc on a track; none = a dashed
control-border ring (never red, never ✕); rest/off = lavender moon; paused = small leaf; unscheduled = numeral only;
future = ink-3 numeral, not focusable; today = bold numeral + dot, `aria-current="date"`.

**Screen-reader & keyboard contract.** Target-1 habits are a `<button aria-pressed>` named with the habit, and the subtitle
is attached via `aria-describedby`. Count habits: "Add 1 glass to Drink water" with "5 of 8 glasses" described. Once met:
"Drink water, done, adjust count". Every long-press, stroke, drag or carry has a button or menu equivalent. The week strip is a
`radiogroup` with roving tabindex ("Saturday, September 27, 3 of 5 done"). Day progress is a `progressbar` with
`aria-valuetext` ("3 of 5 done today"). Capsule flow: after Insert, focus moves to "Turn the crank" (activating it
auto-turns), then to "Open capsule, Rare shell". Each crack is announced, and the reveal is announced as a sentence. The live region
announces once per burst, after 1.2 s of quiet ("Walk and Read done, plus 10 coins").

**Today layout budget.** At scroll 0 the first habit card starts ≤ `safe-area-top + 260px` on 393×852 and 375×667 (a
Playwright assertion). The greeting, date and wallet pill live *inside* the windowsill band (greeting top-left, wallet
top-right). The day progress is a vine along the sill ledge with a chip ("3 of 5 · +18{coin}"). Collapsed band (64 px): short
date, mini progress ring, wallet. The week strip is 56 px (letter above a 32 px ring with the numeral). Monthly habits that
aren't met yet sit in one collapsible "This month" row at the end. The ⋯ button has a 44×44 hit area, ≥ 8 px from the check
button. Grouping is computed on load and on day change, never on tap, so the list never jumps.

**Backdating is never silent.** A selected past day shows a sticky 44 px lavender banner, "Logging for Sat, Sep 27 · Back
to today". The list background shifts to `--bg-2`, button names end "for Saturday", and Undo reads "Logged for Sat · Undo". The
selection resets on day rollover, after ≥ 60 s hidden, and on leaving Today. The strip draws a hairline gap at the week-start boundary.

**Legible economy.** Sunshine is never shown as a number: Habit Detail says "4 more check-ins to Blooming". Stardust is
always the jar icon and shows as a 10-segment ring around the star ("7/10 to your next star"). The **Wallet sheet**
("What can I get?") gives live lines: "75 coins → 3 capsules", "5 stars → 1 Dreamy Night pull, or wish for any Classic",
"1 ticket → a free pull on any machine", "7/10 stardust → your next star". The first time each resource is earned, its
celebration includes a ≤ 12-word explainer. The check-in that first reaches the capsule price shows "+5 · capsule ready!"
(once a day, not under Quiet rewards).

**Celebration queue** (`fx/celebrationQueue.ts`). All events caused by one action (within 1200 ms) merge into one banner
("Perfect day! Walk is Blooming · +40{coin} +2{star}"). Only the highest-priority event gets the big effect: plant
Blooming/Evergreen > Showing-up rung > perfect day > streak rung > badge > friendship level > period goal. At most one confetti per
action. One banner at a time, anchored in the windowsill band (never over the list or the tab bar), 3.5 s, tap or swipe
up to dismiss. **Burst rule**: a completing check-in within 1.2 s of the previous one still plays its own card squish, check, chip and haptic, but only one
coin flies at a time (later amounts join it and the counter rolls once), and the buddy hops at most once per 1.2 s.
**Rising chime**: within a session, the n-th check-in's chime climbs the E-major pentatonic (E5 F♯5 G♯5 B5 C♯6 E6…).
**Nothing opens modally at launch.** Letters and bouquets arrive on the windowsill ("You've got a letter") and open on tap.

**Reduced motion (mapping).** Check-in: instant fill, the chip fades in place, no squish/particles/flight. Crank: static dome,
300 ms crossfade to the capsule. Reveal: 200 ms fade, a static glow, no confetti or shake. Rarity: static patterns only. Easing:
no overshoot. Sheets: opacity + ≤ 8 px translate. Meadow and windowsill: pets hold poses and relocate by crossfade at most
once per 30 s, and clouds/fireflies/particles are off. Blinking and breathing (≤ 1.5% scale) stay. `fx/motion.ts` exports a `motion`
signal mirrored to `<html data-motion>`.

**Dynamic Type.** The root follows iOS text size (`font: -apple-system-body`, 17 px default). Display sizes are capped
(`min(2rem, 48px)` etc.). If the root is ≥ 21 px, `<html data-type="large">` hides tab labels (the icons keep their names), lets the
week strip scroll, stacks card subtitles, and grows the check button to max(48px, 2.5rem). There must be no horizontal overflow at 320 px or at
200% zoom.

**Onboarding ≤ 90 s** to the first pull, every step skippable: the intro capsule (a 2 s animation, not a pull) with an optional
name on the same screen → 8 starter chips (max 3, "Start small. You can add more anytime.", editable inline) → "Anything
already done today?" → first check-in → top-up → pick a series → pull. The explainer moves to You › About › "How it works".
Day-start time and birthday move out of onboarding (into Preferences and Profile).

**Rests in numbers.** "26 of 28 days · 2 rests 🌙" under "Last 30 days"; aggregate "…· 2 days off". Letters mention rests only
as a positive fact. Rolling windows end today if today already counts, else yesterday.

**Card status line** (first match wins, after the anchor): count in progress "5/8 glasses" · tiny logged "Tiny version ✓" ·
flexible "2 of 3 this week · 1 more by Sun" / "Done for the week ✓" · streak ≥ 3 "12 days" ("12 in a row" for day-sets,
"Kept it up 12 days" for avoid) · ≥ 10 expected "26 of the last 30 days" · otherwise "Just planted 🌱".

**Secrets & visibility.** On lineups, albums and the Well, unowned items show their real art at 35% saturation with a dashed
outline and "not yet". Only the Secret is a sparkling "?" ("1 secret friend hides in this series"). A seasonal series not yet
visited shows only its leaflet cover. The Well shows an unowned Secret as a "?" tile, and granting it plays the full reveal.
Moonlit variants have their own album page. In a Dreamy pull that rolls Rare, all eligible moonlit variants share **one**
rare slot's weight.

**Backup nudges** start on the 14th show-up day, then come every ≥ 30 days *and* ≥ 10 new show-up days (never for dormant users),
as a soft dismissible card after a check-in, never modal. You › Data shows "Last backup: 12 days ago" and "Your
meadow lives on this device. Removing the app from your Home Screen removes it too." Troubleshooting never suggests
reinstalling.

**Quilt.** Under 600 px it is a horizontally scrolling strip (14 px patches, month initials, opening at the current week). At 600 px and up
it shows the full 53×7 grid. Days before `startedOn` aren't drawn. Month bands open the calendar. The grid is aria-hidden with a text summary.

---

## 14. The three cozy-game pillars (client directive: Animal Crossing × Stardew Valley × Pokémon)

**Method.** Four researchers (one per game plus cross-game motivation data) → three designers with different angles
(habit-first, creativity-first, restraint) → a jury (a gimmick detector, a habit-centrality judge, and a target-user
panel of an Animal Crossing regular, a Stardew devotee and a Pokémon GO/Sleep player). All three designers arrived
independently at pillar 1, and all three judges ranked the same three pillars highest. The evidence is in the research digest
(`AUDITS.md`). The one rule: **every pillar is driven by real habit data and makes the tracker itself more meaningful
or more useful.** None of them references a game for its own sake, and each draws on more than one game.

### 14.1 Keeping Company (AC's neighbors who know you · Pokémon's buddy · Stardew's heart events)

*The need: to be noticed and remembered by someone who shares your routine.* Pocket Camp (> 75% women) and
Finch (~75% women, 25–35) run on exactly this. Here, relatedness is attached to **one specific habit**, not to "the app".

* **Pairing.** Any pet may keep **one** habit company, and each habit has at most one companion. It is optional. Habits without one
  use the buddy, so with no companions set the app behaves exactly as before. Pairing is offered in three places: after naming at a capsule reveal,
  worded as the pet's wish ("Which habit can I help with?"), at most once per app day and never again after 3 declines;
  in the Habit Editor ("Who keeps you company?"); and on the Pet Sheet.
* **On the tracker.** The companion appears on the windowsill only to water *its* pot, then goes back. A face of 20 px or less
  peeks from the card's pot, hidden in Compact Today and by a *Show companions* preference. There are no persistent peeks behind
  every sill pot and no trinkets on the sill: the header stays the tracker's.
* **Friendship through the habit.** Each completing check-in of its habit gives the companion
  `min(30, round(5 × 7 / expectedPerWeek))` XP, so monthly habits progress too. This replaces the old "buddy +1 per
  check-in" rule, with a cap of 30 XP per pet per day from habits.
* **Three stories**, unlocked only by **companion sunshine** (sunshine the habit grew while this pet kept it company).
  Petting and treats can never unlock a habit's story. The stories: **The start** (~1 week), **Why it matters** (~3 weeks;
  it asks *once* and stores the answer in `Habit.why`, ≤ 140 chars, which is also editable in the Habit Editor from day 0, so a
  why never depends on owning a pet; if it's already filled, the story reflects it back instead of asking), and **Look at us** (at
  Blooming; it quotes one or two of her Moments and creates a Memory polaroid). The why appears at the top of Habit Detail, and
  a Letter P.S. quotes it on a rotation, never triggered by a lower week.
* **Keepsakes.** When the habit's plant reaches Seedling, Budding, Blooming and Evergreen, the companion brings a dated
  keepsake from one of **12 activity families** (move, read, hydrate, rest, mind, create, tidy, cook, care, garden,
  connect, plan; mapped from the habit icon), 3 designs each, plus one universal Evergreen golden seed (37 small SVGs). The
  caption is prefilled from her latest Moment and editable. Keepsakes are placeable in the meadow and never a currency. **The same
  activity-family art** draws the Letter doodles and the meadow hobby props, so it's one art set used three ways.
* **Hobbies.** On days the habit was done, the companion visibly *does* it in the meadow (reads under the tree, does laps,
  waters flowers…), and from Blooming on the hobby becomes permanent. The meadow shows presence only. **A missed day looks exactly
  like an ordinary day** (acceptance test).
* **Copy.** Companion lines fire only on positive events. A lint test on the line matrix fails the build on absence, gap,
  missed-day or percentage wording. Positioning versus Finch: a witness *for each habit*, not a generic pet that grows from goals.

### 14.2 Blooms Like You (Pokémon's branching evolution · AC's hybrid flowers) + Garden Journal + habit stacking

*The need: to see yourself in what you tend.* Plants are the product's core metaphor, so the tracker's richest quiet data
(when she checks in, how often the tiny version carried her, which habits she keeps together) becomes the art she already looks at every day.

* **The look**, computed when a plant first reaches Blooming and re-read at Evergreen. Looks are only ever *added*, and she
  chooses which one shows (Classic is always available). There are two axes only:
  * **Colour** from when she usually checks in: **Dawn · Sunlit · Twilight · Wildflower** (fits it in anytime). The classifier
    uses live `at` stamps only, drops catch-up bursts (≥ 3 habits within 120 s) and 23:00–03:59, and needs ≥ 10 eligible
    days (otherwise Wildflower).
  * **Shape**: **Classic · Petite** (tiny version on ≥ 25% of days and ≥ 5 tiny days) **· Paired** (stacked with an anchor habit
    on ≥ 14 kept-together days). Paired petals pick up the partner habit's card colour, paired pots sit side by side on the
    shelf, and a bee visits them (static under reduced motion).
  * **No performance-graded looks** (no "Steady" for high consistency), no title words, no collection counter. It pays nothing.
  * A **plant tag** in Habit Detail explains the look in plain words ("Dawn · Paired: you usually check it in before 9,
    and 18 days you did it right after Walk").
  * A mismatch becomes useful: "You set Walk for mornings but usually check it in after 6 pm. Move it to Evening?" (one
    tap, never automatic).
* **Garden Journal** (Habit Detail): at most 5 plain sentences that ink in from week 2: usual time, steadiest weekday, tiny
  saves, kept-together count, and why it looks like this. Up to 2 pencil placeholders say when they'll fill in, and there is no
  completeness count. A forecast in check-ins, never a deadline: "3 more walks to Blooming, around Oct 14" (only with ≥ 4
  check-ins in the last 28 days). These are pure, unit-tested domain functions (`domain/journal.ts`, `domain/signature.ts`).
* **Habit stacking** is a plain tracker feature from day 1. `Habit.anchorHabitId` makes the follower sort right after its anchor on
  Today, with the line "After Walk" and a kept-together count.
* **Damp soil.** Pots show dark, dewy soil when done today (windowsill + cards), giving a glanceable checklist with no numbers.
  There is **no dry or negative state**.

### 14.3 Season Review (Stardew's seasons as chapters · AC's real calendar)

*The need: a gentle fresh start at a real landmark.* Habit lists that go stale, bloat or quietly die are the biggest reason
trackers get abandoned. This is the only pillar that changes *which* habits she keeps and *how big* they are.

* **Hemisphere-correct seasons.** "Where's your summer?" is inferred from the time zone and editable. Meadow skins follow her 4
  seasons. Capsule series keep their fixed calendar dates.
* On the **first open of each new season**, a Today card (never modal, waits indefinitely, skippable, ≤ 15 s): a
  time-lapse of up to 8 plants through the season just ended, with companions beside their plants and captions in counts
  only (before and after stills under reduced motion). A quieter season shows only its best facts.
* **Fresh-start chips** for every active habit: **Keep going** (preselected) · **Tinier** · **Grow** (only if eligible; +1★
  as graduation) · **Rest till next season** (a pause that ends on the next season's first day) · **Finish** (moves to the
  Greenhouse with a ribbon). There's a one-tap **Keep everything**. Habits with zero check-ins that season stay out of the time-lapse
  but are in the chips, with neutral copy.
* **"Just this season"** habits (`Habit.endsOn`) auto-archive to the Greenhouse with a chapter ribbon and are never shown as
  incomplete.
* The same review is reachable at any time: **Tune my habits** (Progress and Habit Detail).
* It pays nothing beyond Grow's +1★. Seasons that passed without an open are filed silently. It queues after the Monthly
  Bouquet so two rituals never stack.
* **Progress gets simpler.** Letterbox, Bouquet shelf, Greenhouse and Seasons merge into one **Memory shelf**.
* The demo meadow includes a pending review so it can be tested on day 1.

### 14.4 Refuted by the jury (not shipping)

Freeform habit pots in the meadow with a second check-in surface (a fourth home for plants, and an ambient to-do list), zone
bundles unlocked with keepsakes (Stardew's Community Center in costume, gating nothing), title words, the consistency-graded
"Steady" bloom, escalating shared-petal tiers, a notes-for-cosmetics "Storybook" look, friendship-gated stories (farmable
by petting), one pet keeping several habits, and a daily forecast bubble (it repeats the tracker). v1.1 candidates: a season
wreath and calendar markers.

### 14.5 Data additions

`Habit.why?` (≤ 140, replaces `notes`) · `Habit.anchorHabitId?` · `Habit.endsOn?` · `Habit.companionId?` ·
`ledger.companionSun[habitId|petId]` · `keepsakes[]` ({id, habitId, petId, family, design, stage, date, caption, placed?}) ·
`plantLooks[habitId]` ({earned: {color, shape, pairColor?}[], chosen}) · `settings.hemisphere` ('north' | 'south') ·
`settings.showCompanions` · once-keys `story|<habitId>|<n>`, `keepsake|<habitId>|<stage>`, `season|<YYYY>-<season>` ·
PlantArt props `bloomColor`, `bloomShape`, `pairColor`, `damp`.

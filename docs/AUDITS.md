# Adversarial Audit Log

Mochi Meadow is built in milestones. At each one, independent reviewers try to find what is
wrong with the work, and a second wave of skeptics tries to refute each finding. Only findings
that survive refutation are acted on. This log records what was found and what changed.

| Milestone | Scope | Method |
|---|---|---|
| M0 | Design spec | 6 lens critics (delight, habit science, economy, iOS PWA, a11y/UX, competition judge) → 6 skeptics |
| M1 | Domain logic + art systems | Per-module adversarial review with rendered screenshots, edge-case hunts, fix round |
| M2 | Integrated app | Multi-lens experience review (flows, visuals, a11y, performance) with verification |
| M3 | Release candidate | Judges' panel scoring + top-issue fixes |

---

## M0: Design spec audit

**Method.** Six critics (target-user delight, habit science, game economy, iOS/macOS PWA feasibility, accessibility &
UX, competition judge) each read the concept and the spec independently. One skeptic per critic then tried to
refute every finding. Only findings that survived were acted on.

**Result.** 72 findings: **51 accepted** (12 a11y/UX, 11 delight, 11 iOS/PWA, 8 judge, 6 habit science, 3 economy),
**21 rejected**, mostly because §13.2–13.10 (written from the earliest critic reports while the skeptics ran) had
already fixed them. Headline changes:

| Area | What the audit caught | What changed |
|---|---|---|
| Habit history | Editing a schedule/target rewrote all history, shrank plants and re-paid milestones | Versioned `rules[]`: every day is judged by the rule in effect then (§13.2) |
| Period math | Flexible-period rule was circular and could shrink plants when a period closed | Monotone `expected = max(target, achieved)`, shortfall-only current period (§13.3) |
| Growth | "Monotonic" sunshine was actually recomputed and could fall | Sunshine ledger + best-stage high-water mark; ≤ 1 stage per check-in (§13.4) |
| Economy | Streak rewards unreachable for honest daily habits yet farmable by monthly ones; collection exhausted by month 6–12; rarity inverted | Account-level Showing-up ladder, coin-only rungs, zones as a long-term goal, re-tiered series with Secrets, moonlit variants (§13.5–13.7) |
| iOS reality | Safari-tab data is not carried into the installed app; programmatic switch haptics closed in iOS 26.5; `.ics` blob downloads fail in standalone | Install-first gate + MM1 clipboard handoff; HapticTap overlay; static calendar files (§13.8) |
| Accessibility | Night-theme button text 1.4–2.3:1; several "AA" accents failed; no screen-reader contract for the crank or week strip | `--on-accent`, fixed tokens, contrast test (112 pairs), SR/keyboard contract, day-state glyphs (§13.11) |
| Delight | First capsule was a gift, not a payoff; mascot undefined; plants static for weeks; no copy deck | Earned first capsule, character sheet, continuous growth, rituals, voice deck (§13.10) |

The mascot direction that came out of this audit was later rejected by the client ("done many times"). See the
creative re-direction entry below.

## Cozy-game pillars (client directive: Animal Crossing × Stardew × Pokémon)

**Method.** 4 researchers (with web sources) → 3 designers (habit-first, creativity-first, restraint) → 3 judges
(gimmick detector, habit-centrality, target-user panel). **Result:** unanimous top three. Keeping Company (all three
designers proposed it independently), Blooms Like You with the Garden Journal and habit stacking, and Season Review. Ten
proposals were refuted as gimmicks or off-center (see DESIGN §14.4). Key evidence cited: Pocket Camp > 75% women (Nintendo
IR, Feb 2018); Quantic Foundry: women over-index on Design, Fantasy, Story and Completion; New Horizons satisfied
autonomy/competence/relatedness (Yee & Sng 2022).

## Creative re-direction: from Mochi Meadow to catkin

**Trigger.** The client rejected the mascot-led "Mochi Meadow" direction: "It's been done so many times in different
ways. Come up with something novel, yet relatable. Nothing cheesy. No gimmicks."

**Method.** Five concept teams each pitched a complete identity (name, world, character model, art language, voice).
A jury scored each on novelty, relatability, anti-cheese, habit centrality, craft ceiling and fit with the concept
file. A separate visual jury rendered style frames for the top three and critiqued the crops.

| Concept | Jury total | Verdict |
|---|---|---|
| catkin: a windowsill of houseplants propagated from habits, real animals that never speak | **261.5** | Adopted |
| Everyday objects at pet scale | 243.5 | Grafted: capsule-scale household decor, found-object wearables |
| Craft / paper-cut studio | 242 | Grafted: paper inserts, print finishes per rarity |
| Companion-first (one animal, deep bond) | 231 | Grafted: residency (a pet keeps a habit company) |
| A place (village map) | 214 | Rejected: pulls attention away from the habits |

The visual jury recommended the catkin world with the "Good Light" treatment: one window, one sunbeam, flat matte
shapes without outlines, and precomputed lavender shade crescents.

**What changed.**
- The name and brand became catkin (DESIGN §1).
- There is no mascot. The animals never speak, and copy never gives a pet a pronoun.
- Real breeds make up at least 70% of pets; fantasy lives only in colour and pattern.
- The catalog is pet-safe: no chocolate, cats eat only cat grass and catnip, and there are no lilies.
- The currencies were renamed: Stamps replace stars, Swaps replace stardust, and Special Order replaces the Wishing Well.
- The capsule series were renumbered No. 01–07, with five seasonal editions.
- The meadow zones became Places on the Shelf.

The catalog tests now enforce the voice, pronoun, pet-safety and real-breed rules, so a regression fails the build.

## M1: integration audit (art coherence, logic, screen contracts, voice, build)

**Method.** Once every module was merged, five independent auditors each checked the build from one angle:

| Auditor | What it did |
|---|---|
| Art | Shot 60+ gallery screenshots and judged the modules as one world |
| Logic | Ran the real store API end to end over 70 simulated days, a reload and a backup round trip |
| Contracts | Mapped every screen element against the view models, store, art and copy |
| Voice and brand | Ran the copy lint across all of `src`, grepped for old-brand leftovers and checked the "Many animals" rule |
| Build | Checked PWA and single-file builds, bundle sizes, file:// launch, axe-core accessibility, keyboard, reduced motion and frame times |

A triage lead then deduplicated about 95 raw findings down to 66, verified the key ones and assigned each one to a single fix area.

**What held up.**
- Every module speaks one art language, with the shade on the correct side for each light.
- The economy runs at the pace DESIGN §6 intends: 24.7–30.8 coins a day, about one capsule a day. No invariant broke over 70 days.
- A reload and the `CK1:` backup round trip restore the save exactly.
- axe-core found 0 accessibility violations on 20 route, theme and width combinations.
- The single file opens from `file://` with no console errors, and the service worker works offline.

**What it caught: 7 blockers.**
- The first pick worked only for Cats and Cows. Dogs and Pond were refused.
- The logic and the art disagreed about what "blooms" means, so blooming plants lost their flowers.
- Pets had no place, and the scenes had no way to tap or carry a pet.
- The view models built English that VOICE.md bans, such as "2 more by Sun" and "Done for the week ✓".
- Three routes were still placeholders.
- DESIGN.md contradicted itself: two cabinets against four, a cat-only icon against "Many animals", and "Find them a place".

**The majors clustered in six areas:**
- scene geometry and occlusion (decor hiding the habit pots, a second window from the Window Seat, lamplight not coming from one lamp);
- "Many animals" (the calf missing from the icon, the Shelf tab not showing your own pet, cat-heavy demo casts);
- the celebration layer ignoring the new events;
- first-paint bundle size (the art library loads at startup: 304 KB gzipped, and could be about 68% smaller);
- an empty e2e harness;
- a copy lint that only scanned `src/catalog`.

**What changed.** The fixes run in four isolated fix areas (logic, art, UI and build), each with an adversarial recheck. The two screen-level findings go to the wave 2 screen builders, along with the contract map.

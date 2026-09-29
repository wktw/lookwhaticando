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

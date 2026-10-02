# catkin: handoff report

Written 2 October 2026 for the next agent (Astra). Read this whole file first, then `docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`. This report is the state of the project and the working method; the plan is the detailed spec for what remains.

## 1. What the project is

**catkin** is a habit-tracking app for iPhone and Mac, built as a PWA: Preact 10, strict TypeScript, @preact/signals, Vite 7, CSS Modules, vite-plugin-pwa (Workbox) and vite-plugin-singlefile. It is meant to be a competition-grade entry for millennial women: cute, nurturing, progress-oriented, with cats, cows, dogs, bunnies, frogs, ducks, hamsters and bears (88 pets across 8 species), plants and small rituals. It must be testable on a PC. The owner's wife wrote the concept (`docs/ORIGINAL_CONCEPT.md`). The first working name was Mochi Meadow; it was replaced by **catkin** (a deliberately non-cheesy direction).

The owner (GitHub user `wktw`) has delegated every product decision to the agent. They are not an engineer, they ask for plain-language status, and they want honesty about what is and is not verified.

**Art:** all code-drawn SVG, in a "printed miniature, lit by one window" language: flat matte shapes, no outlines, hard lavender shade crescents precomputed per pose, facing and light, with Lamplight at night. **Hard rule from the owner: avoid anything that needs a human illustrator.** No AI-generated or raster art. A six-direction style exploration was run and the conclusion was to keep the current look (four ideas to graft are listed in section 8).

**Voice:** the copy rules live in `docs/VOICE.md`, and a voice lint test scans all of `src`. Design intent is in `docs/DESIGN.md`.

## 2. Current state (verified)

- **Branch:** all work goes to `claude/eloquent-hawking-v69lhr`. Local HEAD is `2f0c790`, equal to `origin`. There is **no PR open** and none should be created unless the owner asks. (PR #1 from a parallel session was merged earlier.)
- **Last full local gate on this exact tree** (`TZ=UTC npm run check`, exit 0): typecheck clean; **3,544 unit tests passed** (1 skipped); **first-paint JS 133.6 KB gzip** against a 150 KB budget; `build:single` OK; **e2e (preview build) 320 passed**, 0 failed.
- **Not yet confirmed:** GitHub's own CI run on `2f0c790`. Look at it first thing (`mcp__github__actions_list`, branch filter). Earlier GitHub runs have caught problems that passed locally (see section 6).
- Working tree is clean. No work is running. All scheduled check-ins were deleted. Nothing will start on its own.
- Uncommitted: nothing, apart from this file once you commit it.

### Backup branches on GitHub (in-progress tracks, all already merged into main)
`track/save` (`5d0e64e`), `track/history` (`b2b963c`), `track/screens` (`546fe71`), `track/diet` (`2681cdf`). Their work is fully contained in main, so they are only references. Local worktrees `/home/user/wt/{save,history,screens,diet}` may not exist in a new container; recreate with `git worktree add -b <name> /home/user/wt/<name> <commit>` and symlink `node_modules` from the main checkout.

## 3. Standing constraints (do not violate)

1. Develop on and push **only** to `claude/eloquent-hawking-v69lhr`. Use `git push -u origin <branch>`; retry on network failure only (2s, 4s, 8s, 16s).
2. **No PR unless asked.** Never reset, rebase, force-push, or discard another agent's work; merge instead.
3. Use the `mcp__github__*` tools, not `gh`.
4. End every commit message with the attribution lines your own session's system reminder specifies. Do not put model identifiers anywhere else (commits bodies, code comments, docs).
5. **Never skip, disable or weaken a test** to get green. A failure is a real finding or a timing problem to be fixed properly.
6. **Never push in the same command as a check.** Read the check's EXIT line first, push only on exit 0. (An earlier slip pushed a failing merge; see section 6.)
7. Never broad-`pkill`: other worktrees run tests. Kill only processes whose `/proc/PID/cwd` is the checkout you own.
8. Subscriptions, pricing, the native iPhone app, App Store submission, age assurance and billing are **parked** by the owner ("worry about subscriptions and that crap later"). Do not start them.
9. Stop hooks complain about uncommitted or unpushed work. That is a reminder, not an order to commit half-finished work. Commit and push when a package passes its gates.

## 4. How the work is organised

### The audit
The owner pushed a two-pass external audit (`docs/audits/CATKIN_COMPREHENSIVE_AUDIT_2026-09-29.md`, ~2,100 lines) and a planning brief (`docs/audits/OPUS_5_5_AUDIT_IMPLEMENTATION_PROMPT.txt`). The plan was written and committed: **`docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`** (about 2,500+ lines). It holds: a coverage matrix of every audit finding with its status, 14 shared root causes, **46 work packages (WP-xx)** each with files, design, tests and rollback, a validation plan, a roadmap, and the decision register (§7.2, rows DEC-*). Every implemented package has a **Status note** under its heading recording what was done, where it departs from the design, and what is left. Read those notes: they record behaviours you must build on (for example the ownership signal values, `retireQueue()` fencing, envelope `gen`, the one `adopt()` routine, the `replaceSave` protocol).

### The method that has worked (keep using it)
For each package: **build failing-first** (write the regression tests, prove they fail on the old code), commit; then **two adversarial reviewers** (one for data loss and races, one for plan coverage and test quality, verified by mutation); then a **fix** step that verifies each finding, fixes it with a test shown failing first, runs the **full gate**, and commits. Then merge into main, run the full gate again on the merged tree, push on exit 0, and confirm GitHub CI.

Work runs in parallel in separate git worktrees (one track each) so tracks never edit the same checkout; the main checkout is **integration only**. Four tracks were used: save (WP-A), history (WP-B), screens and creative (WP-C and D), and a one-off size "diet". The previous agent drove these with the `Workflow` tool (JavaScript scripts that call `agent()`); those scripts live under `/root/.claude/...` and may not exist for you. You can reproduce the pattern with the `Agent` tool or by hand. Three tracks in parallel was the practical ceiling on a 4-CPU container.

### Merging tracks
Each track branch merges into main with a `--no-ff` merge commit. Conflicts were frequent and always of two kinds:
- **The plan document's decision table** (§7.2). Resolve by keeping the fuller version of each `| DEC-… |` row. A small script did this; the logic is: for each conflict hunk where every line is a table row, union the rows by their first cell and keep the longer one.
- **Real code overlaps**, mostly `src/state/validate.ts` (the saving track tightened validation; other tracks added fields), `src/domain/habits.ts`, and onboarding. Resolve keeping both sides' intent, then **typecheck and run the affected tests before committing the merge**. Twice a track's tests expected an old return shape of an API another track had changed (`applyImport` now returns `{ ok: true, undo }`); update such tests to the new shape.
- Always run `npm run typecheck` right after a merge: one merge silently dropped a `useState` import that the other side needed.

### First-paint budget
`npm run build && npm run size` measures the gzip size of the entry plus its static imports against **150 KB**. It had crept to 149.9 KB; the diet moved 17 modules (copy decks, recovery and import UI, celebration art, and others) behind `import()` and brought it to 133.6 KB. `tests/unit/build/firstPaintImports.test.ts` (with `staticGraph.ts`) walks the real import graph from `src/main.tsx` and fails if the moved modules drift back. **Check size before merging any package**, and put anything big behind a lazy import.

## 5. Done and remaining

### Merged into main (21 packages + the diet)
- Foundations and earlier waves: design spec, catalog v3 (238 items), restyled art, all four main screens, onboarding, many-animals work, comparison of alternative looks.
- **WP-A1** commit truth and writer fencing (saves never reported as done unless written; retries; stale tabs cannot overwrite). Implemented by a parallel session and merged from PR #1, together with the Shelf-note fix.
- **WP-A2** save identity (`gen`), one `adopt()` routine, a note when another window started over.
- **WP-A3** transactional import, Undo and restore (`replaceSave`; fake-indexeddb added as a dev dependency).
- **WP-A4** one decoder, schema-safe rescue; tested against every save shape any earlier build wrote.
- **WP-A5** validation and resource bounds for imports and loads.
- **WP-A6** import candidate identity and cancellation.
- **WP-A7** visible recovery states (notes for every save state).
- **WP-A8** capsule interaction lifetime and pending-reveal authority.
- **WP-B1** one refund predicate; **B2** sunshine precision contract; **B3** local-clock selectors; **B4** check-in provenance that survives compaction; **B5** lifetime, retirement and cut semantics; **B6** event provenance; **B7** balcony and month-jar consistency.
- **WP-C1** an open editor keeps its day; **C2** cancelled gestures are not releases; **C4** a lazy chunk that cannot load says so and retries (plus a follow-up so screens and onboarding reload to retry); **C5** onboarding truth and ownership; **C7** intent-carrying navigation.
- The first-paint diet (149.9 to 133.6 KB).

### Remaining (about 15% of the app, roughly 5 to 8 hours of agent running time at the old pace)
Queued next, in this order:
1. **WP-A9** "Erase everything on this device" (DEC-P8 was decided **yes**, behind Start over, plus the first Start over dialog's wording). Must not reuse the "started over in another window" note's second sentence, because an erase also removes the daily copies.
2. **WP-B8** history UI capability and gating.
3. **WP-C6** old-note control (remove a note; DEC-P7 recommendation: offer "also remove it from Sunday Notes").
4. **WP-C3** modal-owned transient actions (toasts inside sheets; prototype first, DEC-E5).
5. **WP-D1** watering state truth; **D2** one earned-plant presentation; **D4** truthful catalogue, odds wording and credits.

Then, not yet scheduled: **D3** complete quiet mode (DEC-P6: hide the Capsules tab, keep a direct route and a way back), **D5** friendship behaviour profile (DEC-P9), **D6** honest personalisation (DEC-P11); groundwork **WP-01** portability and CI coverage (Windows), **WP-02** test-tool advisory and dev-server exposure, **WP-03** small independent fixes (an IME guard on name entry and others), **WP-04** shared test harnesses (much of this already exists from A1 to A8); **WP-E1** the web platform-capability layer; **WP-G1** real-browser lifecycle matrix and **WP-G2** scale and long-history tests. Each of these has its full spec in the plan.

Then the finish line: the experience audit (old task "M2": screenshots, accessibility, performance), a judges-panel review and polish ("M3"), the one-line README/doc refresh, and **publishing**. Deployment needs the owner to enable GitHub Pages (Settings, Pages, Source: GitHub Actions) and the code on the default branch; the CI workflow `.github/workflows/ci.yml` already builds `dist-single/catkin.html` as an artifact.

### Parked (owner's instruction)
WP-E2 to E4 (async storage adapter, save identity migration, native feasibility spike), WP-F1 to F4 (entitlements, StoreKit, trial, age assurance), WP-G3 and G4 (physical-device matrix, store submission). The plan holds the specs for when the owner returns to them.

## 6. Hard-won lessons (read before you work)

- **Timing-dependent tests.** The container is slow and often heavily loaded (load average 20 to 35 on 4 CPUs). Perf medians and long art sweeps (`plants.test.tsx`, `you/perf.test.tsx`, `fx/host.test.tsx`) can time out locally. Re-run the failing test alone before concluding anything; GitHub's faster runners have been the better judge for those.
- **The opposite also happens:** a test that passed here failed on GitHub because it read the first `[role="status"]` on the page (a faster machine rendered a different status first). Write assertions that do not depend on ordering.
- **Time-of-day bugs.** The app's day starts at 03:00 and several tests/e2e used the real clock. A fix pinned the clock, but `progress.spec.ts` and `capsules.spec.ts` set time the same way as the one that broke and could hit the same thing around 03:00 UTC.
- **A real Shelf bug** was fixed: the sill note's button could cover a napping pet from late morning to mid-afternoon (rituals are now placed by `sillWorld` and pets keep off them).
- **Merge breakage that passed per-track gates:** `useState` import dropped in `App.tsx`; import result shape changes; a decision-table conflict every time. Always run the full gate on the merged tree.
- **I once pushed a merge whose check had failed** because the push ran in the same command as the check. It was fixed within the hour; do not repeat it.
- Container restarts happen. Committed work survives; uncommitted work in worktrees may not. Commit early on a branch; push track branches as backups (the owner approved this).
- `package.json` test script runs vitest; the voice lint over all `src` takes a while (60 s timeout). `npm run e2e:preview` uses the PWA build; the Playwright projects are phone/desktop by light/dark, plus `two-windows` for cross-window tests. WebKit is not installed here, so Safari-engine coverage is deferred to WP-G1.

## 7. Decisions taken on the owner's behalf (all recorded in the plan's §7.2)

Examples: DEC-P8 erase-everything: yes. DEC-P10 Balcony: suggestions now, auto-settle once with a notice. DEC-P11 personalisation by completion. DEC-P12 history semantics (a) to (h): all decided as recommended. DEC-P13 non-durable snapshots: require the existing no-undo confirmation. DEC-E1: accept every save shape any build ever wrote. DEC-E2: `fake-indexeddb` approved. DEC-E6/E7/E8 and others noted in their rows. Take the plan's recommendation for any remaining DEC row that blocks a package, write "Decided <date> (owner delegated): <what>" in that row, and flag it in your report so the owner can reverse it.

## 8. Things the owner has not yet seen or approved

- **New in-app wording ("DEC-V" rows), marked "pending owner approval" in `docs/VOICE.md`** and present in `src/catalog/lines.ts`. Collect them into one plain list and ask the owner to approve or reword. Known so far: the "started over in another window" note ("catkin was started over in another window, so it starts fresh here too. The daily copies stay on this device."); about ten import, undo and restore messages (VOICE §21, `DATA_COPY`); recovery-state notes and buttons (WP-A7); the Import sheet's reading line (WP-A6); "One moment" load line and load-error sheet copy (WP-C4); onboarding refusals (WP-C5); capsule/order "not saved" notices were already approved on 30 Sep. Search `docs/VOICE.md` for "DEC-V" to list all.
- **Style comparison:** private artifact https://claude.ai/artifact/41FZM9Yp3fhMzYrHkNrgsV (the owner must share it). The jury kept the current look and suggested four grafts: check-in on the tapped plant (the sill as the Mac Today layout), a 7-day stamp row per habit, a weekly tea towel, and Progress swatch rows. These await the owner and their wife's choice.
- **Requested evidence:** `catkin-combined-evidence.zip` (the audit's Windows test log) is not on this machine. Ask for it, or let WP-01's new Windows CI job reveal the crescent-test failure.
- Candidate extra animals noted in DESIGN: lamb, hedgehog.

## 9. Where things are

- `docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`: the plan, status notes, decision register.
- `NOTES-open.md` and the other `NOTES-*.md`: older area-by-area notes; `docs/AUDITS.md`: earlier audit log; `docs/DESIGN.md`: design spec; `docs/VOICE.md`: copy rules and rows.
- Source: `src/state` (store, persist, snapshots, decode, validate, adopt/replace logic), `src/domain` (rules, economy, history), `src/features/*` (screens), `src/art/*` (SVG art), `src/catalog/*` (items and copy; `lines.ts` lazy, `linesCore.ts` first-paint), `src/app` (shell, SheetHosts, lazy loaders), `src/fx` (celebrations). Tests: `tests/unit/**`, colocated `*.test.ts(x)`, `e2e/*.spec.ts`.
- Storage keys: `catkin:v1` (save), `catkin:theme`; the `CK1:` hand-off format.

## 10. Suggested first moves

1. `git fetch`, confirm HEAD is `2f0c790` or later and clean; check GitHub CI on the latest commit and fix anything red first.
2. Read the plan's Status notes (WP-A1 to A8, B1 to B7, C1 to C7), then the sections for WP-A9, B8, C6, C3, D1, D2, D4.
3. Run `npm run build && npm run size` to confirm 133.6 KB.
4. Use the method in section 4. Start with **WP-A9** on the saving side and run **B8** and **C6** in parallel worktrees if the machine is quiet.
5. After each merge: typecheck, full gate, read EXIT, push on 0, confirm CI.
6. Report to the owner in plain language with a percent estimate (they ask often), and keep the list of pending wording approvals.

# Little by Little: handoff report

Updated 2 October 2026. Read this whole file first, then the full [implementation plan](docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md), including every package Status note. This report preserves the working rules; the completion ledger distinguishes the verified code checkpoint from its later documentation checkpoint.

## 1. What the project is

**Little by Little** is the owner-authorized name for this habit-tracking PWA for iPhone and Mac, also testable on a PC. The owner liked “Little by Little” and “Sprout and About”, then delegated the final choice; Little by Little was selected. It remains Preact 10, strict TypeScript, @preact/signals, Vite 7, CSS Modules, Workbox and a single-file build. The original concept is in [docs/ORIGINAL_CONCEPT.md](docs/ORIGINAL_CONCEPT.md).

The app grows plants from habits and makes a home for 88 pets across eight species. All art remains code-drawn SVG in the existing “printed miniature, lit by one window” style. No human illustrator, AI-generated art or new raster illustration is required. Install images are generated from that code art. Voice and design rules remain in [docs/VOICE.md](docs/VOICE.md) and [docs/DESIGN.md](docs/DESIGN.md).

The owner delegates product decisions, wants plain-language progress with a percentage estimate, and wants the list of new wording kept for approval. The name change is authorized; other draft wording is collected in [docs/PENDING_WORDING.md](docs/PENDING_WORDING.md).

**Compatibility:** keep `catkin:*` storage keys, the `catkin` IndexedDB database, `catkin:writer`, backup discriminators, CK0/CK1 handoff formats, calendar identities, manifest identity and the legacy `dist-single/catkin.html` artifact path. These are compatibility identifiers, not the display name. The rename must not strand existing saves or installations.

## 2. Current state and scope

**All 37 authorized numbered web packages are implemented and verified at the code checkpoint below**, with the owner-authorized rename included. The nine parked packages and separate project-review phase remain outside this completion. This report records the verified code checkpoint; its later documentation commit, check, backup and CI are recorded separately in the completion reply and GitHub, without embedding a future self-hash.

**Audit consent resolved:** the owner explicitly answered “Approved” to the disclosed registry-metadata request. The fresh audit exited 0 with zero vulnerabilities across 495 dependencies; [receipt and provenance](docs/audits/evidence/2026-10-02/dependency-audit.md). The earlier automatic-review rejection, failed upload attempts and unaccepted CI runs remain in the [backup history](docs/audits/evidence/2026-10-02/backup.md). Reviewed forward repairs preserved every original commit; no historical failure has been relabelled as a pass.

- Main integration branch: `claude/eloquent-hawking-v69lhr`, also the repository’s configured default branch. Main is integration-only; each author/reviewer uses a separate worktree. No PR is requested.
- Verified code checkpoint: **d8c74a299f6f07f2f25fc7f55c0bf298523fa1a9**. The worktree was clean after the accepted full main check and after the separately verified exact backup.
- Full main check: **`TZ=UTC npm run check` exited 0**, complete 907-line result read, no failures/retries/flaky outcomes. **4,009 units passed, one deliberate skip; 241 files passed, one skipped.** Both PWA and single-file builds passed; first-paint JavaScript was **137.9 KB gzip** against 150 KB. **550 browser cases passed, with the same 24 deliberate skipped identities**, including 42 actual WebKit, 42 normal-motion Chromium and seven forced-colour cases.
- Exact backup: all **145 original object SHAs** verified; separate fetch matched clean main, detached uploader and origin at that same code SHA. No replacement commits or forced ref update were used.
- Exact GitHub **[run 37053058406](https://github.com/wktw/lookwhaticando/actions/runs/37053058406) passed on its first attempt**. The complete Linux log records 4,009 units plus one skip, both builds/137.9 KB, zero audit vulnerabilities, and 550 browsers plus the same 24 skips without retries/flaky cases. The actual Windows job separately passed 4,009 units plus one skip, both typechecks and the build. Existing automatic [GitHub Pages deployment](https://wktw.github.io/lookwhaticando/) succeeded on the same SHA; this is an effect of the authorized backup workflow, not the owner’s later project review or a separate manual release.
- G2 combined-tree measurements: [approved quiet report](docs/audits/evidence/2026-10-02/scale.md), measured at clean `ee7a33fb` after the reviewed Windows, notes-region and Shelf corrections, actual exit 0 and both output reviews approved. Both earlier archives remain unchanged. Narrow desktop Chromium is not a physical iPhone measurement. Dense-save capacity and rendering/listing findings are recorded decisions for later parked work, not hidden performance passes.
- The [completion ledger](docs/audits/WEB_COMPLETION_LEDGER.md) separates implementation, reviews, track/main checks and remote CI. [Portable evidence](docs/audits/evidence/2026-10-02/README.md) records the exact findings and verification.

The owner's latest instruction is: “Great. Go ahead and just finish everything that was on the original task list, excluding subscriptions and once the project is 100% complete, let me know once everything’s backed up and I will then give you instructions for the project review phase and how we’re gonna complete it”.

This authorizes completion of the existing web implementation, its required code reviews/tests and backup. **The separate project review phase is on hold for the owner's next instructions.** Do not start the final experience audit, judges panel or a separate manual release. Existing CI automatically deploys GitHub Pages as an effect of the authorized backup workflow; report those deployments accurately and do not alter CI to disable them. Subscriptions, pricing, native iPhone work, App Store submission and physical-device packages remain parked.

Historical checkpoint: the A9 merged tree `969b36ad83bf57d292f7678eccfef5498e3fbb28` passed its full main gate and was backed up with its exact original objects and merge parents. That is earlier evidence, not a substitute for the final fields above.

The B8 merged tree `66c1f7209630a878a926ef56363f7023d21b3b7b` subsequently passed its main gate and exact backup. [GitHub run 36965508248](https://github.com/wktw/lookwhaticando/actions/runs/36965508248) completed successfully on that exact commit, including automatic Pages deployment. This does not begin the owner's later project review or a separate manual release.

## 3. Standing constraints (do not violate)

1. Use isolated local track branches for development; integrate and push the owner's branch **`claude/eloquent-hawking-v69lhr`**. Do not publish other refs without authorization. Use `git push -u origin <branch>` when Git authentication works; retry on network failure only (2s, 4s, 8s, 16s).
2. **No PR unless asked.** Never reset, rebase, force-push, or discard another agent's work; merge instead.
3. Prefer the available GitHub connector tools; do not use `gh`. When those tools and Git transport are unavailable, the owner-authorized exact-object REST backup procedure may be used after review: verify every returned Git object SHA, pin the expected remote tip, preserve all parents/author dates, and update only with `force: false`. Never manufacture replacement commits to work around authentication.
4. End every commit message with the attribution lines your own session's system reminder specifies. Do not put model identifiers anywhere else (commits bodies, code comments, docs).
5. **Never skip, disable or weaken a test** to get green. A failure is a real finding or a timing problem to be fixed properly.
6. **Never push in the same command as a check.** Read the check's EXIT line first, push only on exit 0. (An earlier slip pushed a failing merge; see section 6.)
7. Never broad-`pkill`: other worktrees run tests. Before stopping a process, positively verify task ownership from its checkout `cwd` or unambiguous absolute worktree command, exact process group and assigned port. Recheck that evidence immediately before stopping only the owned process/group. If `cwd` access is denied, record that limit and the alternative evidence; do not claim it was read.
8. Subscriptions, pricing, the native iPhone app, App Store submission, age assurance and billing are **parked** by the owner ("worry about subscriptions and that crap later"). Do not start them.
9. Stop hooks complain about uncommitted or unpushed work. That is a reminder, not an order to commit half-finished work. Commit and push when a package passes its gates.

## 4. How the work is organised

### The audit
The owner pushed a two-pass external audit (`docs/audits/CATKIN_COMPREHENSIVE_AUDIT_2026-09-29.md`, ~2,100 lines) and a planning brief (`docs/audits/OPUS_5_5_AUDIT_IMPLEMENTATION_PROMPT.txt`). The plan was written and committed: **`docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`** (about 2,500+ lines). It holds: a coverage matrix of every audit finding with its status, 14 shared root causes, **46 work packages (WP-xx)** each with files, design, tests and rollback, a validation plan, a roadmap, and the decision register (§7.2, rows DEC-*). Every implemented package has a **Status note** under its heading recording what was done, where it departs from the design, and what is left. Read those notes: they record behaviours you must build on (for example the ownership signal values, `retireQueue()` fencing, envelope `gen`, the one `adopt()` routine, the `replaceSave` protocol).

### The method that has worked (keep using it)
For each package: **build failing-first** (write the regression tests, prove they fail on the old code), commit; then **two adversarial reviewers** (one for data loss and races, one for plan coverage and test quality, verified by mutation); then a **fix** step that verifies each finding, fixes it with a test shown failing first, runs the **full gate**, and commits. Then merge into main, run the full gate again on the merged tree, and read exit 0. Push separately after reading exit 0, then confirm exact-head GitHub CI. The disclosed audit consent has been approved, as recorded in section 2.

Work runs in parallel in separate git worktrees (one track each) so tracks never edit the same checkout; the main checkout is **integration only**. Delegate bounded authorship and independent reviews with the tools available in the current session. The current coordinator allows at most two full gates together, each with two browser workers on the five-CPU environment. Reserve an otherwise quiet machine for claimed performance measurements. A busy-container smoke run proves harness validity, not a performance budget.

### Merging tracks
Each track branch merges into main with a `--no-ff` merge commit. Conflicts were frequent and always of two kinds:
- **The plan document's decision table** (§7.2). Resolve by keeping the fuller version of each `| DEC-… |` row. A small script did this; the logic is: for each conflict hunk where every line is a table row, union the rows by their first cell and keep the longer one.
- **Real code overlaps**, mostly `src/state/validate.ts` (the saving track tightened validation; other tracks added fields), `src/domain/habits.ts`, and onboarding. Resolve keeping both sides' intent, then **typecheck and run the affected tests before committing the merge**. Twice a track's tests expected an old return shape of an API another track had changed (`applyImport` now returns `{ ok: true, undo }`); update such tests to the new shape.
- Always run `npm run typecheck` right after a merge: one merge silently dropped a `useState` import that the other side needed.

### First-paint budget
`npm run build && npm run size` measures the gzip size of the entry plus its static imports against **150 KB**. It had crept to 149.9 KB; the diet moved 17 modules (copy decks, recovery and import UI, celebration art, and others) behind `import()` and brought it to 133.6 KB. `tests/unit/build/firstPaintImports.test.ts` (with `staticGraph.ts`) walks the real import graph from `src/main.tsx` and fails if the moved modules drift back. **Check size before merging any package**, and put anything big behind a lazy import.

## 5. What is included, and what is parked

The authorized web scope comprises **37 of the plan's 46 numbered packages**: WP-01–04, A1–A9, B1–B8, C1–C7, D1–D6, E1, G1 and G2. The original takeover enumerated twenty already-implemented packages; the takeover work covers the remaining seventeen plus the authorized rename and the crescent portability correction. Use package IDs in the ledger, not the old handoff's inconsistent “21 packages” subtotal.

Before takeover: A1–A8, B1–B7, C1, C2, C4, C5 and C7, plus the first-paint diet. Their implementation history and validation remain in the plan's Status notes.

The current work implements A9 (erase), B8 (history controls), C6 (old notes), C3 (modal actions), D1–D6 (watering truth, shared plant presentation, quiet mode, truthful catalogue, friendship and honest personalisation), WP-01–04 (portability, test-tool patch, small correctness fixes and test harnesses), E1 (web capabilities), G1 (browser lifecycle coverage) and G2 (journal scale evidence). See the [ledger](docs/audits/WEB_COMPLETION_LEDGER.md) for separate review/gate/CI status. Do not call an implementation fully verified just because its source exists.

**Parked:** E2–E4 (asynchronous storage contract, save-identity migration and native spike); F1–F4 (entitlements, StoreKit, trial and age assurance); G3–G4 (physical-device/release matrix and submission). Subscriptions, pricing, native app and App Store work remain excluded. No separate manual release or physical-iPhone readiness claim is authorized.

**Await the owner:** the separate experience/judges-panel project review, polish directed by that review and any separate manual release. The existing automatic Pages deployments are recorded effects of authorized pushes, not evidence that this later review has happened.

## 6. Hard-won lessons (read before you work)

- **Stopped preview servers.** Playwright can start Vite in a detached process group. Stopping only the parent check can leave that server alive. Before restarting a stopped gate, identify its exact worktree Vite command and assigned port, stop only the verified owned descendants, then confirm the port can be bound. Never reuse another worktree's preview server. A startup failure is not a passed browser gate.
- **Timing-dependent tests.** A busy container can distort perf medians and long art sweeps (`plants.test.tsx`, `you/perf.test.tsx`, `fx/host.test.tsx`). Re-run a failing test alone to investigate; a passing isolated run does not replace the required complete gate. Claimed benchmark timings require the coordinated quiet window.
- **The opposite also happens:** a test that passed here failed on GitHub because it read the first `[role="status"]` on the page (a faster machine rendered a different status first). Write assertions that do not depend on ordering.
- **Time-of-day bugs.** The app's day starts at 03:00 and several tests/e2e used the real clock. A fix pinned the clock, but `progress.spec.ts` and `capsules.spec.ts` set time the same way as the one that broke and could hit the same thing around 03:00 UTC.
- **A real Shelf bug** was fixed: the sill note's button could cover a napping pet from late morning to mid-afternoon (rituals are now placed by `sillWorld` and pets keep off them).
- **Merge breakage that passed per-track gates:** `useState` import dropped in `App.tsx`; import result shape changes; a decision-table conflict every time. Always run the full gate on the merged tree.
- **I once pushed a merge whose check had failed** because the push ran in the same command as the check. It was fixed within the hour; do not repeat it.
- Container restarts happen. Committed work survives; uncommitted work in worktrees may not. Commit coherent work on an isolated branch; back up authorized refs only after their required checks.
- `package.json` test script runs Vitest; the voice lint scans all `src`. `npm run e2e:preview` uses the PWA build. WP-G1 adds actual WebKit, normal motion and forced-colour/narrow-landscape coverage alongside the original phone/desktop and cross-window projects. Read the current Playwright configuration and actual run result; WebKit coverage is distinct from the parked physical-iPhone checks.

## 7. Decisions taken on the owner's behalf (all recorded in the plan's §7.2)

Examples: DEC-P8 erase-everything: yes. DEC-P10 Balcony: suggestions now, auto-settle once with a notice. DEC-P11 personalisation by completion. DEC-P12 history semantics (a) to (h): all decided as recommended. DEC-P13 non-durable snapshots: require the existing no-undo confirmation. DEC-E1: accept every save shape any build ever wrote. DEC-E2: `fake-indexeddb` approved. DEC-E6/E7/E8 and others noted in their rows. Take the plan's recommendation for any remaining DEC row that blocks a package, write "Decided <date> (owner delegated): <what>" in that row, and flag it in your report so the owner can reverse it.

## 8. Wording and later choices

- The replacement name **Little by Little** is authorized. All other pending wording is preserved in [docs/PENDING_WORDING.md](docs/PENDING_WORDING.md), including the takeover baseline, erase/Start over, history controls, old-note editing/removal, catalogue/odds/licences, quiet mode and personalisation. Do not silently mark these approved.
- Modal actions and friendship behavior reuse existing wording; G2 and the infrastructure packages add no product wording.
- Earlier style-comparison suggestions (the sill as Mac Today, a seven-day stamp row, weekly tea towel, Progress swatches) are not new implementation authorization. Await the owner and their wife's direction during the later review.
- Any remaining physical Safari/IME/process-death checks belong to the parked device work. Browser WebKit evidence does not replace a physical iPhone.

## 9. Where things are

- `docs/audits/CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`: the plan, status notes, decision register.
- `NOTES-open.md` and the other `NOTES-*.md`: older area-by-area notes; `docs/AUDITS.md`: earlier audit log; `docs/DESIGN.md`: design spec; `docs/VOICE.md`: copy rules and rows.
- Source: `src/state` (store, persist, snapshots, decode, validate, adopt/replace logic), `src/domain` (rules, economy, history), `src/features/*` (screens), `src/art/*` (SVG art), `src/catalog/*` (items and copy; `lines.ts` lazy, `linesCore.ts` first-paint), `src/app` (shell, SheetHosts, lazy loaders), `src/fx` (celebrations). Tests: `tests/unit/**`, colocated `*.test.ts(x)`, `e2e/*.spec.ts`.
- Storage keys: `catkin:v1` (save), `catkin:theme`; the `CK1:` hand-off format.

## 10. What the next agent should do

1. Read this whole handoff, the complete implementation-plan Status notes and the completion ledger. Confirm the actual branch, worktree and latest exact-commit CI; the later documentation checkpoint is recorded in the completion reply/GitHub.
2. The authorized web implementation is complete at the named verified code checkpoint. Await the owner’s instructions for the separate project-review phase; do not restart completed packages or begin parked work.
3. Preserve the test-first, two-review, fix, full-track-check, merge, full-main-check, read-exit, separate-push and exact-CI method for subsequently authorized changes. Use isolated worktrees and the coordination limits above. Do not skip or weaken tests.
4. Keep the wording approval list visible. **Little by Little** is authorized; the other listed draft wording is not. Do not silently approve it.
5. Report any later work and its actual checks/backup plainly. Existing automatic Pages deployment is recorded; no separate manual release, native/App Store work or physical-iPhone certification is implied.

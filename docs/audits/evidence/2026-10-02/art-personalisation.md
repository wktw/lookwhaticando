# Art, friendship and personalisation

## D1 — watering truth and delayed art

Failing-first art tests and a normal-motion browser reproduction showed soil staying wet after Undo. Saved watering now controls soil; occurrence pulses control temporary glints. Inner timers cancel on dry state, disappearance and unmount.

Independent review found the outer reveal-scroll delay and guest animation frame could still pour after Undo, date change or removal. Source `245cb25` fences those callbacks by date, per-habit version and ownership. Eight independent controls failed six old paths while keeping two valid same-tap controls; all eight pass after the fix. Four inner art mutants were also killed. Author art tests, typecheck and the normal-motion browser regression passed. Both reviewers approved; full integration gates remain separate.

Relevant regression: [Band watering](../../../../src/features/today/Band.watering.test.tsx). No new wording.

The first D1 integration run exposed a retry-passed browser selector: C3 correctly places the import announcement inside its dialog, so the old broad summary-text locator can match both the visible preview and the live region. Waiting for the real announcement reproduced the failure deterministically. A test-only correction checks the same count sentence in the modal announcement and in the unique visible semantic `strong` preview, preserving the saved-date suffix, import, Undo and axe assertions. Independent review approved; focused phone/desktop cases pass. The subsequent clean full rerun is recorded under completed checks below.

## D2 — one earned plant presentation

Nine initial regressions failed before the shared presentation helper. Today, Detail, Shelf, onboarding and Progress now derive earned stage, blooms, flourishes, inferred or chosen look, partner and resident outfit consistently. A missing recorded partner uses a graceful visual fallback without fabricating stored history.

Independent adapter mutants originally survived because fixtures checked derived values rather than rendered adapters. Added controls inspect real ink/snail rendering and onboarding props; all four mutants now fail. A real twenty-plant render counter verifies that unrelated coin/pet-XP changes render zero plants and a changed flourish or partner renders one. Both reviewers approved `94a5372`; typecheck and affected consumer suites passed.

Relevant tests: [earned onboarding plants](../../../../src/features/onboarding/EarnedPlants.test.tsx), [plant presentation](../../../../src/features/progress/PlantPresentation.test.tsx), [render memoization](../../../../src/features/progress/PlantMemo.test.tsx). No new wording.

## D4 — claims grounded in actual art and state

Review traced all sixteen Blooming descriptions to actual SVG parts. A strawberry has white flowers at Blooming stage five; berries arrive at stage six, so the earlier berry claim was corrected. A pet can reach friendship level thirteen through petting with no habit waterings, and can remain alone; late friendship wording no longer claims waterings or company that need not exist. Levels five, seven, eight and nine retain their D5 contracts.

The odds test now reverses the actual machine candidate order. Reversing a separately built collection key order had not tested the claimed invariant. Licence coverage includes shipped runtime code, fonts and the Vite preload helper; that helper ships even though Vite is a build dependency. A stale licence-load success or rejection cannot write into a newly opened sheet. Removing the load ownership guards kills both independent controls.

Both reviewers approved `07e28a8`. Catalogue/odds/art and licence tests passed. The [bloom/copy contract](../../WP_D4_BLOOM_COPY_CONTRACT.md), [catalogue truth tests](../../../../tests/unit/catalog-truth.test.ts) and [licence sheet tests](../../../../src/features/you/LicencesSheet.test.tsx) retain the evidence. New wording is pending approval.

## D5 — earned preferences without invented co-presence

The delegated deterministic approach uses level-five sunlight preference, level-seven/nine front preference and level-eight named-friend adjacency. It adds no stored co-presence tally. A friend must be currently present on the same ground and not held; an absent friend keeps its recorded identity while the card uses an existing solo line. Reduced-motion placement is stable and safe, and night behavior remains unchanged.

Failing-first tests exposed nineteen missing behaviors while eighteen baseline controls passed. Root independently passed 133 affected tests and inspected narrow/wide placement. Coverage review killed sunlight, front, named-friend equality and night-guard mutants, then found that same-ground and held-friend guards lacked discriminating tests. Added direct Director controls kill both. The final new-test set passed 21/21; both reviewers approved `40cc660` (documentation checkpoint `cd005cd`).

Relevant tests: [friendship profile](../../../../src/art/scene/behavior/friendship.test.ts), [actual scene placement](../../../../src/art/scene/behavior/friendshipScene.test.tsx). No new wording.

## D6 — explicit choices and honest inferred evidence

Failing-first domain, snake-plant and UI controls preceded implementation. Explicit colour choice is separate from inferred completion time; it cannot manufacture morning/night evidence. Eligibility requires ten completed scheduled occurrences and Blooming. Validation preserves old saves and rejects invalid chosen values. Real reducer compaction over twenty-four months and day-start boundaries retain the underlying evidence.

Review fixed a Paired disclosure mismatch: while a recorded partner is present, the displayed tint comes from that partner and the explanation must say so. If the partner disappears, the chosen fallback and earned bee remain. A threshold test initially failed to distinguish the separate Blooming guard; a real ten-night-completion fixture below Blooming now kills that mutation. Further controls cover keyboard cancellation, Home/End selection without save, ownership and replacement.

Both reviews approved source `4f8851e` plus adopted independent boundary tests. The author passed 224 affected tests and two phone/desktop keyboard-and-axe journeys. Browser review caught and fixed a 64-pixel overflow. Independent domain/state/decoder/paint and UI checks passed; mutation controls cover validation, epoch ownership, preservation, occurrence threshold, Blooming and actual colour paint. Full gates remain separate.

Relevant tests: [domain choices](../../../../tests/unit/domain/look-choice.test.ts), [state choices](../../../../tests/unit/state/look-choice.test.ts), [actual paint](../../../../src/art/plants/look-choice.test.tsx), [choice UI](../../../../src/features/habits/detail/LookChoice.test.tsx). Thirteen wording contexts remain in the [approval list](../../../PENDING_WORDING.md).


## Completed checks

D1's corrected complete track command at `5bd1d45` exited 0: **3,713 unit tests passed, one skipped; both builds passed; first-paint JavaScript 136.1 KB; 349 browser cases passed, 52 skipped**, with no failures, retries or flaky cases. Its final Status-only checkpoint is `7c658d8`. This result includes the reviewed modal/pointer and import-preview corrections; earlier stopped or retry-passed runs are not reused. The separate main check at clean `65b71b43` then exited 0 with the same explicitly reported counts and size and no retries. Its exact backup completed with actual exit 0 and a separately fetched matching ref. Exact-head GitHub run 36984647837 then passed, including the existing Pages deployment; decoded remote counts match the local check without retries. The [completion ledger](../../WEB_COMPLETION_LEDGER.md) links that result.

D2's complete track command at `d0c2562` then exited 0: **3,725 units passed, one skipped; both builds; 136.1 KB; 349 browsers passed, 52 skipped**, with no failures, retries or flaky cases. Final Status-only checkpoint `69db548` records the result. The separate main check at clean `3eac0902` then exited 0 with the same explicitly reported counts and size, without failures, retries or flaky cases. Its separate exact backup completed with all 95 objects verified and a matching fetched ref. Exact-head GitHub run 36986656622 then passed, including the existing Pages deployment; decoded remote counts match the local check without retries.

D4's complete track command at `b70edd8` exited 0: **3,742 units passed, one skipped; both builds; 136.0 KB; 355 browsers passed, 56 skipped**, with no failures, retries or flaky cases. Status-only checkpoint `c9dc2a5` records the result. The four additional skips are the offline-licences journey in screen projects that deliberately block service workers; that exact case passes in the PWA project. All four Credits viewers and the portable-file licences case also pass. This accepted track includes the reviewed shared “Safety copy” label. Its separate main check at clean `9c0f8f0e` then exited 0 with the same explicitly reported counts and size and no retries. Exact backup then completed, verifying all 177 objects and the fetched ref. Exact-head GitHub run 36989152365 then passed, including the existing Pages deployment; decoded remote counts match the local check.

D5's complete track check at `3236f07` exited 0: **3,788 units passed, one skipped; both builds; 136.3 KB; 367 browsers passed, 56 unchanged project skips**, with no failures, retries or flaky cases. Status-only checkpoint `35cca9d` records the result. The separate main check at clean `b4531a85` then exited 0 with the same explicitly reported counts and size and no retries. Its delayed exact backup then completed with actual exit 0: all 104 objects were verified and a separate fetch matched the checked SHA. Exact-head GitHub run 37018589503 concluded success but is unaccepted because its first-boot onboarding contrast scan passed only on retry: 366 browsers passed, 56 skipped and one flaky. The onboarding correction subsequently passed both reviews, its full track and main check at `871e40c0`; exact combined backup also completed. Its CI run 37030819404 then failed on Windows and included a separate retry-passed Linux notes case. The latest Windows, notes and Shelf corrections are reviewed and their corrected combined track at `1aa8cac1` passes; separate main at `d8c74a29` also passes, with exact backup verified at `d8c74a29`; final remote acceptance is complete in exact run37053058406. The exact historical failing node remains unproved.

D6's complete track check at `b7c13b5` exited 0: **3,853 units passed, one skipped; both builds; 136.8 KB; 375 browsers passed, 56 unchanged project skips**, including the colour-choice and C7 last-serving focus/visibility journeys. There were no failures, retries or flaky cases. Status-only checkpoint `dc69f48` records the result. The separate main check at clean `19ad4b8e` then exited 0 with the same explicitly reported counts and size and no retries. This original checkpoint is preserved unchanged in the verified exact combined backup `871e40c0`. Its combined CI run 37030819404 is unaccepted: Windows failed and Linux included one flaky case; deployment was skipped. The corrected combined track at `1aa8cac1` now passes; separate main at `d8c74a29` also passes, with exact backup verified at `d8c74a29`; exact-head CI37053058406 passes on that same SHA.

## Final combined code acceptance

Exact combined backup and [run 37053058406](https://github.com/wktw/lookwhaticando/actions/runs/37053058406) are now accepted at `d8c74a29`: Linux and actual Windows pass without retries/flaky cases, and existing automatic Pages deployment succeeded on the same SHA. The final main check passed 4,009 units plus one skip, both builds/137.9 KB and 550 browsers plus the same 24 skipped identities without retries. The remote Linux result independently matches those counts, including 42 WebKit, 42 normal-motion Chromium and seven forced-colour passes; actual Windows passed 4,009 units plus one skip, both typechecks and build. All earlier failures remain historical, unaccepted results. The later documentation checkpoint and its own check/backup/CI are recorded externally.

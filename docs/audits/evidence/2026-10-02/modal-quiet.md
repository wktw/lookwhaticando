# Modal actions, quiet mode and lifecycle

## C3 — actions inside the active sheet

A prototype preceded implementation and was inspected at 390×844, 1280×800 and 568×320. Its notes slot remains in normal panel flow between header and scrollable body. The thirteen initial modal/timer/announcement regressions all failed on the old implementation; the stable CountPad note control and modal banner ownership also failed first.

Review found and fixed four additional focus boundaries: dismissing a focused banner; removing a covered loading sheet; moving directly between two transient notes before opening a child sheet; and reopening a sheet while its previous exiting DOM remained inert. Browser checks also caught accessible exiting panels with empty titles. Exit inertness, durable origins, top-layer ownership and explicit fallback Tab entry now cover those paths.

Five independent mutation classes were killed: lost elapsed-time accounting, omitted hidden pause, omitted focus pause, no final availability check and no reachable-action resumption. Final `bda4711` had 146 targeted passing tests, clean typecheck, and four real keyboard/axe journeys. Both reviews approved. Full gate results remain separate.

The [modal note regressions](../../../../tests/unit/ui/modalNotes.test.tsx) cover remaining time through hidden/focus/hover/gesture/moment/portal changes, queued announcements and nested modal paths. Existing wording is reused.

The integration gate later passed all 3,657 unit cases but correctly failed on an unhandled delayed announcement after jsdom teardown. The live region already belonged to a document, but its 60 ms delivery re-read the removed ambient global. Two new owner-document controls failed on the old implementation while a real late-modal placement control passed. The one-line fallback now uses the live region's `ownerDocument.body`, retaining delivery-time modal selection. Both independent reviewers passed all 38 affected tests. Removing modal selection or merely suppressing delivery when the global is missing each kills its corresponding regression. No catch, sleep or weakened assertion was added. See [announcement ownership tests](../../../../tests/unit/ui/announceDocument.test.ts); the corrected full gate remains separate.

A subsequent combined browser run found that C3's parent-panel fallback prevented C6's body-only callback from returning to Moments after deleting the last note. Correction `1f50a7f` resolves a concrete context element and checks that it belongs to the current top modal, or to the root when no modal exists. It restores only from body or the panel fallback, preserving a deliberately chosen control and any newer modal. Independent actual-component controls reproduced the old failure; all 45 affected note/modal controls pass with the correction. Removing scope ownership fails two upper-modal controls; removing the chosen-control guard fails its control. The author tests both child-close orders and removed context; root's slotless-upper/Calendar control was adopted in test-only `d52dd0b`. Four real-browser cases subsequently passed with the original assertions. Complete track/main gates remain separate.

Combined colour-journey testing then exposed a plain status note overflowing the modal notes lane with no keyboard target. Source `e3874da` makes only modal-owned, non-actionable, non-leaving cards sequentially tabbable, reusing existing reading-time pause. Independent review reproduced focused dismissal losing modal focus in both Sheet and LoadSheet; the corrected source returns to the durable origin/current panel only while the card still owns focus. Independent modal, banner and injected-lifecycle suites pass 51/51. Six mutation classes cover root/action extra stops, focused expiry, lost/stolen exit focus and an exiting card remaining tabbable; the last needed test-only followup `7c8d1b1`, adopted as `efbdd71`, after which final modal/ownership controls pass 28/28.

The second reviewer independently passed 63 modal/ownership/shared-component tests under Vitest 4, using the separately reviewed E1 six-listener fixture correction in that private tree. Both reviewers approved. Four real Chromium/WebKit keyboard-scroll, axe and focused-lifetime journeys then passed: they require positive overflow geometry, real Tab/Arrow movement, unchanged modal-body scroll and a note surviving its ordinary lifetime while focused. These are completed focused checks. The earlier main run at `46572ca` was intentionally stopped with exit 143 and was not backed up; the corrected full track/main checks remain separate requirements. No wording, stored data or lifetime budget changed.

## D3 — quiet content remains quiet at delivery time

The initial expanded suite failed nine cases with one direct-route control passing. The implementation hides reward totals and the Capsules destination while keeping saved rewards, the addressed route, stable keyboard digits and functional purchase prices.

Independent reviewers found three distinct delayed-content leaks: the settled watering announcement retained captured coins, an already-visible note retained reward text after the setting changed, and a top-up already queued for its final live-region write still spoke after quiet toggle/unmount/save replacement. Seven genuine failing controls preceded the review fix `fdc22bd`.

Transient presentation updates retain id, version, actions and the exact shared remaining-time object. They cannot overwrite a newer coalesced note. Speech resolves current content and quiet state at the final write. Actual focused Undo remains functional and preserves earned data.

Independent final checks passed 43 modal/quiet/announcement tests and 23 extended quiet/check-in tests (overlapping sets). Four final mutants were killed: copying instead of sharing the clock, stale settled quiet state, stale queued status content and missing version ownership. Source approval covers `fdc22bd` and the adopted test-only followup. Author production-preview journeys passed eight cases including dated correction/reload. Full track/main checks remain separate.

Relevant tests: [QuietMode](../../../../src/app/QuietMode.test.tsx), [announcement delivery](../../../../tests/unit/ui/announce.test.ts). Four wording variants remain pending.

## E1/C3 integration — pause during mount

Routing Toaster through the injected lifecycle exposed an additional mount race: a pause emitted by a sibling layout effect before a passive subscription attached was missed, and an unseen note expired. Independent reproduction failed one of nine cases on `4d90e68`.

`956c6e6` subscribes during layout, reads the same captured adapter, immediately synchronizes hidden state and returns its disposer. Both sibling mount orders pass. Independent final lifecycle plus modal-note run passed 32/32; the other reviewer's boundary set passed 36/36. Both reviewers approved the final integrated source, without weakening the original timer tests.

## Completed quiet-mode track check

D3's entire track check at `f2592b9` exited 0: **3,766 unit tests passed, one skipped; both builds passed; first-paint JavaScript 136.3 KB; 367 browser cases passed, 56 unchanged project skips**, including all eight quiet-mode journeys. There were no failures, retries or flaky cases. Status-only checkpoint `8695784` records the result. The separate main check at clean `76630288` then exited 0 with the same explicitly reported counts and size, without failures, retries or flaky outcomes. The first backup attempt failed on HTTP 401 before any ref update; a separately logged same-target retry then completed and matched the fetched ref. The already-started exact-head CI run 36994045322 then passed, including Pages, and decoded app-check counts match without retries. That CI result is not a standalone vulnerability audit; the later separately approved fresh audit has its own [receipt](dependency-audit.md). The [completion ledger](../../WEB_COMPLETION_LEDGER.md) records the result and the later resolved consent hold.

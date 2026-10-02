# Save, history and old-note reviews

## A9 — erasure and durable authority

Initial erase regressions failed 9/9 before APIs existed; the three UI controls separately failed before the new flow. Adversarial review then reproduced newer-schema/lineage retries, writes and snapshots arriving after erase, stale clipboard receipts, recovery erasure, and destructive double-tap activation.

Final source uses the shared decoder before same-head authority shortcuts, preserves known damaged data and pending edits when authority cannot be read, fences delayed writes/snapshots, and arms the final pointer confirmation without breaking deliberate keyboard activation. Same-wrapper/newer-state schema combinations were independently tested. No foreign storage namespace is erased.

A full run exposed a test-page lifetime flaw: old simulated-page save queues were still alive after module reset. `81162a8` flushes the prior page before replacement and at teardown; no product behavior, timeout or assertion was weakened. The affected 30-case SheetHosts file then passed.

The track full check passed with 3,586 unit tests plus one skip, 321 browser cases plus 52 configured skips, both builds and 134.8 KB first-paint JavaScript. Main `969b36a` subsequently passed its own full check. Final project-wide counts belong in the completion ledger, not this historical record.

Reproduce core regressions with the [erase state tests](../../../../tests/unit/state/erase.test.ts), [erase UI tests](../../../../tests/unit/state/erase-ui.test.tsx) and the applicable state/recovery suites. This package's new erase/Start over wording remains pending approval.

## B8 — history capabilities and retained content

The first 17 domain/UI cases all failed before implementation. A shared capability describes whether older days may be edited; UI controls now agree with reducer boundaries for flexible periods, pauses, off/rest days and archive dates. Retained pins, records, notes, keepsakes and seasons keep their sections visible even without live habits. Streak comparison uses comparable occurrence units rather than raw displayed lengths.

Independent mutations caught archived/window/period boundary regressions and the old glyph-based Calendar early return. Pin/record gating initially had a combined fixture that concealed either missing condition; isolated fixtures now kill both mutations. Full browser checks then found a real keyboard-accessibility gap in the horizontal keepsake row. A focusable, labelled row now accepts actual ArrowRight scrolling; no new copy was needed.

Both reviews approved. Final track-plus-current-main check at `af33a748` passed: 3,610 unit tests plus one skip, 325 browser cases plus 52 skips, both builds and 135.0 KB. The separate merged-main check then passed at `66c1f7`, followed by exact backup. [GitHub run 36965508248](https://github.com/wktw/lookwhaticando/actions/runs/36965508248) completed successfully on that exact commit, including the existing workflow's automatic Pages deployment.

Relevant tests: [history capability](../../../../tests/unit/domain/history-capability.test.ts), [real history UI](../../../../src/features/progress/HistoryCapability.test.tsx).

## C6 — old-note edits and removal

The first run produced fifteen failures and one control pass. It caught missing dated edit/remove controls, removal without consent, stale drafts after replacement, refusals presented as success, broken composed text at the cap, stale note markers and quote removal based on text instead of provenance.

Independent review required exact habit/date quote matching, explicit consent to redact Sunday Notes, ownership/save-epoch fencing, IME-safe draft handling and post-removal keyboard focus. The last-note path exposed two closing layers racing to restore focus; either layer may now restore only when no live control owns focus. Daily/weekly and pre-replacement snapshots are disclosed honestly, not silently rewritten.

After fixes, 56 affected tests passed, typecheck passed and eight production-preview keyboard/axe journeys passed across phone/desktop and light/dark. They include durable edit/removal, reload, confirmation focus and return to the dated Calendar cell or Moments heading. Both reviews approved `68c841a`.

The integrated track check first exposed a Preact after-paint callback surviving the existing art fixture's jsdom teardown. Two deterministic fixture controls failed first; wrapping mount/unmount in `act` settled the actual work without suppressing errors or changing timeouts. Both reviewers approved that correction. The full rerun at `7ead751` passed: 3,633 unit tests plus one skip, 333 browser cases plus 52 skips, both builds and 135.2 KB. The separate merged-main check at `8b2b7d7` then passed with the same counts/size and no retry or flaky cases. Exact backup and [CI run 36967081152](https://github.com/wktw/lookwhaticando/actions/runs/36967081152) completed successfully, including deployment. Decoded GitHub check job `110713054780` independently confirms the same counts/size and no retry, flaky or failure result lines.

Relevant tests: [domain old notes](../../../../tests/unit/domain/oldNotes.test.ts), [old-note UI](../../../../src/features/today/OldNotes.test.tsx). Copy remains in the [pending wording list](../../../PENDING_WORDING.md).

# Little by Little integration checks

The owner delegated the replacement name. The reviewed rename keeps installed-app identity,
existing save keys, database names, backup formats and old handoff codes compatible.

The first combined catalogue/recovery merge (`0af12d6`) retains both sides of the wording
ledger and the existing modal-note documentation. The other-window message uses the new
name and keeps WP-A9's shorter, truthful result: daily copies may have been erased, so it
does not promise that they survived. The partial-erasure pause message remains in both
shell and full catalogues. The browser expectation uses that same exact result.

A9 added one visible line after the rename branch began. A strict branding regression
(`0b4dc41`) first failed on the complete blocked-erasure sentence containing “catkin”.
The display-only correction (`99efd4d`) changes that name in the catalogue and matching
VOICE row: “The daily copies couldn’t be erased. Close other Little by Little windows,
then try again.” The test also pins the shared follower result and pause-message parity.
Existing old-save, old-backup and handoff-code compatibility controls remain intact.

Validation: all 30 branding, decoder-UI and catalogue controls passed, followed by both
source and browser typechecks (actual exit 0). The independent quality review passed 92
branding/decoder controls and inspected all five conflict resolutions. The independent
compatibility review approved those resolutions and the exact display-only correction.
The already reviewed strict newer-version decoder sentence correction (`61bde6a`) is
also included. Local evidence: `/workspace/name-a9-display-red-final.log`,
`/workspace/name-a9-display-green.log`, `/workspace/name-integration-types.log` and
`/workspace/name-followup-root-review.md`.

The separately reviewed shared “Safety copy” label is carried from WP-D4 without changing
its stored kind. Its pending wording is retained alongside the other draft sections.
The final consolidated wording ledger must also retain A9/B8/C6 and later package rows.

The full track check is now complete as recorded below. Ordered main verification,
backup and GitHub checks remain required before final acceptance.

The first full track run at `58747df` stopped in units with two stale A9 UI expectations
for “Close other catkin windows” (3,745 passed, two failed, one skipped; actual exit 1).
Both fixtures now require the complete independently written, approved Little by Little
blocked-erasure sentence. The deletion, no-false-success and successful-retry assertions
and their timeouts remain unchanged. The exact file failed twice before and passed all
five cases afterward. Root approved test quality; the independent runtime review passed
34 erase UI/state/race/schema/IndexedDB/backup controls and killed both generic-error and
ignored-retry mutations, then restored all five UI controls. No application change was
needed. The original red log remains `/workspace/name-integration-check.log`; the complete
track check restarted after this twice-reviewed fixture correction (`334ecab`).

Full track verification passed on 2 October 2026 at clean source
`9726c0948b562f794e3fe8a3fe944b146ec17cb7`. The exact command was
`CI=1 PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers TZ=UTC npm run check`;
actual session 6247 exit 0 and the complete log were read. All 3,747 unit tests passed,
with one generated-art test skipped; both builds passed, first-paint JavaScript was
136.1 KB gzip, and 359 browser tests passed with 56 intentional project skips in
14.4 minutes. There were no failures, retries or flaky cases. The skip set is unchanged
from WP-D4, including the offline-licences case that runs in the service-worker project.
Log: `/workspace/name-integration-check-retry1.log`. This final checkpoint changes only
this evidence documentation; main verification and backup remain separate.

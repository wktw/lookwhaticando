# Inherited focus, time-zone, measurement and browser obligations

These bounded follow-ups close specific unfinished items found while reading earlier package Status notes. Their focused checks and two independent reviews establish the results below. They do not replace the ordered package and main `TZ=UTC npm run check` gates, a pushed backup or exact-head GitHub CI. Those outcomes belong in the [completion ledger](../../WEB_COMPLETION_LEDGER.md).

| Follow-up | Reviewed implementation | Final checkpoint | Integration destination |
|---|---|---|---|
| C7 final-serving focus | `e61f727`, corrected visibility in `7de0184` | `bea9ab6`, including final Space-key test `66d3a8e` | D6 shared Pet Card package |
| B5 named-zone lifetime coverage | Test-only `4792938` | `9e4df16` | WP04 |
| G2 missing import/maintenance measurements | Measurement-only `c255d0e`, timing test adopted as `8fd8631` | `6dd7fe2` | G2 |
| G1 inherited browser capabilities | Tests/configuration `8b01591` | `32f8f88` | G1 |

All four additions preserve stored data and existing product wording. C7 changes focus behavior; B5 changes only tests; G2 changes only the measurement harness, its tests and documentation; G1 changes browser tests, their selection and documentation.

## C7: consuming the last serving preserves usable focus

The inherited C7 note explicitly left this unfinished: feeding the last serving disabled the active control, allowing focus to drop to the page. Test-first `a488cdc` reproduced it with the real store. Five of ten focused cases failed on focus while their quantity and coin assertions passed. The existing keyboard journey also failed in both actual Chromium and WebKit after reaching zero servings; this was not inferred solely from jsdom's treatment of disabled elements.

The [Pet Card](../../../../src/features/pets/PetCard.tsx) now captures a request only from the activated focused feed button and consumes it once. It moves focus to the same treat's affordable Bake action, another usable feed/control, or the card itself. That movement does not activate the target or spend anything. A refused feed clears the request. A changed save epoch, detached control, deliberately moved focus or covering modal prevents the old request from moving focus.

The first correction still used focus with `preventScroll`. A second reviewer requested a 320 px, zero-coins case with the fallback initially clipped. It failed in real Chromium: focus had moved correctly, but the replacement control remained outside its scrolling row. Test-first `8008dbe` pinned that result; `7de0184` reveals the guarded target at the nearest horizontal and vertical scroll edges. The test requires the target to be inside the viewport and every clipping ancestor while the outer page stays still.

The permanent [Pet Card unit controls](../../../../src/features/pets/PetCard.test.tsx) cover first/eighth treats, harvest and unaffordable fallbacks, exact servings and coins, deliberately chosen focus, a newer actual Sheet, another active modal layer, changed save epoch and unfocused activation. The independent real-reducer refused-feed test was adopted as `e70c16b`: an unrelated later inventory change must not revive that click as a focus request. Removing its cleanup makes the test fail; restored source passes.

Both independent reviewers approved final source `7de0184`. Each independently passed all **30 Pet Card unit cases** with actual exit 0. The browser reviewer passed **four production cases**, zero skipped, across actual Chromium and WebKit. The extended journey uses Enter for two servings and **Space for the last**, then requires focus on Bake, zero chosen servings, exactly three feeds, seven other treats unchanged, 100 coins unchanged and axe clean. The other journey proves clipped-fallback visibility and unchanged outer-page scroll and inventory. The author also passed those four cases, 11 focused unit controls, typecheck and production build. Source and test checkpoints are distinct from later ordered full gates. Physical VoiceOver focus remains G3 work.

## B5: named-zone clocks compose with actual lifetime rules

This is completion of an explicitly deferred coverage obligation, not a newly discovered product bug. Test-only `229c6a2`, refined in `4792938`, adds ten [named-zone lifetime cases](../../../../tests/unit/domain/lifetime-zones.test.ts). They compose the production app-day, monotonic clock and `openDay` transaction with real create/edit/Finish/backdate reducers. Expected civil dates, period boundaries and reward facts are literal values rather than expectations reconstructed with the functions under test.

The matrix covers Kathmandu, Kolkata, Chatham and Lord Howe, including quarter-/half-hour offsets and the 03:29 → 03:30 boundary. Weekly cuts and Monday opening, leap-February closure, a two-month grid after backdating, a genuine Lord Howe half-hour daylight-saving jump and Kiritimati → Honolulu travel are exercised. It checks empty lifetime membership, earned-day classification, stored rule history, cut-period target/open days/verdict, monotonic app-day behavior and unchanged once-only rewards and coins.

The first draft had five fixture assertion errors: it expected UI labels instead of domain outcome names. Those were corrected without production edits and are not reported as runtime product failures. The ten valid controls then passed. Five deliberate source defects establish that the coverage can reject wrong behavior:

| Deliberate defect | Failing controls |
|---|---:|
| Treat the exact cutoff instant as the previous app day | 10 |
| Allow date-line travel to move the trusted day backwards | 1 |
| Discard the cut-period view after Finish | 5 |
| Lose the original period grid when backdating | 4 |
| Count an unstarted lifetime as membership | 4 |

The membership mutation initially survived because the higher-level outcome separately rejected the inactive day. A direct factual membership assertion was added before the final four-failure result. Every mutant was restored.

The author and independent root reviewer each passed **72 cases**: the ten new cases plus 62 existing lifetime controls, including the 40 × 150-day property exercise. Typecheck passed. The second reviewer independently passed all ten new controls, changed the zone reader to ignore its named zone and observed **all ten fail**, then restored it and passed ten again. Both reviewers approved `4792938`; final documentation checkpoint is `9e4df16`. No production, schema or wording change is included, and the addition's ordered package/main gates remain separate.

## G2: measure the omitted work before drawing performance conclusions

The earlier A6 Status left large pasted-backup parsing/validation cost unmeasured. B4 left the once-daily provenance reconciler cost on a dense ten-year journal unmeasured. The existing G2 harness prepared a compacted fixture outside timing and sampled same-day opening, so those costs were absent from its reported phases. These additions complement the [original scale methodology](scale.md); they do not supply final performance conclusions.

Measurement source `c255d0e` adds three real paths in [operations.ts](../../../../tests/perf/operations.ts):

- Next-day rollover on an already compacted journal, using actual `openDay` with clock and app date advanced together. An expiring reversed-order witness per stacked pair makes the provenance fold observable.
- Separate full compaction of fresh dense history, with a fresh independent clone for each sample.
- Actual plain-text `parseBackupText`, including JSON parsing and shared decoding, migration and validation. Backup-envelope construction stays outside the interval. Actual size refusal is a separate result, with character and UTF-8 counts distinguished; it is never presented as a successful fast import.

Setup, cloning, input/output validation, note fingerprints and semantic guards stay outside the maintenance timer. Guards require actual day advancement, pantry restock, removal of expired ledger/provenance entries, the exact folded anchor, preserved kept-together totals and unchanged notes. Report schema 2 exposes the new phases without adding a budget or a phone-performance claim.

Test-first `4fa57ed` initially failed to load the absent operations module: **zero tests executed**. That establishes test-first API work, not a reproduced runtime product failure. The subsequent runtime suite executed 14 tests: 12 passed and two failed because missing-ledger and missing-restock work was not yet rejected. After observable guards were added, all 14 passed. Six restored source mutants failed for semantic reasons:

| Deliberate measurement defect | Failing controls |
|---|---:|
| Omit rollover | 3 |
| Omit pruning | 6 |
| Lose the provenance fold | 4 |
| Remove journal-preservation guard | 1 |
| Perform import work outside the clock | 1 |
| Present the wrong parser result as size refusal | 1 |

The independent methodology reviewer added a direct clock witness (`d71ef32`, adopted as `8fd8631`) proving clone/input validation precede the interval, actual pruning occurs inside it, and output validation follows it. Moving the timer before setup kills that test. The reviewer restored the source and passed **15/15 operation controls**. Root independently passed **18 combined operation/journal controls**, actual exit 0, and reviewed the additional clock witness. Both approved source `c255d0e` and final checkpoint `d63ac3e`; final author typechecks and the isolated measurement build exited 0.

A production-compiled Chromium smoke subsequently completed with actual exit 0 on clean `d63ac3e`: five years, one sample, 21,900 preserved notes. It observed six actual fold witnesses, 12 expired live days reduced to zero and 35 pantry restocks during rollover; separate dense compaction reduced 20,448 expired live days to zero. The actual parser accepted 7,568,895 characters with notes intact. LocalStorage raised `QuotaExceededError` and the prior durable copy survived. UI and IndexedDB experiments were explicitly disabled. Other jobs were active, so these are functional smoke facts, **not benchmark results**; no timing conclusion is drawn.

The later **quiet five-/ten-year run, full-retention snapshots and resulting decisions are complete and approved twice** at original clean `ad27da1`, notes-CSS refresh `6d11f467` and current Shelf-source refresh `ee7a33fb`; see [current scale evidence](scale.md). All three archives remain distinct and unchanged. G2’s corrected full track at `e05ae227` and separate merged-main check at `9f1ff727` also passed; remote verification remains separate. The earlier unit controls and smoke are still not benchmark results, and desktop results must not be recast as physical iPhone budgets.

## G1: execute the inherited browser handoffs and denial paths

Earlier A6, A7 and C7 Status notes delegated browser file/clipboard handoff, storage-unavailability startup and WebKit capsule journeys to G1. The initial focused matrix did not select the capsule spec or contain the capability probes. Test-first `78924bf` pinned that omission: both project-selection controls failed, while the actual-engine/ordinary-motion control passed. `8b01591` adds the existing capsule journeys and new [recovery capability spec](../../../../e2e/recovery-platform.spec.ts) to WebKit and ordinary-motion Chromium in [Playwright configuration](../../../../playwright.config.ts). All three configuration controls and both TypeScript projects pass.

The author executed **22 cases**, zero skipped, with actual exits read: all eight existing capsule journeys in both engines (**16 passed**) and three new capability journeys per engine (**six passed**). The new cases establish:

- A backup supplied through the real file input is described before import, replaces the intended save, survives reload and retains durable Undo.
- Explicitly denied clipboard read/write and legacy-copy APIs leave the manual copy/paste path available. Fault counters prove the denials were exercised. The manual payload can be parsed for import, and a reload settles queued writes before proving denial did not create a backup receipt.
- Explicitly unavailable localStorage and IndexedDB at startup produce the volatile warning and readable Daily copies error, with a genuine failed retry. A real downloaded backup preserves the current session, while the unread original durable save remains byte-for-byte unchanged. Reload loses volatile onboarding, as disclosed, without replacing those original bytes.

The runtime reviewer independently passed all **six new capability cases**, three in each actual engine, and approved the data, export and receipt assertions. The independent quality reviewer passed the three configuration controls and killed separate matrix-omission and wrong-engine mutations. Making the injected clipboard write succeed removes the expected manual-denial dialog. More significantly, a copied-production-artifact mutation falsely marking a denied copy as backed up passes the immediate read but **fails exactly the post-reload receipt assertion**. All mutations were restored; the baseline and restored Chromium clipboard case pass. Both reviewers approved `8b01591`; final review-status checkpoint is `32f8f88`.

These are actual browser engines running **explicit API denial emulations**. `setInputFiles` exercises the actual input and parser, not the system Files picker. An isolated WebKit context is not proof of physical Safari Private Browsing. Clipboard permission UI, physical private-mode behavior, storage-pressure eviction and system handoffs remain G3 device work. The tests introduce no application source or wording changes. Their focused results remain distinct from the later accepted full G1 track at `2bbe421` and main at `39ce289f`; that original main checkpoint is preserved unchanged in the verified exact combined backup `871e40c0`. Combined CI run 37030819404 is unaccepted (Windows failure and one flaky Linux case, deployment skipped); the corrected combined track at `1aa8cac1` now passes, while separate main at `d8c74a29` also passes, with exact backup verified at `d8c74a29`; exact-head CI37053058406 passes on that same SHA.

## Final combined code acceptance

Exact combined backup and [run 37053058406](https://github.com/wktw/lookwhaticando/actions/runs/37053058406) are now accepted at `d8c74a29`: Linux and actual Windows pass without retries/flaky cases, and existing automatic Pages deployment succeeded on the same SHA. The final main check passed 4,009 units plus one skip, both builds/137.9 KB and 550 browsers plus the same 24 skipped identities without retries. The remote Linux result independently matches those counts, including 42 WebKit, 42 normal-motion Chromium and seven forced-colour passes; actual Windows passed 4,009 units plus one skip, both typechecks and build. All earlier failures remain historical, unaccepted results. The later documentation checkpoint and its own check/backup/CI are recorded externally.

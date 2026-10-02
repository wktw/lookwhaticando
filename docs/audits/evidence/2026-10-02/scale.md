# G2: journal scale methodology and measurement evidence

**Current reviewed measurements:** the final combined quiet run at clean `ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336` includes the reviewed Windows, notes-region and Shelf occupancy/hit-testing corrections. Both independent output reviewers approved all 192 recomputed statistics, sample counts, preservation outcomes and nine artifact hashes. The earlier `ad27da1` and `6d11f467` archives remain immutable historical evidence; none of their samples are merged into this run. Required full-track/main and exact remote CI remain separate acceptance stages.

Both independent reviewers approved the initial measurement implementation **`b1acfad`** and the completed maintenance/import additions **`c255d0e`**, finalized at review/documentation checkpoint **`6dd7fe2`**. Approval establishes that the harness measures real operations and rejects invalid samples. Final performance conclusions require the combined implementation, the coordinated quiet run and the separate full gate.

## Fixture and measurement boundaries

Twelve daily habits produce 21,900 or 43,800 unique 280-character notes across five or ten 365-day fixture years, with proportional weekly/monthly letters. Independent tests compare every note after real compaction and preserve the unchanged sparse size gate. Construction, validation, fresh cold identities and preservation assertions are outside timed phases.

The production-compiled Chromium harness measures the real watering reducer, real envelope serialization and actual synchronous localStorage commit separately and together. It verifies Undo setup and a completed watering. Quota failure is reported honestly and the prior durable sentinel must survive. This is action/serialization/commit processing time, not full tap-to-persist scheduling latency.

Cold and immediate warm Today, Progress and Detail calls use distinct then shared identities. Lifetime samples call all twelve actual streak computations. A year-1000 backdate must return the same unchanged state. Real Moments and memory components render every expected note/letter, preserve text and scroll, change the in-memory star and pressed state, open the reader and return focus. The star check does not establish a durable main-save commit. Font loading finishes before UI timing. These are isolated components, not route/chunk loading; the existing UI has no filter to measure.

The full snapshot experiment writes seven daily, four weekly and three pre-import records through the actual IndexedDB implementation, lists all fourteen and reads a full journal back. Listing returns metadata but currently materializes whole records; the experiment measures that existing cost. Records and browser context are removed afterward.

The completed additions separately time actual next-day rollover on compacted history, fresh dense-history compaction and plain pasted-backup parsing/decoding/validation. Setup and semantic validation remain outside each interval. Rollover guards require observable restock, expiry and provenance folding; import size refusal remains distinct from a successful parse. Both reviewers approved these additions, including the independent clock witness that rejects timing setup as maintenance. Their five-year compiled smoke confirms real operations and journal preservation only. See [inherited followup evidence](inherited-followups.md) for exact regressions, mutation results and the smoke's limits.

The completed quiet run records five samples of each state, maintenance and import phase per fixture, five metadata-list samples, fourteen snapshot writes and one full restore read. The component UI journey runs once per fixture; its result must not be called a five-sample median. The final measured SHA is the clean combined checkpoint supplied at the quiet window, not an earlier prepared integration head.

## Independent review and smoke evidence

Both reviewers independently passed all six dense-fixture and unchanged-size controls. Shortening notes to 279 characters and making their text repeat each fail two shape tests.

At `667805b`, three real browser mutants incorrectly succeeded: no-op star, lost reader focus and skipped measured watering. The author added explicit semantic assertions; all three mutants fail for the intended reason at `b1acfad`. The star is selected by `aria-pressed`, avoiding reliance on its position when C6 adds an Edit button.

Final typecheck and a clean five-year, one-sample smoke passed. It preserved 21,900 notes / 6,132,000 note characters, rendered 1,825 Moments and 320 letters, changed the in-memory star and pressed state, retained scroll and returned focus. Actual localStorage raised `QuotaExceededError`; the prior sentinel survived. This was a busy-machine diagnostic smoke with snapshots disabled, so its timings are deliberately not benchmark evidence.

## Quiet execution checkpoint

The coordinated quiet run completed with actual exit 0 on **`ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336`**, from 18:04:28 to 18:04:53 UTC on 2 October 2026. The same source was clean before and after the run. Both five- and ten-year fixtures completed. Every one of the ten localStorage commit attempts was quota-refused and preserved the prior durable value; no successful durable commit is claimed for these dense fixtures. Each fixture completed fourteen full-retention snapshot writes, five list samples and one full read while preserving its journal. Both final reviewers approved the measurements and decisions: all 192 recomputed statistics agree and all nine artifact hashes match. This completed measurement is not full package/main acceptance.

## Reviewed observations and decisions

The environment was Linux 6.18.44, Node 24.19.0 and Chromium 143.0.7499.4 on an AMD EPYC 9V74 host. Five logical CPUs were reported, with a four-CPU-equivalent cgroup quota and a 16 GiB memory limit. No browser CPU throttle was applied. The recorded interval added no cgroup throttling or OOM events; no live relevant test/build/browser process was present in the pre/post captures. Chromium used 390×844, scale 1, reduced motion and UTC.

The [raw results](scale/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/journal-scale.json), [complete observations and tracked decisions](scale/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/decision-draft.md), [derived statistics](scale/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/derived-summary.json) and [hash manifest](scale/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/SHA256SUMS) preserve exact values and provenance. The archived report’s opening pending-review wording records its original checkpoint; both final reviews subsequently approved it. Its SHA-256 is `ef79a46aa5952d081e5ef558c2fb76d0065a0fb5c241623117c4c3251a08476b`; raw JSON is `c0590e5bcd2d1c4f8f82832cc4bb499bd892a8ad445b16351ea9e5fb74e02c94`.

Repeated times below are medians in milliseconds, **n=5 per fixture**. Moments rendering is explicitly a single UI observation. The report retains minima, maxima and all samples.

| Phase | Five years | Ten years |
|---|---:|---:|
| Action + serialization + quota-refused write | 23.8 | 46.3 |
| Cold Progress view | 54.1 | 152.6 |
| Daily rollover/provenance work | 48.1 | 115.1 |
| Dense-history compaction | 33.2 | 72.4 |
| Accepted plain pasted import | 20.8 | 42.0 |
| Moments render, n=1 | 638.4 | 1,558.6 |
| Full-retention snapshot listing | 245.9 | 562.2 |

Both inputs were accepted by the parser: 7,568,895 and 14,959,103 characters. That establishes parse/decode/validation, not applying and durably saving either journal. The action row measures processing followed by refused writes, not successful persistence latency. Fourteen snapshot writes fill fourteen distinct retention slots once; they are not fourteen repeated full-retention experiments. Full restore read has n=1 per fixture. Cold views use fresh identities, not cold application launches.

The approved engineering decisions retain every note and the existing thresholds:

- **P-persistence-07:** prioritize dense-journal durable-save capacity during the owner’s later review. Storage migration design belongs to parked WP-E2; it has not shipped.
- **P-ui-09:** prioritize month/year pagination for Moments before the smaller memory shelf, preserving access, in-memory stars, scroll and focus. No pagination or filter shipped in this measurement package.
- **P-persistence-11:** plan metadata-only snapshot listing with the next storage revision. Current full retention/restore succeeds, while listing still reads whole records.
- **P-history-15:** retain memoization; assess further cold-Progress splitting against parked phone budgets. Any later incremental summaries must prove equivalent results.
- Track ten-year daily maintenance cost with that incremental work. Retain the existing import bound/cancellation contract; defer a worker change pending device or larger accepted-input evidence.

These are concrete recorded decisions for existing findings, not implementation of the deferred changes. Both final reviewers found no numerical or evidence gap in the refreshed run. The refreshed thirteen-file archive is committed at evidence-only checkpoint `1aa8cac1`; its measured source remains `ee7a33fb`. The [current archive index](scale/README.md) separates current `ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336` evidence from both preserved historical archives. Differences among the three runs are not attributed to any repair: no controlled causal comparison was performed.

The original G2 full run at `5471443` remains rejected despite exit 0 (485 browser passes, 24 skips and one retry-passed contrast scan). Its twice-reviewed test-only correction then passed full track `e05ae227` and main `9f1ff727`: 3,994 units plus one skip, both builds/137.9 KB and 510 browsers plus 24 unchanged skips, without retries. Later remote Windows and notes-lane findings were separately diagnosed and reviewed. The notes CSS correction was measured at `6d11f467`; the subsequent Shelf occupancy/decorative-hit repair is included in this current `ee7a33fb` run. Neither refresh authorizes rewriting either earlier raw report. See [integration history](integration-followups.md), [platform findings](platform-quality.md) and the [completion ledger](../../WEB_COMPLETION_LEDGER.md) for their distinct full-check and exact-head CI results.

A 390-pixel desktop viewport is not a physical iPhone measurement. Phone budgets remain with parked WP-E4/device work. No notes are pruned, no existing threshold is weakened, and no storage migration is implied by this measurement package.

Reproduction instructions: [measurement README](../../../../tests/perf/README.md). Source controls: [journal fixture tests](../../../../tests/unit/state/journalScale.test.ts) and [browser phases](../../../../tests/perf/browser.tsx).

The corrected combined full track at clean `1aa8cac113767f9cfb6a9149f84eb6c37cc9c0d1` passed with actual exit 0: 4,009 units plus one skip (241 files plus one skipped), both builds/137.9 KB, 550 browsers plus the same 24 skipped identities in 15.2 minutes, with no failures, retries or flaky cases. All 42 WebKit, 42 normal-motion Chromium and seven forced-colour cases passed. Status-only checkpoint `5208dc4bb20d767b9db315a7590a8ae6344ed670` records the result; all 27 raw measurement hashes remain unchanged. The separate main check at clean `d8c74a299f6f07f2f25fc7f55c0bf298523fa1a9` then completed with actual exit 0: 4,009 units plus one skip (241 files plus one skipped), both builds/137.9 KB and 550 browsers plus the same 24 skipped identities in 16.1 minutes. All 42 WebKit, 42 normal-motion Chromium and seven forced-colour cases passed; the complete 907-line result had no failures, retries or flaky cases. Exact backup is now verified at `d8c74a29`; Linux/Windows run37053058406 passes, including existing automatic Pages deployment.

## Final combined code acceptance

Exact combined backup and [run 37053058406](https://github.com/wktw/lookwhaticando/actions/runs/37053058406) are now accepted at `d8c74a29`: Linux and actual Windows pass without retries/flaky cases, and existing automatic Pages deployment succeeded on the same SHA. The final main check passed 4,009 units plus one skip, both builds/137.9 KB and 550 browsers plus the same 24 skipped identities without retries. The remote Linux result independently matches those counts, including 42 WebKit, 42 normal-motion Chromium and seven forced-colour passes; actual Windows passed 4,009 units plus one skip, both typechecks and build. All earlier failures remain historical, unaccepted results. The later documentation checkpoint and its own check/backup/CI are recorded externally.

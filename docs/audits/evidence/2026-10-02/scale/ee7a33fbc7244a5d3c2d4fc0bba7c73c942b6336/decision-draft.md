# G2 final Shelf-source quiet observations and decision draft

Status: one completed quiet refresh invocation on the new combined product source; independent output review and ordered repair package/main gates pending. This measurement adds no product or storage change. Both historical ad27da15 and 6d11f46 archives remain byte-identical.

Measured source: `ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336`. Clean before and after; raw schema 2, `dirty: false`, no top-level error. Actual tool session **36679**, exit **0**. UTC start **2026-10-02T18:04:28Z**, end **2026-10-02T18:04:53Z**. Both scenarios completed; no retry or continuation.

The root explicitly authorized this quiet run after the reviewed Shelf target/occupancy repair was integrated into the combined source. The coordinator confirmed exact clean source, unchanged private dependencies/harness, no live workload and free ports at 17:54:15 UTC; all local heavy jobs were held. Immediate preflight and postflight each found zero live relevant Node/test/build/browser processes. Historical zombie processes are counted separately and consumed no runtime work. Both older archives' nine hashes were checked before and after; all eighteen remain unchanged.

Environment: linux 6.18.44, Node v24.19.0, Chromium 143.0.7499.4, AMD EPYC 9V74 80-Core Processor. Five reported logical CPUs; cgroup quota `400000 100000` limits capacity to four CPU equivalents. Host-visible RAM 18,882,699,264 bytes; cgroup memory limit 17,179,869,184 bytes. No CPU-throttling option was applied to Chromium; the host cgroup constraint still applies. The recorded interval added 0 cgroup throttled periods and 0 throttled microseconds. No new OOM events. This is desktop Chromium at 390×844, scale 1, reduced motion and UTC, not a physical iPhone.

Raw data: `journal-scale.json`; complete output: `run.log`; provenance: `before.json`, `after.json`, `start-utc.txt`, `end-utc.txt`, `exit-status.txt`. `derived-summary.json` contains computed statistics and cardinality checks. `SHA256SUMS` pins these artifacts. No repository copy or evidence commit for this refresh exists yet. The planned separate archive is `docs/audits/evidence/2026-10-02/scale/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/`; both earlier archives remain immutable historical evidence; neither is relabelled as this measured source. The exact checkout was `/workspace/wt/windows-forward-1640`; the runner freshly compiled its isolated production measurement entry from this clean SHA.

## Exact invocation

```sh
PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
XDG_CACHE_HOME=/workspace/browser-cache \
XDG_CONFIG_HOME=/workspace/browser-config \
ALSOFT_DRIVERS=null TZ=UTC \
npm run perf:scale -- --years=5,10 --samples=5 --ui=true --snapshots=true \
  --out=/workspace/g2-final-measurements/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/journal-scale.json \
  > /workspace/g2-final-measurements/ee7a33fbc7244a5d3c2d4fc0bba7c73c942b6336/run.log 2>&1
```

No audit, install or registry command was invoked. npm printed a version-update notice; this log does not establish whether that notice used cached metadata. Isolated-harness build warnings about a shared static/dynamic import and a large measurement chunk are retained; they are not measurements of the shipped app bundle.

## Fixtures and semantic evidence

| Field | Five years | Ten years |
| --- | ---: | ---: |
| Habits | 12 | 12 |
| Full unique 280-character notes | 21,900 | 43,800 |
| Note characters | 6,132,000 | 12,264,000 |
| Encoded characters | 7,568,844 | 14,959,052 |
| Encoded UTF-8 bytes | 7,568,844 | 14,959,052 |
| UTF-16 payload bytes | 15,137,688 | 29,918,104 |
| Check-ins | 21,900 | 43,800 |
| Journal fingerprint | 3,148,841,511 | 1,681,579,141 |
| Letters | 320 | 640 |

Fixture years are 365 days each. All ten main-save writes were **QuotaExceededError**; all ten retained the prior durable sentinel. There were **zero successful localStorage commits**. This proves a capacity limit for these dense fixtures in this browser, not successful persistence latency or a migration.

Both histories preserved every journal note through real watering, routine next-day maintenance, dense compaction, import acceptance, UI actions and snapshot restore. Every maintenance sample folded six reversed-order witnesses and preserved stacking counts. Routine rollover advanced to September 30 and removed 12 old timestamped log-days and 13 old ledger entries, restocking 35 pantry entries. Dense compaction removed 20,448 / 42,348 old timestamped log-days and 23,621 / 47,346 old ledger entries; it restocked zero entries as expected for that separate workload.

Pasted imports were accepted in all five samples per fixture: 7,568,895 / 14,959,103 characters and the same UTF-8 byte counts, below the existing 67,108,864-character limit. These are actual parse/decode/validation and clock-normalization measurements; neither fixture was refused by the input bound.

Moments rendered 1,825 / 3,650 notes from one habit and verified the in-memory star change, its pressed state and retained scroll. This UI check reads `state.peek()` and the button state; it does not reread durable storage and is not evidence of a successful main save. Memory rendered 320 / 640 letters and verified return focus and scroll. Each fixture committed all fourteen IndexedDB retention records (7 daily, 4 weekly, 3 pre-import), completed five metadata lists and one full journal-preserving restore read; temporary records were removed.

## Timing observations

All values are milliseconds, rounded to one decimal only in this table; raw precision remains in JSON. Repeated phases show **median [min–max], n**. Single observations are explicitly n=1. Fourteen writes fill fourteen retention slots once; they are not fourteen repetitions of the full-retention experiment.

| Phase | Five years | Ten years |
| --- | ---: | ---: |
| Watering reducer | 2.5 [2.0–10.4], n=5 | 4.3 [3.9–7.3], n=5 |
| Envelope serialization | 18.9 [17.9–19.5], n=5 | 36.4 [36.1–37.2], n=5 |
| localStorage quota refusal | 2.0 [1.8–2.2], n=5 | 4.8 [4.6–6.8], n=5 |
| Action + serialization + refused write | 23.8 [21.9–31.2], n=5 | 46.3 [44.9–49.0], n=5 |
| Today cold identities | 14.4 [12.9–25.6], n=5 | 34.6 [33.5–45.7], n=5 |
| Today warm identities | 0.5 [0.3–0.9], n=5 | 0.3 [0.3–0.7], n=5 |
| Progress cold identities | 54.1 [49.5–79.4], n=5 | 152.6 [126.1–164.6], n=5 |
| Progress warm identities | 0.0 [0.0–0.1], n=5 | 0.0 [0.0–0.1], n=5 |
| Detail cold identities | 9.3 [5.1–28.4], n=5 | 13.7 [9.2–17.8], n=5 |
| Detail warm identities | 2.3 [2.0–5.4], n=5 | 5.4 [4.6–10.1], n=5 |
| Twelve-habit lifetime walk | 5.1 [4.5–6.3], n=5 | 15.5 [12.1–22.0], n=5 |
| Daily rollover / provenance reconciliation | 48.1 [40.0–73.2], n=5 | 115.1 [95.3–141.9], n=5 |
| Full dense-history compaction | 33.2 [24.7–39.9], n=5 | 72.4 [57.7–91.7], n=5 |
| Plain pasted-backup parse/decode/validate | 20.8 [18.6–25.1], n=5 | 42.0 [37.4–45.1], n=5 |
| Rejected unreasonable backdate | 0.1 [0.1–0.1], n=5 | 0.1 [0.1–0.1], n=5 |
| Moments render | 638.4, n=1 | 1558.6, n=1 |
| Moments scroll | 30.4, n=1 | 29.8, n=1 |
| Moments star action | 54.6, n=1 | 86.7, n=1 |
| Memory shelf render | 82.3, n=1 | 214.2, n=1 |
| Memory reader open | 88.5, n=1 | 82.8, n=1 |
| Memory reader return | 50.1, n=1 | 50.1, n=1 |
| IndexedDB writes: 14 retention slots | 27.1 [26.5–34.5], n=14 | 56.8 [54.0–60.0], n=14 |
| IndexedDB full-retention metadata listing | 245.9 [227.8–322.7], n=5 | 562.2 [545.1–587.2], n=5 |
| IndexedDB full restore read | 22.9, n=1 | 41.0, n=1 |

Cold/warm measurements are derived-view calls with fresh/shared object identities, not app launches. Action totals exclude frame/debounce scheduling. UI results are isolated component journeys with fonts prepared and frame/settling waits included, not full route/chunk-loading times; neither component has a filter. Pasted-import times exclude file reads, CK1 decompression, preview rendering, protective snapshots and applying the save. Current metadata listing reads full records internally.

## Decisions and tracked follow-ups

| Tracked item | Evidence | Engineering decision and deferred implementation |
| --- | --- | --- |
| Main-save capacity — [P-persistence-07](../../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | 5/5 quota refusals for each fixture; prior sentinel survives every refusal | First priority for the owner review: resolve dense-journal durable-save capacity. Measurements justify storage migration design under parked WP-E2 and INV-5. No exact universal cutover threshold is inferred from two fixture sizes; migration implementation remains deferred, and must preserve notes and prior durable data. |
| Moments / memory pagination — [P-ui-09](../../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | Moments opens 638.4 / 1,558.6 ms with 16,429 / 32,854 DOM nodes; shelf opens 82.3 / 214.2 ms, all n=1 | Next rendering priority: plan month/year pagination for Moments before optimizing the smaller memory shelf. Preserve access to every note, in-memory star state, scroll and focus. Track implementation for the owner review; these single UI observations establish a bottleneck, not a new budget or a shipped pagination/filter feature. |
| Snapshot metadata-only listing — [P-persistence-11](../../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | 245.9 / 562.2 ms list medians for all fourteen actual records; current code reads full states internally | Prioritize a metadata-only listing design in the next storage revision, with migration/restore correctness under WP-E2. The current fourteen-record retention and restore pass; expensive listing remains a tracked follow-up. No schema change is included. |
| Cold Progress / incremental summaries — [P-history-15](../../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | Progress cold medians 54.1 / 152.6 ms versus warm median 0; Today/detail also reported | Retain existing memoization. Track cold-path cost for parked WP-E4 phone-budget evaluation; defer further splitting until that budget is assessed, as the existing plan requires. Any incremental-summary implementation must first prove semantic equivalence. |
| Daily provenance reconciler — B4 delegated cost | 48.1 / 115.1 ms medians, maxima 73.2 / 141.9 ms, on actual next-day processing | Track the ten-year main-thread maintenance cost for incremental-maintenance investigation alongside derived summaries. Preserve truthful provenance, folded stacking verdicts and every note. Implementation is deferred to the owner review; no new threshold is imposed. |
| Main-thread pasted import / worker — A6 delegated decision | 20.8 / 42.0 ms medians; maxima 25.1 / 45.1 ms on this desktop; both full inputs accepted | Retain the existing input bound and cancellation contract; defer a worker change pending physical-device or larger accepted-input evidence. This run neither establishes nor rules out a phone requirement. No worker is shipped. |

These engineering decisions prioritize existing tracked follow-ups; implementation and physical-device budgets remain deferred to their authorized owner-review scope. They introduce no new acceptance thresholds. Existing size/performance gates remain unchanged. Physical-device work, native app and App Store work remain parked. Package/main gates, exact backup and CI remain separate coordinator work under the owner's existing authorization.

This refresh is assessed on its own samples. Differences from either historical run are not attributed to the Shelf repair: no controlled causal comparison was performed.

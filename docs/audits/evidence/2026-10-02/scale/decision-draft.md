# G2 final quiet observations and decision draft

Status: one completed measurement invocation; independent output review and ordered package/main gates pending. No product/storage change is included.

Measured source: `ad27da15242987be62f8d7696cfdba98f74f36b0`. Clean before and after; raw schema 2, `dirty: false`, no top-level error. Actual exit **0**. UTC start **2026-10-02T13:04:05Z**, end **2026-10-02T13:04:32Z**. Both scenarios completed; no retry or continuation.

The root authorized this quiet window after accepted G1 main; coordinator confirmed all track/main jobs idle at 13:01:54 UTC and B8 separately released main. Preflight and postflight found zero live relevant Node/test/build/browser processes. Historical zombie process records are retained in the raw environment file; they consumed no runtime work.

Environment: linux 6.18.44, Node v24.19.0, Chromium 143.0.7499.4, AMD EPYC 9V74 80-Core Processor. Five reported logical CPUs; cgroup quota `400000 100000` limits capacity to four CPU equivalents. Host-visible RAM 18,882,699,264 bytes; cgroup memory limit 17,179,869,184 bytes. No CPU-throttling option was applied to Chromium; the host cgroup constraint still applies. The recorded interval added zero cgroup throttled periods and zero throttled microseconds. No new OOM events. This is desktop Chromium at 390×844, scale 1, reduced motion and UTC, not a physical iPhone.

Raw data: `journal-scale.json`; complete output: `run.log`; provenance: `before.json`, `after.json`, `start-utc.txt`, `end-utc.txt`, `exit-status.txt`. `derived-summary.json` contains computed statistics and cardinality checks. `SHA256SUMS` pins these artifacts. No repository copy or evidence commit exists yet.

## Exact invocation

```sh
PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
XDG_CACHE_HOME=/workspace/browser-cache \
XDG_CONFIG_HOME=/workspace/browser-config \
ALSOFT_DRIVERS=null TZ=UTC \
npm run perf:scale -- --years=5,10 --samples=5 --ui=true --snapshots=true \
  --out=/workspace/g2-final-measurements/ad27da15242987be62f8d7696cfdba98f74f36b0/journal-scale.json \
  > /workspace/g2-final-measurements/ad27da15242987be62f8d7696cfdba98f74f36b0/run.log 2>&1
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
| Watering reducer | 2.5 [2.1–10.5], n=5 | 5.1 [3.9–7.4], n=5 |
| Envelope serialization | 18.9 [18.4–21.1], n=5 | 39.6 [37.0–42.5], n=5 |
| localStorage quota refusal | 2.3 [2.0–2.7], n=5 | 6.1 [5.1–7.7], n=5 |
| Action + serialization + refused write | 24.0 [22.5–31.4], n=5 | 51.7 [46.0–52.9], n=5 |
| Today cold identities | 15.0 [12.9–24.9], n=5 | 35.6 [34.6–56.1], n=5 |
| Today warm identities | 0.5 [0.3–0.6], n=5 | 0.4 [0.4–0.6], n=5 |
| Progress cold identities | 61.2 [51.4–78.4], n=5 | 148.6 [131.6–173.5], n=5 |
| Progress warm identities | 0.0 [0.0–0.0], n=5 | 0.0 [0.0–0.1], n=5 |
| Detail cold identities | 7.0 [5.3–9.4], n=5 | 18.2 [8.9–32.1], n=5 |
| Detail warm identities | 2.4 [1.9–2.9], n=5 | 5.3 [4.8–12.3], n=5 |
| Twelve-habit lifetime walk | 5.9 [4.2–6.7], n=5 | 17.6 [13.2–23.5], n=5 |
| Daily rollover / provenance reconciliation | 45.6 [37.8–60.0], n=5 | 131.1 [112.9–209.8], n=5 |
| Full dense-history compaction | 28.9 [25.4–40.6], n=5 | 74.2 [58.1–86.7], n=5 |
| Plain pasted-backup parse/decode/validate | 19.8 [18.2–24.0], n=5 | 42.6 [38.9–47.4], n=5 |
| Rejected unreasonable backdate | 0.1 [0.0–0.1], n=5 | 0.1 [0.0–0.3], n=5 |
| Moments render | 648.8, n=1 | 1611.6, n=1 |
| Moments scroll | 21.7, n=1 | 42.1, n=1 |
| Moments star action | 67.3, n=1 | 119.7, n=1 |
| Memory shelf render | 82.5, n=1 | 175.0, n=1 |
| Memory reader open | 98.9, n=1 | 82.8, n=1 |
| Memory reader return | 50.0, n=1 | 50.0, n=1 |
| IndexedDB writes: 14 retention slots | 33.2 [28.1–53.1], n=14 | 73.9 [61.6–89.0], n=14 |
| IndexedDB full-retention metadata listing | 249.9 [222.1–275.6], n=5 | 606.3 [596.7–720.3], n=5 |
| IndexedDB full restore read | 23.2, n=1 | 41.1, n=1 |

Cold/warm measurements are derived-view calls with fresh/shared object identities, not app launches. Action totals exclude frame/debounce scheduling. UI results are isolated component journeys with fonts prepared and frame/settling waits included, not full route/chunk-loading times; neither component has a filter. Pasted-import times exclude file reads, CK1 decompression, preview rendering, protective snapshots and applying the save. Current metadata listing reads full records internally.

## Decisions and tracked follow-ups

| Tracked item | Evidence | Engineering decision and deferred implementation |
| --- | --- | --- |
| Main-save capacity — [P-persistence-07](../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | 5/5 quota refusals for each fixture; prior sentinel survives every refusal | First priority for the owner review: resolve dense-journal durable-save capacity. Measurements justify storage migration design under parked WP-E2 and INV-5. No exact universal cutover threshold is inferred from two fixture sizes; migration implementation remains deferred, and must preserve notes and prior durable data. |
| Moments / memory pagination — [P-ui-09](../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | Moments opens 648.8 / 1,611.6 ms with 16,429 / 32,854 DOM nodes; shelf opens 82.5 / 175.0 ms | Next rendering priority: plan month/year pagination for Moments before optimizing the smaller memory shelf. Preserve access to every note, in-memory star state, scroll and focus. Track implementation for the owner review; these single UI observations establish a bottleneck, not a new budget or a shipped pagination/filter feature. |
| Snapshot metadata-only listing — [P-persistence-11](../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | 249.9 / 606.3 ms list medians for all fourteen actual records; current code reads full states internally | Prioritize a metadata-only listing design in the next storage revision, with migration/restore correctness under WP-E2. The current fourteen-record retention and restore pass; expensive listing remains a tracked follow-up. No schema change is included. |
| Cold Progress / incremental summaries — [P-history-15](../../../CATKIN_AUDIT_IMPLEMENTATION_PLAN.md#wp-g2-scale-and-long-history-m-medium) | Progress cold medians 61.2 / 148.6 ms versus warm median 0; Today/detail also reported | Retain existing memoization. Track cold-path cost for parked WP-E4 phone-budget evaluation; defer further splitting until that budget is assessed, as the existing plan requires. Any incremental-summary implementation must first prove semantic equivalence. |
| Daily provenance reconciler — B4 delegated cost | 45.6 / 131.1 ms medians, maxima 60.0 / 209.8 ms, on actual next-day processing | Track the ten-year main-thread maintenance cost for incremental-maintenance investigation alongside derived summaries. Preserve truthful provenance, folded stacking verdicts and every note. Implementation is deferred to the owner review; no new threshold is imposed. |
| Main-thread pasted import / worker — A6 delegated decision | 19.8 / 42.6 ms medians; maxima 24.0 / 47.4 ms on this desktop; both full inputs accepted | Retain the existing input bound and cancellation contract; defer a worker change pending physical-device or larger accepted-input evidence. This run neither establishes nor rules out a phone requirement. No worker is shipped. |

These engineering decisions prioritize existing tracked follow-ups; implementation and physical-device budgets remain deferred to their authorized owner-review scope. They introduce no new acceptance thresholds. Existing size/performance gates remain unchanged. Physical-device work, native app and App Store work remain parked. Package/main gates, exact backup and CI remain separate and pending coordinator; no future CI-triggering backup or registry call is authorized by this report.

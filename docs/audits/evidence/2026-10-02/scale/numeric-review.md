# Independent G2 final numeric/evidence review

**APPROVED as a complete, observational desktop measurement of the approved harness, including the final revised decisions and wording.** No missing promised phase, invalid outcome, numeric mismatch, provenance mismatch or unsupported conclusion was found in this bounded review. This is not successful long-journal localStorage qualification, a physical-phone performance approval, or package/main/remote gate acceptance.

Measured source: `ad27da15242987be62f8d7696cfdba98f74f36b0` in `/workspace/wt/g2`. Reviewed original artifacts at `/workspace/g2-final-measurements/ad27da15242987be62f8d7696cfdba98f74f36b0/`, the approved checklist, the actual source of `run.mjs`, `browser.tsx`, `operations.ts`, the methodology and C6's final decision draft. No test, build, benchmark, install, audit or network call was performed by this reviewer. Computation was limited to parsing existing result files and independently checking their arithmetic/cardinalities.

## Provenance and quiet-run evidence

- The exact log invocation is `npm run perf:scale -- --years=5,10 --samples=5 --ui=true --snapshots=true`, with the external final-SHA output path.
- UTC start `2026-10-02T13:04:05Z`, end `2026-10-02T13:04:32Z`; the supplied actual tool completion is exit 0, also recorded in `exit-status.txt`. The entire 21-line log was read. Both fixture summaries and final output completion are present. There is no top-level report error or missing/partial phase.
- Raw `schema: 2`, the full measured SHA and `dirty: false` match clean preflight and postflight git records. The current measured checkout remains at that same SHA with clean status; no later evidence commit is being mislabeled as the measured source.
- Coordinator quiet proof at 13:01:54 UTC and B8 main release are recorded in both pipeline evidence and preflight. All 599 preflight relevant process records are zombies; there are no live relevant records. Postflight records zero live relevant processes. No cgroup throttling-event/time increment and no OOM/memory-event change occurred between those captures. This corroborates the reserved quiet local run; it is not a claim about all host activity at every instant.
- Actual environment: Linux 6.18.44 x86_64; Node v24.19.0; Chromium 143.0.7499.4; AMD EPYC 9V74. Five reported logical CPUs with `400000 100000` cgroup CPU quota (four CPU equivalents); host-visible RAM 18,882,699,264 bytes, cgroup limit 17,179,869,184 bytes. Viewport 390×844, scale 1, UTC and reduced motion; no Chromium CPU throttling.
- All nine artifact hashes in the latest `SHA256SUMS` match. Raw JSON SHA-256: `a760256bb19ff08a436ecbb5c766d76954e68754d6e59c69b21b62b0feca3b9b`; complete log: `6af7ec4ca3f5d2f63bb017e9c5fa72cfab8085d5f2daac146752f69c22ca15fd`; reviewed decision draft: `c815b64a3b4c3458add7ab092458f3f8c229c1fbd5dd9be0c4a3455a15465e24`.
- The measurement-build chunk/import warnings concern the isolated harness, not the shipped entry budget. The npm update notice is retained; as the draft correctly says, the log alone cannot establish whether that notice used cached metadata.

## Completeness and semantic outcomes

Exactly two scenarios exist: five and ten 365-day years, both twelve habits. They contain 21,900 / 43,800 notes and 6,132,000 / 12,264,000 note characters, averaging the promised 280 characters per note. The approved fixture and guards establish their full unique contents. Encoded payloads are 7,568,844 / 14,959,052 characters and UTF-8 bytes, and 15,137,688 / 29,918,104 UTF-16 payload bytes. Fingerprints are 3,148,841,511 / 1,681,579,141; check-in totals equal note totals. Letters are 320 / 640.

All eight derived/walk/backdate arrays, the action array and each of the three maintenance/import arrays have exactly five entries per fixture. All observed timings are finite and nonnegative. Zero warm timings are resolution-level observations, not evidence that calls perform literally no work. Each combined action duration is at least the sum of its measured phases, allowing floating-point precision.

**Every main-save attempt is `QuotaExceededError`: five per fixture, ten total, zero successful commits.** All ten `previousKept` flags are true. Source inspection confirms this checks an actual small durable predecessor sentinel after the real localStorage call; it does not replace a failed disk write with memory. The watering guards require count 0→1 and preserved note count/characters/content fingerprint. The result is an observed capacity limitation for these two dense fixtures in this browser, not a measured exact capacity threshold or successful-save latency.

Each next-day sample advances to 2026-09-30, folds six deliberate reversed-order witnesses, removes twelve old timestamped log-days and thirteen old ledger entries, restocks all 35 pantry entries, and preserves journal/stacking guards. Dense compaction is a distinct same-day workload: it removes 20,448 / 42,348 old timestamped log-days and 23,621 / 47,346 ledger entries, preserves six witnesses and the journal/stacking guards, and correctly records zero restocks.

**Both pasted-import sizes are accepted in all five samples.** The inputs are 7,568,895 / 14,959,103 characters (identical UTF-8 byte counts), below the existing 67,108,864-character bound; all preservation flags are true. The ten-year result is not a too-large refusal. Acceptance here means the real plain JSON parse/decode/validate/normalize path; it does not claim applying and durably saving that journal succeeded.

Moments renders 1,825 / 3,650 notes from one habit and confirms an in-memory star change plus its rendered pressed state and retained scroll. Its store uses the isolated memory adapter; this UI action does not prove a durable main-save write. Memory renders all 320 / 640 letters and confirms returned focus and scroll. These are one actual UI journey per fixture, not five repeated measurements.

Each real IndexedDB phase completes fourteen committed retention slots (seven daily, four weekly, three pre-import), five listings of all fourteen metadata records and one complete journal-preserving read. The approved source checks the full read and removes temporary records before resolving. Metadata-only *return values* do not imply a metadata-only implementation: current listing reads whole records internally.

## Independent numerical recomputation

Independently calculated all sample counts, medians and extrema from raw arrays, then compared all **192** statistic fields with C6's `derived-summary.json`: exact agreement. The final numerical decision table matches those observations. Re-read and verified the bounded documentation corrections: the UI star action is explicitly in-memory, with no durable-main-save claim, and the decisions now link existing P-persistence-07, P-ui-09, P-persistence-11 and P-history-15 findings. All nine regenerated manifest entries match; the original eight non-draft artifacts remain unchanged. Machine-readable recomputation is retained outside the repository at `/workspace/g2-final-numeric-recomputed.json`.

All values below are milliseconds. Repeated phases show median [minimum–maximum] and actual n. Values with n=1 are individual observations, without a distribution claim. Fourteen snapshot writes fill fourteen slots once; they are not fourteen independent full-retention runs. Display precision is two decimals; raw precision is retained.

| Phase | Five years | Ten years |
| --- | ---: | ---: |
| Watering reducer | 2.50 [2.10–10.50]; n=5 | 5.10 [3.90–7.40]; n=5 |
| Envelope serialization | 18.90 [18.40–21.10]; n=5 | 39.60 [37.00–42.50]; n=5 |
| localStorage quota refusal | 2.30 [2.00–2.70]; n=5 | 6.10 [5.10–7.70]; n=5 |
| Action + serialization + refused write | 24.00 [22.50–31.40]; n=5 | 51.70 [46.00–52.90]; n=5 |
| Today, cold identities | 15.00 [12.90–24.90]; n=5 | 35.60 [34.60–56.10]; n=5 |
| Today, warm identities | 0.50 [0.30–0.60]; n=5 | 0.40 [0.40–0.60]; n=5 |
| Progress, cold identities | 61.20 [51.40–78.40]; n=5 | 148.60 [131.60–173.50]; n=5 |
| Progress, warm identities | 0.00 [0.00–0.00]; n=5 | 0.00 [0.00–0.10]; n=5 |
| Detail, cold identities | 7.00 [5.30–9.40]; n=5 | 18.20 [8.90–32.10]; n=5 |
| Detail, warm identities | 2.40 [1.90–2.90]; n=5 | 5.30 [4.80–12.30]; n=5 |
| Twelve-habit lifetime walk | 5.90 [4.20–6.70]; n=5 | 17.60 [13.20–23.50]; n=5 |
| Next-day rollover/reconciliation | 45.60 [37.80–60.00]; n=5 | 131.10 [112.90–209.80]; n=5 |
| Dense full-history compaction | 28.90 [25.40–40.60]; n=5 | 74.20 [58.10–86.70]; n=5 |
| Accepted plain pasted import | 19.80 [18.20–24.00]; n=5 | 42.60 [38.90–47.40]; n=5 |
| Rejected unreasonable backdate | 0.10 [0.00–0.10]; n=5 | 0.10 [0.00–0.30]; n=5 |
| Moments render | 648.80; n=1 | 1611.60; n=1 |
| Moments scroll | 21.70; n=1 | 42.10; n=1 |
| Moments star | 67.30; n=1 | 119.70; n=1 |
| Memory render | 82.50; n=1 | 175.00; n=1 |
| Memory reader open | 98.90; n=1 | 82.80; n=1 |
| Memory return | 50.00; n=1 | 50.00; n=1 |
| Snapshot writes (14 slots once) | 33.25 [28.10–53.10]; n=14 | 73.95 [61.60–89.00]; n=14 |
| Snapshot listing (14 records) | 249.90 [222.10–275.60]; n=5 | 606.30 [596.70–720.30]; n=5 |
| Full snapshot read | 23.20; n=1 | 41.10; n=1 |

## Decision draft and acceptance limits

The final draft’s conclusions and explicit tracked priorities are supported and proportionate: a confirmed localStorage capacity limit, significant observed cold-view/daily-maintenance work at ten years, an especially concrete Moments-rendering lead, and whole-record snapshot-listing cost. Worker need remains unresolved on phones despite both desktop inputs parsing successfully. Capacity, Moments month/year pagination and metadata-only listing are prioritized existing follow-ups for owner review. Cold Progress splitting remains deferred to the planned phone-budget evaluation; any later incremental-summary work requires semantic equivalence. These are recorded engineering decisions, not shipped changes or new thresholds. Parked WP-E2 remains an owner-review item; WP-E4/G3 physical-device scope remains parked. No note pruning, schema migration or performance assertion relaxation is claimed.

Action totals exclude store scheduling/debounce; view “cold” means fresh object identities, not app launch. UI includes frame/settling waits with fonts already loaded, and measures isolated components rather than route/chunk loading. No filter exists to measure. Import timing excludes file reads, CK1 decompression, preview, protective snapshots and application of the save. The desktop viewport does not establish an iPhone budget.

There are **no outstanding numeric or evidence gaps** against the approved measurement plan. Portable repository copying remains the next documentation step: keep raw bytes/hash identities and the measured source SHA intact. Evidence-only commit, required G2 track/main gates, final backup and remote CI are separate acceptance stages, still pending their owners. This approval authorizes no extra benchmark or implementation work.

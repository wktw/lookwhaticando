# Long journal measurements (WP-G2)

`npm run perf:scale` creates a separate, minified production build of the measurement entry,
serves it on a local ephemeral port, and launches Chromium. It never opens a user's browser
profile. Each fixture gets a fresh browser context and storage; the context and build are
removed afterwards. The shipped app's entry and existing size/performance gates are unchanged.

Run on an otherwise idle machine. Do not compare numbers collected while other builds or
browser tests compete for CPU. Install Playwright Chromium first; use
`PLAYWRIGHT_BROWSERS_PATH` when the browser is installed outside its default location.

```sh
TZ=UTC npm run perf:scale -- --out=test-results/journal-scale.json
# Compile without launching a browser:
npm run perf:scale -- --build-only=true
# A smoke run; useful for harness review, not a benchmark result:
TZ=UTC npm run perf:scale -- --years=5 --samples=1 --snapshots=false
```

Options: `--years=5,10`, `--samples=1..20` (default 5), `--ui=true|false`,
`--snapshots=true|false`, `--out=path`, `--build-only=true|false`.
The machine-readable JSON records commit, dirty-tree status, OS, CPU, Node, Chromium,
viewport and every timing sample. Milliseconds are measured inside the browser with
`performance.now()`. No network, loading, fixture construction or clone setup time is mixed
into derived-view samples. UI component samples explicitly load their bundled fonts before
starting, so initial font fetch and font-swap reflow are excluded. A cold sample has fresh habit and log identities; the immediately
following warm sample uses those same objects. The direct lifetime sample walks streaks for
all twelve habits without the view model's memoization.

The fixture has twelve daily habits, one unique 280-character note per habit per day, and
five or ten 365-day fixture years. It also contains weekly and monthly letters and the
existing collection/pet/company history. It is deliberately dense: 6,132,000 or 12,264,000
note characters before JSON overhead. Tests independently pin its shape, full note
preservation through compaction, and the unchanged sparse fixture size gate.

Measured phases:

- A real domain watering action, envelope serialization, and an actual synchronous
  `localStorage.setItem`, separately and together. Undo setup is outside the sample. This is
  processing time for those phases, not a simulated user tap or the store's frame/debounce
  scheduling delay. A quota failure is a recorded outcome, not a failed performance test;
  the previous durable value must remain intact. A small previous-value sentinel isolates
  the single-save capacity question from backup/recovery overhead.
- Cold and warm Today, Progress and habit-detail view models, all-habit lifetime streak walks,
  and rejection of an unreasonable year-1000 backdate without state change.
- Actual next-day `openDay` on a fresh clone of the already compacted history, including B4's
  daily provenance reconciler. A separate sample runs `compactSave` on a fresh dense history
  with old ledger entries and timestamps still present. These are different workloads: routine
  daily maintenance versus full-history compaction. Before each timer, one expiring day per
  stacked pair is made observably out of order. The real fold must preserve that verdict when
  old timestamps disappear. Cloning, witness setup, note fingerprints, stack-count comparisons
  and validation are outside the timed transaction; samples never cumulatively age the fixture.
- Actual plain pasted-backup `parseBackupText`, including `JSON.parse`, migration, shared
  decoding/validation and imported-clock normalization (A6's deferred worker decision). A real
  backup envelope is stringified outside the timer. This measures parsing/acceptance, not file
  reading, CK1 decompression, import-sheet rendering, snapshot creation or applying the save.
  The existing pasted-input bound uses JavaScript `text.length`; the report names its input
  and limit in characters and separately records UTF-8 bytes. If the real parser refuses an
  oversized input, the sample says `too-large`, not accepted; no parse-time claim follows.
- The actual Moments component: render, scroll to the oldest full note, star it, and retain
  scroll. Notes are read inline; this component has no separate reader or filter.
- The actual memory-shelf and ritual-reader components: render all letters, scroll to the
  last one, open its real reader, close it, and record return scroll/focus. This is an isolated
  component measurement, not full Progress route/chunk-loading time. There is no filter in
  the current shelf UI; the report states that explicitly.
- Actual IndexedDB snapshot commits, metadata listing, and one full restore read. The test
  fills all fourteen retention slots (seven daily, four weekly, three pre-import). The
  current implementation reads whole records before returning metadata; this experiment
  measures that cost without changing the storage schema. Every record is removed afterward.

Assertions guard measurement validity: valid fixture, unchanged note count/characters/content
fingerprint, all expected rendered notes and letters, surviving prior storage on quota failure,
a real saved star change, retained scroll and returned focus, and a harmless rejected backdate. They impose no new timing budgets.

The JSON schema is version 2. `maintenanceAndImport` contains separate `rollover`, `compact`
and `pastedImport` arrays, each with `samples` entries. The other state phases and snapshot
metadata list also repeat `samples` times; UI interactions run once per fixture, snapshot writes
fill fourteen slots once, and the full snapshot read runs once. Do not report a five-sample
median for the single UI or snapshot-read observations.

A 390-pixel desktop Chromium viewport is **not** an iPhone performance measurement. Physical
modest-iPhone budgets remain with the parked WP-E4 device work. Desktop numbers guide a later
pagination/incremental-summary or storage decision; they do not justify pruning notes,
weakening the current size gate, or claiming an IndexedDB migration has shipped.

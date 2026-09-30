# catkin audit implementation plan (alternate)

> **Why this file exists.** Two sessions wrote an implementation plan from the same handoff.
>
> - **The canonical plan**, [`CATKIN_AUDIT_IMPLEMENTATION_PLAN.md`](CATKIN_AUDIT_IMPLEMENTATION_PLAN.md), was committed on the base branch by the main development session (46 work packages).
> - **This plan** was written in parallel on `claude/cool-hopper-0cgkon`. It is kept here, unchanged apart from this note, for comparison.
>
> When the two branches met in a merge, the canonical path kept the base branch's plan, so no other session's work was overwritten.
>
> **Package P1-A (§13), already implemented on this branch, overlaps the canonical plan's first package:**
>
> - It covers WP-A1a's FS1, data-d2 and FS4.
> - It also covers WP-A1b's data-d1 storage mode, volatile status, PWA and demo gates, and shell banners.
> - It does **not** cover FS10 (Special Order).
> - It reuses the existing "couldn't be saved" capsule notice for the held case. It does not add a separate `acquiring` result.
>
> Which plan governs, and how P1-A maps onto WP-A1a/A1b, is the owner's call.


**Status:** plan only. No application source, test, configuration, deployment, App Store or purchasing change has been made. Nothing below authorises implementation; each work package starts only when the owner releases it.

**Inputs:** [`CATKIN_COMPREHENSIVE_AUDIT_2026-09-29.md`](CATKIN_COMPREHENSIVE_AUDIT_2026-09-29.md) (read in full, including every second-pass section and all historical appendices) and [`OPUS_5_5_AUDIT_IMPLEMENTATION_PROMPT.txt`](OPUS_5_5_AUDIT_IMPLEMENTATION_PROMPT.txt).

**Planning date:** 29 September 2026.

## How to read this plan

1. **§1 Baseline** says exactly which code the plan was reconciled against and how.
2. **§2 Constraints** lists the product rules that no work package may break.
3. **§3 Shared causes** groups the findings into the smallest set of repairs without losing any finding's own acceptance scenario.
4. **§4 Contracts** defines the invariants that several packages share: save status, writer fencing, operation identity, the replacement protocol, the decoder, validation and history provenance. Later packages refer to these rather than redesigning them.
5. **§5 Phases and dependencies** orders the work and shows what can run in parallel.
6. **§6 Work packages** gives the design, tests and completion criteria for each package.
7. **§7 Validation plan** covers fault injection, races, schema upgrades, WebKit and device testing, and the StoreKit matrix.
8. **§8 Product roadmap** separates recommended enhancements from mandatory repairs.
9. **§9 Subscription and entitlement design** covers the 14-day trial, restore, offline, billing failure, refund and expiry.
10. **§10 Decisions needed** lists only the questions that genuinely need the owner.
11. **§11 Coverage matrix** maps every audit item to a disposition and a package or decision.
12. **§12 Coverage check** proves nothing was dropped and lists release blockers and exit criteria.
13. **§13 First package** recommends where to start.

Sizes use **S / M / L / XL** for complexity and **low / medium / high** for uncertainty. There are deliberately no calendar estimates; the native feasibility spike (WP-N1) must establish device and architecture constraints first.

---

## 1. Baseline and reconciliation method

### 1.1 Repository state at planning time

| Item | Value |
|---|---|
| Branch | `claude/cool-hopper-0cgkon` (tracks `origin/claude/cool-hopper-0cgkon`) |
| HEAD | `6aad1d3` "docs: add comprehensive two-pass audit and Opus planning handoff" |
| Uncommitted work | None (clean working tree before this plan was written) |
| Audit main pin | `c66f5880776c08e2c687922a3ec3a3206595c8da` (HEAD's parent) |
| First integrated pin | `7d16f113769ab5d681b5ddae1dbb8381f364a914` |
| Source drift since the audit pin | **None.** `git diff c66f588 HEAD -- src tests e2e scripts public package.json package-lock.json vite.config.ts vitest.config.ts playwright.config.ts .github` is empty. HEAD adds only the two audit documents. |

No development happened after the audit pin, so there are no "changes made after the audit" to credit. Every finding's status at the pin is therefore its status now. I did not rely on that inference alone: each finding was traced into the current source, directly for the persistence, import, validation and store paths, and through two independent read-only verification passes for the domain/history and UI/interaction/creative paths. Where that tracing refined or disputed the audit's wording, §11 says so.

The pin commit `c66f588` is itself labelled "WIP checkpoint: screens integration in progress (first-paint split, NOTES-w2 requests)". The open `NOTES-w2-*.md` lead requests are in-flight integration work, not audit findings. Where one overlaps an audit finding (for example `NOTES-w2-today.md` request 4 on Quiet rewards in the fx layer, request 21 on toasts over sheets, and request 15, whose after-frame save introduced FS1), the relevant package names it so the two efforts do not collide.

### 1.2 Evidence that could not be re-run here

- **The `catkin-combined-evidence.zip` bundle is not present** in this environment or the repository. Its 33 scratch reproductions (R201–R214 plus the 19 retained or updated checks) could not be executed or inspected. The regression tests in this plan are derived from the audit's written minimal reproductions, which are detailed enough to rebuild them. If the owner can attach the bundle, WP-0 should cross-check each rebuilt regression against its original harness.
- As the handoff requires, those reproductions **demonstrate the defective behaviour**; they are not acceptance tests. Every regression proposed here asserts the intended invariant, so it **fails on the current code and passes only after the fix** (§7.1 describes the `it.fails` ledger that makes this visible in CI).
- Nothing here was run on Windows, macOS, WebKit, an iPhone, VoiceOver or StoreKit. The audit's Windows and CI measurements are cited as the audit's evidence, not re-measured.

### 1.3 Status vocabulary

| Status | Meaning in this plan |
|---|---|
| **Present** | The mechanism exists in current source exactly or materially as described. |
| **Present, refined** | Present; the tracing adds a detail that changes the design or scope (noted). |
| **Partly fixed** | Some of the described behaviour is repaired; the remainder is planned. |
| **Fixed** | Repaired in current source; kept for traceability; only a guard test is planned. |
| **Superseded** | A historical statement no longer applies (for example "You is a placeholder"). |
| **Unconfirmed** | Source-only or device-only; the package includes the check that would confirm it. |
| **Disputed** | Current evidence contradicts the audit's claim (none of the registered findings are disputed; see §11 notes). |
| **Decision** | A product or specification choice, not a defect; resolved by §10 or a default stated there. |
| **Release requirement** | Future native/paid release scope, not a regression in the current web app. |
| **Opportunity** | A recommended enhancement, prioritised in §8, never counted as a bug. |

Evidence labels from the audit are preserved in §11: **Reproduced (R-number)**, **Source**, **Upgrade** (needs a newer schema to matter), **Platform**, **Product**.

### 1.4 Counting without inflation

- **37 original registered findings:** 34 present, 1 partly fixed (integration-i5), 2 fixed (integration-i2, integration-i7). Confirmed unchanged.
- **1 retained, unregistered original finding:** data-d12 (snapshot I/O failure shown as "no copies" or a stuck restore). It appears in the audit's D1–D12 reconciliation table and the "Durable writes" family, but not in the 37-row register. It is planned here as **data-d12** and does not change the 37.
- **22 deeper entries plus one credit correction:** FS1–FS10, UI2-01–UI2-08, HM1–HM4, and SHIP1 (Castoro attribution).
- These 61 audit identifiers (37 + data-d12 + 23) reduce to **14 shared root causes** (§3). FS3, FS8 and FS10 are extensions of D5, D7 and D2/D3 respectively and are carried with those families. HM3 and domain-d2 share one provenance repair. None of this merging removes an ID or its acceptance scenario.
- **Unnumbered risks and opportunities** receive local planning IDs: `RISK-nn` (bounded technical risks), `OPP-nn` (product opportunities), `DEC-nn` (decisions), and `REL-nn` (release gates). §11 lists every one.

### 1.5 Apple and platform facts rechecked on 29 September 2026

The handoff asks for current primary documentation before committing to platform-policy details. Results:

| Claim used in this plan | Source checked | Result |
|---|---|---|
| Uploads must be built with Xcode 26+ and an iOS/iPadOS 26 SDK (build requirement, not a minimum customer OS) | [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a) | **Confirmed**; in effect since 28 April 2026. |
| A two-week free trial is an available introductory offer; eligibility is one introductory offer per customer per subscription group, including returning and upgrading customers | [Introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions) | **Confirmed**; durations include "1 or 2 Weeks". |
| Auto-renewable subscriptions must provide ongoing value, last at least seven days, and work on all the user's devices where the app is available; loot boxes sold for money must disclose odds (3.1.1, 3.1.2, 3.1.2(a)); account deletion is required only if accounts exist (5.1.1(v)) | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | **Confirmed** (page shows no revision date). |
| Age ratings now include 13+, 16+ and 18+; "Override to Higher Age Rating" applies in all regions, with region-specific systems (Australia, Brazil, Korea) | [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating) | **Confirmed.** An 18+ override is available. |
| On-device-only processing is not "collected" for privacy labels; data Apple collects through its own services (purchases) is Apple's to disclose | [App privacy details](https://developer.apple.com/app-store/app-privacy-details/) | **Confirmed.** |
| Capacitor 8 defaults to Swift Package Manager, targets iOS 15 minimum, and needs Xcode 26 | Search results citing capacitorjs.com (the site itself is blocked by this environment's egress proxy) | **Secondary only.** WP-N1 must confirm on capacitorjs.com before adopting. |
| StoreKit testing environments and matrix (Xcode StoreKit testing, sandbox, TestFlight) | [Apple testing page](https://developer.apple.com/documentation/StoreKit/testing-at-all-stages-of-development-with-xcode-and-the-sandbox) | **Not retrievable** here (page renders client-side). The matrix in §9.5 follows the audit's citation; WP-S3 rechecks it. |
| EU trader status, territory-specific metadata, China mainland ICP | Audit's cited App Store Connect pages | **Not rechecked** in this pass; REL-05 rechecks before territory selection. |

Policy details are re-verified again at the start of the paid-release phases, because they change faster than this plan.

### 1.6 Base update merged on 30 September 2026

After this plan was first written, the base branch advanced to `d1554a0` and was merged into this branch. The new work (10 commits):
- copy moved into `lines.ts` and `VOICE.md`;
- the month jar on the Today band;
- a `PlantArt` composition cache;
- decor labels;
- a celebration banner that steps aside when a sheet opens;
- clock pinning in two tests;
- `NOTES-w2-*.md` consolidated into `NOTES-open.md`.

Reconciliation against the findings:

- **Save and domain code unchanged.** `src/state`, `src/app/pwa.ts`, import, validation and domain logic did not change (only a comment in `habits.ts`). Every Phase 1–3 finding stands as described.
- **domain-d7 is now more visible.** The month jar (still `count > 0`, `src/state/views/today.ts:239`) is drawn on the Today band, so a tiny-only month also shows no stem there. Still P3; WP-15 covers it.
- **creative-cr-02 unchanged.** `PlantArt.tsx:197` still ORs `damp` with the watering count; the new composition cache keys on the resulting value.
- **UI2-04 unchanged.** The celebration banner now steps aside for a newly opened sheet. Actionable `Toaster` notes are still portalled outside the sheet's focus trap.
- **integration-i5 unchanged.** `NOTES-open.md` item 7 records hiding the Capsules tab as an open design decision (DEC-15).
- **Line shifts.** Citations in this plan refer to `6aad1d3`. In files the merge touched, the lines moved:
  - `PlantArt.tsx`: the damp line is now `:197`.
  - `WindowsillBand.tsx`: the damp set is now `:149`.
  - `sheetStack.ts`: `trapTab` is now `:136`.
  - `ShelfScreen.tsx`: +6 lines after `:362`.
  - `src/catalog/lines.ts` and the per-screen `copy.ts` files: copy moved; for example, the Castoro credit is now `lines.ts:1193` and the Start over copy is `lines.ts:1167`.

  Packages re-locate their targets by symbol when they start.
- **Moved notes.** References below to `NOTES-w2-*.md` requests point to git history. Where still open, those requests are now in `NOTES-open.md`.

---

## 2. Product constraints every package preserves

1. **Adults only.** Do not select Kids Category. Use an accurate questionnaire, then an 18+ override if the terms require it. No ID collection by default. A store age rating is not age assurance; region-specific age-assurance duties are assessed per territory (REL-04).
2. **Worldwide iOS distribution is being seriously considered.** Native work is a distinct release track, gated by a signed-device feasibility spike (WP-N1).
3. **One auto-renewable subscription with a 14-day free trial.** The trial is an App Store introductory offer; eligibility comes from StoreKit, never a local counter.
4. **No predatory monetisation.** No purchasable currency, paid capsules, paid odds boosts, paid streak protection, subscription-only random-reward advantage, disguised currency bundles or manipulative renewal pressure. Earned coins, stamps and capsules stay entirely independent of billing. Public wording: "No purchasable coins or paid capsules" (never "no in-app purchases").
5. **Calm, local-first habit experience.** No account, cloud sync, analytics or server is introduced to fix durability. The pure deterministic domain (`src/domain`) and the injected runtime (`StoreRuntime`) are preserved.
6. **Optional collecting.** Quiet rewards must yield a complete tracker. Collecting remains available and is never lost when hidden.
7. **Authored art and permanent earned identity.** Growth never visually shrinks; earned looks, flourishes, keepsakes and memories are permanent and truthful. No mascot, talking pets, punitive decay or generic collection inflation.
8. **Entitlements are not journal state.** Subscription and trial state never live in `AppState`, backups, snapshots, demo or reset paths. Import, reset, demo and clock repair cannot create, restore, extend or revoke paid access.
9. **Personal history outlives payment** (recommended; formally a product decision, DEC-01). Reading, exporting, backing up, restoring and deleting one's own history remain available after expiry.
10. **Substantive utility, not gimmicks.** New work earns its place through a real habit, history or recovery need.

---

## 3. Shared causes and the smallest coherent repairs

The audit's seven families are refined here into 14 root causes, each with the smallest repair that satisfies every member's acceptance scenario. The whole set is deliberately **not** a rewrite: the domain, view models, art and most UI remain; the changes concentrate at the boundaries between an in-memory action and a durable, owned, identified save.

| RC | Root cause | Members (IDs) | Smallest coherent repair | Package |
|---|---|---|---|---|
| RC1 | **"Saved" is reported for states that are not durable.** The queue clears `pending` before writing (`persist.ts:308–311`), treats a held write as success (`saveNow` → `flush() ?? 'saved'`, `:257–260`), and a failed probe swaps in memory storage that reports `saved` (`persist.ts:77–87`, `store.ts:201`). | data-d1, data-d2, FS4, FS10 (status part), RISK-06 update reload, RISK-07 demo exit | A save queue that keeps dirty state until confirmed, retries, never collapses *held* or *volatile* into *saved*, and exposes one durability signal (Contract C1). | WP-1 |
| RC2 | **Retired writers can still write, and adoption ignores deletion, replacement and newer schemas.** `dispose()` leaves `pending` and the after-frame callback intact (`persist.ts:269–281, 338–341`); stolen-lock handling disposes and drops the queue (`store.ts:411–414`); adoption accepts only `ok` loads with a larger `rev` (`:419–425, 478–483`); `useHere` keeps old memory for non-`ok` loads (`:490–497`). | FS1, data-d5, FS3, UI2-07 (sidecar), RISK-01 (snapshot/sidecar writes before ownership) | Writer epochs and in-memory fencing, a save identity (`epoch`) in the envelope, and one adoption routine for every load path (Contract C2). | WP-2 |
| RC3 | **IndexedDB writes resolve at request success, and a failed open is cached forever.** `req()` resolves on `onsuccess`; the transaction is dropped (`snapshots.ts:101–105, 122–135`); `dbp` never resets (`:112–121`). | data-d4, RISK-02 (adapter recovery, `versionchange`), RISK-03 (retention and full-record listing) | Resolve on transaction `complete`, reject on `abort`/`error`, reset the open promise on failure, handle `versionchange`/`blocked`, prune after committed writes. | WP-3 |
| RC4 | **Wholesale replacement has no operation identity, commit point or durable result.** `replaceState` publishes memory first and ignores the write result (`store.ts:350–360`); import/undo/restore check preconditions only before awaiting (`:920–964`); the undo token is not bound to the replacement it protects; memory snapshots masquerade as durable (`:202`). | data-d3, data-d8, data-d11, data-d12 (store part), FS5, FS6, FS9, RISK-07 demo exit | One serialised replacement coordinator with cancellation, an explicit commit point, disk-first publication, and an undo token bound to the resulting save epoch (Contract C4). | WP-4 |
| RC5 | **Decoding is not one pipeline.** `fillDefaults` repairs every missing section (`migrate.ts:29–41, 59`); the newer-schema presentation state is re-stamped as the current schema and then exported (`persist.ts:137`, `handoff.ts:31–32`, `store.ts:842–850`); snapshots bypass migration (`store.ts:945, 960`). | data-d6, FS2, RISK-04 (snapshot migrations), data-d5 (newer path), FS8 (envelope metadata) | One decoder for main saves, backups, snapshots and adoption, with version-specific additive defaults, explicit `incomplete` and `newer` results, and byte-faithful rescue export (Contract C5). A two-release upgrade protocol precedes any schema bump. | WP-5 |
| RC6 | **Validation accepts values that ordinary consumers cannot execute, and inputs are unbounded.** | data-d7, FS7, FS8, RISK-05 (import size and decompression), RISK-08 (other known-field gaps) | Validate every consumed known field and range, reject reserved map keys and use own-property accessors, bound input sizes, and prove the accepted-state property with a mutation corpus (Contract C6). | WP-6 |
| RC7 | **Recovery states are invisible or misleading in the UI.** `loadIssue` is shown only in Diagnostics; the status row treats every non-full status as saved; snapshot list errors look empty; restore and undo have no `finally`. | data-d10, data-d12 (UI part), data-d1 (visibility), FS9 (wording), data-d11 (toast) | Persistent shell states with export and retry, truthful status rows, and error, empty and retry states for recovery controls. | WP-7 |
| RC8 | **Delayed UI work is not bound to the save, date or mount it came from.** | UI2-01, UI2-02, UI2-03, integration-i3, integration-i4, creative-cr-d2, creative-cr-d3, FS10 (reveal part) | An interaction token (mount + save epoch + target), cancellation of every frame and timer, one recovery owner for pending reveals, and a retryable lazy-host primitive (Contract C3). | WP-8, WP-9, WP-10 |
| RC9 | **Historical facts are recomputed from mutable, compacted or present-day inputs.** | domain-d2, HM3, domain-d3, domain-d4, domain-w2-d3, HM1, domain-d6, RISK-11 (memory provenance), RISK-12 (backdating re-anchors periods), RISK-13 (completion time vs last tap) | Capture small durable event facts once (first check-in, stack verdict, event day keys, pairing intervals, frozen letter routine and species) as additive optional fields on schema 1; use the ledger's per-occurrence companion for weekly notes; compute cut periods against the lifetime known at the cut (Contract C7). No schema bump. | WP-12, WP-13 |
| RC10 | **Numeric and boundary contracts disagree.** Six-decimal rounding versus 1e-9 thresholds; reward window (today−6) versus ledger retention (today−7); UTC-hour truncation of local time. | domain-d1, HM2, data-d9 | One precision contract end to end; deletion reverses only refund-eligible grants; semantic local-time memoisation. | WP-11, WP-12, WP-14 |
| RC11 | **UI decisions read presentation state instead of domain capability.** | domain-w2-d1, domain-w2-d4, domain-d7, creative-cr-02, RISK-14 (note-marker memo), RISK-15 (run tile units) | Capability functions from the domain (`canMarkDone`, `canUndo`, reason), per-section empty states, one "showed up" helper, authoritative soil state. | WP-15 |
| RC12 | **Gesture, focus and timing contracts collapse cancel into commit, or place actions outside the focus scope.** | UI2-04, UI2-05, UI2-06, RISK-16 (Sheet mouse-drag cleanup), RISK-17 (toast lifetime ignores visibility), RISK-18 (medium detent reachability), RISK-19 (no draft restoration) | Explicit cancel paths in the gesture primitives, modal-owned toast outlets with visibility-aware timers, stable equivalents for every timed action, and scoped drafts. | WP-16, WP-17, WP-20 |
| RC13 | **User intent and preferences are not carried across screens.** | integration-i5, integration-i6, creative-cr-01, domain-w2-d2, UI2-08 | A small intent contract (`pair-pet`, `feed`, `open-day`, `edit-note`) handled by the shell, and one Quiet-rewards presentation contract. | WP-18, WP-19, WP-20 |
| RC14 | **Earned identity and authored promises are reconstructed separately per screen, or promised without wiring.** | creative-cr-03, creative-cr-04, creative-cr-05, creative-cr-06, domain-d5, HM4, RISK-20 (onboarding stage 0), RISK-21 (Detail resident outfit), SHIP1 (credit) | One shared plant-presentation mapping, a small friendship behaviour profile (or truthful copy), keyed content IDs with contract tests, and corrected specification and credit text. | WP-21, WP-22, WP-23 |

Two further causes are about delivery rather than behaviour and have their own packages: **portability and test coverage** (integration-i1, WebKit, normal motion, Windows lanes; WP-24) and **scale evidence** (note-heavy histories, cold paths; WP-25).

---

## 4. Shared contracts

These contracts are the invariants several packages rely on. Each is small, testable, and fits the existing architecture: `SaveQueue` in `src/state/persist.ts`, the `act`/`persist`/`replaceState` core in `src/state/store.ts`, the injected `StoreRuntime`, and the pure domain.

### C1. Durability status: queued, held and volatile are never "saved"

**Invariant.** A caller is told "saved" only when the bytes for that state, or a newer state containing it, were accepted by durable storage owned by this window.

**Design.**

- `SaveQueue.flush()` returns a `FlushOutcome`: `'saved' | 'nothing' | 'held' | 'disposed' | 'storage-full' | 'unavailable'`. `saveNow()` returns the flush outcome as it is; the `?? 'saved'` collapse at `persist.ts:259` is removed.
- `pending` is cleared **only after** a successful write. On failure the latest pending state is kept, the queue enters `failing`, and a bounded retry runs (for example 1 s, 4 s, 15 s, then every 60 s), plus on `visibilitychange` to visible, `focus`, `online`, the next mutation, and an explicit "Try again". Coalescing still writes only the newest state.
- The store exposes one read-only signal:

  ```ts
  type Durability =
    | { kind: 'durable'; rev: number }                          // nothing unsaved
    | { kind: 'pending' }                                       // debounced or after-frame, not yet attempted
    | { kind: 'acquiring' }                                     // waiting for the writer lock (queue held)
    | { kind: 'failing'; reason: 'quota' | 'error'; since: number; attempts: number }
    | { kind: 'volatile' }                                      // no persistent storage this session
    | { kind: 'not-owner'; why: 'other-window' | 'newer-version' };
  ```

  `readOnly` and `saveStatus` stay (the UI already consumes them) but are derived from this signal, so there is one truth.
- Storage detection separates **reading** from **writing**. `browserStorage()` returns the real `localStorage` whenever `getItem` works, even if the probe `setItem` fails with a quota error (the save is then loaded and the status starts as `failing: quota`). Only when storage cannot be read at all does the runtime use memory storage, and then durability is `volatile`, which the shell shows persistently (WP-7).
- Ordinary optimistic actions (a check-in, a note, a setting) stay instant. Commands whose UI claims permanence (capsule pulls, Special Orders, wholesale replacements, the first capsule) are **durable commands** that must observe `saved` before reporting success (C4, WP-8).
- `hasUnsaved()` is exported. Destructive or context-changing transitions consult it: the service-worker auto-reload (`pwa.ts` `busy()`), entering the demo, and leaving it.

**Native forward-compatibility.** The durable-command results are shaped as `Promise`-returning in the store API (WP-4, WP-8), so an asynchronous native adapter (WP-N2) can implement the same contract without another API change. The localStorage adapter stays synchronous underneath.

### C2. Writer fencing and save identity

**Invariant.** A retired writer, or a window that does not hold ownership, cannot modify the authoritative save or its recovery metadata. A deliberate reset or replacement in one window is never silently undone by another.

**Design.**

1. **Queue retirement.** `SaveQueue.dispose()` sets `disposed = true`, discards `pending`, clears the debounce handle, and makes every later `flush()` return `'disposed'`. The after-frame callback in `saveSoon` captures the queue's generation and does nothing when it is stale. This closes FS1 regardless of whether the frame callback or the 100 ms timer fallback in `browserAfterFrame` fires.
2. **One retirement path.** Every place that replaces or drops `queue` (`hydrate`, `acquireLock` refusal and steal, `useHere`, `resetAll`, `enterDemo`, `exitDemo`, `switchQueue`) goes through a single `retireQueue()` helper, so no path can forget to discard.
3. **Ownership as state, not inference.** A private `ownership` value, `'unsupported' | 'acquiring' | 'granted' | 'refused' | 'stolen'`, is set only by the Web Locks callbacks. `canWrite(q)` requires `q === queue`, `!q.disposed`, and ownership `granted` (or `unsupported` where Web Locks is absent). `readOnly` is derived from it.
4. **Save identity.** The envelope gains an `epoch`: a random identifier minted when a save lineage begins or is wholesale-replaced (fresh save, reset, import, undo import, snapshot restore). `rev` remains the write counter within an epoch. Envelopes are `{ v, appVersion, rev, savedAt, epoch, state }`. This is an **envelope** field, not an `AppState` field, so it needs no schema bump; current and older app versions ignore unknown envelope keys (`parseEnvelope` reads only `v`, `rev`, `savedAt` and `state`). A legacy envelope without `epoch` is treated as epoch `''`; the first write under new code mints one.
5. **One adoption routine.** `reconcileFromDisk(reason)` handles every `LoadResult` kind explicitly and is used by the storage-event handler, `useHere` (after the lock is actually granted), `exitDemo`, and hydration:

   | Disk result | Action |
   |---|---|
   | `empty` while this window holds an epoch | Adopt the deletion: show the fresh first-run state with "catkin was started over in another window." Never keep and later re-save the old memory state (FS3). |
   | `ok`, different epoch | Adopt (the save was replaced elsewhere). |
   | `ok`, same epoch, higher `rev` | Adopt (today's behaviour). |
   | `newer` | Become `not-owner: newer-version`, keep the raw bytes for rescue export (C5), release the lock, and never write. `useHere` refuses takeover (data-d5). |
   | `corrupt` / `incomplete` | Enter the recovery state (WP-7), keep the raw bytes, never write until the user chooses a recovery action. |

6. **Sidecars.** Onboarding progress (`catkin:onboarding`), the undo token, `:backup` and `:corrupt` copies, and snapshot writes go through `ownedWrite()`/owned snapshot calls that require `canWrite`. The theme mirror is exempt: it is cosmetic, last-writer-wins is harmless, and it must work before ownership resolves for the pre-paint script. The storage handler also reconciles `catkin:onboarding` and the undo token (UI2-07, data-d11).

**Alternative considered.** A compare-and-set on a small head key (`catkin:v1:head = {epoch, rev}`) read before every write would also catch a non-owner writing. It adds a storage read to every save and still is not atomic across tabs; the Web Lock already serialises owners. Recommendation: in-memory fencing plus explicit ownership first; add the head-key check only if WP-2's two-context tests expose a path that fencing misses.

### C3. Operation and interaction identity in the UI

**Invariant.** Delayed UI work (frames, timers, awaited promises, lazy loads) only acts on the save, target and mount it began with.

**Design.**

- The store exports a read-only `saveEpoch` signal that changes on every wholesale replacement, reset, demo transition and adoption of a different epoch.
- A small hook, `useInteraction()`, owns every `requestAnimationFrame`, `setTimeout` and awaited continuation for one interaction. It records `{ mountId, epoch }`, cancels everything on unmount or epoch change, and exposes `isCurrent()` for code after an `await`. `usePull` (WP-8) and onboarding (WP-9) are its first users.
- Editors capture an immutable **target** when opened (`{ habitId, date }` for the count pad, as `NoteTarget` already does in `NoteSheet.tsx`), and never re-derive it from the current page selection.
- Lazy-loaded hosts use one primitive, `useLazyChunk(loader)`, with `idle | loading | error | ready`, a generation counter, and `retry()`; the host keeps its request while failed (WP-10).

### C4. The replacement protocol

**Invariant.** Import, undo import, snapshot restore, reset, and demo entry and exit are serialised; each either commits durably and then publishes, or changes nothing. A deferred completion never crosses a reset, demo change, ownership change or cancellation. Undo is offered only for the exact replacement it reverses.

**Design (store side, `src/state/store.ts`).**

```
beginReplacement(kind, signal?) → op { id, epochBefore, ownerGen, demo }     // one at a time (mutex)
  prepare   (abortable)  decode the candidate through C5 (import text, snapshot record)
  protect   (abortable)  snapshot the current save; await the IndexedDB transaction's complete (C3/WP-3)
                         if the snapshot store is not durable (memory fallback), require explicit consent
                         ("Import without an undo"), or offer session-only undo with honest wording
  commit    (not abortable, synchronous for localStorage)
            assert op is current: epoch, ownership and demo unchanged; not aborted
            1. write the undo token { snapshotId, until, epochAfter }  (only when protection exists)
            2. write the main envelope with epochAfter
            3. on failure: restore the previous token value, return { ok:false, reason:'not-saved' }
  publish   setState(new); saveEpoch = epochAfter
            return { ok:true, undo: { until, sessionOnly } | null }
```

- **Undo validity is bound to the epoch.** `canUndoImport()` is true only when `token.epochAfter === currentEpoch` and `now < until`. Importing A→B→C invalidates B's token automatically (data-d11), a no-undo import mints a new epoch that invalidates any older token, and a failed main write leaves the token pointing at an epoch that never happened.
- **Undo and restore are replacements too.** They decode snapshots through C5 (so a future schema's migrations apply, RISK-04), snapshot the current save first, install their own undo token (data-d8), and remove the old token only after their own commit succeeds.
- **Disk first, then memory.** Publishing only after the write means an import that cannot be saved leaves both memory and disk unchanged (data-d3). For a native asynchronous adapter the commit step awaits the transaction; the protocol does not change.
- **Cancellation.** Closing the import sheet aborts the operation before the commit point and does not consume or create a token. After the commit point the operation finishes; the UI disables conflicting controls for that instant.
- **Conflicts.** `resetAll`, `enterDemo`, `exitDemo` and `useHere` take the same mutex and abort a pending operation that has not reached its commit point.

**Alternatives considered.** (a) A single write-ahead journal record in localStorage describing the whole transition, replayed on boot. It is more general, but the epoch-bound token already makes every intermediate state safe, so the journal is unnecessary for localStorage; revisit for the native adapter if its transaction spans two stores. (b) Freezing the whole app during imports. Rejected: it does not stop other windows or day rollover, and cancellation is still needed.

### C5. One decoder, faithful rescue, and a safe path to schema 2

**Invariant.** Every stored or imported state (main save, `:backup`, import, snapshot, adoption) passes through one decoder. Missing core history is never silently replaced with empty defaults. A newer-schema save is never exported, restored or rewritten as if it were current.

**Design (`src/state/migrate.ts`, `persist.ts`, `handoff.ts`, `snapshots.ts`).**

- `decode(raw, { source }) → DecodeResult`:

  | Result | Meaning |
  |---|---|
  | `current` / `migrated` | Validated state (after migrations), with metadata. |
  | `incomplete` | Structurally a save, but a core section or field is missing. Loader falls back to `:backup`; import is refused with a specific message; the raw bytes are kept. |
  | `newer` | Schema newer than this app. Carries the exact raw text and, when readable, a `presentation` state flagged `presentationOnly` that the store may display but never export, snapshot, restore or write. |
  | `corrupt` | Not a valid save. Raw kept aside, as today. |

- `fillDefaults` is replaced by a registry of **additive** defaults per source schema version (for example `pantry`, `offDays`, newer `settings` keys, `ledger.daily`). Core sections (`profile`, `habits`, `logs`, `wallet`, `lifetime`, `ledger` history maps, `collection`, `pets`) must be present in the original. The registry is built from the git history of `createInitialState` across every deployed build, and a fixture save from each historically deployed shape must still load (WP-5).
- **Rescue export.** In `newer-version` mode, "Save a backup" wraps the **original** envelope object (its own `v` and `state`), not the presentation state. The older app then refuses to import it ("made by a newer version"), and the newer app accepts it. A CSV export may still be offered, clearly labelled as a partial readable export (FS2).
- **Envelope and backup metadata are validated**: `rev` must be a safe non-negative integer; `savedAt` and `exportedAt` must be valid Date values (an implausible date shows as "unknown date" rather than throwing) (FS8).
- **Snapshots** record their schema version and are decoded, and migrated, on undo and restore (RISK-04).
- **Two-release upgrade protocol for the first schema bump.** No bump is currently planned (C7 uses additive fields), but the protocol must exist before one is. Already-deployed builds contain data-d5 and FS2, and cannot be patched retroactively. Therefore:
  1. **Release A (schema 1)** ships C2 and C5: newer-schema adoption, refusal of `useHere` over a newer save, rescue export, snapshot decoding.
  2. Release A soaks for at least one full release cycle, with the service-worker update path (which reloads a hidden app once an update waits) confirmed in real browsers.
  3. **Release B (schema 2)** adds `MIGRATIONS[1]`. Before its first write it stores the exact pre-migration text under `catkin:v1:pre-v2` and a pre-migration IndexedDB snapshot. A tab still running pre-A code can still misuse "Use here"; the preserved copies make that recoverable, and the release note says so.
  4. The native app (WP-N2) starts from a fresh container and imports backups through the same decoder, so it is not exposed to old tabs.

### C6. Accepted state is executable state

**Invariant.** Any state that the decoder accepts can run every supported selector, view model, renderer input, mutator, export and serialise-reload round trip without throwing, and without losing any own key.

**Design (`src/state/validate.ts`, `src/domain/tx.ts`, `src/state/handoff.ts`, `src/features/you/files.ts`).**

- Validate every **consumed** known field with complete discriminated unions: letter kinds and their fields (`quote`, `ps.timeOfDay`, `stems`, `readAt`), month keys with a real month (01–12), birthday calendar validity, timestamps within the JavaScript Date range, anchor references (existing, non-archived where required), and optional look evidence.
- **Dictionary keys.** Reject reserved identifiers (`__proto__`, `constructor`, `prototype` and any other `Object.prototype` member) for habit, pet, keepsake and other map keys at the trust boundary. Change `Tx.logs()`, `Tx.ledger()` and similar accessors to use own-property reads (`Object.hasOwn`) and property definition, so a bad key cannot reach the prototype even if validation regresses (FS7). Null-prototype maps are a possible later hardening; they are not needed once both guards exist.
- **Deliberate tolerance stays**: unknown collectible and catalogue IDs remain accepted (forward compatibility), stack ordering stays cycle-safe, and unknown extra fields are preserved.
- **Bounded input.** A documented generous limit on file size, decompressed size (counted while streaming through `DecompressionStream`), item counts and string lengths, with a clear "This backup is larger than catkin can open" message. Final numbers come from WP-25's note-heavy measurements. Parsing and validation of large inputs are cancellable via the C4 abort signal.
- **Proof.** A mutation-corpus property test takes valid fixtures, applies field-level mutations (wrong types, out-of-range numbers, reserved keys, long strings, missing optional fields), and, for every mutant the decoder accepts, runs the consumer suite. The corpus is seeded, so failures are reproducible.

### C7. History provenance: record facts once, do not re-derive them

**Invariant.** A historical fact shown to the user (arrival day, stack order, weekly companion days, the routine named in a saved note, a closed period's shortfall) does not change because of compaction, a later preference change, a cosmetic edit, a later lifecycle action or the passage of time.

**Design.** Capture a few small durable facts at the moment they happen, as **additive optional fields on schema 1** (WP-13). This follows the repository's own precedent: `Habit.createdOn` was added this way, with the derive-on-read fallback `habitCreatedOn()` (`src/domain/economy.ts:182–184`), as were `seasons`, `lastBackupAt` and `pendingReveal.order`. It is safe because the already-deployed validator returns the input object itself and ignores unknown keys (`src/state/validate.ts:465`), and domain updates use object spreads (for example `withStamp`, `src/domain/logging.ts:84–87`). Older builds therefore preserve the new fields; they just do not maintain them.

A real schema bump is **not** needed for this work, which removes the two-release soak from the history track's critical path. C5's upgrade protocol stays documented for the first change that older builds must not misread.

The facts to capture:

| Fact | Where | Fixes |
|---|---|---|
| `DayLog.first`: the first live check-in instant, never trimmed by the 24-stamp cap | `logs[habit][day]` | HM3 |
| A stored stack verdict for follower days (`kept` or `reversed`, with the anchor ID it was judged against), written when raw stamps are compacted | follower `DayLog` | domain-d2 |
| Event day keys (`PetState.obtainedOn`, `Profile.createdOn`, favourite-treat `favoriteFoundOn`) computed with the day boundary and time zone in force at the event, following `Habit.createdOn` | pets, profile, friendship | domain-d4, RISK-11 |
| Companion pairing intervals (`{ habitId, from, to? }`), for friendship history (R3) and long-range provenance | pets | RISK-23 (R3) input; domain-d3 beyond one week |
| Frozen `plant` and `icon` (routine) in saved Sunday Note highlights and P.S. lines, as `HerbariumPressing`, `SeasonPlant` and `BouquetStem` already freeze `plant` | letters | domain-w2-d3 |
| Optional completion instant (`DayLog.doneAt`), if DEC-10 chooses "completion" for personalisation | `DayLog` | RISK-13 |

Two facts need **no new field**:

- **domain-d3 (weekly companion days).** The Sunday Note is written while the whole week is still inside the ledger's retention (`ledger.recent`, today−7…today), and each `LedgerEntry.co` records the pet that actually shared that occurrence (`src/state/types.ts:403`). Counting days where `co.pet` is the companion replaces "the current companion gets the habit's whole week" (`src/domain/rituals.ts:131–141`). Stage events use the `Keepsake` record, which stores the companion present at stages 1, 4, 5 and 7, or omit the companion.
- **HM1 (cut periods).** A cut segment's lost days are evaluated as they stood at the cut, so a later archive or Finish cannot change them (WP-12).

**Backfill policy for existing saves.** Derive each field from existing data only where that is truthful, and write it once:

- `first = min(at)` for live days (exact when a day has 24 or fewer taps).
- Event day keys come from timestamps, using the day boundary and time zone in force at the backfill. This is the same answer the app shows today, now frozen instead of recomputed.
- Letter `plant` and `icon` are not backfilled; the renderer falls back to neutral wording.

Where the evidence is already gone, the value is marked `approximate` or left unknown, and the renderer uses conservative wording. Examples: reversed stack order compacted before the fix, or days with more than 24 taps. The backfill never invents a shared day, a shortfall or a completion.

**Older builds still running in another tab** preserve these fields but can let them drift. For example, an old build compacting stamps writes no stack verdict. The new build therefore recomputes from raw data whenever the raw data is still present, and treats a missing verdict as "unknown", never "kept".

### C8. Entitlement is separate from content

Summarised here, detailed in §9. Paid access is computed by an entitlement service from verified StoreKit transactions and stored outside `AppState`, backups, snapshots and the demo. The journal never grants, restores, extends or revokes access, and the entitlement never deletes, hides or rewrites journal content.

---

## 5. Phases and dependencies

### 5.1 Phase overview

| Phase | Purpose | Packages | Gate to leave the phase |
|---|---|---|---|
| **0. Guardrails** | Make defects visible in CI and remove toolchain blockers | WP-0, WP-24a (Windows names, credit fix) | Invariant regressions exist for every reproduced finding (marked `it.fails`), Windows typecheck passes |
| **1. Urgent data protection** | No stale writer, no false "saved", no unsafe replacement, no schema downgrade | WP-1, WP-2, WP-3, WP-4, WP-5, WP-6, WP-7 | All Phase-1 `it.fails` flipped to passing; fault-injection matrix §7.2 green; C5 upgrade safety deployed ("Release A") |
| **2. Interaction lifecycle** | Delayed UI work bound to its origin; acquisitions durable | WP-8, WP-9, WP-10 | No action after unmount or epoch change; reveal recovery independent of cabinet; lazy hosts retry |
| **3. History correctness** | Arithmetic, boundaries and provenance | WP-11, WP-12, WP-13, WP-14, WP-15 | Metamorphic history suite green; provenance fields and backfill shipped |
| **4. Accessible complete journeys** | Cancellation, focus, intent, quiet mode, note control | WP-16, WP-17, WP-18, WP-19, WP-20 | Keyboard-only and mixed-input journeys pass; WebKit lane green |
| **5. Creative truthfulness** | Earned identity and authored promises coherent | WP-21, WP-22, WP-23 | Cross-screen presentation parity; no announced behaviour without an effect |
| **6. Product enhancements** | Recommended utility (§8) | OPP packages | Each opportunity's own success test |
| **7. Native feasibility** | Prove a signed iPhone build | WP-N1, then WP-N2, WP-N3 | Signed real-iPhone proof (IOS1 acceptance) |
| **8. Subscriptions** | Entitlement, trial, paywall, restore, expiry | WP-S1, WP-S2, WP-S3 | StoreKit state matrix passes in Xcode tests, sandbox and TestFlight |
| **9. Release validation** | Store metadata, privacy, accessibility, territories, notices | WP-R1 to WP-R4, WP-25 | Release exit criteria §12.4 |

### 5.2 Dependency graph

Arrows read "needs". Phases group the work logically; packages marked independent may start earlier (§5.3).

```
Phase 0   WP-0 ledger + fixtures          WP-24a case names + credit
              │
Phase 1   WP-1 durability ─────► WP-2 fencing + epoch ──┐
          WP-3 IndexedDB commit ────────────────────────┼──► WP-4 replacement ──► WP-7 recovery UI
          WP-5 decoder + rescue ─► WP-6 validation      │    (WP-4 adopts the C5 decoder when WP-5 lands)
              │
Phase 2   WP-8  acquisitions, reveals      ◄── WP-1, WP-2
          WP-9  onboarding                 ◄── WP-2, WP-8
          WP-10 editor targets, lazy hosts     (independent)
              │
Phase 3   WP-11 precision · WP-12 boundaries · WP-14 time · WP-15 views   (independent)
          WP-13 provenance fields          ◄── WP-5, WP-6  (DEC-09, DEC-10 for their parts)
              │
Phase 4   WP-16 cancel · WP-17 focus/toasts · WP-18 intent · WP-19 quiet  (independent)
          WP-20 note control               ◄── WP-18, DEC-06
              │
Phase 5   WP-21 presentation · WP-23 content  (independent)
          WP-22 friendship                 ◄── DEC-08, WP-13 (pairing intervals)

Parallel  WP-24 portability lanes · WP-25 scale fixtures   (from Phase 0 onward)

Native    WP-N1 spike                      ◄── C1, C2, C4 designed; WP-25 fixtures
          WP-N2 storage                    ◄── Phase 1 shipped; WP-N1
          WP-N3 capabilities               ◄── WP-N1; WP-N2; DEC-01 (reminders)
Paid      WP-S1, WP-S2, WP-S3              ◄── WP-N1 "go"; DEC-01 … DEC-05
Release   WP-R1 … WP-R4                    ◄── all of the above
```

### 5.3 What can proceed independently now

- **Independent of any invariant:** WP-0; WP-24a (rename the case-colliding helpers, fix the Castoro credit); WP-10; WP-11; WP-12 (HM2, HM1 pure computation); WP-14; WP-15 (except the jar's DEC-07); WP-16; WP-17; WP-18; WP-19; WP-21; WP-23; WP-25 fixture building.
- **Must wait for an invariant:** WP-4 needs WP-1, WP-2 and WP-3; WP-7 needs WP-1 and WP-4 outcomes to display; WP-8 needs WP-1 and the `saveEpoch` from WP-2; WP-9 needs WP-2 and WP-8; WP-13 needs WP-5 and WP-6 (the decoder and validator must accept and check the new optional fields); WP-N2 needs Phase 1.
- **Must wait for a product decision:** WP-20's redaction semantics (DEC-06); WP-22 (DEC-08); WP-13's completion instant (DEC-10) and backdating anchor (DEC-09); WP-12's creation-day Finish semantics (DEC-11, default provided); all of Phase 8 (DEC-01 to DEC-05).

---

## 6. Work packages

Every package lists: covered IDs; size and uncertainty; dependencies; current files; failure mechanism; design with alternatives; migration and compatibility; behaviour preserved; regression tests that **fail on current code and pass on the invariant**; fault-injection or device tests; observable completion criteria; and rollback. "Current files" are paths at HEAD `6aad1d3` (identical to the audit pin).

### Phase 0: Guardrails

#### WP-0. Invariant regression ledger and failure-injection fixtures

- **Covers:** test infrastructure for every reproduced finding; ACCESS1 and SHIP1 evidence gaps (partially; completed in WP-24).
- **Size:** M. **Uncertainty:** low. **Depends on:** nothing.
- **Current files:** `tests/unit/state/fixtures.ts` (`fakeBrowser`, `fakeLocks`, which grants synchronously at `:93–111` and therefore masks FS4), `tests/unit/state/*.test.ts`, `tests/unit/domain/*.test.ts`, `vitest.config.ts`.
- **Problem.** Existing tests exercise successful paths with synchronous locks, memory snapshot stores (no request/commit distinction) and fixed lookups. The audit's reproductions assert the defective behaviour and are not in the repository.
- **Design.**
  1. New fixtures in `tests/unit/state/fixtures.ts`:
     - `deferredLocks()`: grant, refuse and steal are resolved by the test, so pending-ownership windows can be exercised (FS4, FS1, D5, FS3).
     - `faultyStorage()`: wraps `memoryStorage` and throws quota or non-quota errors on chosen keys, calls or reads; can make `getItem` succeed while `setItem` fails (data-d1).
     - `captureAfterFrame()`: records `afterFrame` callbacks so tests decide their ordering relative to lock loss and storage events (FS1).
     - An IndexedDB fake able to succeed a request and then abort its transaction (data-d4). Options: the `fake-indexeddb` development dependency with an abort-injection wrapper, or a hand-written fake of the small surface `snapshots.ts` uses. Recommendation: `fake-indexeddb` (dev-only, widely used), wrapped.
     - A deferred snapshot store (`put`/`get` resolved by the test) for FS5.
     - Controlled `requestAnimationFrame`, visibility and clock helpers for jsdom component tests (UI2-01, UI2-03, UI2-04).
  2. A **ledger** directory, `tests/unit/audit/`, with one file per root cause (`rc1-durability.test.ts`, …). Each test is named with its audit ID and asserts the **correct invariant**. Tests for defects not yet fixed are declared with Vitest's `it.fails`, which passes while the invariant is violated and **fails CI the moment the code starts satisfying it**, forcing the fixing change to flip it to a normal `it`. The ledger therefore shows, in CI, exactly which findings remain.
  3. Rebuild the reproduced variants from the audit's written steps: R201 (FS1), R202 (FS2), R203 (FS3), R204 (FS8 `createdAt`), R205 (FS7), R206 (HM1), R207 (HM3), R208 (UI2-06), R209 (UI2-01), R210 (FS4), R211 (FS5), R212 (FS9), R213 (HM2), R214 (FS10), and the retained reproduced findings: data-d1, data-d2, data-d3, data-d5, data-d6, data-d7, data-d11, data-d9, domain-d1, domain-d2, domain-d3, domain-d4, domain-d5, domain-d7, domain-w2-d1, domain-w2-d3, integration-i3, integration-i5 (updated partial form), creative-cr-02. Source-only findings get ledger tests too, labelled "hypothesis" in the test name until the test is observed failing on the current code (that observation is their confirmation; if a hypothesis test unexpectedly passes, the finding is reclassified as **unconfirmed** in §11 rather than silently dropped).
- **Migration:** none (tests only).
- **Preserved behaviour:** the existing 2,511 unit tests and e2e suite remain unchanged and green.
- **Regression tests:** this package is the regression tests.
- **Completion criteria:** every ID listed above has a ledger test; each `it.fails` test was observed to be in its expected state on HEAD; `npm test` stays green.
- **Rollback:** delete the ledger directory; no product impact.

#### WP-24a. Toolchain blockers that are cheap to remove now

(The rest of WP-24 is in Phase 4.)

- **Covers:** integration-i1; the `e2e:preview` Windows shell problem; SHIP1 (Castoro credit).
- **Size:** S. **Uncertainty:** low. **Depends on:** nothing.
- **Current files:** `src/ui/CheckRing.tsx` and `src/ui/checkRing.ts`; `src/features/capsules/Leaflet.tsx` and `src/features/capsules/leaflet.ts` and all importers; `package.json` script `e2e:preview` (`E2E_TARGET=preview playwright test`); `src/features/you/copy.ts` (Castoro credited to Tiffany Wardle).
- **Mechanism.** On case-insensitive file systems (Windows, and macOS by default) extensionless imports of `./CheckRing` resolve to the `.ts` helper; TypeScript reports TS1149/TS1261 and Rollup reports missing exports. The POSIX environment assignment fails in the Windows npm shell. The About credit names the wrong designer.
- **Design.** Rename the helpers to distinct stems (`checkRingModel.ts`, `leafletModel.ts`) and update importers. Add a tiny repository check (`scripts/check-case-collisions.mjs`, run in `npm run typecheck`) that fails when two tracked paths differ only by case, so Linux CI catches the next one. Replace the POSIX assignment with a cross-platform form (a small Node launcher or `cross-env`). Correct the credit to John Hudson (roman) and Paul Hanslow (italic), assisted by Kaja Słojewska, per the upstream Castoro project.
- **Preserved behaviour:** no runtime change on Linux; the same modules are imported.
- **Regression tests:** the collision check fails on HEAD and passes after the rename; a unit test pins the credit string against the upstream author list.
- **Device/platform tests:** a Windows typecheck and unit run (WP-24's Windows lane). The crescent-generation precision failure seen on Windows is triaged separately in WP-24 (tolerance or deterministic arithmetic), not assumed to share this cause.
- **Completion:** Windows typecheck passes; Linux CI unchanged; About shows the corrected credit.
- **Rollback:** revert the rename commit; no data involved.

### Phase 1: Urgent data protection

#### WP-1. Durable save queue and truthful status

- **Covers:** data-d2 (P1), FS4 (P2), data-d1 (P1), RISK-06 (update auto-reload while unsaved), RISK-07 (demo exit prefers an older disk save), FS10 (status half; the command half is WP-8).
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-0.
- **Current files:** `src/state/persist.ts` (`browserStorage` `:77–88`, `SaveQueue.saveNow` `:257–260`, `flush` `:302–315`, `write` `:317–336`); `src/state/store.ts` (`storage()` fallback `:201`, `makeQueue` `:256–275`, `persist` `:295–308`, `pull` rollback `:677–694`, `enterDemo`/`exitDemo` `:997–1024`); `src/app/pwa.ts` (`busy()` `:64–65`, hidden auto-reload `onVisibility`); `src/features/you/lock.ts` (comment claims "the store keeps trying", which is currently untrue).
- **Mechanism.** `flush()` sets `pending = null` before `write()` and never restores it, so a failed last change leaves the retry path (data-d2). A held queue's `flush()` returns `null`, which `saveNow` turns into `'saved'`, so the first capsule can be revealed before any save exists and is then discarded on lock refusal (FS4). The probe `setItem` failing at full quota makes `browserStorage()` return `null`, the store silently substitutes memory storage, and memory writes report `saved` (data-d1). With the pending write already dropped, the service worker may reload a hidden app, and `exitDemo` reloads the older disk save in preference to the unsaved real state.
- **Design.** Implement C1 in `SaveQueue` and the store:
  1. Keep `pending` until a write succeeds; add `failing` state, bounded retry and the trigger set in C1.
  2. `FlushOutcome` instead of `SaveStatus | null`; no `?? 'saved'`.
  3. Split `browserStorage()` into read capability and write capability; memory fallback only when reading is impossible, reported as `volatile`.
  4. Export `durability` and `hasUnsaved()`; derive `readOnly`/`saveStatus` from it.
  5. `pwa.ts` `busy()` also returns true while `hasUnsaved()` or `durability.kind === 'failing' | 'volatile'`, so an update never reloads away unsaved work. The update is applied at the next safe moment.
  6. `enterDemo` is refused while the real save is `failing` (the You row explains and offers "Save a backup"); `exitDemo` keeps a tracked unsaved real state instead of loading an older disk save.
  7. Correct the `lock.ts` comment once retry exists.
- **Alternatives.** (a) Block all actions while a write is failing: rejected; it punishes the user for the browser's quota and hides the tracker. (b) Retry only on the next mutation: rejected; the audit's scenario is precisely the last mutation. (c) Move the main save to IndexedDB now: deferred to WP-N2 and WP-25 evidence; it does not by itself fix the reporting contract.
- **Migration/compatibility:** no stored-format change.
- **Preserved behaviour:** instant taps; the after-frame save timing from the former `NOTES-w2-today.md` request 15 performance work (the tap still paints first); quota compaction and backup preservation in `write()`; `pull`'s rollback path.
- **Regression tests (ledger → normal):**
  - data-d2: check-in → `setItem` fails → storage recovers → `flushSaves()` with no new mutation → reload contains the check-in.
  - FS4 (R210): deferred lock; hydrate; onboarding; free pull before grant → result is not success (or waits), and nothing is revealed until the pull is durable; refusal leaves no shown-but-lost pet.
  - data-d1: seeded readable save, probe `setItem` throws quota → hydrate loads the save (not fresh), status `failing: quota`; fully unreadable storage → `volatile`, never `saved`.
  - RISK-06: update waiting + failing save + hidden → no reload.
  - RISK-07: failing real save → enter demo refused; tracked unsaved real state → exit demo keeps it.
- **Fault injection:** quota and non-quota failure on the first, middle and last write of a burst; recovery after 1, 3 and 10 retries; failure during the pagehide flush.
- **Completion criteria:** all listed ledger tests flipped; no code path reports `saved` without a successful `setItem`; `durability` has exactly one writer (the queue).
- **Rollback:** revert restores current behaviour; no stored data changed. Keep the retry backoff behind a single constant so a pathological retry loop can be tuned without reverting.

#### WP-2. Writer fencing, save identity and adoption

- **Covers:** FS1 (P1 regression), data-d5 (P1), FS3 (P1/P2), RISK-01 (snapshot and sidecar writes before ownership, the FS4 "related ownership hole"), the ownership half of UI2-07.
- **Size:** M. **Uncertainty:** medium (cross-tab timing; covered by deterministic fixtures, then real browsers).
- **Depends on:** WP-1.
- **Current files:** `src/state/persist.ts` (`saveSoon` `:269–281`, `dispose` `:338–341`, `Envelope` `:44–50`, `encodeEnvelope` `:198–201`, `peekRev` `:176–181`); `src/state/store.ts` (`browserAfterFrame` `:129–139`, `acquireLock` `:384–416`, `adoptFromStorage` `:419–425`, `hydrate` `:428–487`, `useHere` `:490–497`, `snapshotToday` `:369–378`, `resetAll` `:971–992`); `src/features/onboarding/progress.ts` (`saveProgress` writes `localStorage` directly, `:50–58`).
- **Mechanism.** FS1: a stolen lock disposes the queue and nulls the reference, but the after-frame callback captured the old instance and still flushes its `pending`, writing revision 3 over revision 99. data-d5: `useHere` builds a queue with revision 0 for any non-`ok` load, keeps the old memory state and steals the lock. FS3: deletion produces `peekRev === null`, which the storage handler ignores, so "Use here" plus any edit resurrects a deliberately reset save. RISK-01: `snapshotToday()` and sidecar writes use the optimistic `writable()` before the lock answers.
- **Design.** Implement C2: queue retirement with generation checks; one `retireQueue()`; explicit `ownership`; `canWrite()` at flush time; the envelope `epoch`; `reconcileFromDisk()` for every adoption path; `useHere` steals, **then** re-reads and decides; `snapshotToday()` and sidecars require `ownership === 'granted' | 'unsupported'`; the storage handler also handles deletion, epoch change, `catkin:onboarding` and the undo token.
- **Alternatives.** Head-key compare-and-set (C2 alternative), deferred unless tests show a gap. Moving the onboarding progress into `AppState` as an additive optional field (so it rides the main transaction and its ownership) is cleaner; it is offered as an option in WP-9, with owner-gated sidecar writes as the immediate fix.
- **Migration/compatibility:** `epoch` is an optional envelope field; older builds ignore it; legacy envelopes are treated as epoch `''` and receive a minted epoch on first write. No `AppState` change.
- **Preserved behaviour:** single-writer model, "Use here", read-only banners, `discardPending()` on adoption, refused-lock startup, theme mirroring before ownership.
- **Regression tests:**
  - FS1 (R201): owned save flushed; captured after-frame; check-in; `locks.stolen()`; other owner writes revision 99; run captured callback → revision 99 and the other profile survive. Variants: lock loss before and after the frame; before and after storage-event delivery; after hydrate, reset and demo queue replacement; the 100 ms timer fallback path.
  - data-d5: old tab read-only, disk holds a schema-2 envelope → "Use here" does not take ownership and never writes.
  - FS3 (R203): old profile at revision 5 in a read-only tab; other tab resets (key deleted, storage event) → the old tab adopts the deletion; "Use here" + edit + flush → the old habits do not return. Variant: reset then a new profile at revision 1 (lower than the stale tab's 5) → adopted by epoch, not ignored by revision.
  - RISK-01: deferred lock; `snapshotToday` and the onboarding sidecar do not write until granted.
- **Fault injection / browser tests:** two real Chromium contexts and two WebKit contexts in Playwright (WP-24 adds WebKit): steal during a burst of check-ins; reset in one tab with the other hidden; storage event delayed relative to the lock rejection.
- **Completion criteria:** a retired or non-owning writer cannot change any `catkin:*` key other than the theme mirror; every `LoadResult` kind has an explicit, tested adoption outcome.
- **Rollback:** revert is safe; envelopes with `epoch` remain readable by the reverted code. If fencing blocks a legitimate write in the field, the symptom is a visible `not-owner`/`failing` state (not silent loss), and "Use here" recovers it.

#### WP-3. IndexedDB commit boundary and adapter recovery

- **Covers:** data-d4 (P1 for pre-import recovery), RISK-02 (cached failed open; no `versionchange`/`blocked` handling), RISK-03 (retention of pre-import copies; `list()` materialises full states).
- **Size:** S–M. **Uncertainty:** low for correctness, medium for the WebKit behaviour of `versionchange`.
- **Depends on:** WP-0.
- **Current files:** `src/state/snapshots.ts` (`req` `:101–106`, `indexedDbSnapshotStore` `:109–138`, `takeDailySnapshot` `:64–79`, `retentionPlan` `:51–58`); `src/state/store.ts` (`snapshotCurrent` `:910–917`).
- **Mechanism.** Writes resolve when the request succeeds, although the transaction can still abort, so a promised pre-import copy may never commit. A single rejected `open()` is cached for the page's lifetime. Pre-import snapshots are pruned only by a later daily snapshot, and `list()` reads every full state to show metadata.
- **Design.** `put` and `remove` await a `txDone(tx)` that resolves on `complete` and rejects on `abort`/`error`. Reset `dbp` when `open()` rejects and on `onclose`; on `onversionchange` close the connection and reset; treat `onblocked` as "copies temporarily unavailable" (never as empty). Prune pre-import copies right after a committed pre-import write, always protecting the snapshot referenced by a valid undo token. Keep the database at version 1 now; a metadata-only object store (which needs a database version bump and would make older tabs fail to open) is deferred to WP-N2 or until WP-25 shows `list()` cost matters. Add `durable: boolean` to `SnapshotStore` (memory store `false`) for WP-4 and FS9.
- **Alternatives.** Relying on the default "relaxed" durability hint is acceptable for a web app; requesting `durability: 'strict'` for pre-replacement snapshots is recommended where supported (feature-detected), because those copies protect against the user's own replacement.
- **Migration/compatibility:** none; same database, store and records.
- **Preserved behaviour:** 7 daily, 4 weekly and 3 pre-import copies; validation before snapshotting; snapshots kept on Start over (documented, intentional).
- **Regression tests:** request success followed by transaction abort → `put` rejects and `snapshotCurrent` does not return an id (data-d4); open fails once then succeeds → second call works (RISK-02); `versionchange` closes and the next call reopens; three same-day imports keep at most `KEEP['pre-import']` copies and never the active undo target (RISK-03).
- **Browser tests:** the real adapter in Chromium and WebKit Playwright runs (not only the memory store); a forced quota failure on the snapshot database.
- **Completion criteria:** no snapshot operation resolves before its transaction commits; a transient open failure is recoverable without reload.
- **Rollback:** revert to request-level resolution; no data format change.

#### WP-4. Replacement coordinator: import, undo, restore, reset and demo

- **Covers:** data-d3 (P1), data-d8, data-d11, data-d12 (store half), FS5, FS6, FS9, RISK-07 (demo and reset serialisation), the first-audit "async replacement races" risk.
- **Size:** L. **Uncertainty:** medium. **Depends on:** WP-1, WP-2, WP-3; uses WP-5's decoder when available (it can land first with today's `parseBackupText`/`validateState` and switch to `decode` when WP-5 lands).
- **Current files:** `src/state/store.ts` (`replaceState` `:350–360`, `snapshotCurrent` `:910–917`, `applyImport` `:920–933`, `canUndoImport` `:936–939`, `undoImport` `:941–949`, `restoreSnapshot` `:957–964`, `resetAll` `:971–992`, `enterDemo`/`exitDemo` `:997–1024`, `snapshots()` memory fallback `:202`); `src/features/you/ImportSheet.tsx` (`toastImported` `:49–65`, open reset `:93–100`, `describe` `:102–115`, `take` `:117–123`, `onFile` `:131–145`, `source` `:147`, `doImport` `:149–166`); `src/features/you/DataSection.tsx` (`SnapshotsSheet` `:82–112`, `undo` `:246–249`); `src/features/you/InstallSection.tsx` (the Safari-to-app import).
- **Mechanism.** `replaceState` publishes the new state before persisting and ignores the result, so import, undo and restore report success when nothing was written (data-d3). Restore ignores a failed protective snapshot and installs no undo token (data-d8). The undo token is never cleared or bound to its replacement, so a no-undo import still promises undo and a stale token can restore the state before an earlier import (data-d11). Preconditions are checked only before awaits, so an import can land after Start over, inside the demo, or after ownership moves (FS5). The sheet keeps the old file eligible while a new one is being read and lets old reads affect a reopened sheet (FS6). A missing IndexedDB silently becomes a memory store, so a durable-looking undo token points at a copy that disappears on reload (FS9).
- **Design.** Implement C4 in the store. In `ImportSheet`, implement an immutable **candidate**: every file pick, paste, clipboard delivery, open and close increments a generation and clears preview and pending immediately; reading shows a "Reading the backup…" state; the Import button is bound to the specific `{ generation, text, preview }` it previewed; closing the sheet aborts the operation. `applyImport` returns `{ ok: true, undo: { until, sessionOnly } | null }` and the success toast offers Undo only when `undo` is non-null, with session-only wording ("You can undo this until catkin closes") when the only copy is in memory. `SnapshotsSheet` and the undo handlers use `try/finally` (the display half of data-d12 is WP-7).
- **Alternatives.** See C4 (journal record, UI freeze). For FS9, refusing import entirely without durable snapshots is too strict (it blocks moving to a new device where IndexedDB is restricted); the explicit consent path already exists and becomes reachable.
- **Migration/compatibility:** existing undo tokens without `epochAfter` are treated as expired (conservative: at worst one legacy 24-hour undo is lost, which is safer than restoring the wrong state). Document this in the release note.
- **Preserved behaviour:** "replace, never merge"; the 24-hour undo; the no-undo confirmation; demo isolation; reset keeping IndexedDB copies (disclosed); first-run imports without anything to lose skip the undo requirement.
- **Regression tests:**
  - data-d3: snapshot succeeds, main write fails → result not ok; memory and disk unchanged; no token. Undo with main write failing → token kept, result not ok.
  - data-d8: snapshot `put` fails during restore → restore refuses or asks for consent; successful restore → Undo returns exactly the pre-restore state.
  - data-d11: imports A→B→C → Undo restores B; no-undo import after an earlier import → no Undo offered; the stale token cannot restore.
  - FS5 (R211): deferred `put`; reset; resolve → import does not apply. Variants: demo entered mid-import; ownership lost mid-undo/restore; the sheet closed mid-import.
  - FS6: A previewed; B selected slowly; Import pressed → nothing imports until B is previewed and B is what imports; A slow/B fast resolves to B; close/reopen before resolution → the new visit is untouched.
  - FS9 (R212): persistent main storage, null IndexedDB → import offers session-only undo or asks for consent; after reload no Undo is advertised.
- **Fault injection:** the §7.2 matrix for every step of the protocol (decode, protect, token write, main write, publish), both quota and non-quota.
- **Completion criteria:** no replacement result is `ok` unless the replacing save is durable; Undo is offered only for the exact replacement it reverses; no deferred completion crosses reset, demo, ownership or cancellation boundaries.
- **Rollback:** reverting restores today's API; legacy tokens remain readable. Because commit is disk-first, a partially rolled-out coordinator cannot publish an unsaved state.

#### WP-5. One decoder, faithful rescue, and the upgrade protocol

- **Covers:** data-d6 (P1/P2), FS2 (P1 before schema upgrades), RISK-04 (snapshots bypass migration), data-d5 (newer-schema decision), FS8 (envelope and backup metadata: `rev = 1e309`, `exportedAt = 1e20`).
- **Size:** M. **Uncertainty:** medium (reconstructing the historical additive fields). **Depends on:** WP-0; coordinates with WP-2 (adoption) and WP-4 (snapshot decode).
- **Current files:** `src/state/migrate.ts` (`fillDefaults` `:29–42`, `migrate` `:48–60`); `src/state/persist.ts` (`parseEnvelope` `:123–153`, `loadSave` `:159–173`); `src/state/handoff.ts` (`makeBackup` `:31–33`, `parseBackupText` `:156–190`); `src/state/store.ts` (`ownSave` `:842–846`, `backupJson` `:849–851`, hydrate `newer` case `:450–455`); `src/features/you/ImportSheet.tsx` `previewLine` → `src/features/you/when.ts`; `src/state/snapshots.ts` (`SnapshotRecord`).
- **Mechanism.** `fillDefaults` fills every missing section, so `{state:{version:1}}` or a save missing `logs`, `wallet` or `ledger` becomes a "valid" fresh save and the backup fallback is skipped (data-d6). A newer save's readable presentation is re-stamped with the current schema and exported as a current backup, which the old app will then accept; an unreadable newer save exports a fresh empty profile (FS2). Snapshots are validated without migration. Envelope `rev` and backup `exportedAt` accept any number (Infinity, 1e20).
- **Design.** Implement C5, including the additive registry reconstructed from the history of `src/state/defaults.ts` and `src/state/types.ts` across every commit that deployed (CI deploys from the default branch), the `incomplete` result, rescue export of the original envelope in `newer-version` mode, versioned snapshot decoding, and metadata validation. Write the two-release upgrade protocol into `docs/DESIGN.md` §11 so the first schema bump follows it.
- **Alternatives.** Keeping blanket defaults but "flagging" repaired sections: rejected, because the flag would not stop the repaired save from replacing the last good `:backup` on the next write.
- **Migration/compatibility:** accepts every historically deployed save shape (fixture per deployed shape); rejects only saves missing core history, which today are silently emptied. A rejected main save falls back to `:backup` exactly as `corrupt` does now, and the user sees the recovery state (WP-7).
- **Preserved behaviour:** additive tolerance for genuinely added fields; unknown collectible IDs; `newer-version` read-only display when readable.
- **Regression tests:** data-d6: `{version:1}` envelope and saves missing `logs`/`wallet`/`ledger` → `incomplete`, backup used, nothing overwritten. FS2 (R202): schema-2 envelope hydrated read-only → "Save a backup" produces `v: 2` with the original state; `parseBackupText` in this app refuses it; an incompatible future wallet exports the original bytes, not an empty profile. RISK-04: a schema-N snapshot restores through an injected migration table. FS8: `rev: 1e309` and `exportedAt: 1e20` are rejected or shown as unknown without throwing.
- **Upgrade tests:** readable and unreadable future schemas; old external backup, old local main save, old daily snapshot, active undo and partial newer rescue exercised together (the audit's fixture set); when a real schema 2 is ever introduced, round-trip the rescued bytes through its decoder.
- **Completion criteria:** one decoder is used by all five sources; no missing core section is ever defaulted; newer saves are never exported as current.
- **Rollback:** revert restores `fillDefaults`; stored data unchanged.

#### WP-6. Validation contract and bounded input

- **Covers:** data-d7, FS7, FS8 (state-field variants: `createdAt = 1e20`, `monthly.month = '2026-99'`, weekly `quote = {text:7}`, companion P.S. with unknown `timeOfDay`), RISK-05 (import size and decompression), RISK-08 (other known-field gaps: note and name lengths, letter discriminants, look evidence, anchor cycles and archived anchors).
- **Size:** M. **Uncertainty:** low–medium (choosing limits). **Depends on:** WP-5 (the decoder calls it); limits informed by WP-25.
- **Current files:** `src/state/validate.ts` (habit id rule `:83`, `checkLetter` `:150–176`, profile `createdAt` `:295`); `src/domain/tx.ts` (`logs()` and `ledger()` bracket accessors `:92–103`); `src/state/defaults.ts` (plain-object maps); `src/state/views/pets.ts` (`memoryShelfVM` `stems` map); `src/features/rituals/words.ts` (`monthIndex`, `quote.text.trim()`, `noun[timeOfDay]`); `src/features/you/files.ts` (`readFileText` reads the whole file); `src/state/handoff.ts` (`through`, `decodePayload`).
- **Design.** Implement C6. Limits are generous and documented; the user sees a specific message for "too large", "damaged" and "made by a newer version". A note longer than the in-app limit but within the hard cap is accepted (never truncated silently).
- **Alternatives.** Null-prototype maps everywhere (C6 discusses); schema-generator libraries (rejected: new dependency and a second source of truth next to `types.ts`).
- **Migration/compatibility:** a previously accepted malformed save now fails validation. For the main save this routes to `:backup` and the recovery state; the raw bytes are kept aside and are exportable (WP-7), so no user data is destroyed by the stricter rule.
- **Preserved behaviour:** unknown catalogue IDs, cycle-safe stack order, preservation of unknown extra fields.
- **Regression tests:** data-d7 `stems: 7`; FS7 (R205) `__proto__`, `constructor` and `toString` habit IDs through `setNote` and a history edit, compared with `JSON.parse(JSON.stringify(s))`; FS8 (R204) `createdAt = 1e20` then `applyImport` with a forced new day; the three other FS8 values; the mutation-corpus property (C6); an oversized file and a 1 KB payload that decompresses beyond the limit stop cleanly.
- **Completion criteria:** the accepted-state property holds for the seeded corpus (size agreed in WP-0, for example 5,000 mutants per CI run and a larger nightly run); no allocation above the documented limit occurs during import.
- **Rollback:** revert restores today's validator; stricter validation can be relaxed per field if a legitimate historical save is found to fail (the fixture corpus from WP-5 should prevent that).

#### WP-7. Recovery and status in the interface

- **Covers:** data-d10, data-d12 (display half), data-d1 (visibility), FS9 (wording), data-d11 (toast), RISK-09 (offline and update lifecycle tests).
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-1 (durability states), WP-4 (results), WP-5 (`incomplete`, rescue).
- **Current files:** `src/app/App.tsx` (shell banners consume `readOnly` and `storage-full` only, `:46–82`); `src/features/you/DataSection.tsx` (`StatusRow` `:64–82`, `SnapshotsSheet` `:82–125`, `undo` `:246–249`); `src/features/you/ImportSheet.tsx` (`toastImported`); `src/features/you/Diagnostics.tsx` (the only `loadIssue` consumer); `src/catalog/lines.ts`, `src/features/you/copy.ts`, `docs/VOICE.md`.
- **Design.** Shell states, each persistent until resolved, each with a concrete action: **volatile** ("catkin can't save in this browser right now. Save a backup before you close it."); **failing, quota or error** (with "Try again" and "Save a backup"); **recovered from backup** ("catkin opened the last good copy. The damaged copy is kept." with "Save the damaged copy"); **corrupt or incomplete with no backup** (the first-run screen shows the recovery card, not a silent fresh start); **newer version** (rescue export). The You status row distinguishes device, tab, failing and volatile. The snapshot sheet distinguishes loading, empty, error-with-retry; restore and undo always clear `busy` and explain failure. Copy follows `docs/VOICE.md` (the catalogue tests enforce voice rules, pronoun rules and lint).
- **Preserved behaviour:** the calm voice; no alarming modal unless data is actually at risk; the existing banners.
- **Regression tests:** App-level hydration with malformed main + valid backup, both invalid, incomplete main, non-quota write failure; snapshot list rejection shows an error (not "The first daily copy is made tonight"); a rejected restore read clears `busy`; import success with `undo: null` shows no Undo.
- **Browser tests:** offline launch, action, restart and verify (extends `e2e/pwa.spec.ts`); update-ready + failing save + hide → no reload, message shown on return.
- **Completion criteria:** every `durability` and `loadIssue` kind has a visible state in the shell and a tested action; Diagnostics is no longer the only place a recovered save is explained.
- **Rollback:** UI-only; revert restores current screens.

### Phase 2: Interaction lifecycle and durable acquisitions

#### WP-8. Durable acquisitions and one owner for pending reveals

- **Covers:** FS10, UI2-01, UI2-02, integration-i3, creative-cr-d2 (with WP-9), FS4 (first-capsule consequence), RISK-24 (reduced-motion crank), NEW-06 (a pull is not pre-checked for a pending reveal, so the coin and handle animate before "came back out").
- **Size:** L. **Uncertainty:** medium (animation choreography). **Depends on:** WP-1 (durable results), WP-2 (`saveEpoch`).
- **Current files:**
  - `src/state/store.ts`: `pull` `:677–694`, `finishReveal` `:696–698` (no argument), and `wish` `:700–703`, which uses the generic `act` and ignores the save result.
  - `src/domain/gacha.ts`: `finishReveal` `:379–381` clears any pending reveal; the pending gate is at `:295`; Special Order is at `:422–436`.
  - `src/features/capsules/usePull.ts`:
    - the module-level `unopened` map `:26`, and `resumeFor`, which reads that cache before `pendingReveal` (`:35–42`);
    - resume runs only in `useState` initialisers while active (`:52`, `:57`);
    - the auto-turn frame loop `:180–199`, which still animates under reduced motion (`:186`);
    - the finishing loop `:201–220`, the commit at `:224–235`, and the async tail `:254–268`;
    - untracked timeouts at `:101` and `:303`; the unmount cleanup at `:324–330` clears only two timers.
  - `src/features/capsules/CapsulesScreen.tsx`: defaults to Cats (`:20`) and filters out expired seasonal cabinets (`:25–27`); the guarded `finishOrder` (`:42–45`) is a useful precedent.
  - `src/features/capsules/MachineCarousel.tsx:131–149`; `src/features/capsules/SpecialOrder.tsx:170–195`.
  - `src/app/TabBar.tsx:15–22`, `src/app/Sidebar.tsx:40` and `src/app/shortcuts.ts:47–51` all navigate without consulting the capsule's busy state.
- **Mechanism.**
  - Special Order reports success and opens its reveal even when the forced save failed (FS10).
  - The auto-turn keeps running after its screen unmounts and calls the domain `pull()` into whatever save is current (UI2-01).
  - A module cache keyed only by machine outranks the persisted pending reveal, survives import, demo and reset, and dismissing it clears *any* pending reveal (UI2-02).
  - A pending reveal on an inactive or out-of-season cabinet is never resumed, and it blocks every ordinary pull (integration-i3).
- **Design.**
  1. **One durable acquisition command.** `pull` and `wish` share `commitAcquisition()`: run the transaction, write immediately, and on any outcome other than `saved` roll back memory and pending state and return `{ ok:false, error:'not-saved' | 'not-owner-yet' }`. Both become `Promise`-returning so the native adapter can await a real commit (C1).
  2. **Reveal identity.** A reveal is identified by `machineId|itemId|at`, the fields `PendingReveal` already has; no schema change. `finishReveal(key)` clears only a matching reveal, generalising the `finishOrder` guard.
  3. **One recovery owner.** A screen-level `PendingRevealHost` (on the Capsules route and in onboarding) derives what to show from `state.pendingReveal`, whichever cabinet is active and whether or not its season is on. When the reveal belongs to an out-of-season cabinet, the reveal still opens, with the cabinet shown as "visiting". The carousel opens on the pending cabinet.
  4. **Choreography as a cache, not an authority.** `unopened` stores only shell and animation metadata, keyed by `saveEpoch + revealKey`, and is cleared whenever `saveEpoch` changes.
  5. **Interaction ownership.** `usePull` moves all frames and timeouts into `useInteraction()` (C3), reusing the `cancelChoreography` pattern from `src/features/today/checkin.ts:103–109`.
     - Before commit, an unmount or epoch change cancels without spending.
     - After commit, a dead callback never opens a modal or changes busy state; the pending reveal is resumed by the host.
  6. **Pre-check.** `payError` also checks for a pending reveal before any coin or handle animation, and routes the user to the waiting reveal.
  7. **Reduced motion.** Under reduced motion, the crank commits through a static progress change instead of the 420 ms JS rotation. The design already promises "static cabinet and crossfades". This should be checked with users who rely on reduced motion (§7.9).
- **Alternatives.**
  - Making tab navigation wait for the auto-turn: rejected, because the user must always be free to leave.
  - Committing at insert time: rejected, because commit-before-animate at the target angle is the approved design and is kept.
- **Migration:** none.
- **Preserved behaviour:**
  - commit before the drop animation;
  - one charge per capsule;
  - pity, lucky and first-capsule rules;
  - the unopened-capsule shell across tab changes, for the same save;
  - odds displays.
- **Regression tests:**
  - FS10 (R214): primary save quota failure → `wish` is not ok, disk and memory unchanged, and no reveal is opened. A retry after recovery succeeds once.
  - UI2-01 (R209): start the auto-turn, unmount, advance all frames → no pull. Variants:
    - after a demo round trip, import or reset → nothing is written to the replacement save;
    - unmount after commit → one charge, the reveal is recoverable, and no modal opens from the dead callback.
  - UI2-02: two saves with different pending reveals for one cabinet; populate the cache from A, activate B → only B is shown. Further cases:
    - A pending, B with none → no phantom reveal;
    - a stale dismiss cannot clear B's reveal;
    - demo → real, and import → undo import.
  - integration-i3: a pending reveal on each cabinet, cold reload → it resumes. Further cases:
    - inactive → active;
    - expiry at midnight while pending → the reveal is reachable and the next pull works after dismissal, with no second charge.
  - FS4: the first capsule while ownership is acquiring → not revealed until durable.
  - NEW-06: a pull with a reveal waiting → no coin animation; the waiting reveal opens.
- **Device tests:** the normal-motion Playwright lane (WP-24). On iPhone (§7.10):
  - switch tabs mid-turn;
  - background mid-turn;
  - process kill after commit.
- **Completion criteria:**
  - No acquisition reports success before its save is durable.
  - No capsule work continues after unmount or an epoch change.
  - Every pending reveal is reachable from the Capsules screen, whatever the active cabinet or season.
- **Rollback:** the command changes and the choreography changes can be reverted separately; the reveal key is derived, so nothing stored changes.

#### WP-9. Onboarding integrity

- **Covers:** creative-cr-d1, UI2-07 (UI half), creative-cr-d3, creative-cr-d2 (onboarding half), RISK-25 (a chosen name suggestion is lost on Skip), RISK-20 (onboarding draws planted habits at stage 0).
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-2 (owned sidecar and storage reconciliation), WP-8 (reveal host).
- **Current files:**
  - `src/features/onboarding/Onboarding.tsx`:
    - the secondary chunk swallows its rejection (`:74–89`);
    - plant and skip always advance (`:160–192`);
    - the global Skip is at `:212–214`;
    - the lead text is at `:234`.
  - `src/features/onboarding/PickStep.tsx:22–25`.
  - `src/features/onboarding/flow.ts:72–86`: zero planted habits leads to `first`.
  - `src/features/onboarding/progress.ts`: read once at module load (`:48`); unguarded writes (`:50–57`).
  - `src/features/onboarding/CapsuleSteps.tsx`: `picked` starts as null (`:53`); all four cabinets are always offered (`:101–122`); suggestions only change the draft (`:205–210`); stage 0 is drawn at `:232`.
  - `src/features/onboarding/SillStage.tsx:46–53`.
  - `src/state/store.ts`: `completeOnboarding` at `:829–835` returns `[]` for refusals.
- **Mechanism.** A refused write is indistinguishable from "picked nothing", so the flow advances into a step it cannot finish (CR-D1).
  - The sidecar is neither owner-gated nor reconciled across tabs (UI2-07).
  - The secondary chunk failure shows a lead with nothing to choose and no retry (CR-D3).
  - After a reload, the cabinet holding the committed first pet is forgotten (CR-D2).
- **Design.**
  - **Discriminated result.** `completeOnboarding` returns `{ ok:true, ids } | { ok:false, reason:'not-owner' | 'not-saved' | 'already-onboarded' }`. On refusal the pick step stays, keeps the picks and shows the existing "Use here" recovery. A retry after takeover creates the habits exactly once.
  - **Reconciliation.** Progress writes go through the owned sidecar (C2). The store's storage handler reconciles `catkin:onboarding`. When the authoritative save is onboarded and progress is gone, a mounted flow exits.
  - **Option.** Move late-step progress into `AppState` as an additive optional `profile.onboarding` field, so it shares the save's transaction and ownership. Recommended if the owned-sidecar route proves fiddly in WebKit tests.
  - **Error handling.** `CapsuleSteps` uses the shared `ScreenError`/`ScreenLoading` (`src/app/ScreenHost.tsx:125–141`) for its chunk, with Retry; Skip stays available.
  - **Resume.** `CapsuleSteps` initialises from `pendingReveal` through WP-8's host.
  - **Skip semantics.** An explicitly tapped name suggestion is saved on Skip (it is a choice, not a preview).
  - **Plant art.** Onboarding plants use the shared plant presentation (WP-21) once watered.
- **Preserved behaviour:**
  - zero picks remain a valid, distinct success;
  - progress is not saved before step 3;
  - Skip always exits;
  - demo bypass;
  - importing an existing save finishes onboarding.
- **Regression tests:**
  - CR-D1: a read-only second tab picks and plants → it stays on picks. Then Use here → retry → exactly one set of habits. Zero picks → success.
  - UI2-07: two tabs in late onboarding; the owner finishes → the other exits. The non-owner cannot recreate the sidecar. Repeat with reset, import, takeover mid-step, and a demo round trip; the first pet and first gift never repeat.
  - CR-D3: the chunk rejects once, then resolves on Retry, without replaying habit creation or the gift.
  - CR-D2: for each of the four cabinets, reload right after commit → the same pet, no second gift or cost, and the flow continues into naming and placement.
  - RISK-25: tap a suggestion, then Skip → the name is saved.
- **Completion criteria:**
  - Every onboarding step is either completable or shows its recovery action.
  - No stale tab can alter onboarding state.
- **Rollback:** UI and store-result changes only; revert safely.

#### WP-10. Editor targets and retryable lazy hosts

- **Covers:** UI2-03, integration-i4, RISK-26 (inline adjustment and menu state store only an id).
- **Size:** S–M. **Uncertainty:** low. **Depends on:** WP-0.
- **Current files:**
  - `src/features/today/TodayScreen.tsx`:
    - the reset effect `:69–91`, with the hidden threshold in `state.ts:16`;
    - `menu`, `padId` and `adjusting` are ids only (`:122–124`);
    - the pad card is re-derived at `:209`, and `onCount` is bound at `:296`;
    - the inline stepper already uses `dateRef` (`:170`).
  - `src/features/today/CountPad.tsx:29–61`.
  - `src/app/SheetHosts.tsx:7–13`.
  - `src/features/progress/ProgressScreen.tsx:48–56` (the ritual reader loader).
- **Design.** The count pad, menu and adjustment state store `{ habitId, date }` (as `NoteTarget` does).
  - When the page's selected day resets while the pad is open, the pad **keeps its date**. Its header shows the date ("Tue 22 Sep"), and editability is rechecked. If the day left the editable window, the pad closes with a short "That day is now history. Change it from Progress." note, instead of retargeting. This was preferred over always closing because a phone call should not throw away a correction in progress.
  - `SheetHosts` and the Progress loader use `useLazyChunk` (C3) with `ScreenError` and Retry; the request is retained.
- **Preserved behaviour:** the 60-second reset of a stale Today page; lazy loading.
- **Regression tests:**
  - UI2-03: backdated pad, hidden 61 s, visible, `+` → the old date changes and today does not. Also cover:
    - app-day rollover;
    - a schedule change during suspension;
    - a habit absent on the new day.
  - integration-i4: the editor, detail, pet and ritual chunks each reject once, then Retry succeeds. The item is retained, and no entered state is lost.
- **Completion criteria:**
  - No editor changes a different date or item than the one it opened for.
  - Every lazy host can recover without a reload.
- **Rollback:** local UI; revert safely.

### Phase 3: History correctness

#### WP-11. One growth precision contract

- **Covers:** domain-d1; NEW-01 (three copies of `round6`, and ledger-derived versus history-derived stages disagree).
- **Size:** M. **Uncertainty:** medium (must prove the tolerance safe for every supported rule shape).
- **Depends on:** WP-0.
- **Current files:**
  - `src/domain/economy.ts`: `round6` `:164`; `addSunshine` `:344`; `wantSun` `:367–373`; `updatePlantStage`/`recordFlourishes` `:811–822`; `recordCutting` `:851`.
  - `src/domain/company.ts`: a second `round6` `:230`, used at `:215–224`; `nextStory` `:303`; `STORY_SUNSHINE` `:50`.
  - `src/domain/habits.ts:332` (inline rounding on delete).
  - `src/domain/growth.ts`: `EPS` `:58`, `stageOn` `:69`, `extraBloomsFor` `:113`, `flourishesFor` `:141`. The same file has readers with no tolerance: `progressOn` `:76`, `sunshineToNextStage` `:148`, and `theCutting.toNext` `:250`. `sunshineFromHistory` (`:261–279`) is unrounded.
  - `src/state/views/common.ts:99`, `:118` and `src/state/views/company.ts:55` (forecasts).
  - `src/state/validate.ts:353` (`co.sun <= sunshine + 1e-6`).
- **Mechanism.** Each grant `7/k` is rounded to six decimals, and totals are rounded again.
  - Nine Mon/Wed/Fri grants total 20.999997, so thresholds at 21, 42 and 105 (and stories at 7, 21 and 42) are reached one occurrence late.
  - The unrounded history path reaches 21, so letters and Season Review can disagree with the plant.
- **Design.**
  - One module, `src/domain/sunshine.ts`, owns `round6` and a single `reached(total, threshold)` with a documented tolerance, for example `1e-4`.
  - The tolerance is justified by an **exhaustive enumeration test** over every supported rule shape: schedules, flexible targets, tiny, repricing and monthly or quarterly rhythms. The test proves that the smallest genuine gap between an achievable exact total and any threshold is far larger than the tolerance, while the worst accumulated rounding error over a plant's lifetime is far smaller.
  - Every threshold reader and forecast uses it; the forecast shows whole check-ins, never "0.000003 more".
  - The ledger and history paths share it.
- **Alternatives.**
  - **Exact rational or integer micro-units:** exact, but needs a stored-format migration, and the denominator set is not obviously bounded (monthly rhythms). Adopt it only if the enumeration shows the tolerance cannot be proven safe.
  - **Rounding the cumulative exact total instead of each grant:** requires exact per-grant records that compaction discards.
- **Migration:** no stored change. On the next transaction touching a habit, `updatePlantStage` may raise `bestStage`, unlock a story or record a flourish that was owed.
  - This happens once, through the normal domain path. Any stage bonus follows the existing rules, because it was earned.
  - The catch-up is announced by the ordinary stage-up moment, not as a bug notice.
- **Preserved behaviour:**
  - high-water stages;
  - the at-most-one-stage-per-check-in rule;
  - undo and repricing conservation;
  - the pace caps.
- **Regression tests:**
  - domain-d1: through actual check-in transactions (not arithmetic fixtures), 3 and 6 occurrences a week reach Budding exactly at 21. Also:
    - Blooming at 42;
    - the Cutting at 105;
    - stories at 7, 21 and 42;
    - flourishes after Evergreen;
    - tiny-to-full upgrades;
    - undo and recheck;
    - repricing.
  - Ledger and history stages agree for 1,000 seeded histories.
- **Completion criteria:**
  - Exactly one tolerance constant exists.
  - The enumeration test documents the proof margin.
  - The adversarial property `economy-properties` still holds.
- **Rollback:** revert; stages are high-water, so any stage reached under the new contract stays (it was legitimately earned).

#### WP-12. Lifecycle boundaries: deletion refunds, Finish and cut periods

- **Covers:**
  - HM2;
  - domain-d6;
  - HM1;
  - NEW-02: `types.ts:322` documents the refund window as today−7…today, and the `pruneOldStamps` comment understates its readers.
- **Size:** M. **Uncertainty:** medium for HM1 (pause interplay); low for HM2 and D6. **Depends on:** WP-0; DEC-11 for D6 (a default is given).
- **Current files:**
  - `src/domain/habits.ts`: `deleteHabit` `:298–353`, with the refund loop at `:304–323`; `archiveHabit` `:251–257`.
  - `src/domain/economy.ts`: `LEDGER_DAYS` `:107`, `compactLedger` `:884–905`, `isRewardableDay` `:197–204`, `settleTo` `:358`.
  - `src/domain/activity.ts`: `BACKFILL_DAYS` `:118`, `isInBackfillWindow` `:130–132`, `inLifetime` `:46–49`.
  - `src/domain/seasonReview.ts:331–352` (`retireWithRibbon`).
  - `src/domain/periods.ts:145–169` and `:28–33`; `src/domain/rules.ts:160–176`.
- **Mechanism.**
  - **HM2:** deletion reverses every retained ledger entry, including day −7, which is one day past the refund window, so it removes permanent coins, sunshine and lifetime check-ins.
  - **D6:** Finish on the creation day clamps the archive to that day, leaving an open failed day.
  - **HM1:** a cut period recomputes its active days and open lost days from the *current* lifetime, so a later Finish turns a safely cut period into a shortfall.
- **Design.**
  - **HM2.** Deletion reverses only grants whose date passes `isRewardableDay` (the same eligibility as ordinary undo), through the canonical `settleTo(..., 'none', { only: 'down' })` path. Older retained entries are dropped without reversal. Correct the `types.ts:322` comment.
  - **D6** (default for DEC-11). Finishing a habit with no showed-up day in its lifetime records an **empty lifetime**. Views, consistency, calendar and serialisation treat such a habit as having no evaluated days. It is represented by an additive optional `Habit.retiredEmpty: true` with `archivedOn = startedOn`, because validation requires `archivedOn >= startedOn`. It never records a fictitious completion. Reactivation clears the flag.
  - **HM1.** For a cut segment, days after the cut are evaluated "as they stood at the cut": in lifetime, active unless a pause or day off was already recorded before the cut, and open. Later archive, Finish, restore, pause or day-off changes therefore cannot add a shortfall to a closed cut segment.
    - Where a pause's recording time is unknown, the lenient reading is used: the pause is treated as not known at the cut.
    - A genuinely unavoidable shortfall that existed at the cut is still shown.
- **Alternatives (HM1).** Storing a frozen `{ target, openDays }` on each cut rule. This is more explicit, but it needs a backfill for existing cuts; the computation-only rule gives the same answers without stored data. Re-evaluate if the pause test matrix finds a divergence.
- **Preserved behaviour:**
  - ordinary archive still prorates uncut periods;
  - bonuses stay permanent;
  - same-day delete still refunds;
  - keep-plant archive stays distinct from delete;
  - bestStage high-water.
- **Regression tests:**
  - HM2 (R213): delete at ages 6, 7 and 8 app days, with both sufficient and insufficient coins. Compare wallet, lifetime sunshine, check-in totals and Cutting progress, including a case where the next threshold lies between the outcomes. Ages 7 and 8 must now match.
  - D6: create and Finish on the same day with no log, a partial count, tiny, and full. Inspect today, tomorrow, the calendar, the tally and rewards; then reactivate.
  - HM1 (R206): the weekly-to-daily example (expected stays 0; target and open days as at the cut). Also cover:
    - same-rhythm `every` changes;
    - later Finish, Archive, Restore, planned pause, resume and day off;
    - a truly unavoidable shortfall at the cut is retained;
    - the user-visible tally and streak, not just `cut: true`.
- **Completion criteria:** the refund boundary equals the undo boundary, and no later lifecycle action changes a closed cut segment's evaluation.
- **Rollback:** pure domain; revert safely. `retiredEmpty` is optional and ignored by reverted code, which would show the old off-by-one day again, a cosmetic regression only.

#### WP-13. History provenance fields

- **Covers:**
  - domain-d2, HM3, domain-d3, domain-d4, domain-w2-d3;
  - RISK-11 (favourite-treat discovery date; "the day it bloomed" uses a story date);
  - RISK-13 (a completion instant, if DEC-10 chooses it);
  - RISK-12 (backdating re-anchors multi-week periods, per DEC-09);
  - pairing intervals for RISK-23 (R3).
- **Size:** L. **Uncertainty:** medium. **Depends on:** WP-5 and WP-6 (the decoder and validator must accept and check the optional fields); DEC-09 and DEC-10 for their parts.
- **Current files:**
  - `src/domain/logging.ts`: `withStamp` `:84–87`, `withoutLastStamp` `:89–96`, `setCount` `:281–291`, `editHistory` `:379–392` (keeps `at`), `pruneOldStamps` `:403–416`.
  - `src/domain/stacking.ts:79–112`, and its callers `src/state/views/habit.ts:212`, `src/domain/signature.ts:222`, `src/domain/journal.ts:74` and `src/domain/rituals.ts:124`.
  - `src/domain/rituals.ts`: `:42–43`, `:80–88`, `:131–141`, `:220–221`.
  - `src/state/views/pets.ts:201`, `:235–237`.
  - `src/domain/friendship.ts:143–149`, `:230–233`.
  - `src/domain/gacha.ts:398–400`; `src/domain/letters.ts:89`, `:105`.
  - `src/features/rituals/lookup.ts:7–10` and `words.ts:57`, `:61`, `:107`, `:198`.
  - `src/state/types.ts`: `DayLog` `:107–125`, `PetState` `:168`, `Profile` `:291`, `SundayHighlight`/`SundayPS` `:546–558`.
  - `src/domain/rules.ts:245–249` and `src/domain/schedule.ts:158–161` (the period grid anchor).
- **Mechanism.** Historical facts are recomputed from inputs that change:
  - **Timestamps.** Stamps are trimmed to 24 per day and dropped after 120 days (domain-d2, HM3).
  - **The present.** Today's companion is used (domain-d3), and so is today's day boundary (domain-d4).
  - **Current habit metadata.** Saved notes are rendered with the habit's current icon and plant (domain-w2-d3).
- **Design (C7).** New optional fields:
  - `DayLog.first`;
  - a follower-day stack verdict written at compaction;
  - `PetState.obtainedOn`, `Profile.createdOn` and a `favoriteFoundOn` date;
  - pet pairing intervals;
  - frozen `plant` and `icon` in Sunday Note highlights and P.S. lines.

  Readers change accordingly:
  - **Stacking** reads `first` for the live window and the verdict afterwards; a missing verdict is "unknown", counted as today's documented backfill policy, never as "kept" over known-reversed evidence.
  - **Weekly companion days** use `LedgerEntry.co` (no new field).
  - **"The day it bloomed"** uses `stageDates[habitId][5]`, or the keepsake at stage 5, which already exist.
  - **Event dates** use the frozen day keys.
  - **Legacy letters** without frozen IDs use neutral wording.
  - **Backdating (DEC-09, default):** add an optional `periodAnchor` so "start tracking earlier" extends history without regrouping established multi-week periods. `overlapsPaidPeriod` already prevents double pay, so this is a truthfulness decision, not an economy fix.
- **Backfill and compatibility:** as in C7. It runs once per save through the decoder and is idempotent. Older builds preserve the fields but do not maintain them, and the readers tolerate drift.
- **Preserved behaviour:**
  - the documented unknown-order policy for backfilled history;
  - one story per check-in;
  - the "Quote my notes" setting stays live (not frozen);
  - deleted-habit lines are omitted, as now.
- **Regression tests:**
  - **domain-d2:** 14 reversed days, then advance past 120 days → still 0 kept-together. Metamorphic: every derived fact intended to survive compaction is equal before and after `pruneOldStamps`. Also cover the 120/121-day boundary, one-sided backfill and anchor change.
  - **HM3 (R207):** 24, 25 and 26 live taps for the anchor and the follower, in valid and reversed orders. Also cover direct exact-count entry, undo and recheck, and later compaction.
  - **domain-d3:**
    - acquisition and pairing midweek;
    - a swap between habits;
    - a return to an old pairing;
    - a stage-up before pairing;
    - a routine unlocking midweek;
    - late backfill.
    Assert both the structured facts and the final sentence.
  - **domain-d4:** events before and after the old and new boundaries; time-zone moves both ways; leap-day anniversaries; a season starting on the adjacent civil day. Recorded dates stay fixed while future day assignment follows the new setting.
  - **domain-w2-d3:** save a note, change the habit's icon and plant → re-reading shows the original routine.
  - **RISK-11:** a favourite found on day X, with the memory awarded on day Y → the memory is dated X; a companion arriving after the bloom → the bloom date is the plant's.
  - **RISK-12:** the audit's biweekly example keeps its existing period geometry.
- **Completion criteria:** the history metamorphic suite (§7.5) is green: compaction, preference changes, cosmetic edits and unrelated lifecycle actions leave historical facts unchanged.
- **Rollback:** the fields are optional; reverted code ignores them and recomputes as today. No data is lost either way.

#### WP-14. Local time semantics and the worldwide time matrix

- **Covers:** data-d9, and the time half of GLOBAL1: fractional zones, day-boundary minutes, travel, and the signature's local reader (RISK-27).
- **Size:** S–M. **Uncertainty:** low. **Depends on:** WP-0.
- **Current files:**
  - `src/state/selectors.ts`: `:39` floors to the UTC hour; `hourEnv` `:44`; `dayEnv` `:42` uses `.peek()`, which freezes `now` until the day changes.
  - `src/state/views/today.ts`: `:264–269`, `:287–288`, `:335`, `:421`, `:439`.
  - `src/domain/signature.ts:122`; `src/domain/badges.ts:69–84`; `src/domain/insights.ts:322`.
- **Design.**
  - Memoise on a semantic local key: `{ appDay, block, greetingBucket, clockBehind }`, computed from the real local minute and `dayStartsAt`.
  - Pass the real `now` when that key changes, so recomputation stays coarse but correct.
  - For raw timestamps read later (signature, badges, insights), DEC-10's policy decides whether to store the local minute-of-day at check-in. Until then, the rule is documented: signature reads with the current zone.
- **Regression tests:**
  - 11:05 at UTC+05:30 → Midday.
  - 03:35 with a 03:30 boundary → the new day's block.
  - Kathmandu +05:45; Lord Howe (+10:30/+11 DST).
  - International date line travel both ways; 03:30 boundary across a DST change.
  - Leap day and month ends.
- **Completion criteria:** Today's greeting, block and date agree with each other in every zone of the matrix.
- **Rollback:** selector-only.

#### WP-15. Truthful views: capabilities, empty states, the jar and the soil

- **Covers:**
  - domain-w2-d1, including the converse: post-archive days are offered "Water it", which is always refused;
  - domain-w2-d4;
  - domain-d7;
  - creative-cr-02;
  - RISK-14 (the calendar note-marker memo);
  - RISK-15 (the best/current run tile compares raw lengths across units).
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-0; DEC-07 for the jar (a default is given).
- **Current files:**
  - `src/state/views/calendar.ts:91`, `:97`, `:127–131`.
  - `src/features/progress/Calendar.tsx`: `:46`, `:70–88`, `:149–152`, `:237–242`, `:246–303`, `:276–278`, `:287–288`.
  - `src/domain/logging.ts:379–392`.
  - `src/features/progress/ProgressScreen.tsx:145–222`; `src/state/views/progress.ts:179–188`.
  - `src/state/views/today.ts:231–243` and `src/features/progress/Hero.tsx:89–94`.
  - `src/art/plants/hooks.ts:13–22`, `PlantArt.tsx:174–179`; `src/art/scene/WindowsillBand.tsx:148–162`, `sill/SillSegment.tsx:120–121`, `actors/PotSlot.tsx:71–72`; `src/features/today/HabitCard.tsx:201–208`.
  - `src/features/habits/detail/Parts.tsx:139–142`; `src/domain/streaks.ts:47–58`, `:99`.
- **Design.**
  - **Calendar.** Export `historyEditCapability(state, habitId, date) → { canMarkDone, canUndo, reason }` from `logging.ts`, extracted from `editHistory`'s inline rules, and drive `DayEdit` from it rather than from the glyph. "No daily obligation" is separated from "not loggable". Refused actions show the capability's reason, never the week-strip instruction.
  - **Progress.** Each section (records, pins, memories, seasons) owns its empty state. The whole-screen empty state appears only for a genuinely new account.
  - **Jar (default for DEC-07).** A stem means "showed up this month", using `checkinCounts` / `showedUp(logStatus(...))`, the Herbarium's existing definition. Tiny counts; a partial count does not.
  - **Soil.** `PlantArt` uses the authoritative `damp` only. The watering pulse remains an animation trigger. The band's sticky set is cleared on undo and day change, and delayed band effects for an undone occurrence are cancelled.
  - **Note markers.** The note-marker memo depends on the relevant logs (or aggregate cells carry note presence).
  - **Run tile.** The run tile compares `occurrences` and labels units.
- **Preserved behaviour:**
  - reward and history separation;
  - the reducer's period-window protection, now explained truthfully;
  - the water animation;
  - Progress staging and memoisation.
- **Regression tests:**
  - **domain-w2-d1:**
    - add, remove and add again on weekly and monthly habits in closed periods;
    - legal positive history on paused and off days;
    - post-archive days show no Water button;
    - refusals show their reason.
  - **domain-w2-d4:** a never-used account versus one with no habits but badges, an anniversary note and filed seasons.
  - **domain-d7:** a zero-count tiny → a stem; a partial count → none (under the default); also undo, rest, archived dates, and a later full completion.
  - **creative-cr-02:** on the same instance, `false/0 → true/1 → false/0` returns to dry soil; also a day change, and undo during the water-flight delay, on both the card and the band.
  - **RISK-14:** add a note while mounted → the marker and accessible label update.
  - **RISK-15:** a weekly best of 3 weeks versus a daily current of 4 days is compared by occurrences.
- **Completion criteria:** no view decides an action from presentation state, and every retained section is reachable.
- **Rollback:** view-layer; revert safely.

### Phase 4: Accessible complete journeys

#### WP-16. Cancel is not commit: sheets, lists and steppers

- **Covers:** UI2-05, UI2-06, RISK-16 (window listeners left behind by a mouse drag on a sheet).
- **Size:** S–M. **Uncertainty:** low for the code; medium for which operating-system events cause the cancel, which needs device checks.
- **Depends on:** WP-0.
- **Current files:**
  - `src/ui/Sheet.tsx`: `end` `:251–268`, `onTouchEnd` `:283–286`, the mouse-drag window listeners `:292–305`, the effect cleanup `:312–318`, and touchcancel mapped to the release path `:310`/`:316`.
  - `src/features/today/NoteSheet.tsx:40–44`.
  - `src/features/you/HabitsSection.tsx`: the order is changed live at `:130`, `endDrag` `:135–148`, and pointercancel is routed to `endDrag` at `:193–194`.
  - `src/ui/Stepper.tsx:28`, `:45–64`, `:72–76`.
  - The correct pattern already exists at `src/art/scene/actors/DecorEdit.tsx:100–103`.
- **Design.**
  - **Sheet.** Gesture primitives get a separate `cancel()`. On `touchcancel`/`pointercancel` a sheet returns to its resting detent, clears samples and pointer state, and never calls `onClose`. Window listeners belong to the gesture, so unmounting mid-drag removes them.
  - **Arrange list.** On cancel it restores the saved order it captured at the start of the drag (`HabitsSection:146`).
  - **Stepper.** Click suppression is tied to one pointer sequence (by `pointerId`) and cleared on cancel and leave. It is also cleared when a press disables the button at its min or max. The ref is per button, not shared. A keyboard or programmatic click with no preceding pointerdown always acts.
  - **Note drafts.** NoteSheet gets a dirty check matching the Habit Editor's (`HabitEditorHost.tsx:36–40,79–93`): an intentional dismiss with a draft asks "Keep writing / Discard". This adds protection; it does not replace correct cancellation.
- **Preserved behaviour:** drag-to-dismiss, flick velocity, detents, press-and-hold repeat, reduced-motion paths.
- **Regression tests:**
  - UI2-05:
    - Sheet: drag past the dismiss threshold, then `touchcancel` → the sheet and the draft remain.
    - Arrange: drag to reorder, then `pointercancel` → the saved order is unchanged.
    - Normal `pointerup` still commits and dismisses.
    - Unmounting mid mouse-drag leaves no window listeners.
  - UI2-06 (R208):
    - down → cancel → keyboard click changes the value once;
    - down → leave → release outside → keyboard click;
    - short and long presses do not double-count;
    - hitting the min or max and then using the keyboard.
- **Device tests:** iPhone system-gesture cancels (Control Centre pull, incoming call banner, a scroll takeover) during a sheet drag and an Arrange drag (§7.10).
- **Completion criteria:** no cancel path commits. Every gesture primitive has a tested cancel branch.
- **Rollback:** local; revert safely.

#### WP-17. Actions inside the active focus scope; timing that respects absence

- **Covers:**
  - UI2-04;
  - RISK-17 (toast timers ignore page visibility);
  - RISK-18 (medium-detent sheets have no explicit expand control; needs device measurement);
  - the former `NOTES-w2-today.md` request 21 (toasts over a sheet's header), which is the same boundary. The base now moves celebration banners aside when a sheet opens; actionable toasts are still outside the trap.
- **Size:** M. **Uncertainty:** medium (VoiceOver behaviour). **Depends on:** WP-0.
- **Current files:**
  - `src/ui/Sheet.tsx:334` (focus trap), `src/ui/sheetStack.ts:131–149`.
  - `src/ui/Toaster.tsx`: portal `:49–57`, timer `:78–83`, pause `:119–122`.
  - `src/ui/toast.ts`: durations `:95–97`, announcement `:106–108`, `holdToasts` `:61–72`.
  - `src/features/today/TodayScreen.tsx:296`; `src/features/shelf/BasketSheet.tsx` (medium detent).
- **Mechanism.** Toast actions render outside the sheet's panel. Tab cannot reach them while a sheet is open, focus-pause therefore never triggers, and the action expires after 4 s. Timers also keep running while the app is hidden.
- **Design.** One ownership rule. When any sheet or dialog is open, an **actionable** toast renders in a `ToastOutlet` inside the topmost layer's panel, so it is within its focus trap and accessible subtree. Toasts without actions may stay in the overlay.
  - **Timers.** Actionable toast timers pause while the document is hidden, while focus is inside the toast, and while a screen reader has it focused. They restart with their remaining time on return, with a minimum of 8 s for actions (proposed).
  - **Stable equivalents.** Every timed action has a permanent route, so expiry never removes capability. Undo a count → the stepper in the pad. Add a note → a note button in the count pad. Undo an import → the You › Data row while valid.
  - **Sheet detents.** Sheets opened at the medium detent get a visible, focusable "Show more" control and `aria-expanded`.
- **Alternatives.**
  - Weakening the focus trap: rejected, because it breaks the modal contract.
  - Deferring every actionable toast until the sheet closes: simpler, but "Add a note" belongs in context. Kept as the fallback for nested layers where no outlet exists.
- **Preserved behaviour:** the modal trap; moment holds (`momentOpen`); calm toast tone; announcements.
- **Regression tests:**
  - UI2-04: a keyboard-only check-in in the CountPad → Tab reaches Undo and Add a note, which operate without escaping the modal and without racing a timer. Repeat for nested Pet Card → pantry, and for dialog combinations.
  - RISK-17: an actionable toast, then hidden for 10 s, then visible → it is still actionable, with its remaining time.
  - RISK-18: keyboard users can expand a medium sheet and reach its last item.
- **Device tests:** iPhone VoiceOver (rotor and swipe order reach the toast action inside the sheet); iPad with an external keyboard; largest Dynamic Type with the keyboard open (§7.10).
- **Completion criteria:** no action is visible but unreachable by keyboard or VoiceOver, and none expires while the user is away.
- **Rollback:** revert to the overlay portal; the stable equivalents stay useful on their own.

#### WP-18. Carry the user's intention across screens

- **Covers:**
  - integration-i6;
  - creative-cr-01;
  - domain-w2-d2;
  - NEW-07: in the routed app "Visit {name}" can never show, and the reveal sets `location.hash` directly instead of calling `navigate()`.
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-0; benefits from WP-10's lazy hosts.
- **Current files:**
  - `src/features/capsules/RevealCard.tsx`: the Shelf fallback `:149–153`; the "Visit {name}" button, whose visibility flag is always false, at `:168`.
  - `src/app/ScreenHost.tsx:83` renders screens without props.
  - `src/app/router.ts:35–43` (`navigate`); `src/features/habits/open.ts:30` (`openPetCard`).
  - `src/features/pets/PetCard.tsx:327–331`, `:354–398`; `src/features/pets/petCopy.ts:44–49`; `src/features/pets/PetCardHost.tsx:57–58`; `src/features/shelf/BasketSheet.tsx:60–91`.
  - `src/features/progress/Calendar.tsx:248–254`; `src/features/habits/detail/HabitDetailHost.tsx:15–34`; `src/app/SheetHosts.tsx`.
- **Design.** A small typed intent contract handled by the shell:

  ```ts
  type Intent =
    | { kind: 'pair-pet'; petId }
    | { kind: 'feed'; petId }
    | { kind: 'open-day'; habitId; date }
    | { kind: 'edit-note'; habitId; date };
  ```

  - **Find a plant.** "Find {name} a plant" opens that pet's card with its plant chooser focused (`openPetCard(petId)`). When there are no habits, the chooser shows a useful empty state with "Plant a habit".
  - **Basket and pantry.** From a Pet Card this opens with `{ petId, onFeed }`, showing **every** treat with its servings. Treats with no servings show the existing restock and bake explanation. Standalone pantry stays an inventory.
  - **Open Today.** In the calendar this closes the containing Detail sheet, selects that app day on Today, navigates, and focuses the habit's card. Focus returns sensibly on Back.
  - **Future shortcuts.** A native App Intent or widget later uses the same contract, adding save epoch and freshness checks (WP-N3, OPP-05).
- **Preserved behaviour:** six quick treats on the card; "Let them choose"; the reward and history split for recent days.
- **Regression tests:**
  - integration-i6: a new pet from the routed Capsules screen (not a gallery callback) → its Pet Card chooser is focused and pairing works.
  - creative-cr-01: seven or more equally stocked treats; feed the seventh through the continuation → exactly that treat is consumed, the intended pet reacts, and the chooser still works after stock changes.
  - domain-w2-d2: from Today and from Progress, Detail → yesterday → Open Today → no Detail dialog remains, the day is selected, and the habit can be logged.
- **Completion criteria:** each of the three journeys ends in an actionable state with focus placed, verified in Playwright on phone and desktop widths.
- **Rollback:** the intent handling is additive; revert per journey.

#### WP-19. Quiet rewards as a complete mode

- **Covers:**
  - integration-i5, which is partly fixed: the wallet is hidden, and the remaining surfaces are listed below;
  - OPP-03's mandatory half;
  - the former `NOTES-w2-today.md` request 4 (fx layer; amounts are now hidden, per `NOTES-open.md` item 7).
- **Size:** M. **Uncertainty:** low. **Depends on:** WP-0; DEC-15 (a default is given).
- **Current files:**
  - `src/app/Sidebar.tsx:29–31` and `src/app/TabBar.tsx:28` map every route, including Capsules (`routes.ts:24`).
  - Shortcut digit 3 opens Capsules (`src/app/routes.ts:64–67`).
  - Surfaces that ignore the setting:
    - the Shelf header's coin count and its "not enough coins" toast (`src/features/shelf/ShelfScreen.tsx:187–199`, `:415`, `:453`);
    - the coin-gated Bake on the Pet Card (`src/features/pets/PetCard.tsx:124`, `:382`) and in the Basket (`src/features/shelf/BasketSheet.tsx:80–84`);
    - the calendar's "History only, no coins." toast (`src/features/progress/Calendar.tsx:292–295`).
  - The setting's copy is at `src/catalog/lines.ts:783`.
  - Surfaces that already comply are listed by the verification pass (for example `Sidebar.tsx:59`, the Today check-in note, `celebrationPlan.ts:226–232`).
- **Design.** A single `presentation.quiet` selector, used by the shell (navigation, shortcuts, wallet), the fx and celebration layer, toasts, the Shelf chrome and currency-worded copy.
  - **Defaults for DEC-15:**
    - Capsules leaves navigation and the digit shortcut. A direct `#/capsules` link shows a calm "Capsules are tucked away while Quiet rewards is on · Show them" instead of the machine.
    - The Shelf, pets, plants, notes, history, rest and review all stay.
    - Coin counts and coin-worded messages are hidden or reworded ("History only" rather than "History only, no coins").
    - Bake stays available without showing a price.
    - Pending reveals are still resumable, because nothing earned is hidden away forever.
  - **Reversibility.** Turning the setting off restores everything with the inventory intact.
- **Preserved behaviour:** earned inventory and currency are never removed; the existing wallet hiding stays.
- **Regression tests:**
  - The updated integration-i5 reproduction: Sidebar and TabBar with quiet on → no Capsules link, no wallet.
  - A quiet-mode journey at phone and desktop widths: create a habit, check in, add a note, correct history, rest, and use the Season Review, with no currency word on screen. The voice lint gets a quiet-mode string check.
  - An existing save that was last on the Capsules tab.
  - An imported quiet save.
- **Completion criteria:** a scripted "five-minute daily journey" with quiet on shows no coins, capsules or wallet, and every tracker function remains reachable.
- **Rollback:** presentation-only.

#### WP-20. Control over personal writing

- **Covers:**
  - UI2-08;
  - RISK-19 (no draft restoration);
  - OPP-01's mandatory base (edit and delete).
  - Search and export are enhancements in §8.
- **Size:** M. **Uncertainty:** low for editing; the redaction semantics wait on DEC-06. **Depends on:** WP-18 (the `edit-note` intent); DEC-06.
- **Current files:**
  - `src/features/today/NoteSheet.tsx` (`NoteTarget`, `setNote` `:35`).
  - `src/features/habits/detail/Parts.tsx:171–211` (Moments, starring only).
  - `src/features/progress/Calendar.tsx:202–234` (the day panel shows note text read-only).
  - `src/domain/logging.ts`: `setNote` `:340–352` (empty text deletes the note and its star); `loggable` `:99–103`.
- **Design.**
  - **Editing.** Moments and the calendar day panel offer "Edit note". This opens the same dated `NoteSheet` with the habit and date shown, plus a "Remove note" action with a confirmation. The domain already allows it and it has no reward side effects.
  - **Archived habits.** Notes on archived habits are editable within their lifetime (a product default; the domain's `loggable` needs a note-specific rule, because it currently requires the habit to be in its lifetime *as of today's rules*; verify).
  - **Removal (DEC-06, recommended).** Removing a note also redacts its quotation in frozen Sunday Notes, which are shown as "(a note you removed)". The existing daily and weekly copies and external backups still contain it until they age out or are deleted. The confirmation says exactly that.
  - **Drafts.** A draft store for NoteSheet and the Habit Editor, keyed by `{ saveEpoch, habitId, date }` and owner-gated. It is never counted as a log, is restored on reopen with "Draft restored", and is discarded on save, on discard, or on an epoch change.
- **Preserved behaviour:** starring; "Quote my notes"; rewards untouched by note edits; NOTE_MAX.
- **Regression tests:**
  - Edit and remove a note from a year ago without changing the count, tiny or rest status, earned currency or plant history.
  - Unicode, including combining marks and emoji; an archived habit.
  - A note quoted in a Sunday Note, checked against the chosen redaction contract.
  - A draft survives a sheet dismissal and a reload, and is discarded after a reset.
- **Completion criteria:** a person can correct or delete a six-month-old note in a few deliberate actions (the audit's success test).
- **Rollback:** additive UI; the redaction is a letter-rendering rule and can be reverted without data loss.

### Phase 5: Creative truthfulness

#### WP-21. One earned plant presentation

- **Covers:**
  - creative-cr-03;
  - RISK-21 (Habit Detail's large resident has no outfit);
  - RISK-20 (onboarding draws planted habits at stage 0);
  - NEW-03 (two different partner-colour derivations; the Today card passes a look without a partner colour);
  - creative-cr-06, the presentation half; the art half is DEC-12;
  - NEW-09 (the look-unlock copy claims the look shows on the plant tag, which `PlantTag.tsx` never renders).
- **Size:** M. **Uncertainty:** low for parity; medium for the retirement freeze contract. **Depends on:** WP-0.
- **Current files:**
  - `src/features/shelf/model.ts:26–34` and `:42–76`.
  - `src/state/views/today.ts:99–130` and `:385–405`.
  - `src/features/today/Band.tsx:65–80` (partner from `card.after`).
  - `src/features/progress/looks.ts:8–15` (`lookArtOf`, partner from `evidence.keptTogether ?? anchorHabitId`).
  - `src/features/today/HabitCard.tsx:202`.
  - `src/art/plants/looks.tsx:25–36`, `:65–72`, `:83–86`.
  - `src/features/shelf/ShelfScreen.tsx:49–64`.
  - `src/features/habits/detail/HeroPlant.tsx:13–27`, `:56–66`; `src/features/habits/detail/HabitDetail.tsx:54`.
  - `src/features/onboarding/SillStage.tsx:46–53`; `src/features/onboarding/CapsuleSteps.tsx:232`.
  - `src/art/plants/PlantTag.tsx`.
- **Design.**
  - **One mapping.** `plantPresentation(state, habitId)` in `src/state/views/common.ts` returns the permanent earned appearance: best stage, chosen look, partner colour with **one** derivation rule, flourish counts and blooms. Today card, band, Shelf (live, paused and retired), Habit Detail, Progress and onboarding all use it, and each screen layers its day-specific status (soil, props, activity) on top.
  - **Retirement contract.** A retired plant shows its earned appearance as it stood at retirement. The additive optional `Habit.retiredLook` snapshot is written at archive time. Legacy retired plants derive from current data.
  - **Detail resident.** It receives the pet's outfit.
  - **Tag claim.** The look-unlock copy stops claiming the look "shows on the tag" unless `PlantTag` renders it; DEC-12 decides.
- **Preserved behaviour:** species identity; rest showing ordinary soil; growth high-water marks.
- **Regression tests:** one Paired flowering Evergreen with several flourishes renders the same identity fields on Today, band, Shelf and Detail. Pause and resume keep the look. Retirement keeps it too. The partner colour agrees across screens.
- **Completion criteria:** a single mapping, with a parity test over all consumers.
- **Rollback:** presentation-only; `retiredLook` is optional.

#### WP-22. Friendship that the room can show

- **Covers:** creative-cr-04; RISK-23 (R3: favourite place and best friend are heuristics, not learned history).
- **Size:** M–L. **Uncertainty:** medium (behaviour tuning). **Depends on:** DEC-08; WP-13 (pairing intervals) for the history-based best friend.
- **Current files:**
  - `src/catalog/linesCore.ts:123–163` (`FRIENDSHIP_LEVELS`: L5 follows the sun, L7/L9 front of the sill, L8 naps beside a friend).
  - `src/features/shelf/model.ts:92–103`.
  - `src/art/scene/model.ts:46–64`.
  - `src/art/scene/ShelfScene.tsx:125`: builds the cast and drops `favouriteSpot`, which is used only for the opening arrangement at `arrange.ts:222–232`.
  - `src/art/scene/behavior/director.ts:17–26`.
  - `src/art/scene/behavior/plan.ts:21–29`, `:56–74`, `:99–118`.
  - `src/art/scene/behavior/vignettes.ts:117–151`.
  - `src/domain/places.ts:68–101`; `docs/DESIGN.md:320–325`.
- **Design (recommended option of DEC-08).**
  - **Behaviour profile.** Pass `{ sunAffinity, frontBias, napFriendId, waitsAtFront }` from level and best friend into the director. It biases plans deterministically, which is visible over several visits rather than guaranteed on every one, and it works under reduced motion through stable placements. When the named friend is absent, the pet falls back to ordinary behaviour.
  - **History-based best friend.** Evidence is a bounded daily co-presence count (app days both were out on the same place), rather than same-species or arrival-time heuristics, following R3.
  - **Undelivered behaviour.** Any promised behaviour not delivered in this package has its level line reworded until it is.
- **Alternative:** only rewrite the level copy (cheapest, and truthful), leaving the behaviour for later. This is acceptable as an interim step, but it gives up the relationship payoff the product is built around.
- **Regression tests:**
  - With the same species, personality, seed and clock below and above each unlock, a measurable preference difference appears over N simulated visits.
  - The named-friend affinity holds when both pets are present, with a fallback when one is absent.
  - Level lines are only shown for wired behaviours; this is a catalogue contract test.
- **Completion criteria:** no level announces a behaviour the scene cannot express.
- **Rollback:** the director inputs are optional; revert to today's plans.

#### WP-23. Content, specification and credit truthfulness

- **Covers:**
  - creative-cr-05;
  - HM4;
  - NEW-04 (the odds sheet's "Each" column uses equal weights while the lineup shows ownership-weighted chances);
  - domain-d5;
  - SHIP1 notices (the credit text itself is fixed in WP-24a; notices are in WP-R4).
- **Size:** S. **Uncertainty:** low. **Depends on:** WP-0.
- **Current files:**
  - `src/catalog/lines.ts:131–141` (`FLOURISH_LINES`, no consumer) and `src/art/plants/flourishes.tsx:16`; `docs/VOICE.md:397`.
  - `docs/DESIGN.md:266–272`.
  - `src/domain/gacha.ts:147–192`; `src/catalog/machines.ts:160`.
  - `src/state/views/capsules.ts:154`, `:182`; `src/features/capsules/OddsSheet.tsx:54`.
  - `src/catalog/places.ts:14–23`; `src/domain/places.ts:44–56`; `src/domain/shelf.ts:65–85`.
- **Design.**
  - **Flourishes.** Key flourish copy by art ID (`snail`, `trail`, `shoot`, …) and add a catalogue↔art contract test before anything consumes it.
  - **Rarity wording.** Reword DESIGN §7 to say that tier odds and equal-ownership item odds are ordered, while current per-item chances also reflect new-first weighting and guarantees. Keep the mechanic; it is transparent, earned-only, and not sold.
  - **Odds sheet.** It either shows the current per-item chance (`itemChances`) or labels the column "before new-first weighting".
  - **Balcony.** An `affinity(place, species)` helper treats empty `loves` as universal, keeping the Sill exception and capacity checks.
- **Regression tests:**
  - Flourish copy and art order agree by key.
  - Dynamic item chances sum to 100% for every machine, over ownership permutations and zero or many Moonlit variants. Permuting item enumeration preserves each item's analytical probability.
  - Guarantee precedence is tested separately.
  - Balcony purchase, next-day settlement and suggestion for each species.
- **Completion criteria:** every displayed probability and promise matches the implementation.
- **Rollback:** content and view; revert safely.

### Delivery and evidence (parallel to Phases 1–5)

#### WP-24. Portability, browsers, motion and dependency hygiene

- **Covers:**
  - the rest of integration-i1: Windows and macOS lanes, the third stem pair `Leaflet.test.tsx`/`leaflet.test.ts`, and the crescent precision test;
  - the evidence half of ACCESS1 (WebKit, normal motion, touch);
  - SHIP1 (the development Vitest advisory; `--host` dev servers);
  - RISK-22 (classic scrollbars shift the desktop column, a residual of the integration-i7 fix);
  - regression guards for the two fixed findings: the first-paint budget (integration-i2) stays in every lane that builds, and a layout check pins the 720 px desktop column (integration-i7);
  - NEW-08 (the Playwright `testMatch` includes a `capsules` spec that does not exist).
- **Size:** M. **Uncertainty:** medium (WebKit flakiness on CI). **Depends on:** WP-24a.
- **Current files:** `.github/workflows/ci.yml` (Ubuntu, Chromium only); `playwright.config.ts` (every project Chromium; `reducedMotion: 'reduce'` global at `:64`); `package.json` (`dev`/`preview` use `--host`; Vitest `^3.2.7`); `src/app/App.module.css:31–36`.
- **Design.**
  - **CI lanes.** Add a Windows lane (typecheck and unit tests) and a macOS lane (typecheck and build), both on push to the default branch and nightly.
  - **Playwright projects.** Add WebKit phone and desktop projects, a **normal-motion** project for the interaction specs (capsule, sheet, check-in), a touch-phone project (the former `NOTES-w2-today.md` request 22), and a `capsules.spec.ts` covering pull → reveal → reload → resume.
  - **Crescent test.** Triage the crescent-generation precision failure: use an explicit tolerance or deterministic arithmetic, and document which.
  - **Vitest.** Upgrade to a patched release in a dedicated compatibility change. Do not run `npm audit fix --force`.
  - **Dev servers.** Make `--host` opt-in (`npm run dev:lan`) so dev servers are not exposed by default. The native bridge (WP-N1) must never load a development origin in release builds.
  - **Desktop column.** Centre it within the container, not `100vw`, and verify with classic scrollbars.
- **Completion criteria:**
  - CI is green on Linux (Chromium and WebKit), on Windows (unit tests), and on macOS (build).
  - Normal-motion interaction specs pass.
  - No known advisories remain in the development toolchain.
- **Rollback:** CI configuration; revert per lane.

#### WP-25. Scale evidence for long, note-heavy histories

- **Covers:**
  - RISK-10 (fixtures under-represent journaling and the cost of persistence);
  - RISK-28 (history cold paths: growth, streaks and day arrays);
  - RISK-29 (long-history rendering: Moments and the memory shelf render everything);
  - RISK-03's `list()` cost;
  - SHIP1 (measure tap-to-paint and durable-save latency separately).
- **Size:** M. **Uncertainty:** medium. **Depends on:** WP-0; informs WP-6 limits, WP-N2 and WP-R3.
- **Current files:** `tests/unit/state/bigsave.ts:74` (a note on 4% of logs, about 52 characters); `size.test.ts:21–36`; `perf.test.ts` (view models only); `src/features/habits/detail/Parts.tsx:182`; `src/features/progress/Keepsakes.tsx:196`; `src/domain/growth.ts:261`, `streaks.ts:74`, `activity.ts:238`, `dates.ts:176`.
- **Design.**
  - **Fixtures.** Add note-heavy fixtures: 12 daily habits × 5 and 10 years × 280-character notes (over 6.1 million note characters), plus many rule changes, pets and letters, and a bounded "unreasonable" input.
  - **What to measure.**
    - Reducer, `JSON.stringify` and synchronous `setItem` latency for a check-in.
    - Quota behaviour in Chromium and WebKit.
    - Snapshot put/list.
    - Import parse and validation.
    - The cold open of Progress and Detail.
    - Return-to-scroll on Moments.
  - **Budgets.** Set concrete budgets on the chosen reference iPhone during WP-N1. For example, the tap paints within one frame and the durable save lands within 100 ms (proposed; confirmed on device).
  - **Rendering.** Paginate Moments and the memory shelf by month or year **only if** the measurements justify it.
  - **Incremental summaries.** Introduce these only with equivalence tests against full recomputation (backfill, changed rules, archival).
  - **Notes are never pruned** to meet a budget.
- **Completion criteria:** documented measurements for each fixture and budget; any breach has a named package or decision (for example, moving the primary save to IndexedDB or native storage in WP-N2).
- **Rollback:** tests and fixtures only.

### Phase 7: Native feasibility

The native track is a **release requirement**, not a regression. It does not start with a broad architecture commitment. It starts with a small signed proof on a real iPhone that tests the expensive assumptions.

#### WP-N1. Signed-iPhone feasibility spike

- **Covers:** IOS1; the transfer half of IOS3; baseline evidence for ACCESS1 and WP-25; inputs to DEC-16 (native architecture).
- **Size:** L. **Uncertainty:** high (this package exists to reduce it).
- **Depends on:** C1, C2 and C4 designed (not necessarily shipped); WP-25 fixtures for the large-save import; an Apple Developer Program membership and a test device (owner prerequisites).
- **Current state:** `package.json`, `vite.config.ts` and `.github/workflows/ci.yml` build a web/PWA and a single-file artefact. There is no Xcode project, entitlement, StoreKit configuration, native bridge, signing or native test target. `docs/DESIGN.md:53`'s "no rewrite" is reasonable for the domain and most UI, not for storage, purchases, reminders or lifecycle.
- **Design.**
  - **Wrapper.** A deliberately small wrapper around the existing Preact UI and TypeScript domain, with bundled local assets (no remote origin). A third `StoreRuntime` implementation (`native`) is injected at boot, exactly as tests inject fakes today.
  - **Candidates, compared on the same checklist:**
    1. **Capacitor 8.** Confirm on capacitorjs.com: Swift Package Manager by default, an iOS 15 minimum and Xcode 26 are reported by secondary sources. Check plugin maintenance, the bridge's attack surface, and its privacy manifest.
    2. **A hand-rolled `WKWebView` shell** with a minimal message bridge: fewer dependencies and a smaller privacy-manifest surface, but more native code to own.
    3. **A native SwiftUI UI.** Only if the device evidence shows unacceptable accessibility, performance or interaction limits in a web view. Not assumed.
  - **Proof checklist on a physical iPhone:**
    - install a signed build (TestFlight internal);
    - launch in airplane mode;
    - complete a habit;
    - terminate and relaunch, and the save persists through a prototype native storage adapter;
    - share a backup to Files, then restore it;
    - import the WP-25 five-year note-heavy save;
    - complete one sandbox subscription purchase through StoreKit 2;
    - a VoiceOver smoke test of Today and the check-in;
    - largest Dynamic Type on Today;
    - measure tap-to-paint, durable-save latency and memory.
  - **iPad.** Multiple scenes can run two web views, so single-writer ownership (C2) still matters natively. The spike checks whether iPad multi-window is enabled.
- **Outputs:** an architecture decision record (wrapper, storage engine, plugins, deployment target, privacy-manifest implications) with measured numbers, and a go/no-go.
- **Completion criteria:** every item on the IOS1 acceptance list demonstrated on a real device, with recorded evidence.
- **Rollback:** a spike branch; nothing merges into the web app except the `StoreRuntime` seam, which is inert for web builds.

#### WP-N2. Native durable storage

- **Covers:**
  - IOS2;
  - RISK-33 (save identity across container migration);
  - RISK-30 (erase all copies) on native;
  - the native half of RISK-10.
- **Size:** L. **Uncertainty:** medium. **Depends on:** Phase 1 shipped (C1–C6); WP-N1's storage choice.
- **Design.**
  - **An asynchronous `StoragePort`** implementing C1 and C4 unchanged:
    - `load() → Promise<LoadResult>`;
    - `commit(envelope, { expectEpoch, expectRev }) → Promise<CommitResult>`;
    - a snapshot API.
  - **One transaction for a replacement.** Where the engine allows, the pre-replacement snapshot, the undo token and the main save are committed in **one** transaction, which is stronger than the web's epoch-bound sequence.
  - **Engine** (decided in WP-N1):
    - SQLite through a maintained plugin: transactions, snapshots and metadata in one file;
    - or atomic JSON files (write to a temporary file, fsync, rename) plus a small journal.
    - Capacitor's Preferences API is explicitly unsuitable for large, high-write data.
  - **Data shape.** Whole-state JSON first; incremental records only if WP-25 measurements require them.
  - **Device backup policy.** The journal is included in the device's iCloud or computer backup (it is the user's data), with a file-protection class that keeps it readable after first unlock.
  - **Migration from the web app.** Explicit, through the backup file or the `CK1:` code and the C5 decoder. Never through a URL containing the payload. A **migration receipt** records the source, captured revision and epoch, the target identity, the committed bytes, and the rollback available. The app verifies the imported save after reopening before suggesting removal of the original.
  - **Erase everything on this device** covers the main save, backup, corrupt, demo, snapshots, undo, onboarding, drafts and native files, and reports any failure honestly (RISK-30, DEC-13).
- **Tests:**
  - fault injection at every transaction boundary;
  - low storage;
  - killing the process during a save (the reopen shows the old complete save or the new complete save, never a mixture);
  - process recreation;
  - app upgrade;
  - future-schema read-only rescue;
  - database unavailable;
  - an interrupted migration.
- **Completion criteria:** the IOS2 acceptance list passes on device; no durable undo or restore is promised before its transaction commits.
- **Rollback:** the storage engine sits behind the port. A failed engine can be swapped before release without touching the domain.

#### WP-N3. Native platform capabilities

- **Covers:**
  - IOS4, all six rows;
  - RISK-34 (sound and haptics use browser techniques);
  - RISK-32 (a suspension right after hiding, without pagehide);
  - NEW-05 (the install-prompt "just installed" state, and user-agent or `navigator.platform` sniffing);
  - the native half of RISK-09;
  - OPP-05's foundation.
- **Size:** L. **Uncertainty:** medium. **Depends on:** WP-N1; WP-N2 for lifecycle flushing; DEC-01 for reminder behaviour after expiry.
- **Current files:**
  - `src/features/you/files.ts`, `src/features/you/RemindersSection.tsx`, `src/features/you/calendar.ts`;
  - `src/app/installPrompt.ts` (`:58` treats "just installed" as installed even in a tab; `:27`/`:39` sniff `MacIntel` touch);
  - `src/app/pwa.ts`;
  - `src/fx/haptics.ts`: a hidden switch at `:22–36`, and user-agent and deprecated `navigator.platform` sniffing at `:38–49`.
- **Design.** One capability adapter per row of the audit's IOS4 table, selected by the runtime, never by user-agent sniffing.

  | Area | Design |
  |---|---|
  | Backup and import | Native share sheet and document picker. Delivery status (saved, cancelled, failed) drives `markBackup`. Large-file limits come from C6. |
  | Reminders | Optional local notifications scheduled from the user's app day: weekdays or flexible targets, pauses, time zone, and cancellation when the habit is completed or archived. Permission is requested only when the user turns a reminder on, with a clear state when it is denied. Lock-screen text is generic by default ("A plant is waiting"). Tested for DST, travel, denial, a schedule change, an archived habit, subscription expiry (per DEC-01) and a reopened device. The one-time `.ics` export stays, with no claim that catkin can remove imported calendar events. |
  | Haptics and sound | A native feedback adapter (`UIFeedbackGenerator`) that respects the preference, the silent switch and audio interruptions. Sound uses an ambient session and resumes after interruption. |
  | Updates and About | Bundle-based updates. About shows the app version, web content build and schema version. The service worker, "Reload app" and Home Screen install guidance are removed from native builds. |
  | Background and resume | Native pause and resume flush the save (WP-N2) and recheck time and entitlement. Editor targets and drafts persist (WP-10, WP-20). After the web view's process is terminated, the app reloads and restores the draft and the current screen. |
  | External links | Support, privacy and external pages open in the system browser or `SFSafariViewController`. The bridge is available only to the bundled origin. No remote content loads in the app's web view. |

- **Completion criteria:** each row demonstrated on device; no web-only assumption remains in native builds (checked with a build-time flag audit).
- **Rollback:** per adapter.

### Phase 8: Subscriptions

These packages implement §9's design. They need DEC-01 to DEC-05 answered and WP-N1's go decision.

#### WP-S1. Entitlement service

- **Covers:** SUB2 (C8); RISK-33's entitlement half (restoring access is not restoring history).
- **Size:** M–L. **Uncertainty:** medium.
- **Design.**
  - **Native module (StoreKit 2):**
    - listens to `Transaction.updates` from launch;
    - evaluates `Transaction.currentEntitlements` and subscription status (renewal state, grace period, billing retry, revocation);
    - honours only **verified** transactions;
    - caches the last verified access state and expiry in native storage **separate from the journal**.
  - **Web side.** It receives a read-only `access` signal. It never writes access into `AppState`, backups, snapshots, the demo or reset paths.
  - **Feature gates** read `access` only through one `can(feature)` function, whose table implements DEC-01 and DEC-03.
  - **No server** is required for a local iOS app. App Store Server Notifications or a backend are added only if cross-platform access or support operations later require them, and never as an account wall.
- **Tests:** §9.5.
- **Completion criteria:**
  - every state in §9.3 maps to one effective access value and one behaviour;
  - imports, resets, the demo and clock repair change nothing about access.

#### WP-S2. Offer, trial and subscription experience

- **Covers:** SUB1; SUB3.
- **Size:** M. **Uncertainty:** medium (copy and review expectations).
- **Design.** §9.2 and §9.6.
  - **Offer.** One subscription group and one entitlement. Monthly and annual are durations of the same access (DEC-02). A 14-day free trial is offered as an App Store introductory offer, and eligibility is read from StoreKit.
  - **What the offer shows.** Localised prices and periods come from StoreKit. Restore Purchases and Manage Subscription appear where people look (You › Subscription, and the paywall).
  - **Sample of long-term value.** A clearly labelled sample of long-term Progress, reusing the isolated demo, lets a trial user see seasonal and long-term value without faking their own history.
  - **No manipulation:**
    - growth is never accelerated to sell the subscription;
    - no countdown pressure, guilt copy or pets "waiting" on payment;
    - no pre-selected upsell.
  - **Trial-end reminder.** An optional reminder two days before the trial ends, off unless the user turns it on.
- **Completion criteria:**
  - a store review checklist passes: trial length, renewal price, billing period and management are shown before consent;
  - "No purchasable coins or paid capsules" appears in the product page copy.

#### WP-S3. StoreKit state-matrix verification

- **Covers:** the acceptance of SUB2.
- **Size:** M. **Uncertainty:** medium (TestFlight renewal timing).
- **Design:** the §9.5 matrix, run in three environments: StoreKit testing in Xcode with automated tests, the sandbox, and TestFlight.
- **Completion criteria:** every row passes in every environment where it can run, with recorded evidence.

### Phase 9: Release validation

#### WP-R1. Store submission, privacy and territories

- **Covers:** IOS5 through REL-01 to REL-08; RISK-36 (the committed screenshots are older assets).
- **Size:** M. **Uncertainty:** medium (territory rules change).

| ID | Gate | Work and evidence |
|---|---|---|
| REL-01 | Toolchain | Build with Xcode 26 or later and the iOS 26 SDK (confirmed 29 Sep 2026). Choose the deployment target from WP-N1 device evidence. Keep a record of what each binary contains. |
| REL-02 | Privacy policy and terms | App-specific public URLs describing the actual binary: local-only data, StoreKit, and no analytics. The in-app route is About › Privacy and Terms. |
| REL-03 | Privacy labels | Capture network traffic from the release candidate. With only StoreKit and no analytics, "Data Not Collected" is likely, because on-device processing is not collected and Apple's purchase data is Apple's to disclose. **Verify against the capture; do not assume.** |
| REL-04 | Privacy manifests | The app's manifest plus each SDK's (Capacitor is on Apple's listed-SDK requirements). Declare the required-reason APIs actually used by native code. The manifest, the label and the policy are three different deliverables. |
| REL-05 | Adults only | Answer the age questionnaire accurately, then override to 18+ if the terms say adults only (the override is available and applies in every region). Not Kids Category. Assess region-specific age-assurance duties per selected territory. No ID collection by default. |
| REL-06 | Earned capsules | Answer the loot-box question for the actual behaviour: randomised items are **not** purchasable, and coins and stamps cannot be bought or cashed out. Odds are shown anyway (Odds sheet, corrected in WP-23). |
| REL-07 | Territories | EU trader status and contact information under the Digital Services Act. Per-territory requirements. China mainland (ICP) only if selected. Korea's GRAC rating if it differs. Resolved per DEC-04. |
| REL-08 | Review and support | A real support URL. Review notes explaining the trial, recovery and the sample garden. Accurate current screenshots, regenerated from the release build (RISK-36). Offline behaviour tested. A reproducible build. A documented migration rollback procedure. |

- **Completion criteria:** every REL row has evidence attached to the release checklist.

#### WP-R2. Worldwide readiness

- **Covers:** GLOBAL1; RISK-35 (IME composition); RISK-37 (examples for avoidance habits); RISK-39 (seasonal voice for tropical climates).
- **Size:** L if localised; S–M for an honest English-worldwide launch. **Depends on:** DEC-04.
- **Current files:** `src/catalog/formatCore.ts:17` (en-GB numbers), `src/domain/dates.ts:357`, `src/features/you/calendar.ts:47`, `src/styles/fonts.css` (Latin subsets), `src/domain/hemisphere.ts`, `src/domain/signature.ts:42`.
- **IME and composition handlers:**
  - Enter handlers with no composition guard: `src/features/you/ProfileSection.tsx:84–89`.
  - Escape handlers that act during composition: `src/ui/Sheet.tsx:163–173`, `src/features/capsules/RevealCard.tsx:141–147`, `src/features/onboarding/PickStep.tsx:131–136`.
- **Design, required even for an English-only launch:**
  - composition-safe key handling everywhere text is typed;
  - non-Latin font fallback;
  - grapheme-safe name and note lengths;
  - RTL-safe layout for names;
  - StoreKit-localised prices;
  - a neutral seasonal voice option for tropical climates;
  - clear creation examples distinguishing "a day I held off" from "count the thing I want to reduce".
- **Design, for localisation (DEC-04):**
  - locale-aware number, date, time and plural formatting, separate from the Gregorian storage keys;
  - whole-message translations that keep the established voice;
  - localised screen-reader strings;
  - a text-expansion and RTL layout pass.
- **Tests:**
  - Arabic and Hebrew names;
  - CJK input methods (composition then Enter or Escape);
  - long German and Finnish labels;
  - combining marks and emoji graphemes;
  - the WP-14 time matrix.

#### WP-R3. Accessibility certification

- **Covers:** ACCESS1; RISK-18 device measurement; RISK-36's evidence half.
- **Size:** M. **Uncertainty:** medium.
- **Design.**
  - **Device matrix:** §7.10.
  - **Apple's Accessibility Nutrition Labels** only for support verified on device: Larger Text at 200% or the platform maximum with usable tasks; VoiceOver with meaningful navigation and alternatives, not just ARIA; Voice Control; Switch Control; a hardware keyboard.
  - **Tasks tested end to end:**
    - check-in and undo, including the toast actions (WP-17);
    - the note and old-note edit (WP-20);
    - import confirmation and undo;
    - the capsule gesture alternative;
    - Quiet rewards;
    - subscription purchase, cancellation and restore;
    - recovery states.
- **Completion criteria:** every listed task is completed by a tester using each assistive technology, and the Nutrition Label answers match that evidence.

#### WP-R4. Licences, notices, security and provenance

- **Covers:**
  - SHIP1's notices and security;
  - RISK-40 (verify every credit and notice, including Nunito's upstream authors; the current line names only Vernon Adams);
  - the development-dependency advisory (handled in WP-24; verified here);
  - explaining backup privacy.
- **Size:** S–M.
- **Current files:** `src/features/you/copy.ts:93`; `src/assets/fonts/*.woff2`. `src/styles/fonts.css:1` mentions the OFL only in a comment. There is **no** LICENSE, OFL or NOTICE file in the repository, `public/` or the build output.
- **Design.**
  - **Licences.** Ship the OFL text for Castoro and Nunito and the MIT notices for bundled libraries (Preact, `@preact/signals`, `workbox-window` if bundled). Put them in an in-app "Licences" screen under About and in the native bundle.
  - **Audit.** Review the native dependency chain and its advisories.
  - **Content security.** A strict content security policy for the web view.
  - **No development origin.** Release builds never load a development origin.
  - **Backup privacy.** The copy explains that a backup or `CK1:` code is compressed text, not encryption, so notes are readable to anyone holding the file or clipboard.
- **Completion criteria:**
  - notices appear in both the web and native artefacts, and the About credits match the upstream authors;
  - the native dependency audit is clean or has documented exceptions.

---

## 7. Validation plan

The handoff's validation checklist maps to these subsections:

| Checklist item | Where |
|---|---|
| Storage quota and unavailability; transaction abort | §7.2 |
| Held and stolen locks; stale callbacks | §7.3 |
| Reset, demo, import and restore races | §7.4 |
| Future schemas | §7.6 |
| Invalid accepted state | §7.7 |
| Reward boundaries; timestamp compaction | §7.5 |
| Background, resume and unmount; gesture cancellation | §7.8 |
| Modal focus; old-note controls | §7.8 |
| Windows case-insensitive imports | §7.9 |
| Actual WebKit and normal-motion paths | §7.9 |
| Realistic large histories | §7.11 |
| Physical iPhone accessibility and lifecycle | §7.10 |
| StoreKit sandbox and TestFlight | §9.5 |

### 7.1 From reproductions to regressions

The audit's 33 scratch reproductions assert the defect. Here, each becomes an **invariant** test in the WP-0 ledger (`tests/unit/audit/`):

- **Before the fix,** the test is declared with `it.fails`, so CI is green while the defect exists.
- **When the fix lands,** Vitest reports "expected to fail but passed", and CI goes red until the fixing change turns it into an ordinary `it`.

Every fixing change therefore shows, in the same commit, that its test failed before the change and passes after it. Source-only findings follow the same path. If a hypothesis test unexpectedly passes on the current code, the finding is recorded as **unconfirmed** in §11, not dropped.

### 7.2 Storage fault-injection matrix (WP-1, WP-3, WP-4, WP-7)

The matrix covers these operations:

- ordinary save (debounced, after-frame, immediate);
- pagehide flush;
- pull;
- Special Order;
- import;
- undo import;
- snapshot restore;
- daily snapshot;
- reset;
- demo entry and exit.

For each operation, the failure is injected at each point:

| Injection | Expected outcome |
|---|---|
| Quota on the main write | Nothing is published unless the write is durable. Ordinary actions show `failing: quota` and retry. Durable commands return not ok. |
| Non-quota error on the main write | As above, with `failing: error`. |
| Probe fails, reads succeed | Loads the existing save; status `failing: quota`. |
| Reads throw | `volatile`, shown persistently; never `saved`. |
| IndexedDB request succeeds, transaction aborts | The snapshot is treated as absent. Replacement asks for no-undo consent or refuses. |
| IndexedDB open fails once | The next attempt reopens without a reload. |
| IndexedDB `versionchange` / `blocked` | Connection closed and reopened; "copies unavailable" is shown, never "none". |
| Undo-token write fails | The replacement returns `undo: null`; Undo is never offered. |
| Recovery after 1, 3 and 10 failures | The latest state is written exactly once, and the reload contains it. |

The matrix runs in Vitest with the WP-0 fixtures, and in Playwright (Chromium and WebKit) for the paths a real browser adapter changes: quota, the real IndexedDB adapter, and pagehide.

### 7.3 Ownership and stale-callback matrix (WP-2, WP-8)

**Lock states:**
- granted immediately;
- granted late (deferred);
- refused;
- stolen before the after-frame callback;
- stolen after the after-frame callback;
- stolen before the storage event is delivered;
- stolen after it is delivered;
- no Web Locks API.

**Storage events:**
- a newer revision in the same epoch;
- a different epoch;
- deletion;
- a newer schema;
- a corrupt save;
- a change to the onboarding sidecar;
- a change to the undo token.

**Invariants:**
- a retired or non-owning queue writes nothing (except the theme mirror);
- "Use here" never takes over a newer or corrupt save, and never resurrects a deleted one;
- a capsule or onboarding action that began under one epoch never writes into another.

These run with deterministic fixtures, then as two-context Playwright tests in Chromium and WebKit.

### 7.4 Replacement race matrix (WP-4)

**Operations:** import, undo, restore.

**Interrupting events, each tried at every await point (before or after parse, before or after the snapshot `put`, before the commit):**
- the sheet closes;
- Start over;
- demo entry;
- demo exit;
- ownership moves to another tab;
- the app day rolls over;
- a second import starts.

**Selection races (FS6):**
- A slow and B fast;
- A previewed, B pending, then Import;
- close and reopen before a read resolves;
- clipboard delivery after a file pick.

**Invariants:**
- no deferred completion crosses one of those boundaries;
- cancelling never consumes or creates an undo token;
- Undo, when offered, restores exactly the state before *this* replacement.

### 7.5 History metamorphic suite (WP-11 to WP-15)

**Property.** For seeded histories, the following must be equal before and after each of the transformations listed below:
- day statuses;
- period `expected`, `achieved` and `short`;
- kept-together days;
- arrival dates;
- letter text;
- plant stage and look;
- wallet and lifetime totals outside the refund window.

**Transformations:**
- `pruneOldStamps` and `compactLedger` (at the 120/121-day and 7/8-day boundaries);
- a `dayStartsAt` change;
- a time-zone change;
- a cosmetic habit edit (icon, plant, colour);
- unrelated habit creation or deletion;
- archive, Finish, restore, pause and day off after a rule cut;
- adding a 25th tap;
- rereading a frozen letter.

**Boundary tests:**
- deletion at ages 6, 7 and 8 days;
- growth thresholds through real transactions at 3 and 6 occurrences a week;
- the WP-14 time-zone matrix.

### 7.6 Future-schema and upgrade fixtures (WP-5)

**Setup.** An injected `MIGRATIONS` table and a `SCHEMA_VERSION + 1` fixture exercise, together:
- an old external backup;
- an old local main save;
- an old daily snapshot;
- an active undo token;
- a readable newer save;
- an unreadable newer save;
- partial newer rescue.

**Additive-default fixtures.** A fixture of each historically deployed save shape, reconstructed from git history, must load.

**Newer-save invariants:**
- a newer save is never exported as current;
- a newer save is never written by an old tab;
- rescue bytes round-trip.

### 7.7 Accepted state executes (WP-6)

**Mutation corpus.** Valid fixtures are mutated with wrong types, out-of-range numbers, invalid calendar dates, reserved keys (`__proto__`, `constructor`, `toString`), oversized strings, deep anchor chains, cycles and unknown catalogue IDs.

**Checks on every accepted mutant.** Run all selectors and view models, the letter and ritual renderers, CSV and ICS export, and a set of reducers (check-in, note, history edit, delete). Then check `JSON.parse(JSON.stringify(s))` equality of own keys and a decode round-trip.

**Import bounds.** An oversized file, and a payload that decompresses beyond the limit, must stop cleanly without allocating past the limit.

### 7.8 Lifecycle, gesture and focus (WP-8 to WP-10, WP-16, WP-17, WP-20)

**Unmount and epoch change** in the middle of:
- the auto-turn;
- the finishing turn;
- the drop;
- the reveal.

**Page hidden** for 59 s and for 61 s:
- with the count pad open on a backdated day;
- with an actionable toast showing;
- with a note draft open.

**Cancellation:**
- `touchcancel` and `pointercancel` on sheets, the Arrange list and steppers;
- unmounting mid mouse-drag.

**Mixed input:** keyboard after a cancelled pointer press.

**Focus:**
- keyboard-only journeys through the CountPad toast actions;
- Pet Card → pantry;
- the calendar's Open Today;
- old-note edit and removal;
- import confirmation.

### 7.9 Browsers, motion and platforms (WP-24a, WP-24)

Phone-named Chromium projects with reduced motion are **not** Safari or `WKWebView` evidence. The interaction specs are required to pass on:
- Chromium;
- WebKit;
- normal motion;
- a touch-phone profile.

This includes the full-motion capsule turn interrupted by a tab switch, and the sheet drag interrupted by a cancel. Reduced-motion users get a separate check of the static crank (WP-8).

**Platforms.** Windows (typecheck and unit tests) and macOS (typecheck and build) lanes run on case-insensitive file systems. The repository check fails on any two tracked paths, or extensionless import stems, that differ only by case. The e2e scripts must run from the Windows shell.

### 7.10 Physical-device matrix (WP-N1, WP-N3, WP-R3)

A green Linux or Chromium run is not native iOS or VoiceOver evidence. On at least a small current-support iPhone, a large iPhone and an iPad:

| Area | Checks |
|---|---|
| Layout | Portrait and landscape; safe areas; keyboard open; smallest supported width. |
| Text | Largest Dynamic Type (at least 200%) on every listed task. |
| Assistive technology | VoiceOver (rotor, actions, focus order, announcements); Voice Control; Switch Control; iPad with an external keyboard. |
| Motion | Reduce Motion toggled before launch and during an active flow. |
| Audio and haptics | Silent switch; an audio interruption (call, Siri) during sound; the haptic adapter. |
| Lifecycle | Background mid-turn; process kill after capsule commit; kill during a save; kill with a note draft and with a backdated count pad; relaunch in airplane mode. |
| Gestures | System gesture cancels during a sheet drag and an Arrange drag; rotation mid-gesture. |
| Content | Long names; emoji; combining marks; Arabic, Hebrew and CJK input; mature note-heavy saves with return-to-scroll. |
| Transfer | Files share and import, cancelled share, large backup, restore preview, erase all. |
| Entitlement | The §9.5 rows that need a device. |

**Evidence:** screen recordings and checklists attached to the release record.

### 7.11 Scale (WP-25)

Measure on the reference device (fixed in WP-N1) and in Chromium and WebKit, using the 5- and 10-year note-heavy fixtures:
- check-in latency, split into tap-to-paint and durable save;
- quota headroom;
- import time and peak memory;
- snapshot put and list;
- Progress and Detail cold open;
- a long Shelf session;
- Moments scrolling and return-to-scroll.

### 7.12 What green does not prove

The following do not by themselves demonstrate disk-failure behaviour, browser task ordering, `WKWebView` persistence, background termination, VoiceOver usability or StoreKit behaviour:
- the existing 2,511 unit tests;
- the 234 end-to-end tests;
- axe in Chromium;
- the 150 KB first-paint budget.

Each gap above has a named check. None is waived by a passing unrelated suite.

---

## 8. Product roadmap

The mandatory repairs are in §6. The items below are **recommended enhancements**. They are ordered by concrete user value and by dependency, and none is counted as a bug.

| Priority | ID | Enhancement | User value and success test | Depends on | Decision needed |
|---|---|---|---|---|---|
| 1 | OPP-07 | **Verified backup and recovery.** A restore preview that shows actual differences: date range, and which habits, notes and history would disappear. It also shows where the undo copy lives. Other parts: an honest backup receipt (the generated backup is parsed before it is offered); one quiet first-backup invitation once meaningful history exists; a restore rehearsal using the sample garden; "Erase everything on this device". | Makes "your plants are yours" credible before anyone pays. Success: a user can predict what a restore will change, and can prove a backup restores, without reading documentation. | WP-4, WP-5, WP-7 | DEC-13 (erase semantics; default provided) |
| 2 | OPP-01 | **A personal archive.** Search your own notes; filter by habit, month or year, and starred; open the exact dated entry; export notes and journal as readable text, with dates, stable habit identity and the rule then in force. On-device only, with no generated interpretation. | Success: find a remembered line from two years ago in a few actions; correct or delete it; export it privately. | WP-20 | none |
| 3 | OPP-02 | **Transparent history.** "Why did this count?" for a day or period: the rule in force, backfill, tiny, pause, rest and edits. Plus before/after previews for schedule edits ("This week's waterings still count; the next week starts Monday"). No internal ledgers in the default UI. | Success: users predict what an edit does to existing days; support questions become answerable. | WP-12, WP-13 | none |
| 4 | OPP-03 | **Quiet mode as a first-class choice.** Beyond the WP-19 repair, a chosen degree of collecting (for example: off, quiet, full), offered in You and once gently after onboarding. | Success: the five-minute daily journey is equally satisfying with no capsule opened. | WP-19 | DEC-15 (default provided) |
| 5 | OPP-05 | **Reminders and shortcuts that finish a task.** Dependable local reminders first. Next, a read-only widget. Last, an App Intent or widget action that checks one eligible habit, carrying occurrence date, a unique command ID and save epoch so repeated delivery cannot double a reward. | Success: a reminder never fires for a paused or completed habit; a widget check-in is idempotent. | WP-N3, WP-18, C2 | DEC-01 (reminders after expiry) |
| 6 | OPP-04 | **Return after absence.** On reopening after weeks away: review a few active commitments, pause or finish choices, and a realistic next action. It reuses Season Review and tiny, with no backlog of retrospective checkmarks and no failure framing. | Success: returning users resume within a minute without guilt copy. | WP-12 | none |
| 7 | OPP-06 | **Companion continuity.** The mandatory parts are WP-18, WP-21 and WP-22. The enhancements are gentle surfacing of what changed for a companion, backed by dated shared history. | Success: a returning user can say what changed about a specific companion without being pointed at a level label. | WP-13, WP-22 | DEC-08 |
| 8 | OPP-09 | **Honest personalisation.** "Still learning your rhythm" on the plant tag, a user-confirmed usual time, and equal welcome for night-shift, quick-routine and retrospective logging. Distinguish "when you checked in" from "when you did it". | Success: no plant stays "waiting" indefinitely without explanation. | WP-13, DEC-10, DEC-17 | DEC-17 |
| 9 | OPP-08 | **Sparse and finite habits as first-class.** A schedule-appropriate sample for monthly and quarterly looks, a clear next relevant period, and "bring back next season" for completed finite habits, keeping their notes and checklists. | Success: two years of faithful monthly use earns a personal look. | WP-13 | DEC-17 |
| 10 | OPP-10 | **Plan inside flexible periods** (creative O1). An optional "Plan for…" intention that is never a requirement, penalty or reward source. | Success: users arrange their week and understand why quota and growth did not change. | WP-15 | none |
| 11 | OPP-13 | **Optional password-protected backups**, for users who keep backups in cloud notes. | Success: an encrypted backup round-trips; a wrong password is clearly reported. | WP-5, WP-6 | none |
| 12 | OPP-18 | **Usability research on place-saving.** Do users understand saving toward a 2,500-coin place at about one capsule a day? This is research, not an economy change. | Informs whether sinks and prices need attention before content grows. | none | none |
| Validate demand first | OPP-11 | "After the last time" recurrence for maintenance habits (creative O2). New versioned schedule semantics; the highest cost. | | WP-12, WP-13 | Demand evidence |
| Validate demand first | OPP-12 | Quantity per period (creative O4; already named in archived v2 scope). | | Stable rule model | Demand evidence |
| Validate demand first | OPP-15 | A maximum-per-day reduction goal for avoidance habits. A new comparator, not a polarity switch. (The creation-example copy is in WP-R2 now.) | | WP-R2 | Demand evidence |
| Later, after device protection | OPP-14 | An optional biometric privacy cover. | | WP-N1, WP-N3 | none |
| Part of WP-R2 | OPP-16 | A neutral seasonal voice for tropical climates. | | WP-R2 | DEC-04 |
| Not planned | OPP-17 | Cloud sync or encrypted cloud backup. Reconsider only if users ask for multi-device journals after launch. It would need save generations and idempotent commands (C2, C4) plus conflict semantics for edits, deletions, undo, companions and ledgers. Whole-state last-write-wins is ruled out. | | C2, C4 | DEC-14 |

**Explicitly excluded:**
- competitive leaderboards;
- streak insurance purchases;
- generic AI encouragement;
- escalating daily demands;
- paid mystery rewards;
- content added to create renewal anxiety;
- a mascot or talking pets.

---

## 9. Subscription and entitlement design

### 9.1 Principles

- One auto-renewable subscription gives access to catkin, with a 14-day free trial as an App Store introductory offer.
- **Nothing inside the app is for sale:**
  - no coins, stamps or swaps;
  - no capsules or odds boosts;
  - no faster growth;
  - no streak protection;
  - no subscriber-only random advantage.
- Earned rewards stay earned. Public copy: "No purchasable coins or paid capsules."
- Trial eligibility comes from StoreKit. It is per subscription group and one introductory offer per customer (confirmed 29 Sep 2026), so returning or upgrading customers may not be eligible, and the app must not promise a trial it has not confirmed.
- **Access is not content.** Access lives in the native entitlement cache, never in `AppState`, backups, snapshots, the demo or reset. Content changes never alter access; access changes never delete or rewrite content.
- **No account is required.** Restoring access on a new device does not restore the journal; the app says so plainly and offers backup import.

### 9.2 Proposed offer structure (DEC-02)

| Element | Proposal |
|---|---|
| Subscription group | One group, one level ("catkin"). |
| Durations | Monthly and annual, as durations of the same access. The annual total is shown as prominently as any monthly equivalent. |
| Introductory offer | A 14-day free trial on both durations; eligibility is shared by the group. |
| Billing grace period | Enabled in App Store Connect (duration chosen by the owner from Apple's options), so a card problem never locks a user out of their own history. |
| Family Sharing | Owner decision. Recommended **on**: generous, and consistent with the product's non-extractive stance. |
| Offer codes and win-back offers | Not at launch. |
| Price | Owner decision, after the product commitment is defined. Never inferred in code: always the StoreKit-localised `displayPrice`. |

### 9.3 Access state matrix

| State or event (StoreKit signal) | Effective access | What the app does | Journal effect |
|---|---|---|---|
| First launch, StoreKit not yet answered, or offline with no cache | `unknown` | Per DEC-03: onboarding and reading are always allowed. A quiet "Checking your subscription…" appears; existing history is never blocked. | None |
| Products unavailable | unchanged | "Subscriptions can't be reached right now", with Retry and Restore. Never shows a zero price or a broken trial. | None |
| Eligible for the introductory offer | n/a | The offer shows "14 days free, then {displayPrice} per {period}", from StoreKit. | None |
| Ineligible (returning user) | n/a | The offer shows no trial wording; the price and period only. | None |
| Purchase cancelled by the user | unchanged | Nothing changes; no nag. | None |
| Purchase pending (Ask to Buy, strong customer authentication) | unchanged | "Waiting for approval." Pending is distinct from failed. | None |
| Unverified transaction | not granted | Not honoured. Offers Restore. Local diagnostic line only; nothing is sent anywhere. | None |
| Trial active, or subscription active | `full` | Full access, and no conversion pressure in the experience. | None |
| Auto-renew turned off | `full` until expiry | You › Subscription says "Ends {date}", once, calmly. | None |
| Billing retry within the grace period | `full` | A calm "There's a problem with your payment", linking to Manage Subscription. | None |
| Billing retry after grace (or no grace) | `expired` (DEC-01 mode) | Explains, with a link to Manage and Restore. | None |
| Expired | `expired` (DEC-01 mode) | DEC-01's post-expiry mode. Resubscribing resumes exactly where the user left off. | None; nothing wilts or disappears |
| Refunded or revoked | `expired` immediately | As expired, with no punitive copy. | None |
| Upgrade, downgrade or crossgrade (monthly ↔ annual) | continuous | StoreKit handles timing; access is uninterrupted. | None |
| Offline with a verified cache | cached until its `expirationDate` | StoreKit's on-device entitlements are used when available; otherwise the verified cache. Access is never revoked because the device is offline. | None |
| New device or reinstall | restored from StoreKit | "Restore purchases" (`AppStore.sync()`) is available. It explains: "Your subscription is back. Your garden lives on the device you used before. Import a backup to bring it here." | None |
| Store account changed | re-evaluated | Access follows the new account. | None |
| Import, reset, demo, clock repair | unchanged | These are content operations only and never touch access or eligibility. | As the operation |
| Access expires while the user is editing | applied after the edit | The in-progress note, check-in or import is completed or saved as a draft first. The mode changes at the next navigation. | None |

### 9.4 Post-expiry access: a **product decision** (DEC-01)

The audit recommends, and this plan supports, **permanently preserving these controls:** reading one's history, exporting it, backing it up, restoring it to another device, and deleting it. Options:

| Option | After expiry | Assessment |
|---|---|---|
| **A. Archive mode (recommended)** | Everything stays visible exactly as it stood: Today, Progress, notes, plants, pets and keepsakes. Export (JSON, CSV, notes), backup, restore-by-import on another device, and erase-everything remain available **without time limit**. New check-ins, new habits and edits need the subscription. Resubscribing resumes exactly. | Honest, simple to explain, and it keeps personal history hostage-free. Its downside is that a lapsed user cannot keep tracking without paying. That is the plain consequence of the owner's "subscription with a trial" model, stated clearly. |
| B. Free tracker, paid creative layer | Basic tracking stays free forever; the subscription covers the garden, companions, rituals and advanced history tools. | Keeps lapsed users tracking, but splits the product. Quiet mode would effectively become the free tier. Gating the creative layer risks feeling like hostage-taking of pets. It needs a much larger gating matrix. |
| C. Everything continues | No gating after the trial. | Not a subscription business; listed for completeness. |

Whichever option is chosen:
- reminders stop after expiry (with a note), or continue only if the option permits tracking;
- no pet or plant is hidden, removed or shown as suffering;
- "Manage subscription" and "Restore purchases" are always reachable.

### 9.5 StoreKit verification matrix (WP-S3)

Environments:
- **X:** StoreKit testing in Xcode (automated, with accelerated renewals and transaction manipulation);
- **S:** the App Store sandbox;
- **T:** TestFlight.

Apple's current testing guidance could not be retrieved in this environment; WP-S3 rechecks it and adjusts which rows each environment supports.

| Scenario | X | S | T |
|---|---|---|---|
| First purchase with trial; trial converts to paid | ✓ | ✓ | ✓ |
| Ineligible returning user sees no trial | ✓ | ✓ | |
| Purchase cancelled | ✓ | ✓ | ✓ |
| Ask to Buy approve and decline (pending) | ✓ | ✓ | |
| Interrupted purchase (strong customer authentication) | ✓ | ✓ | |
| Renewal | ✓ | ✓ | ✓ |
| Auto-renew off → expiry | ✓ | ✓ | ✓ |
| Billing retry → recovery | ✓ | ✓ | |
| Grace period → recovery, and grace → expiry | ✓ | ✓ | |
| Refund → revocation | ✓ | ✓ | |
| Family Sharing member access and removal (if enabled) | ✓ | ✓ | |
| Upgrade, downgrade, crossgrade | ✓ | ✓ | ✓ |
| Restore on reinstall; second device | | ✓ | ✓ |
| Store account change | | ✓ | |
| Offline launch with a valid cache and with an expired cache | ✓ | ✓ | ✓ |
| Duplicate transaction delivery (`Transaction.updates` replays) is idempotent | ✓ | ✓ | |
| Unverified transaction not honoured | ✓ | | |
| Price increase consent | ✓ | ✓ | |
| Localised price in several storefronts | ✓ | ✓ | ✓ |
| Expiry while editing | ✓ | ✓ | |
| Import, reset, demo and clock repair during active and expired states → access unchanged | ✓ | ✓ | ✓ |
| Journal untouched by every row | ✓ | ✓ | ✓ |

### 9.6 Presentation rules (SUB3)

**Must:**
- show the trial length, the renewal amount, the billing frequency and how to manage or cancel before consent;
- show the annual total as prominently as any per-month figure;
- offer Restore and Manage where users look;
- make the trial long enough to judge the product. A 14-day trial may not contain a monthly completion, a Season Review, or the ten eligible days for a signature, so the labelled sample garden shows long-term value truthfully.

**Must not:**
- countdown timers;
- guilt or pet-distress copy;
- pre-selected upsells;
- hiding the close button;
- accelerating growth during the trial;
- describing the app as "no in-app purchases";
- implying clinical or medical treatment.

---

## 10. Decisions needed

Only DEC-01 to DEC-05 genuinely block work, and only the subscription and release phases. The rest have a recommended default that the relevant package follows unless the owner objects.

### 10.1 Owner decisions (block Phase 8 and Phase 9)

| ID | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| DEC-01 | **What remains after the trial or subscription ends** | A archive mode; B free tracker with a paid creative layer; C no gating (§9.4) | **A**, with permanent read, export, backup, restore and delete | WP-S1, WP-S2, WP-N3 reminders |
| DEC-02 | **Offer structure** | Monthly and/or annual; price; grace period on or off and its length; Family Sharing on or off | One group; monthly and annual; grace on; Family Sharing on; price set by the owner | WP-S2 |
| DEC-03 | **What a person can do before starting the trial** | (a) Onboarding and the first day free, then an explicit trial start; (b) paywall right after onboarding; (c) paywall before onboarding | **(a) or (b)**. The trial starts only on explicit consent. Never paywall before the user has seen what catkin is. History is never locked. | WP-S1, WP-S2 |
| DEC-04 | **Launch territories, devices and language** | English-worldwide; English plus selected localisations; iPhone only or iPhone and iPad | Honest English-worldwide first, with the WP-R2 "required" items; iPhone and iPad; exclude China mainland until ICP is assessed | WP-R1, WP-R2 |
| DEC-05 | **The free web/PWA after native launch** | Keep it free; keep it with a matching subscription elsewhere; freeze it to "export and move to the app"; retire it | Decide before pricing. A free, feature-equal web app undercuts the subscription, and a web subscription is a separate commerce and platform-rules question. The upgrade protocol in C5 also depends on whether web builds keep shipping. | WP-S2, C5 timing |

### 10.2 Decisions with defaults (work proceeds on the default unless the owner objects)

| ID | Decision | Default used in this plan | Package |
|---|---|---|---|
| DEC-06 | What removing a note means for frozen Sunday Note quotes and retained copies | Redact the quote in frozen letters; disclose that daily copies and external backups keep it until they age out or are deleted | WP-20 |
| DEC-07 | The month jar: attempts or showed-up | Showed-up (tiny counts, partial does not), matching the Herbarium's `checkinCounts` | WP-15 |
| DEC-08 | Friendship levels: implement the behaviour, or reword the promises | Implement a small deterministic behaviour profile; reword any line not delivered | WP-22 |
| DEC-09 | Does "start tracking earlier" regroup existing multi-week periods? | No: keep the established period anchor (`periodAnchor`) | WP-13 |
| DEC-10 | Personalisation datum: completion time or last activity; store local minute-of-day at check-in | Completion instant (`doneAt`), plus the local minute recorded at entry, so travel does not reinterpret history | WP-13, WP-14 |
| DEC-11 | Finish on the creation day | An empty lifetime (`retiredEmpty`); never a fictitious completion | WP-12 |
| DEC-12 | Starter plants whose looks barely show (CR-06) | Now: state the limit truthfully in the look UI and remove the "shows on the tag" claim. Later: author species-appropriate equivalents (form, leaf grouping, paired accent) in the art backlog. | WP-21 |
| DEC-13 | Start over versus erase | Keep the reversible Start over (it keeps daily copies, as disclosed); add a separate "Erase everything on this device" | OPP-07, WP-N2 |
| DEC-14 | Accounts and cloud sync | None at launch; revisit only on post-launch demand | OPP-17 |
| DEC-15 | Quiet rewards scope | As WP-19: Capsules and currency hidden; Shelf, pets, plants and history stay; reversible | WP-19 |
| DEC-16 | Native architecture | Decided by WP-N1 evidence, not in advance | WP-N1 |
| DEC-17 | Sparse, quick and night-time routines in personalisation (R1, R2; RISK-38) | Keep the conservative inference, and add an honest fallback and a user-confirmed usual time (OPP-09, OPP-08) | OPP-08, OPP-09 |

---

## 11. Coverage matrix

"Status" is at HEAD `6aad1d3`, which has source identical to the audit pin `c66f588`. Line references are current, and they differ from the audit where the audit cited an older snapshot. "Evidence" keeps the audit's label.

### 11.1 Original registered findings (37)

| ID | Pri | Evidence | Status now | Current evidence | Disposition |
|---|---|---|---|---|---|
| data-d1 | P1 | Reproduced | Present | `persist.ts:77–88` probe → `null`; `store.ts:201` silent memory fallback reports `saved` | WP-1 (+ WP-7 display) |
| data-d2 | P1 | Reproduced | Present | `persist.ts:308–311` clears `pending` before `write()`; never restored | WP-1 |
| data-d3 | P1 | Reproduced | Present | `store.ts:350–360` publishes then ignores write; `:920–964` unconditional success | WP-4 (+ WP-7) |
| data-d4 | P1 | Source + API | Present | `snapshots.ts:101–105, 122–135` resolve at request success | WP-3 |
| data-d5 | P1 | Reproduced · upgrade | Present | `store.ts:419–425` adopts only `ok`; `:490–497` `useHere` keeps memory, rev 0 | WP-2 (+ WP-5 newer decision) |
| data-d6 | P1 | Reproduced | Present | `migrate.ts:29–42, 59` blanket `fillDefaults` | WP-5 |
| integration-i2 | P1 | CI | **Fixed** | Audit CI run 36632566504: 138.9 KB against the 150 KB budget; no source change since | HIST-01; existing size gate is the guard |
| data-d7 | P2 | Reproduced | Present | `validate.ts:150–176` no `stems`/`quote` checks; `views/pets.ts` memory shelf maps `stems` | WP-6 |
| data-d8 | P2 | Source | Present | `store.ts:961` ignores failed protective snapshot; no undo token | WP-4 |
| data-d11 | P2 | Reproduced + source | Present | `store.ts:930` token only when a snapshot exists, never cleared; `ImportSheet.tsx:49–65` unconditional Undo | WP-4 (+ WP-7) |
| data-d10 | P2 | Source | Present | `App.tsx:46–82` shows storage-full only; `DataSection.tsx:64–82` treats non-full as saved; `loadIssue` only in Diagnostics | WP-7 |
| domain-d1 | P2 | Reproduced | Present, refined (NEW-01) | `economy.ts:164, 344, 367–373`; `company.ts:230, 303`; `growth.ts:58, 69`; three `round6` copies | WP-11 |
| domain-d2 | P2 | Reproduced | Present | `logging.ts:403–416` prunes; `stacking.ts:79–112` treats missing stamps as kept | WP-13 |
| domain-d3 | P2 | Reproduced | Present, refined | `rituals.ts:80–88, 131–141`; fixable from `LedgerEntry.co` (`types.ts:403`) without a new field | WP-13 |
| domain-d4 | P2 | Reproduced | Present, refined | `rituals.ts:42–43, 220–221`; `views/pets.ts:201`; `friendship.ts:143`; `gacha.ts:398–400`; also `letters.ts:89, 105` | WP-13 |
| data-d9 | P2 | Reproduced | Present, refined | `selectors.ts:39–44` UTC-hour floor; `dayEnv` uses `.peek()` | WP-14 |
| integration-i3 | P2 | Reproduced + source | Present | `usePull.ts:52, 57`; `CapsulesScreen.tsx:20, 25–27`; `gacha.ts:295` | WP-8 |
| integration-i4 | P2 | Source | Present, refined | `SheetHosts.tsx:7–13`; also `ProgressScreen.tsx:48–56` ritual loader | WP-10 |
| creative-cr-01 | P2 | Source | Present, refined | `petCopy.ts:44–49` (favourite then servings); `PetCard.tsx:327–331`; `PetCardHost.tsx:57–58`; `BasketSheet.tsx:60–91` | WP-18 |
| creative-cr-02 | P2 | Reproduced + source | Present | `PlantArt.tsx:174–179`; `WindowsillBand.tsx:148–162`; `SillSegment.tsx:120–121`; `PotSlot.tsx:71–72` | WP-15 |
| creative-cr-03 | P2 | Source | Present, refined (NEW-03) | `shelf/model.ts:26–76`; `today.ts:99–130, 385–405`; `Band.tsx:65–80`; `progress/looks.ts:8–15` | WP-21 |
| creative-cr-04 | P2 | Source · integration | Present | `linesCore.ts:123–163` promises; `director.ts:17–26`, `plan.ts`, `vignettes.ts:117–151` lack inputs; `ShelfScene.tsx:125` drops `favouriteSpot` | WP-22 + DEC-08 |
| integration-i5 | P2 | Reproduced | **Partly fixed** | Wallet hidden (`Sidebar.tsx:59`). Remaining: Capsules in `Sidebar.tsx:29–31`, `TabBar.tsx:28`, shortcut 3; Shelf coins; Bake prices; calendar "no coins" toast | WP-19 |
| integration-i6 | P2 | Source | Present, refined (NEW-07) | `RevealCard.tsx:149–153`; `ScreenHost.tsx:83` passes no props | WP-18 |
| domain-d5 | P2 | Reproduced | Present | `domain/places.ts:44–47` `includes(species)`; `shelf.ts:65–85` | WP-23 |
| domain-d6 | P2 | Source · narrow | Present | `seasonReview.ts:331–352` clamps to `startedOn`; `activity.ts:46–49` | WP-12 + DEC-11 |
| domain-w2-d1 | P2 | Reproduced | Present (plus the converse) | `views/calendar.ts:91, 97, 127`; `Calendar.tsx:276–278, 287–288` | WP-15 |
| domain-w2-d2 | P2 | Source | Present | `Calendar.tsx:248–254` bare link; `HabitDetailHost.tsx:15–34` | WP-18 |
| domain-w2-d3 | P2 | Reproduced | Present | `rituals/lookup.ts:7–10`; `words.ts:57, 61, 107, 198` | WP-13 |
| domain-w2-d4 | P2 | Source | Present | `ProgressScreen.tsx:145–222` whole-screen gate | WP-15 |
| creative-cr-d1 | P2 | Source | Present | `Onboarding.tsx:160–192`; `flow.ts:72–86`; `store.ts:829–835` returns `[]` on refusal | WP-9 |
| creative-cr-d2 | P2 | Source | Present | `CapsuleSteps.tsx:53, 101–122`; `progress.ts:17–24` | WP-9 + WP-8 |
| integration-i1 | P2 | Reproduced · platform | Present, refined (three stem pairs) | `ui/CheckRing.tsx`+`checkRing.ts`; `capsules/Leaflet.tsx`+`leaflet.ts`; `Leaflet.test.tsx`+`leaflet.test.ts`; `e2e:preview` POSIX | WP-24a (+ WP-24 lanes) |
| integration-i7 | P2 | Source | **Fixed** | `App.module.css:31–36` subtracts the sidebar once; residual scrollbar offset → RISK-22 | HIST-02; RISK-22 in WP-24 |
| domain-d7 | P3 | Reproduced | Present | `views/today.ts:231–243` `count > 0`; also `Hero.tsx:89–94` | WP-15 + DEC-07 |
| creative-cr-05 | P3 | Source · latent | Present (latent; no consumer) | `lines.ts:131–141` vs `flourishes.tsx:16` | WP-23 |
| creative-cr-d3 | P3 | Source | Present | `Onboarding.tsx:74–89` swallowed rejection; `:234` lead only | WP-9 |

Tally: 34 present (9 of them refined by this reconciliation), 1 partly fixed, 2 fixed, 0 disputed. This matches the audit.

### 11.2 Retained unregistered original finding

| ID | Pri | Evidence | Status now | Current evidence | Disposition |
|---|---|---|---|---|---|
| data-d12 | P2 | Source | Present | `DataSection.tsx:93–96` rejection → `[]` → "first daily copy is made tonight"; `:101–110` restore without `finally`; `:246–249` undo without catch; `ImportSheet.tsx:58–64` `.then` only | WP-4 (store) + WP-7 (display) |

### 11.3 Deeper second-pass findings and credit correction (23)

| ID | Pri | Evidence | Relationship | Status now | Current evidence | Disposition |
|---|---|---|---|---|---|---|
| FS1 | P1 | R201 | New regression | Present | `persist.ts:269–281` captured callback; `:338–341` dispose keeps `pending`; `store.ts:411–414`; `:129–139` 100 ms fallback | WP-2 |
| FS2 | P1 · upgrade | R202 | New upgrade gate | Present | `persist.ts:137` restamps version; `handoff.ts:31–33`; `store.ts:842–851` | WP-5 |
| FS3 | P1/P2 | R203 | Extends D5 | Present | `store.ts:478–483` ignores deletion; `:490–497`; `:971–992` | WP-2 |
| FS4 | P2 | R210 | New timing defect | Present | `persist.ts:257–260`, `:302–308`; `store.ts:384–416, 468–475, 486` | WP-1 (+ WP-2 RISK-01, WP-8) |
| FS5 | P2 | R211; variants source | Deepens lifecycle risk | Present (demo and ownership variants unconfirmed at runtime) | `store.ts:920–964`; `ImportSheet.tsx:149–166` | WP-4 |
| FS6 | P2 | Source | Deepens delayed-read risk | Present (runtime unconfirmed; ledger hypothesis) | `ImportSheet.tsx:93–147` | WP-4 |
| FS7 | P2 | R205 | New validation defect | Present | `validate.ts:83`; `tx.ts:92–103` | WP-6 |
| FS8 | P2 | R204; others source | Extends D7 | Present | `validate.ts:295`, `:150–176`; `handoff.ts:177`; `persist.ts:147` | WP-6 (state) + WP-5 (envelope metadata) |
| FS9 | P2 | R212 | New recovery defect | Present | `store.ts:202`; `snapshots.ts:109–111` | WP-4 (+ WP-3 `durable`, WP-7 wording) |
| FS10 | P2 | R214 | Extends D2/D3 | Present | `store.ts:700–703` generic `act`; `SpecialOrder.tsx:170–195` | WP-8 (+ WP-1) |
| UI2-01 | P2 | R209; cross-save source | New lifecycle defect | Present | `usePull.ts:180–199, 201–220, 254–268, 324–330`; `TabBar.tsx:15–22`; `Sidebar.tsx:40`; `shortcuts.ts:47–51` | WP-8 |
| UI2-02 | P2 | Source | New cache defect | Present (runtime unconfirmed) | `usePull.ts:26, 35–42, 251, 296–298`; `store.ts:696–698` | WP-8 |
| UI2-03 | P2 | Source | New date-identity defect | Present (runtime unconfirmed) | `TodayScreen.tsx:69–91, 122–124, 209, 296`; `state.ts:16` | WP-10 |
| UI2-04 | P2 | Source focus contract | New accessibility defect | Present (VoiceOver unconfirmed) | `Sheet.tsx:334`; `Toaster.tsx:49–57, 78–83`; `toast.ts:95–97` | WP-17 |
| UI2-05 | P2 | Source handler mapping | New cancellation defect | Present | `Sheet.tsx:251–268, 310, 316`; `HabitsSection.tsx:130–148, 193–194`; `NoteSheet.tsx:40–44` | WP-16 |
| UI2-06 | P3 | R208 | Narrow interaction defect | Present, refined (also min/max path) | `Stepper.tsx:28, 45–76` | WP-16 |
| UI2-07 | P2 | Source | New sidecar ownership defect | Present (runtime unconfirmed) | `onboarding/progress.ts:48–63`; `store.ts:478–483` | WP-2 (ownership) + WP-9 (UI) |
| UI2-08 | P2 | Call-site inventory | New control gap | Present | `NoteSheet.tsx:35` sole `setNote` UI; `Parts.tsx:171–211`; `Calendar.tsx:202–234` | WP-20 + DEC-06 |
| HM1 | P2 | R206 | New history defect | Present | `periods.ts:145–169`; `seasonReview.ts:331–352` | WP-12 |
| HM2 | P2 | R213 | New boundary defect | Present | `habits.ts:298–353`; `economy.ts:107, 884–905`; `activity.ts:118, 130–132` | WP-12 |
| HM3 | P2 | R207 | New high-count defect | Present | `logging.ts:84–87`; `stacking.ts:79–112` | WP-13 |
| HM4 | P3 | Source + exact probability | Promise mismatch | Present, refined (NEW-04) | `DESIGN.md:266–272`; `gacha.ts:147–192`; `machines.ts:160` | WP-23 |
| SHIP1 | P3 | Source + upstream | Credit correction | Present, refined (no licence files shipped) | `you/copy.ts:93`; no LICENSE/OFL/NOTICE in repository or build | WP-24a (credit) + WP-R4 (notices) |

"Runtime unconfirmed" means source-established, and not reproduced by the audit or by this plan. Each has a WP-0 ledger test that must be seen failing on the current code before its fix is accepted (§7.1).

### 11.4 Native, subscription, worldwide, accessibility and ship requirements

| ID | Sub-item | Status | Disposition |
|---|---|---|---|
| IOS1 | Packaged app proof on a real iPhone | Release requirement | WP-N1 |
| IOS2 | Asynchronous durable-commit storage | Release requirement; web groundwork in Phase 1 | Phase 1 (C1, C2, C4) → WP-N2 |
| IOS3 | Web versus native identity; transfer preview; verify before removing the original; no URL payload | Release requirement | WP-N2 (migration receipt), WP-4, WP-7, OPP-07 |
| IOS3 | Subscription restore is not history sync; sync later | Release requirement / decision | §9.3 copy; DEC-14; OPP-17 |
| IOS4 | Backup and import bridge | Release requirement | WP-N3 row 1 |
| IOS4 | Reminders via local notifications | Release requirement | WP-N3 row 2; OPP-05 |
| IOS4 | Haptics adapter | Release requirement | WP-N3 row 3; RISK-34 |
| IOS4 | App updates and About | Release requirement | WP-N3 row 4 |
| IOS4 | Background and resume | Release requirement | WP-N3 row 5; WP-10; WP-20 |
| IOS4 | External links and bridge exposure | Release requirement | WP-N3 row 6; WP-R4 |
| IOS5 | Toolchain | Release requirement | REL-01 |
| IOS5 | Privacy policy and terms | Release requirement | REL-02 |
| IOS5 | Privacy labels | Release requirement | REL-03 |
| IOS5 | Privacy manifests | Release requirement | REL-04 |
| IOS5 | Adults-only audience | Release requirement | REL-05 |
| IOS5 | Earned capsules questionnaire | Release requirement | REL-06 |
| IOS5 | Global availability (EU trader, per-region, China ICP) | Release requirement | REL-07; DEC-04 |
| IOS5 | Review and support | Release requirement | REL-08 |
| IOS5 | No account; no invented moderation; not clinical | Constraint | §2; §9.6; DEC-14 |
| SUB1 | StoreKit auto-renewable baseline; "No purchasable coins or paid capsules"; two-week trial from StoreKit eligibility | Release requirement | WP-S2; §9.1 |
| SUB2 | Entitlements separate from content; state table; test matrix | Release requirement | WP-S1, WP-S3; §9.3, §9.5; C8 |
| SUB3 | Honest trial presentation; value within 14 days; post-expiry policy | Release requirement + decision | WP-S2; §9.4, §9.6; DEC-01 |
| GLOBAL1 | Locale-aware formatting; translation strategy | Release requirement + decision | WP-R2; DEC-04 |
| GLOBAL1 | Fonts, RTL, CJK, long labels, graphemes | Release requirement | WP-R2 |
| GLOBAL1 | IME composition guard (`ProfileSection.tsx:84`) and Escape during composition | Present (defect) | WP-R2; RISK-35 |
| GLOBAL1 | Time policy: travel, fractional zones, date line, 03:30 boundary | Present (data-d9) + design | WP-14; WP-13 |
| GLOBAL1 | Tropical seasonal voice | Opportunity | RISK-39; OPP-16; WP-R2 |
| GLOBAL1 | Night and quick-routine exclusions are deliberate | Decision | DEC-17; OPP-09 |
| ACCESS1 | WebKit and normal-motion coverage | Gap | WP-24 |
| ACCESS1 | Real-device VoiceOver, Voice Control, Switch Control, keyboard, Larger Text, landscape, small screen, keyboard open | Release requirement | WP-R3; §7.10 |
| ACCESS1 | Nutrition labels only for verified support | Release requirement | WP-R3 |
| SHIP1 | CI green supersedes the size failure | Fixed | HIST-01 |
| SHIP1 | Windows and macOS case collisions | Present | WP-24a, WP-24 |
| SHIP1 | Castoro credit | Present | WP-24a |
| SHIP1 | Licences and notices in distributed artefacts | Present (none shipped) | WP-R4; RISK-40 |
| SHIP1 | Vitest development advisory | Present (development-only) | WP-24 |
| SHIP1 | `--host` dev servers; native bridge must not reach a development origin | Present | WP-24; WP-R4 |
| SHIP1 | Import boundary limits; checksum is not encryption | Present | WP-6; WP-R4 |
| SHIP1 | Measure tap-to-paint and durable-save latency separately | Gap | WP-25 |
| SHIP1 | Security posture (no remote eval, notes as text, CSV defences) | Verified | HIST-30 |

### 11.5 Local planning IDs for unnumbered risks

| ID | Risk (audit source) | Evidence | Disposition |
|---|---|---|---|
| RISK-01 | Snapshot and sidecar writes before ownership is granted (FS4 "related ownership hole") | Source | WP-2 |
| RISK-02 | IndexedDB open failure cached forever; no `versionchange`/`blocked` handling (2nd-pass gate 2; D4 remedy) | Source | WP-3 |
| RISK-03 | Pre-import copies not pruned after commit; `list()` reads full states (1st-pass risk 8) | Source | WP-3; WP-25 measures |
| RISK-04 | Undo and restore skip migration for snapshots (1st-pass risk 4; 2nd-pass gate 1) | Source · upgrade | WP-5 (+ WP-4) |
| RISK-05 | Unbounded file, decompression and item sizes (1st-pass risk 7; 2nd-pass gate 3) | Source | WP-6 |
| RISK-06 | Service worker reloads a hidden app with unsaved or failing state (7d16f11 delta) | Source | WP-1 |
| RISK-07 | `exitDemo` prefers an older disk save over unsaved real state; demo entry allowed while failing (7d16f11 delta) | Source | WP-1, WP-4 |
| RISK-08 | Other known-field gaps: note and name lengths, letter discriminants, look evidence, anchor cycles and archived anchors (FS8 "other gaps") | Source | WP-6 |
| RISK-09 | Offline, restart and update not browser-tested; `pwa.ts` update differs from DESIGN §11.1 (1st-pass risk 9) | Source | WP-7 tests; WP-N3 native updates |
| RISK-10 | Scale fixtures under-represent note-heavy journals and persistence cost (1st-pass risk 6; 2nd-pass gate 4) | Measurement gap | WP-25; WP-N2 |
| RISK-11 | Memory provenance: favourite-treat date is the award day; "the day it bloomed" is a story date (domain D3 related) | Source | WP-13 |
| RISK-12 | Backdating re-anchors multi-week and multi-month periods (history "further risks") | Source; contract decision | WP-13 + DEC-09 |
| RISK-13 | Signature reads the last tap, not the completion (history "further risks") | Source; decision | WP-13 + DEC-10 |
| RISK-14 | Calendar note markers stale after a note-only edit (W2 supplemental P3) | Source | WP-15 |
| RISK-15 | Best/current run tile compares raw lengths across units (W2 delta decisions) | Source | WP-15 |
| RISK-16 | Sheet mouse-drag window listeners outlive unmount (interaction bounded risk) | Source | WP-16 |
| RISK-17 | Toast lifetime ignores page visibility (interaction bounded risk) | Source | WP-17 |
| RISK-18 | Medium-detent sheets lack an explicit expand control (interaction bounded risk) | Needs device measurement | WP-17; WP-R3 |
| RISK-19 | No general draft restoration (interaction bounded risk) | Source | WP-20 |
| RISK-20 | Onboarding draws planted habits at stage 0 (onboarding smaller observation) | Source (low impact) | WP-21 (with WP-9) |
| RISK-21 | Habit Detail's large resident has no outfit (W2 delta decisions) | Source | WP-21 |
| RISK-22 | Desktop column off-centre by half a classic scrollbar (i7 residual, found in reconciliation) | Source | WP-24 |
| RISK-23 | Favourite place and best friend are heuristics, not history (domain R3) | Source; decision | WP-22 + DEC-08; pairing intervals in WP-13 |
| RISK-24 | Reduced-motion crank still animates for 420 ms (interaction bounded risk) | Source | WP-8 |
| RISK-25 | Choosing a name suggestion then Skip discards it (onboarding smaller observation) | Source | WP-9 |
| RISK-26 | Today's menu and adjustment state store only an id (found with UI2-03) | Source | WP-10 |
| RISK-27 | Raw timestamps reinterpreted after travel; event context not persisted (history "worldwide time") | Source | WP-14 + DEC-10 |
| RISK-28 | History cold paths walk whole lifetimes (history "further risks") | Measurement gap | WP-25 |
| RISK-29 | Moments and the memory shelf render every item (interaction bounded risk) | Measurement gap | WP-25 |
| RISK-30 | Start over keeps IndexedDB copies; no erase-all-copies (1st-pass risk 5; 2nd-pass gate 7) | Intentional + gap | OPP-07; WP-N2; DEC-13 |
| RISK-31 | Legacy `exportData`/`exportPayload` still mark a backup before delivery (no production consumer) | Source | WP-7: remove or align |
| RISK-32 | Mobile suspension right after hide without pagehide can lose a focused name draft (7d16f11 delta, unverified) | Unverified | WP-20 drafts; WP-N3 lifecycle; §7.10 |
| RISK-33 | Save identity and ownership across container migration (2nd-pass gate 5) | Design | C2 `epoch`; WP-N2 migration receipt |
| RISK-34 | Sound and haptics rely on browser techniques (hidden switch) (interaction bounded risk) | Needs device | WP-N3 |
| RISK-35 | IME composition not guarded: Enter in Profile; Escape closes sheets mid-composition (GLOBAL1; extended in reconciliation) | Source | WP-R2 |
| RISK-36 | Committed screenshots are older assets; the gallery is not integration evidence (creative acceptance risk) | Source | WP-R1 (REL-08); WP-R3 |
| RISK-37 | Avoidance habits are self-reported; creation examples needed; a reduction goal would be a new comparator (history "further risks") | Design | WP-R2 (copy); OPP-15 |
| RISK-38 | Sparse, quick and night routines cannot earn time-derived looks (domain R1, R2) | Design | DEC-17; OPP-08; OPP-09 |
| RISK-39 | Four-season prose does not fit tropical climates (GLOBAL1) | Design | WP-R2; OPP-16 |
| RISK-40 | Third-party credits and notices not audited in the artefacts (SHIP1) | Source | WP-R4 |

### 11.6 Observations made during this reconciliation

These were found while re-tracing current code. They are **not** counted as audit findings, and each is attached to the package that already touches the code.

| ID | Observation | Disposition |
|---|---|---|
| NEW-01 | Three copies of `round6` (`economy.ts:164`, `company.ts:230`, inline `habits.ts:332`). The ledger-derived stage disagrees with the history-derived stage (`growth.ts:261–279`, used by `letters.ts:118–119`, `seasonReview.ts:104–106`). | WP-11 |
| NEW-02 | `types.ts:322` documents the refund window as today−7…today. The `pruneOldStamps` comment (`logging.ts:398–402`) says stamps feed only insights, but stacking and signature read them too. | WP-12, WP-13 |
| NEW-03 | Two different partner-colour derivations (`Band.tsx` uses `card.after`; `progress/looks.ts` uses `keptTogether ?? anchorHabitId`). `HabitCard.tsx:202` passes a look without a partner colour. | WP-21 |
| NEW-04 | The Odds sheet's "Each" column uses equal weights (`views/capsules.ts:154, 182`; `OddsSheet.tsx:54`), while the lineup shows ownership-weighted chances. | WP-23 |
| NEW-05 | `installPrompt.ts:58` treats "just installed" as installed even in a browser tab. Install and haptics sniff the user agent and `navigator.platform`. The first may be deliberate; verify. | WP-N3 |
| NEW-06 | A pull does not pre-check for a pending reveal, so the coin and handle animate before "came back out". | WP-8 |
| NEW-07 | "Visit {name}" can never show in the routed app. The reveal sets `location.hash` directly instead of calling `navigate()`. | WP-18 |
| NEW-08 | `playwright.config.ts` matches a `capsules` spec that does not exist; there is no capsules end-to-end test. | WP-24 |
| NEW-09 | The look-unlock copy says the look "shows on the tag", but `PlantTag.tsx` never reads the look. | WP-21; DEC-12 |
| NEW-10 | Insights and badges read stamps without filtering on `showedUp`. `editHistory` keeps `at` on un-done days. Low impact; evaluate with the stamp changes. | WP-13 |

### 11.7 Product opportunities (local IDs)

| ID | Opportunity (audit sources) | Disposition |
|---|---|---|
| OPP-01 | Searchable, exportable personal archive; human-readable notes export (2nd-pass utility; interaction priority 1; native opportunity 1; creative O3; 1st-pass data opportunity) | §8 priority 2, after WP-20 |
| OPP-02 | Transparent history and edit previews (native opportunity 2; domain opportunities 1–2) | §8 priority 3 |
| OPP-03 | Quiet mode as a first-class choice (native opportunity 3; interaction priority 5) | WP-19 (mandatory) + §8 priority 4 |
| OPP-04 | Return after absence (native opportunity 4) | §8 priority 6 |
| OPP-05 | Reminders, widgets and App Intents (native opportunity 5; interaction priority 2) | §8 priority 5; WP-N3 |
| OPP-06 | Companion continuity (native opportunity 6; interaction priority 3) | WP-18, WP-21, WP-22 + §8 priority 7 |
| OPP-07 | Verified backup and recovery: restore preview, receipt, first-backup invitation, rehearsal, erase-all (native opportunity 7; interaction priority 4; 2nd-pass utility; 1st-pass data opportunities) | §8 priority 1 |
| OPP-08 | Sparse and finite habits first-class (domain opportunity 3; R1) | §8 priority 9 |
| OPP-09 | Honest personalisation and a user-confirmed time (domain opportunity 4; R2) | §8 priority 8 |
| OPP-10 | Plan inside flexible periods (creative O1) | §8 priority 10 |
| OPP-11 | "After the last time" recurrence (creative O2) | §8: validate demand first |
| OPP-12 | Quantity per period (creative O4) | §8: validate demand first |
| OPP-13 | Optional password-protected backups (1st-pass data opportunity) | §8 priority 11 |
| OPP-14 | Biometric privacy cover (native opportunity 7) | §8: after device protection |
| OPP-15 | Reduction goals for avoidance habits (history "further risks") | §8: validate demand first |
| OPP-16 | Neutral or tropical seasonal voice (GLOBAL1) | WP-R2 |
| OPP-17 | Cloud sync or encrypted cloud backup (IOS3) | Not planned; DEC-14 trigger |
| OPP-18 | Usability research on place-saving and currency goals (creative acceptance risk) | §8 priority 12 |

### 11.8 Release gates (local IDs)

REL-01 to REL-08 are defined in WP-R1 and map one-to-one to the IOS5 rows in §11.4.

### 11.9 Decisions (local IDs)

DEC-01 to DEC-05 are owner decisions; DEC-06 to DEC-17 have defaults (§10).

### 11.10 Fixed, superseded, refuted or intentional items (no repair work)

| ID | Item | Evidence | Disposition |
|---|---|---|---|
| HIST-01 | integration-i2 first-paint budget | CI 138.9 KB / 150 KB at the pin | Fixed; size gate remains |
| HIST-02 | integration-i7 double sidebar subtraction | `App.module.css:31–36` | Fixed; RISK-22 residual |
| HIST-03 | Backup marked before delivery (You and Install) | `DataSection.tsx:220–240`, `InstallSection.tsx:29–36` mark after delivery | Fixed; legacy functions → RISK-31 |
| HIST-04 | Import preview counted archived habits | `handoff.ts:195–198` counts live habits | Fixed |
| HIST-05 | Offer declines not persisted | `habits.ts:415–437`, `economy.ts:929–933` | Fixed |
| HIST-06 | One-day plural phrase | `formatCore.ts:68` | Improved |
| HIST-07 | "You, Progress, Detail and Shelf are placeholders" | Screens implemented | Superseded |
| HIST-08 | "No save, lock or recovery banners" (1st-pass risk 3) | `App.tsx:46–82` banners exist | Superseded; remainder is data-d10 |
| HIST-09 | Reset copy hid that daily copies stay | `copy.ts:66–67` discloses | Partly corrected; erase-all → RISK-30 |
| HIST-10 | Blocked CI at 157.6 KB | Historical | Superseded by HIST-01 |
| HIST-11 | CSV formula injection | `profile.ts:154–159` defuses prefixes | Refuted |
| HIST-12 | ICS escaping | Escapes and folds correctly | Refuted |
| HIST-13 | Confetti `innerHTML` as an untrusted sink | Authored shapes only | Refuted |
| HIST-14 | Snapshot rewind and local economy edits as security issues | Offline single-player | Refuted; entitlement integrity is separate (C8) |
| HIST-15 | Bake at 99 servings loses value | UI offers Bake only at 0–1 servings | Not reachable |
| HIST-16 | Backup replay; first-period bonus exclusions; growth high-water; sticky stories; one story per check-in | Documented policy | Intentional |
| HIST-17 | Companion reward multiplication on moves | Carried shares | Refuted |
| HIST-18 | Pause "Back on" inclusive end | Matches domain | Refuted |
| HIST-19 | Annual SVG text summary; roving calendar focus | Present | Verified good |
| HIST-20 | Archive and delete consequences | Distinct; restore path exists | Verified good |
| HIST-21 | No nudge for never-backed-up users | Deliberate, pinned by tests | Intentional → OPP-07 |
| HIST-22 | Cycle-safe stack order; unknown catalogue IDs tolerated | Deliberate | Intentional; preserved in C6 |
| HIST-23 | DST and leap arithmetic; capsule guarantees; RNG bias | Tests and review | Refuted |
| HIST-24 | Two ritual-reader hosts duplicate a modal | Singleton owner | Refuted |
| HIST-25 | "Progress drops looks" | Progress shelf and Detail forward looks | Superseded |
| HIST-26 | Domain appendix "M2 placeholder" exclusions | Screens exist | Superseded |
| HIST-27 | Public-site observation of an older build | Read-only | No action |
| HIST-28 | The former `NOTES-w2-progress.md` known requests | Lead requests, not findings | Consolidated into `NOTES-open.md` |
| HIST-29 | Fresh-start faithful; existing users, demo and import bypass onboarding; Quiet rewards not a first-run choice | Verified | No finding; quiet first-run choice → OPP-03 |
| HIST-30 | No outbound transfer, remote code or note-as-HTML found; diagnostics excludes notes | Source review | Verified; not a penetration test |

### 11.11 Audit structures mapped to this plan

| Audit structure | Mapping |
|---|---|
| Seven shared repair families | §3 RC1–RC14 (each family split into its concrete causes) |
| Stages A–E (native section) | A → Phases 1–2; B → Phases 3–5; C → Phase 7; D → Phase 8; E → Phase 9 |
| Interaction "native release matrix" | §7.10 |
| First-pass persistence additional risks 1–9 | 1 → FS5; 2 → FS4; 3 → HIST-08 and data-d10; 4 → RISK-04; 5 → RISK-30; 6 → RISK-10; 7 → RISK-05; 8 → RISK-03; 9 → RISK-09 |
| Second-pass persistence gates 1–7 | 1 → RISK-04; 2 → RISK-02; 3 → RISK-05; 4 → RISK-10; 5 → RISK-33; 6 → SUB2 / C8; 7 → RISK-30 |
| 7d16f11 delta items | data-d10, data-d11, data-d12, RISK-06, RISK-07, RISK-32, HIST-03, FS5 and FS6 (import lifecycle), HIST-30 |
| Creative acceptance risks | Tracker value → WP-19; records retrieval → OPP-01; currency goals → OPP-18; gallery → RISK-36 |
| Onboarding delta acceptance list | WP-9 tests |
| "Avoid" list | §8 excluded list |

---

## 12. Coverage check, open questions, release blockers and exit criteria

### 12.1 Every audit item has an explicit disposition

The counts below were checked mechanically against this document (§12.2). An item counts as dispositioned only if its row in §11 names at least one of the following:
- a work package;
- a decision;
- an opportunity with a priority;
- a release gate;
- a `HIST` record with evidence.

| Category | Items | Dispositioned | Where |
|---|---|---|---|
| Original registered findings | 37 (34 present, 1 partly fixed, 2 fixed) | 37 | §11.1 |
| Retained unregistered original finding | 1 (data-d12) | 1 | §11.2 |
| Deeper findings and credit correction | 23 (FS1–FS10, UI2-01–UI2-08, HM1–HM4, SHIP1) | 23 | §11.3 |
| Native, subscription, worldwide and accessibility requirements | 10 IDs (IOS1–IOS5, SUB1–SUB3, GLOBAL1, ACCESS1), expanded to 41 sub-rows with SHIP1's section | 41 | §11.4 |
| Bounded risks (local IDs) | 40 (RISK-01 to RISK-40) | 40 | §11.5 |
| Reconciliation observations | 10 (NEW-01 to NEW-10) | 10 | §11.6 |
| Product opportunities | 18 (OPP-01 to OPP-18) | 18 | §11.7, §8 |
| Release gates | 8 (REL-01 to REL-08) | 8 | WP-R1 |
| Decisions | 17 (DEC-01 to DEC-17) | 17 | §10 |
| Fixed, superseded, refuted, intentional | 30 (HIST-01 to HIST-30) | 30 | §11.10 |

No item is assigned to a generic "later". Deferred items name their trigger:
- OPP-11, OPP-12 and OPP-15: demand evidence.
- OPP-14: device protection defined.
- OPP-17: post-launch sync demand, via DEC-14.

The bug count is not inflated:
- the 61 audit identifiers reduce to 14 root causes (§3);
- the 10 NEW observations are attached to existing packages and not counted as findings;
- refinements stay inside their original IDs.

### 12.2 Mechanical cross-check

The following was run over this document before saving it:

1. Every ID listed in the audit's two registers (37 + 23) appears in §11 with a disposition. data-d12 appears in §11.2.
2. Every `WP-*`, `DEC-*`, `OPP-*`, `REL-*`, `RISK-*`, `NEW-*` and `HIST-*` identifier used anywhere in the plan is defined exactly once.
3. Every work package in §6 covers at least one audit ID or requirement, and every audit ID maps to at least one package or decision.

The result is recorded in the commit that adds this plan.

### 12.3 Remaining questions and uncertainty

| Question | Why it is open | How it closes |
|---|---|---|
| The evidence bundle (`catkin-combined-evidence.zip`) was not available | The regressions were rebuilt from the audit's written steps | WP-0 cross-checks against the bundle if the owner can attach it |
| Seven source-only findings have not been observed at runtime (FS5 demo and ownership variants, FS6, UI2-02, UI2-03, UI2-04, UI2-05, UI2-07) | Source-established only | Their WP-0 ledger tests must fail on HEAD before any fix is accepted |
| Capacitor 8's current requirements | capacitorjs.com is blocked here | WP-N1 confirms from the primary source |
| Apple's StoreKit testing guidance; EU trader and China ICP rules | Not retrievable or not rechecked here | WP-S3 and REL-07 recheck before use |
| Whether the growth tolerance can be proven safe for every rule shape | Needs enumeration | WP-11's enumeration test; fall back to exact units if it cannot |
| The HM1 computation-only fix, when pauses were recorded after a cut | Pause recording time is not stored | WP-12's pause matrix; fall back to a frozen cut record |
| Real iOS behaviour: WKWebView storage durability, system gesture cancels, VoiceOver with sheet outlets, haptics | Not measured | WP-N1, WP-R3, §7.10 |
| Performance budgets on the reference iPhone | Not measured | WP-25 with WP-N1 |
| Willingness to pay; the pricing point | No research was done | Owner (DEC-02) |

### 12.4 Release blockers

**Before any real-user trial of the web app:**
- All P1 items: data-d1 to data-d6, FS1, FS2 (before any schema change), and FS3.
- FS4, FS10, data-d8, data-d10, data-d11, data-d12, FS5, FS6, FS9.
- WP-7 recovery UI.

**Before charging anyone (a native paid release), additionally:**
- **Correctness:** every other P2 finding (UI2-01 to UI2-08, HM1 to HM3, integration-i3 to i6, the domain and creative P2 items).
- **Platform:** IOS1 to IOS5 (REL-01 to REL-08).
- **Subscriptions:** SUB1 to SUB3, with the §9.5 matrix passing.
- **Accessibility:** ACCESS1 device evidence (WP-R3).
- **Notices and credits:** the SHIP1 notices (WP-R4).
- **Decisions:** DEC-01 to DEC-05 made.

**Not blocking a release** (they have explicit dispositions, but a release can ship without them):
- the P3 items (domain-d7, creative-cr-05, creative-cr-d3, UI2-06, HM4);
- the OPP items.

The recommendation is still to fix the P3 items with their packages, because each is small.

### 12.5 Measurable exit criteria

| Phase | Exit criteria |
|---|---|
| 0 | Ledger tests exist for every reproduced ID and every source-only P1 and P2 ID. Each is observed in its expected state on HEAD. The Windows typecheck passes. |
| 1 | No `it.fails` remains for data-d1 to data-d12, FS1 to FS9 or RISK-01 to RISK-07. The §7.2–§7.4 matrices are 100% green in Vitest, and in Chromium and WebKit for the browser-adapter rows. The §7.7 mutation corpus has 0 crashes over at least 5,000 seeded mutants per CI run. Every `LoadResult` and `Durability` kind has a visible, tested UI state. |
| 2 | No action after unmount or epoch change, across the §7.8 matrix. Every pending reveal is recoverable on every cabinet, in and out of season. Every lazy host recovers after one rejection. |
| 3 | The §7.5 metamorphic suite is green. Deletion at ages 6, 7 and 8 matches the refund boundary. Thresholds are reached through real transactions for 3 and 6 per week. The time-zone matrix is green. |
| 4 | Keyboard-only and mixed-input journeys pass. The WebKit, normal-motion and touch Playwright lanes are green. The quiet-mode journey shows no currency. A year-old note can be edited and removed. |
| 5 | The cross-screen presentation parity test is green. No friendship level line lacks a wired behaviour. Odds and flourish contract tests are green. |
| 7 | The IOS1 acceptance list is demonstrated on a physical iPhone. The IOS2 fault list passes on device, with kill-during-save showing the old or the new complete save. |
| 8 | Every §9.5 row passes in each applicable environment. Imports, resets, the demo and clock repair leave access unchanged in 100% of runs. |
| 9 | Every REL row has attached evidence. The privacy label matches a network capture with 0 unexpected hosts. Every WP-R3 task is completed with each assistive technology. Licences ship in the web and native artefacts. The performance budgets fixed in WP-25 are met on the reference device. An upgrade from the previous TestFlight build and the documented rollback are rehearsed. |

---

## 13. Recommended first implementation package

**Package P1-A, "Save-queue integrity."** This is WP-0's fixtures and ledger tests for its IDs, plus WP-1, plus the queue-retirement and ownership-state half of WP-2.

> **Status (30 September 2026): implemented on this branch after the owner's go-ahead.**
>
> - **Tests.** `tests/unit/state/save-integrity.test.ts` and `save-integrity-ui.test.tsx` cover FS1 (R201 plus the re-hydrate variant), data-d2, FS4 (R210 and refusal), data-d1, RISK-01, RISK-06 and RISK-07. Each was run against the original source and failed for the audited reason: 12 of 13 store cases and 4 of 4 interface cases. The 13th store case guards behaviour that was already correct. All pass after the change.
> - **Two small departures from §4 C1:**
>   - `flush()` keeps `null` for "nothing pending", an existing tested contract, and adds distinct `'held'` and `'disposed'` outcomes.
>   - `durability` uses one `ok` kind for "written or about to be". The UI never needed to tell those two apart.
> - **Deferred.** WP-1's refusal of demo *exit* is unnecessary, because entry is now refused while a write is failing or held. The rest of WP-2 (epoch and adoption) is package P1-B.

### 13.1 Why this package first

- It contains the only **new regression** among the P1 findings (FS1). That regression came from the after-frame save performance change (the former `NOTES-w2-today.md` request 15), so the fix belongs next to that code while the context is fresh.
- It fixes two further P1 findings (data-d2 and data-d1) and one P2 finding (FS4) that share the same object (`SaveQueue`) and the same boundary (`persist()`/`acquireLock()`).
- Every later persistence package (WP-2's epoch adoption, WP-4's replacement coordinator, WP-8's durable acquisitions) depends on the durability contract it establishes.
- It needs **no product decision** and **no stored-format change**. It is small: mostly `src/state/persist.ts` and `src/state/store.ts`, one line in `src/app/pwa.ts`, and tests. A clean revert restores today's behaviour with no data implications.

### 13.2 Scope

| In scope | Out of scope (next packages) |
|---|---|
| **Fixtures:** `deferredLocks`, `faultyStorage`, `captureAfterFrame`. **Ledger tests:** FS1 (R201 and its variants), data-d2, FS4 (R210), data-d1, RISK-06, RISK-07. | Envelope `epoch` and `reconcileFromDisk` (FS3, data-d5): package P1-B with WP-3 |
| `SaveQueue`: keep pending until success; `failing` plus bounded retry; `FlushOutcome`; no `?? 'saved'`; `disposed` flag and generation check in `saveSoon` | Replacement coordinator (WP-4) |
| One `retireQueue()` used by `hydrate`, the `acquireLock` refusal and steal paths, `useHere`, `resetAll`, `enterDemo`, `exitDemo` and `switchQueue` | Decoder and validation (WP-5, WP-6) |
| `ownership` state and `canWrite()`; `snapshotToday` and the onboarding sidecar gated on ownership (RISK-01) | Full recovery UI (WP-7). This package only maps `failing` and `volatile` onto the existing storage banner with accurate copy. |
| `browserStorage()` split into read and write capability; `volatile` status | Acquisition commands (WP-8) |
| `durability` signal, with `hasUnsaved()`. `pwa.ts` `busy()` consults it. Demo entry is refused while failing; demo exit keeps tracked unsaved real state. | |

### 13.3 Acceptance

**Ledger.** Each of these moves from `it.fails` to `it`:
- R201 and the four FS1 variants (lock loss before or after the frame; before or after storage-event delivery; after a hydrate, reset or demo queue replacement; the 100 ms fallback);
- data-d2 (retry without a new mutation);
- R210 (FS4);
- data-d1 (a full but readable store loads the save; unreadable storage is `volatile`);
- RISK-06;
- RISK-07.

**Invariant.** A static check, reviewed in the change, confirms that `saved` is produced only after a successful `setItem`.

**Regression safety:**
- The existing unit and e2e suites are unchanged and green.
- Tap-to-paint is unchanged: the former `NOTES-w2-today.md` request 15 measurement is repeated on the 3-year × 20-habit fixture.

**Browser check.** A two-context Playwright test (Chromium now; WebKit when WP-24 lands) runs "Use here" during a burst of check-ins; the other tab's newer save survives.

### 13.4 Next packages in order

1. **P1-B:** WP-2's epoch and adoption, plus WP-3.
2. **P1-C:** WP-5 and WP-6.
3. **P1-D:** WP-4, then WP-7.

WP-24a and WP-11 to WP-15 can run in parallel with them.

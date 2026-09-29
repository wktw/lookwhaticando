# Comprehensive catkin technical creative and iOS release audit

This report consolidates both audit passes for **wktw/lookwhaticando**, whose product name is **catkin**. It is written for the project owner and Opus 5.5 to plan evidence-based fixes without losing any earlier findings. The central conclusion is that catkin has a strong, distinctive product foundation, but persistence, recovery, historical correctness and interrupted interactions need repair before a paid native release.

The audit is complete. This document does not implement any fixes. Application source, GitHub state and real user data remained unchanged throughout the audit. The original report and evidence bundle remain preserved. Creating this report is the documentation-only follow-up requested by the project owner.

## Scope and source versions

- Audit date: **29 September 2026**.
- Primary second-audit pin: [c66f5880776c08e2c687922a3ec3a3206595c8da](https://github.com/wktw/lookwhaticando/commit/c66f5880776c08e2c687922a3ec3a3206595c8da).
- First audit integrated pin: [7d16f113769ab5d681b5ddae1dbb8381f364a914](https://github.com/wktw/lookwhaticando/commit/7d16f113769ab5d681b5ddae1dbb8381f364a914).
- First audit original baseline: [d93618aaa40b555ad42bb9fd118d6e14cca1f73a](https://github.com/wktw/lookwhaticando/commit/d93618aaa40b555ad42bb9fd118d6e14cca1f73a).
- Last remote checkpoint during the audit: **2026-09-29 22:16:32 UTC**, still at the primary pin.
- Reviewed branch: `claude/eloquent-hawking-v69lhr`.
- Subsequent active development may have changed the code. Revalidate against the actual current HEAD and local uncommitted work before planning a repair. A status below means status at the audited pin, not a claim about code written later.

The first pass read all 23 project documentation files and reviewed the domain, state, art, UI, integration and delivery structure. The second pass inspected deeper failure sequences, interactions and historical invariants, compared the additional ten-commit delta, and assessed native iOS release requirements. The detailed coverage and refutations are included below. This is extensive source and synthetic runtime evidence, not proof of every possible runtime state.

## Accepted audience and business model

- The intended launch audience is **adults only**.
- The owner is seriously considering worldwide distribution on the **iOS App Store**.
- The proposed business model is a **subscription with a 14-day free trial**.
- There must be **no purchasable currency, paid capsule pulls, paid odds boosts or other predatory microtransactions**.
- Plan StoreKit subscriptions as the straightforward worldwide baseline, while accounting for current storefront-specific rules. An Apple subscription is itself an in-app purchase; the owner's objection is to microtransactions and predatory monetization.
- Paid access must be independent of editable/importable journal state. Backups, resets, demo and clock edits must not create entitlements or reset trial eligibility.
- Post-expiry access to personal history, export, recovery and deletion needs an explicit product decision. The audit recommends preserving these controls permanently.

Missing native packaging and subscriptions are new release requirements, not regressions in a project previously built as a free local web app.

## Main conclusions

1. **Protect committed history first.** A disposed save writer can overwrite a new owner's state; failed writes can disappear from retry tracking; replacement and recovery can report success without durable persistence; snapshots acknowledge an incomplete transaction boundary.
2. **Bind every delayed action to its origin.** Imports, capsule animations, caches, onboarding and editors can survive a reset, ownership change, replacement save or date change. Shared identity, revision, cancellation and commit contracts are needed.
3. **Preserve historical truth.** Rounded growth values, retention of timestamps, schedule cuts, deletion boundaries and preference changes can alter facts users expect to be permanent.
4. **Complete existing creative promises.** Earned identity, friendship behavior, feeding choices and navigation context should be coherent before expanding the collection. The quiet habit-first mode should be a complete experience.
5. **Make personal writing controllable.** Older notes need editing, deletion, search and useful export. Dependable backup and a restore preview matter more than additional decorative content.
6. **Prove a native release before charging.** Build a small signed iPhone implementation that validates durable storage, migration, Files transfer, lifecycle, accessibility and one verified subscription before committing to a broad native architecture.

All **37 original registered findings** are retained: **34 still present, 1 partly fixed, 2 fixed** at the second-audit pin. The second pass adds **22 deeper technical entries plus one attribution correction**. Several deepen previously identified causes and must not be counted as independent bugs. Further bounded risks and product opportunities in the detailed sections also need explicit planning dispositions; the short registers are indexes, not the full scope.

## Evidence and verification limits

| Evidence | Measured result | What it establishes |
|---|---|---|
| Independent scratch reproductions | 33 passed across five files; 14 new and 19 retained or updated | Actual source modules reproduce the reported incorrect behavior using synthetic memory/fake adapters or jsdom. Passing these tests does not mean the defects are fixed. |
| Linux CI at the reviewed pin | 2,511 unit tests passed, 1 skipped; 234 end-to-end tests passed, 48 skipped; typecheck, builds, size gate and deployment passed | The prior bundle-size blocker was repaired. Skipped tests do not establish coverage. |
| First-paint JavaScript | 138.9 KB gzip against a 150 KB budget | Current CI budget passes; this does not establish full-motion or native performance. |
| Windows local checks | Typecheck fails; unit run 2,496 passed, 15 failed, 1 skipped | Case-only module names cause portability failures; a geometry precision test also fails. Not 15 independent product bugs. |
| Browser coverage | Phone-named Playwright projects use Chromium; all request reduced motion | No Safari, WKWebView, real VoiceOver or normal-motion interruption certification follows. |
| Artifact/source preservation | Original HTML and evidence ZIP hashes unchanged; tracked source clean in all three snapshots | Audit outputs and scratch harnesses were separate from application changes. |
| Audit completion | 11 manual acceptance gates met; 0 unmet; 0 abandoned | Review completion only, supported by independent checks; not product release readiness. |

[Exact Linux CI run](https://github.com/wktw/lookwhaticando/actions/runs/36632566504).

No native build/signing, App Store Connect configuration inspection, physical iPhone/iPad test, VoiceOver session, StoreKit integration test, production penetration test or subscription willingness-to-pay research was performed. Source-only findings and prospective release gates remain explicitly labeled. Current Apple/Capacitor primary sources are linked in the platform section; recheck time-sensitive requirements during implementation. This report is not worldwide legal certification or an App Store approval prediction.

## How to use this report

Read the current registers and all detailed second-pass sections first. Then read the retained first-pass detailed findings and their delta notes. **Current reconciliation takes precedence over historical wording.** The two fixed registered items are the bundle-size failure and desktop shell width; Quiet rewards is partially fixed. Earlier placeholder-screen and blocked-CI observations in the historical appendices are not current defects.

Evidence labels are intentionally precise: reproduced variants were executed; source sequences were traced but not all mounted on a device; future-schema findings require an upgrade scenario; product opportunities need a product decision rather than a bug patch. Retain this distinction in the implementation plan.

## Current register of all original findings

| Finding ID | Priority at first audit | Current status | Finding | Current assessment |
|---|---|---|---|---|
| data-d1 | P1 | Still present | Readable saves disappear at full storage | Rechecked against the current source; original finding and repair direction remain applicable. |
| data-d2 | P1 | Still present | Failed saves drop out of the retry queue | Still present; FS10 confirms the Special Order consequence. FS1 adds a distinct disposed-writer regression. |
| data-d3 | P1 | Still present | Import and Undo announce success after failed writes | Still present; FS10 adds another falsely successful command. FS5/FS9 add lifecycle and fallback defects. |
| data-d4 | P1 | Still present | Snapshots acknowledge the wrong success boundary | Rechecked against the current source; original finding and repair direction remain applicable. |
| data-d5 | P1 | Still present | Old-tab takeover can overwrite a newer schema | Still present; FS3 adds a reproduced reset/deletion takeover variant. FS2 is the separate rescue-export defect. |
| data-d6 | P1 | Still present | Blanket migration defaults hide missing core history | Rechecked against the current source; original finding and repair direction remain applicable. |
| integration-i2 | P1 | Fixed | The newer integration is blocked by its size budget | Fixed: current Linux CI passes the 150 KB gate at 138.9 KB gzip and deploys successfully. |
| data-d7 | P2 | Still present | Accepted malformed history crashes Memory Shelf | Still present; FS8 adds more accepted-state failures, including a reproduced invalid-date import crash. |
| data-d8 | P2 | Still present | Restore can replace state without a safe undo copy | Rechecked against the current source; original finding and repair direction remain applicable. |
| data-d11 | P2 | Still present | No-undo import retains an older Undo target | Rechecked against the current source; original finding and repair direction remain applicable. |
| data-d10 | P2 | Still present | Recovery errors are invisible or misleading | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d1 | P2 | Still present | Growth thresholds miss valid scheduled completions | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d2 | P2 | Still present | Compaction rewrites stack history | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d3 | P2 | Still present | Weekly memories invent time with a new companion | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d4 | P2 | Still present | Day-start preferences rewrite arrival dates | Rechecked against the current source; original finding and repair direction remain applicable. |
| data-d9 | P2 | Still present | Local time selectors lag in fractional zones | Rechecked against the current source; original finding and repair direction remain applicable. |
| integration-i3 | P2 | Still present | Pending capsules do not reliably resume | Rechecked against the current source; original finding and repair direction remain applicable. |
| integration-i4 | P2 | Still present | Lazy-sheet failures cannot retry | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-01 | P2 | Still present | Feeding loses choices as inventory grows | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-02 | P2 | Still present | Watered soil remains after Undo | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-03 | P2 | Still present | Shelf strips earned plant identity | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-04 | P2 | Still present | Friendship announces unwired behavior | Rechecked against the current source; original finding and repair direction remain applicable. |
| integration-i5 | P2 | Partial | Quiet rewards still exposes wallet and Capsules | Partly fixed: Quiet rewards hides the wallet; desktop Capsules navigation still remains. Updated reproduction passes. |
| integration-i6 | P2 | Still present | Find a plant opens a generic Shelf | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d5 | P2 | Still present | Balcony is never an automatic favorite place | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-d6 | P2 | Still present | Finishing a habit on creation day leaves a missed day | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-w2-d1 | P2 | Still present | Calendar cannot add old flexible history | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-w2-d2 | P2 | Still present | Open Today leaves the detail sheet in front | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-w2-d3 | P2 | Still present | Saved ritual prose changes after an icon edit | Rechecked against the current source; original finding and repair direction remain applicable. |
| domain-w2-d4 | P2 | Still present | Deleting the last habit hides unrelated keepsakes | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-d1 | P2 | Still present | Refused onboarding creation advances into a dead end | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-d2 | P2 | Still present | First capsule reload loses its cabinet choice | Rechecked against the current source; original finding and repair direction remain applicable. |
| integration-i1 | P2 | Still present | Case-insensitive imports block Windows builds | Still present: Windows typecheck fails; test failures trace mainly to case-only module names, plus a geometry precision case. |
| integration-i7 | P2 | Fixed | Desktop shell leaves too little content width | Fixed in source: content width now accounts for the sidebar. No native-device visual certification implied. |
| domain-d7 | P3 | Still present | Tiny waterings disappear from the monthly jar | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-05 | P3 | Still present | Flourish copy and art disagree | Rechecked against the current source; original finding and repair direction remain applicable. |
| creative-cr-d3 | P3 | Still present | Onboarding secondary chunk has no recovery UI | Rechecked against the current source; original finding and repair direction remain applicable. |

### Original impact and repair directions

The impact below preserves the first audit's observation. Read its current status alongside it; fixed entries are retained for traceability rather than assigned new work.

#### data-d1 Readable saves disappear at full storage

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** The availability probe refuses readable localStorage when a tiny write fails, then boots a volatile save that reports saved.

**Repair direction:** Separate reading, writing and volatile operation.

#### data-d2 Failed saves drop out of the retry queue

**Current status:** Still present. Still present; FS10 confirms the Special Order consequence. FS1 adds a distinct disposed-writer regression.

**Original evidence:** Reproduced. **Original impact:** A failed last mutation is no longer pending. Restoring write access and flushing does not save it. Updates/demo can then discard memory-only work.

**Repair direction:** Retain dirty state until confirmed write; block destructive transitions.

#### data-d3 Import and Undo announce success after failed writes

**Current status:** Still present. Still present; FS10 adds another falsely successful command. FS5/FS9 add lifecycle and fallback defects.

**Original evidence:** Reproduced. **Original impact:** Memory changes while disk stays old; Undo can consume its recovery token despite failure. New You wrappers trust these returns.

**Repair direction:** Make replacement and recovery return durable results.

#### data-d4 Snapshots acknowledge the wrong success boundary

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source + API. **Original impact:** IndexedDB request success can precede transaction abort; a promised pre-import copy may never commit.

**Repair direction:** Resolve writes at transaction completion.

#### data-d5 Old-tab takeover can overwrite a newer schema

**Current status:** Still present. Still present; FS3 adds a reproduced reset/deletion takeover variant. FS2 is the separate rescue-export defect.

**Original evidence:** Reproduced · upgrade. **Original impact:** Use here ignores the newer-schema load result and allows an old state to write over the new save.

**Repair direction:** Recheck version/ownership at every writer handoff.

#### data-d6 Blanket migration defaults hide missing core history

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** An envelope containing only state.version is accepted as a valid fresh save; fallback recovery is bypassed.

**Repair direction:** Whitelist genuine additive defaults; require original core fields.

#### integration-i2 The newer integration is blocked by its size budget

**Current status:** Fixed. Fixed: current Linux CI passes the 150 KB gate at 138.9 KB gzip and deploys successfully.

**Original evidence:** CI evidence. **Original impact:** Linux build succeeds, then first-paint JS fails at157.6KB gzip versus150KB; later checks and deploy are skipped.

**Repair direction:** Repair entry imports, then complete the whole pipeline.

#### data-d7 Accepted malformed history crashes Memory Shelf

**Current status:** Still present. Still present; FS8 adds more accepted-state failures, including a reproduced invalid-date import crash.

**Original evidence:** Reproduced. **Original impact:** Monthly stems:7 passes validation/import and later .map throws.

**Repair direction:** Validate every consumed known field; test accepted-state selector safety.

#### data-d8 Restore can replace state without a safe undo copy

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** A failed pre-restore snapshot is ignored; the one-click undo pointer is not updated.

**Repair direction:** Use the same safe replacement protocol for import and restore.

#### data-d11 No-undo import retains an older Undo target

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced + source. **Original impact:** The new UI still promises24-hour Undo. The retained token can restore A after imports A→B→C, instead of B.

**Repair direction:** Return exact undo capability and invalidate stale tokens.

#### data-d10 Recovery errors are invisible or misleading

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** Corrupt/recovered saves are described only in hidden diagnostics; non-quota errors can look saved; snapshot read failures look empty or stay busy.

**Repair direction:** Expose recovery/error states with retry and export.

#### domain-d1 Growth thresholds miss valid scheduled completions

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** Nine Mon/Wed/Fri grants total20.999997, leaving the plant Leafy instead of Budding at21. Story/flourish thresholds share the precision issue.

**Repair direction:** Use one explicit precision contract end to end.

#### domain-d2 Compaction rewrites stack history

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** Fourteen reversed live pairs become fourteen kept-together days after timestamps are pruned.

**Repair direction:** Preserve ordering evidence; test facts before/after compaction.

#### domain-d3 Weekly memories invent time with a new companion

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** A pet paired on Sunday is credited with six preceding waterings it never shared.

**Repair direction:** Use dated companion ownership and routine eligibility.

#### domain-d4 Day-start preferences rewrite arrival dates

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** An arrival at04:00 moves to the previous day when day start changes03:00→06:00.

**Repair direction:** Persist the original event-day key as well as timestamp.

#### data-d9 Local time selectors lag in fractional zones

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** Actual11:05 atUTC+05:30 is passed to Today as10:30, selecting Morning instead of Midday.

**Repair direction:** Invalidate by semantic local boundaries and preserve real time.

#### integration-i3 Pending capsules do not reliably resume

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced + source. **Original impact:** Inactive neighbors miss pending state; an expired seasonal cabinet can block all ordinary pulls with no reachable reveal.

**Repair direction:** Recover independently of active cabinet and season.

#### integration-i4 Lazy-sheet failures cannot retry

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** Rejected editor/detail/pet chunks leave boolean request=true and no host; later clicks do not retrigger loading.

**Repair direction:** Add visible loading/error/retry/cancel state.

#### creative-cr-01 Feeding loses choices as inventory grows

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** Only six treats can feed a pet; Basket and pantry has no continuation feeding action for the rest.

**Repair direction:** Keep quick choices and provide an all-treat chooser for that pet.

#### creative-cr-02 Watered soil remains after Undo

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced + source. **Original impact:** Animation counters become permanent damp status; the band has a separate sticky set.

**Repair direction:** Separate animation occurrence from authoritative day status.

#### creative-cr-03 Shelf strips earned plant identity

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** Flourishes and paired hue are omitted; paused plants lose chosen appearance. Retirement needs an explicit frozen-presentation contract.

**Repair direction:** Share the permanent plant presentation mapping.

#### creative-cr-04 Friendship announces unwired behavior

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · integration. **Original impact:** L5/L7/L8/L9 promises cannot affect a scene model that has neither level nor named best-friend input.

**Repair direction:** Pass meaningful behavior preferences or defer the claims.

#### integration-i5 Quiet rewards still exposes wallet and Capsules

**Current status:** Partial. Partly fixed: Quiet rewards hides the wallet; desktop Capsules navigation still remains. Updated reproduction passes.

**Original evidence:** Reproduced. **Original impact:** The desktop shell ignores the now-reachable preference despite its clear helper copy.

**Repair direction:** Apply the preference consistently across shell and announcements.

#### integration-i6 Find a plant opens a generic Shelf

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source. **Original impact:** Normal capsule reveal loses pet/action context when it falls back to a route change.

**Repair direction:** Open the actual pairing chooser carrying the pet identity.

#### domain-d5 Balcony is never an automatic favorite place

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** Empty loves means everyone in the catalog but nobody in includes-based affinity.

**Repair direction:** Represent universal affinity consistently.

#### domain-d6 Finishing a habit on creation day leaves a missed day

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · narrow. **Original impact:** The archive-date clamp makes an intentionally empty first day remain in the evaluated lifetime.

**Repair direction:** Define an empty/exempt retirement day without fictitious completion.

#### domain-w2-d1 Calendar cannot add old flexible history

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced · new. **Original impact:** Unlogged weekly/monthly days are visually unscheduled, which the editor mistakes for not loggable.

**Repair direction:** Use edit capabilities, not glyph state, to decide actions.

#### domain-w2-d2 Open Today leaves the detail sheet in front

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · new. **Original impact:** The link neither closes the containing modal nor transfers the selected date.

**Repair direction:** Complete route, day selection and focus handoff.

#### domain-w2-d3 Saved ritual prose changes after an icon edit

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced · new. **Original impact:** The same saved P.S. changes from sleeping on a book to waiting by a door using current habit metadata.

**Repair direction:** Freeze historical routine/species IDs; treat live names deliberately.

#### domain-w2-d4 Deleting the last habit hides unrelated keepsakes

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · new. **Original impact:** A global garden.length empty gate hides still-stored badges, notes and seasons.

**Repair direction:** Give each retained section its own empty-state logic.

#### creative-cr-d1 Refused onboarding creation advances into a dead end

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · new. **Original impact:** Read-only [] is treated as a successful zero-pick result, but profile.onboarded stays false and Skip cannot complete the mounted flow.

**Repair direction:** Distinguish success from refusal; retry after ownership recovery.

#### creative-cr-d2 First capsule reload loses its cabinet choice

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · new. **Original impact:** Onboarding resumes phase first with picked=null even when a committed reveal already names a machine.

**Repair direction:** Resume the authoritative pending reveal before new choice.

#### integration-i1 Case-insensitive imports block Windows builds

**Current status:** Still present. Still present: Windows typecheck fails; test failures trace mainly to case-only module names, plus a geometry precision case.

**Original evidence:** Reproduced · platform. **Original impact:** CheckRing.tsx/checkRing.ts and Leaflet.tsx/leaflet.ts resolve to helpers for component imports.

**Repair direction:** Give helpers distinct stems; add Windows verification.

#### integration-i7 Desktop shell leaves too little content width

**Current status:** Fixed. Fixed in source: content width now accounts for the sidebar. No native-device visual certification implied.

**Original evidence:** Source · known. **Original impact:** Sidebar-adjusted width plus viewport-based percentage padding produces472px instead of720px at1280px.

**Repair direction:** Center a bounded child inside the post-sidebar area.

#### domain-d7 Tiny waterings disappear from the monthly jar

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Reproduced. **Original impact:** The jar requires count>0 although Tiny can validly complete with count0.

**Repair direction:** Choose and reuse the intended showed-up status helper.

#### creative-cr-05 Flourish copy and art disagree

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · latent. **Original impact:** Unused future announcements name a robin/new shoot/height at indices whose art is snail/trail/second shoot.

**Repair direction:** Use keyed IDs and align content before surfacing it.

#### creative-cr-d3 Onboarding secondary chunk has no recovery UI

**Current status:** Still present. Rechecked against the current source; original finding and repair direction remain applicable.

**Original evidence:** Source · new. **Original impact:** Its import failure is swallowed, leaving a choose-a-cabinet instruction without cabinets or Retry. Skip still works.

**Repair direction:** Reuse the existing load-error/retry affordance.

## Deeper second pass finding register

P1 means urgent data protection or a blocking upgrade gate; P2 means material correctness, control or continuity; P3 means a narrower behavior, promise or attribution issue. FS3, FS8 and FS10 explicitly extend original finding families. Other relationships are shown so implementation can repair shared causes once while preserving every acceptance scenario.

| Finding ID | Priority | Evidence | Relationship | Finding |
|---|---|---|---|---|
| FS1 | P1 | R201 reproduced | New regression | Disposed writer overwrites the next owner |
| FS2 | P1 Â· upgrade | R202 reproduced | New upgrade gate | Read-only rescue backup loses the newer schema |
| FS3 | P2 Â· current | R203 reproduced | Extends D5 ownership | Taking ownership resurrects a deliberately reset save |
| FS4 | P2 | R210 reproduced | New timing defect | A held write is reported as durable success |
| FS5 | P2 | R211 reproduced; other variants source | Deepens prior lifecycle risk | Import completion crosses reset or context changes |
| FS6 | P2 | Source sequence | Deepens prior delayed-read risk | File selection and actual import can disagree |
| FS7 | P2 | R205 reproduced | New validation defect | Accepted IDs create history that JSON silently loses |
| FS8 | P2 | R204 reproduced; other variants source | Extends D7 validation | Accepted state can throw during import |
| FS9 | P2 | R212 reproduced | New recovery defect | Memory-only snapshots masquerade as durable Undo |
| FS10 | P2 | R214 reproduced | Extends D2/D3 commit failures | Special Order succeeds despite failed persistence |
| UI2-01 | P2 | R209 reproduced; cross-save effect source | New lifecycle defect | Capsule auto-turn fires after unmount |
| UI2-02 | P2 | Source sequence | New cache defect | Old unopened-capsule cache outranks a replacement save |
| UI2-03 | P2 | Source sequence | New date-identity defect | A backdated count pad can switch to today |
| UI2-04 | P2 | Source focus contract | New accessibility defect | Toast actions fall outside the modal focus trap |
| UI2-05 | P2 | Source handler mapping | New cancellation defect | Touch cancellation commits dismissal or rearrangement |
| UI2-06 | P3 | R208 reproduced | New narrow interaction defect | Cancelled Stepper press eats the next activation |
| UI2-07 | P2 | Source sequence | New sidecar ownership defect | Onboarding ignores the main save ownership model |
| UI2-08 | P2 | Call-site and UI source inventory | New control gap | Older private notes lack edit and delete actions |
| HM1 | P2 | R206 reproduced | New history defect | Finish creates a shortfall in a previously closed period |
| HM2 | P2 | R213 reproduced | New boundary defect | Delete reclaims rewards a day beyond the refund window |
| HM3 | P2 | R207 reproduced | New high-count defect | Timestamp trimming changes a truthful stacking result |
| HM4 | P3 | Source plus exact probability comparison | New promise mismatch | New-first weights break literal rarity ordering |
| SHIP1 | P3 | Source plus upstream authors | New attribution correction | Castoro is credited to the wrong designer |

### Deeper impacts and repair directions

#### FS1 Disposed writer overwrites the next owner

**Impact:** A delayed after-frame callback wrote revision 3 over revision 99 after ownership had changed.

**Repair direction:** Cancel every callback and fence writes by writer generation/revision.

#### FS2 Read-only rescue backup loses the newer schema

**Impact:** A schema-2 save exported as schema 1 and was accepted for reimport; unreadable future content can export a fresh presentation state.

**Repair direction:** Export the preserved raw envelope; keep rescue and migration separate.

#### FS3 Taking ownership resurrects a deliberately reset save

**Impact:** A stale tab ignores deletion and can restore old personal history on its next write.

**Repair direction:** Adopt deletion/replacement and check schema, identity and revision before ownership.

#### FS4 A held write is reported as durable success

**Impact:** The first capsule can succeed while the Web Lock is pending and no primary save exists.

**Repair direction:** Expose acquiring ownership; await a real durable commit before reveal.

#### FS5 Import completion crosses reset or context changes

**Impact:** An import awaiting its protective snapshot can replace state after Start over.

**Repair direction:** Use cancellation and operation generations around every await and final commit.

#### FS6 File selection and actual import can disagree

**Impact:** Selecting slow file B leaves file A eligible for import; late reads can affect a new sheet visit.

**Repair direction:** Invalidate selection immediately and bind preview/import to one immutable candidate.

#### FS7 Accepted IDs create history that JSON silently loses

**Impact:** A __proto__ habit ID is accepted but its check-in is not an own serialized log entry.

**Repair direction:** Use prototype-safe maps and validate identifiers at trust boundaries.

#### FS8 Accepted state can throw during import

**Impact:** A profile date of 1e20 passes validation then raises RangeError in a normal consumer.

**Repair direction:** Validate consumed fields and supported ranges; fuzz accepted-state consumers.

#### FS9 Memory-only snapshots masquerade as durable Undo

**Impact:** After reopening, the 24-hour token remains but its recovery copy is gone.

**Repair direction:** Expose storage capabilities and promise recovery only after durable commit.

#### FS10 Special Order succeeds despite failed persistence

**Impact:** The item and pending reveal exist in memory while the save remains unchanged after quota failure.

**Repair direction:** Share a durable acquisition command with normal pulls; return accurate status.

#### UI2-01 Capsule auto-turn fires after unmount

**Impact:** The actual hook invoked pull once after its screen was removed.

**Repair direction:** Cancel the full animation chain; bind the operation to the originating save.

#### UI2-02 Old unopened-capsule cache outranks a replacement save

**Impact:** Module cache can display reward A while state contains B, then clear B on closing A.

**Repair direction:** Key pending UI by save generation and reveal ID; clear the matching reveal only.

#### UI2-03 A backdated count pad can switch to today

**Impact:** The selected day resets after backgrounding while the count pad stays open and its callback uses the new date.

**Repair direction:** Capture the occurrence date as part of the editor target.

#### UI2-04 Toast actions fall outside the modal focus trap

**Impact:** Visible Undo/Add note actions are portaled outside the active sheet and expire after four seconds.

**Repair direction:** Provide actions in the owning focus scope and a persistent accessible recovery route.

#### UI2-05 Touch cancellation commits dismissal or rearrangement

**Impact:** Sheet touchcancel delegates to release; Arrange pointercancel commits a move.

**Repair direction:** Cancel must abandon the gesture and preserve unsaved editing state.

#### UI2-06 Cancelled Stepper press eats the next activation

**Impact:** After pointercancel, the stale suppression flag ignores a keyboard-like click.

**Repair direction:** Reset pointer state on every terminal path; test mixed input.

#### UI2-07 Onboarding ignores the main save ownership model

**Impact:** The localStorage sidecar can be rewritten by a stale read-only tab and is not synchronized.

**Repair direction:** Bind onboarding to the authoritative profile generation and ownership.

#### UI2-08 Older private notes lack edit and delete actions

**Impact:** History can display or star old notes, but the only editor is reached through the short Today date strip.

**Repair direction:** Add deliberate history note editing/deletion with date and habit context.

#### HM1 Finish creates a shortfall in a previously closed period

**Impact:** A safely cut flexible period changes after Finish; ordinary Archive was tested and refuted as the trigger.

**Repair direction:** Freeze past rule boundaries when retiring; assert unrelated history is unchanged.

#### HM2 Delete reclaims rewards a day beyond the refund window

**Impact:** At exactly seven days, deletion removes coins and sunshine that the six-day undo policy should preserve.

**Repair direction:** Align retention and refund boundaries; test adjacent dates.

#### HM3 Timestamp trimming changes a truthful stacking result

**Impact:** A 25-count anchor loses its first stamp under the 24-stamp cap, invalidating a follow-up done in order.

**Repair direction:** Retain canonical ordering evidence separately from bounded detail stamps.

#### HM4 New-first weights break literal rarity ordering

**Impact:** An unowned Rare item can be more likely than an owned Special item. The dynamic odds display is correct.

**Repair direction:** Clarify tier weights versus per-item odds; do not claim an RNG implementation bug.

#### SHIP1 Castoro is credited to the wrong designer

**Impact:** About credits Tiffany Wardle; upstream names John Hudson, Paul Hanslow and Kaja SÅ‚ojewska.

**Repair direction:** Correct credit and verify licenses/notices in final distributed artifacts.

## Shared repair families and dependencies

This is sequencing guidance, not a substitute for Opus's current-code design review.

| Family | Findings to carry together | Planning consequence |
|---|---|---|
| Durable writes and recovery | Original D1–D6, D8, D10–D12; FS1–FS5, FS9, FS10 | Define read/write availability, pending versus committed state, retry, ownership generations and transactional replacement before adding an asynchronous native adapter. Preserve rescue/export from future schemas. |
| Input and state validity | Original D7; FS7, FS8; import size/decompression risks | Validate consumed known fields and dates, protect dictionary keys, bound resource use, preserve explicitly allowed forward-compatible catalog IDs. |
| Operation and context identity | FS5, FS6; UI2-01, UI2-02, UI2-03, UI2-07; original pending-reveal/onboarding failures | Bind work to a save generation, item/reveal identity, editor occurrence date and cancellation lifetime. A generic loading flag is insufficient. |
| Historical invariants | Original domain arithmetic, compaction, provenance, date and calendar findings; HM1–HM3 | Preserve historical facts under compaction, preferences, unrelated edits, Finish and delete. Pair each repair with boundary/retention tests and a migration decision. |
| Accessible complete journeys | UI2-04–UI2-06 and UI2-08; lazy-host failures; navigation/feeding/quiet-mode findings | Evaluate complete user tasks, including focus, timeout, cancellation, old-note control, context transfer and load recovery. |
| Earned creative continuity | Plant presentation, friendship promises, feeding, Balcony, flourish-copy and HM4 | Repair actual adapters and truthful copy before adding more content or rarity. Keep reduced-motion meaning intact. |
| Native and paid release | IOS1–IOS5, SUB1–SUB3, GLOBAL1, ACCESS1, SHIP1 | Treat native feasibility, subscriptions and territory/privacy decisions as a distinct release track after the foundational invariants. |

Do not implement a sweeping rewrite simply because several findings share a boundary. Propose the smallest coherent architecture that fixes all reproduced variants, respects the deterministic domain and supports the planned native target. Migration, recovery and data retention must be designed before altering the persisted schema.

## Complete second pass technical and product findings

The following four detailed reviews contain the evidence, sequences, attempted refutations, repair guidance, acceptance tests, retained risks and useful product opportunities. References in these sections use the second-audit pin unless otherwise specified.

### Persistence ownership import recovery and validation

**Source context:** [c66f588](https://github.com/wktw/lookwhaticando/commit/c66f5880776c08e2c687922a3ec3a3206595c8da).

### Second audit: persistence, ownership, imports, recovery, validation and identity

Pinned source: `c66f5880776c08e2c687922a3ec3a3206595c8da`, isolated `work/lookwhaticando-audit2`. These are read-only findings. This leaf changed no repository files, ran no repository tests, installed nothing, and touched no real browser data. Root owns independent synthetic reproductions and the final evidence labels. Earlier evidence in `work/audit/findings/data.md` remains intact. Unless explicitly updated below, “source-confirmed” means a traced source path, not a reproduced browser failure.

#### Assessment

The new performance work improves responsiveness, and backup marking now happens after successful clipboard/share delivery rather than before it. The store's failure boundaries still need a single consistent ownership and durable-commit model. In particular, moving saves after the frame introduced a fresh stale-writer regression: disposing a queue no longer prevents all of its outstanding callbacks from writing. The export route also bypasses the newer-schema protection which the hydration route carefully applies.

An eventual paid native application raises the importance of these issues. Personal history must remain readable and exportable when a subscription ends, and restoring that history must not restore or rewind a subscription entitlement. Those are future architecture requirements; no subscription implementation exists in the audited source. The user has indicated an adult audience, a subscription with a 14-day trial, and no microtransactions. Nothing here assumes paid capsule currency, trading, competitive anti-cheat, or a need to police harmless edits to a private collection.

#### New findings and deeper extensions

##### FS1 — P1: A disposed writer can overwrite the new owner's save from its delayed frame callback

**Status:** New regression since the first audit; independently reproduced by root as R201 in `work/audit2/repros-new.test.ts` (result in `repros-new.log`). The disposed callback overwrote revision 99 with revision 3. Current runtime, not a hypothetical future schema.

**Evidence:** `src/state/persist.ts:269–280` schedules `afterFrame(() => this.flush())` against the queue instance. `dispose()` at `:338–341` only cancels the debounce handle. It leaves `pending` intact and never marks the queue disposed. When a granted Web Lock is stolen, `src/state/store.ts:411–414` disposes the queue and drops the global reference. The already scheduled callback retains the old instance and can still write. `browserAfterFrame` at `store.ts:128–140` also deliberately schedules a 100 ms timer fallback, so canceling a browser frame alone would not suffice.

**Scenario:** Tab A checks in, updating memory and queuing its urgent save after the frame. Before that callback runs, B chooses Use here, obtains the lock and saves a newer state. A receives the lock rejection, becomes read-only and disposes its queue. A's captured callback runs before the separate storage event is delivered: it writes A's old state over B's save. Both revision and contents can move backward. The adoption path's `discardPending()` protects the case where the storage event arrives first; it does not protect this ordering.

**Minimal reproduction:** Use `fakeBrowser`/`fakeLocks`, hydrate an owned onboarded save and flush it. Replace runtime `afterFrame` with a callback capture. Check in a real habit. Call `locks.stolen()` and await its rejection handler. Write a different owner's envelope at revision 99 without yet firing the storage event. Invoke the captured callback. Assert that revision 99 and the other owner's profile are overwritten. A narrower queue test, `saveSoon → dispose → callback`, confirms the underlying issue but does not alone show the user journey.

**Refutation:** Ordinary pagehide flushes, refused-lock startup, and storage-adoption tests do not cover this sequence. A successful earlier flush makes the callback harmless, but that is precisely what this race lacks. No assumption of simultaneous JavaScript execution is needed; task ordering suffices.

**Repair:** Disposal must invalidate every queued callback and discard pending work. Fence each write with a writer/queue generation and ownership state. Test lock loss both before and after a frame, before and after storage-event delivery, and after hydrate/reset/demo queue replacement. The invariant is that a retired writer cannot modify any authoritative save.

##### FS2 — P1 before schema upgrades: “Save a backup” from a newer-version read-only save downgrades or fabricates its content

**Status:** New future-upgrade defect; independently reproduced by root as R202: schema-2 input exported as schema 1 and accepted for reimport. It requires a newer schema to exist. This is separate from prior D5's unsafe Use here path. The incompatible-future-state variant below remains source-confirmed, not separately executed.

**Evidence:** `src/state/persist.ts:135–138` checks whether a newer save can be displayed by spreading its state and overriding `version` with the current schema number. Hydration uses that presentation object at `store.ts:450–454`; if it is not readable, it substitutes a fresh initial state. `ownSave()` at `:842–846` returns the current in-memory state outside demo, and `backupJson()` at `:849–850` passes it to `makeBackup`, which sets the backup's version from that object's version (`handoff.ts:31–32`). You intentionally leaves Save/Copy backup available in read-only mode (`DataSection.tsx:266–267`).

**Scenario:** A user opens a schema-2 save with the old schema-1 app and sees the protective read-only banner. They sensibly make a backup before troubleshooting. If the state is readable, the backup is stamped schema 1 and can be imported by this old app; the newer-version guard is bypassed. If it is not current-readable, the export contains a fresh empty profile instead of the original protected bytes. The main save remains unchanged during export, but the purported rescue artifact is wrong.

**Reproduction:** Seed a future envelope with `state.version = 2`, hydrate, confirm `readOnly === 'newer-version'`, then inspect `backupJson()`: both `v` and `state.version` become 1. `parseBackupText()` now accepts this exported file. Repeat with a future state whose wallet is incompatible with v1: the raw disk envelope is protected while the exported profile becomes empty.

**Refutation:** Retaining unknown fields in the readable object does not make downstamping safe. Their semantics and required migrations remain unknown. CSV may reasonably be a partial readable export if labeled as such; a full backup must not pretend to be faithful when it is not.

**Repair/acceptance:** Retain the original newer envelope separately and provide byte-preserving rescue/export with its original version. Never export a fallback presentation state as the user's full save. Test readable and unreadable future schemas, then round-trip the rescued bytes through the actual newer decoder when that version exists.

##### FS3 — P1/P2: A reset in one tab can be silently undone by taking ownership in an old tab

**Status:** New present-day consequence of prior D5's incomplete adoption logic; independently reproduced by root as R203. Consolidate with the unsafe ownership/adoption family rather than counting all variants as independent causes. Lower-revision replacement is source-confirmed but was not separately reproduced.

**Evidence:** Reset removes `catkin:*` and sets a new in-memory state (`store.ts:984–991`). The other tab's storage handler only adopts when `peekRev` is non-null and greater than its current revision (`:478–483`); deletion produces null, so it is ignored. `useHere()` at `:490–496` handles only the `ok` load result. With an empty save it creates a revision-0 queue but keeps the old state, clears read-only and steals ownership. Its next normal mutation saves the old history again.

**Scenario:** A has deliberately started over. B was an old read-only tab with the prior habits and notes. B receives the deletion event but still displays the prior save. Use here followed by any edit resurrects it. Even after A creates a new profile, a read-only queue with a larger old revision can ignore the new profile's lower revision until an explicit takeover reload.

**Minimal reproduction:** Seed an onboarded old profile at revision 5; hydrate with `fakeLocks({byOther:true})`; delete `SAVE_KEY` and fire its storage event; choose Use here, edit name and flush. Assert that the original habits return to disk. Repeat reset→new profile at revision 1 to test generation changes rather than only monotonic revisions.

**Refutation:** A user may intentionally want to recover an earlier save. That should be an explicit restore operation with a preview, not an undocumented side effect of choosing which window owns the save. Snapshot retention after reset is already disclosed and intentional; this finding concerns the primary save being resurrected.

**Repair:** Give saves an identity/generation separate from write revision. Adopt deletion/new-generation events and re-read authoritative state after ownership is actually granted. Handle empty, corrupt, newer and successful loads explicitly in every adoption path. A writer takeover must not infer permission to restore stale personal data.

##### FS4 — P2: Held writes are reported as saved, so an uncommitted first capsule can be revealed

**Final independent verification:** R210 passes against the actual store: a held lock permits a successful free pull before any primary save is written; refusal discards the pending write. Synthetic in-memory reproduction, not a real multi-tab browser session.

**Status:** New inspection of an existing startup/takeover edge; independently reproduced by root as R210. Current code; practical frequency depends on lock callback latency.

**Evidence:** `SaveQueue.saveNow()` returns `flush() ?? 'saved'` (`persist.ts:257–260`). A held queue's `flush()` returns null (`:302–308`). While Web Locks is awaiting its callback, `readOnly` remains false and domain actions are accepted; the queue alone is held (`store.ts:468–475`, `:384–401`). `pull()` only rolls back for `storage-full` or `unavailable` (`:678–693`). Refusal then discards the uncommitted pending state.

**Scenario/reproduction:** Use a LockManager whose request callback is deferred. Hydrate, then complete onboarding and call the free `pull('cats', {free:true})` before the callback answers. The result reports success and can be displayed although `SAVE_KEY` has not been written. Resolve the lock with null: the queue discards the pending pet, and a reload has no such acquisition. A later granted lock followed by write failure similarly arrives too late for the successful pull result to communicate the failure.

**Refutation:** The common browser lock answer is quick, and normal unheld pulls already have a useful rollback path. That is a timing mitigation, not the promised commit-before-reveal guarantee. A test which always grants the lock synchronously cannot establish the invariant.

**Repair:** Represent acquiring ownership as a real non-writable state or make durable commands asynchronous and await acquisition plus persistence. Do not collapse queued/held into saved. Preserve an accessible loading/retry state for the first meaningful action.

**Related ownership hole:** Hydration calls `snapshotToday()` while the lock can still be pending (`store.ts:486`); its guard consults the optimistic `writable()` flag rather than confirmed ownership (`:369–377`). Backups/theme/quarantine sidecar writes also occur before acquisition. Require writer ownership for snapshot replacement and authoritative recovery metadata, not merely the main queue.

##### FS5 — P2: Asynchronous replacement operations can outlive cancellation, reset, demo changes or ownership

**Status:** Deeper concrete extension of the prior import lifecycle risk. Independently reproduced by root as R211: defer the pre-import snapshot, reset, then resolve it; the stale import replaces the reset state. Demo and ownership variants remain source-level analysis.

**Evidence:** `applyImport` checks demo/writability at entry (`store.ts:920–923`), then awaits parsing and snapshot creation before writing metadata and replacing the state (`:925–932`). Undo and restore similarly check before awaiting snapshot reads/writes (`:941–948`, `:957–963`). No operation token, state identity, writer generation or cancellation signal is checked at commit. `replaceState()` updates state before its persistence attempt (`:350–359`). `ImportSheet` leaves the close/Keep button active and has no unmount cancellation (`:150–165`, `:173–185`).

**Concrete sequences:**

1. Begin import with `snapshots.put` deferred; close it, choose Start over, then resolve the put. The old operation applies the imported state after the deliberate reset.
2. Begin import; close and enter demo; resolve the old snapshot operation. The replacement targets the now-current demo namespace and displays real imported content there. This is a local namespace/isolation error, not outbound disclosure.
3. Begin undo/restore; another window obtains ownership; resolve the read. The operation replaces displayed memory and reports success even though `persist()` refuses to write. A later action can interact with state the user was not authorized to commit.

**Refutation:** An import is allowed to replace the save, and a concurrent ordinary edit made after approving an import may legitimately be superseded if the UI clearly freezes or defines that boundary. These sequences are more specific: explicit cancellation/reset/context switches or lost ownership happen after the original authorization. The UI currently gives no indication that closing leaves a commit in flight.

**Repair/acceptance:** Serialize wholesale replacements, capture source/target identity and ownership generation, and define an explicit commit point. Abort pre-commit work on cancellation or generation changes; disable conflicting commands only while unavoidable commit is underway. Assert that no deferred completion crosses reset/demo/ownership boundaries and that cancellation does not consume an Undo token. Use the same epoch to invalidate relevant UI caches; the interaction leaf examines stale capsule state separately.

##### FS6 — P2: The selected file can differ from the file imported, and old reads can affect a reopened sheet

**Status:** A concrete refinement of the first audit's general delayed-read risk; source-confirmed, not yet a browser reproduction.

**Evidence:** `ImportSheet.tsx:132–145` waits for the newly chosen file text before changing `pending`, clearing text or calling `describe`. Until then, the old preview and old `pending` remain. `source()` at `:148` returns that old file. The run generation at `:102–109` only orders already-started preview calls, not file/clipboard selection, opening or closing. The open reset at `:93–100` neither increments run nor clears `pending`. `take` accepts any completed clipboard request (`:118–127`).

**Scenario:** A is selected and previewed. B is selected from a slow file provider; before its text arrives, the Import button and A's source remain active. Tapping Import applies A even though the latest file choice was B. Two reads resolving out of order can make the older choice win. Close/reopen also leaves delayed work eligible to modify the fresh visit.

**Refutation:** The displayed preview may still identify A, reducing surprise for attentive users. The app should nevertheless invalidate an obsolete selection immediately and never make completion ordering decide which file the user chose.

**Repair/acceptance:** Assign a generation at the beginning of every file/clipboard/open action, clear preview and pending immediately, and show reading state. Bind import to an immutable validated candidate (text/hash/source/preview), not whichever ref happens to be current. Test A slow/B fast and A previewed/B pending→Import, then close/reopen before resolution.

##### FS7 — P2: Accepted identifiers can turn a normal log write into non-serializable prototype state

**Status:** New validation boundary defect; independently reproduced by root as R205: an accepted `__proto__` habit check-in produced no own serialized log entry. Limited to modified/corrupt/imported data because normal generated habit IDs do not use these names. No remote-code-execution or global prototype-pollution claim.

**Evidence:** Habit IDs are constrained only to a nonempty string without `|` (`validate.ts:83`). Maps are ordinary `{}` objects (`defaults.ts:35–41`). `Tx.logs()` at `domain/tx.ts:99–102` reads `all[habitId]` and assigns to it with bracket notation. For the accepted id `__proto__` and an absent own log entry, that read sees the inherited prototype; assignment changes the new map's prototype rather than defining a JSON-serializable own key. `writeLog()` then stores the day in that prototype (`logging.ts:68–72`). Ledger reads likewise trust ordinary bracket lookup.

**Reproduction direction:** Start with a valid daily habit whose id is changed to `__proto__`, no logs, and empty per-habit ledgers. Confirm validation accepts it. Record a note or history log through the actual reducer; compare the visible `s.logs[id][day]` against `JSON.parse(JSON.stringify(s)).logs`. A note/history action avoids unrelated growth math hiding the serialization issue; use `setNote` or a non-rewardable history edit if a full check-in throws. Also test `constructor` and `toString` for inherited-value confusion.

**Refutation:** JSON.parse itself does not mutate the global prototype, and immutable copying limits the scope. The bug is the later trusted map operation on an identifier the validator accepted. It remains material because import is advertised as validated and personal notes must survive serialization.

**Repair/acceptance:** Use null-prototype maps or own-property reads plus safe property definitions consistently, and disallow reserved names if that is compatible with the ID contract. Require accepted states to survive a mutate→serialize→reload round trip. Include adversarial map keys without overstating the security impact.

##### FS8 — P2: Validation accepts more values which fail immediately in ordinary consumers

**Status:** Extension of prior D7, not a separate umbrella finding. Root independently reproduced the accepted `profile.createdAt = 1e20` state followed by `applyImport` throwing, as R204. Other source-confirmed minimal examples below supplement the original `stems:7` reproduction; they were not all executed.

| Accepted value | Accepting path | Failing consumer / consequence |
|---|---|---|
| Finite `profile.createdAt = 1e20` | `validate.ts:295` only requires nonnegative finite number | `appDayKey` receives an invalid JavaScript Date; profile/letter/anniversary dates can throw. Test with an onboarded state and a forced new day so the intended consumer actually runs. |
| `monthly.month = '2026-99'` | `validate.ts:167` checks shape only | `features/rituals/words.ts:153` calls `monthIndex`, which throws for month 99. |
| Weekly `quote = {text:7}` | `checkLetter` never checks quote | `features/rituals/words.ts:137` calls `n.quote.text.trim()` and throws. |
| Weekly companion P.S. with valid petId but unknown timeOfDay | `validate.ts:165` checks only string kind/petId | `words.ts:97` destructures `noun[timeOfDay]`, which is undefined; with valid pet/habit and positive days the rendered note crashes. |
| Backup `exportedAt = 1e20` | `handoff.ts:177` accepts any number | `ImportSheet.previewLine → you/when.ts:4–7` formats an invalid Date and throws before import. This is envelope metadata, so state validation cannot catch it. |
| Envelope `rev = 1e309` in JSON | `persist.ts:147` accepts any number | JSON.parse produces Infinity; revisions cannot advance meaningfully and subsequent stringify writes null. Reject non-finite, unsafe or negative revision metadata. |

Other gaps include unconstrained note/name lengths on imported data, unvalidated known letter discriminants/fields, invalid optional look evidence, and anchor cycles/archived anchors accepted by the import validator. Do not count every missing guard as an independent user bug: stackOrder is intentionally cycle-safe and unknown catalog IDs are an explicit compatibility feature. The important contract is that accepted states must safely execute supported selectors, renderers, mutators, export and reload.

**Repair/acceptance:** Validate consumed known fields with complete discriminated unions, calendar/timestamp ranges and domain-aligned numeric limits. Validate envelope metadata too. Add an accepted-state consumer property and a bounded adversarial corpus, not only a handpicked “known invalid” list. Keep unknown-field/catalog compatibility deliberate and distinct from missing known-field validation.

##### FS9 — P2: The IndexedDB fallback promises durable Undo using a memory-only copy

**Final independent verification:** R212 passes: with persistent main storage and a fresh memory-only snapshot adapter on reopen, the durable token still makes canUndoImport true while undoImport returns false because the promised copy is gone.

**Status:** New recovery-capability mismatch; independently reproduced by root as R212. Conditional on IndexedDB being absent/unavailable through the runtime adapter, not a claim that normal iOS lacks it.

**Evidence:** `indexedDbSnapshotStore()` returns null if there is no API (`snapshots.ts:109–111`). `store.ts:202` silently replaces null with `memorySnapshotStore`. `snapshotCurrent` then reports a normal id and `applyImport` writes a durable Undo token (`:910–930`). The no-undo confirmation is bypassed because the memory write succeeded. On a new runtime the memory records are gone, while the localStorage token and 24-hour promise remain.

**Scenario:** Main localStorage persists normally but the snapshot adapter is null. Import A over B. It reports ordinary success and offers Undo for 24 hours. Reload: Undo is still advertised from the durable token, but cannot find B. The same fallback lets Daily copies appear persistent until reload.

**Refutation:** Memory adapters are excellent test fixtures and can preserve an in-session emergency copy. They are not equivalent to durable recovery. The existing no-undo flow already provides the right concept when persistent snapshot writes reject; the fallback prevents that flow from seeing the missing capability.

**Repair/acceptance:** Model snapshot persistence capability separately from the adapter API. Treat memory-only copies as session undo with accurate wording, or require the existing explicit no-durable-undo confirmation. Test storage-present/snapshots-null import, reload into a fresh snapshot adapter, and the resulting recovery affordance.

##### FS10 — P2: Special Order uses the generic success path even when its forced save fails

**Final independent verification:** R214 passes: a quota failure for the primary save leaves disk unchanged while wish reports success and memory holds the granted item and pending reveal. This extends the previously identified durable-save family; it is not counted as a separate umbrella cause.

**Status:** Deeper instance of prior D2/D3's commit/result mismatch; independently reproduced by root as R214. Consolidated as an extension of durable command results, not a separate umbrella cause.

**Evidence:** `store.pull()` explicitly inspects save status and rolls back on failure (`store.ts:677–694`), but `wish()` uses generic `act` (`:700–702`) which ignores persistence status (`:319–333`). `domain/gacha.ts:422–436` spends stamps, grants an item and creates a pending reveal. The store attempts a forced write because pendingReveal changes, but its result is not checked. `SpecialOrder.tsx:170–195` treats the result as success and opens the reveal.

**Scenario:** With a persisted save containing enough stamps, cause `setItem(SAVE_KEY)` to fail, then order an unowned item. The app displays the new acquisition and reduced stamp balance, while reload restores the old balance and loses that shown acquisition. This is not the paid random microtransaction scenario; stamps are currently earned in-app.

**Repair/acceptance:** Give every commit-before-reveal command the same durable result/rollback semantics, including orders and pending reveal completion where appropriate. Inject quota and non-quota failures, assert no successful reveal is handed to the caller before its acquisition is reloadable, and verify recovery does not duplicate the action.

#### Prior data findings reconciliation (D1–D12)

| Prior ID | Status at c66f588 | Current evidence and qualification |
|---|---|---|
| D1 full readable store becomes volatile fresh save | Remains | `persist.ts:77–87`, `store.ts:200–202`, hydration still substitutes memory. StatusRow still has no volatile state. |
| D2 failed saves are no longer pending | Remains | `persist.ts:302–314` clears pending before write and never restores it. New frame delay introduces FS1, not a retry fix. |
| D3 import/undo/restore false durable success | Remains | `store.ts:350–359,920–932,941–949,957–963`; wrappers trust results. |
| D4 request success precedes IDB commit | Remains | `snapshots.ts:101–105,122–135` still drops transaction completion/abort. Root's prior primary-source API citation remains applicable. |
| D5 older tab takeover overwrites newer schema | Remains, broader | `store.ts:419–424,490–496`; FS2 adds unsafe rescue export; FS3 adds present-day empty/reset adoption. |
| D6 blanket defaults hide missing core data | Remains | `migrate.ts:29–41,59` still fills original core sections before validation. |
| D7 accepted state crashes consumer | Remains, broader | `validate.ts:150–176`, `views/pets.ts:375–377`; FS7/FS8 provide new classes. |
| D8 restore ignores failed protective snapshot | Remains | `store.ts:961` catches failure and proceeds; no exact restore Undo token is installed. |
| D9 epoch-hour truncation in fractional zones | Remains in source | `selectors.ts:40–45` unchanged. History/math leaf owns the deeper worldwide/time review; do not duplicate its register. |
| D10 corruption/non-quota error lacks normal recovery explanation | Remains | Normal App/Data status still only explains quota/ownership/newer schema; loadIssue remains diagnostics-only. No fresh browser reproduction claimed here. |
| D11 no-undo import offers wrong/stale Undo | Remains | `store.ts:930` only writes when a new id exists; it does not clear old token otherwise. ImportSheet's success toast remains unconditional. |
| D12 snapshot I/O errors look empty or strand controls | Remains | `DataSection.tsx:93–112`, Undo handler `:249–251`, `ImportSheet.tsx:59–65` unchanged failure handling. |

**Changes which are real fixes:** The cancelled-share / failed-copy backup receipt problem is fixed for the current You/Install UI call sites. `DataSection.tsx:220–240` and `InstallSection.tsx:29–36` now use non-marking generation and call `markBackup()` after a successful delivery result. Manual-copy fallback does not claim successful copying. The lower-level legacy `exportData/exportPayload` still mark immediately; tests call them, but I found no remaining production screen consumer. Treat UI cancellation marking as fixed, not as an open user-facing defect. Successful browser download triggering is still not a proof that the user retained the file; that is a bounded API/platform receipt distinction, not a reason to undo this improvement.

Import preview now counts live habits, matching the profile, while archived history still travels in the file (`handoff.ts:195–198`). This resolves the noted count inconsistency. The readable/held queue additions predate or accompany the current changes and protect the tested refusal/adoption cases; they do not resolve all ownership states above.

#### Further release and platform gates, not claimed current regressions

1. **Migrate internal snapshots too.** Main load/import use migrate→validate. Undo/restore directly validate the stored snapshot (`store.ts:946,960`), so a future SCHEMA_VERSION bump rejects all old-schema internal snapshots even while their metadata remains listed. Route every historical state through an explicit common decoder/migration pipeline. Keep schema fixtures and test old external backup, old local main, old daily snapshot, active Undo and partial newer rescue together.
2. **Recover the actual IndexedDB adapter after failures/upgrades.** Its cached opening promise is never cleared after rejection (`snapshots.ts:112–120`), so a transient open failure makes all future attempts fail for that page lifetime. There is no connection `versionchange`/close strategy or blocked-open handling for a future database upgrade. These should be tested using the browser adapter, not only the memory store. No claim is made that the current fixed-v1 database is already blocked by an upgrade.
3. **Bound input and processing before allocating it all.** File reading buffers the whole file (`you/files.ts:123–133`); CK1 decoding allocates base64 bytes, a fully decompressed Response buffer and a full parsed object (`handoff.ts:101–103,122–147,156–190`). There are no file/expanded-byte/item-count/string-length limits. A small compressed accidental or hostile import can exhaust phone memory before validation. Use generous documented byte/object limits, stream decompression with a running limit, and make validation cancellable where it can be expensive. This is a local-input denial-of-service risk, not a demonstrated network exploit.
4. **Size and latency fixtures must include personal writing.** The earlier five-year fixture's sparse short notes does not establish capacity for note-heavy users. Twelve daily habits × 365 days × five years × 280 note characters is over 6.1 million note characters before state overhead, copies or encoding. Measure save serialization/write latency and quota behavior on chosen iPhones, not just warm selector timings. Preserve user writing; do not silently prune it to meet a budget. A native transactional store can be introduced behind the existing pure domain without changing its visual identity.
5. **Content identity and ownership must survive container migration.** A native wrapper, PWA and Safari tab must not assume shared storage or silently choose the newest wall-clock timestamp. The current artifact has no stable save/profile identity or generation, and manual import is replace-only. A migration receipt should identify the source, captured revision, target identity, successfully committed bytes, and available rollback. Root owns current Apple/API verification and the native architecture choice.
6. **Subscription state is not user content.** Keep verified StoreKit entitlement/trial state separate from this replaceable, editable, intentionally portable save. Do not make habit snapshots a subscription authority. Specify post-expiry read/export/recovery behavior before the paywall is built. Avoid an account requirement solely to repair data durability unless the product explicitly chooses sync.
7. **A deliberate erase-all-copies operation is still needed for device handoff if that is supported.** Current Start over intentionally retains IndexedDB copies and now discloses that fact. Do not call the retention accidental. A separate deletion operation must include current/backup/corrupt/demo/snapshot/Undo/onboarding metadata and any future native storage, and report failures honestly. It need not be the default reversible reset.

#### Grounded utility improvements

- **Recovery preview based on actual differences:** show newest/oldest dates, which habits/notes/history would disappear, and a concrete durable Undo receipt. Counts alone cannot distinguish similarly sized saves. This naturally follows from serialized replacement and identity work.
- **First external-backup assistance:** the nudge intentionally never prompts a never-backed-up user (`DataSection.tsx:55–58`, pinned in tests). After meaningful history accumulates, offer one quiet explanation and a preview/test-restore route. This is an opportunity, not an accidental missing branch. Subscription expiry should not be the first time a user learns how to take their history away.
- **Human-readable private history export:** JSON preserves the application but current CSV only provides counts/status. A user-selected notes/journal export with dates, stable habit identity and historical rules gives personal writing a useful future outside this app. Keep private notes out of general share cards, telemetry and diagnostics unless deliberately selected.

#### Refutations and boundaries

- CSV already defuses leading `=`, `+`, `-`, `@`, tab and carriage return in strings (`domain/profile.ts:154–159`). I did not report an ordinary CSV formula-injection bug.
- iCalendar text already escapes backslash, semicolon, comma and CRLF/LF, and folds UTF-8 safely. A speculative lone-control-character parser issue was not elevated without a concrete supported-client reproduction.
- No automatic outbound transfer, arbitrary code execution or private-note HTML rendering was found in the reviewed data path. The observed `innerHTML` use is in controlled confetti art, not an established path from imported notes.
- Unknown collectible IDs are intentionally forward-compatible. Invalid known fields and unsafe map identifiers are distinct from that intended tolerance.
- The stack renderer is cycle-safe; accepted anchor cycles do not by themselves prove infinite recursion. Large chain depth and large arrays belong in bounded-input testing.
- Snapshot rewind and private local economy edits are not meaningful competitive security issues in this offline single-player product. Subscription entitlement integrity is a separate future boundary.
- Existing successful normal-path tests and newer Linux CI are valuable. They do not demonstrate disk-failure, browser task-ordering, a native WKWebView persistence guarantee, or real iPhone background termination.

#### Coverage and four passes

**Pass 1 — Complete relevant boundary review:** reread store, persist, snapshots, migrate, validate, handoff, defaults, selector clock binding, profile export functions, transaction map accessors; full You data/import/files/install/diagnostics/lock paths and onboarding progress/flow entry points. Read current source changes from the first audit baseline, NOTES-w2-you, relevant design data/platform/privacy contracts, and prior D1–D12 findings. Inspect state fixtures, persistence/store/handoff/validate/stage4 tests and relevant adversarial persistence tests; source-search all storage writers and outbound/dynamic-code sinks.

**Pass 2 — Expert sequence review:** trace granted/refused/pending/stolen lock states, after-frame/debounce ordering, reset/revision generations, newer-version display/export, whole-state async operations, no-undo handling, null/failed snapshot adapters, accepted values into consumers, and personal-history growth. Consider prospective native storage and subscription boundaries separately from today's browser code.

**Pass 3 — Refutation:** check adoption's discardPending protection, normal pull rollback, intentional memory fixtures and unknown catalog tolerance, disclosure of retained snapshots, tested clipboard marking improvement, intentionally quiet backup nudge, safe CSV/ICS escaping, immutable transaction copying and cycle-safe stack order. Source-confirmed candidates were sent to root for independent reproduction; this leaf did not execute them.

**Pass 4 — Consolidation and evidence polish:** preserve old IDs and status, mark actual UI fixes, distinguish new regression from existing root causes, bound timing/future-upgrade conditions, identify minimal tests and acceptance invariants, and avoid treating all validation omissions as separate exploits. Root may merge FS3/FS8/FS10 into existing register families to avoid inflating the total.

No App Store policy conclusion is based on this leaf alone. Root owns up-to-date primary Apple sources, subscription rules and native release readiness; platform behavior without an actual device remains unverified.


### Interaction accessibility continuity and creative utility

**Source context:** [c66f588](https://github.com/wktw/lookwhaticando/commit/c66f5880776c08e2c687922a3ec3a3206595c8da).

### Second audit: interactions, accessibility, continuity and creative utility

Pinned source: `c66f5880776c08e2c687922a3ec3a3206595c8da`, inspected in `work/lookwhaticando-audit2`. Earlier findings were checked against `work/audit/findings/creative.md` and `integration.md`; nothing in those artifacts was overwritten. All source and GitHub work remained read-only. This leaf wrote only this audit note. No tests, dependency installation, browser interactions with real data, or native device testing were performed by this leaf. Root owns independent reproductions and Apple policy research.

#### Assessment

The deeper pass finds the most consequential weaknesses at boundaries: an animation continuing after its screen has gone; a cached reward outliving the save it came from; an editor silently changing which date it edits; an action offered visually outside the keyboard's modal focus scope; and onboarding progress outside the main save's ownership model. These are more important to an iPhone release than adding motion or collectible breadth. Mobile use involves frequent suspension, interrupted gestures, screen changes and restoration. The existing pure domain boundaries are a good foundation, but the UI needs a similarly explicit definition of which save, date and interaction each continuation belongs to.

The project's creative promise remains strong: a useful record of ordinary actions becomes a home with recognisable plants and animals. The best new utility is better access to the user's own history, continuity of the things already earned, and fewer steps between an intention and its completion. None of the recommendations below requires a talking mascot, competitive streaks, more random reward pressure, or invented psychological insights.

#### New findings

##### UI2-01 — P2: a capsule auto-turn can spend after its screen has unmounted

**Evidence level:** Independently reproduced by root in synthetic jsdom test R209 (`work/audit2/interactions.test.tsx`; passing output in `work/audit2/repros-new.log`). The test mounts the actual `usePull` hook, reaches ready, starts auto-turn, unmounts, advances controlled animation frames, and observes exactly one call to an injected pull callback after unmount. The callback returns a refusal; no real user state or actual spending is involved. The replacement-save consequence remains source-level analysis. Not a physical-device reproduction.

**Trigger:** Insert payment, start the automatic handle turn, and immediately switch to another application tab before the handle reaches its commit angle. The tab bar is still available. The unmounted hook's animation frame callbacks continue advancing the ratchet, eventually calling the global store's `pull`. The same callback can execute after a demo/import/reset has replaced the state if that transition happens before completion.

**Sources:** `src/features/capsules/usePull.ts:180–199` schedules the auto-turn and its recursive frames; `:94–108` calls `complete` on the target angle; `:224–235` performs the domain pull; `:324–330` unmount cleanup clears only the nudge/open timers. `:201–220` also starts an uncancelled finishing frame loop. `:254–268` continues asynchronous drop work after awaits and can schedule a fresh open timer after cleanup has already happened. `src/app/TabBar.tsx:15–22` routes normally without consulting cabinet busy state; `src/app/ScreenHost.tsx:87–95` keys and unmounts the route content.

**Impact:** An interaction from a departed screen can charge currency and create a pending reward. The replacement-save case is especially unsafe conceptually: an old interaction is applied to the currently global state, rather than the state in which it began. This does not imply duplicate payouts or a server exploit; the domain still checks affordability and pending reveals. It is an ownership/lifecycle defect.

**Refutation:** Committing before the drop animation is correct and should remain. The issue is the separate pre-commit auto-turn continuing after unmount, and post-commit callbacks updating a dead interaction. Clearing `run.openTimer` does not cancel already queued RAF callbacks or prevent a later async continuation from creating a new timer. A carousel `busy` flag prevents carousel navigation, not switching app tabs.

**Repair direction:** Track and cancel every frame/timeout and invalidate awaited continuations on cleanup. Give an interaction a generation tied to both its mounted owner and current save identity. Before commitment, interruption should cancel without spending (or an explicitly defined app-owned action must finish in the same save). After commitment, preserve the authoritative pending reward and resume it through one recovery owner.

**Acceptance:** Start an auto-turn, unmount before its target, advance all frames: no new pull. Repeat after switching demo/real state and after import/reset; no action is written into the replacement save. Separately unmount after a successful commit: the same item remains recoverable, one charge only, with no dead callback opening a modal or changing busy state.

##### UI2-02 — P2: the in-memory unopened-capsule cache survives save replacement and can supersede the real pending reward

**Evidence level:** High-confidence source sequence; root asked to reproduce. Separate from prior I3's inactive cabinet recovery bug.

**Trigger:** Commit a capsule, leave before dismissing its reveal, replace the active save (demo exit, import, undo, reset), then mount the same cabinet. `resumeFor` consults the session cache first, even if the new state has no such pending reward or has a different reward.

**Sources:** `src/features/capsules/usePull.ts:26` holds a module-level map keyed only by machine; `:35–41` returns the cached value before checking `state.value.pendingReveal`; `:251` writes the cache; `:296–299` deletes its entry and calls argumentless `finishReveal()`. Repository references to `unopened` exist only in this module. Save replacement paths in `src/state/store.ts:920–948`, `:971–992`, `:1000–1023` do not invalidate it.

**Impact:** A user can be shown a demo/old-save item that is not owned in the current save. Dismissing the stale card invokes the current state's `finishReveal`, potentially clearing a different legitimate pending reveal. The already acquired item remains in collection; do not describe this as loss of the collectible itself. It breaks the truthfulness and recovery of the reveal journey.

**Refutation:** Keeping the visual capsule shell across tab changes is useful, but the cache cannot be the authority for which reward exists. The authoritative persisted pending state already carries reward identity. A page reload clears the cache, but import/demo are deliberately supported within one page and should not require that workaround.

**Repair direction:** Make pending state the source of truth; retain shell/choreography metadata only when its stable reveal/save identity matches. Make finish acknowledge the specific pending reveal being displayed. Clear or invalidate ephemeral caches at every state replacement boundary.

**Acceptance:** Two synthetic saves with different pending rewards for the same cabinet; populate cache from A, activate B, mount cabinet, and see only B. Repeat A with pending → fresh B with none: no phantom reveal. Dismissing a stale callback must not clear B's pending reward. Include demo → real and import → Undo import.

##### UI2-03 — P2: an open count pad silently changes the date it edits after backgrounding

**Evidence level:** Direct source path, device behavior not assumed. Can be tested with synthetic visibility events and a controlled clock.

**Trigger:** Choose a past day in Today, open a count habit's “How many?” sheet, then background the app for at least one minute. On return, the Today selection resets to today while the same count pad remains open. Pressing + now changes today's log. An app-day rollover has the same boundary.

**Sources:** `src/features/today/state.ts:16` sets the hidden reset interval to 60,000 ms. `TodayScreen.tsx:69–90` resets selection after a new app day or a long hidden interval; `:123` stores only `padId`; `:209` derives `padCard` from the now-current day's card map; `:296` binds the sheet's `onCount` and Tiny actions to the newly rendered `date`. `src/features/today/CountPad.tsx:32–60` displays the habit name and count but no bound date. Compare the safer explicit `NoteTarget.date` in `src/features/today/NoteSheet.tsx:17–22`.

**Impact:** The user can unintentionally correct the wrong day. This is a data-entry integrity issue, not simply the desirable reset of a stale background Today screen. On a phone, backgrounding for a message or call is normal.

**Refutation:** The backdating banner on the underlying page updates, but that page is under a modal and inert; the sheet offers no date transition cue. Correctly changing the page's selection does not authorize silently retargeting an in-progress editor.

**Repair direction:** Store `{habitId, date}` as the editor target and keep it stable, or explicitly close the count pad with an understandable day-changed notice. Re-evaluate whether the target is still editable without redirecting the action to another date. Apply the same rule to the inline adjustment state.

**Acceptance:** Backdated count pad open → synthetic hidden interval of 61 seconds → visible → increment. Either the intended old date changes, or the editor has explicitly closed; today's count must not change unexpectedly. Repeat app-day rollover, schedule change during suspension, and a habit no longer present on the new day's list.

##### UI2-04 — P2 accessibility: visible toast actions are outside the active modal's keyboard focus scope

**Evidence level:** Direct DOM/focus contract; root asked for a mounted modal + toaster reproduction. Real VoiceOver behavior remains a separate check.

**Trigger:** Increase a count inside CountPad and receive an Undo/Add a note toast. The toast visibly appears above the sheet. Tab/Shift+Tab is trapped among descendants of the sheet panel, so the toast's buttons cannot be reached while the sheet remains open.

**Sources:** `src/ui/Sheet.tsx:334` traps inside `panelRef`; `src/ui/sheetStack.ts:131–149` cycles only `focusables(root)`. `src/ui/Toaster.tsx:49–58` portals the Notes section as a sibling in the overlay root, outside the sheet panel; `:76–84` runs its dismissal timer while an ordinary sheet is open. `src/ui/toast.ts:95–97` defaults actionable notes to four seconds; `:107–108` announces that their buttons are available. `src/features/today/TodayScreen.tsx:296` permits check-ins from inside the count pad.

**Impact:** Pointer users can activate recovery actions that keyboard users cannot reach. The action may expire while the user searches for it. Screen-reader modal scope may compound this, but that part needs actual assistive-technology testing.

**Refutation:** Closing the sheet can expose the toast if its timer has not expired; counting backward also corrects a count. Those workarounds do not make the advertised action reachable within its active context, especially “Add a note.” Ordinary toasts are intentionally not held by `momentOpen`, which only covers full-screen moments; that is different from a keyboard scope policy.

**Repair direction:** Put contextual toast actions in the active modal's accessible subtree, offer equivalent stable actions in the sheet, or defer actionable toasts (with timers paused) until modal dismissal. Choose one consistent ownership rule rather than weakening the modal trap.

**Acceptance:** Keyboard-only check-in in CountPad; reach and operate both Undo and Add a note without racing a timer or unexpectedly escaping the modal. Repeat nested Pet Card → pantry and dialog combinations. Validate with iPhone VoiceOver and iPad external keyboard after the DOM-level contract passes.

##### UI2-05 — P2: cancelled touch gestures can be treated as a completed dismiss or move

**Evidence level:** Direct event-handler mapping. Exact operating-system cancellation triggers need device testing, but dispatching a cancel event exercises the code deterministically.

**Trigger:** Begin dragging a Note sheet down, then the system/browser cancels the touch. Sheet passes `touchcancel` through the same path as a completed release and uses displacement/velocity to choose dismissal. A draft note has no discard protection. In You's Arrange list, `pointercancel` similarly commits the current provisional row order.

**Sources:** `src/ui/Sheet.tsx:251–264` chooses a dismiss target and calls `onClose`; `:283–285` completes the current drag; `:309–316` maps both `touchend` and `touchcancel` to that function. `src/features/today/NoteSheet.tsx:40–44` sends close straight to the parent; its draft remains only in component state. `src/features/you/HabitsSection.tsx:135–148` commits a reordered list at endDrag; `:193–194` uses it for both pointerup and pointercancel. The decor editor already demonstrates a sensible cancel path: `src/art/scene/actors/DecorEdit.tsx:100–103` clears its preview without committing.

**Impact:** An interrupted gesture can discard unsaved writing or persist a rearrangement that was not released. These are not grounds to forbid ordinary drag dismissal; the failure is cancellation having commit semantics.

**Refutation:** The Habit Editor has dirty-form confirmation, which protects that specific surface (`HabitEditorHost.tsx:36–40,79–93`). NoteSheet does not. The same issue exists on more than one primitive, so fixing only one screen misses the underlying distinction.

**Repair direction:** Separate cancel from release. On cancellation, restore the resting detent/transform, clear gesture samples and pointer state, and revert uncommitted list previews. Consider a recoverable draft for meaningful text as an additional safeguard, not a substitute for cancellation correctness.

**Acceptance:** Drag far enough to dismiss then dispatch touchcancel: sheet and draft remain. Drag-reorder then pointercancel: saved order remains original. Ordinary pointerup must still commit/dismiss, and unmount during mouse drag must remove window handlers as well as element handlers.

##### UI2-06 — P3: a cancelled Stepper press suppresses the next keyboard activation

**Evidence level:** Independently reproduced by root in synthetic mounted-component test R208 (`work/audit2/interactions.test.tsx`; passing output in `work/audit2/repros-new.log`). Pointerdown changes the real Stepper from 0 to 1, synthetic pointercancel follows, and a programmatic no-pointer click (representing keyboard activation) leaves it at 1; the next click changes it to 2. This confirms the stale suppression flag, not a physical keyboard or native iOS test.

**Trigger:** Pointerdown on +, then pointercancel (or leaving without a click), then activate a stepper button via keyboard. The next click is silently consumed.

**Sources:** `src/ui/Stepper.tsx:45–55` sets shared `fromPointer.current = true` and immediately nudges on pointerdown. `:58–64` clears that flag only while swallowing a click. `:72–76` routes pointerup/leave/cancel only through stopHold, which clears timers and leaves the flag set. Because the flag is shared across both buttons, the swallowed action can be on the opposite direction.

**Impact:** Mixed touch/pointer and keyboard use appears unreliable; an already changed count is followed by a silently ignored correction. This is narrower than UI2-05, but it has a separate fix and deterministic acceptance test.

**Refutation:** A normal pointer release generates the click that clears suppression. Cancellation does not guarantee such a click. Keyboard-generated clicks have no preceding pointerdown, exactly the branch intended to work here.

**Repair/acceptance:** Associate click suppression with the pointer sequence, clear it on cancel/aborted sequences, and distinguish keyboard activation. Test down → cancel → keyboard activation, down → leave → release outside → keyboard activation, and ordinary short/long pointer presses without double counting.

##### UI2-07 — P2: onboarding progress bypasses save ownership and is not synchronized across tabs

**Evidence level:** High-confidence source sequence, distinct from prior CR-D1's refusal-to-plant bug. Root has been given the scenario for cross-tab/signal reproduction.

**Trigger:** Open two tabs while late onboarding is in progress. The owner finishes, removing `catkin:onboarding`. The second tab's in-memory progress still says `first`/`place`, so its shell continues onboarding even though the main save is onboarded. Its Next/Skip handlers can write/remove that shared sidecar despite the tab being read-only. If the second tab advances after the owner finishes, it can put stale late-step progress back into storage and cause onboarding to resume on a future reload.

**Sources:** `src/features/onboarding/progress.ts:48` reads the sidecar only at module initialization; `:50–57` writes directly to localStorage with no ownership check; `:61–63` exposes only an explicit reload helper; `:69` shows onboarding whenever cached progress is non-null. `src/features/onboarding/Onboarding.tsx:150,156` invokes this directly on finish/advance. `src/state/store.ts:478–483` ignores all storage events whose key is not the current main/demo save key; `:418–425` adopts main state without onboarding reconciliation.

**Impact:** The single-writer guarantee does not cover part of the first-run state. A completed user can revisit stale onboarding, see habit IDs from another stage/save, or have the wrong tab delete ongoing progress. The main habit transactions are still protected; this is a sidecar authority/integration bug rather than a claim that read-only tabs can freely mutate the full save.

**Refutation:** Reset/import UI sometimes calls `reloadProgress`, and `firstPhase` discards a stale sidecar when `profile.onboarded` is false. Neither resolves the ordinary case where both tabs hold an onboarded main save and the progress signal remains non-null. Unlike a fresh unmounted hook, the existing flow's local phase also remains stale.

**Repair direction:** Make onboarding progress part of the same versioned transaction/ownership boundary, or give it a save identity and owner-aware writes plus storage-event reconciliation. When authoritative completion wins, mounted first-run UI must exit rather than merely updating a cached object.

**Acceptance:** Two-tab late onboarding: owner finish → other tab exits; non-owner cannot resurrect sidecar. Repeat reset/import while another tab has a late step, owner takeover mid-step, and demo round-trip. The first pet and first gift must not repeat.

##### UI2-08 — P2 user-control gap: older notes can be read and starred but not corrected or removed in the interface

**Evidence level:** Repository-wide call-site search and direct UI inspection. This is a missing product action, not a failure of the existing domain setter.

**Trigger:** Keep a personal note, return more than six days later, and try to correct or remove it without deleting the whole habit. Today no longer exposes the date. The history calendar displays the note but offers only completion correction. Habit Detail's Moments offers only a star.

**Sources:** The only product-state `setNote` UI call is `src/features/today/NoteSheet.tsx:35` (the similarly named local setter in capsule SpecialOrder is unrelated). `src/features/habits/detail/Parts.tsx:171–207` renders Moments and starring only. `src/features/progress/Calendar.tsx:202–233` renders the selected day's note text; its DayEdit actions at `:246–303` are start-date/completion actions. In contrast, `src/domain/logging.ts:340–351` already supports clearing a note with empty text, and `:97–101` with `src/domain/activity.ts:135–137` permits real past in-lifetime dates. The normal backfill restriction is about rewards, not a reason to lock private writing.

**Impact:** Typos, outdated information or an overly personal line become effectively permanent unless the user deletes much more history or hand-edits an export. This matters more as the product becomes a long-term personal archive and reaches a worldwide audience.

**Refutation:** Unstarring controls future quotation selection, and turning Quote my notes off hides displayed Sunday Note quotations. Neither edits/removes the original note. Existing frozen Sunday Note copies raise a separate explicit redaction design question: do not silently claim that deleting an original erases every snapshot or already-frozen quote.

**Repair direction:** Open the same dated note editor from Moments and Calendar, with a clear remove action and no reward side effects. Decide what removal means for saved quotes, exports and retained recovery copies, and explain it accurately. Make a one-note correction easy before adding journal features.

**Acceptance:** Edit and remove a note from a year ago without altering count, tiny/rest status, earned currency or plant history. Check Unicode text and an archived habit. Exercise a note previously quoted in a Sunday Note against the explicit retention/redaction contract.

#### Additional bounded risks and lower-priority observations

- **Sheet mouse-drag cleanup:** `Sheet.tsx:292–303` attaches window pointermove/up callbacks inside pointerdown, but the effect cleanup at `:312–317` cannot remove those closures. Closing/unmounting mid-mouse-drag leaves them until a later pointerup and allows callbacks against a detached panel. Fix with gesture-owned cleanup; test unmount mid-drag. This supports UI2-05's broader lifecycle acceptance rather than inflating the register with another major defect.
- **Reduced-motion crank mismatch:** DESIGN `:294` describes a static cabinet/crossfades. `usePull.ts:185–198` still animates handle angle over 420 ms under reduced motion via JS updates. Dome physics correctly settles, token/drop/reveal have reduced paths, so do not claim all motion ignores the preference. A static commit/progress change would better honor the declared contract; assess with users who need reduced motion before release.
- **Ordinary toast lifetime is not visibility-aware:** `Toaster.tsx:76–84` pauses for hover/focus/moment holds, not document visibility. A short interruption may consume a recovery affordance unseen. No browser-specific suspension timing is asserted here. A controlled background/resume test should determine the desired remaining-duration behavior, and equivalent permanent correction paths should exist.
- **Medium detent access needs keyboard/device testing:** Basket uses `['medium', 'large']`; Sheet implements expansion as a drag transform without an explicit expand control. Test an iPhone with VoiceOver, iPad external keyboard, enlarged text and keyboard open. Do not assert an unreachable item solely from source; native scrolling/focus behavior must be measured.
- **No general draft restoration:** Habit Editor protects intentional dismissal, but input exists in component state only; NoteSheet is weaker and discards on close. Native process termination after backgrounding can lose unsubmitted work. An app-owned draft, scoped to save/habit/date and never mistaken for a committed log, would improve reliability without changing the local-first model. This is future hardening, not proof of an observed iOS kill.
- **Long-history rendering still deserves realistic testing:** Moments renders every note (`Parts.tsx:182`) and memory shelves every stored ritual (`Keepsakes.tsx:196`). The new Progress staged rendering and domain memoization are good improvements, but a multi-year, note-heavy archive can create hundreds or thousands of nodes. Test open, filter, read and return-to-scroll with a mature synthetic save on a modest supported iPhone. Paginate by meaningful month/year if measurements justify it.
- **Sound/haptics are adapter concerns:** sound catches failure, gates by setting and requests an ambient session; scenes pause through visibility/intersection hooks; dome physics has a hidden-page stop. Those protections are useful. A hidden checkbox switch used for iOS haptics (`fx/haptics.ts:23–43,63–66`) is a browser technique, not a substitute for an explicitly tested native feedback adapter. Silent switch, interruption, audio-session resume and accessibility focus need device checks. No unsupported App Store policy assertion is made here.

#### First-audit reconciliation at c66

| Earlier item | Current disposition | Source check and limits |
|---|---|---|
| CR-01 six-treat feeding shortlist | Remains | `PetCard.tsx:327–331` still slices six; `PetCardHost.tsx:57–58` still opens a pantry with no pet/action callback. |
| CR-02 sticky damp after Undo/day change | Remains | `PlantArt.tsx:179` still ORs authoritative damp with lifetime pulse count; `WindowsillBand.tsx:148,160–163` retains the Set without clearing it. One-line PlantArt delta was not this fix. |
| CR-03 earned plant presentation lost on Shelf | Remains | `shelf/model.ts:42–69` lacks flourishes and paused look fields; `:74–76` retirement mapping still reduces appearance. Paired hue repair remains in Today adapter rather than shared mapping. |
| CR-04 friendship-level behavior promises | Remains | `shelf/model.ts:92–103` and scene model/director/plan still omit friendship level and named friend. L4 placement and other implemented rewards are acknowledged; do not say friendship as a whole does nothing. |
| CR-05 flourish copy/art mismatch | Retain as latent P3 | This pass's catalog split did not supply an integration contract that makes the unused order safe. Do not promote it to a proven currently displayed false line. Root should preserve first source evidence. |
| CR-06 starter plants scarcely express looks | Retain product decision | Petal-only mappings still mean common foliage starters need an intentional visible equivalent or clearer feature limits. Preserve species identity rather than force arbitrary recolors. |
| CR-D1 refused onboarding planting advances flow | Remains | `Onboarding.tsx:160–170` still advances unconditionally from plantPicks result; no success/refusal discriminator. New UI2-07 is the separate sidecar ownership gap. |
| CR-D2 first-capsule reload loses selected cabinet | Remains | `CapsuleSteps.tsx:53` initializes picked null, without pendingReveal; see previous recovery scenario and UI2-02 cache authority. |
| CR-D3 swallowed capsule-step lazy failure | Remains | `Onboarding.tsx:74–87` resets rejected promise cache but swallows current hook failure and never re-runs it; `:234` keeps the ordinary choose-cabinet lead. Cache reset helps a future remount, not a reachable retry in the mounted flow. |
| I1 case-sensitive module naming on Windows | Root verification | Both case-only helper/component filenames remain in file inventory. Root owns build execution; no claim of a newly run check here. |
| I2 first-paint budget failure | Root verification | The recent dependency split directly targets this; do not retain old measured failure as proof about c66 without current CI/build evidence. |
| I3 pending reveal inactive/unavailable cabinet | Remains | `usePull.ts:52,57` resumes only in initializers when active; no active-change adoption effect. New UI2-01/02 are different pre-commit and state-replacement failures. |
| I4 failed lazy sheets no usable retry | Remains; scope expanded | `SheetHosts.tsx:7–12` still load().then without an error state. Ritual host is now included at `:20`. Progress's local ritual loader also lacks rejection UI. |
| I5 Quiet rewards shell promise | Partially fixed | Sidebar wallet is hidden at `Sidebar.tsx:59`. Both `Sidebar.tsx:31` and `TabBar.tsx:28` still iterate all routes including Capsules. Preserve the improvement rather than rerun the old combined assertion unmodified. |
| I6 normal reveal Find a plant loses action context | Remains | `RevealCard.tsx:151–152` still falls back to generic Shelf. |
| I7 desktop double subtraction | Source-fixed | `App.module.css:31,35–36` now uses `100vw - sidebar - target`. 1280px arithmetic now yields the intended 720px narrow content before local padding. Root/device visual verification remains separate. |

Earlier smaller observations (onboarding plants drawn at cutting stage, name suggestion then global Skip, incomplete note/history provenance) remain in the preserved first report and were not silently dropped. This second leaf does not claim to have independently reproduced every previous source issue again.

#### Creative and utility priorities beyond defect repair

##### 1. Make private history usable as a personal record

Start with UI2-08, then add a restrained archive index: month/year jump, filter by habit, starred-only view, and text search of the user's own notes. Each result should open the exact date and show whether the action was recorded live or corrected later. Existing Moments and memory shelf currently present complete linear lists; a five-year user deserves retrieval, not only accumulation. A useful success test is finding a particular remembered line from two years ago in a few deliberate actions. Search stays on device; no generated interpretation of the user's feelings is needed.

##### 2. Carry the user's intention across screens

“Find a plant,” “Basket and pantry,” “Open Today” and “See this day” should preserve the pet/habit/date/action that motivated the tap. This repairs existing I6, CR-01 and domain W2-D2 and yields a coherent navigation model. For a future iOS widget or quick action, use the same explicit destination/command contract with save identity, date and freshness checks. An actionable Today widget and a dependable reminder are meaningful native utility; adding native decoration before those contracts are reliable would not help.

##### 3. Make long-term attachment visible in the room

Implement the promised friendship tendencies and use the same earned plant presentation across Today, Shelf, Detail and retirement. A paired bloom, a favourite resting place and a familiar nearby friend should be consistent facts. Modest deterministic tendencies, visible even with reduced motion, communicate relationship better than more levels whose effects exist only in text. A useful evaluation is asking a returning user what changed about a specific companion, without pointing them to a level label.

##### 4. Offer a deliberate personal archive and backup moment

After enough meaningful history exists, a gentle first-backup invitation should cover users who have never backed up, not only people whose previous backup is old. The current never-backed-up nudge branch is intentionally absent and was already recorded in the first data audit; this is an opportunity, not a new regression. Explain exactly what is saved, where it went, when it was made and how to restore it. For an iOS edition, a restore rehearsal with a synthetic/example archive and clear file-provider delivery confirmation would make “your plants are yours” credible. Avoid repeated nagging or artificial deadlines.

##### 5. Preserve the tracker-only experience as a complete mode

Complete Quiet rewards across shell navigation and all contextual invitations, while keeping all functional tracking, notes, history corrections, plant growth and rest accessible. Let the user deliberately return to collection features later without losing them. The product should be satisfying for someone who never opens another capsule; this is already the project's stated invariant, and it makes the creative layer optional in a respectful way.

#### Coverage, refutations and release acceptance

**Pass 1 — complete review:** Read prior creative/integration findings; traced current app shell, route ownership, sheet hosts, onboarding, count/note entry, habit editor/detail, pet cards, Shelf adapters, cabinet/reveal hooks, Progress archive, You profile/reminders/data integration, and shared UI primitives. Inventoried source families before targeted review.

**Pass 2 — expert reread:** Followed focus ownership across portals and nested sheets; gesture pending/move/release/cancel transitions; save/date identity across hidden/resume and unmount; caches across demo/import/reset; observer/timer cleanup; reduced motion, audio unlock and haptics; narrow-sheet/keyboard and mature-history considerations.

**Pass 3 — attempted refutation:** Confirmed domain checks still protect currency/pending rewards; distinguished pre-commit from post-commit animation; verified the singleton RitualReader owner prevents the apparent two-host duplicate modal; verified NoteTarget already binds its date; verified dirty Habit Editor confirmation; checked that decor cancellation already clears without committing; acknowledged haptic/audio fail-safe guards, scene visibility stops and reduced dome physics; separated old six-item feeding/recovery issues from new cache/continuation bugs; corrected earlier shell and wallet findings for actual c66 changes.

**Pass 4 — polish and evidence audit:** Rechecked the pin's line locations for the main findings; corrected CountPad references to its actual inline date handler at line 296; separated source-established defects from device-only risks; gave a repair direction and a meaningful acceptance sequence for every new register item. No external policy claim is made without root's primary-source review, and no native iOS/VoiceOver success is implied.

**Independent reproduction status:** Root's passing R209 confirms the post-unmount pull callback in UI2-01; passing R208 confirms the canceled Stepper sequence in UI2-06. Both use the actual source modules in synthetic jsdom with controlled events/frames. The other six findings remain source-level. Remaining useful runtime checks are old cached pending A vs replacement state B; backdated CountPad after 61s hidden; modal + toaster Tab cycle; Sheet touchcancel; and late onboarding across storage events. Source absence establishes the old-note UI gap; a large end-to-end test is not needed merely to restate the missing control.

**Native release matrix still required:** supported small iPhone portrait and landscape; iPad with software and external keyboards; largest supported Dynamic Type; VoiceOver actions and focus order; Reduce Motion toggled before launch and while a flow is active; silent switch and audio interruptions; process kill/restoration from each editing and capsule phase; touch cancellation, rotation and safe areas; offline load and failed chunk recovery; long names/emoji/combining marks; mature note-heavy saves and return-to-scroll. These are scoped acceptance scenarios, not unsupported findings about devices we did not use.

**Leaf gate evidence:** G1 is satisfied by eight new actionable source findings plus the bounded risk, creative priorities and reconciliation sections. G2 is satisfied by the four-pass record, exact pinned source references, attempted refutations, concrete acceptance scenarios, read-only discipline and explicit device/test limitations. Root owns execution of manual gate verification and final lease/dispatch bookkeeping.


### History time quantities and reward invariants

**Source context:** [c66f588](https://github.com/wktw/lookwhaticando/commit/c66f5880776c08e2c687922a3ec3a3206595c8da).

### Second audit: history, time, quantities and reward invariants

Pinned baseline: `c66f5880776c08e2c687922a3ec3a3206595c8da`, read-only source at `C:/Users/DADDYS HOME/Documents/Codex/2026-09-29/co/work/lookwhaticando-audit2`. All source references below are relative to that directory and commit. Prior evidence remains in `work/audit/findings/domain.md`; this report adds deeper findings rather than replacing it. Only this owned audit artifact was written by this leaf. No repository, dependency, test runner, GitHub or real-user-data writes were performed. Root owns independent synthetic execution.

The strongest new issues concern mutable history, an off-by-one refund boundary, and loss of the original timing of quantity habits. The core date arithmetic, explicit completion model, primary settlement controls, and capsule pity logic contain substantial safeguards; this review does not turn intentional policy decisions into bugs.

#### New actionable findings

##### HM1 — Finish can turn an earlier, safely cut period into a historical shortfall

**P2; high confidence. Current domain defect. Independently reproduced by root as R206 in `work/audit2/repros-new.test.ts`, with results in `work/audit2/repros-new.log`.**

The contract says a flexible period cut by a later rule is evaluated as it stood at the cut, and cannot acquire a new historical shortfall (`docs/DESIGN.md:106`–`:111`; `src/domain/rules.ts:166`–`:175`). However, `src/domain/periods.ts:156`–`:169` recomputes both its active-day denominator and its supposedly permanently open lost days from the habit's *current* lifetime. In particular, line 162 retains a lost day as open only while it remains in `inLifetime`. Finish subsequently shortens that lifetime at `src/domain/seasonReview.ts:332`–`:349`.

Concrete sequence, Monday-start weeks:

1. Create a three-times-weekly habit on Monday, September 7, 2026. Make no check-ins.
2. Switch it to daily on Thursday, September 10, effective today. The old period now governs September 7–9 and nominally ends September 13.
3. Evaluate the old segment: target 3, four lost days still open, expected 0, no shortfall. This matches the edit promise.
4. On Friday, September 11, select **Finish** without watering. Finish archives as of Thursday, September 10.
5. Reevaluate the old segment: four of seven nominal days are inside the now-shortened lifetime, so target rounds to 2; only Thursday remains a lost in-lifetime day, so open days becomes 1; achieved 0, expected 1, `short: true`. Root confirmed expected 0→1, target 3→2 and open days 4→1 using the actual `retireWithRibbon` action.

**Impact:** A later lifecycle action rewrites the meaning of an already closed rule segment. Consistency can fall, and in a same-rhythm edit variant a previously transparent segment can break a run. The concrete weekly-to-daily example establishes incorrect historical expected count without needing to claim its old weekly run becomes the current daily run.

**Refutation:** Ordinary Archive on Friday retains Friday in the lifetime, yielding target 2/open 2/expected 0 in this exact example; root explicitly checked that variant. The defect requires the actual Finish semantics above, or an earlier archive. Normal uncut periods are meant to prorate on archival; the problem is applying later lifetime changes to a cut segment that explicitly promises frozen semantics. Tests at `tests/unit/domain/periods.test.ts:151`–`:179` separately cover cut periods and archival but not their composition.

**Repair:** Preserve sufficient cut-time evaluation context, or compute the lost-day exemption against the lifetime known when the rule cut happened. Do not simply disable proration for ordinary archived periods. If old saves lack a cut-time snapshot, define a conservative migration that cannot invent a previously avoidable historical miss.

**Acceptance:** Assert the old segment's expected/achieved/short values before and after later Finish, Archive, Restore, planned pause, resume and day-off changes. Include weekly-to-daily and same-rhythm changes to `every`, with a truly unavoidable shortfall already present at cut time retained. Exercise the user-visible tally and streak, not just `cut: true`.

##### HM2 — Deleting a habit reclaims a reward one day beyond the refund window

**P2; high confidence. Current off-by-one integrity defect. Independently reproduced by root as R213 in `work/audit2/repros-new.test.ts`, with results in `work/audit2/repros-new.log`.**

`src/domain/activity.ts:120`–`:138` defines the reward/refund interval as today minus six through today. `src/domain/economy.ts:887`–`:891` retains ledger entries from today minus seven *inclusive*. That extra retention day is harmless on guarded check-in paths, but `src/domain/habits.ts:305`–`:315` deletes/refunds every retained entry for the habit without checking its date. Lines 315–334 also remove that entry's sunshine and lifetime check-in contribution. The function's own contract (`:293`–`:296`) says sunshine before the window stays.

**Reproduction:** Create and complete a steady daily habit on September 7, then advance to September 14. With sufficient coins remaining, delete it without keeping the plant. Its September 7 completion is now history-only but remains in `ledger.recent`, so deletion removes five earned coins and one sunshine. If instead deletion happens September 15, compaction has removed the entry and the old reward survives. Root confirmed day-seven wallet 25→20/sunshine 1→0, versus day-eight wallet 25→25/sunshine 1→1. The two outcomes differ only because storage retention is one day wider than action eligibility.

**Impact:** The user loses earned resources and lifetime growth that the advertised history/refund boundary says are permanent. The Cutting's stage high-water mark can conceal the loss of its underlying sunshine/progress, so checking only that stage never decreases will miss this.

**Refutation:** The same-day delete test intentionally expects a refund, and the old-history test advances ten days; both can pass. Bonuses remaining permanent is intentional and unrelated. This is not an argument against deleting logs or refunding legally refundable days. Deletion also bypasses the generic clock eligibility guard; the dated boundary is the narrower demonstrated issue and should be fixed first.

**Repair:** Separate removal of obsolete ledger storage from reversal of an eligible grant. Only rewardable/refundable dates should reduce wallet, lifetime check-ins and earned sunshine; older retained entries may be discarded while their folded totals remain. Reuse the same eligibility definition as ordinary undo rather than coupling semantics to compaction retention.

**Acceptance:** Run otherwise identical delete sequences at ages six, seven and eight app days, with both sufficient and insufficient wallet balance. Compare wallet, lifetime sunshine, check-in totals and Cutting progress, including an account whose next growth threshold lies between the results. Confirm keep-plant Archive behavior remains distinct.

##### HM3 — The 24-stamp cap changes whether high-count habits were performed in stack order

**P2, narrower population; high confidence. Current defect. Independently reproduced by root as R207 in `work/audit2/repros-new.test.ts`, with results in `work/audit2/repros-new.log`.**

`src/domain/logging.ts:84`–`:86` retains only the latest 24 stamps. `src/domain/stacking.ts:79`–`:106` then treats the minimum retained stamp as the habit's first check-in, and compares it with the follower's first check-in. The defined contract is actual first check-in order (`stacking.ts:9`–`:11`), not the earliest check-in that survived a cap. Quantity targets support up to 100,000 and steps of one (`src/domain/schedule.ts:40`–`:43`), so more than 24 genuine taps is valid input.

**Reproduction:** Anchor a follower to a quantity habit with target 25, step 1. Tap the anchor once at 08:00. Complete the follower at 08:05. Make the remaining 24 anchor taps at 08:10 or later. Both habits now show up; the intended order is valid. The anchor's first retained stamp is after 08:05 and `keptTogetherDays` becomes 0 instead of 1. Root reproduced this. The converse can also erase a follower's too-early first tap and make a reversed order appear valid.

**Impact:** Quantity use loses accurate stack credit during the same day, without waiting for old-history compaction. This also feeds the permanent Paired plant look. It is a new mechanism separate from prior D2's 120-day aging error, although both show that the current retained array cannot act as lifetime provenance.

**Refutation:** Some templates use steps that finish within 24 taps. That reduces incidence, not validity: arbitrary user-defined quantities are supported. The design explicitly compares first taps, so substituting completion order silently would be a behavior change. Existing stack tests use short stamp arrays and do not cross this bound.

**Repair:** Preserve a small explicit original-first-check-in field or equivalent per-day ordering fact independent of the bounded list used for recent-time analysis. Define corrections/undo semantics. Consider storing first and completion evidence rather than preserving unlimited raw stamps. Coordinate with the D2 fix so 120-day compaction preserves the already established ordering verdict too.

**Acceptance:** Test 24/25/26 live taps for anchor and follower separately, both valid and reversed ordering; direct exact-count entry; undo and re-check; and eventual 120-day compaction. The credited-day count must not change solely because another valid tap or storage compaction occurred.

##### HM4 — Literal rarity ordering conflicts with new-first weighting

**P3 specification/copy mismatch; mathematical confidence high. Not a broken RNG or pity guarantee.**

`docs/DESIGN.md:266`–`:268` says every individual rarer item is less likely than every individual commoner item. The 3x new-item weighting in `src/domain/gacha.ts:152`–`:165` intentionally changes that comparison after partial collection. In a big series with five Special and five Rare items, owning four of each makes an owned Special's ordinary probability `25% / (4 + 3) = 3.571%`, while the unowned Rare is `10% × 3 / (4 + 3) = 4.286%`. The latter is rarer in the catalogue yet more likely on this roll.

The per-item odds sheet calculation (`gacha.ts:170`–`:192`) correctly includes ownership, so the implementation is transparent. The source's tiers are balanced for uniform ownership states; the absolute wording overstates what that balance guarantees. Pity and lucky rolls intentionally violate ordinary odds too.

**Repair:** Keep the useful new-first mechanic and qualify the promise: tier odds and base equal-ownership item odds are ordered; current individual chances also reflect ownership and guarantees. Avoid implying a slot-machine fairness defect or recommending monetized capsules; the planned subscription has no purchasable currency.

**Acceptance:** Verify dynamic item chances sum to 100% for every machine, ownership permutations and zero/many Moonlit variants. Permuting item enumeration should preserve each item's analytical probability, not force identical same-seed outcomes. Test guarantee precedence separately from ordinary distribution.

#### Further integration risks and worthwhile design decisions

These are bounded issues for explicit follow-up, not additional reproduced P2 bugs.

**Backdating can re-anchor a multi-week/month rule.** `src/domain/rules.ts:245`–`:248` changes the first rule's `from` when `startedOn` moves earlier; `src/domain/schedule.ts:158` and `src/domain/periods.ts:71` use that date as the multi-period grid anchor. Moving a biweekly habit's start earlier by one week regroups already existing days. `src/domain/habits.ts:394`–`:399` describes this as stats-only and does not resettle existing grants. Example to probe: a habit created September 7 with September 13 full and September 14 over-target; backdate to August 31, and the two dates now fall in separate biweekly periods. This follows the written first-rule convention, so it needs a product/contract decision, not an unqualified claim of exploitable overpayment. Preserve a separate period anchor if “start tracking earlier” should extend history without changing established period geometry. Current withStartedOn tests use a daily first rule, which cannot expose the issue.

**A tap time is not necessarily a completion time.** `src/domain/signature.ts:120` selects the last stamp while its module documentation calls that the completing check-in. Logging accepts further count increments past target (`logging.ts:222`–`:225`), so a person who reaches their reading goal in the morning and records extra pages at night has that day classified by the extra pages. Decreasing via the number pad does not remove an old stamp (`logging.ts:279`–`:291`). Decide whether personalization describes last activity or completion; then persist/derive the promised datum. This is distinct from actual activity time, which the app cannot infer reliably from check-in time alone.

**History size needs measured cold-path acceptance, not only memoization.** `growth.ts:261` walks whole lifetime days and flexible periods for completed occurrences; `streaks.ts:74` walks all rhythm spans; `activity.ts:238` and `dates.ts:176` materialize day arrays. `economy.ts:217` onward caches by identities, which is helpful, but a changed habit/log invalidates that habit's lifetime result. `setStartedOn` permits any valid earlier key, including much older history than normal UI fixtures. Root owns performance execution; this leaf makes no new measured freeze claim. Use realistic five-/ten-year histories with many notes/rule changes, plus a bounded unreasonable input case, and set a concrete interaction latency budget on the intended phone. Introduce incremental summaries only with equivalence tests for backfill, changed rules and archival so speed does not create another history fork.

**Worldwide time semantics need persisted event context.** The core `appDayKey` deliberately uses wall-clock minutes with a monotonic guard (`dates.ts:324`–`:346`), correctly handling ordinary DST gaps/repeats. Retained raw timestamps read through the current local reader (`signature.ts:121`) can still reinterpret old behavior after travel; its memo key is habit/logs/today rather than zone. Prior D4 already covers remembered dates moving under day-boundary/timezone edits. Define separately: event app day at entry, action instant, current display timezone, and optional reported activity time. Do not solve this by hard-coding US DST or by treating a 24-hour elapsed interval as a local day. Root/data owns the independent UTC-hour selector defect.

**Avoidance habits are explicitly self-reported successes.** `docs/DESIGN.md:98` says polarity changes copy only; `catalog/formatCore.ts:48`–`:57` changes runs to “Held off.” A failed/forgotten check-in is not automatically a successful abstinent day. Do not invert completion math or silently award absence. For worldwide adults, clear creation examples should distinguish “a day I held off” from “count the thing I want to reduce.” If users need a maximum-per-day reduction goal, that is a new comparator/schedule contract with its own early-day/past-day semantics, not a cosmetic polarity switch.

**Sparse/quick/night routines still need attainable identity.** Prior R1/R2 remain: at least ten eligible days in a rolling 120-day window makes monthly/quarterly routines structurally unable to earn time-derived looks; suppressing three habits within two minutes and all 23:00–03:59 stamps excludes legitimate short stacks and night-shift use. These are written choices, not hidden bugs. A schedule-appropriate durable sample or user-confirmed preferred rhythm can provide honest personalization without encouraging false overlogging. Completed finite routines can retain useful notes/checklists and a deliberate “bring back next season” flow without adding more currencies or streak pressure.

#### Prior-finding reconciliation at c66f588

Only five domain files differ from the prior 7d16f11 snapshot: consistency, economy, growth, habits, profile. The changes are copy-module import splits plus persisted 28-day offer declines; the old numerical growth issue is not fixed in this pin.

| Prior ID | Current disposition | Pinned evidence / qualification |
|---|---|---|
| D1 six-decimal sunshine threshold | Still present | `economy.ts:164`, `:344`, `:367` round grants/totals to six places; `growth.ts:58` and `company.ts:303` compare with 1e-9. Nine M/W/F ledger grants remain 20.999997, not 21. A later concurrent branch fix cannot be credited to this pin. |
| D2 pruning changes stack order | Still present | `logging.ts:405`–`:415`, `stacking.ts:79`–`:106`; losing live evidence becomes unknown/history and counts. HM3 is an additional same-day version, not replacement evidence. |
| D3 current companion assigned historic waterings | Still present | `rituals.ts:131`–`:140`; no pairing-history fix in the domain diff. Keep separate from render-time W2-D3. |
| D4 arrival dates reinterpreted | Still present | `rituals.ts:42`–`:43`, `:220`–`:221`, `gacha.ts:398` and pet views still use present settings. |
| D5 universal Balcony affinity | Still present | `places.ts:44`–`:46` retains includes(species); universal empty loves remains unmatched. |
| D6 Finish brand-new unwatered habit | Still present | `seasonReview.ts:342` clamps yesterday to startedOn. HM1 instead concerns already cut history on an established habit. |
| D7 Tiny missing from month jar | Still present | `state/views/today.ts:239` still requires count greater than zero. |
| W2-D1 flexible history dead end | Still present | `features/progress/Calendar.tsx:278` still hides unscheduled cells' editor. |
| W2-D2 Open Today behind modal | Still present | `Calendar.tsx:248`–`:254` still bare href; `HabitDetailHost.tsx:15`–`:34` remains request-controlled. |
| W2-D3 frozen note rendered from current routine | Still present | `features/rituals/lookup.ts:7`–`:9`, `words.ts:61`, `:107`. |
| W2-D4 zero habits hides old keepsakes | Still present | `ProgressScreen.tsx:145`, `:156`, `:211`–`:220`; sections are now staggered/lazy but remain inside the garden-presence gate. |
| W2 note-marker memo | Source remains suspect; narrow UI issue retained | No claim of a new independent runtime pass; interactions owner/root can reconcile latest callback dependencies. |
| Known pending offer-decline persistence | Fixed in this pin | `habits.ts:415`–`:437` checks decline keys; `economy.ts:929`–`:933` expires them after the cooldown. |
| Known one-day phrase/plural issue | Improved in this pin | `catalog/formatCore.ts:68` omits the unhelpful one-day line. This is a formatter change, not D1 sunshine rounding. |

Progress/Habit Detail/ritual readers are implemented, as established by the prior delta review; placeholder descriptions must not reappear in the integrated audit. Deferred iOS/account/subscription work should be described as planned launch scope, not current-domain regressions.

#### Refutations and invariant review

- **DST/leap math:** Calendar arithmetic uses UTC civil-day calculations, while day assignment uses local wall time. Existing `tests/unit/domain/dates.test.ts:200`–`:311` covers New York and London gaps/repeats, a non-existent boundary time, monotonic fallback and varied host zones. February 29 birthday fallback uses `recurringDay`. This leaf found no new core leap/DST arithmetic defect. Device lifecycle/selector behavior remains a separate integration test need.
- **Quantity/Tiny:** Explicit Tiny is a level and intentionally leaves count unchanged; day-end partial-to-Tiny logic and eligible reward window were reviewed. High target/step validation is bounded. Full-count overage intentionally gives no extra coins. The six-day catch-up reward limit is documented, so reopening after a long absence need not retroactively pay every old partial day.
- **Undo/repricing:** Settlement uses recorded caps, action-day budgets, all-or-nothing coin refunds and sunshine deltas. Flexible orphaned coins prevent moving an unpaid-refund slot to another day from paying it twice. Same-level effort edits do not pay more. Day edits after a paid completion defer to tomorrow. No new generic infinite-currency claim is supported by this review.
- **Growth high water:** bestStage, Cutting and Flourishes retain visual stages after undo by design. Completed occurrence and calendar-pace caps protect rapid schedule switches; tests using exact unrounded normalization do not refute D1's rounded-ledger issue. Removing today’s reversible sunshine is distinct from improperly removing immutable old sunshine in HM2.
- **Capsule guarantees:** Ultra pity takes precedence over Rare; lucky guarantees new when any candidate is unowned; forced tiers select unowned where possible; first capsule does not advance pity; fully owned tiers stop their counters; Moonlit variants share a bounded slot. `rng.ts` and the cumulative weighted picker do not introduce an identified enumeration-order probability bias. Same random seed under a different item order need not produce the same item to be fair. Existing 250-pull tests across eight available machines and several seeds are useful, but do not prove every ownership permutation or future catalogue change.
- **Archival/restore:** Archived stretches become pauses; existing bonus anti-farming guards preserve a paid perfect day's exemption. No generic “archive must erase all old misses” finding is made. HM1 targets a specifically frozen cut, HM2 the exact refund boundary, and prior D6 the empty first lifetime.
- **Local-first trust:** Backup replay and documented history/reward tradeoffs are inherited accepted limits, not newly discovered payment security defects. The planned subscription does not make in-app coins purchasable; no paid-loot-box analysis is asserted here.

#### Four passes and coverage

1. **Full review / baseline map.** Read the audit2 PLAN and leaf gate, compared the entire domain inventory by content against the previously fully read domain, and inspected all five changed domain files. Prior full reads of DESIGN, NOTES-domain, NOTES-open and NOTES-w2-progress remain preserved; reread the applicable current DESIGN rules for polarity, targets, edits, time, growth and capsule probabilities. The unchanged full-domain coverage is documented in the first report, not falsely presented as a fresh full reread of every unrelated file.
2. **Expert interaction reread.** Deeply reread activity, dates, schedule, rules, pauses, periods, streaks, consistency, logging, economy, growth, gacha, rng, rollover and wallet; targeted reread of habits' creation/edit/archive/delete/restore/start-history paths, company settlement/story thresholds, signature and stacking, and seasonal retirement. Matched the new Progress/Detail/ritual readers against earlier claims. Examined interplay between retained storage, action eligibility and facts inferred from timestamps.
3. **Defect/refutation hunt.** Read economy property tests, adversarial gacha guarantees, adversarial streak/growth tests and catalogue rule tests in full; read relevant date, period, rule, logging, economy, habit, gacha and adversarial-history cases. Explicitly refuted the ordinary-Friday-archive variant, narrowed unverified backdating to a contract decision, and distinguished dynamic odds from literal rarity prose. Sent concrete independent reproduction requests to root; root confirmed cut-period Finish, the seven-day deletion refund boundary, and high-count stacking. This leaf did not run tests or claim a statistical sample it did not execute.
4. **Polish / evidence audit.** Reopened precise lines for new defects, reconciled old identifiers and currently fixed known gaps, stated expected counterexamples and acceptance checks, separated source-established behavior from independently observed behavior, and kept new long-term/worldwide opportunities practical. All remaining unmeasured performance and device behavior is identified as such.

HM1–HM3 now have root's independent runtime confirmation. The backdating item remains a bounded contract/integration risk without a promoted exploit claim. No source change is authorized by this report; fixes should be coordinated with the active developer against a fresh revision.


### Native iOS subscriptions worldwide readiness and product depth

**Source context:** [c66f588](https://github.com/wktw/lookwhaticando/commit/c66f5880776c08e2c687922a3ec3a3206595c8da).

### Native release, subscriptions, worldwide use and product depth

Assessed on 29 September 2026 against c66f5880776c08e2c687922a3ec3a3206595c8da. The intended audience is adults. The proposed business model is a subscription with a 14-day free trial, without purchasable currency, paid capsule pulls or other microtransactions. These requirements arrived during the second audit. They change release planning; their absence is not a regression in an app previously designed as a free local web application.

#### Release judgment

catkin has enough original utility and authored character to merit a serious native release investigation. It is not ready to charge real users for a production iPhone app. The blockers are dependable ownership of personal history, recovery that actually commits, interruption-safe interactions, a native delivery target, subscription entitlement handling and evidence from real Apple devices. More animals or more animation do not close these gaps.

The strongest assets to preserve are the pure deterministic domain, injected runtime dependencies, detailed schedule semantics, local-first privacy, authored plant/pet art, restrained voice, and non-punitive permanent growth. Neither a full rewrite nor a cloud account is automatically necessary. The important architectural work is at the boundaries between that domain and the device.

#### IOS1 — Before native implementation: turn the proposed wrapper into an actual platform design

**Evidence:** `package.json`, `vite.config.ts`, `.github/workflows/ci.yml`, `docs/DESIGN.md:53`. The inventory contains web/PWA and single-file builds, but no Xcode project, native entitlements, StoreKit configuration, native bridge, signing setup or native test target. A PWA manifest and iPhone splash images are not an App Store binary. The design's “no rewrite” claim is reasonable for the domain and much of the UI, but not for storage, purchases, reminders, lifecycle and platform services.

**Recommendation:** first prove a small packaged application using the existing Preact UI and TypeScript domain, with bundled local web assets and a deliberately small native bridge. Capacitor is a reasonable candidate, not a decision already made. Its documented iOS support uses a native project and Xcode; evaluate plugin maintenance and bridge coverage before adopting it. A wholly native UI is an alternative if actual device testing reveals unacceptable accessibility, performance or interaction limitations. Do not commit to a rewrite merely to obtain an App Store listing. [Capacitor iOS documentation](https://capacitorjs.com/docs/ios).

**Acceptance:** on a real iPhone, install a signed build, launch in airplane mode, complete a habit, terminate/relaunch, preserve the save, share a backup, restore it, and exercise one verified sandbox subscription. Include a large existing web save in this spike. This validates the expensive architectural assumptions before expanding the native shell.

#### IOS2 — Storage needs an asynchronous durable-commit boundary

**Evidence:** `src/state/persist.ts:257`, `src/state/store.ts:286`, `src/state/store.ts:350`, `src/state/snapshots.ts:123`. The current primary save is a synchronous whole-state localStorage envelope. Domain actions return before ordinary delayed writes. IndexedDB backs recovery separately. FS1–FS10 show why simply swapping API names is insufficient.

A native adapter will commonly be asynchronous; it cannot honestly implement the current synchronous success contract by firing a Promise and returning. Separate domain acceptance, visible optimistic state, queued changes and confirmed durable commit. Purchases/acquisitions and destructive replacements must await the right boundary. Use a generation/revision check, serialized command queue, transaction completion, cancellation identity, schema-aware decoding and recovery paths. Keep the last good state until the new one is durable. A single transaction should include content and the metadata needed to recover it.

For a multi-year habit journal, evaluate transactional database or atomic-file storage, with a documented device-backup policy. Preferences are suitable for lightweight settings, not the entire growing history. Capacitor explicitly cautions about localStorage durability and says its Preferences API is not a database for large/high-write data. [Preferences documentation](https://capacitorjs.com/docs/apis/preferences).

**Acceptance:** fault-inject every write/transaction boundary; low storage; force termination during a save; process recreation; app upgrade; future-schema read-only rescue; database unavailable; migration interruption. Reopen and prove either the old complete save or the new complete save survives. Show save status accurately and never promise a durable recovery/restore Undo copy before its transaction commits. Ordinary immediate check-in Undo may legitimately operate in memory while an optimistic save is pending. Preserve read/export access when paid access ends.

#### IOS3 — Web identity, native identity and cloud sync are separate problems

The existing web origin's storage should not be assumed to appear in a native container. Keep the current explicit backup/import transfer path, but repair its validation, transaction and Undo defects first. Make the transfer preview show which profile, save date and habit count will replace which data. Verify the imported state after reopening before suggesting removal of the original copy. Do not transfer via a URL containing the full private payload.

Subscription restoration is not history synchronization. A user can restore paid access on a second phone while their journal remains on the first. Explain this plainly at launch. Optional encrypted backup or sync can be valuable later, but requires conflict semantics for simultaneous edits, deletions, undo, duplicate check-ins, companion assignments, migration and reward ledgers. Last-write-wins over the entire AppState would silently discard work. First stabilize save generations and idempotent commands; then decide whether cloud sync earns its cost.

#### IOS4 — Replace web-only device assumptions with explicit capabilities

**Evidence:** `src/features/you/files.ts`, `src/features/you/RemindersSection.tsx`, `src/features/you/calendar.ts`, `src/app/installPrompt.ts`, `src/app/pwa.ts`, `src/fx/haptics.ts`.

| Area | Current assumption | Native release contract |
|---|---|---|
| Backup and import | Blob download, Web Share, file input, Clipboard APIs | Native Files/share/import bridge; cancellation and delivery status; large-file limits; security-scoped files if needed by chosen implementation |
| Reminders | .ics links/downloads; explanatory copy says catkin cannot notify | Optional local notifications with a real schedule model; permission requested at the moment the user chooses reminders; clear denied/off states |
| Haptics | navigator.vibrate or a hidden switch click | Native feedback adapter that respects preference and lifecycle; do not depend on an incidental web-control effect |
| App updates | Service worker, Reload app, Home Screen installation guidance | Bundle-based native release channel; capability-specific About copy; app version plus web-content/schema versions; no misleading browser install steps |
| Background/resume | visibilitychange, pagehide, intervals and rAF | Native lifecycle signals plus web-view process restoration; recheck time and entitlement; retain the exact editor date and save generation |
| External links | Browser target behavior | Explicit policy for external browser, Files, Calendar and support URLs; do not let untrusted remote pages gain the app's native bridge |

Local notifications can be scheduled for delivery while the app is not running. They also need cancellation when no longer relevant. This permits useful reminders without adding a push server. [Apple local notifications](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app).

For catkin, schedule by the user's app day, weekdays/flexible target, pauses, time zone and completed state. A reminder for a paused or already completed habit is worse than no reminder. Keep lock-screen text generic by default; adults may record private health or recovery routines. Test DST, travel, notification denial, changed schedule, archived habit, expired subscription and reopened device. Do not replace the existing one-time .ics export with a claim that catkin can remove an event the user already imported into Calendar.

#### SUB1 — Plan StoreKit subscriptions as the worldwide baseline

For digital app access, plan on an auto-renewable StoreKit subscription as the straightforward worldwide baseline. Storefront-specific external purchase exceptions exist; do not assume a single web checkout is universally interchangeable. Apple requires ongoing subscription value and access across the user's devices where the app is available; this does not require ports to every platform or journal sync. A useful original app can use web technology; review still considers completeness and adequate app-like utility. No architecture guarantees approval. [App Review Guidelines, sections 2.1, 3.1 and 4.2](https://developer.apple.com/app-store/review/guidelines/).

Use public language such as “No purchasable coins or paid capsules.” Do not market the subscription version as containing “no in-app purchases,” since that would conflict with how its subscription is sold. Keep the entire earned reward economy independent of billing: no paid odds boost, faster plant growth, subscription-only random reward advantage or currency sold through a disguised package.

Apple supports a two-week free introductory offer. Eligibility is associated with the subscription group, not a locally resettable 14-day counter. Returning users may not qualify. Configure the offer in App Store Connect and ask StoreKit for actual eligibility before promising it. [Introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions).

#### SUB2 — Entitlements must be separate from user-editable content

There is currently no entitlement or purchase model in the repository. Do not add subscription flags to the importable AppState and trust them. Backups, resets, snapshots, demo mode and clock-repair flows all intentionally replace or replay that state. They must not create paid access, restart a trial or revoke a valid purchase.

Build a small entitlement service around verified StoreKit transactions and ongoing transaction updates. Define the effective access state and expiry independently of auto-renew preference. StoreKit exposes verified/unverified transactions and current entitlements, including relevant grace-period states. A custom backend can support cross-platform access and operational needs later; it is not a prerequisite merely for a local iOS app to offer subscriptions. [StoreKit transactions](https://developer.apple.com/documentation/storekit/transaction), [current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements).

| State or event | Required catkin behavior |
|---|---|
| Products temporarily unavailable | Explain unavailability; allow retry and restore; never infer a zero price or broken free trial |
| Eligible trial / ineligible returning user | Show the actual offer and StoreKit-localized total renewal price and billing period |
| Purchase cancelled / pending / unverified | Keep present content intact; no false successful unlock; pending is distinct from failed |
| Trial or paid access active | Full promised access; no random-reward pressure or conversion-related changes to earned history |
| Auto-renew disabled | Reflect actual verified access and expiry; do not confuse stopping renewal with immediate deletion |
| Billing retry / grace | Honor the configured verified state, explain recovery, avoid destructive lockout |
| Expired / refunded / revoked | Apply documented feature access; retain history, keepsakes and export/recovery tools |
| Offline / new device / reinstall | Restore verified access appropriately; separately explain where history lives |
| Import / reset / demo | Content changes only; never replay or reset payment eligibility |

**Acceptance:** automated native StoreKit tests plus sandbox/TestFlight cases for every row, duplicate transaction delivery, interrupted purchase, reinstatement, store account change, price localization, upgrade/downgrade if offered, and expiry while editing. Apple's test matrix explicitly includes renewals, refund/revocation, cancellation, expiry, trial and billing failures. [Apple testing matrix](https://developer.apple.com/documentation/StoreKit/testing-at-all-stages-of-development-with-xcode-and-the-sandbox).

#### SUB3 — Make the 14-day experience worth judging without manipulation

My recommendation is one understandable subscription entitlement; if monthly and annual options are offered, present them as durations of the same access. Make the full annual charge as visible as any monthly equivalent. At trial consent show duration, renewal amount, billing frequency and management route. Provide Restore purchases and Manage subscription where people will look for them. Do not infer a price until the product and service commitment are defined. Apple's subscription guidance calls for clear trial length and the price after it ends. [Subscription presentation guidance](https://developer.apple.com/app-store/subscriptions/).

The product's satisfaction loop needs to work for a monthly habit or a busy adult as well as a daily user. A two-week trial may not contain a monthly completion, a seasonal review or the ten eligible live days used for a signature. Let users inspect a clearly labeled sample of long-term Progress without forging their history. Their own first two weeks should deliver precise scheduling, a dependable check-in, a meaningful weekly reflection, useful notes and a visible plant that reflects actual progress. Do not accelerate growth solely to sell the subscription and then slow it down.

Decide before implementation what remains available after expiry. I recommend at minimum a permanent readable archive, export, backup retrieval, and deletion of private content. Neither pets nor personal memories should disappear behind an unexpected payment demand. Continuing paid value should come from dependable maintenance, better planning/history tools, useful native conveniences and carefully authored additions. Endless collection inflation is a poor substitute for enduring utility.

#### IOS5 — Store submission and privacy facts to resolve before launch

| Gate | Current finding / action |
|---|---|
| Toolchain and native delivery | Current submissions require Xcode 26+ and an iOS/iPadOS 26+ SDK. This is the build SDK requirement, not a statement that every customer must run iOS 26. Choose and test a deployment target separately. No native build was produced in this Windows audit. |
| Privacy policy | No public privacy-policy or terms links were found in the current About implementation. Prepare accurate app-specific URLs and an in-app access path, reflecting the actual release binary and services. |
| Privacy labels | Current code is encouragingly local-first; the source scan found no app analytics/network client. On-device-only processing is not “collected” under Apple's label definition. Reassess after adding purchase SDKs, support diagnostics, sync or hosted content. Inspect actual network behavior before declaring Data Not Collected. |
| Privacy manifests | Audit every chosen native SDK and required-reason API. Capacitor is on Apple's listed SDK requirements. A privacy manifest, privacy label and privacy policy are different deliverables. Do not claim a JavaScript localStorage call alone implies a particular native API declaration. |
| Adults-only audience | Do not select Kids Category. Answer content questions accurately, then set a higher age override if the adult-only terms require it. A store age rating is not proof of a user's age. Assess any region-specific age assurance requirement when selecting storefronts; do not add ID collection by default. |
| Earned capsules | Document that coins/stamps and random items cannot be bought or cashed out. Apple's rating definition for loot boxes refers to randomized virtual items for purchase. Answer the actual questionnaire for the submitted behavior; adult positioning does not remove the need for accurate answers. |
| Global availability | Resolve trader status and required contact information before EU distribution. Check additional per-region submission requirements rather than assuming selecting all territories completes compliance. China mainland may require additional documentation/ICP information for applicable apps. |
| Review and support | Real contact/support URL, clear review instructions, trial/recovery access, accurate screenshots, working privacy/terms links, tested offline behavior, reproducible build and migration rollback procedure. Keep a record of what ships in each binary. |

Primary sources for the table: [SDK requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a), [privacy details](https://developer.apple.com/app-store/app-privacy-details/), [SDK manifests/signatures](https://developer.apple.com/support/third-party-SDK-requirements/), [required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api), [age-rating override](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating), [rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions), [EU trader information](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements), [territory-specific app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).

No account currently exists. Do not add sign-in just to imitate other subscription apps. If account creation later becomes part of the product, design deletion and recovery at the same time. Private local notes are not a public social feed; this audit does not invent moderation requirements for a feature that does not exist. Likewise, the present app should not be described as clinical treatment or a regulated medical tool merely because users may track health habits.

#### GLOBAL1 — International readiness is deeper than translation

**Source:** `src/catalog/formatCore.ts:17`, `src/domain/dates.ts:357`, `src/features/you/calendar.ts:47`, `src/styles/fonts.css`, `src/domain/hemisphere.ts`, `src/domain/signature.ts:42`. Current text/date formatting is intentionally English, numeric formatting forces en-GB, time labels use am/pm, and copy primarily supports one/other plurals. The fonts cover Latin subsets. A worldwide English launch can be honest; it is not a localized release.

Separate stable Gregorian storage keys and deterministic domain math from localized display. Introduce locale-aware number/date/time/plural formatting; preserve the established voice with translated whole messages rather than concatenated fragments. StoreKit prices must come from the store. Exercise Arabic/Hebrew names and RTL layout, CJK input methods, long German/Finnish labels, combining marks and emoji graphemes, non-Latin font fallback and text expansion. Screen-reader strings need the same localization work as visible text. A current Profile Enter handler lacks an IME composition guard (`src/features/you/ProfileSection.tsx:84`); this deserves a composition-event test before international launch.

Time needs a product policy: travel should not relabel a pet's historical arrival or rewrite its watering signature. Preserve occurrence date and original local-time context where meaning depends on them. The fractional-zone bug is already reproduced. Add Kathmandu +05:45, India +05:30, Lord Howe DST, international-date-line travel, a 03:30 day boundary, leap years and month ends to the matrix. Hemisphere selection is thoughtful, but northern/southern four-season prose still does not represent every tropical climate; offer a neutral seasonal voice or explicit preference before claiming universal fit.

The nighttime signature exclusion and 3-habit/120-second catch-up filter are deliberate, not numerical bugs. They can nevertheless mischaracterize night workers or someone who legitimately completes a short routine. Prefer transparent, revisable interpretation or a user-chosen time preference. Do not imply that unavailable timestamp evidence proves a particular behavior. The new first-stamp/compaction findings make this an especially important design principle.

#### ACCESS1 — Good foundations, incomplete evidence

The code already uses semantic controls, live announcements, reduced motion, explicit focus handling, contrast checks, safe-area styles and a rem-based Dynamic Type root (`src/styles/global.css:104`). It would be incorrect to report Dynamic Type as absent. The remaining question is whether all real tasks still work at large sizes and with actual assistive technology. Automated axe in Chromium does not answer that question.

The configured “iPhone 13” Playwright projects explicitly use Chromium and every project requests reduced motion (`playwright.config.ts`). There is no WebKit or real VoiceOver coverage in that configuration. Therefore green phone-named tests are not Safari/WKWebView certification. Add WebKit tests and normal-motion interruption tests, then real-device VoiceOver, Voice Control, Switch Control, hardware keyboard, Larger Text, landscape, small-screen and keyboard-open flows. Test the entire task, including toast Undo, import confirmation, the capsule gesture alternative, subscription cancellation and recovery.

Apple's accessibility labels should only describe verified support. Its Larger Text criteria include at least 200% or the platform maximum with usable tasks; VoiceOver criteria concern meaningful navigation and alternatives, not merely presence of ARIA. [Accessibility labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels), [Larger Text criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria), [VoiceOver criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria).

#### SHIP1 — Build, licensing, security and performance details

The new c66f588 CI run passes typecheck, unit tests, production build, first-paint budget, single-file build, end-to-end tests and deployment. The logged first-paint JavaScript is 138.9 KB gzip against 150 KB; e2e reports 234 passed and 48 skipped. This supersedes the earlier size failure. It does not establish device storage durability, StoreKit behavior or animation performance. [Exact CI run](https://github.com/wktw/lookwhaticando/actions/runs/36632566504).

Windows remains a reproducible portability problem: case-only module pairs still collide. Default macOS filesystems are commonly case-insensitive too, so reproduce and fix these names before native development rather than assuming Linux success is enough. This audit's Windows run has 2,496 passing tests, 15 failures and one skip; the failures are primarily the known UI import collisions plus crescent-generation precision. They are not 15 independent product defects. No repository files were renamed or fixed.

**New concrete credit error:** `src/features/you/copy.ts` credits Castoro to Tiffany Wardle. The font's upstream project credits John Hudson for roman, Paul Hanslow for italic, assisted by Kaja Słojewska. Correct the attribution and audit all third-party notices. The tracked file inventory has no standalone font-license/notice file; the installed font packages do contain OFL text. Verify that the final distributed artifacts carry the required notices/license in an accessible form, rather than assuming a package's development-only LICENSE is shipped. Do not make an unverified claim that embedded font metadata is absent. [Castoro authors](https://github.com/TiroTypeworks/Castoro), [Nunito license](https://github.com/googlefonts/nunito/blob/main/OFL.txt).

The earlier Vitest advisory remains tied to the unchanged lockfile and a development mocking/WebSocket exposure condition. It is not evidence of a deployed app data breach. Address the affected development dependency through a planned compatible update, keep dev servers away from untrusted networks, and verify the new native dependency chain separately. The current scripts use `--host`; a native bridge must never turn an accidentally reachable development origin into privileged access. [Maintainer advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).

The source shows a useful security posture: no remote evaluation or hosted AI dependency, private local data, text rendering rather than imported HTML, CSV formula-prefix defenses, and no incentive to create competitive anti-cheat. The import boundary still needs size/decompression limits, strict consumed-field validation and prototype-safe dictionaries. A checksum/compressed text payload is not encryption; explain backup and clipboard privacy appropriately. The adult audience makes private journal handling more important, not less.

Measure tap-to-paint and durable-save latency separately. The new after-frame write improves the former while exposing a lifetime bug in the latter. Add full interaction profiling with realistic note-heavy five-year histories, not only selectors or sparse synthetic notes. Include JSON serialization, native bridge transfer, database transaction, snapshots, memory pressure, background loops, low-power devices and a long Shelf session. Avoid a performance optimization whose success metric excludes the failing work.

#### Product opportunities ranked by useful outcomes

1. **A dependable journal with ownership controls.** Search/filter notes by habit/date, edit or remove old entries, and provide export that preserves their meaning. Today is currently the only note editor, and its short date strip leaves older entries effectively read-only. Success: a person can find, correct, privately export and deliberately delete a six-month-old note without editing raw JSON.
2. **A trustworthy history explanation.** Let a user understand why a day/period counted, which rule applied, and why growth changed. Show plain-language provenance for backfill, Tiny, pause and schedule edits. This turns complex math into confidence and makes support possible. It must not expose internal ledgers as the default product UI.
3. **A genuinely quiet habit-first mode.** Resolve remaining reward navigation/announcement inconsistencies. Preserve plants and optional companionship while removing currency emphasis. Let adults choose the degree of collecting. Test that the core five-minute daily journey is equally satisfying without opening a capsule.
4. **A return-after-absence flow.** On reopening after weeks away, offer review of a small number of active commitments, pause/finish choices and a realistic next action. Preserve the old garden. Reuse season review and Tiny mechanics; avoid demanding a backlog of retrospective checkmarks or framing the absence as failure.
5. **Native shortcuts and reminders that finish a real task.** After idempotent commands and transaction ownership are sound, a widget or App Intent can check one eligible habit without navigating the whole app. It must carry an occurrence date and unique command identity so repeated delivery cannot double reward. A read-only widget can ship earlier than unsafe mutation shortcuts.
6. **Meaningful companion continuity.** Display earned flourishes/outfits consistently and make friendship behavior correspond to actual dated shared routine history. Give feeding an all-items chooser and a clear continuation from reveal to pairing. These complete authored promises already present in the product; they add more satisfaction than another rarity tier.
7. **Private reliable backup with visible proof.** Show last verified recovery copy, offer a restore preview, explain local versus external copies, and let users erase all retained personal copies deliberately. Keep the normal Start over safety net clearly distinct from full privacy erasure. An optional biometric privacy cover is valuable only after actual device protection and accessible recovery are defined.

Avoid competitive leaderboards, streak insurance purchases, generic AI encouragement, escalating daily demands, paid mystery rewards and content added solely to create renewal anxiety. The differentiated product is a calm useful ritual with durable personal history, not a mechanism that needs ever more collecting to remain interesting.

#### Recommended order and concrete exit criteria

| Stage | Work | Evidence needed to move on |
|---|---|---|
| A. Reliability | Persistence/ownership/replace operations, validation, snapshot commits, latent capsule actions | Fault injection passes; no stale writer or async replacement can target a different save; restart preserves committed state |
| B. Truthful history and interactions | Cut-period math, day7 deletion, timestamp provenance, calendar capabilities, note controls, quiet mode, focused modal actions | Regression tests plus keyboard/assistive journeys; histories invariant under unrelated preference/retention operations |
| C. Native feasibility | Packaged local app, native storage/files/lifecycle, accessibility/performance spike | Signed real-iPhone proof with a migrated large save and airplane-mode restart |
| D. Paid access | Entitlement boundary, 14-day eligibility, pricing/terms/restore/expiry design | StoreKit tests and sandbox matrix; imports/resets cannot affect entitlement; cancellation preserves content access as promised |
| E. Release | Device beta, privacy/support/notices, adult age rating, chosen territories, migration/recovery drill | Reproducible signed binary, accurate metadata, actual-device accessibility evidence, tested upgrade and rollback strategy |

Do not assign calendar estimates until the native spike establishes the architecture and device constraints. Keep future native release work separate from web milestone completion. A green web build is valuable evidence for the web milestones, not a substitute for the native release gate.

#### Root coverage and limits

This pass rechecked build config, workflows, package/lockfile, native-file inventory, browser capability adapters, persistence interfaces, PWA update code, formatting/fonts, profile input, privacy/network call sites, subscription feasibility, official Apple submission/privacy/age/accessibility documentation and the combined prior register. Three specialist leaves independently examined failure state transitions, interactions and domain/history math. Strong new findings were reproduced with real modules and synthetic in-memory data. All earlier documentation remains in the preserved first audit; the ten-commit delta includes only a one-line VOICE documentation change and was separately compared.

Not performed: native build/signing, App Store Connect account inspection, real iPhone/iPad/VoiceOver sessions, StoreKit integration tests, a production security penetration test, or user research validating willingness to subscribe. No application source, GitHub branch, issue, PR, workflow, deployment or real user data was modified. Findings do not imply App Store rejection or approval. The release matrix is a concrete engineering assessment and current primary-source policy mapping, not worldwide legal certification.


## Preserved first pass detailed findings

These appendices preserve the full first audit's technical and creative findings, additional risks, refutations and integration updates. They are intentionally historical. Their older build figures, incomplete-screen descriptions and initial status assertions must not override the current register. The integration review and explicit delta sections use 7d16f11; baseline domain, data and creative material uses d93618a. Always read the local delta note before treating an older observation as current.

### First pass integration and delivery

**Source context:** [7d16f11](https://github.com/wktw/lookwhaticando/commit/7d16f113769ab5d681b5ddae1dbb8381f364a914). **Historical evidence; the current reconciliation above supersedes status statements here.**

### Integration, portability, delivery and experience review

Evidence from d93618aaa40b555ad42bb9fd118d6e14cca1f73a and the newer 7d16f113769ab5d681b5ddae1dbb8381f364a914. The newer revision is the reference for current-state conclusions below. Shared code cited for the original reproductions was unchanged in the 38-commit delta. Only isolated audit artifacts/dependencies were written; repository source and GitHub were untouched.

#### I1 — P2: Windows development cannot typecheck or build

The repository has `src/ui/CheckRing.tsx` alongside `src/ui/checkRing.ts`, and `src/features/capsules/Leaflet.tsx` alongside `src/features/capsules/leaflet.ts`. Case-insensitive module resolution searches the .ts helper before the .tsx component for extensionless imports. TypeScript reports TS1149/TS1261 plus missing UI exports; Rollup reports CheckRingArt is not exported by checkRing.ts. This is reproduced on Windows, both pinned snapshots, with Node 24.16.0. The earlier Linux CI passed; the later Linux CI also typechecks/tests/builds successfully. This is a portability defect, not a claim that the deployed Linux artifact universally fails.

Rename helpers to distinct stems such as checkRingModel/leafletModel and update consumers; add a Windows typecheck/build lane. Also make `e2e:preview` portable: its `E2E_TARGET=preview playwright test` POSIX assignment fails under the Windows npm shell. Avoid mixing unrelated line-ending-sensitive snapshot failures into this root cause. Local logs identify all failed tests, and no source was edited to force a successful build.

#### I2 — P1 delivery gate: newer integration exceeds the first-paint budget

At 7d16f11, GitHub run 36628403028 successfully completes Linux typecheck, tests and build, then fails the first-paint budget: **157.6 KB gzip against 150 KB**. Single-file build, E2E and deployment are consequently skipped. The earlier d93618a run 36625200960 succeeded. This is measured CI evidence, not an estimated bundle size or a production outage. The current report must not describe the newer source as deployed simply because the older public site works.

Inspect the static entry dependency graph and move feature-specific imports behind existing lazy boundaries; keep the budget meaningful. After repair, require the entire check pipeline, including single-file and browser journeys, to reach completion. Do not count those later checks as passed based on source presence. The entry bundle is 452.5 KB before compression; the CI log is the source for both figures.

#### I3 — P2: pending capsule recovery depends on a cabinet mounting active

`src/features/capsules/usePull.ts:35` reads a saved reveal, but `:52` and `:57` do so only in state initializers when active. `MachineCarousel.tsx:131` pre-mounts neighbors inactive. `CapsulesScreen.tsx:20` defaults a cold page to Cats. A pending Cows capsule first mounts inactive; selecting it later leaves the hook idle with no reveal. A synthetic mounted-hook test independently confirms inactive→active stays idle:none while fresh active mounting resumes the saved pet. The ownership/payment model correctly retains the already committed prize; this is not item loss.

For an available cabinet, select it, leave Capsules for another app tab, then return: the module's retained lastMachine makes it mount active. Reload alone resets to Cats. A seasonal cabinet whose season has ended is more serious: `CapsulesScreen.tsx:25` filters it out entirely while `src/domain/gacha.ts:295` rejects every subsequent ordinary pull as reveal-pending. Special Orders do not clear a non-order pending reveal (`gacha.ts:431`). The capsule flow can remain blocked until the season returns even though the tracker still works.

Recover pending reveals at screen/application level before allowing a new pull, independently of carousel lifecycle and present availability. Test every cabinet, cold reload after commit, phase changes, leaving/returning, expiry at midnight and eventual dismissal; assert no second charge and the same saved reward. The onboarding-specific version is detailed in the creative delta appendix.

#### I4 — P2: failed lazy sheets have no reachable retry

`src/app/SheetHosts.tsx:6`–`:10` runs load().then without rejection handling. After failure, requested stays true and Host stays null. Reopening a habit/pet changes its request but not that boolean dependency, so the effect does not retry. These hosts live outside the tab-keyed ScreenHost; tab navigation does not recover. A full reload followed by another request is the practical workaround. The ordinary screen loader has useful error/retry UI, but it does not wrap these asynchronous failures.

Add explicit loading/error/retry/cancel state with generation-safe completion; retain the requested item. Inject a rejected chunk followed by successful retry and verify editor/detail/pet actions recover without losing entered state. The new onboarding secondary capsule chunk has a similar swallowed rejection (creative appendix CR-D3).

#### I5 — P2: Quiet rewards contradicts its visible promise in the desktop shell

The now-reachable setting says “Hide coins, capsules and the wallet. Just the tracker.” (`src/catalog/lines.ts:2603`; `src/features/you/PreferencesSection.tsx:105`). Today hides several reward details, but `src/app/Sidebar.tsx:29` always renders all routes, and `:58` always renders WalletSummary. `WalletSummary.tsx:12` reads only wallet state and never the preference. A mounted Sidebar test with quietRewards=true confirms both the wallet section and Capsules link remain. TabBar also iterates the same unfiltered routes.

Make the shell obey one explicit quiet-mode presentation contract, including navigation, wallet, reward announcements and keyboard route choices; keep history, plant growth and notes fully usable. Do not remove earned inventory or currency. Test the complete quiet journey at phone and desktop widths, including existing saves and returning from a previously selected capsule tab. This is a current mismatch between a working toggle's promise and its integrated behavior, distinct from optional first-run preference proposals.

#### I6 — P2: “Find a plant” from a normal capsule reveal ends at a generic Shelf

`src/features/capsules/RevealCard.tsx:149` closes the reveal and invokes onPlace if provided; otherwise it only sets #/shelf. The routed CapsulesScreen receives no placement handler (`src/app/routes.ts:28`), so the pet and the requested pairing action are not passed to the destination. The user must find the newly acquired pet again, open its card and discover the plant chooser. The alternate Let them choose path does perform its domain action; do not report that one as broken.

Carry pet identity and intended action into the shared Pet Card/plant chooser. The promised action should finish in an actionable pairing state with clear focus, with a useful empty-habit case. Test a new pet from the normal Capsules route rather than only a callback-injected gallery example.

#### I7 — P2 layout contract: the desktop shell subtracts sidebar space twice from its content allocation

`src/app/App.module.css:24` gives main width calc(100% - sidebar), then computes horizontal percentage padding against its containing block at `:26`. At a 1280px viewport, a 248px sidebar and 720px content target yield 1032 - 2×280 = **472px**, not 720px, before screen-local padding. The wide variant yields 832px versus the 968px available after the sidebar and minimum gutters. Today and You each compensate locally (`src/features/you/You.module.css:639` and `:687`); Progress inherits the narrow base. This arithmetic is source-established; no claim of a fresh 200% text/real-device visual pass is made.

Define the post-sidebar content area once, then center a bounded child within it. Remove per-screen compensations together only after verifying all five destinations at 900,1024,1280 and wide desktop widths, plus zoom. Record intended widths explicitly. NOTES-w2-today already flags shell spacing, so this is a known integration issue still present in the reviewed source, not a novel discovery.

#### What improved during the audit

The 38-commit delta adds the actual Progress, Habit Detail, ritual readers, You, onboarding, install handoff, app banners and update lifecycle. It also fixes the root's initial N-shortcut observation by handling New Habit at shell level. Earlier claims that no settings/recovery UI or any browser journeys exist are superseded. The E2E configuration now discovers **279 tests in8 files** for dev mode, including the screen projects (31 tests in3 files at baseline). Discovery was verified locally; execution was not possible after the Windows production-build blocker. The newer CI stops before E2E at size budget. All configured browser projects are Chromium with reduced motion; this is not native Safari/iOS validation.

#### Performance, security and platform assessment

The current architecture sensibly has no server/account surface, analytics calls or user-content HTML rendering discovered in the reviewed runtime paths. User notes are rendered as text. The confetti innerHTML path uses authored shapes/colors, not an observed untrusted text sink. This is a source review, not a penetration-test certification. Import validation/durability are the materially demonstrated trust risks.

The read-only npm advisory check found **two moderate affected package entries for one advisory**, Vitest/@vitest-mocker GHSA-82fw-gwwq-j7x9. The maintainer says the issue concerns development-server mock interception, with unauthenticated exposure requiring particular plugin/network conditions. No such production exploit path was established here. Plan a supported patched testing-tool upgrade and run compatibility checks; do not report this as two separate production vulnerabilities or blindly run audit fix --force. Source: https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9 .

The baseline synthetic Today 3y×20 fixture measured about98.5ms cold, 1.61ms warm median and1.79ms after-tap median; those do not include synchronous durable saving or prove phone frame times. The newer You component fixture reports46.0ms first-render median in jsdom. The five-year compacted save fixture measured811,331 characters, but uses few short notes. A note-heavy12-habit history at280characters/day for5years exceeds6.1million note characters alone. Test reducer+serialization+write latency and realistic note volume before claiming long-term storage is solved. The new Progress note already records cold-view/memoization concerns; treat that as acknowledged work.

Native iPhone installation, haptic feedback, calendar import, clipboard/share permission behavior, background suspension, real VoiceOver/TalkBack, 200% text size, forced colors and motion-on touch choreography remain explicit M3 verification work. Automated ARIA/axe tests and a simulated iPhone viewport cannot substitute for those. No particular failure on an untested device is alleged. Source checks show focus traps, roving calendars, labeled controls, reduced-motion paths and text alternatives worth preserving.

The read-only public-site observation covered empty Today, Progress, Capsules and Shelf on the older deployed build. It confirms basic visual hierarchy and navigation only; it does not certify mature-save flows or the newly committed screens. No habits were created, no capsule was pulled and no live user data was edited through that browser.


### First pass persistence validation and recovery

**Source context:** [d93618a](https://github.com/wktw/lookwhaticando/commit/d93618aaa40b555ad42bb9fd118d6e14cca1f73a). **Historical evidence; the current reconciliation above supersedes status statements here.**

### Persistence, data integrity, recovery, privacy, and scale audit

Snapshot: `d93618aaa40b555ad42bb9fd118d6e14cca1f73a`. Repository was read only. This leaf wrote only this findings document. Source paths/lines refer to that snapshot, not Claude's live checkout. Root owns execution of verification checks. Root independently reproduced D1, D3, D5 and D7 with synthetic runtime assertions in `work/audit/repros.test.ts` (harness names D01–D04 respectively). Other findings are source-confirmed unless explicitly marked as risks; actual disk/OS failures were not induced.

#### Assessment

The foundation is unusually deliberate: pure transactions, clock/ledger separation, schema validation before import, an isolated demo, backup envelopes, quota-aware writes, Web Locks, export round trips, and extensive property/large-save tests. Its weak point is the boundary between an in-memory action and an actually recoverable save. Several happy-path APIs report success before all durable steps are known to have succeeded. Those weaknesses compound precisely when the user most needs recovery: storage pressure, imports, stale tabs, or an app update.

This snapshot's You screen remains an acknowledged placeholder. Backup, storage, and recovery UI absence is therefore planned integration work, not a newly discovered implementation regression. The store defects below remain material even after those screens are connected.

#### Findings

##### D1 — A full or blocked browser store becomes an apparently successful, disposable new save

- **Priority/confidence:** P1, high; source-confirmed. Affects present runtime, especially storage pressure/file testing/private or restricted browser contexts.
- **Evidence:** `src/state/persist.ts:77–87` probes localStorage by writing `catkin:probe`; every exception returns `null`. `src/state/store.ts:142` captures that result once; `:180–182` substitute `memoryStorage()` for null. Hydration reads from that replacement at `:411–444`. `SaveQueue` sees successful memory writes and reports `saved` (`persist.ts:296–315`, `store.ts:249–252`).
- **Repro:** Seed a valid `catkin:v1` in readable localStorage, fill available quota so even the probe cannot be added, then reload. `getItem` would still recover the save, but `browserStorage()` returns null. The app starts a fresh memory-only profile. Complete an action: the status becomes `saved`; reload again and that work vanishes. Completely blocked persistence likewise permits memory-only play without a truthful persistent-storage status.
- **Impact:** Existing data appears lost; new effort is lost on reload; the code never reaches its otherwise useful quota-compaction recovery for the existing store. This also defeats the advertised offline/local reliability.
- **Refutation attempted:** Catching exceptions is necessary, and memory fallback avoids a boot crash. Neither requires hiding a readable save nor calling volatile writes saved. The saved source is normally still present, so describe the first part as apparent loss, not automatic erasure of the old bytes.
- **Remedy:** Separate readable-store detection from writable-store capability. Return localStorage when quota prevents only the probe; load/export existing data regardless. Represent memory-only operation explicitly and prominently, and do not report durable success. Offer recovery/export before allowing new effort that cannot survive reload.
- **Test gap:** `tests/unit/state/persistence.test.ts` covers queue quota and entirely throwing storage, but not `browserStorage()` on an existing readable, full store; fakeBrowser injects storage directly and bypasses this boot path.

##### D2 — Failed saves cease being pending, so there is no retry of the user's last change

- **Priority/confidence:** P1/P2 depending on failure frequency, high; source-confirmed. Should be fixed before any real-user trial.
- **Evidence:** `src/state/persist.ts:281–293` clears both the debounce handle and `pending` before attempting `write`; failure does not restore either. `src/state/store.ts:296–309` has already committed and emitted events for ordinary actions. `flushSaves()` (`:472–474`) can only flush pending work. `writable()` (`:234`) deliberately permits continued action in `storage-full`. Copy promises retry in `src/catalog/lines.ts:2505` / `docs/VOICE.md:991`.
- **Repro:** Allow a real check-in or note edit to reach the queue while `setItem` throws; then make storage writable again without another mutation. Call `flushSaves`, hide/show, and reload. The last change was discarded from the queue and the old persisted state returns. The user may have seen the full celebration.
- **Impact:** Unsaved effort silently falls out of the retry path. A later successful mutation may happen to persist it, but closing/reloading first loses it. The current copy's “trying again” is not implemented.
- **Refutation attempted:** `pull()` explicitly reschedules the previous state after a failed pull (`store.ts:644–647`), and successful later actions save the current memory state. This does not rescue the last ordinary action when no later mutation happens.
- **Remedy:** Keep a dirty pending state until durable success; retry with bounded backoff and on resume; preserve dirty state across transient failure. Show persistent unsaved status and allow exporting it. Avoid emitting irreversible-success messaging until the relevant persistence contract is satisfied.
- **Test gap:** Queue tests assert error reporting and preservation of the last good disk save, but do not restore write capability and check a retry with no subsequent mutation. Add a whole-store check-in→failure→recovery→reload scenario.

##### D3 — Import, undo, and restore report success even when the replacement save was never written

- **Priority/confidence:** P1, high; source-confirmed. Data APIs already exist; visible import UI is planned.
- **Evidence:** `src/state/store.ts:322–331` makes `replaceState` return void and ignores the status from forced `persist`. `applyImport` (`:879–892`) unconditionally returns `{ok:true}` afterward. `undoImport` (`:900–907`) unconditionally removes the undo token and returns true. `restoreSnapshot` (`:916–922`) also returns true. Import ignores `writeJson` failure for `UNDO_IMPORT_KEY` at `:889`.
- **Repro:** Import a valid backup larger than writable localStorage space, while IndexedDB can still store the pre-import snapshot. The app shows the imported state and returns success but reload restores the old save. Alternatively fill localStorage after an import, then undo: memory changes, the undo key is removed, but the original imported disk save remains. A snapshot may exist while the undo index failed to write, yet import claims success with no discoverable 24-hour undo action.
- **Impact:** Recovery actions lie about their outcome. The undo affordance can be consumed despite no durable undo. Later mutations can unexpectedly make the previously failed replacement stick.
- **Refutation attempted:** The quota writer protects the prior good main save, which limits outright corruption. It does not make a false-success import acceptable, and the generic failed-save status is currently not consumed by any screen.
- **Remedy:** Return/await a durable replacement result. Publish the replacement state and success only once its save is accepted; retain the old state and undo metadata on failure. Treat durable undo metadata as part of the operation, or use a single journal/transactional storage design that can recover the transition deterministically.
- **Test gap:** `tests/unit/state/store.test.ts:198–252` tests successful import/undo/restore; `stage4-store.test.ts:29–48` tests failing snapshot creation. Neither tests successful snapshot creation followed by failed primary write or undo-index write.

##### D4 — Snapshot writes resolve before the IndexedDB transaction commits

- **Priority/confidence:** P1 for guaranteed pre-import recovery, otherwise P2; high source/API confidence, actual disk-abort incident not reproduced.
- **Evidence:** `src/state/snapshots.ts:101–105` resolves `req()` at request `onsuccess`; `:122–135` drops the transaction handle and implements `put/remove` using only that request promise. `snapshotCurrent()` at `store.ts:869–875` returns an undo id when this promise resolves; `applyImport` trusts it.
- **Failure scenario:** IndexedDB's put request succeeds but its transaction later aborts during commit (quota/disk error/explicit abort). The store already believes the undo copy exists and can replace the user's save. The promised undo record was rolled back.
- **External verification:** The [IndexedDB specification](https://www.w3.org/TR/IndexedDB/#transaction-lifecycle) separates request success from transaction commit and permits commit to abort. The [complete-event documentation](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event) identifies successful commit as the transaction `complete` event. This is an implementation/API mismatch, not a request for OS crash-proof durability.
- **Refutation attempted:** IndexedDB transactions normally commit immediately after requests complete, and the common path works. `onsuccess` is still not the success boundary promised by the pre-import snapshot guarantee.
- **Remedy:** Keep the transaction object, resolve writes on `oncomplete`, and reject on `onabort`/`onerror`; retain request results separately. Add connection/version-change handling and a recoverable retry for failed database opens while revisiting the adapter.
- **Test gap:** All snapshot tests use `memorySnapshotStore`, which has no request/commit distinction. Test the real adapter with a request-success→transaction-abort sequence and an actual browser import/restore round trip.

##### D5 — An old tab can steal and overwrite a newer-schema save through “Use here”

- **Priority/confidence:** P1 before the first schema upgrade; high, source-confirmed. Future-update blocker, not evidence that schema 1 has already lost a schema 2 save.
- **Evidence:** `src/state/store.ts:391–398` ignores every storage-adoption result except `ok`. `useHere()` at `:462–469` constructs a rev-0 queue when `loadSave` returns `newer`, keeps the prior in-memory state, sets readOnly to false, and steals the lock. By contrast hydration correctly guards newer saves at `:422–427`.
- **Repro:** Keep old v1 tab B open/read-only while a new app tab A owns and writes schema v2. In B choose Use here. `loadSave` returns `newer`, yet B steals ownership and subsequent actions write its retained v1 state over the v2 data.
- **Impact:** The exact scenario the newer-schema read-only protection is intended to prevent becomes possible across a deployed update. New fields/content can be destroyed by a stale installed app/tab.
- **Refutation attempted:** Freshly booting the old app is protected. This route specifically starts in `other-window`, so the hydration guard is not rerun. A schema upgrade is required for the severe effect.
- **Remedy:** Share the same load/adoption/version decision routine across hydrate, storage events, Use here, and demo exit. Refuse takeover of `newer`/corrupt data until a safe recovery action is chosen; do not acquire a writer lock for newer data. Recheck the persisted schema after ownership is actually granted.
- **Test gap:** Existing single-writer tests cover ordinary newer revisions and stolen locks, while newer-schema tests cover only initial hydration. Add a two-context old-tab/new-tab upgrade/takeover scenario.

##### D6 — “Additive defaults” turn fundamentally incomplete/corrupt saves into valid empty history

- **Priority/confidence:** P1/P2, high; source-confirmed. Existing recovery-path weakness.
- **Evidence:** `src/state/migrate.ts:29–41` fills every absent top-level section and most absent fixed section fields from a new save. `:59` does so even for the current schema. `persist.ts:133–145` migrates before validation; `loadSave` only tries the backup if parsing reports corruption (`:157–168`).
- **Repro:** A syntactically valid envelope with `state:{version:1}` is expanded into a complete fresh state and accepted. More realistic: delete `logs`, `wallet`, or `ledger` from a populated v1 save/backup. The missing historical or economic section is silently replaced with `{}`/zero; the loader treats it as good and bypasses the previous backup.
- **Impact:** Validation no longer distinguishes known additive development fields from lost core data. A recovery safeguard can bless loss and eventually replace the last-good backup with the reconstructed damaged save.
- **Refutation attempted:** Supporting additive fields without forcing a migration for every pre-release edit is reasonable and documented. The blanket fill goes much further than additions such as `pantry`, `offDays`, or optional settings. An entire original-schema ledger/history is not an additive omission.
- **Remedy:** Explicitly whitelist known optional/additive defaults, preferably by source version, and require original core sections. Report recoverable omissions for user review instead of making silent resets. Keep a known-good fixture per schema.
- **Test gap:** `persistence.test.ts` intentionally verifies default filling for selected fields but never tests missing core sections. `validate.test.ts` rejects a missing ledger directly, while the real load/import path repairs that ledger before validation—those tests do not cover the production boundary.

##### D7 — Validation accepts known fields that make the next view-model call throw

- **Priority/confidence:** P2, high; source-confirmed concrete crash. Relevant to damaged imports and future Memory Shelf integration.
- **Evidence:** `src/state/validate.ts:150–176` does not validate legacy monthly `stems`, weekly `quote`, letter `readAt`, or several discriminated-union details. `src/state/views/pets.ts:370–378` does `(l.stems ?? []).map(...)` without protection. State types explicitly know `stems` (`types.ts:609–610`).
- **Repro:** Add `{kind:'monthly',id:'m',month:'2026-09',achieved:0,expected:0,stars:0,growingBonus:false,stems:7}` to a fresh valid state's inbox. `validateState` accepts it, as does the migration/import pipeline; `memoryShelfVM` throws because number 7 has no `.map`.
- **Impact:** A backup advertised as valid can poison a screen or its reactive selector after application. The unknown-field tolerance policy is not an excuse here: `stems` is a known consumed field.
- **Refutation attempted:** Current reducers emit valid stem arrays/pressings, so ordinary UI input does not produce this value. The validator's job is the untrusted/damaged import boundary, where this exact malformed shape is in scope. The Memory Shelf screen is planned, but its selector is already implemented.
- **Remedy:** Validate all consumed known fields, including legacy fields, against the discriminated union. Keep deliberate unknown collectible tolerance. Add a contract property: every accepted state must safely execute the supported selectors and export functions. Also strengthen birthday/calendar checks, timestamp upper bounds, anchor invariants, and PlantLook evidence validation without confusing all omissions with critical crashes.
- **Test gap:** Hand-picked corruption tables focus on selected fields. They lack the accepted-state→selectors property and malformed legacy/optional-field cases.

##### D8 — Snapshot restore does not uphold its own undo-safety contract

- **Priority/confidence:** P2, high; source-confirmed. Independent of D3's write-failure issue.
- **Evidence:** `src/state/store.ts:915–922` says restore can itself be undone, but discards a failed `snapshotCurrent()` and proceeds regardless. It never sets `UNDO_IMPORT_KEY`; only `applyImport` does (`:889`).
- **Repro:** Use a snapshot adapter whose `get` succeeds for an older snapshot and whose `put` fails for the current save. `restoreSnapshot` still replaces current progress and returns true. Even with successful snapshotting, the existing Undo import token can still point to an earlier import rather than the restore just performed.
- **Impact:** Restore is less safe than import despite making the same wholesale replacement. A user reaches for recovery and can lose the newer state with no promised undo route.
- **Refutation attempted:** On successful snapshot creation, the prior state is manually recoverable through the snapshots list, so it is not always lost. The failure branch is the decisive defect; comments and UI contracts should also distinguish manual snapshot recovery from one-click Undo.
- **Remedy:** Reuse the import replacement transaction: snapshot first, verify it, write the undo pointer, and only then replace; explicit confirmation is needed if the user chooses to proceed without an undo copy. Match the existing import contract rather than inventing a separate restore path.
- **Test gap:** Store restore test only checks the success path and presence of any pre-import snapshot. It does not cover failed pre-restore snapshot or whether Undo resolves to the immediately prior state.

##### D9 — Time-aware selectors discard real minutes and round in UTC, giving the wrong local block

- **Priority/confidence:** P2, high; source-confirmed, delegated from domain leaf to this report.
- **Evidence:** `src/state/selectors.ts:39–44` replaces now with the beginning of its UTC epoch-hour before passing it to the local time reader. `src/state/views/today.ts:294–300,336` reads that value for greeting and block; `:273–277` supports day starts specified in minutes.
- **Repro A:** With UTC+05:30, actual 11:05 local is 05:35Z; the selector passes 05:00Z, which is 10:30 local. Today still says Morning until 11:30. Quarter-hour zones have analogous errors.
- **Repro B:** Even in an integer-offset zone, set dayStartsAt to 03:30. At 03:35 the store correctly advances the app date, but Today receives 03:00 and chooses the previous day's Evening until 04:00.
- **Impact:** The date and “current” section can contradict each other, greet incorrectly, and order the user's habits under the wrong block. Raw view-model tests passing exact times miss the selector integration error.
- **Refutation attempted:** Avoiding whole-screen recomputation every 30 seconds is sensible. It does not require replacing the timestamp with an incorrect one; use a coarse dependency based on the relevant *local* block/day/greeting and pass actual time at invalidation.
- **Remedy:** Memoize semantic local boundaries (including configured day-start minutes and timezone changes), or pass current minute while limiting recomputation elsewhere. Test selectors in fractional-offset zones and with non-hour day boundaries.

#### Additional risks and integration gates

1. **Async replacement races (P2 risk, code-confirmed unsafe boundary; UI path not yet implemented).** `applyImport`, `undoImport`, and `restoreSnapshot` check writable/demo status only before asynchronous parsing/snapshot I/O (`store.ts:879–921`). A lock transfer, reset, demo transition, or new action can occur while waiting. `replaceState` changes in-memory state before `persist` checks ownership. Capture an operation generation + state revision, serialize replacements, recheck ownership/current generation at commit, and make the UI cancel/disable conflicting actions. Include day rollover and two-window races; a modal alone does not stop those.

2. **Lock acquisition is not an acknowledged commit (P2 integration risk).** `SaveQueue.saveNow()` returns `saved` when a held queue's `flush()` returns null (`persist.ts:257–259,286`). Hydration lets in-memory actions run before asynchronous Web Locks resolves. A fast action can be celebrated before the write is possible, and then be discarded if the lock is refused. The lock fake calls back synchronously (`tests/unit/state/fixtures.ts:99–111`), masking this timing. Add a distinct pending-ownership state; do not claim an urgent write is durable until the grant and write both succeed.

3. **Actual save/lock/recovery banners still need wiring (known M2 work, release gate).** `readOnly`, `saveStatus`, and `loadIssue` have no consumers outside `store.ts` in this snapshot. A second window can simply ignore taps, a corrupt save can look like an ordinary fresh start, and storage errors can be invisible. `YouScreen.tsx:1–8` is a placeholder; `NOTES-open.md` explicitly assigns the unfinished screens. Wire persistent app-shell status, export/recovery actions, and actual disabled controls before user trials, not just a Data-page diagnostic. `readOnly:'storage-full'` is intentionally not a hard action guard, so UI must communicate the precise unsaved state.

4. **Snapshot migrations are absent from restore (schema-upgrade gate).** `undoImport` and `restoreSnapshot` call current `validateState` directly on stored snapshot states (`store.ts:904,919`); they do not run `migrate`. On the first schema bump, all old daily/weekly recovery copies become unusable by these methods even if a normal backup could migrate. Migrate/validate snapshot content on restore; retain original bytes and demonstrate old-version recovery fixtures.

5. **Start over retains personal data in IndexedDB (privacy/product decision).** `resetAll` deliberately retains snapshots (`store.ts:925–953`), but the approved copy promises “Every habit, plant and pet on this device goes” (`lines.ts:2579`, `VOICE.md:1044`). Old notes/name/birthday/habits remain recoverable in the same app. This is a safety-net design choice, not an accidental source bug; reconcile the copy and add a separate unambiguous erase-all-copies operation for a shared-device handoff. Keep an ordinary reversible start-over if desired.

6. **Scale tests underrepresent journaling and the persistence cost (P2 growth risk).** The five-year fixture puts a short ~52-character note on only 4% of logs (`tests/unit/state/bigsave.ts:74`). `size.test.ts:21–36` proves that fixture under 1M characters, not bounded history. Compaction only drops old live stamps/short-window ledgers/found things; counts and 280-character notes are retained forever (`logging.ts:403–417`, `rollover.ts:126–130`). Twelve daily habits with full 280-character notes for five years have over 6.1M note characters alone, before envelopes, copies, or journal entries. `perf.test.ts` times view models; it excludes reducers, `JSON.stringify` and synchronous localStorage writes. Add note-heavy and longer-retention fixtures, actual store-action latency/quota checks on phone-class hardware, and a threshold/migration plan to IndexedDB incremental records. Do not prune the user's memories silently to meet a quota.

7. **Import memory limits (hardening opportunity, not demonstrated remote exploit).** `handoff.ts:112–115,139–147,165–193` buffers the entire decompressed payload and parsed state with no input/expanded-size/count limits. A mistakenly huge backup or highly compressed payload can exhaust mobile memory before validation. Apply a documented generous limit, count decompressed bytes while streaming, stop cleanly, and report oversized files. There is no evidence of remote code execution or data exfiltration in this path.

8. **Snapshot retention and reads can become expensive.** `snapshotCurrent()` never prunes, and retention only runs during a later `takeDailySnapshot`; many same-day imports/restores can grow pre-import history beyond `KEEP['pre-import']`. `indexedDbSnapshotStore.list()` (`snapshots.ts:124–127`) materializes every full state with `getAll()` merely to display metadata. Use a metadata-only store/index/cursor and prune safely after committed pre-import writes, protecting the active undo record. At ordinary small history counts this is not a blocker.

9. **Offline and update recovery need real-browser lifecycle tests.** `e2e/pwa.spec.ts:8–32` proves service-worker offline launch/navigation; it does not save a user's action offline, restart, verify it, upgrade the app, or restore after failure. Pure memory adapters are valuable but cannot establish browser persistence durability. The existing `pwa.ts` update behavior differs from DESIGN §11.1; root owns that UI/deployment issue.

#### Useful product opportunities grounded in this architecture

- **A recovery preview that shows what will change.** Before replacement, show source date/device and an intelligible delta: newer waterings/notes that would disappear, habits/pets/settings restored, and exactly where the undo copy will live. Existing preview counts alone cannot reveal that a similarly sized backup is much older. This protects months of personal effort and makes manual device transfer usable without adding an account.
- **An honest backup receipt.** Track “last backup successfully delivered” separately from “backup JSON generated”; verify the generated backup by parsing it before offering it, and show its date, scope, and device. `exportData/exportPayload` currently mark lastBackupAt before downstream share/copy/download success (`store.ts:849–859`). Add a user-controlled verification/import rehearsal using preview only. This is substantive local-first trust, not extra game mechanics.
- **Portable human-readable history with deliberate privacy scope.** JSON currently includes everything and CSV exports date/habit/count/target/state only. Offer an explicitly chosen notes/journal export with stable habit IDs and rule history, so a person's reflections remain useful outside catkin. Keep the default CSV small and avoid silently including private notes in shareable images or calendar descriptions. Password-protected backups could be optional for users who store private reflections in cloud notes; do not make encryption a prerequisite for normal local use.

#### Coverage and review evidence

- **Documentation read fully:** README.md; docs/AUDITS.md; NOTES-domain.md; NOTES-ui.md; NOTES-open.md. Relevant DESIGN sections reviewed: §9.4–9.6, §11–11.2, persistence and iOS transfer contracts; relevant VOICE storage/error/data rows reviewed. Old module notes were treated as historical contracts where NOTES-open supersedes them.
- **All state source reviewed:** api, defaults, demo, events, handoff, migrate, persist, selectors, snapshots, store, types, validate; views calendar, capsules, common, company, habit, pets, progress, season, today. Data-related domain paths reviewed: profile, tx, rollover, logging compaction/note operations, rituals, stacking; integration main.tsx/App.tsx/YouScreen/pwa and import/export consumers searched. Core domain math remained the domain leaf's ownership.
- **Tests reviewed:** state persistence/handoff/validate/store/stage4-store fixtures, size/perf/bigsave, relevant adversarial persistence tests and profile-file tests; source checks of stage-B validation and selectors; e2e PWA persistence scope. Root runs checks and independent repros. This leaf did not execute repo tests or alter source.
- **Pass 1 (full review):** documentation and complete state/data source inventory; traced hydrate→mutate→save→reload and export→preview→snapshot→replace→undo.
- **Pass 2 (expert reread):** failure-state transitions, snapshot transaction boundaries, schema upgrades, per-tab ownership, copy/API contracts, and realistic long-lived journal size.
- **Pass 3 (refutation):** checked intentional additive compatibility, unknown collectible tolerance, the pull-only rollback exception, planned screen placeholders, daily snapshot semantics, existing quota/adversarial tests, and legitimate manual snapshot recovery. Did not label acknowledged snapshot-rewind farming as a new bug; NOTES-domain already records it. Did not claim encryption, server sync, or append-only economy proof is automatically required for an offline single-player app.
- **Pass 4 (polish):** separated present defects, future-schema gates, planned UI work, risks requiring browser verification, and useful feature opportunities. Priorities favor preserving personal habit history over preventing harmless local economy manipulation.

#### Delta review: 7d16f113769ab5d681b5ddae1dbb8381f364a914

This section supersedes the baseline's descriptions of absent You screens and shell banners. It does not rewrite the evidence collected at d93618a. The new snapshot is `work/lookwhaticando-current`; all file/line references below refer to that snapshot. No source or tests were changed or executed by this leaf.

##### What is now implemented, and which earlier findings remain

- **You and recovery controls are now real.** `src/features/you/YouScreen.tsx:24–55` renders profile, habits, preferences, reminders, data, install, and About. `DataSection.tsx:255–294` exposes export, import, snapshots, undo, demo, and reset. The shell now shows other-window/Use here, newer-schema, storage-full, clock, and demo states (`src/app/App.tsx:46–82`). You disables editable fieldsets for other-window/newer-version and retains export access (`YouScreen.tsx:34–52`, `lock.ts:9`). These substantially improve normal integration; the baseline's blanket missing-screen/missing-banner claims are obsolete.
- **D3 is now directly exposed to users, and wrappers do not repair it.** `ImportSheet.tsx:150–166` trusts `applyImport().ok`, closes, and shows success. `DataSection.tsx:101–110` and `:243–245` trust restore/undo booleans and show success. None checks the final durable-write result; storage-full is intentionally allowed by `saveLocked`. The shell's storage-full banner can appear at the same time as an “Imported”/“Back to…” success toast. D1–D8 retain their underlying data-layer defects; visual recovery controls do not make a failed write durable. D9 remains in unchanged selectors.
- **The misleading reset copy has been partly corrected.** The second confirmation now explicitly says the daily copies stay on this device (`copy.ts:66–67`; rendered at `DataSection.tsx:173–174`). Therefore the baseline's claim that reset never discloses retained copies is obsolete. A separate erase-all-copies choice remains a useful shared-device/privacy capability; retaining snapshots is intentional, not a new accidental leak.
- **Failure after browserStorage returns null remains especially deceptive.** D1 switches to memory storage and reports successful memory writes. The new status row only checks `storage-full` (`DataSection.tsx:63–80`) and cannot distinguish volatile storage from a durable browser save. The new normal UI does not mitigate this confirmed reproduction.

##### D10 — Corruption recovery and non-quota save failures still lack a normal user-facing recovery state

- **Priority/confidence:** P2, high source confidence; actual storage-failure browser run not executed in this delta.
- **Evidence:** `App.tsx:5,46–54` consumes `readOnly` and only the `storage-full` save status; it does not consume `loadIssue` or `saveStatus.status === 'unavailable'`. `DataSection.tsx:66–79` likewise treats every non-full status as “Saved on this device”/“Saved in this browser tab”. A source-wide search finds `loadIssue` consumed only in `Diagnostics.tsx:10,60`; that screen is behind the diagnostics route/seven version taps. Store hydration sets recovered/corrupt issues at `src/state/store.ts:419,428–430` and starts fresh for unrecoverable data.
- **Scenario/impact:** A malformed main save with a valid previous backup silently rolls the user back. With no valid backup it silently returns to onboarding; an ordinary user has no explanation or route to inspect/export the quarantined data or locate existing daily copies. A later non-quota storage access failure updates `saveStatus` to unavailable without a normal unsaved notice. The hidden diagnostics line is insufficient recovery guidance.
- **Refutation:** Normal quota failure, another writer, and newer-version hydration now have visible banners. This finding is specifically the remaining load-recovery/unavailable branches, not the old claim that all banners are absent.
- **Remedy/test gap:** Give recovered-from-backup, corrupt-save, unavailable, and volatile-storage states explicit persistent explanations and export/recovery actions. Test hydration with malformed main/valid backup, both invalid, and non-quota write failure at the actual App boundary; verify the visible state and preservation of original bytes.

##### D11 — “Import without an undo” still advertises Undo, and can retain the wrong undo target

- **Priority/confidence:** P2, high; deterministic source-path defect, not runtime-tested by this leaf.
- **Evidence:** `ImportSheet.tsx:155–156,230–239` asks permission to import without undo, then `doImport(true)` reaches the same unconditional `toastImported()` at `:165`. `toastImported` always promises 24 hours and offers Undo (`:49–65`). `store.ts:888–891` only writes an undo key if a new snapshot exists; it does not remove a previous import's undo key when proceeding without a snapshot.
- **Scenario:** Make IndexedDB snapshot writes fail, accept “Import anyway”, and complete a valid import. The success toast promises a capability that was just explicitly unavailable. If an earlier import still has an unexpired undo key and the older snapshot remains readable (e.g. new writes fail at quota), Undo may restore the state before that earlier import, not the state immediately before this import.
- **Impact:** The recovery action either silently does nothing or restores an unexpected older state. The warning before import does not excuse a contradictory success receipt afterward.
- **Refutation:** With successful snapshot creation the normal promise is correct. This only affects the supported no-undo branch and stale-token case; it is not a claim that every normal import lacks undo.
- **Remedy/test gap:** Return the concrete undo capability/token from `applyImport`, clear stale undo metadata when intentionally importing without undo, and show the action only for the exact committed replacement. Test an earlier successful import followed by failing snapshot creation and an accepted no-undo import, with both readable and unavailable old snapshots.

##### D12 — Snapshot I/O failure is presented as no copies, or leaves recovery controls stuck

- **Priority/confidence:** P2, high source confidence; failure injection not executed in this delta.
- **Evidence:** `DataSection.tsx:93–96` maps every rejected snapshot-list read to `[]`; `:115–116` then shows the empty-state “The first daily copy is made tonight” (`catalog/lines.ts:2497`). `restore()` awaits `restoreSnapshot` without catch/finally (`DataSection.tsx:101–110`), so a rejected snapshot read skips `setBusy(false)` and error messaging. The undo handler also has no rejection handling (`:243–246`); the toast undo promise only has `.then` (`ImportSheet.tsx:58–64`). The store's snapshot `get` calls can reject (`store.ts:903,918`).
- **Scenario/impact:** IndexedDB cannot open/read while existing backups matter most. Daily copies incorrectly implies no copies were made. If list succeeded but a restore read subsequently fails, the confirm remains loading; cancel is still possible, but busy stays true on later restore attempts until the component is remounted. Undo produces an unhandled rejection without a useful failure note.
- **Refutation:** List errors are caught, and cancellation remains available; this is not a whole-app deadlock. The problem is incorrect recovery information and a stranded recovery attempt.
- **Remedy/test gap:** Preserve distinct loading/empty/error states, expose retry, and use catch/finally around restore/undo with a recoverable message and no success toast. Inject list/get rejection and assert controls become usable again without navigation/reload.

##### New update integration amplifies D2: background reload is allowed while the save is unsaved

- **Priority/confidence:** P2 as a specific integration consequence of D2; high source confidence, real service-worker failure scenario not run.
- **Evidence/scenario:** `src/app/pwa.ts:64–65` treats only `holdUpdates` and UI layers as busy; `:119–126` automatically reloads a hidden app when an update waits. It does not consult save failure/dirty status. After an ordinary check-in or preference mutation fails to persist, D2 has already dropped the pending write. Hiding the app with an update ready can then discard the only current copy in memory. `pagehide` flush (`store.ts:507`) cannot retry a queue entry already cleared by D2.
- **Refutation:** Open sheets/onboarding/reveals are protected by the existing busy mechanism; normal pending writes are flushed on pagehide. I specifically rejected a simplistic claim that every name edit is lost during update: `NameRow` commits on hide and normal reload fires the store's pagehide flush. Mobile suspension immediately after hide, without pagehide, remains a separate unverified lifecycle edge because the name commit occurs after the store's earlier visibility flush (`main.tsx:54–65`, `ProfileSection.tsx:62–68`).
- **Remedy/test gap:** Gate automatic reload on a truthful durable-save/dirty result, retain and retry failed state, and offer an export path when it cannot be made durable. Test update-ready→write failure→hide→return/reload with the real store. Also test a focused name draft and background suspension explicitly before claiming that mobile path is protected.
- **Related reachable path:** You permits entering the demo during storage-full (`lock.ts:9`, `DataSection.tsx:272–273`). `enterDemo` preserves memory temporarily, but `exitDemo` prefers any valid older on-disk save over `realState` (`store.ts:978–982`), dropping failed-write changes even without a browser reload. This is another concrete consequence of losing dirty-state ownership; gate the transition or prefer a tracked newer unsaved real state.

##### Known unresolved items and measured scope

- **Backup receipt remains a known, documented gap, not a newly discovered surprise.** `NOTES-w2-you.md` request 10 explicitly identifies it. `DataSection.tsx:219–232` generates/marks before share/copy succeeds; a cancelled share returns without undoing `lastBackupAt`, and manual-copy fallback has no confirmed delivery. `InstallSection.tsx:29–34` shares the same issue. Move the marker after the supported delivery result and distinguish generation, delivery, and user-kept backup as appropriate. `backupNudge` also deliberately never nudges a never-backed-up user (`DataSection.tsx:54–56`, pinned by `pure.test.ts`); improving that is a product decision, not an accidental branch defect.
- **Import lifecycle is not cancellation-safe.** The import button alone is busy; “Keep what’s here”, sheet close, input and file/paste controls remain available (`ImportSheet.tsx:175,181–185,194–215`). Closing does not cancel/invalidate an in-flight `applyImport`; it can still replace state afterward. The open reset does not increment the preview generation or clear the pending file (`:93–100,130–148`), so delayed reads/previews can also affect a later sheet visit. Together with the store's pre-await-only ownership checks, this warrants serialized operations, generation tokens and a defined cancel/commit boundary. Delayed-clipboard/file/import interaction has not been runtime-tested here; do not present it as a reproduced wrong-file import.
- **Privacy/security review:** No new automatic outbound transfer or private-note rendering as HTML was found in the You code. Export/share/clipboard/calendar transfer is initiated by explicit user actions. Static calendar files intentionally contain generic block names; dynamic calendar export deliberately includes the user's habit names. Diagnostics includes device details, counts and envelope metadata, not full notes/history, and copying it is explicit. There is no basis from this review to claim a new exfiltration or XSS vulnerability. The unbounded file/decompression memory risk from the baseline remains; the new file picker reads the whole file without a size limit (`files.ts:123–129`).
- **Tests improve real integration but remain mostly successful-path coverage.** Read all `YouScreen.test.tsx`, `pure.test.ts`, `perf.test.tsx` and `e2e/you.spec.ts`. The E2E source now covers settings/order surviving reload, clipboard import/undo, demo, reset, multi-window controls and calendar navigation. This supersedes any blanket claim that these journeys have no browser tests. They do not inject failed replacement writes, request-success/transaction-abort, no-undo/stale-token, corruption recovery, restore I/O failure, or update+unsaved-state failure. Headless Chromium with an iPhone UA does not validate native iPhone clipboard/calendar handoff; NOTES-w2-you request14 correctly records that need. Root owns current test discovery/build/packaging verification.
- **Delta coverage:** Read NEW NOTES-w2-you.md in full; every source/CSS/test file under `src/features/you`; changed App.tsx and pwa.ts; main.tsx listener ordering; relevant store/queue/ConfirmDialog/catalog contracts; and the You E2E source. Four passes consisted of full inventory/read, recovery/ownership/lifecycle reread, refutation against pagehide/disabled-fieldset/normal-path behavior and documented gaps, then severity/status/line-reference polish. All updates here are review notes only.


### First pass domain and history

**Source context:** [d93618a](https://github.com/wktw/lookwhaticando/commit/d93618aaa40b555ad42bb9fd118d6e14cca1f73a). **Historical evidence; the current reconciliation above supersedes status statements here.**

### Domain, scheduling, economy and narrative audit

Read-only review of commit `d93618aaa40b555ad42bb9fd118d6e14cca1f73a`. All `src/...:line` and `tests/...:line` references below refer to that pinned snapshot, rooted at `C:/Users/DADDYS HOME/Documents/Codex/2026-09-29/co/work/lookwhaticando-snapshot`. No repository file or GitHub state was modified. The root agent owns runtime checks; this leaf did source analysis and reports separately which reproductions the root independently confirmed.

#### Overall assessment

The domain is unusually well considered for a pre-complete product. Versioned rules, explicit transaction inputs, action-day reward budgets, recent grants plus durable once-keys, non-punitive growth high-water marks, bounded backfill, and separation of history edits from reward settlement are sound foundations. The main remaining risk is the boundary between those systems: rounding versus thresholds, compaction versus derived facts, present assignments versus historical narratives, and inferred personalization versus the actual range of supported schedules. The number of unit tests is substantial, but several test subjects use easier mathematical or historical inputs than the production path.

The strongest immediate fixes are D1 and D2. D3 and D4 matter disproportionately to a product that promises to remember the user's real life. D5–D7 are narrower correctness issues. R1–R3 are explicit product/specification decisions, not allegations that an unimplemented screen is broken.

#### Confirmed and source-established defects

##### D1 — Rounding each grant pushes valid growth and companion stories one check-in late

**P2; high confidence; current domain defect. Root independently reproduced.**

**Evidence:** `src/domain/economy.ts:164`, `:344`, `:367`; `src/domain/growth.ts:58`, `:69`; `src/domain/company.ts:224`, `:298`–`:303`. The reward path rounds each `7 / expectedPerWeek` grant to six decimal places and rounds the accumulated total. Threshold checks tolerate only `1e-9`. `tests/unit/domain/growth.test.ts:82` explicitly intends nine grants of `7/3` to reach Budding, but constructs unrounded arithmetic rather than calling reward settlement.

**Scenario:** Create a Mon/Wed/Fri habit with enough elapsed days that the calendar pace cap does not bind. Complete its first nine scheduled occurrences. Each grant is `2.333333`; the ledger is `20.999997`, so the plant remains Leafy (stage 3), not Budding (stage 4). Root's isolated runtime reproduction confirmed those exact values. The same arithmetic affects a 3-times-weekly flexible habit. A companion's first story similarly waits past the intended third check-in because `6.999999 < 7`; later stories and flourish thresholds have the same exposure.

**User impact:** The stated schedule-neutral growth promise is false at visible milestone boundaries. The forecast can imply another whole occurrence is needed for a rounding residue; for a sparse schedule that is a meaningful wait.

**Refutation attempted:** This is not ordinary binary floating point, not a missing completed-occurrence gate, and not the six-day pace gate. The existing epsilon solves the unrounded test but not the deliberate six-decimal quantization used in production. A high-water stage does not help before the threshold has ever been crossed.

**Remedy:** Choose one precision contract for accumulation and threshold comparisons. Prefer exact/rational accounting or cumulative rounding with a rigorously bounded tolerance that also covers long-lived saves. Do not independently add arbitrary epsilons to each reader. Preserve undo and repricing conservation when changing the representation.

**Test gap:** Exercise actual check-in transactions at threshold-aligned totals for 3 and 6 occurrences/week, tiny-to-full upgrades, undo/recheck, rule repricing, companion stories and post-Evergreen flourishes. Keep the existing mathematical unit test, but pair it with a settlement integration test.

##### D2 — Timestamp pruning rewrites reversed habit stacks into correctly kept-together days

**P2; high confidence; current domain defect. Root independently reproduced.**

**Evidence:** `src/domain/logging.ts:398`–`:414` removes `DayLog.at` beyond 120 days. `src/domain/stacking.ts:79`–`:107` rejects a pair only when both timestamps exist and the follower precedes its anchor; absent timestamps count as ordinary historical co-completion. `src/domain/signature.ts:224` uses that count for the Paired shape. DESIGN §14.2 (`docs/DESIGN.md:691`–`:692`) requires the follower to come after the anchor when both were live.

**Scenario:** For 14 days, log Stretch first and Walk afterwards while Stretch follows Walk. The kept-together count is correctly zero. Advance beyond the stamp retention period, making no edits to those days. The same 14 days now count as kept together. Root reproduced `0 -> 14` after ordinary rollover pruning. An Evergreen reread can consequently grant an irreversible Paired look on evidence that was previously known to be false.

**User impact:** Historical assertions, the Garden Journal and earned visual identity change merely because the save ages. This is a real later-milestone failure that short fixtures and current-session tests miss.

**Refutation attempted:** Backfilled history intentionally has unknown ordering and may count; that policy does not justify converting known reversed live order into unknown history. Pruning uses copy-on-write logs, so memoization does not conceal the issue; it recalculates the wrong new answer.

**Remedy:** Retain compact dated evidence of live stack ordering before dropping raw stamps, or store a sufficiently detailed durable aggregate that remains correct under historical edits and anchor changes. Distinguish “never known” from “known, then compacted.” Decide explicitly how changing the anchor affects old days.

**Test gap:** A metamorphic compaction test: all historical derived facts intended to survive compaction should be equal immediately before and after pruning. Cover correct order, reversed order, one-sided backfill, anchor change, and the 120/121-day boundary.

##### D3 — Weekly memories attribute earlier habit history to the current companion

**P2; high confidence; current domain defect, visible when the corresponding ritual is surfaced. Source-established; runtime verification delegated.**

**Evidence:** `src/domain/rituals.ts:131`–`:140` obtains the current companion and gives it the entire week's habit check-in count. It does not consult `pair.since`, dated companion grant ownership, the companion's arrival, or days on which a routine was possible. Likewise `:80`–`:86` attaches the current companion to a historical stage event. The copy is concrete: `src/catalog/lines.ts:1857` says the pet has napped there every afternoon since the stage-up. `tests/unit/domain/rituals.test.ts:24`–`:46` tests a companion paired throughout the week.

**Scenario:** Water Read Monday–Saturday so it is Potted. Acquire a new pet and pair it to Read on Sunday before the Sunday Note is created, without making a single check-in together. `sundayNoteFacts` emits a companion P.S. with `days: 6` for that new pet. It may also associate the pet with the earlier stage-up. Moving an existing pet between two habits has the same problem.

**User impact:** The keepsake describes shared experiences that did not happen, undermining the particular emotional value catkin is trying to deliver. Once the note is frozen, correcting later assignments does not correct the fiction.

**Refutation attempted:** The module comment says “the pair watered on the most days,” but the implementation counts the habit, not the pair. This is not the intentional freeze-on-write policy. Filtering just by the first `pair.since` fixes a first arrival but does not correctly handle move-away and return histories.

**Remedy:** Base retrospective prose on dated companion evidence or pairing intervals, and require a routine to have actually been eligible on each claimed day. When evidence is insufficient, use the already available factual habit-only highlight instead. Keep the prose modest rather than reconstructing unrecorded activity.

**Test gap:** Midweek acquisition, midweek pairing, swap between habits, return to an old pairing, stage-up before pairing, routine unlocking midweek, and late backfill. Assert both structured facts and the final sentence, not only presence of a P.S.

**Related memory provenance risk:** `src/domain/friendship.ts:149` dates discovery of a favourite treat with the day the later Memory is awarded, because feeding records only `favoriteKnown` (`:230`–`:233`). `:147` and `src/state/views/pets.ts:237` use the companion story unlock date as “the day the plant bloomed,” even if that companion arrived after the plant had already bloomed. These deserve the same small durable event-date model; they are source-established accuracy gaps, not evidence that timestamps for those events already exist elsewhere. Existing `pet-marks.test.ts:80`–`:104` covers came-home, moved-in and best-friends memories, not delayed favourite discovery or already-blooming plants.

##### D4 — Changing the day boundary changes pets' historical arrival days and anniversaries

**P2; high confidence; current domain/view defect. Source-established; runtime verification delegated.**

**Evidence:** `src/domain/rituals.ts:42`–`:43` and `:220`–`:221` convert original timestamps using the *current* `settings.dayStartsAt`; `cameHomeToday` uses this at `:206`. `src/state/views/pets.ts:201` does the same for the visible arrival date. `src/domain/friendship.ts:143` uses it when creating a later memory. `src/domain/gacha.ts:398` similarly derives profile creation day for season-visited rules. In contrast, habits already have a stable `createdOn` path (`src/domain/economy.ts:183`).

**Scenario:** Obtain a pet September 29 at 04:00 with the default 03:00 day boundary. Its arrival is September 29. Later change the boundary to 06:00; its displayed arrival becomes September 28 and came-home celebrations now occur on September 28. A profile created at the same time has its moving-in anniversary changed as well. A device timezone change can similarly reinterpret historical timestamps.

**User impact:** A preference for organizing future habit days silently changes remembered dates. Existing frozen notes may disagree with the Pet Card and future anniversary celebrations. Near a seasonal availability boundary it can also affect whether the app considers a season visited.

**Refutation attempted:** The source deliberately supports a configurable app day, but there is no persisted pet/profile civil day to preserve the original assignment. This is different from monotonic *today*: keeping today's date monotonic does not preserve old event dates. Habit's `createdOn` demonstrates a compatible precedent.

**Remedy:** Capture the app-day key at the original event for pet/profile history, using the then-current timezone and boundary. Keep the absolute timestamp too. Migrate older saves once under a documented policy; do not keep recomputing history on every view.

**Test gap:** Original events before/after the old/new boundaries, timezone moves in both directions, leap-day anniversaries, and a season starting on the adjacent civil day. Verify already-recorded dates stay unchanged while future day assignment follows the new setting.

##### D5 — The Balcony Box is excluded from every pet's automatic place choice

**P2, narrow; high confidence; current domain defect. Source-established.**

**Evidence:** `src/catalog/places.ts:14` defines empty `loves` as everyone; Balcony Box at `:23` costs 1,500 coins and has `loves: []`. `src/domain/places.ts:44`–`:46` requires `p.loves.includes(species)`, which is always false for the Balcony. Both `suggestPlaceFor` (`:53`–`:55`) and automatic settling (`src/domain/shelf.ts:65`–`:69`, `:81`–`:83`) rely on this helper.

**Scenario:** Have unplaced pets with no habit companions, buy the Balcony, and leave room in it. No pet moves there automatically. With no other preferred open place, “Let [pet] choose” selects the Sill forever. Later-arriving pets are likewise never drawn to the Balcony on rollover.

**User impact:** The expensive shared place loses the promised immediate resident activity and choice behavior, although it still adds global capacity.

**Refutation attempted:** Manual moves remain possible, so the purchase is not entirely unusable. Species-specific places work. Companions and explicitly placed pets intentionally do not auto-move; the scenario excludes those guards.

**Remedy:** Encode universal affinity explicitly or consistently interpret the empty list as everyone in the affinity helper. Keep the Sill exception and per-place capacity checks.

**Test gap:** Existing `tests/unit/domain/pet-marks.test.ts:145`–`:179` checks Pond capacity and late duck arrivals. Add universal-affinity tests for purchase, next-day settlement and suggestion for each species.

##### D6 — Finishing a newly created habit leaves one failed day behind

**P2, narrow; high confidence; implemented domain edge case, relevant to Tune/Finish integration. Source-established.**

**Evidence:** `src/domain/seasonReview.ts:332`–`:349` promises Finish removes today's uncompleted obligation, calculates yesterday, then clamps it back to `habit.startedOn`. A newly created habit starts today, so its archive day becomes today. Lifetime evaluation includes the archive day (`src/domain/activity.ts:46`–`:48`).

**Scenario:** Create a daily habit today, never water it, and select Finish today. On the next day, today's date lies within its lifetime and is a missed occurrence. Depending on the caller, the archived-today habit can also remain in day-based queries for the rest of that day.

**User impact:** Trying an unsuitable habit and intentionally finishing it creates exactly the shortfall the Finish action promises to avoid.

**Refutation attempted:** The test at `tests/unit/domain/seasonReview.test.ts:187` creates the habit well before Finish, so yesterday is legal and the clamp never runs. Ordinary established habits are unaffected. Do not “fix” this by completing or rewarding a task the user did not do.

**Remedy:** Represent an intentionally empty tracking lifetime or an explicit retirement exemption for its first day, and make views, consistency and serialization agree on the semantics.

**Test gap:** Create/finish same day with no log, a partial count, a tiny completion and a full completion; inspect today, tomorrow, calendar, tally and reward behavior. Also test reactivation.

##### D7 — The monthly jar counts partial taps but omits zero-count Tiny completions

**P3; high confidence; current view-model defect. Source-established.**

**Evidence:** `src/state/views/today.ts:231`–`:239` calls a habit watered this month only when a log has `count > 0`. Tiny is explicitly a level that does not change count (`docs/DESIGN.md:124`–`:126`), and the normal semantic helpers use `showedUp(logStatus(...))`.

**Scenario:** Log only a genuine Tiny version with `count: 0` this month. The day, rewards and plant recognize that the user showed up, but its flower stem is absent from the month jar. Conversely, the first partial glass of an 8-glass habit puts a stem there without a completed watering.

**User impact:** The small visual celebration disagrees with the tracker, especially on the low-energy days the Tiny feature is meant to honor.

**Refutation attempted:** If the product explicitly wants any attempted progress to put a stem in the jar, partial taps could be intentional; Tiny must still qualify. The source's own comment currently says “at least one watering.”

**Remedy:** Specify whether the jar celebrates attempts or completed/tiny waterings; use the shared status helper accordingly, including lifetime bounds. Avoid a second ad hoc definition of watering.

**Test gap:** Zero-count Tiny, partial/full count, undo, rest, archived dates, and a later monthly full completion.

#### Product and future-milestone risks

##### R1 — Faithful sparse schedules can never receive “Blooms Like You” personalization

**High-confidence design gap; not a violation of the current written algorithm.** `src/domain/signature.ts:50`, `:58`, `:115`–`:126` requires 10 eligible days inside a rolling 120-day stamp window. A once-monthly habit can have at most roughly five distinct completion days in that window even after years of perfect adherence. The supported quarterly/annual templates fare worse. Those plants can eventually reach Blooming or Evergreen while the look remains “waiting” indefinitely (`src/state/views/habit.ts:117`, `:208`).

This is an architectural mismatch between schedule-neutral growth and dense-schedule personalization, not a reason to make the user overlog chores. Resolve before promising every plant a personal look. Options include a small durable sample or summary across a schedule-appropriate horizon, or a truthful alternative source of identity for sparse habits. Migration and privacy/compaction expectations need to be agreed before adding another inferred history field. Verify two years of faithful monthly use and several years of quarterly use, not just ten consecutive daily fixtures.

##### R2 — The catch-up detector also excludes legitimate short routines and night-shift lives

**High-confidence product tradeoff; implemented as specified, not an implementation bug.** `src/domain/signature.ts:7`–`:14`, `:120`–`:124` excludes three habits within 120 seconds and all check-ins from 23:00 through 03:59. Vitamins, a glass of water and a brief stretch can genuinely fit in two minutes, especially when intentionally stacked. A person who habitually performs their routine at midnight has no eligible time evidence regardless of consistency. The current tests explicitly encode both exclusions.

The conservative inference avoids falsely interpreting catch-up entries, which is good. However, an indefinitely pending personalized look is a poor explanation of that uncertainty. Provide an honest fallback and a way to supply or confirm a usual time without suggesting that nightly habits are less valid. Do not secretly broaden the inference to claim activity time equals tap time.

##### R3 — Favourite places and best friends are heuristics, not learned history

**High-confidence specification mismatch; coordinate with creative review's separate missing scene-level wiring.** DESIGN `:321`–`:324` says the favourite spot is the most-used pot/place and the friend is the pet with the most shared time out. `src/domain/places.ts:68`–`:74` chooses the current companion pot or current/species place; `:82`–`:101` chooses current co-location, same species, overlapping arrival times and XP. There are no measured usage or co-presence durations. `tests/unit/domain/pet-marks.test.ts:33`–`:76` validates the heuristic itself, not the design promise.

Example: a pet spends months alongside a cow, then a new cat arrives on the day it reaches level 8; same-species preference can select the newcomer. A pet's current temporary pot at level 4 becomes its permanent “favourite” even if another pot was its home for much longer. Persisting a choice prevents fluctuation but does not make the choice evidence-based. Either implement a bounded, app-day co-presence/spot history or rewrite the promise as a pet's new choice. Do not imply continuous surveillance of offline pet activity; a daily attendance model is sufficient and explainable.

#### Substantive opportunities

1. **Make edits reviewable before they become history.** A compact before/after explanation for “this period,” “next period,” Finish, rest and schedule geometry changes would translate the excellent domain rules into user trust: “This week's existing waterings still count; the next week starts Monday.” Show relevant consequences, not internal coins/sunshine machinery. Acceptance: a user can predict what will happen to already logged days without reading the design document.
2. **A factual personal record, backed by minimal event provenance.** Capture a few durable event dates and pairing intervals once, then use them consistently for memories, Sunday Notes, companion history and anniversaries. This fixes D2–D4 while making the journal meaningfully theirs. Offer private editing/removal of user-authored quoted Moments without turning factual records into generated motivational prose.
3. **Support finite and sparse work as first-class habits.** Monthly maintenance and seasonal goals should have a clear next relevant period, attainable personalization, and a satisfying truthful finish. A completed finite habit can remain a useful record with its last recipe/checklist/note and an explicit “bring back for another season” action; this is practical reuse, not another reward layer.
4. **Explain uncertainty in personalization rather than manufacturing certainty.** A simple plant tag can say that it is still learning the user's rhythm and allow a preferred look or user-confirmed time. Distinguish “when you checked in” from “when you did the activity.” This makes shift work, quick routines and retrospective logging equally welcome while preserving the no-performance-graded-looks principle.

#### Refuted, bounded or intentionally excluded concerns

- A bake-at-99-servings purchase could lose value at the raw domain boundary, but current `BasketSheet.tsx:24`, `:80` offers Bake only at zero/one serving. Not reported as a current reachable purchase bug.
- Old backup restoration replaying spent rewards, and documented history/edit economics, are acknowledged local-first trust tradeoffs in NOTES-open. They should not be presented as newly discovered security exploits or reasons to introduce a server.
- Companion reward accounting carries the original grant's companion share through changes and refunds; moving a pet does not by itself multiply a previously awarded occurrence's XP. No new farming claim is made without an independent failing scenario.
- Growth never visually shrinking after undo, sticky stories/keepsakes, bounded retrospective rewards, and the one-story-per-check-in behavior are deliberate rules.
- The original first-period bonus exclusions are anti-farming policy, even though they may merit later UX explanation. No unconditional “lost bonus” defect is alleged.
- Habit Detail, Progress, You and onboarding work explicitly remaining in M2 is planned scope. Missing screens are not independently counted here as hidden defects. Domain gaps that would surface in those screens are labeled as such.
- The UTC-hour selector truncation defect belongs to the data audit; the birthday input validation gap belongs to that audit too. Scene friendship-level wiring and missing plant-look propagation belong to the creative audit.

#### Coverage and review passes

1. **Full review:** Read `docs/DESIGN.md`, `NOTES-domain.md`, and `NOTES-open.md` in full, including current milestones, accepted tradeoffs and unresolved decisions. Read every file in `src/domain`: activity, badges, collection, company, consistency, dates, economy, friendship, gacha, growth, habits, hemisphere, index, insights, journal, letters, levels, logging, pantry, pauses, periods, places, profile, rituals, rng, rollover, routines, rules, schedule, seasonReview, seasons, shelf, signature, stacking, streaks, tx and wallet.
2. **Expert reread:** Re-read interacting paths for day geometry/rule changes, settlement/repricing/undo, growth pace and high-water marks, companion ownership, narrative fact construction, stamp retention, place affinity, anniversaries and retirement. Read all nine `src/state/views` modules: calendar, capsules, common, company, habit, pets, progress, season and today. Read catalog types, machines, templates, places, format, habitIcons, badges, personalities and index in full. Collectibles and caption prose were coordinated with the creative reviewer; this leaf used relevant entries/formatters and does not claim an independent full read of `lines.ts` or `collectibles.ts`.
3. **Defect/refutation hunt:** Read rituals, stacking and pet-marks tests in full; read relevant growth, seasonReview, signature, economy, logging and company tests/sections and existing adversarial coverage names. Compared asserted conditions with real transaction paths rather than assuming passing arithmetic fixtures prove production behavior. Checked UI reachability for the bake-cap candidate. Asked root for independent isolated reproductions; root confirmed D1 and D2. This leaf did not execute repository tests or claim full test-suite coverage.
4. **Polish/recheck:** Reopened exact source lines for every prioritized finding, tightened scenarios, separated current bugs from planned work and explicit policy choices, recorded refutations and migration implications, and avoided duplicating data/creative ownership.

No additional source or GitHub changes were made. Findings apply only to the pinned snapshot; Claude's concurrent updates may already supersede some of these lines and should be compared before acting.

#### Delta review: integrated Progress, Habit Detail and rituals at 7d16f11

**Second baseline:** `7d16f113769ab5d681b5ddae1dbb8381f364a914`, isolated read-only snapshot `C:/Users/DADDYS HOME/Documents/Codex/2026-09-29/co/work/lookwhaticando-current`. Every reference in this section refers to this newer commit. The previous findings retain their explicitly older baseline. Root reports the domain implementation did not change between these snapshots; the new consumers make several previously latent issues visible.

**Current-state correction:** Progress, Habit Detail and the ritual reader are now substantive implemented screens, not placeholders. The earlier exclusion describing them as remaining M2 work is superseded for this baseline. Progress renders hero/statistics, months, plants, calendar, year, records, pins and memories. Habit Detail renders looks, journal, moments, history editing, stories, offers and lifecycle actions. The Progress-mounted reader opens saved rituals. The request to additionally mount that reader globally for Today is explicitly outstanding in `NOTES-w2-progress.md:40`–`:44`; global shell integration remains root's ownership. D3's companion-story attribution, D6's Finish edge case and D7's Tiny jar discrepancy now have corresponding implemented UI consumers.

##### W2-D1 — The history calendar cannot add missed records for weekly or monthly habits

**P2; high confidence; current integration defect. Source-established; runtime check requested from root.**

**Evidence:** `src/state/views/calendar.ts:97` returns `state: 'unscheduled'` for every unlogged flexible day, correctly expressing that there is no daily obligation. `:127` separately marks an old day `edit: 'history'`. `src/features/progress/Calendar.tsx:276`–`:278` nevertheless hides the history action whenever the visual state is `unscheduled`. The same Calendar is used in Progress and Habit Detail. The domain permits adding these records: `src/domain/logging.ts:379`–`:391` handles flexible history completion and only prohibits removing certain still-rewardable old occurrences.

**Reproduction:** With today September 29, create a monthly habit that began in August. Open August in its history calendar and tap an unlogged in-lifetime day. No “Water it for…” action appears. If an old completed flexible day is unwatered, the action disappears after removal, so the user cannot put it back through the same UI. Daily unlogged days work because they use `none` instead.

**Impact:** The advertised history repair workflow fails for entire supported schedule families and can turn a reversible correction into a UI dead end. It is unrelated to reward eligibility: older closed-period additions are explicitly history-only and legal.

**Remedy:** Drive editing from a domain capability (`canMarkDone`, `canUndo`, reason), not the glyph state. Separate “no daily obligation” from “not loggable.” This also solves the converse error: old dates after `archivedOn` currently receive `edit: 'history'`, and `DayEdit` does not suppress `archived`, so it offers a Water button the reducer always rejects with an inaccurate week-strip instruction.

**Tests/refutation:** `ProgressScreen.test.tsx` tests an older Walk day and a mocked refusal; it does not attempt a blank weekly/monthly date. Test weekly and monthly add/remove/add in a fully closed period, paused/off-day positive history where legal, unscheduled day-based activity, and post-archive dates. Do not simply enable every glyph: the reducer's period-window protection still needs a truthful disabled explanation.

##### W2-D2 — “Open Today” in Habit Detail navigates behind the still-open sheet

**P2; high confidence; current navigation integration defect. Source-established.**

**Evidence:** Recent calendar days render a bare `<a href="#/today">` in `src/features/progress/Calendar.tsx:248`–`:254`. `src/features/habits/detail/HabitDetailHost.tsx:15`–`:22`, `:34` keeps the sheet open while `habitDetailRequest` is non-null; the shell retains the host (`src/app/SheetHosts.tsx:17`, `:22`). Neither the link nor router clears that request. `src/app/router.ts:25`–`:33` only updates tab/rest, and ScreenHost changes the underlying screen. The tapped calendar date is not passed to Today’s `selectDay` either.

**Reproduction:** From Today, open a habit's Detail, tap yesterday in History and activate Open Today. The hash is already Today and the modal remains on top, so the prescribed next action appears to do nothing. From Progress, the underlying route changes but the Detail sheet still obscures the week strip. The user must infer that they should manually close the modal and then reselect the desired date.

**Impact:** The only offered route for recent history correction does not actually take the user to an actionable state.

**Remedy:** Give the calendar an explicit handoff action that closes the containing sheet, selects the intended app day and navigates to Today, with correct focus restoration. Keep the reward/history split but make the transition complete.

**Tests/refutation:** Existing component coverage checks only that the anchor has `href="#/today"`. A route change does not implicitly close the shell-mounted Detail. Add browser coverage starting from both Today and Progress: after activating the link, no Detail dialog remains, the selected day is correct and the target habit can be logged.

##### W2-D3 — Re-reading a saved Sunday Note changes its remembered activity after a habit icon/plant edit

**P2; high confidence; current historical rendering defect. Source-established; runtime check requested from root.**

**Evidence:** `src/features/rituals/lookup.ts:7`–`:9` resolves current habit name, plant and icon. `src/features/rituals/words.ts:107` chooses the saved P.S.'s routine from that current icon, and `:61` chooses a past Blooming event's species-specific wording from the current plant. The stored P.S. has only habit/pet IDs, day count and time block; it has no original routine. The reader is described as rendering frozen data. `src/domain/letters.ts:18`–`:22` also states the intended immutability after a letter is written, aside from explicitly permitted reward-path changes.

**Reproduction:** Save a Sunday Note whose Read/book companion P.S. says it slept on the book four evenings. Later change that habit's icon to a walking icon and re-read the same saved note. The P.S. now describes the walking routine on those old evenings. Changing plant species can similarly rewrite what an old bloom did. The stored letter need not change for its historical meaning to change.

**Impact:** A personal keepsake is retroactively rewritten by cosmetic or organizational edits. This compounds D3's initial attribution problem but is a separate render-time error even when the original attribution was correct.

**Remedy:** Freeze semantic routine/species evidence at letter creation (small IDs suffice), while deciding deliberately whether names should follow renames. Do not freeze user settings such as “Quote my notes”: the current reader correctly honors that setting. For legacy records lacking evidence, use conservative generic wording rather than asserting today's routine was the old one.

**Tests/refutation:** `rituals/words.test.ts` uses a fixed lookup, so it never changes the referenced habit after generating a note. Add before/after lookup mutation tests. The existing defensive omission of deleted-habit lines and quote-settings guard are good behavior and not part of this finding.

##### W2-D4 — Removing the last habit hides unrelated preserved records and keepsakes

**P2, narrow; high confidence; current UI state-gating defect. Source-established.**

`src/features/progress/ProgressScreen.tsx:145`–`:156` treats `garden.length === 0` as an entirely new account and hides the whole records/pins/memory subtree (`:211`–`:220`). Habit deletion removes the habit and its logs, not earned account badges, frozen inbox rituals, filed seasons or all lifetime totals (`src/domain/habits.ts:297`–`:351`). Consequently, after deleting the last habit, Progress offers only “This fills in as you water” and Add a habit even when those independent sections still contain data. Adding any unrelated new habit makes the preserved material reappear.

This is presentation loss, not demonstrated storage loss. Separate a new account's empty state from each section's own emptiness. Test a never-used account versus an account with no remaining habits but existing badges, an anniversary note and filed seasons. The existing empty-state test constructs only a fresh initial save.

##### W2 supplemental P3 — Aggregate calendar note markers can remain stale after a note-only edit

`src/features/progress/Calendar.tsx:46`, `:237` stabilizes the aggregate month VM by its JSON content; aggregate cells contain no note fields. `notesOn` at `:79`–`:88` reads logs but depends only on that stabilized VM and habitId. Therefore adding/removing a note without changing completion status does not recompute the note-dot set or the accessible “a note” suffix (`:149`, `:152`) while the component remains mounted. The day panel can show the new text directly from state while its calendar button still says no note. Key this memo on the relevant logs/habits or include note presence in aggregate cells. Test state changes while mounted; current tests inspect only the initially seeded notes.

##### Delta decisions and refutations

- `NOTES-w2-progress.md` was read in full. Its known requests (persistent offer decline, cold Progress cost, formatter day-one plural, species-distinct pressings, shell reader mounting and e2e project registration) are acknowledged work, not presented as newly discovered bugs here. Root should verify their latest disposition.
- The Progress plant shelf now correctly forwards personalized looks and flourishes; the Detail hero does too. Do not carry forward a blanket “Progress drops looks” claim. Shelf-scene issues remain separately scoped to the creative audit.
- Pause's “Back on” intentionally stores an inclusive end one day earlier; this agrees with domain semantics. No off-by-one finding.
- Archive/delete offer distinct consequences, archived habits have an explicit restore path, and the delete confirmation does not silently destroy the retained-plant option. The current code was checked rather than assuming placeholder behavior.
- The annual SVG deliberately has a text summary and the calendar uses roving keyboard focus. This source review does not claim a fresh axe/browser pass; root owns execution and visual verification.
- The best/current run tile compares raw lengths across potentially different rhythm units (`Parts.tsx:142`); the always-present longest-run text in the ladder means this is primarily inconsistent presentation, not a lost lifetime record. Kept as a low-priority design cleanup rather than another prioritized defect.
- The large Habit Detail resident currently lacks an outfit input although its smaller company portrait passes outfit; shared with the creative reviewer for ownership rather than counted twice.

##### Delta coverage and passes

Read the complete new progress note and all files under `src/features/progress`, `src/features/habits/detail`, and `src/features/rituals`, including their CSS and four unit-test files; also read `e2e/progress.spec.ts` fully. Re-read relevant calendar/logging/deletion semantics and shell/router/Today-selection integration to refute the new findings. Full-review pass mapped every screen action to its domain path; expert reread focused on historical data and edit capability; defect/refutation pass compared real empty/flexible/renamed states with fixtures; polish pass checked exact newer-baseline lines and superseded stale milestone descriptions. No source writes or tests were performed by this leaf; only this owned findings artifact was appended.


### First pass creative design and experience

**Source context:** [d93618a](https://github.com/wktw/lookwhaticando/commit/d93618aaa40b555ad42bb9fd118d6e14cca1f73a). **Historical evidence; the current reconciliation above supersedes status statements here.**

### Creative, product and art audit

Snapshot: `d93618aaa40b555ad42bb9fd118d6e14cca1f73a`. Source references below are relative to `work/lookwhaticando-snapshot`. This leaf made no repository or GitHub changes. Evidence is source inspection and inspection of the committed image assets; the parent audit owns execution and live-browser verification. Severity: P2 = material defect/integration gap to resolve before M2 acceptance; P3 = narrower or latent issue. Source-level confidence is distinguished from runtime verification.

#### Assessment

The strongest idea is already in the accepted design: a useful habit tracker makes a home through the user's own routines. Houseplants as durable records, the tiny version, companions associated with actual habits, and personal notes are substantially more distinctive than adding more collectibles. The current art and copy understand that direction: ordinary objects at animal scale, recognizable species, restrained narration, and light that belongs to the room. Preserve this.

The largest creative risk is **promising personal continuity while the integrated presentation discards or invents parts of it**. A visitor earned after months disappears on the Shelf; a named friend cannot influence the nap director; a feeding choice stops being selectable as the collection grows. These are failures of meaning and usability, not demands for more animation. Completing these connections is more valuable than another cabinet or reward loop.

The project is still progressing from completed domain/art systems toward the integrated app. `docs/DESIGN.md:718–725` explicitly separates M1, M2 and M3. Progress, You and Habit Detail integration work should be tracked as existing milestone scope, not described as surprising regressions. Original Concept and the archived Mochi design explain the history but do not override current catkin decisions. A mascot, talking pets, food-body animals, punitive decay, broad confetti, and generic collection expansion would take the work backwards.

#### Confirmed source-level defects and integration gaps

##### CR-01 — P2: The feeding picker cannot select treats outside its six-item shortlist

**Confidence:** High, source-confirmed; live reproduction delegated to parent.

**Scenario:** Own seven or more treats. A desired treat, including a not-yet-discovered favorite, sorts seventh or later. Open a Pet Card, Feed, then Basket and pantry. That destination shows the treat but cannot feed it to the pet.

**Evidence:** `src/features/pets/petCopy.ts:44–49` sets `FEED_ROW = 6` and sorts the known favorite, stock, then name. `src/features/pets/PetCard.tsx:327–331` slices the sorted list and creates the feeding handler; `:355–389` renders buttons for only that slice. `:390–395` supplies the pantry link. `src/features/pets/PetCardHost.tsx:57–58` opens `BasketSheet` without pet identity or a feeding callback. `src/features/shelf/BasketSheet.tsx:60–92` renders inventory and optional baking, but no feeding action. Repository search found no other product-UI `feedPet(...)` caller. `src/state/views/pets.ts:221` only marks an already-known favorite for sorting.

**Impact:** Collecting more treats makes existing actions less accessible. Discovery becomes biased toward stock/alphabetical order, and a user following a pet's hint cannot simply try the matching treat. The inventory screen appears to offer a continuation of the action but becomes a dead end.

**Refutation attempted:** Stock depletion can eventually change the shortlist; baking a low-stock treat may promote it. Therefore this is not a claim that a treat can never be consumed. Those are indirect inventory manipulations, spend scarce servings/coins or daily feeding opportunities, and do not provide the intended choice. `NOTES-w2-shelf.md` documents the six-treat quick list but does not supply a second feeding surface.

**Recommendation:** Retain six quick choices, then offer an all-treat chooser carrying the selected pet and the same domain feed action. Make unavailable servings visible with their existing restock/bake explanation. Keep the standalone pantry useful for inventory.

**Acceptance evidence missing:** A UI fixture with at least seven equally stocked treats; select the seventh from the continuation; verify exactly that treat is consumed, the intended pet reacts, and the chooser remains usable after stock changes. This belongs in current M2 integration, before expanding treat content.

##### CR-02 — P2: The visual watering state survives Undo and an app-day rollover

**Confidence:** High, source-confirmed state sequence; mounted-component reproduction delegated to parent.

**Scenario:** On one mounted Today card/band, water a potted plant, then undo the watering. Alternatively leave Today mounted into the next app day. The stored `damp` value can become false while the drawing continues to show watered soil.

**Evidence:** `src/art/plants/hooks.ts:13–21` counts increases in `pulse` cumulatively and deliberately does not decrement on Undo or midnight. That is appropriate for an animation trigger. However `src/art/plants/PlantArt.tsx:174–183` converts that lifetime count into persistent status: `const damp = !!props.damp || waterings > 0`. The band independently retains a never-cleared set: `src/art/scene/WindowsillBand.tsx:148–176` adds the watered habit ID; `src/art/scene/sill/SillSegment.tsx:120` and `src/art/scene/actors/PotSlot.tsx:71` give it precedence over the authoritative pot state. `src/features/today/HabitCard.tsx:208` passes the card's changing watering counter. Current watering tests at `src/art/plants/plants.test.tsx:400–419` exercise a decrease before the first increase, not Undo after an actual watering.

**Impact:** Damp soil is deliberately functional information, not just decoration: `docs/DESIGN.md:395` and `:701` say it marks pots watered today. The picture can contradict the checklist and makes repeated daily use harder to trust. The symptom lasts for the relevant mounted instance; a remount can hide it.

**Refutation attempted:** The hook's documented aim is correctly to avoid replaying animations on a decrease. That does not justify deriving today's status from its cumulative count. Both the card and band paths have independent sticky state, so fixing only the band would leave the card path wrong. This is not a request for a punitive dry/wilt state: ordinary, unwatered soil is enough.

**Recommendation:** Keep animation occurrence and current damp state separate. Use the authoritative day state for soil; if a brief animation override is necessary, clear it when the day/occurrence changes or the check-in is undone. Cancel or invalidate delayed band effects for the undone occurrence.

**Acceptance evidence missing:** Same-instance sequences `false/0 → true/1 → false/0`, old day → new day, and Undo during the water-flight delay. Assert both card and band return to their ordinary soil while growth already legitimately kept remains intact. Current M2 gate.

##### CR-03 — P2: The Shelf drops permanent plant features and changes a paired plant's color

**Confidence:** High, direct adapter-contract loss; rendering parity fixture still needed.

**Scenario:** Earn Evergreen flourishes and/or select a Paired look; compare the plant on Today and the Shelf. Pause it and inspect the Shelf again. A long-earned plant loses its visitors; a paired flowering plant loses its anchor color; a paused plant also loses its chosen look. Retired plants are reduced further.

**Evidence:** `src/features/shelf/model.ts:42–69` forwards stage/blooms/look but never `flourishes`. The look available in `src/state/views/today.ts:99–130` only contains color/shape, not `partnerColour`; its construction at `:385–405` maintains that reduction. The Today adapter explicitly repairs both omissions using card data: `src/features/today/Band.tsx:67–78` supplies partner color and flourishes. Shelf does not. `src/art/plants/looks.tsx:65–72` requires partner color to use the paired hue and otherwise falls back to a time-of-day hue. `src/features/shelf/model.ts:26–34` has no look/flourish fields for resting plants; `src/features/shelf/ShelfScreen.tsx:49–62` computes a full plant view then reduces it to those fields. `src/features/shelf/model.ts:74–76` renders retired plants from best stage/species/pot only despite its “as they last stood” comment.

**Impact:** The screen meant to exhibit the garden fails to preserve its most personal and long-term details. Pausing/finishing should be safe and satisfying, not visually resemble lost progress. It directly undermines growth-only and Blooms Like You (`docs/DESIGN.md:57–59`, `:187–189`, `:683–701`).

**Refutation attempted:** Art supports these details (`PlantArt.tsx:104–111`, `looks.tsx`, `flourishes.tsx`); the omission is in integrated adapters, not a missing art system. Rest may intentionally have ordinary soil and no current activity prop; that does not require dropping permanent visitors or chosen appearance. Retirement snapshot semantics may need a domain decision, so treat the live/paused losses as immediate defects and retired appearance preservation as an explicit integration contract to settle.

**Recommendation:** Introduce/reuse one shared plant presentation mapping for earned appearance, and layer screen-specific status on top. Include chosen look, paired hue provenance, all flourish counts and appropriate retained growth. Define which fields freeze on retirement. Do not make Today and Shelf reconstruct this independently.

**Acceptance evidence missing:** Cross-screen comparison of one Paired flowering Evergreen with several flourishes, including pause/resume and retirement. Assert identity fields and render output survive while day-specific soil/props change appropriately. Current M2 gate; resolve before seasonal retirement becomes a major return-user flow.

##### CR-04 — P2 integration gap: Friendship levels promise behavior the live scene cannot express

**Confidence:** High for missing inputs; the exact behavior tuning is a design implementation choice.

**Scenario:** A pet reaches level 5, 7, 8 or 9. Its card announces that it now follows the sun, naps nearer the user, naps beside a particular friend, or waits at the front. The live scene still uses the same personality/species/time-based behavior as before that level.

**Evidence:** `docs/DESIGN.md:320–325` explicitly says levels change behavior. `src/catalog/lines.ts:1660–1707` announces the changes; `src/features/pets/PetCard.tsx:123,185` displays the current level's line. Yet `src/features/shelf/model.ts:92–103` drops level and best friend; `src/art/scene/model.ts:46–64` cannot carry them; `src/art/scene/behavior/director.ts:17–26` and `plan.ts:56–74` also lack those inputs. `plan.ts:21–29` uses personality/species/time; `:99–115` chooses beam/front-depth locations without friendship. `src/art/scene/behavior/vignettes.ts:117–146` chooses generic nap-pile actors, without best-friend identity. Searching the scene source found no friendship-level input under another name.

**Impact:** The primary non-currency progression is largely announced rather than experienced. The user's history with a specific animal is less perceptible than the prose claims, which weakens attachment over months even though the baseline animation is appealing.

**Refutation attempted:** This does not mean friendship is wholly unimplemented. L4 favorite placement is forwarded, L6 found things exist in domain behavior, captions have level gates, and L10 has a card tag. All pets may naturally nap in sun before level 5; the promised unlock can be a stronger preference rather than a ban on ordinary animal behavior. Those facts do not create level-dependent behavior for the missing levels. Best-friend selection/history accuracy is separately owned by the domain audit.

**Recommendation:** Pass a small explicit behavior profile to the scene: sun-following tendency, preferred front depth, named co-nap target, arrival/waiting behavior. Deterministically bias plans instead of guaranteeing a scripted pose on every visit. Honor reduced motion through stable placements/crossfades and keep touch controls available. If any behavior is deferred, stop announcing it as already happening until it is integrated.

**Acceptance evidence missing:** Same species/personality/seed/clock below and above each unlock; show a measurable preference difference and named-friend affinity when both pets are present, with a sensible absent-friend fallback. Current M2 integration requirement, not a suggestion for more cosmetic content.

#### Narrower and prospective issues

##### CR-05 — P3 latent contract mismatch: Flourish copy names different things from the art

`src/catalog/lines.ts:1576–1585` describes a robin as the third flourish, a new shoot as the fifth, and plant height as the seventh. `src/art/plants/flourishes.tsx:16` actually uses snail, hanging trail, and second shoot at those positions. `docs/VOICE.md:397` repeats the older text. Repository search found no current consumer of `FLOURISH_LINES`, so this is **not claimed as an observed current user-facing message**. It will become a misleading announcement if Habit Detail/long-term progress connects the existing catalog blindly. Align the copy with the approved art order or explicitly revise the art decision, and use keyed flourish IDs rather than parallel positional prose. A catalog/art identity contract test is sufficient; no elaborate UI test is necessary.

##### CR-06 — Product decision: Most free starter plants barely express Blooms Like You

`src/art/plants/looks.tsx:1–8,25–36,83–86` intentionally restricts recoloring to petals. Pothos, pilea, snakeplant and cat grass—four of the five free starters—have no entry. Dawn/Sunlit/Twilight/Petite can therefore produce a new label without a corresponding visible plant change for common starter habits. Paired does still bring a bee, so “all looks do nothing” would be false. The code explicitly acknowledges the foliage fallback: this is a **design shortfall to decide**, not an accidental implementation regression. Snake plant even has flowering-specific Blooming prose (`lines.ts:1540`) despite no petal mapping.

The feature is introduced as a personal plant form (`docs/DESIGN.md:683–696`). Either make the limits clear in the unlock/choice experience, or author modest species-appropriate equivalents: plant form/leaf grouping for Petite, a recognizable paired visual accent, and restrained tag/pot details where foliage recoloring would compromise species identity. Test starter plants first. Success is that someone can distinguish their chosen form without reading a tooltip while the plant remains recognizable. Avoid unnatural leaf palettes solely to force parity.

##### Creative acceptance risks to resolve in M2/M3

- **Complete tracker value before adding collection breadth.** Quiet rewards must retain useful creation, history correction, progress, notes, rest and review. The placeholders are known work. Test the complete quiet journey once Progress/You/Detail land rather than assuming hiding currency delivers the invariant (`DESIGN.md:61`, `:418–430`, `:457`).
- **Earned records need retrieval.** Sunday Notes, Moments, stories and keepsakes are the accepted long-term value, but they only matter if a returning user can find the real words and dates. Prioritize the existing Memory Shelf and Habit Detail access over new one-time unlock content. Coordinate with the domain audit's provenance defects: a well-written but untrue memory is worse than a simpler factual one.
- **Separate currency goals in usability testing.** The design expects roughly 25–35 coins/day and “about one capsule a day” (`DESIGN.md:239`). A 2,500-coin place is roughly 71–100 such days if no coins are spent elsewhere; buying daily capsules changes the saving experience substantially. This is arithmetic from the target pace, not an observed retention result or a call to change economy rates. Test whether users understand place saving and feel that the environment can become theirs before adding more sinks.
- **The gallery is not the integration review.** Small-size art, motion and reduced-motion systems are thoughtfully authored, but static screenshots in `public/screenshots/` are older product assets. They do not prove current Today density, narrow-screen readability, interaction discoverability or screen-reader success. Root's current browser work must supply that evidence. No contrast/target-size failure is asserted from the static assets alone.

#### Substantive feature opportunities, in priority order

These are proposals, not missing promised features. Ship the correctness/integration work first. Each earns its cost through an actual habit need rather than adding another reward schedule.

##### O1 — Optional planning inside flexible periods

**Need:** “Exercise three times this week” is a valid quota, but it does not tell the user what they have chosen to do today. A user should be able to put one opportunity on Wednesday without rewriting the habit or marking the other days as rests.

**Proposal:** A lightweight “Plan for…” day marker within the current flexible period; it places the habit in that day's ordinary Today list. It is an intention, never an additional required completion, missed-day penalty, streak, or reward source. Completion elsewhere satisfies the same existing quota. A postponed intention simply moves.

**Scope/dependencies:** Existing flexible rules and Today grouping (`DESIGN.md:103–113`, `src/catalog/lines.ts:2117–2128`) plus separate optional planning metadata, backup migration, keyboard interaction, and history wording. Do not alter the already-complex expected/earned ledger math.

**Tradeoff:** More metadata and a potential to-do-list feel. Keep it optional and absent by default; never auto-fill a week or nag about a missed plan.

**Success:** In a task-based usability test, someone with three weekly habits can arrange the next few days, change their mind, and still understand why the quota and growth did not change. No extra check-in steps for users who do not plan.

##### O2 — Recurrence measured from actual completion for household maintenance

**Need:** The existing “Wash the sheets” and “Change the filters” templates (`src/catalog/templates.ts:29,31`) model a two-week/quarterly window. Doing a task at the end of one window can make the next window feel due immediately. Many maintenance habits mean “roughly N days after I actually last did it.”

**Proposal:** A distinct optional “After the last time” schedule, with a calm next-opportunity date and an early-completion allowance. Preserve ordinary daily/weekly habits as they are. This directly supports home care and infrequent recurring tasks that current templates invite.

**Scope/dependencies:** New versioned schedule semantics, timezone/day-start handling, backdated corrections, pause behavior, forecast, and bounded reward eligibility. This is a later domain milestone, not a quick UI addition.

**Tradeoff:** Highest implementation cost among these proposals. It must not silently reinterpret existing monthly schedules or create reward farms through early repeats.

**Success:** Completing a 90-day task early/late yields an understandable next opportunity; editing the previous completion recomputes the future without changing legitimately earned historical rewards. Users can explain the difference from “once each quarter.”

##### O3 — Find the user's own Moments across the garden

**Need:** A note about a first comfortable walk, a book, or a difficult day becomes more valuable over time. It is often remembered by a phrase rather than by the exact habit/date. The current accepted Moments/Memory Shelf concepts provide the raw material (`DESIGN.md:427–430`; `src/catalog/lines.ts:2215–2216`, `:1928–1965`).

**Proposal:** Local search across the user's notes with habit/date/star filters, showing the original words and a link to that day's entry. Add no sentiment scoring or automatic interpretation. An optional selected-pages export can come later, using the established herbarium/notes art rather than inventing a social sharing loop.

**Scope/dependencies:** Complete existing note editing and Memory Shelf first; local index derived from persisted notes, accessibility and search-empty states, refresh after correction/import. Keep note text out of diagnostics/telemetry.

**Tradeoff:** Search UI adds complexity to Progress; make it a secondary affordance, and do not demand new journaling to use the tracker.

**Success:** A user can retrieve a remembered phrase from a year of entries in a few interactions and reach/correct the source entry. Search never returns invented summaries or dates.

##### O4 — Quantity per period, only if user demand validates it

**Need:** “Read 100 pages this week” or “Move for 90 minutes this week” is not the same as completing one daily quantity target on three days. The current validation openly refuses quantity for flexible habits (`src/catalog/lines.ts:2057`).

**Proposal:** A future aggregate quantity goal, with partial daily contributions toward one period total and optional per-day tiny intent. This was already named in archived v2 scope (`docs/archive/DESIGN-v1-mochi.md:824`); it is **not a newly discovered omission**.

**Scope/dependencies:** First settle the integrated current rule model; then specify partial-growth/reward caps, unit changes, historical rule versions, over-target contributions and imported history before building UI.

**Tradeoff:** Considerable expansion of an already subtle schedule/economy model. Do not fold it into the current M2 completion casually.

**Success:** A 20/30/50-page week totals 100 without creating three full daily achievements; corrections remain deterministic; the user can choose this model without learning internal ledger rules.

#### Coverage and review discipline

**Full assigned documentation read:** `docs/DESIGN.md`, `docs/VOICE.md`, `docs/ORIGINAL_CONCEPT.md`, `docs/archive/DESIGN-v1-mochi.md`, `NOTES-garden.md`, `NOTES-plants.md`, `NOTES-pets.md`, `NOTES-items.md`, `NOTES-icons.md`, `NOTES-shelf.md`, `NOTES-capsules.md`. Also `NOTES-w2-shelf.md`, audit PLAN and leaf-1.3 gates. Historical instructions were checked against current code rather than treated as unresolved bugs.

**Full source-file/content review:** catalog `templates.ts`, `collectibles.ts`, `lines.ts` (entire large caption/voice catalog); pet `PetCard.tsx`, `PetCardHost.tsx`, `petCopy.ts`; Shelf `model.ts`, `BasketSheet.tsx`, Field Guide behavior; scene `model.ts`, `arrange.ts`, behavior `plan.ts`, `director.ts`, `useShelfLife.ts`, `stage.ts`, `vignettes.ts`, actor touch logic; plants `PlantArt.tsx`, `hooks.ts`, `CardPlant.tsx`, `looks.tsx`, `flourishes.tsx`; `CollectibleArt.tsx`; domain friendship and pantry behavior. PetArt and face composition were reviewed for relevant rendering/interaction behavior.

**Targeted integration/source/test review:** ShelfScreen/resting/retired adapters; Today Band/HabitCard, SillSegment/PotSlot/WindowsillBand, today and pets view-model construction; Progress/You placeholders; feed-order tests, Shelf adapter tests, watering tests and scene behavior tests. Searches covered every feeding action caller, flourish-copy consumer, and level/best-friend input in scene code. This leaf did not read every authored species SVG coordinate or every test in the repository, nor claim to; repository-wide coverage is consolidated by the parent.

**Visual assets inspected:** `public/screenshots/narrow-1170x2532.png`, `public/screenshots/wide-2560x1600.png`, `public/icons/icon-192.png`. These were treated as committed presentation assets, not proof of current interactive behavior. Live browser, rendering matrix, sound playback and assistive-technology checks remain parent-owned.

**Four passes completed:** (1) full vision/history/module and main-source review; (2) expert reread traced accepted creative promises through state → view models → adapters → art/scene behavior; (3) defect/refutation pass searched alternative action paths, remount/reset behavior, existing level effects and unused prose consumers; (4) polish pass removed obsolete-vision demands, separated future work from current defects, checked severity/confidence, and bounded proposals with dependencies/tradeoffs/acceptance criteria. No tests were executed or files altered in the audited repository by this leaf.

#### Focused delta review — onboarding at 7d16f113769ab5d681b5ddae1dbb8381f364a914

The concurrent branch advanced after the baseline audit. This appendix refers exclusively to the newer isolated `work/lookwhaticando-current` snapshot. It does not imply the earlier snapshot was rewritten. The parent confirmed art/Shelf were unchanged. The newly integrated Progress and You screens supersede the earlier placeholder status; their detailed delta reviews belong to the other audit leaves.

Read in full: all eleven files in `src/features/onboarding/` (all components, flow/progress modules, CSS, both tests), `src/app/App.tsx`, and the capsule `usePull.ts` recovery path. Also read the shared `ImportSheet.tsx` and `InstallGuide.tsx`; reread DESIGN §9.6 and the relevant store/domain write, onboarding and first-capsule guards. No test execution or source mutation in this delta leaf. Repeated the four passes: full read, journey trace, refusal/reload/failure refutation, then prioritization and wording.

##### CR-D1 — P2: A refused onboarding write advances the UI into a step it cannot finish

**Confidence:** High, source-confirmed; root should reproduce with the actual App shell.

**Scenario:** Two tabs are open on a new, not-yet-onboarded save. The second has `readOnly = 'other-window'`. In that tab choose habits and press Plant them (or Skip at the picks step). The domain mutation is refused, but the UI proceeds to the first-capsule step. Skip/Not yet cannot leave onboarding. Taking ownership with Use here at this point does not retry habit creation or mark onboarding complete; a reload is needed to restart the flow unless the other tab completes it.

**Evidence:** `src/state/store.ts:234` treats another-window/newer-version saves as unwritable; `:291–307` returns the fallback without a transaction; `:797–798` supplies `[]` as the onboarding fallback. `src/features/onboarding/PickStep.tsx:23–24` passes that through. `Onboarding.tsx:181–192` always advances from the returned IDs, and `flow.ts:75–87` routes an empty list to `first`. However `Onboarding.tsx:163–173` finishes only by clearing progress and navigating. `progress.ts:69` continues demanding onboarding while `profile.onboarded` is false, and the already-mounted component's local `phase` remains `first`. The only normal call that sets `profile.onboarded = true` was skipped (`src/domain/habits.ts:496–500`).

**Impact:** A supported single-writer state becomes a misleading and stuck first-run journey. The user's selected habits are never created, although the flow has visually accepted them. This is more consequential than a general disabled-control polish issue.

**Refutation:** The other-window banner is visible and offers Use here; using it before planting avoids the problem. It does not repair this already-advanced local phase. Zero selected habits is intentionally supported and must remain distinguishable from a refused transaction. Existing domain write protection correctly prevents an unauthorized second writer; the UI must handle that result rather than weaken the lock.

**Recommendation/acceptance:** Return a discriminated success/refusal result or explicitly verify the profile transition before advancing. Keep the picks and stay on their screen with the existing ownership recovery action. Test refusal → Use here → retry → exactly one set of selected habits, then zero-pick success separately. Current M2 recovery gate.

##### CR-D2 — P2: Reloading a committed first capsule loses the cabinet needed to reveal it

**Confidence:** High for the state/UI mismatch; this is an onboarding-specific continuation of the parent's broader pending-reveal review.

**Scenario:** Turn the first cabinet far enough to commit its pet, then reload during the drop or reveal. The saved flow resumes at `first`, but shows “Who comes home first?” and all four cabinets again. Choosing another cabinet permits the insertion/turn choreography, then rejects with a pending-reveal message; it does not return the user to the cabinet that already contains their pet.

**Evidence:** `src/features/onboarding/progress.ts:17–24` persists phase/habit IDs and eventual pet ID, not selected cabinet. `Onboarding.tsx:63–66` resumes the phase. `CapsuleSteps.tsx:53` always initializes `picked` to null; `:101–123` offers all four choices without consulting `pendingReveal`. Capsule `usePull.ts:35–42,52–57` resumes the committed reveal only when mounted for the matching machine. `src/domain/gacha.ts:295` correctly blocks a second pull while a reveal is pending. The sole reload test, `Onboarding.test.tsx:95–102`, restores an empty `first` phase without a committed pending pull, so it misses this condition.

**Impact:** The first important earned object appears not to have survived a refresh; the interface invites an action the model will reject. The pet itself remains saved—this is **not data loss**. The normal alternative of opening the correct cabinet still works, but the user must remember or rediscover it. Skip into Today also provides a recovery route; that is not a substitute for honest continuation.

**Recommendation/acceptance:** If a non-order `pendingReveal` exists, initialize the step to its machine and resume that reveal before offering any fresh choice. Derive from authoritative pending state rather than introduce another independent persisted copy if possible. Exercise reload immediately after commit for each of the four cabinets; assert the same pet, no second gift/cost, and successful continuation into naming/placement. Include Skip during the drop and return via Today in the parent capsule recovery matrix.

##### CR-D3 — P3: A failed capsule-step chunk leaves an instruction to choose a cabinet, with no cabinet or retry

`Onboarding.tsx:74–89` catches a dynamic-import failure without setting an error or retry state, and the effect runs only once. `:255` then keeps displaying the normal “Choose a cabinet” lead for both `first` and `place`. Unlike the outer onboarding import (`src/app/App.tsx:86–102,142`), this second lazy chunk has no error UI. A transient network/update-cache miss therefore looks like an unfinished screen. Skip still exits, so it is not a hard lock. Provide the established small load-error/retry affordance while retaining Skip. Verify reject-once then retry-resolve without replaying habit creation or the gift.

##### Smaller craft/continuity observations

- The fresh-start sequence is faithful to the current concept: up to three picks shared across templates/custom, live tracker actions, a real first pet, suggestions and placement, and no required profile fields. It reuses the real domain economy rather than faking an introductory reward. The pure/UI tests cover starter ordering, pick limits, custom-name behavior, ordinary planting, first top-up, and skipping.
- In `SillStage.tsx:49–53`, the planted habits still render with `stage: 0` even after their first completed watering; `CapsuleSteps.tsx:233` also draws every placement option at stage 0. This is a narrow creative integration shortfall: the design teaches that the first watering grows roots, but onboarding postpones showing that real growth until Today. Prefer the same authoritative plant presentation data used by the real tracker while keeping the pre-plant preview at cutting. It is not evidence that growth fails to persist.
- PlaceStep name suggestions (`CapsuleSteps.tsx:206`) change only the draft. Typing is saved on input blur (`:202`), and the plant/choose buttons save explicitly (`:161–175`), but the global Skip button calls the parent's finish directly (`Onboarding.tsx:232`). Picking a suggestion then Skip can therefore discard the displayed choice. Persist an explicit suggestion selection or define/copy an explicit Save/cancel boundary; do not imply the preview is the saved name.
- Normal existing onboarded users with no progress sidecar bypass this flow; importing an existing save calls the onboarding finish callback, clears the sidecar and returns to Today. Demo mode bypasses onboarding, and leaving the demo is intended to restore the unfinished real journey. No new forced-onboarding defect is claimed for those ordinary paths. Cross-tab stale sidecars and import/undo interactions merit the platform leaf's lifecycle coverage rather than assumptions from isolated component tests.
- Quiet rewards has no first-run chooser in the accepted onboarding design, and a fresh default save is not in quiet mode. Consequently I do not call the normal first-capsule introduction a quiet-mode violation. Validate imported/existing quiet saves and the newly integrated You preference with the other leaves. Optional “Not yet” remains an exit from collecting; avoid interpreting it as a permanently stored refusal of all rewards.

**Delta acceptance coverage still needed:** full App-shell testing of write refusal and ownership recovery; partial first-capsule reload; secondary-chunk failure/retry; importing a mature quiet save; demo → leave → real first run; named-pet Skip semantics; and accessible heading/focus after asynchronously arriving first/place chunks. The current four onboarding UI tests do not prove these journeys. This list is bounded to newly introduced integration boundaries, not a request to expand every existing test suite.


## Documentation inventory

All 23 documents were covered by the first audit, with the current delta compared during the second. Links below use the second-audit pin.

### Vision and history

- [docs/DESIGN.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/docs/DESIGN.md)
- [docs/VOICE.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/docs/VOICE.md)
- [docs/ORIGINAL_CONCEPT.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/docs/ORIGINAL_CONCEPT.md)
- [docs/archive/DESIGN-v1-mochi.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/docs/archive/DESIGN-v1-mochi.md)
- [docs/AUDITS.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/docs/AUDITS.md)

### Architecture and delivery

- [README.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/README.md)
- [NOTES-domain.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-domain.md)
- [NOTES-ui.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-ui.md)
- [NOTES-open.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-open.md)
- [e2e/README.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/e2e/README.md)

### Art, voice and collection

- [NOTES-garden.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-garden.md)
- [NOTES-plants.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-plants.md)
- [NOTES-pets.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-pets.md)
- [NOTES-items.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-items.md)
- [NOTES-icons.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-icons.md)
- [NOTES-shelf.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-shelf.md)
- [NOTES-capsules.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-capsules.md)
- [NOTES-fxui.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-fxui.md)
- [NOTES-voice.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-voice.md)

### Integrated screens

- [NOTES-w2-today.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-w2-today.md)
- [NOTES-w2-shelf.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-w2-shelf.md)
- [NOTES-w2-progress.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-w2-progress.md)
- [NOTES-w2-you.md](https://github.com/wktw/lookwhaticando/blob/c66f5880776c08e2c687922a3ec3a3206595c8da/NOTES-w2-you.md)

## Evidence package and reproduction use

The existing `catkin-combined-evidence.zip` contains the original report and evidence ZIP unchanged, the second-pass findings, pinned CI extract, source/status metadata, five synthetic reproduction files, their Vitest configuration, logs and artifact verification results. `catkin-combined-audit.html` provides the same review in a navigable format.

Reproductions R201–R214 correspond to the new runtime variants. Existing 19 checks are retained or updated for the new source pin. These deliberately assert observed defective behavior. During implementation, create tests that fail on the original behavior and pass only on the correct invariant; do not treat the audit harness's green result as a fix acceptance test.

The evidence package records the sibling directory layout and command for reproducing the scratch checks in a disposable workspace. Do not run synthetic reset/import fixtures against real user state. No dependency cache or full application repository is embedded in the evidence ZIP.

## Requirements for the implementation plan

Every original finding, deeper finding, additional bounded risk, proposed product improvement and native release requirement needs an explicit disposition. Merge shared root causes without dropping their source IDs or acceptance scenarios. Mark fixed or disputed items with current evidence. Separate immediate reliability work from product decisions and prospective native release work.

For each proposed work package, identify the problem, current status, affected source boundaries, design, dependencies, migration or compatibility impact, meaningful regression tests, failure injection/device checks, completion criteria, and rollback/recovery considerations. Preserve ongoing development and do not use the audit as authorization for immediate implementation.

The accompanying `OPUS_5_5_AUDIT_IMPLEMENTATION_PROMPT.txt` is the planning handoff. The owner requested a plan for all applicable issues before fixes are implemented.

# M1 fixes, area "ui": requests for the lead

Each item is a change outside the ui area's files that a finding needs. The ui side of every
finding is done in this branch (m1/ui).

## Requests

1. **DESIGN.md §9.1, the priority list (finding 8).** Extend it to name every event the domain
   emits, as `src/fx/celebrationPlan.ts` PRIORITY now orders them:
   exclusive > plant Blooming/Evergreen (a new look, then a keepsake, as its first "also" lines)
   > Showing-up rung > perfect day > in-a-row rung > pin > full Field Guide page > best friends
   > companion moved in > story on the tag > welcome home > period goal > small stage > favourite
   > friendship level > found thing > first harvest > swaps to a stamp > season review > note on
   the sill. Silent in the planner: companionXp (it feeds the check-in note's aside), retired,
   restock, checkin, uncheck. Notes that point somewhere (note on the sill, story, found thing,
   season review) keep their own toast beside a banner.

2. **src/catalog/lines.ts: constants for the fx lines VOICE.md has but lines.ts does not (finding 8,
   "take all the wording from lines.ts").** `src/fx/copy.ts` words these from VOICE.md verbatim
   for now; once lines.ts exports them, fx/copy.ts should switch to them (one-line changes):
   - `COMPANION_MOVED_IN = '{name} moved into {plant}.'` (VOICE §13, line ~796)
   - `STORY_WAITING = 'There’s a story on the plant tag for {habit}.'` (VOICE §13, ~802)
   - `NEW_LOOK = 'A new look for {plant}: {look}.'` (VOICE §14, ~883)
   - `SEASON_REVIEW_TITLE = '{Season}, on the sill.'` (VOICE §12, ~759)
   - `KEEPSAKE_NOTE = '{name} left {thing} by the pot.'` plus the per-kind things
     (VOICE §13's keepsake table; fx/copy.ts KEEPSAKE_THINGS holds them today). VOICE.md has only
     the dated caption ("{date} · Left by the pot: …"), so the toast wording also wants a row
     in VOICE §13.
   - `FAVOURITE_FOUND = '{name}’s favourite is the {treat}. It’s on the Pet Card now.'` (VOICE §9)
   - `NOTE_ON_SILL`, `WELCOME_HOME` (VOICE §5) and `PERFECT_DAY` title/text/lampText.

3. **Settings.keyboardShortcuts (finding 25).** `src/app/shortcuts.ts` reads
   `settings.keyboardShortcuts?: boolean` (undefined = device default: on only with
   `(hover: hover) and (pointer: fine)`). Please add the optional field to `Settings` in
   `src/state/types.ts` (no migration needed: absent means default) and let `updateSettings`
   accept it; then drop the `object` cast in `shortcutsEnabled`. The You › Accessibility switch
   ("Keyboard shortcuts: 1–5 switch tabs, N plants a habit") is for the screens builders.
   Listeners for the new-habit shortcut should use `'ck:new-habit'` (`NEW_HABIT_EVENT`);
   `'mm:new-habit'` is still dispatched as an alias and can go once nothing listens for it.

4. **Today's firstCapsule card copy (finding 26).** `src/state/views/today.ts` (logic): while any
   `capsulesView.machines[i].free` is true, the firstCapsule card should say
   "Your first capsule is waiting on the Capsules tab." Please add it to lines.ts (say
   `FIRST_CAPSULE_WAITING`). The Capsules tab now offers the free capsule on every first-pick
   cabinet (reads `MachineCardVM.free`, pulls with `{ free: true }`, shows "Your first capsule
   is on the house" in place of the price, and hides the cabinet's price chip).

5. **Live Shelf demo cast (finding 21).** `src/features/meadow/demo.ts` is outside ui: swap
   Juniper (pet-cat-calico) for pet-bunny-lop and Humbug (pet-cow-beltie) for pet-dog-shiba, and
   add pet-hamster-syrian or pet-bear-black on the bookshelf, so the first 390 px of the sill shows
   a cow, a cat, a bunny and a dog.

6. **README.md (finding 66).** Line 6: "Each watering helps it root, get potted up, leaf out and
   bloom." Line 10: "Nothing wilts, and a quiet day costs nothing." Line 11: "Progress is counted
   as showing up over time (“26 of the last 30 days”), never as a number that can drop." Use ’ in
   prose throughout.

7. **Old names (finding 65), the parts outside ui:**
   - Move `src/features/meadow/MeadowScreen.tsx` to `src/features/shelf/ShelfScreen.tsx` (export
     `ShelfScreen`), then change the one import in `src/app/routes.ts` (the Shelf route's `load`,
     line ~26; a comment there points here). `TAB_ALIASES { meadow: 'shelf' }` stays.
   - `src/art/icons`: drop the `'tab-meadow'` alias (routes.ts now uses `'tab-shelf'`), and the
     `StarIcon` / `StardustIcon` aliases in currency.tsx: nothing in src uses them any more.
   - `src/catalog/types.ts:3,21`: reword the "Mochi Meadow" comments.
   - `index.html` pre-paint script still reads `localStorage['mochi-meadow:v1']` (NOTES-ui.md 2):
     it should read the catkin storage key. Persisted keys `inMeadow` and `wallet.stars` stay.
   - The gallery's `fxui-appicon` and splash stages (icons 4) belong to the icons owner.
   - Kit tokens: done (moved into src/styles/tokens.css; NOTES-fxui 2 and NOTES-ui 1 can close).

8. **Capsule cabinet price chip (finding 64).** The chip in `src/art/machines` renders its price at
   8 px on a 320 px screen. Please clamp that text to ≥ 11 px CSS (or, at narrow widths, leave the
   price to MachineInfo's pill, which is AA and 16 px). The leaflet text and the carousel dots are
   fixed on the ui side.

9. **Voice lint coverage.** `tests/unit/voice.test.ts` `VOICE_SCAN_DIRS` can now include
   `src/fx`, `src/ui`, `src/app` and `src/features/capsules`: run against those directories the
   lint is clean (checked on this branch).

## Contract changes other areas and the screen builders need

- `toast({ actions })`: up to two buttons (`ToastAction[]`, `MAX_ACTIONS = 2`), in order. The single
  `action` still works (it goes first).
- `showCheckInNote({ habitId, habitName, coins, kind?, tiny?, count?, unit?, date?, events?, note?,
  onUndo, onAddNote? })`: words the note from lines.ts CHECKIN_TOASTS ('watered' | 'count' |
  'tiny' | 'noCoins' | 'history'; inferred when `kind` is left out). Pass the check-in result's
  `events` so the harvest line and the companion's aside (from companionXp) show. With
  `onAddNote` it offers "Undo" and "Add a note".
- `showUncheckNote({ habitId, habitName, refunded, spent? })`: the un-watering note.
- Screen readers hear a burst of waterings as "3 habits watered. Plus 14 coins. Undo available."
- `pushLayer(id, { moment: true })`: a full-screen moment (the capsule reveal, the epic card).
  While one is open, celebration banners and toasts wait (timers stopped) and arrive after it.
  Sheets opened above a moment stack normally and make it inert.
- The capsules feature's own sheet, button, scroll lock and focus trap are gone: it uses
  `@/ui/Sheet` (new `aside` prop for header extras), `@/ui/Button` (new `face` prop for a
  series' painted face, and `buttonRef`) and `@/ui/Pill`.
- `CelebrationArt` is no longer imported statically anywhere: use `LazyCelebrationArt` from
  `@/fx/celebrationArtLoader` (a same-size blank until the art chunk arrives). The entry chunk
  is now 320 KB / 114 KB gzip (was 885 / 304).
- `CelebrationContext` gained optional `petSpecies`, `petFriend`, `albumName`, `lamplight`, and
  `HabitInfo` optional `stage` and `avoid`.
- `ObjectArt` names are `'watering-can' | 'note' | 'drop'`; `EmptyPot` and `CuttingGlass` are gone
  from `@/ui/art/objects` (use `PotArt pot="terracotta"` and `PlantArt species="pothos" stage={0}`).
  The celebration art spec still accepts `{ type: 'object', name: 'pot' | 'cutting' }` and draws
  those with PotArt and PlantArt.
- `@/fx/frameMonitor`: `watchScene(root)` (ScreenHost runs it for the Shelf). It sets
  `<html data-lite>` when the median frame is over 25 ms, `data-offscreen` on pets off screen and
  `data-flick="on|off"` on each `.pet-art`, so art must keep the class names `.pet-tailflick`,
  `.pet-earflick`, `.pet-throat` and `.plant-sway`.
- Tab changes are announced ("Capsules"), and after keyboard navigation focus goes to the
  screen's `h1` (given `tabIndex=-1` if it has none). Every screen needs exactly one `h1`.
- Single-key shortcuts: `shortcutsEnabled()`, `NEW_HABIT_EVENT = 'ck:new-habit'`.
- Reveal buttons: "Find {name} a plant" · "Let {name} choose" · "Not now" for a new pet; "Find it a
  place" for decor. `PlaceHandlers.onPlace(itemId)` / `onLetThemChoose(itemId)` are unchanged.

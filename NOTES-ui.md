# ui: notes for the lead (catkin restyle)

Gallery: `/gallery.html?only=fxui` (sections `fxui-buttons`, `fxui-checkring`, `fxui-controls`,
`fxui-surfaces`, `fxui-status`, `fxui-objects`, `fxui-sheets`, `fxui-notes`, `fxui-fx`, `fxui-sounds`,
`fxui-celebrations`, `fxui-shell`, `fxui-app`, `fxui-install`, plus the icons module's `fxui-appicon` and
`fxui-splash` stages, kept for `scripts/generate-icons.mjs`).
Useful params: `fxui-notes&live=1`, `fxui-fx&fx=petals|petals-point|coin|glint|checkin` (shoot with `--motion
--wait=…`), `fxui-celebrations&celebrate=perfectDay|bloom|showUp|windowSeat|evergreen|…`,
`fxui-sheets&open=basic|confirm|tall|peek|stack|sticky`, `fxui-install&gate=ios-safari|mac-safari`.

## Contract-change requests (files outside ui ownership)

1. **Done (M1):** the kit values live in tokens.css (`--shadow-card`, `--error-ink`, `--butter-soft-night`…). Was: **`src/styles/tokens.css`: adopt four kit values.** `src/ui/tones.css` declares, in one place, what the
   kit needs and tokens.css lacks: `--kit-card-shadow` (the style frames' card shadow:
   `0 1px 0 rgba(59,50,54,.03), 0 6px 16px -14px rgba(59,50,54,.35)`), `--kit-float-shadow` (notes, sheets),
   `--error-ink` (`#a9501f`, AA on paper, oat and card; `var(--peach-700)` at night) and
   `--butter-soft-night` (`#74622f`: night butter-300 is 3.98:1 under light text). Night values are in the
   same file. Request: move them (with their night and auto-dark overrides) into tokens.css, ideally as
   `--shadow-card`, `--shadow-float`, `--error-ink`, and add them to the contrast test.
2. **Done (M1):** the pre-paint script reads `catkin:theme` with the catkin paper colours, and shoot.mjs seeds `catkin:v1`. Was: **`index.html` pre-paint script is still Mochi Meadow.** It reads `localStorage['mochi-meadow:v1']`
   (DESIGN §11 names the save `catkin:v1`) and writes `theme-color` `#FFF9F2` / `#221C30`. Request: read
   `catkin:v1` and use `#FAF6EF` / `#1E1A22` (what `src/app/theme.ts` `THEME_COLOR` now sets after boot, and
   the tokens' `--bg`). `scripts/shoot.mjs --seed` writes the old key too.
3. **Done (M1):** "catkin · gallery (dev)". Was: **`gallery.html`**: title "Mochi Meadow · Art Gallery (dev)" → "catkin · gallery".
4. **`src/dev/sections.tsx`**: the `mascot` and `wearables` sections render `pet-mochi` (and other v2 ids),
   which the v3 catalog no longer has. catkin has no mascot (DESIGN §1): remove `mascot`, and point
   `wearables` at v3 ids (`pet-cat-orange`, `pet-cow-holstein`, `pet-bunny-dutch`, `pet-frog-tree`,
   `pet-bear-brown`, `pet-hamster-syrian`, `pet-duck-yellow`).
5. **Icons module**:
   - `Wordmark` from `@/art/icons` for the sidebar. `src/app/Sidebar.tsx` renders lowercase Castoro "catkin"
     until then (`TODO(integration)`).
   - A `tab-shelf` icon name. `src/app/routes.ts` still uses `'tab-meadow'` for the Shelf tab
     (`TODO(integration)`); a one-word change once it exists (keep `tab-meadow` as an alias).
   - The tab bar and sidebar pass `filled` for the current tab.
6. **Placeholder screens** (`src/features/meadow/MeadowScreen.tsx` etc., wave 2) still say "Meadow".

## How other modules plug in

- **Today (wave 2)**:
  - Check buttons are `<CheckRing>` from `@/ui` (`state` or `count`/`target`, `label`, `description`,
    `tone`). One-tap habits: `label="Walk"` (it sets `aria-pressed`). Count habits:
    `label="Add 1 glass to Drink water" description="5 of 8 glasses"` (no aria-pressed, per §11.2).
    `state="rest"` shows the moon, `state="tiny"` the sprout. Reduced motion fills instantly by itself.
  - In the tap handler, right after `const r = checkIn(id)`: `celebrateCheckIn(r, id, ringElement)` (chip,
    water-drop chime at 220 ms, one coin at 440 ms, haptic) and, for a completing check-in,
    `showCheckInNote({ habitId, habitName, coins, tiny, note, onUndo })` from `@/fx/checkin` ("Walk,
    watered. +5 · Pudding opened one eye. · Undo", 4 s). `note` is an observed caption (DESIGN §12's caption
    matrix), optional.
  - Schedule the band from `CHECKIN_CHOREOGRAPHY` (`@/ui`): `pour` 200, `growth` 360, `resident` 400,
    `coin` 440, `toast` 520, all done by `total` 700 ms.
  - Put `data-celebration-anchor` (`CELEBRATION_ANCHOR` from `@/fx/CelebrationBanner`) on the windowsill band:
    celebration notes tuck over its lower edge. Without an anchor they sit at the top of the screen.
  - `data-wallet-target="coins"` on the wallet pill **and** the coin jar on the sill: the coin flies to the
    nearest visible one. `restLine(name)` from `@/fx/copy` is "Yoga is resting today. Nothing here wilts."
- **Onboarding / boot**: the install-first gate is `<InstallGate onPeek={…} />` from `@/app/InstallGuide`,
  shown when `shouldGateInstall(currentInstallPlatform(), hasSave)` (Safari tabs on iPhone, iPad and Mac with
  nothing saved). "Just peek" should open the demo.
- **Capsules**: `burst()` keeps its API but draws at most 12 petals and leaves (older shapes like star, heart
  and sparkle become petals; near-white colours are skipped, they vanish on paper). For the rare reveal's one
  foil glint use `glintAt(rect)` or `<SparkleBurst trigger={n} />` from `@/fx/SparkleBurst`. Sound names are
  unchanged: `ratchet` is the handle tick, `pop` the soft opening pop, `coin` the brass clink, `crack` and
  `thunk` the capsule.
- **Pets and everything animated**: reduced motion now exempts an element marked `ck-motion-safe` (`mm-motion-safe` still works; only that
  element, not its children) from the global kill switch. Mark only a blink, breathing ≤ 1.5% or a crossfade.
- **Screen readers and rapid check-ins (burst rule, §9.1)**: `showCheckInNote` no longer announces each
  note; every check-in of a burst is read as one sentence ("Walk and Read watered. Plus 10 coins. Undo
  available.") after 1.2 s of quiet. Other bursty announcements can use `announceSettled(group, text)`
  from `@/ui/announce` (and `toast({ …, silent: true })` to keep the toast itself quiet).
- **Petals in the plants' own colours**: `burst({ colors, leafColors, shapes })`; `petalMix(species[])`
  from `@/fx/petalColours` builds them (leaves only when nothing flowers). Banners carry `spec.petals`
  (bloom: that species; perfect day: `CelebrationContext.sill()`, the sill's plants). At most 12 petals
  are ever in the air, across overlapping bursts.
- **Foil glint**: `<SparkleBurst trigger={n} />` is now a pale-gold sheen that slides once across its
  (position: relative, rounded) parent; `glintAt(rect)` does the same over a screen rect. A Secret's single
  sparkle is `<SparkleBurst trigger={n} variant="secret" />`.
- **Class names**: tone scopes are `ck-tone-*` and the reduced-motion escape hatch is `ck-motion-safe`;
  the older `mm-` names still work as aliases.
- **Kit art for your empty states**: `EmptyPot`, `CuttingGlass`, `WateringCan`, `PaperNote`, `WaterDrop` from
  `@/ui/art/objects` (each takes `light`; `themeLight()` gives day or lamplight to match the page).
- **Sheets over notes**: notes (toasts) sit at the bottom above the tab bar; while any sheet is open they move
  to the top so they never cover a sheet's buttons.

## Known gaps

- **Gate merging the shell and the epic moment on the icons, pets and shelf modules.** In this branch the
  install gate and guide still render the Mochi app icon and "mochi meadow" labels (icons), toasts and the
  wallet show the smiley/paw coin (icons), the perfect-day note shows the Mochi cat head (pets), and the
  Window Seat and Laurel Sprig both render the same outlined gift box (shelf/CollectibleArt). Please confirm
  CollectibleArt has real art for `decor-window-seat` and the Laurel Sprig id before shipping the epic moment.
- `.collectible-silhouette` (global.css) now repaints shapes in `--ink` instead of a CSS filter; shapes whose
  fill comes only from a CSS class with `fill: none` would be filled. If CollectibleArt draws any such
  shape, mark it `fill="none"` as an attribute.

- Tab icons, currency tokens, the app icon, splash and install illustrations are the icons module's and
  still show the Mochi look in this branch. `PetArt`, `PlantArt`, `CollectibleArt` and `BadgeMedal` in
  celebration notes are the pets, garden and shelf modules' (the Window Seat renders as a stub box here).
- `tests/unit/art-coverage.test.ts` and four art test files (pets, badges, plants, scene) fail on the base
  commit too (9 tests, v3 catalog ids not yet drawn); nothing in ui touches them.
- `NOTES-fxui.md` (the earlier wave) still lists vite/PWA requests 1, 4, 5 and 7; they are unchanged.

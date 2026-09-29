# fxui: notes for the lead

## Contract-change requests (files outside fxui ownership)

1. **Done (M1, m1/build):** `includeAssets` is gone and the precache skips `splash/**`, `screenshots/**` and Latin Extended Nunito.
   ~~**`vite.config.ts`: the launch images ARE precached. Please fix (perf bug, not cosmetic).**~~
   `includeAssets: ['icons/*.png', 'icons/*.svg', 'splash/*.png']` adds every matching file to the precache
   manifest regardless of `workbox.globIgnores`, so `dist/sw.js` precaches all 22 `splash/*.png` on first
   install over cellular, although iOS fetches its one launch image itself and never through the service
   worker. (An earlier version of this note said they were not precached; that was wrong.) The icons are also
   listed twice, once from `includeAssets` and once from `globPatterns`. Request: drop `includeAssets`
   entirely (`globPatterns` already covers `icons/*`) or at least remove `'splash/*.png'` from it.
   Meanwhile `scripts/generate-icons.mjs` now writes the launch images as 256-color palette PNGs:
   2.1 MB → 0.75 MB for all 22 (about 34 KB each), pixel-identical flat colors.
2. **`src/styles/tokens.css`: adopt the kit tokens.** `src/ui/tones.css` declares, in one place, the colors
   the kit needs that tokens.css doesn't have: candy lips (`--blush-lip` … `--lilac-lip`), the coral danger
   family (`--danger-100/300/500/700/lip`), raised neutral surfaces (`--raised`, `--raised-lip`), form colors
   (`--error-ink` #A9501F is AA on `--bg` and `--bg-2`; `--control-off`, `--control-stroke`),
   `--butter-soft-night` (night butter-300 is 3.98:1 under light text), and the sticker colors of floating
   reward chips (`--chip-coin/star/heart/sage`). Components read only these variables. Request: move the
   block (and its night overrides) into tokens.css so other modules can use the same values.
3. **`src/styles/global.css` `:focus-visible { border-radius: 12px }`** changes the *shape* of whatever gets
   focus (pills become rounded rectangles, sheets lose their 30px corners). Modern outlines already follow the
   element's own radius. Request: drop `border-radius` from that rule. fxui components override it locally.
4. **Done (M1, m1/build):** the single-file build strips the block, inlines the apple-touch-icon and copies no public/ folder.
   ~~**Single-file build (`--mode single`): strip the startup-image block.**~~ `dist-single/index.html` still
   carries the 22 `<link rel="apple-touch-startup-image">` tags. Browsers don't fetch them on load (iOS only
   reads them when adding to the Home Screen), so this is dead weight rather than 22 failing requests, but a
   tiny `transformIndexHtml` plugin that removes `<!--startup-images-->…<!--/startup-images-->` when
   `single` is true would tidy it. The favicon is already solved: generate-icons inlines it as a `data:` URI
   between `<!--favicon-->` markers, so the lone HTML file has it.
5. ~~DESIGN §11 says the single-file build produces `dist-single/MochiMeadow.html`; it currently produces
   `dist-single/index.html` (vite config, not fxui).~~ **Done:** `npm run build:single` writes `dist-single/catkin.html`, as DESIGN §11 now says.
6. **`src/styles/tokens.css` auto-dark block** (`@media (prefers-color-scheme: dark)`) doesn't redefine
   `--shadow-sm/md/lg`. The app always sets `data-theme`, so only the gallery without `?theme=` on a dark OS
   is affected. Low priority.
7. **Service worker: `virtual:pwa-register` is not used.** That module only exists when vite-plugin-pwa runs,
   and Rollup resolves dynamic imports even in dead `if (__SINGLE_FILE__)` branches, so importing it breaks
   `npm run build:single`. `src/app/pwa.ts` uses `workbox-window` directly, which is what `registerSW` wraps.
   The update prompt ("A fresh version is ready 🌱 · Refresh") was verified against a second deploy.

## How other modules plug in

- **Wallet counters** (Today header pill, Capsules wallet strip): put `data-wallet-target="coins"` /
  `"stars"` on the element coins should fly into, and render the number with
  `<AnimatedNumber value={wallet.value.coins} walletKind="coins" />` (from `@/ui`). The counter holds the old
  number while coins are in the air and ticks up as each one lands. This works because rewards are reserved
  (`src/fx/walletLedger.ts`) in the same tick the store commits them: `<CelebrationHost/>` does it for every
  `coins`/`stars` event, and `flyCoins()` does it for its own amount when called in the same tick. Code that
  commits coins and flies them *later* should call `reserve(kind, amount)` right away and pass it to
  `flyCoins({ …, reservation })`. Unflown reservations let go by themselves after 2.5 s.
- **Check-ins (Today, Habit Detail):** in the tap handler, right after `const r = checkIn(id)`, call
  `celebrateCheckIn(r, id, buttonElement)` from `@/fx/checkin` (same tick, inside the gesture). It plays the
  §9.1 flourish (6-sparkle puff, "+5" float, coin flight, chime + haptic tick) and takes those coins over from
  `<CelebrationHost/>`, so they are celebrated once. Check-ins made without it (e.g. from the Progress
  calendar) get one calm, coalescing "+N coins" toast whose coins hop into the wallet. Also call
  `announce('Walk done, plus 5 coins')` from `@/ui` for screen readers.
- **Big moments** need no wiring: `<CelebrationHost/>` listens to `onGameEvent` and picks banner / epic
  moment / toast by priority, merging stacked events into one card. Toasts slide below a banner (and below a
  wallet pill near the top of the screen), and wait under the epic moment instead of expiring unseen.
- **Screens remount on every tab switch** (`ScreenHost` keys the screen by tab). Keep anything that should
  survive a round trip (carousel index, scroll inside a panel, which pet was selected) in a module-level signal,
  not component state. Keeping visited screens mounted-but-hidden would preserve Meadow's scene, but then every
  screen's global key listeners and rAF loops would keep running while hidden (Space would turn the crank
  from Today). If the lead wants that, ScreenHost can switch to `hidden` + `inert` once each feature gates its
  listeners and loops on a "tab is active" signal; ask and fxui will add it.
- **Haptics** only reach iPhones from inside a user gesture: call `haptic()` synchronously in the tap
  handler, never from a timer or effect. (`<CelebrationHost/>` fires its haptics as events arrive for this
  reason.)
- **New habit:** the shell dispatches `window` event `'mm:new-habit'` on the `N` key. Whoever owns the
  habit editor should listen for it.
- **Deep links:** `routeRest` (from `@/app/router`) holds hash segments after the tab (`#/meadow/pet-x` →
  `['pet-x']`); `navigate(tab, rest)` sets them.
- **Install guide:** `<InstallGuide />` (card + illustrated sheet) from `@/app/InstallGuide` is ready for the
  You screen. iOS Safari 26+ gets the ⋯ → Share → View More → Add to Home Screen steps (compact tab bar);
  Safari 18 and older get the classic toolbar steps. Worth one check on a real iPhone of each.
- **Theme & status bar:** the iOS status-bar style stays `default` in both themes and takes its tint from
  `theme-color` (iOS reads the style tag only at launch, so a per-theme style breaks after a switch).
- **Modals:** anything modal that isn't a `<Sheet>` should call `pushLayer`/`removeLayer` from
  `@/ui/sheetStack` (as `EpicMoment` does) to get scroll lock, background `inert`, and correct Esc ownership.
  Open stacked sheets one after another (the usual case), not both in the same render.
- **Sounds:** `sfx.play(name)` / `sfx.voice(voice)`. Every recipe is loudness-calibrated for phone speakers
  (`tests/unit/fx/soundLevels.test.ts` keeps it that way). Every name is in the gallery:
  `/gallery.html?only=fxui-sounds`.

## Art that arrives from other modules

Tab/UI icons (`Icon`), currency icons, `BadgeMedal`, `PlantArt`, and wearables/treats are stubs in this
branch, so they render as circles or gift boxes in fxui screenshots. Nothing in fxui needs to change when
the real art lands.

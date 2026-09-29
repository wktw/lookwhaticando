# fxui: notes for the lead

## Contract-change requests (files outside fxui ownership)

1. **`src/styles/global.css` `:focus-visible { border-radius: 12px }`** changes the *shape* of whatever gets focus
   (pills become rounded rectangles, sheets lose their 30px corners when focused programmatically). Modern
   outlines already follow the element's own radius. Request: drop `border-radius` from that rule. The fxui
   components override it locally for now (`.candy:focus-visible`, `.sheet:focus-visible`, …), so nothing is
   broken today; other modules will hit the same surprise.
2. **`src/styles/tokens.css` auto-dark block** (`@media (prefers-color-scheme: dark) :root:not([data-theme])`)
   doesn't redefine `--shadow-sm/md/lg`. The app always sets `data-theme` at boot (inline script in
   `index.html` + `src/app/theme.ts`), so only the dev gallery without `?theme=` on a dark OS is affected.
   Low priority: copy the night shadows into that block.
3. **Service worker: `virtual:pwa-register` is not used.** That virtual module only exists when
   vite-plugin-pwa runs, and Rollup resolves dynamic imports even inside dead `if (__SINGLE_FILE__)`
   branches, so importing it breaks `npm run build:single`. `src/app/pwa.ts` uses `workbox-window` directly,
   which is exactly what `registerSW` wraps (`waiting` → "A fresh version is ready 🌱 · Refresh" toast →
   `messageSkipWaiting()` → reload on `controlling`). Verified against `vite preview`: SW registers and
   activates, and the offline-ready toast shows. If you'd rather use the virtual module, alias
   `virtual:pwa-register` to a no-op in `vite.config.ts` for `--mode single`.
4. **`vite.config.ts` `includeAssets` lists `splash/*.png` while `workbox.globIgnores` ignores `splash/**`.**
   The splash PNGs (2.1 MB, 22 files) are correctly *not* precached today; consider removing
   `splash/*.png` from `includeAssets` to make the intent explicit.
5. DESIGN §11 says the single-file build produces `dist-single/MochiMeadow.html`; it currently produces
   `dist-single/index.html` (vite config, not fxui).

## How other modules plug in

- **Wallet counters** (Today header pill, Capsules wallet strip): put `data-wallet-target="coins"` /
  `"stars"` on the element that should catch flying coins, and render numbers with
  `<AnimatedNumber value={wallet.value.coins} walletKind="coins" />` (from `@/ui`). The counter then ticks up
  as each coin lands and the element gets a bump.
- **Check-ins (Today, Habit Detail):** right after `const r = checkIn(id)`, call
  `celebrateCheckIn(r, id, buttonElement)` from `@/fx/checkin`. It plays the §9.1 flourish (sparkle puff,
  "+5" float, coin flight, chime + haptic tick) and tells `<CelebrationHost/>` not to celebrate those coins
  again. Check-ins made without it (e.g. from the Progress calendar) still get one calm, coalescing
  "+N coins" toast. Also call `announce('Walk done, plus 5 coins')` from `@/ui` for screen readers.
- **Big moments** need no wiring: `<CelebrationHost/>` listens to `onGameEvent` and picks banner / epic
  moment / toast by priority, merging stacked events into one card.
- **New habit:** the shell dispatches `window` event `'mm:new-habit'` on the `N` key. Whoever owns the
  habit editor should listen for it.
- **Deep links:** `routeRest` (from `@/app/router`) holds hash segments after the tab (`#/meadow/pet-x` →
  `['pet-x']`); `navigate(tab, rest)` sets them.
- **Install guide:** `<InstallGuide />` (card + illustrated sheet) from `@/app/InstallGuide` is ready for the
  You screen.
- **Modals:** anything modal that isn't a `<Sheet>` should call `pushLayer`/`removeLayer` from
  `@/ui/sheetStack` (as `EpicMoment` does) to get scroll lock, background `inert`, and correct Esc ownership.
- **Sounds:** `sfx.play(name)` / `sfx.voice(voice)`. Every name is in the gallery: `/gallery.html?only=fxui-sounds`.

## Art that arrives from other modules

Tab/UI icons (`Icon`), currency icons, `BadgeMedal`, `PlantArt`, and wearables/treats are stubs in this
branch, so they render as circles or gift boxes in fxui screenshots. Nothing in fxui needs to change when
the real art lands.

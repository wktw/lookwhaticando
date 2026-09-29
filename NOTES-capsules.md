# Capsules module: notes for the lead

Requests for shared contracts / other modules (I did not change any of these files).

## Contract requests

1. **`CurrencyIconProps.fill` for `StardustIcon`** (`src/art/icons/index.tsx`). The doc comment says the jar
   "accepts `fill` 0..1 to show jar level", but the props type has no `fill`. Please add
   `fill?: number` to `CurrencyIconProps` (used only by `StardustIcon`). When it lands,
   `src/features/capsules/WalletStrip.tsx` should pass `fill={w.stardust / STARDUST_PER_STAR}` to the jar.
2. **`machineStatus(id).available` must honor season windows** (domain). The carousel shows exactly the
   machines with `available: true`; the store stub returns `true` for all 11, so the gallery currently shows
   every seasonal machine. The "until Nov 10" badge is formatted from the catalog's `seasonal.end`, so
   `activeUntil` is not required by the UI.
3. **`pull()` must return `{ ok: false, error }`** for unaffordable pulls and missing tickets (the stub always
   succeeds and can drive balances negative). The UI pre-checks `machineStatus().canAfford` /
   `wallet.tickets` before the coin goes in, and still handles every `PullError` after the crank
   (the token pops back out with a friendly message).
4. **Optional sfx: `'kachunk'`.** The crank's ka-chunk currently plays `sfx.play('ratchet', { pitch: 0.55, volume: 1 })`.
   A dedicated heavier mechanical clunk would sell the moment better. Other sounds used, with `pitch`/`volume`:
   `coin`, `ratchet` (pitch rises 1.0→1.35 over a turn), `thunk` (volume = bounce strength), `crack`
   (pitch 1.18/1.36/1.6 per tap), `pop`, `reveal-<rarity>`, `sparkle`, `chime`, `whoosh`, `undo`.
   Haptics used: `tick` (every 30° of crank), `light`, `medium`, `success`.

## Integration notes

- **Routing:** render `CapsulesScreen` for `#/capsules`. The screen pads for `safe-top` and adds bottom
  padding, but assumes the shell reserves room for the tab bar.
- **Reduced motion:** my JS animations (physics, WAAPI choreography) check, in order,
  `<html data-motion="reduced|full">`, then `settings.reduceMotion`, then the OS query, the same way
  `global.css` does. Please have the shell set `data-motion` from the setting so CSS and JS agree.
- **Layers:** sheets use `z-index: 60`, the reveal overlay `80` (both portaled to `<body>`). Please fit
  these into the shell's z-index scale (toasts should sit above 80).
- **Keyboard:** Space turns the crank while it's ready (only when focus isn't on a control), ←/→ move the
  carousel, Esc closes sheets and the reveal. No conflict with `1`–`5` / `N`.
- **Local UI primitives to unify with the shared kit:** `src/features/capsules/ui/` has `CandyButton`
  (+ `Pill`, `cx`), `Sheet` (portal, focus trap, Esc, scrim, exit animation) and `useFocusTrap`.
- **Dev gallery CSS leak:** `.gal-section h2` (`src/dev/gallery.css`) restyles every `h2` inside a section,
  including headings of screens previewed there. My headings use double-class selectors to hold their
  look; scoping the rule to `.gal-section > h2` would fix it for every module.
- **Art from other modules:** the reveal and lineup render `CollectibleArt`, so wearable icons, treats,
  decor and plants show placeholder gift boxes until those modules merge.
- **Dev gallery:** `/gallery.html?only=capsules` (all), `?only=capsules-screen` (phone frame, seeds a
  500-coin / 20-star / 2-ticket wallet), `?only=capsules-pull&machine=moo&coins=10&tickets=0&quick=1`
  (one interactive machine, edge cases via URL), `?only=capsules-reveal&reveal=ultra|rare|…&stage=card`.
  Viewing every section at once runs several copies of the Kitty machine on one shared pile, so use `only=`.
- **Performance:** each machine's resting pile is computed once per session (a few ms on desktop) and cached;
  only the visible machine runs physics, and its rAF loop stops as soon as the pile sleeps or the page is
  hidden. The dome shows 20 capsules (bigger ones read better as capsules at phone size); the sim is tested with 24.

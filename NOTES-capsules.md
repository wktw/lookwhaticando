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
3. **`pull()` must return `{ ok: false, error }`** for unaffordable pulls and missing tickets, and must spend
   the ticket on `{ useTicket: true }` (the stub always succeeds, never deducts tickets and can drive balances
   negative). The UI pre-checks `machineStatus().canAfford` / `wallet.tickets` before the coin goes in, and
   still handles every `PullError` after the crank (the token pops back out with a friendly message).
   "Pull again" reads the wallet after the pull to offer (and label) the next way to pay, so it relies on
   the ticket actually being spent.
4. **Darken three light-theme `-700` tokens** (`src/styles/tokens.css`). DESIGN §10.1 calls the 700s "AA text",
   but on their own 100 fills `sage-700` is 4.22:1, `butter-700` 4.09:1 (4.39:1 on white) and `blush-700`
   4.32:1. My pills and chips mix 25% `--ink` into the 700 (`color-mix(in srgb, var(--x-700) 75%, var(--ink))`,
   darker by day, lighter by night; checked in `src/features/capsules/contrast.test.ts`). Fixing the tokens
   would let every module drop that.
5. **Love Letters body color** (`src/catalog/machines.ts`, optional). Kitty and Love both used `#F58CAA`, so the
   carousel read as a recolor. The art now draws Love lilac-pink (`#E78DC2`) through a motif palette
   adjustment, and every UI surface that tints by machine uses `machineTheme()` / `machineHue()` from
   `src/art/machines/theme.ts`, so they agree. Adopting `#E78DC2` as the catalog's `theme.body` would make
   the override unnecessary.
6. **Optional sfx: `'kachunk'`.** The crank's ka-chunk currently plays `sfx.play('ratchet', { pitch: 0.55, volume: 1 })`.
   A dedicated heavier mechanical clunk would sell the moment better. Other sounds used, with `pitch`/`volume`:
   `coin`, `ratchet` (pitch rises 1.0→1.35 over a turn, one click per 30° crossed), `thunk` (volume = bounce
   strength), `crack` (pitch 1.18/1.36/1.6 per tap), `pop`, `reveal-<rarity>`, `sparkle`, `chime`, `whoosh`, `undo`.
   Haptics used: `tick` (crank ticks), `light`, `medium`, `success`.

## Integration notes

- **Routing:** render `CapsulesScreen` for `#/capsules`. The screen pads for `safe-top` and adds bottom
  padding, but assumes the shell reserves room for the tab bar. The reveal card's "To the meadow" sets
  `location.hash = '#/meadow'`.
- **Reduced motion:** my JS animations (physics, WAAPI choreography, idle life) check, in order,
  `<html data-motion="reduced|full">`, then `settings.reduceMotion`, then the OS query, the same way
  `global.css` does. Please have the shell set `data-motion` from the setting so CSS and JS agree.
- **Layers:** sheets use `z-index: 60`, the reveal overlay `80` (both portaled to `<body>`). Please fit
  these into the shell's z-index scale (toasts should sit above 80). Page-scroll locking is ref-counted
  (`ui/scrollLock.ts`) because a wish reveal opens while its sheet is still closing.
- **Keyboard:** Space turns the crank while it's ready (only when focus isn't on a control and no
  `[aria-modal="true"]` is open), ←/→ move the carousel, Esc closes sheets and the reveal. During the
  capsule's anticipation, Esc skips straight to the result instead of closing (the item is already yours;
  closing unseen would throw the moment away); a second Esc closes. No conflict with `1`–`5` / `N`.
- **Local UI primitives to unify with the shared kit:** `src/features/capsules/ui/` has `CandyButton`
  (+ `Pill`, `cx`), `Sheet` (portal, focus trap, Esc, scrim, exit animation), `useFocusTrap` (never steals
  focus from a newer dialog; `returnFocus` fallback) and `scrollLock`.
- **Dev gallery CSS leak:** `.gal-section h2` (`src/dev/gallery.css`) restyles every `h2` inside a section,
  including headings of screens previewed there. My headings use double-class selectors to hold their
  look; scoping the rule to `.gal-section > h2` would fix it for every module.
- **Art from other modules:** the reveal and lineup render `CollectibleArt`, so wearable icons, treats,
  decor and plants show placeholder gift boxes until those modules merge.
- **Dev gallery:** `/gallery.html?only=capsules` (all), `?only=capsules-phone` (390×844 frame, seeds a
  500-coin / 20-star / 2-ticket wallet), `?only=capsules-desktop`, `?only=capsules-pull&machine=moo&coins=10&tickets=0&quick=1`
  (one interactive machine, edge cases via URL), `?only=capsules-reveal&reveal=ultra|rare|meet|…&stage=card&pay=ticket`.
  Viewing every section at once runs several copies of the Kitty machine on one shared pile, so use `only=`.
- **Performance:** each machine's resting pile is computed once per session and cached; only the visible
  machine runs physics, and its rAF loop stops as soon as the pile sleeps or the page is hidden. Nothing in
  a machine loops at rest: idle life (`src/art/machines/idleLife.ts`) plays one short beat every few
  seconds on the visible machine only (a blink, a tail flick, a twinkle), then the page is idle again. The
  Wishing Well builds its grid 24 tiles at a time as you scroll. The dome shows 20 capsules (bigger ones
  read better at phone size); the sim is tested with 24.

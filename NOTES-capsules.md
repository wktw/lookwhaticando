# Capsules module: notes for the lead

The capsules module is now the catkin counter: tabletop capsule cabinets, the lineup leaflets,
the pull with twist-to-open, the reveal card, Special Order and the swap shelf. I changed no file
outside my ownership. Requests for shared contracts and other modules are below.

## Contract requests

1. **Domain: `pull()` must be real** (`src/state/store.ts`). The stub returns
   `{ ok: false, error: 'machine-unavailable' }` for every pull, so the in-app cabinet always
   says "No. 01 · Cats is resting for now." The UI needs:
   - `{ ok: false, error }` for unaffordable pulls and missing tickets, and the ticket spent on
     `{ useTicket: true }`. The UI checks `machineStatus().canAfford` and `wallet.tickets` before
     the coin goes in, and still handles every `PullError` at the ka-chunk (the token comes back
     out with a kind notice).
   - `{ free: true }` for onboarding's first capsule: no charge, a guaranteed Classic or Special
     pet from that series, no pity advance (DESIGN §9.6).
   - `pendingReveal` committed inside `pull()`, and cleared by `finishReveal()`. The UI calls
     `finishReveal()` whenever a reveal closes, and on mount it resumes a `pendingReveal` for the
     cabinet on screen (commit before animate).
   - `PullResult.secret` and `machineId` filled in: the insert prints the series motif, and a
     Secret gets its three-twist opening, its sparkle and "The secret one!".
2. **Domain: `machineStatus(id).available` should honour season windows.** The screen already
   filters with `inSeason(machine, today)` (`src/features/capsules/season.ts`), so only the
   edition in season stands on the counter even with the stub.
3. **Domain: the Memories rule needs a record of visited seasons.** Special Order greys out a
   seasonal lineup until its season has visited, computed from `profile.createdAt` and `today`
   (`seasonHasVisited`). A domain field (for example `machineStatus().orderable` or a
   `seasonsSeen` list) would make this exact across time zones and imports, and `wish()` should
   return `season-not-visited` by the same rule. Until then, the profile's start day is keyed by
   the app day (`dayKeyOf(createdAt, settings.dayStartsAt)`), the same boundary as `today`.
4. **Icons: a stamp token.** Stamps (internally `stars`) are drawn with `StarIcon`, and swaps
   with `StardustIcon`, because those are the existing exports. DESIGN §6 draws a stamp as a
   loyalty-card stamp. If the icons module adds `StampIcon` / `SwapIcon`, swap the imports in
   `WalletStrip.tsx`, `SwapRing.tsx`, `SpecialOrder.tsx`, `RevealCard.tsx`, `MachineInfo.tsx`
   and `CapsuleMachine.tsx`. Meanwhile No. 07's price chip on the cabinet is drawn locally as an
   inked loyalty stamp (a scalloped disc with a paw knocked out, `CabinetArt.tsx`); when
   `StampIcon` lands, the cabinet chip can print it instead.
5. **Tokens (optional): darken three light-theme `-700`s** (`src/styles/tokens.css`). On their
   own 100 fills `sage-700` is 4.22:1, `butter-700` 4.09:1 and `blush-700` 4.32:1. My chips mix
   25% `--ink` into the 700 (`color-mix(in srgb, var(--x-700) 75%, var(--ink))`, checked in
   `contrast.test.ts`). Fixing the tokens would let every module drop the mix.
6. **Pets: an `aura` switch, or no aura at all** (`src/art/pets/PetArt.tsx`, `src/art/CollectibleArt.tsx`).
   `PetArt` draws `Aura` (a rainbow halo ring) and `Sparkles` (3–4 sparkles) unconditionally for
   Super rare and Secret pets. On the capsule surfaces that doubles up with the capsule module's
   own finish: DESIGN §10.4 allows a Rare+ reveal one foil glint and a Secret one sparkle, and
   the reveal card, the Lineup sheet and Special Order already print those. Please either remove
   `Aura` and `Sparkles` from the catkin pets, or add `aura?: boolean` (default true) to `PetArt`
   and pass it through `CollectibleArt`. Once the prop exists I'll pass `aura={false}` from
   `RevealCard.tsx`, `Leaflet.tsx` (`LeafletFull`) and `SpecialOrder.tsx`.
   Also: the capsule close-up prints the figure as a flat silhouette through the clear half by
   reprinting `CollectibleArt` in one ink (`capsule.css`, `.cap-figure`), and switches off the
   pets' `.is-silhouette` CSS `filter: brightness(0)`. If the pets module keeps a silhouette
   mode, flat fills rather than a filter would let me drop that override.
7. **Optional sfx: `'kachunk'`.** The handle's ka-chunk plays `sfx.play('ratchet', { pitch: 0.55,
   volume: 1 })`. Sounds used: `coin` (the token in the slot), `ratchet` (a tick per 30°, pitch
   rising over the turn), `thunk` (the capsule landing in the chute, volume = impact), `pop`
   (opening), `crack` (a Secret's seam, pitch rising per step), `reveal-<rarity>`, `sparkle`
   (the Secret only), `chime` (a name saved, a stamp made from swaps, an order placed), `whoosh`
   (sheets), `undo`. Haptics: `tick`, `light`, `medium`, `success`. No confetti: the reveal no
   longer calls `fx/confetti`.

## Integration notes

- **Routing:** `CapsulesScreen` for `#/capsules` (unchanged export). It now accepts optional
  `onPlace(itemId)` and `onLetThemChoose(itemId)` for the reveal card's "Find them a place" and
  "Let them choose". Without them, "Find them a place" closes the reveal and goes to `#/shelf`,
  and "Let them choose" just closes it. Wire them when the placement UI lands.
- **Onboarding:** `FirstPick` (also exported as `CatsOrCowsPick`) from
  `src/features/capsules/FirstPick.tsx` shows the two cabinets side by side; choosing one brings
  it forward for a free pull (`pull(id, { free: true })`). Props: `onDone(machineId)` after the
  reveal closes, plus `onPlace` / `onLetThemChoose`.
- **Light:** the art takes `light?: Light` (default `DAY_LIGHT`). The screen picks it in
  `sceneLight.ts`: the lamp (`NIGHT_LIGHT`) when the page is in Lamplight, otherwise
  `windowLight(now)` from `src/art/light.ts`, the same window as the sill, updated every
  15 minutes. If the shelf module publishes a shared scene-light signal, `useSceneLight()` is the
  one place to switch.
- **Crescents** are exact path data from each part's own constants, built by small pure
  functions in `src/art/machines/crescent.ts` (`band`, `moon`, `lowerMoon`) and memoised; nothing
  clips, masks or filters at render time (`art.test.tsx` checks). If you'd rather have literal
  committed strings, those functions can print them.
- **Reduced motion:** JS animation checks `<html data-motion>`, then `settings.reduceMotion`,
  then the OS. The window physics jumps straight to rest, the token and the capsule crossfade,
  and the reveal is a 200 ms fade on the static light pool. The shell should keep setting
  `data-motion` from the setting.
- **Keyboard:** the handle is a `role="slider"` (arrow keys step it round a ratchet click at a
  time; Enter, Space or End give a whole turn). Space anywhere turns it while it's ready (not
  inside a control or under an open dialog). ←/→ move the carousel except on the handle. In the
  reveal, the capsule is a button: tap, Enter or Space opens it, arrow keys twist it, and Esc
  during the anticipation opens it (the item is already yours); a second Esc closes.
- **Layers:** sheets `z-index: 60`, the reveal `80`, both portaled to `<body>`. Scroll locking is
  ref-counted (`ui/scrollLock.ts`).
- **Local UI primitives:** `src/features/capsules/ui/` has `PillButton` (alias `CandyButton`),
  printed tier chips (`Pill`), `Sheet` and `useFocusTrap`, restyled to the catkin kit (flat pill,
  1 px sink, 6% deepen, focus ring in `--focus`). They can move to `src/ui` at merge.
- **Art from other modules:** reveal cards, the Lineup sheet and Special Order render
  `CollectibleArt`, so pets, wearables, treats and decor show the pre-catkin art (and placeholder
  gift boxes) until those modules merge. Pets bring their own halo and sparkles today (request 6).
- **Gallery CSS leak:** `.gal-section h2` (`src/dev/gallery.css`) restyles every `h2` inside a
  section, including screens previewed there. My headings use doubled class selectors; scoping
  the rule to `.gal-section > h2` would fix it for every module.
- **Cabinet props added:** `price` (null hides the chip; `FirstPick` passes null, the first
  capsule being free) and `detail` (`'low'` below 90 px tall: body, plinth, motif, five big
  capsules, dial, slot and chute, no fine print).
- **Dev gallery:** `?only=capsules` shows everything; sections: `capsules-cabinets`
  (`&machine=cats`; window left, above, right, and the lamp), `capsules-small`, `capsules-sequence`, `capsules-capsule`, `capsules-cards`,
  `capsules-swap`, `capsules-leaflets`, `capsules-sheet-order`, `capsules-sheet-odds`,
  `capsules-sheet-lineup` (each sheet opens only under its own `only=`), `capsules-pull`
  (interactive, with a demo pull because the store's is a stub; `&machine=`, `&coins=`,
  `&tickets=`, `&pick=<item id>`, `&quick=1`), `capsules-reveal` (`&reveal=secret&stage=card`,
  `&cracks=2`, `&pay=ticket`, `&light=night`), `capsules-first`, `capsules-phone`,
  `capsules-desktop`.
- **Performance:** each series' resting pile is computed once and cached; only the cabinet on
  screen runs physics, and its rAF loop stops when the pile sleeps or the page hides. Capsules
  are `<symbol>` + `<use>` (three nodes each), moved by attribute writes, never Preact renders.
  The handle's angle and slider value are written straight to the DOM while it turns. Nothing in
  a cabinet loops at rest.

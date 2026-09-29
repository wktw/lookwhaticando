# Icons module: notes for the lead

Everything in this module was redrawn in the catkin language (flat, matte, no outlines, lit from the
window on the left, hard shade on the far side). Gallery: `/gallery.html?only=icons` (all sections), or
`icons-brand`, `icons-appicon`, `icons-splash`, `icons-install`, `icons-tabs`, `icons-currency`, `icons-pins`,
`icons-pinsizes`, `icons-habits`, `icons-habittones`, `icons-glyphs`. Add `&theme=night` for lamplight.

## API changes (all backwards compatible; old names kept)

- `@/art/icons`
  - New: `Wordmark` (lowercase Castoro "catkin" as real text, optional `sprig`, `size` in px, inherits `color`)
    and `CatkinSprig` (`size` = height, optional `light: Light` for the lamp side; colours follow the page theme
    by default).
  - New currency names: `StampIcon`, `SwapIcon` (`count` 0–10), `TicketIcon`, `CoinIcon`. `StarIcon` is an alias
    of `StampIcon`; `StardustIcon` still takes `level` (swaps / 10) and draws the swap ring. Prefer
    `<SwapIcon count={wallet.stardust % 10} />`. New export `STAMP_INK` (the stamp/swap lavender).
  - Currency tokens now default to `display: inline-block; vertical-align: -0.2em`, so `+5 {coin}` sits in running
    text. Flex/grid parents are unaffected; a `style` prop overrides it.
  - `IconName` gains: `tab-shelf` (`tab-meadow` kept as an alias), `chevron-up`, `export`, `import`, `watering-can`,
    `sprout`, `drop`, `lamp`, `hanger`, `bowl`, `frame`, `pot`, `book`, and aliases `magnifier` (search),
    `field-guide` (book), `rest` (moon), `tiny` (sprout). New export `ICON_ALIASES`.
  - Glyphs are now solid currentColor shapes with a soft second tone (`fill-opacity` 0.36); only thin things
    (arrows, chevrons, wires, sound waves) are strokes. The root `<svg>` sets `fill="currentColor"`.
- Tab icons: `<Icon name="tab-…" filled={active} />`.
  - Inactive is quiet: all currentColor (the shell's `--ink-2`), the body in the soft tone.
  - Active is filled in the accent family: the body `--blush-500` (`--blush-300` at night) and the structure
    `--blush-700` (tabs.module.css). Labels: keep `--ink` for the active label, `--ink-2` for the rest.
- `@/art/badges`: `BadgeMedal` now draws an enamel pin (alias `EnamelPin`). Same props. `compact` (default for
  numeric sizes ≤ 64) now only thickens the brass rim and lengthens the dashes. New exports `PLATES`,
  `PIN_PLATE`, `plateFor`. Unearned pins are outline-only (a dashed plate plus a thin emblem outline in
  `--ink-disabled`); please say "not yet" in the `title` or the caption next to them.
- `@/art/habit-icons`: same `HabitIcon` / `HABIT_ICON_ART` API. Renderers now also accept optional `light` (300)
  and `shade` tones; `habitIconColors(tone)` returns all five. The `sticker` prop is accepted but does nothing
  (there is no outline left to protect at night).
- `@/app/GumballArt`: now the small capsule cabinet mark (alias `CabinetMark`), same props.
- `@/app/AppIconArt`, `@/app/SplashArt`, `@/app/installArt`: same exports and props.
- Removed internal helpers nobody else imported: `src/art/icons/sticker.*`, `src/art/badges/medal.tsx`, and
  the Mochi palette exports (`COCOA`, `PASTEL`, `ACCENT`, `STICKER`, `HOLO`). The new palette is `FAMILY`,
  `MATERIAL`, `INK`, `SHADE_INK`, `mix`, `shadeOf` in `@/art/icons/palette`.

## Generated files

`npm run icons` (scripts/generate-icons.mjs) now shoots the stages in `src/dev/sections-icons.tsx`
(`icons-appicon&stage=…`, `icons-splash&splash=…`) instead of the fxui ones, and writes
`public/icons/favicon.svg` by serializing the real `AppIconArt` (no hand-kept copy). All icon PNGs, the
favicon, the inline favicon in `index.html` and all 22 launch images were regenerated. The startup-image list
in `index.html` is unchanged.

## Contract requests (files I do not own)

1. **App shell (`src/app/TabBar.tsx`, `src/app/Sidebar.tsx`)**: pass `filled={active}` to the tab `<Icon>`.
   The Sidebar brand lockup still shows `PetArt pet-mochi` and "Mochi Meadow"; replace it with
   `<Wordmark size={30} />` and an `aria-label` of "catkin, go to Today".
2. **`src/app/routes.ts`**: rename the tab to `{ id: 'shelf', label: 'Shelf', icon: 'tab-shelf' }` (DESIGN §4;
   `#/shelf`). `tab-meadow` keeps working until then.
3. **`src/app/InstallGuide.tsx` copy**: still says "Mochi Meadow" (steps, peek) and "a cozy spot in your Dock"
   ("cozy" is banned, §12), and gives the app a pronoun ("She opens in her own window"). Suggested:
   "catkin opens full-screen, works offline and gets its own icon." / "catkin gets its own window in your Dock."
4. **`src/dev/sections-fxui.tsx`**: its `fxui-appicon` / `fxui-splash` stages (`#mm-icon-stage`,
   `#mm-splash-stage`) are no longer used by the generator; they can go.
5. **`src/dev/gallery.tsx` and `gallery.html`**: the heading and title still read "Mochi Meadow · Art Gallery".
6. **`src/catalog/badges.ts`** (read-only for me): `emoji` is unused by the art now (every pin has a drawn
   emblem). Some names and descriptions predate catkin: "Meadow Museum", "Ooh, Shiny", "Turn the crank",
   "collection book", "machines". Worth a voice pass (§12).
7. **`docs/DESIGN.md`**: please record the tab states above, the pin treatment (brass rim, family-300 enamel,
   dashed "not yet"), the currency objects (brass coin with a sprig stamp, lavender inked stamp, 10-segment
   swap ring, blush ticket stub) and that habit icons are flat prints in five tones of one family.
8. **`src/ui/Sparkle.tsx`** (not mine) still exports the kawaii four-point sparkle used across the UI; the
   install art no longer uses it.

## Known gaps

- Crescents are hand-authored or computed offline and committed as path strings (the coin, moon,
  capsule, tag, catkin and the app icon's strips). The app icon's black cat gets its lavender rim light by
  layering its plum coat nudged away from the window over a lavender copy (no clip, mask or filter).
- The app icon's squircle variant clips with one static `clipPath` (the icon outline), as before.
- Habit icons are drawn for light-from-the-left only; they do not take a `light` prop (they are printed labels
  on a stake, not standing objects in the scene).

## Review fixes (round 1)

- **Shell (`src/app/TabBar.tsx`, `src/app/Sidebar.tsx`, not mine)**: `GumballArt` now takes an optional
  `light?: Light`. Without it the cabinet follows the page theme (its inks live in
  `src/art/icons/cabinet.module.css`), so nothing needs to change; pass `light` only to pin day or lamplight.
- The stamp is now a flat ink impression (no shade crescent); the catkin sprig's lit shapes are precomputed per
  light direction (`CATKIN_LIT.left | top | right`) in sprig space, from an offline generator (disc-intersection),
  and committed.
- `AppIconArt` has a `favicon` shape (cropped cat and pot on a deeper lavender tile, no beam or cast shadow);
  `scripts/generate-icons.mjs` serializes favicon.svg from it.

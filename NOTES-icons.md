# Icons module: notes for the lead

## API additions (all optional, stub APIs unchanged)

- `Icon`: new optional props `filled?: boolean` and `strokeWidth?: number` (default 2). New export
  `ICON_NAMES: IconName[]`.
  - The tab icons are two-state. Inactive (outline) is pure currentColor like every glyph. Active
    (`filled`) is a sticker: fixed brand pastels, one cocoa line and a cream die-cut edge
    (`#FFF9F2`). The edge is invisible on the light bars and makes the icon read on the night bar.
    It paints up to about 1 px outside the icon box, so the `<svg>` gets `overflow="visible"` while filled.
  - `heart` with `filled` becomes solid (for favorites). Every other glyph ignores `filled`.
  - Fine details scale with `strokeWidth`, so `strokeWidth={2.25}` stays even.
  - No element ids anywhere, so `Icon` is safe to render hundreds of times per page.
- `StardustIcon`: new optional `level?: number` (0..1, default 0.7). Wire it as
  `level={wallet.stardust / 10}`. Any non-zero level shows at least a 15% layer, so one stardust
  never looks like an empty jar. The stub's doc comment called this prop `fill`, but the brief says
  `level`, so I used `level`. No `fill` prop was ever typed, so nothing breaks.
- New type exports: `CurrencyIconProps` (unchanged) and `StardustIconProps`.
- `HabitIcon`: `tone` defaults to `'blush'`. Unknown ids fall back to the sparkle. New optional
  `sticker?: boolean`:
  - By default the icon gets a cream die-cut sticker edge **at night only**. This is driven by CSS
    (`[data-theme='night']` on any ancestor, or the OS dark scheme unless the root is
    `data-theme='light'`), so the cocoa line reads on dark chips.
  - `sticker` shows the edge always. `sticker={false}` leaves it out of the DOM, for example on a
    photo-mode export with a known light background.
  - New export `habitIconColors(tone)` returns `{ fill, soft, ink }`, for code that calls
    `HABIT_ICON_ART[id]` directly. Every renderer is self-contained (it carries its own outline
    style). Prefer `HabitIcon` in UI, because the raw renderers have no night edge.
- `BadgeMedal`: new optional `class`, `style` and `compact`.
  - `compact` defaults to on for numeric sizes ≤ 64 px. It gives a 1.26× emblem, 14 bolder scallops,
    no inner band, shorter ribbons, a larger lock and no decorative sparkles, which is what a shelf
    or grid needs.
  - Locked medals use the soft lavender-grey `LOCKED` swatches plus a heart lock. At night,
    `badge.module.css` repaints the same swatches in deep lavenders with a light line. Opacity is
    not dimmed. Unknown badge ids still render, with a sparkle emblem.
- Shared helpers anyone may import:
  - `@/art/icons/shapes`: `starPath`, `scallopPath`, `cogPath`, `flowerPath`, `sparklePath`,
    `heartPath`, `crescentPath`, and `memo` (a cache for builders called from render).
  - `@/art/icons/palette`: `COCOA`, `PASTEL[key][100|300|500|700]` (light hexes), `ACCENT`, `STICKER`
    and `HOLO` (the ultra gradient stops).
  - `@/art/icons/sticker`: `StickerBacking`, the die-cut edge used by the tabs and habit icons.
    Other art can reuse it. Pass a fresh copy of the drawing as its children.

## Integration suggestions (for the app shell / fxui module)

- **Tab bar:** use `<Icon name="tab-today" filled={active} size={26–28} />`.
  - Inactive: `color: var(--ink-2)` for both the icon and the label. That is 5.5:1 on the light card
    and about 7:1 on the night card, so it meets AA for 11 px labels.
  - Active: `color: var(--ink)` for the label, and pass `filled`. The icon brings its own colors.
  - Do **not** use `--ink-3` for labels. It is 2.4:1 in light and 3.5:1 at night.
- **Streak glyph:** `<Icon name="streak" size={15} style={{ color: 'var(--peach-700)' }} />` sits
  well inline with 13–14 px text. `--peach-700` is 4.6:1 on white and flips to a light peach at
  night. Don't use peach-500, which is 2:1. The streak glyph is an 8-petal daisy head. The You tab is
  a tulip with a face and the gear is a real cog, so the three never read alike.
- **Icon-only buttons:** give the `<button>` the `aria-label` and keep the icon decorative (no
  `title`). A `title` makes the icon itself `role="img"`.
- **Habit chips:** put a `var(--<tone>-100)` rounded square behind `HabitIcon` at 34–40 px. At night
  the sticker edge takes care of contrast. See `icons-context` with `&theme=night`.
- **Gallery:** add `&theme=night` to any `?only=icons…` URL for the real night tokens. Dark panels
  inside the light gallery carry `data-theme="night"`, so theme-aware art shows its night look there too.

## Contract observations / requests

1. `BadgeDef.emoji` (catalog/badges.ts) is no longer used by the art, because every badge now has a
   custom SVG emblem. Keep it for copy if you like, or drop it in a later contract pass.
2. Please document these in DESIGN.md (§9 / §10.4) so other modules match:
   - the tab-icon active state (outline → cocoa-lined pastel sticker with a cream edge);
   - the night sticker edge on habit icons;
   - the locked-badge treatment (lavender-grey by day, deep lavender with a light line at night).
3. `useId` is used only by `StardustIcon` (jar clip) and `BadgeMedal` (the Ultra Lucky holo gradient).
   It is unique only within one Preact render root. Those defs have identical content per instance,
   so id collisions across separate roots are harmless. Worth knowing if anyone renders medals
   through a second `render()` (e.g. photo mode).

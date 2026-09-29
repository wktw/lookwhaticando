# Icons module: notes for the lead

## API additions (all optional, stub APIs unchanged)

- `Icon`: new optional props `filled?: boolean` and `strokeWidth?: number` (default 2). New export
  `ICON_NAMES: IconName[]`.
  - The tab icons are two-state. Outline is currentColor like every glyph. `filled` blooms into fixed
    brand pastels while the outline stays currentColor.
  - `heart` with `filled` becomes solid (for favorites). Every other glyph ignores `filled`.
- `StardustIcon`: new optional `level?: number` (0..1, default 0.7). Wire it as
  `level={wallet.stardust / 10}`. The stub's doc comment called this prop `fill`, but the brief says
  `level`, so I used `level`. No `fill` prop was ever typed, so nothing breaks.
- New type exports: `CurrencyIconProps` (unchanged) and `StardustIconProps`.
- `HabitIcon` (props unchanged): `tone` defaults to `'blush'`. Unknown ids fall back to the sparkle.
  New export `habitIconColors(tone)` returns `{ fill, soft, ink }`, for pickers that call
  `HABIT_ICON_ART[id]` directly. Every renderer in `HABIT_ICON_ART` is self-contained: it carries
  its own outline style, so it can be dropped into any 32×32 `<svg>`.
- `BadgeMedal`: new optional `class` and `style`. Unknown badge ids still render, with a sparkle
  emblem. Locked medals use a muted palette plus a heart lock. In night theme they are dimmed to
  66% opacity via `badge.module.css`, so they don't glow like silver next to earned ones.
- Shared helpers anyone may import:
  - `@/art/icons/shapes`: `starPath`, `scallopPath`, `flowerPath`, `sparklePath`, `heartPath`,
    `crescentPath`. Each returns path data; memoize at module level.
  - `@/art/icons/palette`: `COCOA`, `PASTEL[key][100|300|500|700]` (light hexes) and `ACCENT`.

## Integration suggestions (for the app shell / fxui module)

- **Tab bar:** use `<Icon name="tab-today" filled={active} size={26–28} />`. Set
  `color: var(--ink-3)` when inactive and `color: var(--ink)` when active. At night the active icon
  reads as a die-cut sticker (light outline, pastel fill). The label color can follow the same rule.
- **Streak glyph:** `<Icon name="streak" size={15} style={{ color: 'var(--peach-500)' }} />` sits
  well inline with 13–14 px text (see the gallery section `icons-context`).
- **Icon-only buttons:** give the `<button>` the `aria-label` and keep the icon decorative (no
  `title`). A `title` makes the icon itself `role="img"`.
- **Habit chips:** a `var(--<tone>-100)` rounded square behind `HabitIcon` at 34–40 px looks lovely
  in both themes (see `icons-context`).

## Contract observations / requests

1. `BadgeDef.emoji` (catalog/badges.ts) is no longer used by the art, because every badge now has a
   custom SVG emblem. Keep it for copy if you like, or drop it in a later contract pass.
2. DESIGN.md §9 / §4 could document the tab-icon active state ("outline → full-color sticker") and
   the lock treatment for unearned badges, so other modules match them.
3. `useId` is unique only within one Preact render root. The masks, clipPaths and gradients in these
   icons have identical content per instance, so id collisions across separate roots are harmless.
   Worth knowing if anyone renders medals through a second `render()` (e.g. photo mode).

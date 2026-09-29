# items: notes and requests for the lead

Branch `catkin/items`. Everything here is outside the items module's ownership, so it is a request, not a change.

## What the Shelf can rely on (decor contract, `src/art/scene/decor/index.ts`)

- `DecorEntry` is exactly `{ art, size, bounds, deep, flat?, glow?, hang? }`. Only the 43 catalog decor ids are in
  `DECOR_ENTRIES` (`decor.test.ts` enforces it).
- `art(opts?: { night?, light?, line? })` draws on the 100×100 canvas.
  - Standing decor rests on **y = 92** and draws **its own flat contact shadow**, slid away from the light. Please don't
    add a second one under decor. A longer cast shadow in the sunbeam is still the scene's job.
  - Hanging decor (`hang: 'window'`: window hammock, moon night-light, paper star) meets the frame at the **top of its
    canvas**. Its strings and suction cups start at y ≈ 0.6.
  - `night` defaults to `light.night`, and `light` defaults to `DAY_LIGHT` (or `NIGHT_LIGHT` when `night` is set). Pass
    the scene's `Light` so crescents sit on the side away from the window or lamp.
  - `line` scales only the genuinely thin things (string, twine, spokes, seams). `PET_UNITS / size` keeps them the
    same width as the pets' whiskers.
- `glow: [cx, cy, r]` marks the six light sources (jam jar, reading lamp, moon night-light, jack-o'-lantern, paper star,
  Tiny Cake). By night their art already glows warm with a small radial halo, so `glow` is only for the scene's own
  lamp pool on the sill.
- `bounds` are measured from the rendered art, within 3 units (a test keeps them honest). `size` keeps real proportions
  against a 16-unit sitting cat. See the `items-shelf` gallery section.

## Requests

1. **`src/art/scene/scene.test.ts` (shelf).** On this branch three Meadow-era tests fail by design, because the
   Meadow-only decor and the `sky` field are gone:
   - `decor art > has art, bounds and a footprint…`, which checks `entry.sky` for sky-slot items;
   - `decor art > draws big things bigger…`, which uses `decor-little-barn`, `decor-cherry-tree` and similar ids;
   - `ground rects for the pets map > covers an item's base…`, which uses `decor-little-barn`, `decor-picnic-blanket`
     and `decor-rainbow`.

   The shelf rewrite deletes them. The catalog contract is replicated in `src/art/scene/decor/decor.test.ts`.
2. **`MeadowLegacy` in `decor/index.ts`.** `DECOR_ENTRIES` is typed `DecorEntry & MeadowLegacy`, where `MeadowLegacy`
   has the optional, never-set `sky` and `tied` fields. The only reason is that `MeadowScene.tsx` and `placement.ts` still
   read them, and tsc would fail without them. Once the shelf module has deleted the Meadow, please drop the intersection
   and the interface. The change is three lines.
3. **`Paint.ink` in `decor/kit.tsx`** is a deprecated Meadow-era outline preset. It is kept only because
   `scene.test.ts` reads `paint({ line: 0.5 }).ink['stroke-width']`, and no art uses it. Please remove it with that test.
4. **Tokens (`tokens.css`).** Lamplight art uses the night values of `--shade` and `--contact`
   (`rgba(10, 8, 22, 0.3)` and a matching contact ink), hard-coded in `kit.tsx`. This keeps a night scene correct while
   the UI theme is light. If you'd rather keep them in tokens, please add `--shade-lamp` and `--contact-lamp`, and I'll
   switch `SHADE_NIGHT` and `CONTACT_NIGHT` to `var()`. By day the art uses `var(--shade)` and `var(--contact)`.
5. **Test dependency.** `decor.test.ts` and `items.test.tsx` import `artBounds` from
   `src/art/plants/svgBounds.testutil.ts` (plants). Please keep it, or move it to a shared test helper.
6. **`plants.test.tsx` "treat art" block (plants).** The plants brief deletes it, and `items.test.tsx` covers the same
   ground and more. It passes on this branch either way.
7. **`sections-garden.tsx` TreatsDemo (garden).** It still shows treats in the old gallery. The `items-treats` and
   `items-treats-light` sections replace it, so it can go.
8. **`CollectibleArt` (unowned).** It calls `TREAT_ART[id]()` and `DECOR_ART[id]()` with no light, which is fine and
   draws day art. Where the Field Guide or pantry sits in Lamplight, it can pass `{ light: NIGHT_LIGHT }`: both
   renderers accept `(opts?: { light?: Light })`.

## Crescents are precomputed

`src/art/scene/decor/shade.gen.ts` holds every shape's crescent for light from the left, top and right, the lamp-side rim
for dark shapes, and trimmed stripe patches. It is generated offline with paper.js Bézier booleans (no runtime clip math),
about 168 KB raw and 54 KB gzipped. After changing any shape, rebuild it:

```
npm i --prefix /tmp/paper paper@0.12
PAPER_DIR=/tmp/paper npx vite-node src/art/scene/decor/tools/build-shade.mjs
```

`decor.test.ts` fails with the stale shape ids if anyone forgets. If the bundle ever matters, the table and the decor
art can be split into their own chunk with the Shelf.

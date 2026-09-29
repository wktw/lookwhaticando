# Pets module notes (catkin restyle, for the lead)

Everything under `src/art/pets/**` and `src/art/wearables/**` was redrawn in the catkin art language (DESIGN §10.4):
flat, matte, outline-free shapes lit by one window, with precomputed hard shade crescents. The Mochi-era aura, face,
bits, traits, patterns, placement and outline modules are gone.

## Public API (all existing exports kept)

* `PetArt` keeps every old prop (`petId`, `outfit`, `expression`, `animated`, `size`, `facing`, `silhouette`, `shadow`,
  `title`, `class`, `style`, `look`) and adds:
  * `pose?: 'sit' | 'loaf' | 'stand' | 'walk' | 'sleep'` (default `sit`);
  * `light?: Light` from `@/art/light` (default: the window from the left, by day);
  * `muted?: boolean` for the Field Guide's "not yet" (a precomputed 35% saturation palette, no filter);
  * `px?: number`, the pixel size when `size` is a CSS string, so the size floors still apply;
  * `fit?: boolean`, tile mode: the pet fills the frame (about 80% of the height or 88% of the width) instead of
    keeping its true size next to other species. Use it for Field Guide tiles, reveals and inventory; leave it off
    where pets share a scene (the sill, places), which keeps a hamster tiny next to a cow.
* Size floors: ≤ 32 px draws the loaf with closed eyes, ≤ 20 px a dedicated three-shape sprite, and a sleeping pet
  under 48 px loafs with closed eyes (a curl reads as a blob). `tierFor(px)` is exported.
* `Expression` keeps the old values as aliases: `idle`→`rest`, `love`→`happy`, `eat`→`chew`, `wink`→`blink`.
  `canonicalExpression()`, `EXPRESSIONS`, `POSES` and `Pose` are exported from `types.ts`.
* `LOOKS`, `getLook()` (including `moonlit:<petId>`), `SPECIES_ART`, `PLACEHOLDER_SPECIES` and `WEARABLE_ART` keep
  their names. Every wearable still has `icon(): JSX.Element` drawn on a 100×100 canvas.
* `geometry.ts` now only holds the legacy `OUTLINE`, `STROKE`, `BLUSH`, `EYE` constants that plants, items and scene
  still import. Please drop those imports as those modules are restyled; nothing in pets uses them.

## Behaviour other modules can rely on

* The svg carries `data-pose` and `data-tier` (`micro` | `small` | `medium` | `full`).
* Idle life (`animated`) is CSS only: breathing ≤ 1.5%, a blink every 4–9 s desynchronised per pet id, a cat's tail
  flick, a cow's ear flick, a frog's throat pulse, and per-species walk rhythms (a cow's 1-unit bob, a duck's waddle, a
  cat's two-stage hop) over two alternating leg key frames. Under `[data-motion='reduced']` or
  `prefers-reduced-motion` only breathing and blinks remain.
* Breathing is a CSS transform on the `<svg class="pet-art">` itself (so WebKit composites it instead of repainting
  the SVG every frame). To animate a whole pet (a hop, a carry), transform a wrapper element, not the `<svg>` or
  the inner `.pet-*` groups.
* A still `blink` holds the slow blink; animated, the slow blink plays once every 8 s (400 ms close, hold, 400 ms open).
* Night (`light.night`): lit surfaces warm slightly toward `--lamp`, and dark coats get a rim on the lamp side.
  Crescents use `var(--shade)`, contact shadows `var(--contact)`, silhouettes `var(--ink-disabled)`.
* Crescents (and the pale chest marking and a cat's split tail) are generated offline from the rigs into
  `crescents/data.ts` (`npx vite-node src/art/pets/crescents/write.ts`); a unit test fails if a rig changes without
  regenerating. The data ships as one JSON string (about 120 KB, 35 KB gzipped). It is not split by species: any
  PetArt can draw any species at run time, so a split could not be tree-shaken, only lazily loaded, and the art must
  render synchronously.

## Requests (files I do not own)

1. `src/dev/gallery.tsx`: the page heading still reads "Mochi Meadow · Art Gallery". Suggest "catkin · art gallery".
2. `src/art/CollectibleArt.tsx` (and any Field Guide tile, reveal or inventory tile): pass `fit` so small species
   (hamsters, frogs, call ducks) fill the tile instead of standing as specks at world scale; pass `muted` for
   unowned pets instead of a CSS filter, and `silhouette` for Secrets. Pets on cards at 20–32 px should pass a
   numeric `size` (or `px`) so the size floors apply.
3. Scene and Today band owners: pass the shared `light` (`windowLight(...)`) and a `pose` to `PetArt` so the crescents
   agree with the sunbeam; the style frames use `loaf` on pot rims and `sleep` at night.
4. Plants, items and scene: drop the legacy `OUTLINE` / `STROKE` / `BLUSH` / `EYE` imports from `@/art/pets/geometry`
   when you restyle, so the file can be deleted.
5. The pets brief mentions 95 catalog pets; the catalog currently has 88, and every one of them has a look.
6. `src/styles/tokens.css`: the Lamplight tokens are scoped to `:root[data-theme='night']` only. Please also match a
   nested `[data-theme='night']` (at least for the art tokens `--shade`, `--contact`, `--card`, `--lamp`), so a
   night card inside a day page (the gallery's day/night comparisons, a night preview card) picks them up. The pets
   gallery marks its night cells with `data-theme="night"` and mirrors the values inline until then.

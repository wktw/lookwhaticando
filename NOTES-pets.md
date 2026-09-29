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
  * `px?: number`, the pixel size when `size` is a CSS string, so the size floors still apply.
* Size floors: ≤ 32 px draws the loaf with closed eyes, ≤ 20 px a dedicated three-shape sprite. `tierFor(px)` is exported.
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
* A still `blink` holds the slow blink half-closed; with `animated` it plays 400 ms close, hold, 400 ms open.
* To animate a whole pet (a hop, a carry), transform the `<svg>` or a wrapper, never the inner `.pet-*` groups.
* Night (`light.night`): lit surfaces warm slightly toward `--lamp`, and dark coats get a rim on the lamp side.
  Crescents use `var(--shade)`, contact shadows `var(--contact)`, silhouettes `var(--ink-disabled)`.
* Crescents are generated offline from the rigs into `crescents/data.ts`
  (`npx vite-node src/art/pets/crescents/write.ts`); a unit test fails if a rig changes without regenerating.

## Requests (files I do not own)

1. `src/dev/gallery.tsx`: the page heading still reads "Mochi Meadow · Art Gallery". Suggest "catkin · art gallery".
2. `src/art/CollectibleArt.tsx` (and any Field Guide tile): pass `muted` for unowned pets instead of a CSS filter,
   and `silhouette` for Secrets. Pets on cards at 20–32 px should pass a numeric `size` (or `px`) so the size floors
   apply.
3. Scene and Today band owners: pass the shared `light` (`windowLight(...)`) and a `pose` to `PetArt` so the crescents
   agree with the sunbeam; the style frames use `loaf` on pot rims and `sleep` at night.
4. Plants, items and scene: drop the legacy `OUTLINE` / `STROKE` / `BLUSH` / `EYE` imports from `@/art/pets/geometry`
   when you restyle, so the file can be deleted.
5. The pets brief mentions 95 catalog pets; the catalog currently has 88, and every one of them has a look.

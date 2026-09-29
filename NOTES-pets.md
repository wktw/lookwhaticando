# Pets module notes (for the lead)

## Contract changes (all additive, nothing existing changed)

`PetArt` props are unchanged. The following were added in files I own:

* `geometry.ts`
  * `BODIES` now holds a distinct silhouette per species. The cat is still exactly `BODY_PATH`. Each
    half-width table was sampled from its path's Béziers, and a unit test checks that they match.
  * `ANCHORS` has been measured per species.
  * `Anchors.cheeks?` sets the blush position, size and (optionally) `opacity`. Frogs use 0.85 so the
    blush reads pink on green.
  * `Anchors.crown?` is the top of the ear tips and horns, so a halo floats above them.
  * `Anchors.chin?` is the lowest point of the face (muzzle, bill). Bibs, lapels and straps start below it.
  * `Anchors.clip?` is where a hair clip or bow sits when the head top is not the right spot (the top of a
    frog's eye bump).
  * The frog now has `headWearBehindFeatures: true` and a new head anchor (y 30, width 36). Its eye bumps
    (with the eyes) render through the `ears` slot, so hats sit full size behind the eyes, as they do
    behind bunny ears.
  * `BodyShape.sheen?` is the top-left highlight for each silhouette.
* `types.ts`
  * `SpeciesArt`: optional `tail`, `ears` and `feet` slots. `ears` render behind the body, or in front
    of hats when `headWearBehindFeatures` is set.
  * `TraitArt`: optional `surface` (clipped to the body), `body` (reshapes the silhouette), `replaces`
    (hides the species' tail, ears, feet or mouth), `occupies` (the trait steps aside when real wear
    fills that slot, e.g. the Frog Prince's crown under a witch hat, or Jack-o'-Kitty climbing out of her
    pumpkin to wear clothes) and `mouth` (replaces the species' mouth for an expression; it returns null
    to keep the species' own mouth). A trait that occupies the head is layered exactly like a hat.
  * `WearableArt`: optional `overEars` (bows, clips and wreaths sit in front of bunny ears and cow
    horns; it can also be a function of the ctx), `behind` (unclipped layer behind the pet, used for the
    backpack, the earmuff band and the Evergreen Crown's glow) and `over` (unclipped layer over the body,
    used for the duck floatie).
  * `PetLook.idleEyes?: 'drowsy' | 'happy'` sets the resting eyes: Sleepy Bear is drowsy, and the
    Samoyed smiles her eyes shut.
  * `ArtCtx.hidden?` lists the species parts that a trait has replaced.
  * `PetPalette.iris?` and `ink?` keep eyes and mouths readable on dark coats (Black Cat, Witchy Cat).
  * New pattern ids: `spots`, `urajiro`, `raindrops`, `snowflakes`, `mallard`.
  * New trait ids:
    * dog styles: `pointy-ears`, `floppy-ears`, `bat-ears`, `fluffy`, `curly-tail`
    * others: `witch-hat`, `red-nose`, `forelock`, `starfish`, `rose`, `nori`, `moonlit`,
      `long-horns` (the Highland Cow)
  * Each new id is documented inline.
* `looks.ts`
  * `auraOf(look, petId)` gives every ultra the holo aura automatically, so the domain v2 rarity
    re-tiering needs no art change. Glow (Golden Mochi), ghost (Boo-vine) and a few hand-picked rare
    sparkles still come from the look.
  * `getLook('moonlit:<petId>')` already draws the Moonlit variants from DESIGN §13.6 (on the domain
    branch). Every fur part gets the same pale periwinkle wash, with a soft moonlight gradient and star
    speckles. After merging, the local `MOONLIT` constant can import `MOONLIT_PREFIX` from the catalog
    instead.
* `pet.css`
  * The svg carries a `species-<id>` class.
  * `.pet-idle` wraps `.pet-breathe` for the species idles (the bear sways, the duck bobs).
  * Callers that animate a whole pet (a hop, the meadow walk) should transform the `<svg>` or a
    wrapper, never `.pet-idle` or `.pet-breathe`.
  * The `drop-shadow` filters on auras were replaced by gradient halos drawn in the SVG, which are
    cheaper on iPhone. Ultras also get a thin pastel rainbow ring that slowly turns (a transform).
  * In Moonlight Meadow (`data-theme="night"`, or the OS dark setting with no `data-theme`), a static
    pale rim (`.pet-rim`) outlines the body, ears, tails and feet so the cocoa silhouette reads on the
    night cards. By day these paths have no stroke.
  * Boo-vine's translucency is set on the `<svg>` box, not on the animated group.
  * Reduced motion (the OS setting or `data-motion="reduced"`) stops every pet animation.
* `wearables/kit.tsx`: icons that need ids (clip paths, gradients) render as small components using
  `useId`, so the same icon can appear twice on a page. The `icon: () => JSX.Element` contract is
  unchanged.

## Requests (files I don't own)

1. `src/dev/sections.tsx`: please delete the legacy `pets` and `wearables` sections. `sections-pets.tsx`
   replaces them, and the old wearables section leaves out dogs.
2. `docs/DESIGN.md` §10.4: the sentence saying species identity comes "not from body shape" contradicts
   §13.1 now that each species has its own silhouette. Suggest rewording it to "within the mochi family".
3. `src/art/CollectibleArt.tsx`: nothing is needed. Wearable icons come from `WEARABLE_ART[id].icon`, and
   every wearable now has one.

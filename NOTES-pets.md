# Pets module notes (for the lead)

## Contract changes (all additive, nothing existing changed)

`PetArt` props are unchanged. The following were added in files I own:

* `geometry.ts`
  * `BODIES` now holds a distinct silhouette per species. The cat is still exactly `BODY_PATH`. Each
    half-width table was sampled from its path's Béziers, and a unit test checks that they match.
  * `ANCHORS` has been measured per species.
  * `Anchors.cheeks?` sets the blush position and size.
  * `Anchors.crown?` is the top of the ear tips and horns, so a halo floats above them.
  * `BodyShape.sheen?` is the top-left highlight for each silhouette.
* `types.ts`
  * `SpeciesArt`: optional `tail`, `ears` and `feet` slots. `ears` render behind the body, or in front
    of hats when `headWearBehindFeatures` is set.
  * `TraitArt`: optional `surface` (clipped to the body), `body` (reshapes the silhouette), `replaces`
    (hides the species' tail, ears, feet or mouth) and `occupies` (the trait steps aside when real wear
    fills that slot, e.g. the Frog Prince's crown under a witch hat).
  * `WearableArt`: optional `overEars` (bows, clips and wreaths sit in front of bunny ears and cow
    horns), `behind` (unclipped layer behind the pet, used for hoods and the backpack) and `over`
    (unclipped layer over the body, used for the duck floatie).
  * `ArtCtx.hidden?` lists the species parts that a trait has replaced.
  * `PetPalette.iris?` and `ink?` keep eyes and mouths readable on dark coats (Black Cat, Witchy Cat).
  * New pattern ids: `spots`, `urajiro`, `raindrops`, `snowflakes`, `mallard`.
  * New trait ids:
    * dog styles: `pointy-ears`, `floppy-ears`, `bat-ears`, `fluffy`, `curly-tail`
    * others: `witch-hat`, `red-nose`, `forelock`, `starfish`, `rose`, `nori`, `moonlit`
  * Each new id is documented inline.
* `looks.ts`
  * `auraOf(look, petId)` gives every ultra the holo aura automatically, so the domain v2 rarity
    re-tiering needs no art change. Glow (Golden Mochi), ghost (Boo-vine) and a few hand-picked rare
    sparkles still come from the look.
  * `getLook('moonlit:<petId>')` already draws the Moonlit variants from DESIGN §13.6 (on the domain
    branch). They use a night palette with a moonlight wash and star speckles. After merging, the local
    `MOONLIT` constant can import `MOONLIT_PREFIX` from the catalog instead.
* `pet.css`
  * The svg carries a `species-<id>` class.
  * `.pet-idle` wraps `.pet-breathe` for the species idles (the bear sways, the duck bobs).
  * Callers that animate a whole pet (a hop, the meadow walk) should transform the `<svg>` or a
    wrapper, never `.pet-idle` or `.pet-breathe`.
  * The `drop-shadow` filters on auras were replaced by gradient halos drawn in the SVG, which are
    cheaper on iPhone.
  * Reduced motion (the OS setting or `data-motion="reduced"`) stops every pet animation.

## Requests (files I don't own)

1. `src/dev/sections.tsx`: please delete the legacy `pets` and `wearables` sections. `sections-pets.tsx`
   replaces them, and the old wearables section leaves out dogs.
2. `docs/DESIGN.md` §10.4: the sentence saying species identity comes "not from body shape" contradicts
   §13.1 now that each species has its own silhouette. Suggest rewording it to "within the mochi family".
3. `src/art/CollectibleArt.tsx`: nothing is needed. Wearable icons come from `WEARABLE_ART[id].icon`, and
   every wearable now has one.

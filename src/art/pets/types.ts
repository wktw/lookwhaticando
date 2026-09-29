import type { JSX } from 'preact';
import type { Species, WearableSlot } from '@/catalog/types';
import type { Anchors, BodyShape } from './geometry';

export type Expression = 'idle' | 'happy' | 'sleep' | 'love' | 'eat' | 'surprised' | 'wink';

/** Body-clipped surface patterns. Species art may add more; keep names descriptive. */
export type PatternId =
  | 'none'
  | 'tabby'
  | 'calico'
  | 'tuxedo'
  | 'siamese'
  | 'cow'
  | 'cow-hearts'
  | 'cow-moons'
  | 'cow-stars'
  | 'sprinkles'
  | 'seeds'
  | 'petals'
  | 'stars'
  | 'hearts'
  | 'panda'
  | 'socks'
  | 'patch'
  | 'stripes'
  | 'candy-stripes'
  | 'melon'
  | 'rainbow'
  | 'nebula'
  | 'icing'
  | 'belly-only'
  // Added by the pets module:
  | 'spots' // small round dalmatian spots
  | 'urajiro' // shiba cream cheeks, brows and chest
  | 'raindrops'
  | 'snowflakes'
  | 'mallard'; // green hood with a white neck ring

/** Extra built-in features that are part of a variant (not removable like wearables). */
export type TraitId =
  | 'sprout' // Mochi's two-leaf sprout
  | 'golden' // shimmer + tiny crown sparkle (Golden Mochi)
  | 'strawberry-cap' // leafy strawberry calyx on head
  | 'lucky-paw' // raised paw + koban coin (Lucky Cat)
  | 'mushroom-cap'
  | 'crown' // tiny gold crown (Frog Prince)
  | 'frosting' // frosting swirl + cherry (Cupcake Bear)
  | 'lilypad-hat'
  | 'acorn-cap'
  | 'ghost-sheet' // Boo Bunny
  | 'pumpkin-shell' // Jack-o'-Kitty sits in a pumpkin
  | 'ghost-tail' // Boo-vine: wispy ghost bottom, translucent
  | 'antlers' // Reindeer Cow (+ red nose via palette)
  | 'ribbon' // Jingle Cat ribbon bow
  | 'wings' // Cupid Kitty
  | 'heart-hold' // Hug Bear holds a heart
  | 'bangs' // Highland Cow fluffy fringe over eyes
  | 'lop-ears' // Lop Bunny
  | 'mermaid-tail'
  | 'sailor-collar'
  | 'flower' // flower behind ear (Sakura variants)
  | 'nightcap'
  | 'halo-glow'
  | 'cloud-fluff' // puffy cloud outline bumps (Cloud Kitty)
  | 'kissy' // puckered lips (Kissy Frog)
  | 'rainbow-belly'
  | 'daifuku-bean' // red bean dot + extra round (Daifuku Hamster)
  | 'cheeks' // hamster cheek pouches (default for hamsters)
  | 'gingerbread'
  // Added by the pets module. Dog ear/tail styles are read by the dog species art (default: floppy ears, wag tail).
  | 'pointy-ears' // shiba, corgi
  | 'floppy-ears' // golden, dachshund, dalmatian
  | 'bat-ears' // frenchie
  | 'fluffy' // pom, samoyed: scalloped fluffy outline + chest ruff, ears peek out of the fluff
  | 'curly-tail' // shiba, pom, samoyed
  | 'witch-hat' // Witchy Cat's tiny crooked hat
  | 'red-nose' // Reindeer Cow's shiny nose
  | 'forelock' // cow hair tuft between the horns
  | 'starfish' // Sandy Cat's hair accessory
  | 'rose' // Rose Bunny's rose, tucked by the ear
  | 'nori' // onigiri seaweed wrap (Snowball Hamster)
  | 'moonlit'; // star speckles of the code-drawn Moonlit variants (DESIGN §13.6)

export interface PetPalette {
  body: string;
  /** Belly/muzzle patch color (optional). */
  belly?: string;
  /** Inner ear. */
  earInner: string;
  /** Outer ear override (e.g. siamese points). Defaults to body. */
  ear?: string;
  /** Primary pattern color. */
  pattern?: string;
  /** Secondary pattern color (calico third color, etc.). */
  pattern2?: string;
  nose: string;
  /** Cow/bear muzzle. */
  muzzle?: string;
  /** Feet override (tuxedo socks, siamese points). Defaults to body. */
  feet?: string;
  /** Tail override. Defaults to body. */
  tail?: string;
  /** Horns (cow), beak (duck), antlers. */
  accent?: string;
  /** Eye color override (defaults to EYE cocoa). With `iris`, this is the pupil. */
  eye?: string;
  /** Colored irises (e.g. a black cat's golden eyes): open eyes get an iris with a pupil. */
  iris?: string;
  /** Face line color (closed eyes, mouth) for dark fur, where cocoa lines would vanish. */
  ink?: string;
}

export interface PetLook {
  species: Species;
  palette: PetPalette;
  pattern: PatternId;
  traits?: TraitId[];
  /** Special presentation for rare/ultra variants. */
  aura?: 'sparkle' | 'holo' | 'glow' | 'ghost';
}

/** Rendering context passed to species/pattern/trait/wearable renderers. */
export interface ArtCtx {
  /** Unique id prefix for this SVG instance (clipPaths, gradients). */
  uid: string;
  /** url(#…) reference to the body clip path. */
  bodyClip: string;
  expression: Expression;
  anchors: Anchors;
  /** This species' silhouette (path + half-width sampler for fitting wear). */
  body: BodyShape;
  look: PetLook;
  /** Species parts replaced by a trait (see TraitArt.replaces). */
  hidden?: ReadonlySet<BodyPart>;
}

/** Parts of the species art a trait can take over (e.g. a mermaid tail replaces feet and tail). */
export type BodyPart = 'tail' | 'ears' | 'feet' | 'mouth';

export interface SpeciesArt {
  /** Behind the body: horns, wings, anything that isn't a tail or ears. */
  back: (ctx: ArtCtx) => JSX.Element | null;
  /** Tail, behind the body (animated tails use className "pet-tail"). Omitted when a trait replaces it. */
  tail?: (ctx: ArtCtx) => JSX.Element | null;
  /**
   * Ears (and cow horns). Drawn behind the body, or in front of head wear when
   * `anchors.headWearBehindFeatures` is true, so hats never hide them.
   */
  ears?: (ctx: ArtCtx) => JSX.Element | null;
  /** Clipped to the body, drawn over the pattern: muzzle patches, belly shapes. */
  overlay?: (ctx: ArtCtx) => JSX.Element | null;
  /** Feet nubs on the ground; the default is two cocoa-outlined ovals. */
  feet?: (ctx: ArtCtx) => JSX.Element | null;
  /** Over the face and neck/face wear (e.g. whiskers, duck wings, hamster paws). */
  front?: (ctx: ArtCtx) => JSX.Element | null;
  /** Mouth/nose for the given expression. */
  mouth: (ctx: ArtCtx) => JSX.Element | null;
  /** Optional custom eyes; default eyes are used when omitted. */
  eyes?: (ctx: ArtCtx) => JSX.Element | null;
}

export interface TraitArt {
  /** Behind the body. */
  back?: (ctx: ArtCtx) => JSX.Element | null;
  /** Clipped to the body, over the pattern and species overlay (under body wear). */
  surface?: (ctx: ArtCtx) => JSX.Element | null;
  /** On top of everything except head wear. */
  front?: (ctx: ArtCtx) => JSX.Element | null;
  /** Drawn above head wear (rare; e.g. golden sparkles). */
  top?: (ctx: ArtCtx) => JSX.Element | null;
  /** Reshapes the silhouette (fluff, ghost wisps). Wear still fits through the returned halfWidthAt. */
  body?: (shape: BodyShape, anchors: Anchors) => BodyShape;
  /** Species parts this trait replaces. */
  replaces?: readonly BodyPart[];
  /** A wearable slot this trait fills (a crown, a cap): it steps aside while real wear is in that slot. */
  occupies?: WearableSlot;
}

export interface WearableArt {
  /** Render the item in pet canvas coordinates using ctx.anchors. Body wear is auto-clipped to the body. */
  render: (ctx: ArtCtx) => JSX.Element | null;
  /** Head wear only: draw in front of ears and horns (bows, clips, wreaths) even on species that wear hats behind them. */
  overEars?: boolean;
  /** Optional unclipped layer behind the pet (a backpack, a hood). */
  behind?: (ctx: ArtCtx) => JSX.Element | null;
  /** Body wear only: an unclipped layer over the body outline (a floatie ring, apron ties). */
  over?: (ctx: ArtCtx) => JSX.Element | null;
  /** Optional standalone icon rendering (collection book / reveal) on a 100×100 canvas. Defaults to render() on a ghost body. */
  icon?: () => JSX.Element;
}

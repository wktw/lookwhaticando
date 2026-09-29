import type { JSX } from 'preact';
import type { Species } from '@/catalog/types';
import type { Anchors } from './geometry';

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
  | 'belly-only';

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
  | 'gingerbread';

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
  /** Eye color override (defaults to EYE cocoa). */
  eye?: string;
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
  look: PetLook;
}

export interface SpeciesArt {
  /** Behind the body: tail, ears, horns, wings… (animated tail should use className "pet-tail"). */
  back: (ctx: ArtCtx) => JSX.Element | null;
  /** Clipped to the body, drawn over the pattern: muzzle patches, belly shapes. */
  overlay?: (ctx: ArtCtx) => JSX.Element | null;
  /** Over the body outline (e.g. frog eye bumps, duck beak, whiskers). */
  front?: (ctx: ArtCtx) => JSX.Element | null;
  /** Mouth/nose for the given expression. */
  mouth: (ctx: ArtCtx) => JSX.Element | null;
  /** Optional custom eyes; default eyes are used when omitted. */
  eyes?: (ctx: ArtCtx) => JSX.Element | null;
}

export interface TraitArt {
  /** Behind the body. */
  back?: (ctx: ArtCtx) => JSX.Element | null;
  /** On top of everything except head wear. */
  front?: (ctx: ArtCtx) => JSX.Element | null;
  /** Drawn above head wear (rare; e.g. golden sparkles). */
  top?: (ctx: ArtCtx) => JSX.Element | null;
}

export interface WearableArt {
  /** Render the item in pet canvas coordinates using ctx.anchors. Body wear is auto-clipped to the body. */
  render: (ctx: ArtCtx) => JSX.Element | null;
  /** Optional standalone icon rendering (collection book / reveal) on a 100×100 canvas. Defaults to render() on a ghost body. */
  icon?: () => JSX.Element;
}

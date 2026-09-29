import type { PetLook, PetPalette } from './types';
import { getCollectible } from '@/catalog/collectibles';
import { moonlight } from './color';

/**
 * Visual definition of every pet variant, keyed by collectible id.
 * Palettes are pastel; saturated color only for tiny accents (see DESIGN §10.4).
 * Siblings in a series differ by silhouette details (traits) as well as color, so they
 * stay distinguishable at 64px. Ultra pets get the holo aura automatically (see auraOf).
 */

const EAR = '#FFC4D3';
const NOSE = '#F58CAA';
const COCOA = '#5A3E45';
const COW_NOSTRIL = '#E77C9A';

type PaletteInput = Omit<PetPalette, 'earInner' | 'nose'> & Partial<PetPalette>;
/** Pink inner ears and nose unless overridden. */
const soft = (palette: PaletteInput): PetPalette => ({ earInner: EAR, nose: NOSE, ...palette });
/** Dogs: cocoa nose, peachy inner ears. */
const pup = (palette: PaletteInput): PetPalette => ({ earInner: '#FFD6C8', nose: COCOA, ...palette });

export const LOOKS: Record<string, PetLook> = {
  /* ---------------- Cats ---------------- */
  'pet-mochi': {
    species: 'cat',
    pattern: 'cow',
    traits: ['sprout'],
    palette: { body: '#FFF9F0', pattern: '#6E5250', earInner: '#FFC4D3', nose: '#F58CAA' },
  },
  'pet-golden-mochi': {
    species: 'cat',
    pattern: 'cow',
    traits: ['sprout', 'golden'],
    aura: 'glow',
    palette: soft({ body: '#FFEBB0', pattern: '#F0BF52', earInner: '#FFC9B0', tail: '#FFE39A' }),
  },
  'pet-cat-orange': {
    species: 'cat',
    pattern: 'tabby',
    palette: { body: '#FFD3A3', pattern: '#F2A764', earInner: '#FFB9C6', nose: '#F58CAA', tail: '#FFC88E' },
  },
  'pet-cat-grey': {
    species: 'cat',
    pattern: 'tabby',
    palette: { body: '#D9D6E3', pattern: '#B3AEC4', earInner: '#FFC4D3', nose: '#F29AB2' },
  },
  'pet-cat-tuxedo': {
    species: 'cat',
    pattern: 'tuxedo',
    palette: { body: '#5B5063', belly: '#FFFFFF', earInner: '#F7A8BC', nose: '#F58CAA', feet: '#FFFFFF', eye: '#2E2430' },
  },
  'pet-cat-cream': {
    species: 'cat',
    pattern: 'none',
    palette: { body: '#FFF4E4', earInner: '#FFCBD6', nose: '#F7A1B5' },
  },
  'pet-cat-calico': {
    species: 'cat',
    pattern: 'calico',
    palette: { body: '#FFFBF4', pattern: '#F6B67C', pattern2: '#6E5250', earInner: '#FFC4D3', nose: '#F58CAA' },
  },
  'pet-cat-black': {
    species: 'cat',
    pattern: 'none',
    palette: soft({ body: '#57505F', earInner: '#F7A8BC', eye: '#2A2330', iris: '#FFDC7A', ink: '#E6DCEB' }),
  },
  'pet-cat-siamese': {
    species: 'cat',
    pattern: 'siamese',
    palette: soft({
      body: '#FFF4E6',
      pattern: '#D8B6A0',
      ear: '#B98D78',
      feet: '#C49A85',
      tail: '#B98D78',
      earInner: '#F2C2C0',
      nose: '#B98079',
      eye: '#4F7FB8',
    }),
  },
  'pet-cat-strawberry': {
    species: 'cat',
    pattern: 'seeds',
    traits: ['strawberry-cap'],
    palette: soft({ body: '#FFC6D4', pattern: '#FFF3B8', earInner: '#FF9FB8', nose: '#EE6F8E' }),
  },
  'pet-cat-lucky': {
    species: 'cat',
    pattern: 'patch',
    traits: ['lucky-paw'],
    palette: soft({ body: '#FFFDF8', pattern: '#FFC692', earInner: '#FF9FB8' }),
  },
  'pet-cat-sakura': {
    species: 'cat',
    pattern: 'petals',
    traits: ['flower'],
    aura: 'sparkle',
    palette: soft({ body: '#FFE9F0', pattern: '#F7AFC5', earInner: '#FF9FB8', accent: '#F58CAA' }),
  },
  'pet-cat-cloud': {
    species: 'cat',
    pattern: 'none',
    traits: ['cloud-fluff'],
    palette: soft({ body: '#F5F8FF', earInner: '#D6C8F8', tail: '#F5F8FF' }),
  },
  'pet-cat-starry': {
    species: 'cat',
    pattern: 'nebula',
    aura: 'sparkle',
    palette: soft({ body: '#8E84CC', pattern: '#F2A9D2', pattern2: '#9FCBF6', earInner: '#F2A9D2', nose: '#F7B6CE', eye: '#2B2345' }),
  },
  'pet-cat-witchy': {
    species: 'cat',
    pattern: 'none',
    traits: ['witch-hat'],
    palette: soft({ body: '#7D6D99', earInner: '#E9A8CC', eye: '#2B2238', iris: '#BDE8A4', ink: '#F1E8F6' }),
  },
  'pet-cat-jack': {
    species: 'cat',
    pattern: 'tabby',
    traits: ['pumpkin-shell'],
    palette: soft({ body: '#FFEAD6', pattern: '#F6C69A', accent: '#FFAD68' }),
  },
  'pet-cat-jingle': {
    species: 'cat',
    pattern: 'none',
    traits: ['ribbon'],
    palette: soft({ body: '#FFFFFF', accent: '#EE6A84' }),
  },
  'pet-cat-heart': {
    species: 'cat',
    pattern: 'hearts',
    palette: soft({ body: '#FFF8F4', pattern: '#F59DB5' }),
  },
  'pet-cat-cupid': {
    species: 'cat',
    pattern: 'none',
    traits: ['wings'],
    palette: soft({ body: '#FFE3EC', earInner: '#FF9FB8', tail: '#FFD6E2' }),
  },
  'pet-cat-drizzle': {
    species: 'cat',
    pattern: 'raindrops',
    palette: soft({ body: '#D6E4F3', pattern: '#A8C6EC' }),
  },
  'pet-cat-sandy': {
    species: 'cat',
    pattern: 'belly-only',
    traits: ['starfish'],
    palette: soft({ body: '#F2DCB6', belly: '#FFF6E6' }),
  },
  'pet-cat-mermaid': {
    species: 'cat',
    pattern: 'none',
    traits: ['mermaid-tail'],
    palette: soft({ body: '#ECE4FB', pattern: '#9EDCCB', tail: '#8BD1C6' }),
  },

  /* ---------------- Cows ---------------- */
  'pet-cow-holstein': {
    species: 'cow',
    pattern: 'cow',
    palette: soft({ body: '#FFFFFF', pattern: '#5E4B55', nose: COW_NOSTRIL, muzzle: '#FFD9E2' }),
  },
  'pet-cow-brown': {
    species: 'cow',
    pattern: 'cow',
    palette: soft({ body: '#E3C3A8', pattern: '#B68A70', nose: '#C9707F', muzzle: '#FFEADC' }),
  },
  'pet-cow-blueberry': {
    species: 'cow',
    pattern: 'cow',
    palette: soft({ body: '#DCE8FA', pattern: '#A6C0EE', nose: COW_NOSTRIL, muzzle: '#FFEFF4' }),
  },
  'pet-cow-strawberry': {
    species: 'cow',
    pattern: 'cow',
    palette: soft({ body: '#FFDCE5', pattern: '#F7A6BD', earInner: '#FF9FB8', nose: COW_NOSTRIL, muzzle: '#FFF4F7' }),
  },
  'pet-cow-banana': {
    species: 'cow',
    pattern: 'cow',
    palette: soft({ body: '#FFF2BE', pattern: '#F5D56E', nose: '#E39A86', muzzle: '#FFFBEA' }),
  },
  'pet-cow-matcha': {
    species: 'cow',
    pattern: 'cow',
    traits: ['forelock'],
    palette: soft({ body: '#DAECC9', pattern: '#A8CC8F', nose: '#D98A9C', muzzle: '#FFF8E8' }),
  },
  'pet-cow-highland': {
    species: 'cow',
    pattern: 'none',
    traits: ['bangs', 'long-horns'],
    palette: soft({ body: '#F5C197', pattern: '#EBA676', nose: '#D9768E', muzzle: '#FFE6D6' }),
  },
  'pet-cow-sprinkle': {
    species: 'cow',
    pattern: 'sprinkles',
    palette: soft({ body: '#FFF6F8', nose: COW_NOSTRIL, muzzle: '#FFE0E8' }),
  },
  'pet-cow-moon': {
    species: 'cow',
    pattern: 'cow-moons',
    palette: soft({ body: '#E7E1FA', pattern: '#BBAEEA', pattern2: '#FFE593', nose: '#C98AB0', muzzle: '#FFF1F7', accent: '#FFF4CC' }),
  },
  'pet-cow-celestial': {
    species: 'cow',
    pattern: 'cow-stars',
    palette: soft({
      body: '#8C86CE',
      pattern: '#5E5799',
      pattern2: '#FFE593',
      earInner: '#F3A6D0',
      nose: '#D98FBF',
      muzzle: '#E6E0FB',
      accent: '#FFE593',
      eye: '#2B2448',
    }),
  },
  'pet-cow-pumpkin': {
    species: 'cow',
    pattern: 'cow',
    traits: ['forelock'],
    palette: soft({ body: '#FFD3A8', pattern: '#E5A06C', nose: '#D98A8E', muzzle: '#FFF2E4' }),
  },
  'pet-cow-ghost': {
    species: 'cow',
    pattern: 'cow',
    traits: ['ghost-tail'],
    aura: 'ghost',
    palette: soft({ body: '#F8F6FF', pattern: '#D9D0F3', earInner: '#E6D6F6', nose: '#C9B2E2', muzzle: '#FFFFFF', accent: '#F2EDFE' }),
  },
  'pet-cow-reindeer': {
    species: 'cow',
    pattern: 'cow',
    traits: ['antlers', 'red-nose'],
    palette: soft({ body: '#D9B79A', pattern: '#FFF4E6', nose: '#B97A70', muzzle: '#FFEBDD', accent: '#C4966F' }),
  },
  'pet-cow-candycane': {
    species: 'cow',
    pattern: 'candy-stripes',
    palette: soft({ body: '#FFFFFF', pattern: '#F7A6BA', nose: COW_NOSTRIL, muzzle: '#FFF1F4' }),
  },
  'pet-cow-lovebug': {
    species: 'cow',
    pattern: 'cow-hearts',
    palette: soft({ body: '#FFF7F9', pattern: '#F59AB4', nose: COW_NOSTRIL, muzzle: '#FFE1E9' }),
  },
  'pet-cow-melon': {
    species: 'cow',
    pattern: 'melon',
    palette: soft({
      body: '#FFC6CE',
      pattern: '#9BCF86',
      pattern2: '#6B4F58',
      ear: '#BFE3A8',
      earInner: '#FFC6CE',
      nose: COW_NOSTRIL,
      muzzle: '#FFEAED',
      feet: '#9BCF86',
    }),
  },

  /* ---------------- Dogs ---------------- */
  'pet-dog-corgi': {
    species: 'dog',
    pattern: 'socks',
    traits: ['pointy-ears'],
    palette: pup({ body: '#F8BE87', belly: '#FFFFFF', feet: '#FFFFFF', muzzle: '#FFFFFF' }),
  },
  'pet-dog-pom': {
    species: 'dog',
    pattern: 'none',
    traits: ['fluffy', 'curly-tail'],
    palette: pup({ body: '#FFD3A2', belly: '#FFF1DE', muzzle: '#FFF1DE' }),
  },
  'pet-dog-dachshund': {
    species: 'dog',
    pattern: 'belly-only',
    traits: ['floppy-ears'],
    palette: pup({ body: '#DBA27C', ear: '#B67D59', belly: '#F2CBA8', muzzle: '#F2CBA8', earInner: EAR }),
  },
  'pet-dog-shiba': {
    species: 'dog',
    pattern: 'urajiro',
    traits: ['pointy-ears', 'curly-tail'],
    palette: pup({ body: '#F4AD76', belly: '#FFF5E8', muzzle: '#FFF5E8', earInner: '#FFE0D0' }),
  },
  'pet-dog-golden': {
    species: 'dog',
    pattern: 'none',
    traits: ['floppy-ears'],
    palette: pup({ body: '#FFDA9C', ear: '#F2BD6E', muzzle: '#FFF3DC', earInner: EAR }),
  },
  'pet-dog-dalmatian': {
    species: 'dog',
    pattern: 'spots',
    traits: ['floppy-ears'],
    palette: pup({ body: '#FFFFFF', pattern: '#5E4B55', ear: '#6A5862', muzzle: '#FFFFFF', earInner: EAR }),
  },
  'pet-dog-frenchie': {
    species: 'dog',
    pattern: 'patch',
    traits: ['bat-ears'],
    palette: pup({ body: '#ECDCCB', pattern: '#C8A58C', muzzle: '#C9A690', earInner: EAR }),
  },
  'pet-dog-samoyed': {
    species: 'dog',
    pattern: 'none',
    idleEyes: 'happy',
    traits: ['fluffy', 'curly-tail'],
    palette: pup({ body: '#FFFFFF', belly: '#FFFFFF', muzzle: '#FFFFFF', earInner: EAR }),
  },
  'pet-dog-cottoncandy': {
    species: 'dog',
    pattern: 'nebula',
    traits: ['fluffy', 'curly-tail'],
    palette: pup({ body: '#FFD4E7', pattern: '#F8B4D5', pattern2: '#B2D6F8', belly: '#FFEAF4', muzzle: '#FFF1F7', earInner: '#FFB3D0' }),
  },

  /* ---------------- Bunnies ---------------- */
  'pet-bunny-white': {
    species: 'bunny',
    pattern: 'none',
    palette: soft({ body: '#FFFFFF' }),
  },
  'pet-bunny-brown': {
    species: 'bunny',
    pattern: 'belly-only',
    palette: soft({ body: '#D9B89C', belly: '#F7E7D8', tail: '#F7E7D8' }),
  },
  'pet-bunny-lop': {
    species: 'bunny',
    pattern: 'none',
    traits: ['lop-ears'],
    palette: soft({ body: '#F4DDC2', ear: '#E6C29C' }),
  },
  'pet-bunny-sakura': {
    species: 'bunny',
    pattern: 'petals',
    traits: ['flower'],
    aura: 'sparkle',
    palette: soft({ body: '#FFF0F5', pattern: '#F7AFC5', earInner: '#FF9FB8', accent: '#F58CAA' }),
  },
  'pet-bunny-star': {
    species: 'bunny',
    pattern: 'stars',
    palette: soft({ body: '#DCD3F7', pattern: '#FFE08A', earInner: '#FFC4DC' }),
  },
  'pet-bunny-boo': {
    species: 'bunny',
    pattern: 'none',
    traits: ['ghost-sheet'],
    palette: soft({ body: '#FCFBFF', pattern: '#E6D4F3', feet: '#E6D4F3' }),
  },
  'pet-bunny-snow': {
    species: 'bunny',
    pattern: 'snowflakes',
    traits: ['cloud-fluff'],
    palette: soft({ body: '#EAF3FE', pattern: '#FFFFFF', earInner: '#CFE3F8' }),
  },
  'pet-bunny-rose': {
    species: 'bunny',
    pattern: 'none',
    traits: ['rose'],
    palette: soft({ body: '#FFD2DD', earInner: '#FF9FB8', nose: '#EE6F8E', accent: '#F0708E' }),
  },

  /* ---------------- Frogs ---------------- */
  'pet-frog-green': {
    species: 'frog',
    pattern: 'none',
    palette: soft({ body: '#BEE3A8', belly: '#F2F9E4' }),
  },
  'pet-frog-mushroom': {
    species: 'frog',
    pattern: 'none',
    traits: ['mushroom-cap'],
    palette: soft({ body: '#CDE5B4', belly: '#F6FAEA' }),
  },
  'pet-frog-prince': {
    species: 'frog',
    pattern: 'none',
    traits: ['crown'],
    palette: soft({ body: '#B2DEA7', belly: '#F1F9E6' }),
  },
  'pet-frog-kissy': {
    species: 'frog',
    pattern: 'none',
    traits: ['kissy'],
    palette: soft({ body: '#FFCBD8', belly: '#FFF0F4' }),
  },
  'pet-frog-lilypad': {
    species: 'frog',
    pattern: 'none',
    traits: ['lilypad-hat'],
    palette: soft({ body: '#AEDFCB', belly: '#EAF8F1' }),
  },
  'pet-frog-sunshower': {
    species: 'frog',
    pattern: 'raindrops',
    traits: ['rainbow-belly'],
    aura: 'sparkle',
    palette: soft({ body: '#FFE89E', pattern: '#BBD9F6', belly: '#FFF8DE' }),
  },
  'pet-frog-tropical': {
    species: 'frog',
    pattern: 'spots',
    traits: ['flower'],
    palette: soft({ body: '#FFC592', pattern: '#FF9E9E', belly: '#FFF1E2', accent: '#F58CAA' }),
  },

  /* ---------------- Bears ---------------- */
  'pet-bear-brown': {
    species: 'bear',
    pattern: 'none',
    palette: soft({ body: '#E4BA8E', muzzle: '#FFF1DF', earInner: '#F6CBB0', nose: COCOA }),
  },
  'pet-bear-strawberry': {
    species: 'bear',
    pattern: 'icing',
    palette: soft({ body: '#FFD3DC', pattern: '#EF8AA2', muzzle: '#FFF1F4', earInner: '#FF9FB8', nose: COCOA }),
  },
  'pet-bear-panda': {
    species: 'bear',
    pattern: 'panda',
    palette: soft({
      body: '#FFFFFF',
      pattern: '#6E5E69',
      ear: '#6E5E69',
      earInner: '#8F7E8A',
      feet: '#6E5E69',
      tail: '#6E5E69',
      muzzle: '#FFFFFF',
      nose: '#4A3540',
      eye: '#2A2130',
    }),
  },
  'pet-bear-cupcake': {
    species: 'bear',
    pattern: 'none',
    traits: ['frosting'],
    palette: soft({ body: '#F4CFA8', muzzle: '#FFF1E0', earInner: '#F7B8C4', nose: COCOA, accent: '#FFC4D8' }),
  },
  'pet-bear-sleepy': {
    species: 'bear',
    pattern: 'none',
    idleEyes: 'drowsy',
    traits: ['nightcap'],
    palette: soft({ body: '#D8CDF3', muzzle: '#F4F0FF', earInner: '#F7C4DA', nose: '#6A5B8A' }),
  },
  'pet-bear-polar': {
    species: 'bear',
    pattern: 'none',
    palette: soft({ body: '#FAFCFF', muzzle: '#FFFFFF', earInner: '#D8E6F6', nose: COCOA }),
  },
  'pet-bear-hug': {
    species: 'bear',
    pattern: 'none',
    traits: ['heart-hold'],
    palette: soft({ body: '#F4C7A8', muzzle: '#FFEEE3', earInner: '#FFB9C6', nose: COCOA }),
  },

  /* ---------------- Hamsters ---------------- */
  'pet-hamster-golden': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks'],
    palette: soft({ body: '#F8C890', belly: '#FFFFFF' }),
  },
  'pet-hamster-white': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks', 'nori'],
    palette: soft({ body: '#FFFFFF', belly: '#FFFFFF' }),
  },
  'pet-hamster-choco': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks'],
    palette: soft({ body: '#B98B74', belly: '#FFF3E0', earInner: '#F2B8B8' }),
  },
  'pet-hamster-daifuku': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks', 'daifuku-bean'],
    palette: soft({ body: '#FFEEF3', belly: '#FFFFFF' }),
  },
  'pet-hamster-acorn': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks', 'acorn-cap'],
    palette: soft({ body: '#E8BD90', belly: '#FFF6EC' }),
  },
  'pet-hamster-gingerbread': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks', 'gingerbread'],
    aura: 'sparkle',
    palette: soft({ body: '#D6A06F', belly: '#E6B98E' }),
  },
  'pet-hamster-sunny': {
    species: 'hamster',
    pattern: 'none',
    traits: ['cheeks'],
    palette: soft({ body: '#FFE39C', belly: '#FFFFFF', earInner: '#FFB8A6' }),
  },

  /* ---------------- Ducks ---------------- */
  'pet-duck-yellow': {
    species: 'duck',
    pattern: 'none',
    palette: soft({ body: '#FFE591', accent: '#FFB877' }),
  },
  'pet-duck-white': {
    species: 'duck',
    pattern: 'none',
    palette: soft({ body: '#FFFFFF', accent: '#FFC47E' }),
  },
  'pet-duck-mallard': {
    species: 'duck',
    pattern: 'mallard',
    palette: soft({ body: '#E6D8C8', pattern: '#8ED0A8', pattern2: '#FFFFFF', accent: '#FFD36B' }),
  },
  'pet-duck-rainbow': {
    species: 'duck',
    pattern: 'rainbow',
    palette: soft({ body: '#FFFBF3', accent: '#FFB877' }),
  },
  'pet-duck-sailor': {
    species: 'duck',
    pattern: 'none',
    traits: ['sailor-collar'],
    palette: soft({ body: '#FFFFFF', accent: '#FFB877' }),
  },
};

/** Code-drawn night variants, 'moonlit:<petId>' (DESIGN §13.6). */
const MOONLIT = 'moonlit:';

/** A pet's Moonlit look: its own design in cool moonlight (every fur part alike), dusted with tiny stars. */
function moonlitLook(base: PetLook): PetLook {
  const p = base.palette;
  const cool = (c: string | undefined) => (c ? moonlight(c) : undefined);
  const palette: PetPalette = {
    ...p,
    body: moonlight(p.body),
    belly: cool(p.belly),
    ear: cool(p.ear),
    pattern: cool(p.pattern),
    pattern2: cool(p.pattern2),
    muzzle: cool(p.muzzle),
    feet: cool(p.feet),
    tail: cool(p.tail),
    earInner: moonlight(p.earInner, 0.6),
  };
  const aura = base.aura === 'glow' || base.aura === 'ghost' ? base.aura : 'sparkle';
  return { ...base, palette, traits: [...(base.traits ?? []), 'moonlit'], aura };
}

/** Look for any pet id. Unknown ids get a neutral look of the right species. */
export function getLook(petId: string): PetLook {
  const found = LOOKS[petId];
  if (found) return found;
  if (petId.startsWith(MOONLIT)) return moonlitLook(getLook(petId.slice(MOONLIT.length)));
  const def = getCollectible(petId);
  const species = def && def.category === 'pet' ? def.species : 'cat';
  return { species, pattern: 'none', palette: { body: '#F4ECE6', earInner: '#FFC4D3', nose: '#F58CAA' } };
}

/**
 * The aura a pet shows. Ultra pets always get the holographic halo (so re-tiering the catalog
 * never needs art changes); signature auras (glow, ghost) and hand-picked rare sparkles come from the look.
 */
export function auraOf(look: PetLook, petId: string): PetLook['aura'] {
  if (look.aura === 'glow' || look.aura === 'ghost') return look.aura;
  return getCollectible(petId)?.rarity === 'ultra' ? 'holo' : look.aura;
}

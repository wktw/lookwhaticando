import { PetArt } from '@/art/pets/PetArt';
import { BadgeMedal } from '@/art/badges';
import { PlantArt } from '@/art/plants';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CoinIcon, StarIcon } from '@/art/icons';
import type { CelebrationArt as ArtSpec } from './celebrationPlan';

/** Renders the art a celebration asked for, at a given size. Decorative (the copy says it all). */
export function CelebrationArt({ art, size, animated = true }: { art: ArtSpec; size: number; animated?: boolean }) {
  switch (art.type) {
    case 'pet':
      return <PetArt petId={art.petId} expression={art.expression} size={size} animated={animated} />;
    case 'badge':
      return <BadgeMedal badgeId={art.badgeId} earned size={size} />;
    case 'plant':
      return <PlantArt species={art.species} stage={art.stage} pot={art.pot} size={size} animated={animated} />;
    case 'collectible':
      return <CollectibleArt id={art.id} size={size} animated={animated} />;
    case 'currency':
      return art.kind === 'coins' ? <CoinIcon size={size * 0.72} /> : <StarIcon size={size * 0.72} />;
  }
}

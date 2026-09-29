/**
 * The drawings a celebration asks for: pets, pins, plants, capsule things, currency tokens and the
 * kit's small objects. This module pulls in the whole art library, so nothing imports it
 * statically: ./celebrationArtLoader loads it after first paint, and celebration notes wait for it.
 */
import { PetArt } from '@/art/pets/PetArt';
import { BadgeMedal } from '@/art/badges';
import { PlantArt, PotArt } from '@/art/plants';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CoinIcon, StampIcon, SwapIcon, TicketIcon } from '@/art/icons';
import { ObjectArt, themeLight } from '@/ui/art/objects';
import type { CelebrationArt as ArtSpec } from './celebrationPlan';

const CURRENCY = { coins: CoinIcon, stars: StampIcon, tickets: TicketIcon, stardust: SwapIcon } as const;

/** Renders the art a celebration asked for, at a given size. Decorative (the copy says it all). */
export function CelebrationArt({ art, size, animated = true }: { art: ArtSpec; size: number; animated?: boolean }) {
  switch (art.type) {
    case 'pet':
      return <PetArt petId={art.petId} expression={art.expression} size={size} animated={animated} />;
    case 'badge':
      return <BadgeMedal badgeId={art.badgeId} earned size={size} />;
    case 'plant':
      return <PlantArt species={art.species} stage={art.stage} pot={art.pot} size={size} animated={animated} fit="icon" light={themeLight()} />;
    case 'collectible':
      return <CollectibleArt id={art.id} size={size} animated={animated} />;
    case 'currency': {
      const Icon = CURRENCY[art.kind];
      return <Icon size={size * 0.72} />;
    }
    case 'object':
      // The pot and the cutting are the sill's own: the same terracotta pot and pothos cutting everywhere.
      if (art.name === 'pot') return <PotArt pot="terracotta" size={size} light={themeLight()} />;
      if (art.name === 'cutting') return <PlantArt species="pothos" stage={0} pot="terracotta" fit="icon" size={size} light={themeLight()} animated={false} />;
      return <ObjectArt name={art.name} size={size} light={themeLight()} />;
  }
}

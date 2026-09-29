/**
 * Habit Detail's large plant (DESIGN §9.2): the plant in its pot, framed to its stage like a card
 * plant, with its resident on the rim at a size you can see, lit by the app's one light. The
 * companion sits on the rim's lip on the lit side (or on the sill beside a cutting's glass), facing
 * out, between the plant's back and front layers so the foliage that spills over the rim is in front.
 */
import { PetArt } from '@/art/pets/PetArt';
import { PlantArt, type PlantLookArt } from '@/art/plants';
import { cardFrame, cardSpots } from '@/art/plants/CardPlant';
import { useArtLight } from '@/art/scene/moment';
import type { PlantSpeciesId, PotId } from '@/catalog/types';

export interface HeroPlantProps {
  species: PlantSpeciesId;
  stage: number;
  progress?: number;
  blooms?: number;
  pot: PotId;
  damp?: boolean;
  look?: PlantLookArt;
  flourishes?: number;
  /** The companion's art id (a collectible id), living in the plant. */
  residentArtId?: string;
  size?: number;
  animated?: boolean;
  title?: string;
}

export function HeroPlant(p: HeroPlantProps) {
  const size = p.size ?? 176;
  const light = useArtLight();
  const away = light.from === 'left' ? 1 : light.from === 'right' ? -1 : 1;
  const [fx, fy, side] = cardFrame(p.species, p.stage, p.pot, away);
  const spots = cardSpots(p.stage, p.pot, away);
  const young = Math.floor(p.stage) < 2;
  const toPx = (x: number, y: number) => ({ left: ((x - fx) / side) * size, top: ((y - fy) / side) * size });
  const plant = {
    species: p.species,
    stage: p.stage,
    progress: p.progress,
    blooms: p.blooms,
    pot: p.pot,
    damp: p.damp,
    look: p.look,
    flourishes: p.flourishes,
    light,
    fit: 'icon' as const,
    withPot: young,
    animated: p.animated,
    size: '100%',
    seed: `${p.species}${p.pot}hero`,
  };
  const layer = { position: 'absolute', inset: 0 } as const;
  const petPx = Math.round(size * 0.34);
  const seat = toPx(spots.seat.x, spots.seat.y);
  const resident = p.residentArtId ? (
    <PetArt
      petId={p.residentArtId}
      size={petPx}
      pose="loaf"
      light={light}
      facing={away > 0 ? 'left' : 'right'}
      animated={p.animated}
      style={{ position: 'absolute', left: `${(seat.left - petPx / 2).toFixed(1)}px`, top: `${(seat.top - petPx * 0.94).toFixed(1)}px` }}
    />
  ) : null;
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', width: `${size}px`, height: `${size}px`, flex: 'none' }}
      role={p.title ? 'img' : undefined}
      aria-label={p.title}
      aria-hidden={p.title ? undefined : true}
      data-hero-plant={p.species}
    >
      <PlantArt {...plant} layer={young ? 'all' : 'back'} style={layer} />
      {resident}
      {!young && <PlantArt {...plant} layer="front" style={layer} />}
    </span>
  );
}

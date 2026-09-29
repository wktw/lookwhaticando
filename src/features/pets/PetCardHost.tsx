import { useEffect, useState } from 'preact/hooks';
import { PET_CARD } from '@/catalog/lines';
import { selectPet, shelfView } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { IconButton } from '@/ui/IconButton';
import { closePetCard, petCardRequest } from '../habits/open';
import { FavouriteButton, PetCard, RenameForm } from './PetCard';
import s from './PetCard.module.css';

/**
 * The Pet Card sheet, for any screen (`openPetCard(petId)` in src/features/habits/open.ts): mounted
 * once by src/app/SheetHosts.tsx and loaded the first time a card is asked for. It keeps the last pet
 * while the sheet slides away, and closes itself if the pet is gone.
 */
export default function PetCardHost() {
  const requested = petCardRequest.value;
  const [shown, setShown] = useState<string | null>(requested);
  const [renaming, setRenaming] = useState(false);
  useEffect(() => {
    if (requested) {
      setShown(requested);
      setRenaming(false);
    }
  }, [requested]);
  const pet = shown ? selectPet(shown).value : null;
  useEffect(() => {
    if (requested && !pet) closePetCard();
  }, [requested, pet]);
  if (!pet) return null;
  const shelf = shelfView.value;
  return (
    <Sheet
      open={requested !== null}
      onClose={closePetCard}
      onClosed={() => setShown(null)}
      title={pet.name}
      size="md"
      detents={['large']}
      class={s.sheet}
      aside={
        <div class={s.aside}>
          <IconButton icon="edit" label={PET_CARD.buttons.rename} variant="card" size="sm" pressed={renaming} onClick={() => setRenaming((r) => !r)} />
          <FavouriteButton pet={pet} />
        </div>
      }
    >
      {renaming && <RenameForm pet={pet} onDone={() => setRenaming(false)} />}
      <PetCard key={pet.id} pet={pet} places={shelf.places} out={shelf.out} capacity={shelf.capacity} />
    </Sheet>
  );
}

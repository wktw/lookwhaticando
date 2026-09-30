import { useEffect, useRef, useState } from 'preact/hooks';
import { PET_CARD } from '@/catalog/lines';
import { selectPet, shelfView } from '@/state/selectors';
import { Sheet } from '@/ui/Sheet';
import { IconButton } from '@/ui/IconButton';
import { closePetCard, petCardRequest, type PetCardRequest } from '../habits/open';
import { FavouriteButton, PetCard, RenameForm } from './PetCard';
import s from './PetCard.module.css';

/**
 * The Pet Card sheet, for any screen (`openPetCard(petId, { intent })` in src/features/habits/open.ts):
 * mounted once by src/app/SheetHosts.tsx and loaded the first time a card is asked for. It keeps the
 * last pet while the sheet slides away, and closes itself if the pet is gone. Each request is a new
 * visit: the card mounts afresh and opens on what it was asked for (WP-C7).
 */
export default function PetCardHost() {
  const requested = petCardRequest.value;
  const [shown, setShown] = useState<string | null>(requested?.id ?? null);
  const [renaming, setRenaming] = useState(false);
  useEffect(() => {
    if (requested) {
      setShown(requested.id);
      setRenaming(false);
    }
  }, [requested]);
  // A new request, even for the pet already shown, is a new visit.
  const visit = useRef<{ req: PetCardRequest | null; n: number }>({ req: requested, n: 0 });
  if (requested && requested !== visit.current.req) visit.current = { req: requested, n: visit.current.n + 1 };
  // The card asked for now, else the one sliding away.
  const id = requested?.id ?? shown;
  const pet = id ? selectPet(id).value : null;
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
      <PetCard key={`${pet.id}:${visit.current.n}`} pet={pet} places={shelf.places} out={shelf.out} capacity={shelf.capacity} intent={requested?.intent} />
    </Sheet>
  );
}

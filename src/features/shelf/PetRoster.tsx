import { PetArt } from '@/art/pets/PetArt';
import { useArtLight } from '@/art/scene';
import type { PetSummaryVM } from '@/state/selectors';
import { SectionHeader } from '@/ui/SectionHeader';
import { SHELF_COPY, placeName } from './copy';
import s from './ShelfScreen.module.css';

export interface PetRosterProps {
  out: readonly PetSummaryVM[];
  indoors: readonly PetSummaryVM[];
  capacity: number;
  onOpen: (petId: string) => void;
}

/**
 * Everyone who lives here, as buttons that open each Pet Card: the pets out on the Shelf (with the
 * place each spends the day in), then those resting indoors. The scene's pets can be hard to reach
 * on a busy Shelf; this is the plain way to every card.
 */
export function PetRoster({ out, indoors, capacity, onOpen }: PetRosterProps) {
  return (
    <section class={s.roster} aria-labelledby="shelf-pets">
      <SectionHeader id="shelf-pets" title={SHELF_COPY.pets} class={s.sectionHead} />
      {out.length > 0 && <Group title={SHELF_COPY.out} meta={`${out.length} of ${capacity}`} pets={out} onOpen={onOpen} />}
      {indoors.length > 0 && <Group title={SHELF_COPY.indoors} pets={indoors} onOpen={onOpen} indoors />}
    </section>
  );
}

function Group({ title, meta, pets, onOpen, indoors }: { title: string; meta?: string; pets: readonly PetSummaryVM[]; onOpen: (id: string) => void; indoors?: boolean }) {
  const light = useArtLight();
  return (
    <div class={s.group}>
      <h3 class={s.groupTitle}>
        {title}
        {meta && <span class={s.groupMeta}>{meta}</span>}
      </h3>
      <ul class={s.petRow}>
        {pets.map((p) => (
          <li key={p.id}>
            <button type="button" class={s.petTile} onClick={() => onOpen(p.id)} aria-label={`${p.name}, ${indoors ? SHELF_COPY.pet.indoors : placeName(p.place)}`} data-pet-tile={p.id}>
              <span class={s.petArt} aria-hidden="true">
                <PetArt petId={p.id} outfit={p.outfit} fit size={64} px={64} light={light} animated={false} pose={indoors ? 'loaf' : 'sit'} />
              </span>
              <span class={s.petName}>{p.name}</span>
              <span class={s.petWhere} aria-hidden="true">
                {indoors ? SHELF_COPY.pet.indoors : placeName(p.place)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

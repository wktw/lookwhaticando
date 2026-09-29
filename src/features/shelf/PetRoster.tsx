import { memo } from 'preact/compat';
import { PetArt } from '@/art/pets/PetArt';
import { useArtLight } from '@/art/scene';
import { shelfView } from '@/state/selectors';
import type { PlaceId } from '@/catalog/types';
import type { PetSummaryVM } from '@/state/selectors';
import { fillLine } from '@/catalog/lines';
import { SectionHeader } from '@/ui/SectionHeader';
import { SHELF_COPY, placeName } from './copy';
import { stable } from './stable';
import s from './ShelfScreen.module.css';

/** A pet as the roster draws it: only what a tile shows, so an XP change re-renders nothing here. */
export interface RosterPet {
  id: string;
  name: string;
  place: PlaceId;
  outfit: PetSummaryVM['outfit'];
}

const lite = (p: RosterPet): RosterPet => ({ id: p.id, name: p.name, place: p.place, outfit: p.outfit });
export const roster = stable(() => {
  const v = shelfView.value;
  return { out: v.out.map(lite), indoors: v.indoors.map(lite), capacity: v.capacity };
});

export interface PetRosterProps {
  onOpen: (petId: string) => void;
}

/**
 * Everyone who lives here, as buttons that open each Pet Card: the pets out on the Shelf (with the
 * place each spends the day in), then those resting indoors. The scene's pets can be hard to reach
 * on a busy Shelf; this is the plain way to every card.
 */
export const PetRoster = memo(function PetRoster({ onOpen }: PetRosterProps) {
  const { out, indoors, capacity } = roster.value;
  return (
    <section class={s.roster} aria-labelledby="shelf-pets">
      <SectionHeader id="shelf-pets" title={SHELF_COPY.pets} class={s.sectionHead} />
      {out.length > 0 && <Group id="shelf-pets-out" title={SHELF_COPY.out} meta={fillLine(SHELF_COPY.fieldGuideSheet.of, { owned: out.length, total: capacity })} pets={out} onOpen={onOpen} />}
      {indoors.length > 0 && <Group id="shelf-pets-in" title={SHELF_COPY.indoors} pets={indoors} onOpen={onOpen} indoors />}
    </section>
  );
});

function Group({ id, title, meta, pets, onOpen, indoors }: { id: string; title: string; meta?: string; pets: readonly RosterPet[]; onOpen: (id: string) => void; indoors?: boolean }) {
  const light = useArtLight();
  return (
    <div class={s.group}>
      <div class={s.groupHead}>
        <h3 class={s.groupTitle} id={id} aria-describedby={meta ? `${id}-meta` : undefined}>
          {title}
        </h3>
        {meta && (
          <span class={s.groupMeta} id={`${id}-meta`}>
            {meta}
          </span>
        )}
      </div>
      <ul class={s.petRow} aria-labelledby={id}>
        {pets.map((p) => (
          <li key={p.id}>
            <button type="button" class={s.petTile} onClick={() => onOpen(p.id)} aria-label={`${p.name}, ${indoors ? SHELF_COPY.indoors : placeName(p.place)}`} data-pet-tile={p.id}>
              <span class={s.petArt} aria-hidden="true">
                <PetArt petId={p.id} outfit={p.outfit} fit size={64} px={64} light={light} animated={false} pose={indoors ? 'loaf' : 'sit'} />
              </span>
              <span class={s.petName}>{p.name}</span>
              <span class={s.petWhere} aria-hidden="true">
                {indoors ? SHELF_COPY.indoors : placeName(p.place)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

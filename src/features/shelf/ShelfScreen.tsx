/**
 * The Shelf tab (DESIGN §9.4): the scrolling home, lit by the real window, and the places map below.
 * Until the screen is wired to the store it shows a demo household (./demo).
 */
import { PLACES } from '@/catalog/places';
import { PlaceArt, ShelfScene } from '@/art/scene';
import { DEMO_COINS, DEMO_DECOR, DEMO_PETS, DEMO_PLACES, DEMO_POTS } from './demo';
import s from './ShelfScreen.module.css';

export function ShelfScreen() {
  return (
    <section class={s.screen} aria-labelledby="shelf-title">
      <h1 id="shelf-title" class={s.title}>
        Shelf
      </h1>
      <ShelfScene
        class={s.scene}
        pots={DEMO_POTS}
        pets={DEMO_PETS}
        decor={DEMO_DECOR}
        coins={DEMO_COINS}
        places={DEMO_PLACES}
        label="The Shelf: the sill and the places you have opened"
      />
      <div class={s.section}>
        <h2 class={s.label}>Places</h2>
        <ul class={s.map}>
          {PLACES.map((p) => {
            const open = p.price === 0 || DEMO_PLACES.includes(p.id);
            return (
              <li key={p.id} class={s.place}>
                <PlaceArt place={p.id} locked={!open} width="100%" />
                <span class={s.name}>{p.name}</span>
                <span class={s.blurb}>{p.blurb}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default ShelfScreen;

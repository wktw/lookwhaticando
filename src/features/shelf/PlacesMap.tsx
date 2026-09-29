import { useState } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { PET_CARD, PLACE_LINES, fillLine } from '@/catalog/lines';
import { num, placePhrase } from '@/catalog/format';
import { PlaceArt } from '@/art/scene';
import type { PetSummaryVM, PlaceVM } from '@/state/selectors';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Pill } from '@/ui/Pill';
import { SectionHeader } from '@/ui/SectionHeader';
import { SHELF_COPY, openForLine, shortLine } from './copy';
import { petsByPlace } from './model';
import s from './ShelfScreen.module.css';

export interface PlacesMapProps {
  places: readonly PlaceVM[];
  out: readonly Pick<PetSummaryVM, 'id' | 'place'>[];
  coins: number;
  onBuy: (place: PlaceId) => void;
  onGo: (place: PlaceId) => void;
}

/**
 * The places map (DESIGN §8.4, VOICE §11): every place as a picture in the hour's light. An opened
 * place says who is there and takes her to it; a place not yet opened shows its price, the room it
 * adds, and "Open for 400 coins" (asked once more before the coins go).
 */
export function PlacesMap({ places, out, coins, onBuy, onGo }: PlacesMapProps) {
  const [asking, setAsking] = useState<PlaceVM | null>(null);
  const here = petsByPlace(out);
  return (
    <section class={s.places} aria-labelledby="shelf-places">
      <SectionHeader id="shelf-places" title={SHELF_COPY.places} class={s.sectionHead} />
      <ul class={s.map}>
        {places.map((p) => {
          const n = here.get(p.id) ?? 0;
          return (
            <li key={p.id} class={s.placeCard} data-place-card={p.id} data-owned={p.owned ? '' : undefined}>
              <div class={s.placeArt}>
                <PlaceArt place={p.id} locked={!p.owned} price={p.price} width="100%" title={p.name} />
              </div>
              <div class={s.placeBody}>
                <h3 class={s.placeName}>{p.name}</h3>
                <p class={s.placeBlurb}>{p.blurb}</p>
                <p class={s.placeFacts}>
                  {p.owned ? (
                    <>
                      <Pill tone="sage" size="sm">
                        {p.price === 0 ? PLACE_LINES.free : SHELF_COPY.placeMap.opened}
                      </Pill>
                      {n > 0 && <span>{fillLine(SHELF_COPY.placeMap.here, { count: num(n) })}</span>}
                    </>
                  ) : (
                    <span>{PLACE_LINES.room}</span>
                  )}
                </p>
                {p.owned ? (
                  <Button variant="quiet" size="sm" iconRight="chevron-right" onClick={() => onGo(p.id)} aria-label={fillLine(SHELF_COPY.placeMap.go, { place: placePhrase(p.id) })}>
                    {SHELF_COPY.placeMap.visit}
                  </Button>
                ) : p.canAfford ? (
                  <Button size="sm" onClick={() => setAsking(p)} data-open-place={p.id}>
                    {openForLine(p.price)}
                  </Button>
                ) : (
                  <p class={s.placeShort}>{shortLine(p.id, p.price, coins)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={asking !== null}
        title={asking ? fillLine(SHELF_COPY.placeMap.confirm, { place: placePhrase(asking.id) }) : ''}
        art={asking ? <PlaceArt place={asking.id} width={220} /> : undefined}
        message={asking ? `${asking.blurb} ${PLACE_LINES.room}.` : undefined}
        confirmLabel={asking ? openForLine(asking.price) : ''}
        cancelLabel={PET_CARD.buttons.notNow}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          const p = asking;
          setAsking(null);
          if (p) onBuy(p.id);
        }}
      />
    </section>
  );
}

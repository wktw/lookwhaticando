import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { PET_CARD, PLACE_LINES, fillLine } from '@/catalog/lines';
import { num, placePhrase } from '@/catalog/format';
import { PlaceArt } from '@/art/scene';
import { shelfView, walletView, type PlaceVM } from '@/state/selectors';
import { state } from '@/state/store';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { SectionHeader } from '@/ui/SectionHeader';
import { SHELF_COPY, jarLine, openForLine, priceLine } from './copy';
import { petsByPlace } from './model';
import { stable } from './stable';
import s from './ShelfScreen.module.css';

/** What the map draws: the places, how many pets are in each, and the jar (only while it matters). */
export const placesMap = stable(() => {
  const v = shelfView.value;
  const here = petsByPlace(v.out);
  const places = v.places.map((p) => ({ ...p, here: here.get(p.id) ?? 0 }));
  const short = places.some((p) => !p.owned && !p.canAfford);
  return { places, jar: short && !state.value.settings.quietRewards ? walletView.value.coins : null };
});

export interface PlacesMapProps {
  onBuy: (place: PlaceId) => void;
  onGo: (place: PlaceId) => void;
}

/**
 * The places map (DESIGN §8.4, VOICE §11): every place as a picture in the hour's light. An opened
 * place says who is there and takes her to it; a place not yet opened shows its price and the room
 * it adds, with "Open for 400 coins" once the jar holds enough (asked once more before the coins go).
 * What is in the jar is said once, under the heading, while a place is still out of reach.
 */
export const PlacesMap = memo(function PlacesMap({ onBuy, onGo }: PlacesMapProps) {
  const [asking, setAsking] = useState<PlaceVM | null>(null);
  const { places, jar } = placesMap.value;
  return (
    <section class={s.places} aria-labelledby="shelf-places">
      <SectionHeader id="shelf-places" title={SHELF_COPY.places} class={s.sectionHead} />
      {jar !== null && <p class={s.placesJar}>{jarLine(jar)}</p>}
      <ul class={s.map}>
        {places.map((p) => (
          <li key={p.id} class={s.placeCard} data-place-card={p.id} data-owned={p.owned ? '' : undefined}>
            <div class={s.placeArt}>
              <PlaceArt place={p.id} locked={!p.owned} price={p.price} width="100%" title={p.name} />
            </div>
            <div class={s.placeBody}>
              <h3 class={s.placeName}>{p.name}</h3>
              <p class={s.placeBlurb}>{p.blurb}</p>
              {p.owned ? (
                p.here > 0 && <p class={s.placeFacts}>{fillLine(SHELF_COPY.placeMap.here, { count: num(p.here) })}</p>
              ) : (
                <p class={s.placeFacts}>
                  {/* The picture's badge shows the price; this says it to VoiceOver (the art is named by the place). */}
                  <span class="sr-only">{`${priceLine(p.price)}. `}</span>
                  <span>{PLACE_LINES.room}</span>
                </p>
              )}
              {p.owned ? (
                <Button variant="quiet" size="sm" iconRight="chevron-right" onClick={() => onGo(p.id)} aria-label={fillLine(SHELF_COPY.placeMap.go, { place: placePhrase(p.id) })}>
                  {SHELF_COPY.placeMap.visit}
                </Button>
              ) : (
                p.canAfford && (
                  <Button size="sm" onClick={() => setAsking(p)} data-open-place={p.id}>
                    {openForLine(p.price)}
                  </Button>
                )
              )}
            </div>
          </li>
        ))}
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
});

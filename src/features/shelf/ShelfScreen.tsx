/**
 * The Shelf tab (DESIGN §9.4): the home. The Sill first, then each opened place, scrolling sideways
 * at pet eye level in the real Windowlight (the lamp after dark). The pets out roam by species,
 * personality and the hour; a tap gets a look up and a name tag that opens the Pet Card, and a stroke,
 * a boop or a carry pays the (capped) friendship through `petPet`. Under the scene: the line from the
 * sill, the places to jump to, Decorate and Basket, then the pets, the Field Guide and the places map.
 */
import { computed } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { EMPTY, fillLine } from '@/catalog/lines';
import { SPECIES_VOICE } from '@/catalog/personalities';
import { ShelfScene, type EditDecor, type PetGesture, type ShelfSceneHandle } from '@/art/scene';
import { CoinIcon } from '@/art/icons';
import { memoryShelfView, petsView, plantVM, shelfView, todayView, walletView } from '@/state/selectors';
import { buyPlace, moveDecor, now, petPet, placeDecor, removeDecor, state, storeLocal, today } from '@/state/store';
import { openHabitDetail, openPetCard } from '@/features/habits/open';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { announce, announceSettled } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { prefersReducedMotion } from '@/fx/motion';
import { foundLine } from '@/fx/copy';
import { SHELF_COPY, decorLabel, openedLine, placeName, shortLine } from './copy';
import { captionFor, idleContext, touchContext } from './captions';
import { decorCounts, MAX_DECOR_PER_PLACE, newDecorSpot, pantryRows, placeInView, retiredPots, scrollToSegment, shelfDecor, shelfPets, shelfPots, sillExtras, speciesOfId, type RestingPot } from './model';
import { PetRoster } from './PetRoster';
import { PlacesMap } from './PlacesMap';
import { DecorTray } from './DecorTray';
import { BasketSheet } from './BasketSheet';
import { FieldGuideCard, FieldGuideSheet } from './FieldGuide';
import { ShelfTools } from './ShelfTools';
import s from './ShelfScreen.module.css';

/** Paused habits keep their pots on the sill: drawn as they stand (Today's lists leave them out). */
const restingPots = computed<RestingPot[]>(() => {
  const st = state.value;
  const paused = todayView.value.paused;
  if (!paused) return [];
  const ids = new Set(paused.habits.map((h) => h.id));
  return st.habits
    .filter((h) => ids.has(h.id))
    .map((h) => {
      const p = plantVM(st, h, today.value, storeLocal());
      return { habitId: h.id, name: h.name, species: h.plant, pot: h.pot, stage: p.displayStage, progress: p.progress, blooms: p.blooms };
    });
});

/** The scene's inputs, recomputed only when their views change (not on every screen render). */
const scenePots = computed(() => shelfPots(state.value.habits, todayView.value.sill, restingPots.value));
const scenePets = computed(() => shelfPets(shelfView.value.out, state.value.pets));
const sceneDecor = computed(() => shelfDecor(shelfView.value.decor));
const scenePlaces = computed(() => shelfView.value.places.filter((p) => p.owned && p.id !== 'sill').map((p) => p.id));
const sceneRetired = computed(() => retiredPots(memoryShelfView.value.retired, state.value.ledger.bestStage));
const basketRows = computed(() => pantryRows(state.value.collection, state.value.pantry));

/** "The sill is ready for someone." · "Your first capsule is on the Capsules tab." (VOICE §17). */
const [EMPTY_TITLE, EMPTY_TEXT] = (() => {
  const at = EMPTY.shelf.indexOf('. ') + 1;
  return [EMPTY.shelf.slice(0, at), EMPTY.shelf.slice(at + 1)];
})();

type Sheet = 'basket' | 'guide' | null;

const hourOf = (ms: number) => new Date(ms).getHours();

/**
 * True from the frame after the first paint: the paper below the scene (every pet's portrait, the
 * Field Guide covers, a picture of each place) waits one frame, so the scene arrives first.
 */
function useAfterFirstPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let t = 0;
    const raf = requestAnimationFrame(() => (t = window.setTimeout(() => setReady(true), 0)));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);
  return ready;
}

export function ShelfScreen() {
  const shelf = shelfView.value;
  const pets = petsView.value;
  const vm = todayView.value;
  const coins = walletView.value.coins;
  const sceneRef = useRef<ShelfSceneHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [guidePage, setGuidePage] = useState<string | null>(null);
  const [inView, setInView] = useState<PlaceId>('sill');
  const [caption, setCaption] = useState<string>('');
  const below = useAfterFirstPaint();

  const outById = useMemo(() => new Map(shelf.out.map((p) => [p.id, p])), [shelf.out]);
  const opened = scenePlaces.value;

  /* ---------------- the line from the sill ---------------- */
  // It opens on the closest pet out, doing what the hour has it doing.
  useEffect(() => {
    const id = pets.closest?.id;
    const p = (id ? outById.get(id) : undefined) ?? shelf.out[0];
    if (!p || !p.species) return;
    const hour = hourOf(now.peek());
    setCaption(captionFor({ name: p.name, personality: p.personality, species: p.species, level: p.level }, idleContext(hour), hour));
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = useCallback((line: string) => {
    setCaption(line);
    announceSettled('shelf-caption', line);
  }, []);

  /* ---------------- touch ---------------- */
  const onPet = useCallback(
    (key: string, _rect: DOMRect, gesture: PetGesture) => {
      const p = outById.get(key);
      const species = p?.species ?? speciesOfId(key);
      haptic(gesture === 'carry' ? 'medium' : gesture === 'stroke' ? 'light' : 'tick');
      if (species && (gesture === 'tap' || gesture === 'boop')) sfx.voice(SPECIES_VOICE[species], { pitch: gesture === 'boop' ? 1.12 : 1 });
      // Every touch is friendship (capped by the store); the reaction itself is never capped.
      petPet(key);
      if (gesture === 'tap' && p && species) {
        const hour = hourOf(now.peek());
        say(captionFor({ name: p.name, personality: p.personality, species, level: p.level }, touchContext(hour), hour));
      }
    },
    [outById, say],
  );
  const onOpenPet = useCallback((key: string) => openPetCard(key), []);

  /* ---------------- which place is in view ---------------- */
  const scroller = () => stageRef.current?.querySelector<HTMLElement>('[data-time]') ?? null;
  const segments = () => {
    const el = scroller();
    if (!el) return [];
    const box = el.getBoundingClientRect();
    return Array.from(el.querySelectorAll<HTMLElement>('[data-place]')).map((seg) => {
      const r = seg.getBoundingClientRect();
      return { id: seg.dataset.place as PlaceId, left: r.left - box.left + el.scrollLeft, width: r.width };
    });
  };
  useEffect(() => {
    const el = scroller();
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      setInView(placeInView(segments(), el.scrollLeft, el.clientWidth));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
    // The places change the segments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened.join()]);

  // The opening frame shows a pet: if the light opened it on an empty stretch, bring the closest pet in.
  useEffect(() => {
    const el = scroller();
    if (!el || !shelf.out.length) return;
    const raf = requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      const actors = Array.from(el.querySelectorAll<HTMLElement>('[data-pet]'));
      // At least one pet wholly in frame, not just a tail at the edge.
      const inFrame = actors.some((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.left >= box.left + 8 && r.right <= box.right - 8;
      });
      if (inFrame || !actors.length) return;
      const first = actors.find((a) => a.dataset.pet === pets.closest?.id && a.getBoundingClientRect().width > 0) ?? actors[0]!;
      const r = first.getBoundingClientRect();
      el.scrollLeft = Math.max(0, el.scrollLeft + r.left - box.left - (box.width - r.width) / 2);
    });
    return () => cancelAnimationFrame(raf);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback((place: PlaceId, { page = false } = {}) => {
    const el = scroller();
    if (!el) return;
    const seg = segments().find((x) => x.id === place);
    if (!seg) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (page) stageRef.current?.scrollIntoView({ behavior, block: 'center' });
    el.scrollTo({ left: scrollToSegment(seg, el.clientWidth, el.scrollWidth - el.clientWidth), behavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- decor edit mode ---------------- */
  const decorById = useMemo(() => new Map(shelf.decor.map((d) => [d.id, d])), [shelf.decor]);
  const edit = useMemo<EditDecor>(
    () => ({
      onMove(key, frac, place) {
        moveDecor(key, { x: frac.x, y: frac.y, place });
        setSelected(key);
      },
      onFlip(key) {
        const d = decorById.get(key);
        if (d) moveDecor(key, { flip: !d.flip });
        setSelected(key);
      },
      onRemove(key) {
        const d = decorById.get(key);
        removeDecor(key);
        setSelected(null);
        if (d) announce(fillLine(SHELF_COPY.decor.removed, { thing: decorLabel(d) }));
      },
    }),
    [decorById],
  );
  // The item she last touched or focused in edit mode: the tray's Flip and Put away act on it.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !editing) return;
    const pick = (e: Event) => {
      const hit = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-edit]');
      if (hit?.dataset.edit) setSelected(hit.dataset.edit);
    };
    el.addEventListener('focusin', pick);
    el.addEventListener('pointerdown', pick);
    return () => {
      el.removeEventListener('focusin', pick);
      el.removeEventListener('pointerdown', pick);
    };
  }, [editing]);
  useEffect(() => {
    if (selected && !decorById.has(selected)) setSelected(null);
  }, [decorById, selected]);
  // Done: focus goes back to Decorate, where she started.
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) stageRef.current?.parentElement?.querySelector<HTMLElement>('[data-decorate]')?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);

  const counts = useMemo(() => decorCounts(shelf.decor), [shelf.decor]);
  const addDecor = (itemId: string, label: string) => {
    const place = inView;
    const n = counts.get(place) ?? 0;
    if (n >= MAX_DECOR_PER_PLACE) return;
    const el = scroller();
    const seg = segments().find((x) => x.id === place);
    // Where she is looking in that place, so the new thing lands in view.
    const spot = newDecorSpot(n);
    const x = el && seg && seg.width > 0 ? Math.min(0.9, Math.max(0.1, (el.scrollLeft + el.clientWidth / 2 - seg.left) / seg.width + (spot.x - 0.5) * 0.3)) : spot.x;
    const id = placeDecor(itemId, place, x, spot.y);
    if (!id) return;
    haptic('tick');
    setSelected(id);
    announce(fillLine(SHELF_COPY.decor.placed, { thing: label, place: placeName(place) }));
  };

  /* ---------------- places ---------------- */
  const onBuy = (place: PlaceId) => {
    const def = shelf.places.find((p) => p.id === place);
    if (!def) return;
    const r = buyPlace(place);
    if (!r.ok) {
      if (r.error === 'not-enough-coins') toast({ message: shortLine(place, def.price, walletView.value.coins), tone: 'butter', key: 'shelf-place' });
      return;
    }
    const first = r.movedIn[0] ? (state.value.pets[r.movedIn[0]]?.name ?? null) : null;
    haptic('success');
    sfx.play('fanfare');
    toast({ message: openedLine(place, first), tone: 'sage', key: 'shelf-place' });
    // Show her the new place: up to the scene, and along to it.
    requestAnimationFrame(() => requestAnimationFrame(() => goTo(place, { page: true })));
  };

  /* ---------------- the sill's extras ---------------- */
  const found = vm.found;
  const foundPet = found ? state.value.pets[found.petId] : undefined;
  const extras = sillExtras(
    { cutting: shelf.cutting, found, letterWaiting: vm.letterWaiting, storyWaiting: vm.storyWaiting, birthday: !!vm.birthday },
    {
      found: () => {
        if (found && foundPet) say(foundLine(foundPet.name, found.seed));
      },
      note: (kind) => {
        if (kind === 'story' && vm.storyWaiting) openHabitDetail(vm.storyWaiting.habitId);
        else location.hash = '#/today';
      },
    },
  );

  const basket = basketRows.value;
  const empty = pets.pets.length === 0;

  return (
    <section class={s.screen} aria-labelledby="shelf-title" data-editing={editing ? '' : undefined}>
      <header class={s.header}>
        <h1 id="shelf-title" class={s.title}>
          {SHELF_COPY.title}
        </h1>
        <p class={s.coins} data-wallet-target="coins">
          <CoinIcon size={22} />
          <span class="num" aria-hidden="true">
            <AnimatedNumber value={coins} walletKind="coins" />
          </span>
          <span class="sr-only">{`${coins} ${coins === 1 ? 'coin' : 'coins'}`}</span>
        </p>
      </header>

      <div class={s.stage} ref={stageRef}>
        <ShelfScene
          ref={sceneRef}
          class={s.scene}
          pots={scenePots.value}
          pets={scenePets.value}
          decor={sceneDecor.value}
          coins={coins}
          places={opened}
          retired={sceneRetired.value}
          label={SHELF_COPY.sceneLabel}
          // While she arranges things the pets are just there: the things are the buttons.
          onPet={editing ? undefined : onPet}
          onOpenPet={editing ? undefined : onOpenPet}
          interactive={!editing}
          editDecor={editing ? edit : undefined}
          {...extras}
        />
      </div>

      <p class={s.caption} data-caption>
        {caption}
      </p>

      {editing ? (
        <DecorTray
          place={inView}
          inventory={shelf.inventory}
          count={counts.get(inView) ?? 0}
          selected={selected ? (decorById.get(selected) ?? null) : null}
          onAdd={addDecor}
          onFlip={(id) => edit.onFlip(id)}
          onRemove={(id) => edit.onRemove(id)}
          onDone={() => {
            setEditing(false);
            setSelected(null);
          }}
        />
      ) : (
        <ShelfTools places={['sill', ...opened]} inView={inView} onGo={(p) => goTo(p)} onDecorate={() => setEditing(true)} onBasket={() => setSheet('basket')} />
      )}

      {!below ? null : empty ? (
        <EmptyState
          class={s.empty}
          title={EMPTY_TITLE}
          action={
            <Button variant="secondary" onClick={() => (location.hash = '#/capsules')}>
              {SHELF_COPY.capsules}
            </Button>
          }
        >
          {EMPTY_TEXT}
        </EmptyState>
      ) : (
        <PetRoster out={shelf.out} indoors={shelf.indoors} capacity={shelf.capacity} onOpen={openPetCard} />
      )}

      {below && (
        <div class={s.lower}>
          <FieldGuideCard
            onOpen={(page) => {
              setGuidePage(page);
              setSheet('guide');
            }}
          />
          <PlacesMap places={shelf.places} out={shelf.out} coins={coins} onBuy={onBuy} onGo={(p) => goTo(p, { page: true })} />
        </div>
      )}

      <BasketSheet open={sheet === 'basket'} rows={basket} coins={coins} onClose={() => setSheet(null)} />
      <FieldGuideSheet open={sheet === 'guide'} page={guidePage} onPage={setGuidePage} onClose={() => setSheet(null)} />
    </section>
  );
}

export default ShelfScreen;

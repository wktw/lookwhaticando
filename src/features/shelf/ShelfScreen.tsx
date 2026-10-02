/**
 * The Shelf tab (DESIGN §9.4): the home. The Sill first, then each opened place, scrolling sideways
 * at pet eye level in the real Windowlight (the lamp after dark). The pets out roam by species,
 * personality and the hour; a tap gets a look up and a name tag that opens the Pet Card, and a stroke,
 * a boop or a carry pays the (capped) friendship through `petPet`. Under the scene: the line from the
 * sill, the places to jump to, Decorate and Basket, then the pets, the Field Guide and the places map.
 *
 * Render cost: a touch pays XP, so the store's views change on nearly every tap. The screen itself
 * reads no view as a whole: each part below reads the few values it draws through `stable` computeds
 * (./stable.ts) and is a `memo` component, so an XP change re-renders only what shows XP (the Pet
 * Card), never the scene, the pots or the paper below.
 */
import { plantPresentation } from '@/state/views/plantPresentation';
import { computed, useSignal } from '@preact/signals';
import { memo } from 'preact/compat';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { PlaceId } from '@/catalog/types';
import { EMPTY, FOUND_THINGS, TODAY_LINES, capitalise, fillLine, withArticle } from '@/catalog/lines';
import { ShelfScene, type EditDecor, type PetGesture, type ShelfSceneHandle } from '@/art/scene';
import { CoinIcon } from '@/art/icons';
import { memoryShelfView, petsView, shelfView, todayView, walletView } from '@/state/selectors';
import { buyPlace, moveDecor, now, petPet, placeDecor, removeDecor, state, storeLocal, today } from '@/state/store';
import { openHabitDetail, openPetCard } from '@/features/habits/open';
import { PLACE_SEGMENT, replaceRest, routeRest } from '@/app/router';
import { openRitual } from '@/features/rituals/open';
import { petVoice } from '@/features/pets/voice';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { SectionHeader } from '@/ui/SectionHeader';
import { announce, announceSettled } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { prefersReducedMotion } from '@/fx/motion';
import { foundLine } from '@/fx/copy';
import { SHELF_COPY, decorLabel, openedLine, placeName, shortLine } from './copy';
import { captionFor, idleContext, touchContext } from './captions';
import { decorCounts, decorXAtView, MAX_DECOR_PER_PLACE, newDecorSpot, placeInView, retiredPots, scrollToSegment, shelfDecor, shelfPets, shelfPots, sillExtras, speciesOfId, type RestingPot } from './model';
import { basketRows } from './BasketSheet';
import { stable } from './stable';
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
      const { resident: _resident, ...plant } = plantPresentation(st, h.id, { today: today.value, now: now.value, local: storeLocal() })!;
      return { habitId: h.id, name: h.name, ...plant };
    });
});

/* The scene's inputs: each keeps its value (the same reference) until what the scene draws changes. */
export const scenePots = stable(() => shelfPots(state.value.habits, todayView.value.sill, restingPots.value));
export const scenePets = stable(() => shelfPets(shelfView.value.out, state.value.pets));
const sceneDecor = stable(() => shelfDecor(shelfView.value.decor));
const scenePlaces = stable(() => shelfView.value.places.filter((p) => p.owned && p.id !== 'sill').map((p) => p.id));
export const sceneRetired = stable(() => retiredPots(memoryShelfView.value.retired, state.value, { today: today.value, now: now.value, local: storeLocal() }));
const sceneCoins = computed(() => walletView.value.coins);
const extrasInput = stable(() => {
  const vm = todayView.value;
  const found = vm.found;
  const letter = vm.letterWaiting;
  const story = vm.storyWaiting;
  return {
    cutting: shelfView.value.cutting,
    found,
    foundName: found ? (state.value.pets[found.petId]?.name ?? null) : null,
    letterWaiting: letter ? { id: letter.id, kind: letter.kind } : null,
    storyWaiting: story ? { habitId: story.habitId } : null,
    storyHabit: story ? (state.value.habits.find((h) => h.id === story.habitId)?.name ?? '') : '',
    birthday: !!vm.birthday,
  };
});
/**
 * What the screen's own chrome shows: whether anyone lives here, whether there is a thing to arrange
 * (owned or placed decor, a keepsake), and whether the basket has a treat for someone (the starter
 * treats wait until the first pet comes home).
 */
export const shelfChrome = stable(() => {
  const shelf = shelfView.value;
  const rows = basketRows.value;
  const anyone = petsView.value.pets.length > 0;
  return {
    anyone,
    decor: shelf.inventory.length > 0 || shelf.decor.length > 0,
    treats: anyone && rows.basket.length + rows.pantry.length > 0,
  };
});

/** "The sill is ready for someone." · "Your first capsule is on the Capsules tab." (VOICE §17). */
const [EMPTY_TITLE, EMPTY_TEXT] = (() => {
  const at = EMPTY.shelf.indexOf('. ') + 1;
  return [EMPTY.shelf.slice(0, at), EMPTY.shelf.slice(at + 1)];
})();

type Sheet = 'basket' | 'guide' | null;

const hourOf = (ms: number) => new Date(ms).getHours();

/** The scrolling scene element (ScrollFrame's `[data-time]`), and its place segments in its own px. */
const scrollerIn = (stage: HTMLElement | null) => stage?.querySelector<HTMLElement>('[data-time]') ?? null;
function segmentsIn(el: HTMLElement | null) {
  if (!el) return [];
  const box = el.getBoundingClientRect();
  return Array.from(el.querySelectorAll<HTMLElement>('[data-place]')).map((seg) => {
    const r = seg.getBoundingClientRect();
    return { id: seg.dataset.place as PlaceId, left: r.left - box.left + el.scrollLeft, width: r.width };
  });
}

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

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

interface StageProps {
  sceneRef: RefObject<ShelfSceneHandle>;
  editing: boolean;
  edit: EditDecor;
  onPet: (key: string, rect: DOMRect, gesture: PetGesture) => void;
  onOpenPet: (key: string) => void;
  onFound: () => void;
  onNote: (kind: 'letter' | 'story') => void;
}

/** The ShelfScene with the household: re-renders only when what it draws changes. */
const Stage = memo(function Stage({ sceneRef, editing, edit, onPet, onOpenPet, onFound, onNote }: StageProps) {
  const input = extrasInput.value;
  const extras = useMemo(() => {
    const labels: { found?: string; note?: string } = {};
    if (input.found && input.foundName) {
      const thing = FOUND_THINGS[Math.abs(Math.trunc(input.found.seed)) % FOUND_THINGS.length]!;
      labels.found = fillLine(SHELF_COPY.foundLabel, { A: capitalise(withArticle(thing)), name: input.foundName });
    }
    if (input.letterWaiting) labels.note = TODAY_LINES.letterWaiting[input.letterWaiting.kind];
    else if (input.storyWaiting) labels.note = fillLine(TODAY_LINES.storyWaiting, { habit: input.storyHabit });
    return sillExtras(input, { found: onFound, note: onNote }, labels);
  }, [input, onFound, onNote]);
  return (
    <ShelfScene
      ref={sceneRef}
      class={s.scene}
      pots={scenePots.value}
      pets={scenePets.value}
      decor={sceneDecor.value}
      coins={sceneCoins.value}
      places={scenePlaces.value}
      retired={sceneRetired.value}
      label={SHELF_COPY.sceneLabel}
      // While she arranges things the pets are just there: the things are the buttons.
      onPet={editing ? undefined : onPet}
      onOpenPet={editing ? undefined : onOpenPet}
      interactive={!editing}
      editDecor={editing ? edit : undefined}
      {...extras}
    />
  );
});

/** The coins in the header (the sidebar's wallet shows them on wide screens). */
function Coins() {
  const coins = sceneCoins.value;
  if (state.value.settings.quietRewards) return null;
  return (
    <p class={s.coins} data-wallet-target="coins">
      <CoinIcon size={22} />
      <span class="num" aria-hidden="true">
        <AnimatedNumber value={coins} walletKind="coins" />
      </span>
      <span class="sr-only">{`${coins} ${coins === 1 ? 'coin' : 'coins'}`}</span>
    </p>
  );
}

/** Decor edit mode's tray, reading the placed things and her inventory itself. */
function EditTray({ place, selected, focusItem, onAdd, onFlip, onRemove, onDone }: { place: PlaceId; selected: string | null; focusItem: string | null; onAdd: (itemId: string, label: string) => void; onFlip: (id: string) => void; onRemove: (id: string) => void; onDone: () => void }) {
  const shelf = shelfView.value;
  const count = shelf.decor.filter((d) => d.place === place).length;
  return (
    <DecorTray
      place={place}
      inventory={shelf.inventory}
      count={count}
      placedAnywhere={shelf.decor.length}
      selected={selected ? (shelf.decor.find((d) => d.id === selected) ?? null) : null}
      focusItem={focusItem}
      onAdd={onAdd}
      onFlip={onFlip}
      onRemove={onRemove}
      onDone={onDone}
    />
  );
}

const EmptyPets = memo(function EmptyPets() {
  const quiet = state.value.settings.quietRewards;
  return (
    <section class={s.roster} aria-labelledby="shelf-pets">
      <SectionHeader id="shelf-pets" title={SHELF_COPY.pets} class={s.sectionHead} />
      <EmptyState
        title={EMPTY_TITLE}
        action={
          !quiet && <Button variant="secondary" onClick={() => (location.hash = '#/capsules')}>
            {SHELF_COPY.capsules}
          </Button>
        }
      >
        {!quiet && EMPTY_TEXT}
      </EmptyState>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export function ShelfScreen() {
  const sceneRef = useRef<ShelfSceneHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Arriving with a thing to place ('#/shelf/place/<itemId>', a reveal's "Find it a place"; WP-C7):
  // edit mode, with that thing ready in the tray. Taken in once; the route goes back to plain Shelf.
  const [arriving] = useState<string | null>(() => {
    const [head, itemId] = routeRest.peek();
    if (head !== PLACE_SEGMENT) return null;
    replaceRest('shelf', []);
    return itemId && shelfView.peek().inventory.some((i) => i.itemId === itemId) ? itemId : null;
  });
  const [editing, setEditing] = useState(arriving !== null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [guidePage, setGuidePage] = useState<string | null>(null);
  const [inView, setInView] = useState<PlaceId>('sill');
  // The line from the sill: a signal bound straight into the text, so a new line re-renders nothing.
  const caption = useSignal('');
  const below = useAfterFirstPaint();
  const opened = scenePlaces.value;
  const show = shelfChrome.value;

  /* ---------------- the line from the sill ---------------- */
  // It opens on the closest pet out, doing what the hour has it doing.
  const openingPet = useMemo(() => {
    const out = shelfView.peek().out;
    const id = petsView.peek().closest?.id;
    return (id ? out.find((p) => p.id === id) : undefined) ?? out[0] ?? null;
  }, []);
  useEffect(() => {
    const p = openingPet;
    if (!p || !p.species) return;
    const hour = hourOf(now.peek());
    caption.value = captionFor({ name: p.name, personality: p.personality, species: p.species, level: p.level }, idleContext(hour), hour);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = useCallback((line: string) => {
    caption.value = line;
    announceSettled('shelf-caption', line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- touch ---------------- */
  // Stable for the screen's life: it reads the household when a touch comes, not at render.
  const onPet = useCallback((key: string, _rect: DOMRect, gesture: PetGesture) => {
    const p = shelfView.peek().out.find((x) => x.id === key);
    const species = p?.species ?? speciesOfId(key);
    const hour = hourOf(now.peek());
    haptic(gesture === 'carry' ? 'medium' : gesture === 'stroke' ? 'light' : 'tick');
    petVoice(species, gesture, hour);
    // Every touch is friendship (capped by the store); the reaction itself is never capped.
    petPet(key);
    if (gesture === 'tap' && p && species) say(captionFor({ name: p.name, personality: p.personality, species, level: p.level }, touchContext(hour), hour));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onOpenPet = useCallback((key: string) => openPetCard(key), []);

  /* ---------------- which place is in view ---------------- */
  const scroller = () => scrollerIn(stageRef.current);
  const segments = () => segmentsIn(scroller());
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
  }, [opened]);

  // The opening frame shows the pet the caption names, wholly: if the light opened the scene with it
  // cut off or out of view, bring it to the middle.
  useEffect(() => {
    const el = scroller();
    if (!el || !openingPet) return;
    const raf = requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      const actor = Array.from(el.querySelectorAll<HTMLElement>('[data-pet]')).find((a) => a.dataset.pet === openingPet.id && a.getBoundingClientRect().width > 0);
      if (!actor) return;
      const r = actor.getBoundingClientRect();
      if (r.left >= box.left + 8 && r.right <= box.right - 8) return;
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
  const decorOf = (key: string) => shelfView.peek().decor.find((d) => d.id === key);
  const edit = useMemo<EditDecor>(
    () => ({
      onMove(key, frac, place) {
        moveDecor(key, { x: frac.x, y: frac.y, place });
        setSelected(key);
      },
      onFlip(key) {
        const d = decorOf(key);
        if (d) moveDecor(key, { flip: !d.flip });
        setSelected(key);
      },
      onRemove(key) {
        const d = decorOf(key);
        removeDecor(key);
        setSelected(null);
        if (d) announce(fillLine(SHELF_COPY.decor.removed, { thing: decorLabel(d) }));
      },
      // Each thing by its own name (a keepsake by what it is), and the keys in the deck's words.
      label(key) {
        const d = decorOf(key);
        return d ? decorLabel(d) : '';
      },
      hint: SHELF_COPY.decor.keys,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
  // Done: focus goes back to Decorate, where she started.
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) stageRef.current?.parentElement?.querySelector<HTMLElement>('[data-decorate]')?.focus({ preventScroll: true });
    wasEditing.current = editing;
  }, [editing]);

  const addDecor = (itemId: string, label: string) => {
    const place = inView;
    const n = decorCounts(shelfView.peek().decor).get(place) ?? 0;
    if (n >= MAX_DECOR_PER_PLACE) return;
    const el = scroller();
    const seg = segments().find((x) => x.id === place);
    // Where she is looking in that place, on the floor the scene keeps its fractions on (for the Sill,
    // its natural length for the pots), nudged a little so a few in a row don't stack.
    const spot = newDecorSpot(n);
    const unit = el ? el.clientHeight / 100 : 0;
    const x = el && seg && unit > 0 ? decorXAtView(place, scenePots.peek().length, (el.scrollLeft + el.clientWidth / 2) / unit, seg.left / unit, (spot.x - 0.5) * 0.12) : spot.x;
    const id = placeDecor(itemId, place, x, spot.y);
    if (!id) return;
    haptic('tick');
    setSelected(id);
    announce(fillLine(SHELF_COPY.decor.placed, { thing: label, place: placeName(place) }));
  };

  /* ---------------- places ---------------- */
  const onBuy = useCallback((place: PlaceId) => {
    const def = shelfView.peek().places.find((p) => p.id === place);
    if (!def) return;
    const r = buyPlace(place);
    if (!r.ok) {
      if (r.error === 'not-enough-coins') toast({ message: shortLine(place, def.price, walletView.peek().coins, state.peek().settings.quietRewards), tone: 'butter', key: 'shelf-place' });
      return;
    }
    const first = r.movedIn[0] ? (state.peek().pets[r.movedIn[0]]?.name ?? null) : null;
    haptic('success');
    sfx.play('fanfare');
    toast({ message: openedLine(place, first), tone: 'sage', key: 'shelf-place' });
    // Show her the new place: up to the scene, and along to it.
    requestAnimationFrame(() => requestAnimationFrame(() => goTo(place, { page: true })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onGoPage = useCallback((p: PlaceId) => goTo(p, { page: true }), [goTo]);

  /* ---------------- the sill's extras ---------------- */
  const onFound = useCallback(() => {
    const found = todayView.peek().found;
    const pet = found ? state.peek().pets[found.petId] : undefined;
    if (found && pet) say(foundLine(pet.name, found.seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onNote = useCallback((kind: 'letter' | 'story') => {
    const vm = todayView.peek();
    if (kind === 'story' && vm.storyWaiting) openHabitDetail(vm.storyWaiting.habitId);
    else if (vm.letterWaiting) openRitual(vm.letterWaiting.id, { fromSill: true });
  }, []);

  const onOpenGuide = useCallback((page: string | null) => {
    setGuidePage(page);
    setSheet('guide');
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  return (
    <section class={s.screen} aria-labelledby="shelf-title" data-editing={editing ? '' : undefined}>
      <header class={s.header}>
        <h1 id="shelf-title" class={s.title}>
          {SHELF_COPY.title}
        </h1>
        <Coins />
      </header>

      <div class={s.stage} ref={stageRef}>
        <Stage sceneRef={sceneRef} editing={editing} edit={edit} onPet={onPet} onOpenPet={onOpenPet} onFound={onFound} onNote={onNote} />
      </div>

      <p class={s.caption} data-caption>
        {caption}
      </p>

      {editing ? (
        <EditTray
          place={inView}
          selected={selected}
          focusItem={arriving}
          onAdd={addDecor}
          onFlip={(id) => edit.onFlip(id)}
          onRemove={(id) => edit.onRemove(id)}
          onDone={() => {
            setEditing(false);
            setSelected(null);
          }}
        />
      ) : (
        <ShelfTools places={['sill', ...opened]} inView={inView} onGo={goTo} onDecorate={show.decor ? () => setEditing(true) : undefined} onBasket={show.treats ? () => setSheet('basket') : undefined} />
      )}

      {!below ? null : show.anyone ? <PetRoster onOpen={openPetCard} /> : <EmptyPets />}

      {below && (
        <div class={s.lower}>
          <FieldGuideCard onOpen={onOpenGuide} />
          <PlacesMap onBuy={onBuy} onGo={onGoPage} />
        </div>
      )}

      <BasketSheet open={sheet === 'basket'} onClose={closeSheet} />
      <FieldGuideSheet open={sheet === 'guide'} page={guidePage} onPage={setGuidePage} onClose={closeSheet} />
    </section>
  );
}

export default ShelfScreen;

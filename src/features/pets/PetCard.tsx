/**
 * The Pet Card (DESIGN §8.2, §8.5, §9.4, §14.1; VOICE §9, §11, §13): an adoption profile you can
 * touch. The portrait answers the gesture buttons (every gesture on the Shelf has one here); then
 * friendship, Likes · Known for · Favourite spot · Best friend · Came home, which habit it keeps
 * company, the pantry, the wardrobe (with a live preview), where it spends the day, and Memories.
 */
import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COMPANION, EMPTY, PET_CARD, capitalise, fillLine, pickLine, plantPhrase } from '@/catalog/lines';
import { getCollectible } from '@/catalog/collectibles';
import { choseLine, movedToPlaceLine } from '@/catalog/format';
import { WEARABLE_SLOTS, type PlaceId, type WearableSlot } from '@/catalog/types';
import { PetArt } from '@/art/pets/PetArt';
import type { Expression } from '@/art/pets/types';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CardPlant } from '@/art/plants/CardPlant';
import { useArtLight } from '@/art/scene';
import { reactionFor } from '@/art/scene/actors/touch';
import { Icon } from '@/art/icons';
import type { PetVM, ShelfVM } from '@/state/selectors';
import type { Habit, PetMemory } from '@/state/types';
import { bakeTray, feedPet, letPetChoose, petPet, renamePet, saveEpoch, setCompanion, setOutfit, setPetPlace, state, toggleFavoritePet, togglePetOut, today } from '@/state/store';
import { BAKE } from '@/domain/pantry';
import { MAX_PET_NAME } from '@/domain/friendship';
import { nameIdeas } from '@/features/capsules/names';
import { openHabitEditor, type PetIntent } from '@/features/habits/open';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { IconButton } from '@/ui/IconButton';
import { Segmented } from '@/ui/Segmented';
import { TextField } from '@/ui/TextField';
import { Toggle } from '@/ui/Toggle';
import { announceSettled } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { FitObject } from '@/features/shelf/FitObject';
import { useSame } from '@/features/shelf/stable';
import { petVoice } from './voice';
import { FEED_ROW, PET_CARD_UI, PlacePhrase, boopLabel, keepOrder, keepsakeCaption, keepsLine, knownForLine, levelLine, levelName, likesLine, memoryEntries, memoryLine, servingsLine, spotLine, withName } from './petCopy';
import s from './PetCard.module.css';

export interface PetCardProps {
  pet: PetVM;
  /** The Shelf's places (owned, with room), for "Move {name}". */
  places: ShelfVM['places'];
  /** Pets out, for the room left in each place. */
  out: ShelfVM['out'];
  capacity: number;
  /**
   * What the card was opened to do (WP-C7): 'findPlant' opens the plant chooser (or, with no live
   * habit, says how a plant comes) and 'feed' the Feed row, each with focus in it. Read once, when
   * the card mounts: the host mounts a card per request.
   */
  intent?: PetIntent;
}

type Gesture = 'tap' | 'stroke' | 'boop' | 'carry';
type Say = (line: string) => void;
type React_ = (e: Expression, ms: number) => void;
type Caption = (context: 'fed' | 'fedFavourite' | 'newWear' | 'tap', slots: Record<string, string>) => string;

const recent: string[] = [];
let seed = Math.floor(Math.random() * 100_000);

/**
 * Render cost: a gesture pays XP, so the card's `pet` is new on every press. The portrait and the
 * friendship row show that; every other section is a `memo` of the few fields it draws, with its
 * handlers stable (they read the pet as it is now through a ref), so a stroke re-renders the top of
 * the card only.
 */
export function PetCard({ pet, places, out, capacity, intent }: PetCardProps) {
  const light = useArtLight();
  const habits = useSame(state.value.habits.filter((h) => h.archivedOn === undefined).map((h): HabitLite => ({ id: h.id, name: h.name, plant: h.plant, pot: h.pot, companionId: h.companionId })));
  const species = pet.species;
  const [expression, setExpression] = useState<Expression>('rest');
  const [bounce, setBounce] = useState(0);
  const [held, setHeld] = useState(false);
  const [caption, setCaption] = useState<string>('');
  const [preview, setPreview] = useState<{ slot: WearableSlot; id: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const live = useRef(pet);
  live.current = pet;
  useEffect(() => () => clearTimeout(timer.current), []);

  const say = useCallback<Say>((line) => {
    setCaption(line);
    announceSettled('pet-card', line);
  }, []);
  const show = useCallback<React_>((e, ms) => {
    clearTimeout(timer.current);
    setExpression(e);
    setBounce((b) => b + 1);
    timer.current = setTimeout(() => setExpression('rest'), ms);
  }, []);
  const caption_ = useCallback<Caption>((context, slots) => {
    const p = live.current;
    const t = pickLine(context, p.personality, p.species ?? 'cat', ++seed, recent, { level: p.level });
    recent.push(t);
    if (recent.length > 5) recent.shift();
    return fillLine(t, { name: p.name, ...slots });
  }, []);

  /* ---------------- gestures ---------------- */
  const gesture = (g: Gesture) => {
    const r = reactionFor(g, species ?? 'cat', false);
    haptic(g === 'stroke' ? 'light' : 'tick');
    petVoice(species, g, new Date().getHours());
    if (g === 'carry') setHeld((h) => !h);
    else show(r.expression, r.ms || 900);
    if (g !== 'carry' || !held) petPet(pet.id);
    if (g === 'tap') say(caption_('tap', {}));
  };

  /* ---------------- outfit ---------------- */
  const outfit = useMemo(() => {
    const o: Partial<Record<WearableSlot, string>> = {};
    for (const slot of WEARABLE_SLOTS) {
      const id = preview?.slot === slot ? preview.id : pet.outfit[slot];
      if (id) o[slot] = id;
    }
    return o;
  }, [pet.outfit, preview]);

  const level = levelName(pet.level);
  const line = levelLine(pet.name, pet.level, species, pet.napFriend ? (state.value.pets[pet.napFriend]?.name ?? null) : null);
  const coins = state.value.wallet.coins;
  const treats = useSame(pet.treats);
  const wardrobe = useSame(pet.wardrobe);
  const wearing = useSame(pet.outfit);
  const memories = useSame(memoryEntries(pet));
  const keepsakes = useSame(pet.keepsakes);
  const about = useSame({ likes: likesLine(pet.likes), knownFor: knownForLine(pet.company, pet.species, pet.id), spot: pet.spot, bestFriend: pet.bestFriend ? (state.value.pets[pet.bestFriend]?.name ?? null) : null, cameHome: pet.arrivedOn === today.value ? null : pet.arrivedLabel });
  const whereOut = useSame(out.map((p) => ({ id: p.id, place: p.place })));
  const placesLite = useSame(places.filter((p) => p.owned).map((p) => ({ id: p.id, name: p.name, petsOut: p.petsOut })));

  return (
    <div class={s.card}>
      {/* ---------------- the portrait ---------------- */}
      <div class={s.hero}>
        <div class={cx(s.portrait, held && s.held)} data-bounce={bounce % 2}>
          <PetArt
            petId={pet.id}
            outfit={outfit}
            expression={expression}
            pose={held ? 'carry' : 'sit'}
            fit
            size={150}
            px={150}
            light={light}
            animated
            title={`${pet.name}, ${pet.variant}`}
          />
          {pet.level >= 10 && <span class={s.tag} aria-hidden="true" />}
        </div>
        <p class={s.variant}>
          {pet.variant} · {pet.personalityLabel}
        </p>
        <p class={s.blurb}>{pet.personalityBlurb}</p>
        <div class={s.gestures} role="group" aria-label={pet.name}>
          <Button variant="secondary" size="sm" onClick={() => gesture('tap')}>
            {PET_CARD.buttons.hello}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => gesture('stroke')}>
            {PET_CARD.buttons.stroke}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => gesture('boop')}>
            {boopLabel(species)}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => gesture('carry')} aria-pressed={held}>
            {held ? PET_CARD.buttons.putDown : PET_CARD.buttons.pickUp}
          </Button>
        </div>
        <p class={s.caption}>{caption}</p>
      </div>

      {/* ---------------- friendship ---------------- */}
      <Section id="pc-friendship" title={PET_CARD.fields.friendship}>
        <div class={s.friendship}>
          <span class={s.dots} role="img" aria-label={fillLine(PET_CARD_UI.friendshipAria, { level })}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} class={s.dot} data-on={i < pet.hearts ? '' : undefined} />
            ))}
          </span>
          <span class={s.levelName}>{level}</span>
        </div>
        {/* The level's line, when it says more than the level's name ("New here" · "Humbug is new here." says it twice). */}
        {!line.toLowerCase().includes(level.toLowerCase()) && <p class={s.levelLine}>{line}</p>}
      </Section>

      <About about={about} habits={habits} />
      <Company petId={pet.id} name={pet.name} habitId={pet.company.habitId ?? null} habits={habits} intent={intent} />
      <Feed petId={pet.id} name={pet.name} treats={treats} coins={coins} say={say} onReact={show} caption={caption_} intent={intent} />
      <Wardrobe petId={pet.id} wardrobe={wardrobe} outfit={wearing} preview={preview} onPreview={setPreview} say={say} caption={caption_} />
      <Where petId={pet.id} name={pet.name} isOut={pet.out} place={pet.place} places={placesLite} out={whereOut} capacity={capacity} />
      <Memories memories={memories} keepsakes={keepsakes} habits={habits} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** A titled part of the card: its heading names the region (one name, not a label and a heading). */
function Section({ title, children, id }: { title: string; children: ComponentChildren; id: string }) {
  return (
    <section class={s.section} aria-labelledby={id}>
      <h3 class={s.sectionTitle} id={id}>
        {title}
      </h3>
      {children}
    </section>
  );
}

type HabitLite = Pick<Habit, 'id' | 'name' | 'plant' | 'pot' | 'companionId'>;

interface AboutVM {
  likes: string | null;
  knownFor: string | null;
  spot: PetVM['spot'];
  bestFriend: string | null;
  /** The came-home day's label; null when it is today. */
  cameHome: string | null;
}

const About = memo(function About({ about, habits }: { about: AboutVM; habits: HabitLite[] }) {
  const rows: [string, string | null][] = [
    [PET_CARD.fields.likes, about.likes],
    [PET_CARD.fields.knownFor, about.knownFor],
    [PET_CARD.fields.spot, spotLine(about.spot, habits)],
    [PET_CARD.fields.bestFriend, about.bestFriend],
    // "Came home: today" reads as its own line's second half, capitalised: "Today".
    [PET_CARD.fields.cameHome, about.cameHome ?? capitalise(PET_CARD.cameHomeToday.slice(PET_CARD.cameHomeToday.indexOf(': ') + 2))],
  ];
  return (
    <dl class={s.about}>
      {rows
        .filter((r): r is [string, string] => !!r[1])
        .map(([k, v]) => (
          <div key={k} class={s.aboutRow}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
});

/** How many frames to wait for the card to be on top again before giving focus to a plant. */
const FOCUS_FRAMES = 60;
/** Focus the first button in `box` that can be pressed (of those `only` matches), bringing it into view. */
const focusFirst = (box: HTMLElement | null | undefined, only = 'button') => box?.querySelector<HTMLElement>(`${only}:not([disabled])`)?.focus();

const Company = memo(function Company({ petId, name, habitId, habits, intent }: { petId: string; name: string; habitId: string | null; habits: HabitLite[]; intent?: PetIntent }) {
  // Opened to find a plant (a reveal's "Find {name} a plant"): the chooser is open, with focus on it.
  const finding = intent === 'findPlant' && !habitId;
  const [choosing, setChoosing] = useState(finding);
  const [asking, setAsking] = useState<HabitLite | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (finding) focusFirst(box.current);
    // Once, as the card opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // From the no-habit note, "Add a habit" opens the Habit Editor over the card. When she plants one,
  // the button the editor would give focus back to is gone (the chooser is here now), so focus goes to
  // the chooser's first plant once the card is on top again (no longer inert under the editor).
  const hadHabits = useRef(habits.length > 0);
  useEffect(() => {
    const had = hadHabits.current;
    hadHabits.current = habits.length > 0;
    if (!finding || had || habits.length === 0) return;
    let frames = 0;
    let raf = 0;
    const land = () => {
      const covered = (el: Element | null): boolean => !!el && ((el as HTMLElement).inert || covered(el.parentElement));
      if ((!box.current || covered(box.current)) && ++frames < FOCUS_FRAMES) {
        raf = requestAnimationFrame(land);
        return;
      }
      focusFirst(box.current);
    };
    raf = requestAnimationFrame(land);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.length]);
  const habit = habitId ? habits.find((h) => h.id === habitId) : undefined;
  if (habits.length === 0) {
    // No plant to keep company yet: on the way here from "Find {name} a plant", say how one comes.
    if (!finding) return null;
    return (
      <div class={s.section} ref={box}>
        <p class={s.note}>{withName(PET_CARD_UI.noPlants, name)}</p>
        <div class={s.actions}>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => openHabitEditor()}>
            {EMPTY.addHabit}
          </Button>
        </div>
      </div>
    );
  }
  if (habit) {
    return (
      <section class={s.company} aria-labelledby="pc-company">
        <span class={s.companyArt} aria-hidden="true">
          <CardPlant species={habit.plant} stage={state.value.ledger.bestStage[habit.id] ?? 0} pot={habit.pot} size={56} residentPetId={petId} />
        </span>
        <div class={s.companyText}>
          <h3 class={s.companyTitle} id="pc-company">
            {keepsLine(habit.name)}
          </h3>
          <Button
            variant="quiet"
            size="sm"
            class={s.companyButton}
            onClick={() => {
              if (setCompanion(habit.id, null)) toast({ message: fillLine(COMPANION.movedOut, { name }), tone: 'blush', key: `companion-${petId}` });
            }}
          >
            {withName(COMPANION.moveOut, name)}
          </Button>
        </div>
      </section>
    );
  }
  const other = (h: HabitLite) => (h.companionId && h.companionId !== petId ? (state.value.pets[h.companionId]?.name ?? null) : null);
  const moveIn = (h: HabitLite) => {
    // The celebration host words it: "{name} moved into {plant}."
    if (setCompanion(h.id, petId)) haptic('light');
    setChoosing(false);
  };
  const sorted = [...habits].sort((a, b) => Number(!!a.companionId) - Number(!!b.companionId));
  // No title of its own: the button says it ("Find Humbug a plant"), then the plants to choose from.
  return (
    <div class={s.section} ref={box}>
      {!choosing ? (
        <div class={s.actions}>
          <Button variant="secondary" size="sm" icon="sprout" onClick={() => setChoosing(true)}>
            {withName(PET_CARD.buttons.findPlant, name)}
          </Button>
        </div>
      ) : (
        <ul class={s.chips} aria-label={withName(PET_CARD.buttons.findPlant, name)}>
          {sorted.map((h) => {
            const o = other(h);
            return (
              <li key={h.id}>
                <button type="button" class={s.chip} onClick={() => (o ? setAsking(h) : moveIn(h))}>
                  {h.name}
                  {o && <span class={s.chipNote}>{fillLine(PET_CARD_UI.keptBy, { name: o })}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={asking !== null}
        title={asking ? fillLine(PET_CARD_UI.moveOutAsk, { name: other(asking) ?? '', plant: plantPhrase(asking.name, asking.plant) }) : ''}
        confirmLabel={asking ? withName(COMPANION.moveOut, other(asking) ?? '') : ''}
        cancelLabel={PET_CARD.buttons.notNow}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          const h = asking;
          setAsking(null);
          if (!h) return;
          const o = other(h);
          if (h.companionId && setCompanion(h.id, null) && o) toast({ message: fillLine(COMPANION.movedOut, { name: o }), tone: 'blush', key: `companion-${h.companionId}` });
          moveIn(h);
        }}
      />
    </div>
  );
});

type Treat = PetVM['treats'][number];

/**
 * Feeding and baking, shared by the Feed row's first few and the rest it opens (WP-C7): the same
 * store calls, the same reaction and the same words either way.
 */
function useFeeding(petId: string, name: string, say: Say, onReact: React_, caption: Caption) {
  return useMemo(
    () => ({
      feed(t: Treat) {
        const r = feedPet(petId, t.id);
        const treat = t.name.toLowerCase();
        if (r.reaction === 'full') {
          onReact('blink', 900);
          return say(fillLine(PET_CARD.enough, { name }));
        }
        if (r.reaction === 'none') return say(fillLine(PET_CARD.lastServing, { treat }));
        haptic('light');
        sfx.play('munch');
        onReact('chew', 1400);
        setTimeout(() => onReact('happy', 1200), 1400);
        const line = caption(r.reaction === 'love' ? 'fedFavourite' : 'fed', { treat });
        const left = (state.value.pantry[t.id]?.servings ?? 0) === 0;
        say(left ? `${line} ${fillLine(PET_CARD.lastServing, { treat })}` : line);
      },
      bake(t: Treat) {
        if (bakeTray(t.id).ok) {
          haptic('light');
          toast({ message: fillLine(PET_CARD.baked, { treat: t.name.toLowerCase() }), tone: 'butter', key: `bake-${t.id}` });
        }
      },
    }),
    [petId, name, say, onReact, caption],
  );
}

/** One treat: feed it (a serving goes), or, run out and not a harvest, bake a tray of it. */
function TreatItem({ t, coins, onFeed, onBake }: { t: Treat; coins: number; onFeed: (t: Treat) => void; onBake: (t: Treat) => void }) {
  const empty = t.servings < 1;
  const item = useRef<HTMLLIElement>(null);
  const pendingFocus = useRef<{ from: HTMLButtonElement; epoch: number } | null>(null);
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (!empty || !pending || pending.epoch !== saveEpoch.value || !pending.from.isConnected) return;
    // Disabling the feed button can leave focus there or make the browser move it to body.
    // A deliberate focus move or a covering modal has priority over this local handoff.
    if (document.activeElement !== pending.from && document.activeElement !== document.body) return;
    for (let el: HTMLElement | null = item.current; el; el = el.parentElement) if (el.inert) return;
    const section = item.current?.closest('section');
    const next = item.current?.querySelector<HTMLElement>('button:not([disabled])')
      ?? section?.querySelector<HTMLElement>('button[data-feed]:not([disabled])')
      ?? section?.querySelector<HTMLElement>('button:not([disabled])')
      ?? item.current?.closest<HTMLElement>('[role="dialog"]');
    next?.focus({ preventScroll: true });
    next?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [empty]);
  // Baking is its own button, only where a treat has run out (never a harvest).
  const bakeable = empty && getCollectible(t.id)?.source !== 'harvest';
  return (
    <li ref={item} class={s.treatItem}>
      <button type="button" class={s.treat} data-feed="" data-empty={empty ? '' : undefined} disabled={empty} onClick={(e) => {
        pendingFocus.current = document.activeElement === e.currentTarget ? { from: e.currentTarget, epoch: saveEpoch.value } : null;
        onFeed(t);
        if ((state.value.pantry[t.id]?.servings ?? 0) > 0) pendingFocus.current = null;
      }} aria-label={`${PET_CARD.buttons.feed} ${t.name}, ${servingsLine(t.servings)}${t.favorite ? `, ${PET_CARD_UI.favourite}` : ''}`}>
        <span class={s.treatArt} aria-hidden="true">
          <CollectibleArt id={t.id} size={44} px={44} animated={false} />
        </span>
        <span class={s.treatName} aria-hidden="true">
          {t.name}
        </span>
        <span class={s.treatMeta} aria-hidden="true">
          {servingsLine(t.servings)}
        </span>
        {t.favorite && (
          <span class={s.fav} aria-hidden="true">
            {PET_CARD_UI.favourite}
          </span>
        )}
      </button>
      {bakeable && (
        <Button variant="quiet" size="sm" class={s.bake} disabled={coins < BAKE.coins} onClick={() => onBake(t)} aria-label={`${PET_CARD.buttons.bakeTray}, ${t.name}`}>
          {PET_CARD.buttons.bakeTray}
        </Button>
      )}
    </li>
  );
}

/**
 * Feed: the first FEED_ROW treats in a row (the favourite first, then what there is most of), then
 * "All treats (N)", which opens the rest in the card with focus on the first of them (WP-C7,
 * creative-cr-01). The order is taken when the card opens and kept while it is open, so a treat fed
 * down a serving stays where it was, under her finger.
 */
const Feed = memo(function Feed({ petId, name, treats, coins, say, onReact, caption, intent }: { petId: string; name: string; treats: Treat[]; coins: number; say: Say; onReact: React_; caption: Caption; intent?: PetIntent }) {
  const order = useRef<string[] | null>(null);
  const ordered = useMemo(() => keepOrder(order.current, treats), [treats]);
  order.current = ordered.map((t) => t.id);
  const shown = ordered.slice(0, FEED_ROW);
  const rest = ordered.slice(FEED_ROW);
  const [all, setAll] = useState(false);
  const { feed, bake } = useFeeding(petId, name, say, onReact, caption);
  const box = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLUListElement>(null);
  // Opened to feed: focus on the first treat there is to feed (not a run-out favourite's "Bake a tray").
  useEffect(() => {
    if (intent === 'feed') focusFirst(box.current, 'button[data-feed]');
    // Once, as the card opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // "All treats" opened: focus on the first of the rest.
  useEffect(() => {
    if (all) focusFirst(more.current);
  }, [all]);
  return (
    <Section id="pc-feed" title={PET_CARD.buttons.feed}>
      {treats.length === 0 ? (
        <p class={s.note}>{PET_CARD_UI.noTreats}</p>
      ) : (
        <div ref={box}>
          <ul class={s.treats}>
            {shown.map((t) => (
              <TreatItem key={t.id} t={t} coins={coins} onFeed={feed} onBake={bake} />
            ))}
          </ul>
          {rest.length > 0 && (
            <div class={s.actions}>
              <Button variant="quiet" size="sm" iconRight="chevron-down" class={cx(s.allTreats, all && s.allOpen)} aria-expanded={all} aria-controls="pc-feed-rest" onClick={() => setAll((a) => !a)}>
                {fillLine(PET_CARD_UI.allTreats, { count: ordered.length })}
              </Button>
            </div>
          )}
          {rest.length > 0 && (
            <ul id="pc-feed-rest" ref={more} class={cx(s.treats, s.treatsAll)} hidden={!all}>
              {all && rest.map((t) => <TreatItem key={t.id} t={t} coins={coins} onFeed={feed} onBake={bake} />)}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
});

const Wardrobe = memo(function Wardrobe({ petId, wardrobe, outfit, preview, onPreview, say, caption }: { petId: string; wardrobe: PetVM['wardrobe']; outfit: PetVM['outfit']; preview: { slot: WearableSlot; id: string } | null; onPreview: (p: { slot: WearableSlot; id: string } | null) => void; say: Say; caption: Caption }) {
  const firstWithItems = WEARABLE_SLOTS.find((sl) => wardrobe[sl].length > 0) ?? 'head';
  const [slot, setSlot] = useState<WearableSlot>(firstWithItems);
  const items = wardrobe[slot];
  const wearing = outfit[slot];
  const any = WEARABLE_SLOTS.some((sl) => wardrobe[sl].length > 0);
  const chosen = preview?.slot === slot ? preview.id : null;
  const putOn = () => {
    if (!chosen) return;
    const name = items.find((i) => i.id === chosen)?.name ?? '';
    setOutfit(petId, slot, chosen);
    onPreview(null);
    haptic('light');
    say(caption('newWear', { wear: name.toLowerCase() }));
  };
  return (
    <Section id="pc-wardrobe" title={PET_CARD.fields.wardrobe}>
      {!any ? (
        <p class={s.note}>{PET_CARD_UI.nothingToWear}</p>
      ) : (
        <>
          <Segmented
            label={PET_CARD.fields.wardrobe}
            size="sm"
            block
            value={slot}
            onChange={(v) => {
              setSlot(v);
              onPreview(null);
            }}
            options={WEARABLE_SLOTS.map((sl) => ({ value: sl, label: PET_CARD_UI.slots[sl] }))}
          />
          {items.length === 0 ? (
            <p class={s.note}>{PET_CARD_UI.nothingToWear}</p>
          ) : (
            <ul class={s.wardrobe}>
              {items.map((w) => {
                const on = wearing === w.id;
                const picked = chosen === w.id;
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      class={s.wear}
                      aria-pressed={picked || (on && !chosen)}
                      data-on={on ? '' : undefined}
                      onClick={() => onPreview(on || picked ? null : { slot, id: w.id })}
                      aria-label={on ? `${w.name}, ${PET_CARD_UI.wearing}` : w.name}
                    >
                      <CollectibleArt id={w.id} size={48} px={48} animated={false} />
                      <span class={s.wearName} aria-hidden="true">
                        {w.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div class={s.actions}>
            {chosen && (
              <Button size="sm" onClick={putOn}>
                {PET_CARD.buttons.putOn}
              </Button>
            )}
            {wearing && !chosen && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOutfit(petId, slot, null);
                  haptic('tick');
                }}
              >
                {PET_CARD.buttons.takeOff}
              </Button>
            )}
          </div>
        </>
      )}
    </Section>
  );
});

type PlaceLite = { id: PlaceId; name: string; petsOut: number };

const Where = memo(function Where({ petId, name, isOut, place, places, out, capacity }: { petId: string; name: string; isOut: boolean; place: PlaceId; places: PlaceLite[]; out: { id: string; place: PlaceId }[]; capacity: number }) {
  const [moving, setMoving] = useState(false);
  const room = (id: PlaceId) => id === 'sill' || out.filter((p) => p.place === id && p.id !== petId).length < (places.find((p) => p.id === id)?.petsOut ?? 0);
  const toggleOut = (on: boolean) => {
    if (on === isOut) return;
    togglePetOut(petId);
    if (!isOut && !state.value.pets[petId]?.inMeadow) toast({ message: fillLine(PET_CARD_UI.noRoom, { count: capacity }), tone: 'butter', key: 'pet-out' });
    else haptic('tick');
  };
  return (
    <Section id="pc-place" title={PET_CARD.fields.place}>
      {/* Out or indoors first: moving and choosing only apply to a pet that is out. */}
      <Toggle checked={isOut} onChange={toggleOut} label={PET_CARD_UI.out} description={isOut ? undefined : fillLine(PET_CARD_UI.outHint, { name })} />
      {isOut && <p class={s.placeValue}>{PlacePhrase(place)}</p>}
      {isOut &&
        (moving ? (
          <ul class={s.chips} aria-label={withName(PET_CARD.buttons.move, name)}>
            {places.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  class={s.chip}
                  aria-current={p.id === place ? 'true' : undefined}
                  disabled={p.id !== place && !room(p.id)}
                  onClick={() => {
                    setMoving(false);
                    if (p.id === place) return;
                    if (setPetPlace(petId, p.id === 'sill' ? null : p.id)) {
                      haptic('light');
                      toast({ message: movedToPlaceLine(name, p.id), tone: 'sage', key: `place-${petId}` });
                    }
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div class={s.actions}>
            {places.length > 1 && (
              <Button variant="secondary" size="sm" onClick={() => setMoving(true)}>
                {withName(PET_CARD.buttons.move, name)}
              </Button>
            )}
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                const r = letPetChoose(petId);
                if (!r) return;
                const h = r.habitId ? state.value.habits.find((x) => x.id === r.habitId) : null;
                toast({ message: choseLine(name, r, h ? { name: h.name, plant: h.plant } : null), tone: 'sage', key: `place-${petId}` });
              }}
            >
              {withName(PET_CARD.buttons.letChoose, name)}
            </Button>
          </div>
        ))}
    </Section>
  );
});

const Memories = memo(function Memories({ memories, keepsakes, habits }: { memories: PetMemory[]; keepsakes: PetVM['keepsakes']; habits: HabitLite[] }) {
  return (
    <Section id="pc-memories" title={PET_CARD.fields.memories}>
      {memories.length === 0 ? (
        <p class={s.note}>{EMPTY.memories}</p>
      ) : (
        <ol class={s.memories}>
          {memories.map((m) => (
            <li key={`${m.kind}:${m.date}:${m.habitId ?? ''}`}>{memoryLine(m, habits)}</li>
          ))}
        </ol>
      )}
      {keepsakes.length > 0 && (
        <>
          <h4 class={s.subTitle}>{PET_CARD_UI.keepsakes}</h4>
          <ul class={s.keepsakes}>
            {keepsakes.map((k) => (
              <li key={k.id}>
                <span class={s.keepsakeArt} aria-hidden="true">
                  <FitObject keepsake={k.kind} size={44} />
                </span>
                <span>{keepsakeCaption(k)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
});

/** The heart in the sheet's header: a favourite is sorted first everywhere. */
export function FavouriteButton({ pet }: { pet: PetVM }) {
  return <IconButton icon={<Icon name="heart" filled={pet.favorite} size={22} />} label={PET_CARD_UI.markFavourite} pressed={pet.favorite} variant="card" size="sm" tone="blush" onClick={() => toggleFavoritePet(pet.id)} />;
}

/** "Rename": the name field, five suggestions and "Another name" (the reveal's own ideas). */
export function RenameForm({ pet, onDone }: { pet: PetVM; onDone: () => void }) {
  const [name, setName] = useState(pet.name);
  const [round, setRound] = useState(0);
  const ideas = pet.species ? nameIdeas(pet.species, round, pet.name) : [];
  const keep = () => {
    if (name.trim() && name.trim() !== pet.name) renamePet(pet.id, name);
    onDone();
  };
  return (
    <form
      class={s.rename}
      onSubmit={(e) => {
        e.preventDefault();
        keep();
      }}
    >
      <TextField label={PET_CARD.name} value={name} onValue={setName} maxLength={MAX_PET_NAME} autoComplete="off" data-autofocus />
      {ideas.length > 0 && (
        <div class={s.ideas} role="group" aria-label={PET_CARD_UI.nameHint}>
          {ideas.map((n) => (
            <button key={n} type="button" class={s.chip} onClick={() => setName(n)} aria-pressed={name === n}>
              {n}
            </button>
          ))}
          <button type="button" class={cx(s.chip, s.reroll)} onClick={() => setRound((r) => r + 1)}>
            {PET_CARD.anotherName}
          </button>
        </div>
      )}
      <div class={s.actions}>
        <Button type="submit" size="sm" disabled={!name.trim()}>
          {PET_CARD_UI.keep}
        </Button>
        <Button variant="quiet" size="sm" onClick={onDone}>
          {PET_CARD_UI.cancel}
        </Button>
      </div>
    </form>
  );
}

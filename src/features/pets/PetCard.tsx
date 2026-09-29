/**
 * The Pet Card (DESIGN §8.2, §8.5, §9.4, §14.1; VOICE §9, §11, §13): an adoption profile you can
 * touch. The portrait answers the gesture buttons (every gesture on the Shelf has one here); then
 * friendship, Likes · Known for · Favourite spot · Best friend · Came home, which habit it keeps
 * company, the pantry, the wardrobe (with a live preview), where it spends the day, and Memories.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COMPANION, EMPTY, PET_CARD, fillLine, pickLine, plantPhrase } from '@/catalog/lines';
import { choseLine, movedToPlaceLine } from '@/catalog/format';
import { SPECIES_VOICE } from '@/catalog/personalities';
import { WEARABLE_SLOTS, type PlaceId, type WearableSlot } from '@/catalog/types';
import { PetArt } from '@/art/pets/PetArt';
import type { Expression } from '@/art/pets/types';
import { CollectibleArt } from '@/art/CollectibleArt';
import { CardPlant } from '@/art/plants/CardPlant';
import { ObjectArt, useArtLight } from '@/art/scene';
import { reactionFor } from '@/art/scene/actors/touch';
import { Icon } from '@/art/icons';
import type { PetVM, ShelfVM } from '@/state/selectors';
import type { Habit } from '@/state/types';
import { bakeTray, feedPet, letPetChoose, petPet, renamePet, setCompanion, setOutfit, setPetPlace, state, toggleFavoritePet, togglePetOut, today } from '@/state/store';
import { BAKE } from '@/domain/pantry';
import { MAX_PET_NAME } from '@/domain/friendship';
import { nameIdeas } from '@/features/capsules/names';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { Segmented } from '@/ui/Segmented';
import { TextField } from '@/ui/TextField';
import { Toggle } from '@/ui/Toggle';
import { announceSettled } from '@/ui/announce';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { PET_CARD_UI, PlacePhrase, boopLabel, keepsakeCaption, keepsLine, knownForLine, levelLine, levelName, likesLine, memoryLine, servingsLine, spotLine, withName } from './petCopy';
import s from './PetCard.module.css';

export interface PetCardProps {
  pet: PetVM;
  /** The Shelf's places (owned, with room), for "Move {name}". */
  places: ShelfVM['places'];
  /** Pets out, for the room left in each place. */
  out: ShelfVM['out'];
  capacity: number;
}

type Gesture = 'tap' | 'stroke' | 'boop' | 'carry';

const recent: string[] = [];
let seed = Math.floor(Math.random() * 100_000);

export function PetCard({ pet, places, out, capacity }: PetCardProps) {
  const light = useArtLight();
  const habits = state.value.habits.filter((h) => h.archivedOn === undefined);
  const species = pet.species;
  const [expression, setExpression] = useState<Expression>('rest');
  const [bounce, setBounce] = useState(0);
  const [held, setHeld] = useState(false);
  const [caption, setCaption] = useState<string>('');
  const [preview, setPreview] = useState<{ slot: WearableSlot; id: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (line: string) => {
    setCaption(line);
    announceSettled('pet-card', line);
  };
  const show = (e: Expression, ms: number) => {
    clearTimeout(timer.current);
    setExpression(e);
    setBounce((b) => b + 1);
    timer.current = setTimeout(() => setExpression('rest'), ms);
  };
  const situation = { level: pet.level };
  const caption_ = (context: 'fed' | 'fedFavourite' | 'newWear' | 'tap', slots: Record<string, string>) => {
    const t = pickLine(context, pet.personality, species ?? 'cat', ++seed, recent, situation);
    recent.push(t);
    if (recent.length > 5) recent.shift();
    return fillLine(t, { name: pet.name, ...slots });
  };

  /* ---------------- gestures ---------------- */
  const gesture = (g: Gesture) => {
    const r = reactionFor(g, species ?? 'cat', false);
    haptic(g === 'stroke' ? 'light' : 'tick');
    if (species && g !== 'stroke') sfx.voice(SPECIES_VOICE[species], { pitch: g === 'boop' ? 1.12 : 1 });
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
      <Section title={PET_CARD.fields.friendship}>
        <div class={s.friendship}>
          <span class={s.dots} role="img" aria-label={fillLine(PET_CARD_UI.friendshipAria, { level: levelName(pet.level) })}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} class={s.dot} data-on={i < pet.hearts ? '' : undefined} />
            ))}
          </span>
          <span class={s.levelName}>{levelName(pet.level)}</span>
        </div>
        <p class={s.levelLine}>{levelLine(pet.name, pet.level, species, pet.bestFriend ? (state.value.pets[pet.bestFriend]?.name ?? null) : null)}</p>
      </Section>

      <About pet={pet} habits={habits} />
      <Company pet={pet} habits={habits} />
      <Feed pet={pet} say={say} onReact={show} caption={caption_} />
      <Wardrobe pet={pet} preview={preview} onPreview={setPreview} say={say} caption={caption_} />
      <Where pet={pet} places={places} out={out} capacity={capacity} />
      <Memories pet={pet} habits={habits} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ title, children, id }: { title: string; children: ComponentChildren; id?: string }) {
  return (
    <section class={s.section} aria-label={title} id={id}>
      <h3 class={s.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

type HabitLite = Pick<Habit, 'id' | 'name' | 'plant' | 'pot' | 'companionId'>;

function About({ pet, habits }: { pet: PetVM; habits: HabitLite[] }) {
  const rows: [string, string | null][] = [
    [PET_CARD.fields.likes, likesLine(pet.likes)],
    [PET_CARD.fields.knownFor, knownForLine(pet.company, pet.species, pet.id)],
    [PET_CARD.fields.spot, spotLine(pet.spot, habits)],
    [PET_CARD.fields.bestFriend, pet.bestFriend ? (state.value.pets[pet.bestFriend]?.name ?? null) : null],
    [PET_CARD.fields.cameHome, pet.arrivedOn === today.value ? PET_CARD.cameHomeToday.slice(PET_CARD.cameHomeToday.indexOf(': ') + 2) : pet.arrivedLabel],
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
}

function Company({ pet, habits }: { pet: PetVM; habits: HabitLite[] }) {
  const [choosing, setChoosing] = useState(false);
  const habit = pet.company.habitId ? habits.find((h) => h.id === pet.company.habitId) : undefined;
  if (habits.length === 0) return null;
  if (habit) {
    return (
      <section class={s.company} aria-label={keepsLine(habit.name)}>
        <span class={s.companyArt} aria-hidden="true">
          <CardPlant species={habit.plant} stage={state.value.ledger.bestStage[habit.id] ?? 0} pot={habit.pot} size={56} residentPetId={pet.id} />
        </span>
        <div class={s.companyText}>
          <h3 class={s.companyTitle}>{keepsLine(habit.name)}</h3>
          <Button
            variant="quiet"
            size="sm"
            class={s.companyButton}
            onClick={() => {
              if (setCompanion(habit.id, null)) toast({ message: fillLine(COMPANION.movedOut, { name: pet.name }), tone: 'blush', key: `companion-${pet.id}` });
            }}
          >
            {withName(COMPANION.moveOut, pet.name)}
          </Button>
        </div>
      </section>
    );
  }
  const sorted = [...habits].sort((a, b) => Number(!!a.companionId) - Number(!!b.companionId));
  return (
    <Section title={withName(COMPANION.card.find, pet.name)}>
      {!choosing ? (
        <div class={s.actions}>
          <Button variant="secondary" size="sm" icon="sprout" onClick={() => setChoosing(true)}>
            {withName(PET_CARD.buttons.findPlant, pet.name)}
          </Button>
        </div>
      ) : (
        <ul class={s.chips} aria-label={withName(PET_CARD.buttons.findPlant, pet.name)}>
          {sorted.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                class={s.chip}
                onClick={() => {
                  // The celebration host words it: "{name} moved into {plant}."
                  if (setCompanion(h.id, pet.id)) haptic('light');
                  setChoosing(false);
                }}
              >
                {h.name}
                {h.companionId && <span class={s.chipNote}>{state.value.pets[h.companionId]?.name}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Feed({ pet, say, onReact, caption }: { pet: PetVM; say: (l: string) => void; onReact: (e: Expression, ms: number) => void; caption: (c: 'fed' | 'fedFavourite', slots: Record<string, string>) => string }) {
  const coins = state.value.wallet.coins;
  const feed = (t: PetVM['treats'][number]) => {
    const r = feedPet(pet.id, t.id);
    const treat = t.name.toLowerCase();
    if (r.reaction === 'full') {
      onReact('blink', 900);
      return say(fillLine(PET_CARD.enough, { name: pet.name }));
    }
    if (r.reaction === 'none') return say(fillLine(PET_CARD.lastServing, { treat }));
    haptic('light');
    sfx.play('munch');
    onReact('chew', 1400);
    setTimeout(() => onReact('happy', 1200), 1400);
    const line = caption(r.reaction === 'love' ? 'fedFavourite' : 'fed', { treat });
    const left = (state.value.pantry[t.id]?.servings ?? 0) === 0;
    say(left ? `${line} ${fillLine(PET_CARD.lastServing, { treat })}` : line);
  };
  const bake = (t: PetVM['treats'][number]) => {
    if (bakeTray(t.id).ok) toast({ message: fillLine(PET_CARD.baked, { treat: t.name.toLowerCase() }), tone: 'butter', key: `bake-${t.id}` });
  };
  return (
    <Section title={PET_CARD.buttons.feed}>
      {pet.treats.length === 0 ? (
        <p class={s.note}>{PET_CARD_UI.noTreats}</p>
      ) : (
        <ul class={s.treats}>
          {pet.treats.map((t) => (
            <li key={t.id}>
              <button type="button" class={s.treat} data-empty={t.servings < 1 ? '' : undefined} onClick={() => (t.servings < 1 ? bake(t) : feed(t))} aria-label={t.servings < 1 ? `${PET_CARD.buttons.bakeTray}, ${t.name}` : `${PET_CARD.buttons.feed} ${t.name}, ${servingsLine(t.servings)}`} disabled={t.servings < 1 && coins < BAKE.coins}>
                <span class={s.treatArt} aria-hidden="true">
                  <CollectibleArt id={t.id} size={44} px={44} animated={false} />
                </span>
                <span class={s.treatName} aria-hidden="true">
                  {t.name}
                </span>
                <span class={s.treatMeta} aria-hidden="true">
                  {t.favorite ? <span class={s.fav}>{PET_CARD_UI.favourite}</span> : t.servings < 1 ? PET_CARD.buttons.bakeTray : servingsLine(t.servings)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Wardrobe({ pet, preview, onPreview, say, caption }: { pet: PetVM; preview: { slot: WearableSlot; id: string } | null; onPreview: (p: { slot: WearableSlot; id: string } | null) => void; say: (l: string) => void; caption: (c: 'newWear', slots: Record<string, string>) => string }) {
  const firstWithItems = WEARABLE_SLOTS.find((sl) => pet.wardrobe[sl].length > 0) ?? 'head';
  const [slot, setSlot] = useState<WearableSlot>(firstWithItems);
  const items = pet.wardrobe[slot];
  const wearing = pet.outfit[slot];
  const any = WEARABLE_SLOTS.some((sl) => pet.wardrobe[sl].length > 0);
  const chosen = preview?.slot === slot ? preview.id : null;
  const putOn = () => {
    if (!chosen) return;
    const name = items.find((i) => i.id === chosen)?.name ?? '';
    setOutfit(pet.id, slot, chosen);
    onPreview(null);
    haptic('light');
    say(caption('newWear', { wear: name.toLowerCase() }));
  };
  return (
    <Section title={PET_CARD.fields.wardrobe}>
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
                  setOutfit(pet.id, slot, null);
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
}

function Where({ pet, places, out, capacity }: { pet: PetVM; places: ShelfVM['places']; out: ShelfVM['out']; capacity: number }) {
  const [moving, setMoving] = useState(false);
  const open = places.filter((p) => p.owned);
  const room = (id: PlaceId) => id === 'sill' || out.filter((p) => p.place === id && p.id !== pet.id).length < (places.find((p) => p.id === id)?.petsOut ?? 0);
  const toggleOut = (on: boolean) => {
    if (on === pet.out) return;
    const was = pet.out;
    togglePetOut(pet.id);
    if (!was && !state.value.pets[pet.id]?.inMeadow) toast({ message: fillLine(PET_CARD_UI.noRoom, { count: capacity }), tone: 'butter', key: 'pet-out' });
    else haptic('tick');
  };
  return (
    <Section title={PET_CARD.fields.place}>
      <p class={s.placeValue}>{pet.out ? PlacePhrase(pet.place) : PET_CARD_UI.indoors}</p>
      {pet.out &&
        (moving ? (
          <ul class={s.chips} aria-label={withName(PET_CARD.buttons.move, pet.name)}>
            {open.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  class={s.chip}
                  aria-current={p.id === pet.place ? 'true' : undefined}
                  disabled={p.id !== pet.place && !room(p.id)}
                  onClick={() => {
                    setMoving(false);
                    if (p.id === pet.place) return;
                    if (setPetPlace(pet.id, p.id === 'sill' ? null : p.id)) {
                      haptic('light');
                      toast({ message: movedToPlaceLine(pet.name, p.id), tone: 'sage', key: `place-${pet.id}` });
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
            {open.length > 1 && (
              <Button variant="secondary" size="sm" onClick={() => setMoving(true)}>
                {withName(PET_CARD.buttons.move, pet.name)}
              </Button>
            )}
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                const r = letPetChoose(pet.id);
                if (!r) return;
                const h = r.habitId ? state.value.habits.find((x) => x.id === r.habitId) : null;
                toast({ message: choseLine(pet.name, r, h ? { name: h.name, plant: h.plant } : null), tone: 'sage', key: `place-${pet.id}` });
              }}
            >
              {withName(PET_CARD.buttons.letChoose, pet.name)}
            </Button>
          </div>
        ))}
      <Toggle checked={pet.out} onChange={toggleOut} label={PET_CARD_UI.out} description={pet.out ? undefined : fillLine(PET_CARD_UI.outHint, { name: pet.name })} />
    </Section>
  );
}

function Memories({ pet, habits }: { pet: PetVM; habits: HabitLite[] }) {
  return (
    <Section title={PET_CARD.fields.memories}>
      {pet.memories.length === 0 ? (
        <p class={s.note}>{EMPTY.memories}</p>
      ) : (
        <ol class={s.memories}>
          {pet.memories.map((m, i) => (
            <li key={i}>{memoryLine(m, habits)}</li>
          ))}
        </ol>
      )}
      {pet.keepsakes.length > 0 && (
        <>
          <h4 class={s.subTitle}>{PET_CARD_UI.keepsakes}</h4>
          <ul class={s.keepsakes}>
            {pet.keepsakes.map((k) => (
              <li key={k.id}>
                <span class={s.keepsakeArt} aria-hidden="true">
                  <ObjectArt keepsake={k.kind} size={48} />
                </span>
                <span>{keepsakeCaption(k)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

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

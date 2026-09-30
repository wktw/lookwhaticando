import type { JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { RARITY_FINISH } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import { MACHINE_BY_ID, seriesLabel } from '@/catalog/machines';
import { letPetChoose, renamePet, state } from '@/state/store';
import { choseLine } from '@/catalog/format';
import { selectSeries } from '@/state/selectors';
import type { Light } from '@/art/light';
import { CollectibleArt } from '@/art/CollectibleArt';
import { OpenCapsuleArt } from '@/art/machines/CapsuleArt';
import { pillFace } from '@/art/machines/theme';
import { mix } from '@/art/machines/color';
import { CoinIcon, StampIcon, SwapIcon, TicketIcon } from '@/art/icons';
import { handOff } from '@/app/handoff';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { RarityPill } from '@/ui/Pill';
import { SecretSparkle } from '@/ui/SecretSparkle';
import { SPECIES_NOUN, cameHomeLabel, duplicateLine, fusionLine, kindLabel, orderLine, paymentPhrase, revealLine, revealSentence } from './copy';
import { nameIdeas } from './names';
import type { Payment } from './payment';
import { finishFor, type RevealData } from './reveal';
import type { PlaceHandlers } from './RevealOverlay';
import s from './RevealOverlay.module.css';

/** Another pull, offered on the card with its cost in plain sight. */
export interface PullAgainOffer {
  pay: Exclude<Payment, 'free'>;
  machine: MachineDef;
  onPull: () => void;
}

export interface RevealCardProps extends PlaceHandlers {
  data: RevealData;
  light: Light;
  onClose: () => void;
  pullAgain?: PullAgainOffer;
  /** Quick open: no stepping out, the figure is simply there. */
  quick?: boolean;
}

const NAME_MAX = 20;
const GRAPHITE = '#3B3236';

/** Another capsule, with its cost in plain sight (VOICE §3: in the UI a pull is a "capsule"). */
function PullAgainButton({ offer }: { offer: PullAgainOffer }) {
  const { pay, machine } = offer;
  const icon = pay === 'ticket' ? <TicketIcon size={18} /> : machine.currency === 'stars' ? <StampIcon size={18} /> : <CoinIcon size={18} />;
  return (
    <Button variant="secondary" onClick={offer.onPull} aria-label={`Another capsule ${paymentPhrase(pay, machine)}`}>
      Another capsule
      <span class={s.cost} aria-hidden="true">
        {icon}
        <span class="num">{pay === 'ticket' ? 1 : machine.price}</span>
      </span>
    </Button>
  );
}

/** Night paper for the Special band: the series colour let down into the Lamplight card. */
export const NIGHT_CARD = '#2D2733';
export const NIGHT_INK = '#F4EDE6';

/** The Special print's band and its ink, by day and under lamplight (RevealOverlay.module.css picks). */
export function specialBandVars(theme: MachineDef['theme']): Record<string, string> {
  return {
    '--series-band': mix(theme.body, '#FFFFFF', 0.55),
    '--series-ink': theme.ink,
    '--series-band-night': mix(theme.body, NIGHT_CARD, 0.68),
    '--series-ink-night': NIGHT_INK,
    '--series': theme.body,
  };
}


/**
 * The folded paper insert, opened out (DESIGN §7.2 step 6): the figure stands on it beside the
 * opened capsule. "No. 02 · Cows", the name, one observed line in Castoro italic, and the tier
 * with its static print finish. A new pet gets a name tag with a came-home date.
 */
export function RevealCard({ data, light, onClose, pullAgain, onPlace, onLetThemChoose, quick }: RevealCardProps) {
  const def = getCollectible(data.itemId);
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const known = def?.category === 'pet' ? (data.pet?.name ?? state.value.pets[def.id]?.name ?? def.defaultName) : '';
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState(known);
  const [petName, setPetName] = useState(known);
  const [round, setRound] = useState(0);

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (naming) nameInput.current?.select();
  }, [naming]);

  // Ten swaps making a stamp gets its own small moment once the card has landed.
  useEffect(() => {
    if (data.fusedStars <= 0) return;
    const t = setTimeout(() => {
      sfx.play('chime');
      haptic('success');
    }, 650);
    return () => clearTimeout(t);
  }, []);

  if (!def) return null;
  const machine = data.machineId ? MACHINE_BY_ID.get(data.machineId) : undefined;
  const series = machine ? selectSeries(machine.id).value : null;
  const finish = finishFor(data);
  const isPet = def.category === 'pet';
  const newPet = isPet && data.isNew;
  const inCapsule = data.via === 'pull' || data.secret;
  const cameHome = data.pet?.obtainedAt || Date.now();
  const face = machine ? { fill: pillFace(machine), ink: GRAPHITE } : undefined;
  // A repeat pet: the one already on the sill comes over to look (its friendship shows as dots on the Pet Card, never a number).
  const homeName = isPet && !data.isNew ? (state.value.pets[def.id]?.name ?? petName) : undefined;
  const theme = machine?.theme;
  // The Special print's band: the series colour let down with paper by day, and with the night card
  // under lamplight, where the light ink prints on it (both AA: contrast.test.ts).
  const vars = theme ? (specialBandVars(theme) as JSX.CSSProperties) : undefined;

  const stopNaming = () => {
    setNaming(false);
    heading.current?.focus({ preventScroll: true });
  };

  const saveName = (e: Event) => {
    e.preventDefault();
    const name = draft.trim().slice(0, NAME_MAX) || petName;
    // A pet's state is keyed by its collectible id.
    renamePet(def.id, name);
    setPetName(name);
    sfx.play('chime');
    stopNaming();
  };

  const cancelName = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // Esc here only puts the name field away, not the whole reveal.
    e.stopPropagation();
    setDraft(petName);
    stopNaming();
  };

  // Where "Find {name} a plant" and "Find it a place" go. A host can take over (onboarding has a
  // step of its own); otherwise, as on the routed Capsules screen, the hand-off carries the thing
  // and what to do with it (WP-C7): the pet's card on its plant chooser, or the Shelf's edit mode.
  const place = () => {
    onClose();
    if (onPlace) onPlace(def.id);
    else handOff(isPet ? { target: 'pet', entityId: def.id, intent: 'findPlant' } : { target: 'shelf', entityId: def.id, intent: 'place' });
  };
  // "Visit {name}": a repeat pet is already home; its card.
  const visitPet = () => {
    onClose();
    if (onPlace) onPlace(def.id);
    else handOff({ target: 'pet', entityId: def.id });
  };

  // "Let {name} choose" (VOICE §10): the pet picks a plant to keep company, or a place it loves,
  // and a note says which. A host can take over (the onboarding flow does its own telling).
  const letChoose = () => {
    onClose();
    if (onLetThemChoose) return onLetThemChoose(def.id);
    const chose = letPetChoose(def.id);
    if (!chose) return;
    const habit = chose.habitId ? state.value.habits.find((h) => h.id === chose.habitId) : null;
    toast({ key: `chose-${def.id}`, message: choseLine(petName, chose, habit), tone: 'sage' });
  };

  // Only something new needs a place: a repeat pet is already home, and a repeat decor already has a spot.
  const placeable = data.isNew && (isPet || def.category === 'decor');
  const visit = !data.isNew && isPet;

  return (
    <div class={s.scene} data-finish={finish} style={vars}>
      <div class={s.table} aria-hidden="true">
        {inCapsule && (
          <div class={s.halves}>
            <OpenCapsuleArt finish={finish} color={data.shell.color} color2={data.shell.color2} light={light} size="100%" />
          </div>
        )}
        <div class={quick ? s.figure : `${s.figure} ${s.stepOut}`}>
          <CollectibleArt id={data.itemId} size="100%" px={160} animated />
        </div>
        {data.secret && <SecretSparkle class={s.sparkle} color="var(--star)" />}
      </div>

      <section class={s.card} aria-labelledby={titleId}>
        {(finish === 'rare' || finish === 'super' || finish === 'secret') && <span class={s.glint} aria-hidden="true" />}
        <header class={s.cardHead}>
          <p class={s.series}>{machine ? seriesLabel(machine) : 'Special Order'}</p>
          {series && (
            <p class={s.count}>
              <span class="num">{series.owned}</span> of <span class="num">{series.total}</span>
            </p>
          )}
        </header>
        <h2 id={titleId} ref={heading} tabIndex={-1} class={s.title}>
          {def.name}
        </h2>
        <p class={s.kind}>{isPet ? SPECIES_NOUN[def.species] : kindLabel(def)}</p>
        <p class={s.line} aria-hidden="true">
          {data.via === 'order' && !data.secret ? orderLine(def) : revealLine(def, machine, data.rarity, data.secret)}
        </p>
        <p class={s.flavor}>{def.flavor}</p>
        <div class={s.fold} aria-hidden="true" />
        <p class={s.tier}>
          <RarityPill rarity={data.rarity} secret={data.secret} />
          <span>{data.secret ? 'holographic' : RARITY_FINISH[data.rarity]}</span>
          {data.isNew && <span class={s.new}>New</span>}
        </p>

        {!data.isNew && (
          <div class={s.progress}>
            <span class={s.dupe}>
              <SwapIcon size={20} /> {duplicateLine(def, data.stardust, homeName)}
            </span>
            {data.fusedStars > 0 && (
              <span class={s.fusion}>
                <StampIcon size={20} /> {fusionLine(data.fusedStars)}
              </span>
            )}
          </div>
        )}

        {newPet && !naming && (
          <div class={s.nameTag}>
            <span class={s.tag}>
              <span class={s.tagName}>{petName}</span>
              <span class={s.tagDate}>{cameHomeLabel(cameHome)}</span>
            </span>
            <Button variant="quiet" size="sm" onClick={() => setNaming(true)}>
              Rename
            </Button>
          </div>
        )}

        {naming && (
          <form class={s.nameForm} onSubmit={saveName}>
            <label class={s.nameLabel} for={`${titleId}-name`}>
              Name
            </label>
            <div class={s.nameRow}>
              <input
                id={`${titleId}-name`}
                class={s.nameInput}
                value={draft}
                maxLength={NAME_MAX}
                autoComplete="off"
                enterKeyHint="done"
                onInput={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={cancelName}
                ref={nameInput}
              />
              <Button type="submit" size="sm" face={face}>
                Save
              </Button>
            </div>
            {def.category === 'pet' && (
              <div class={s.ideas} role="group" aria-label="Name ideas">
                {nameIdeas(def.species, round, draft).map((n) => (
                  <button key={n} type="button" class={s.idea} onClick={() => setDraft(n)} onKeyDown={cancelName}>
                    {n}
                  </button>
                ))}
                <button type="button" class={s.idea} onClick={() => setRound((r) => r + 1)} onKeyDown={cancelName}>
                  Another name
                </button>
              </div>
            )}
          </form>
        )}

        <div class={s.actions}>
          {visit && (
            <Button variant="quiet" onClick={visitPet}>
              Visit {petName}
            </Button>
          )}
          {placeable && (
            <Button face={face} onClick={place}>
              {isPet ? `Find ${petName} a plant` : 'Find it a place'}
            </Button>
          )}
          {newPet && (
            <Button variant="secondary" onClick={letChoose}>
              Let {petName} choose
            </Button>
          )}
        </div>
        <div class={s.actions}>
          {pullAgain && <PullAgainButton offer={pullAgain} />}
          <Button variant={placeable ? 'quiet' : 'primary'} face={placeable ? undefined : face} onClick={onClose}>
            {newPet ? 'Not now' : 'Done'}
          </Button>
        </div>

        <p class="sr-only" role="status">
          {revealSentence(def, machine, data.rarity, data.secret, data.isNew, data.stardust, homeName)}
        </p>
      </section>
    </div>
  );
}

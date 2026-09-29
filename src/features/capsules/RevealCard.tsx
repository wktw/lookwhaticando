import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import { renamePet, state } from '@/state/store';
import { CoinIcon, StarIcon, StardustIcon, TicketIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { CandyButton, Pill } from './ui/CandyButton';
import { RARITY_LABEL, RARITY_REVEAL, kindLabel, paymentPhrase } from './copy';
import type { Payment } from './payment';
import type { RevealData } from './reveal';
import s from './RevealOverlay.module.css';

/** Another pull, offered on the card with its cost in plain sight. */
export interface PullAgainOffer {
  pay: Payment;
  machine: MachineDef;
  onPull: () => void;
}

export interface RevealCardProps {
  data: RevealData;
  onClose: () => void;
  pullAgain?: PullAgainOffer;
}

const NAME_MAX = 20;

function PullAgainButton({ offer }: { offer: PullAgainOffer }) {
  const { pay, machine } = offer;
  const icon = pay === 'ticket' ? <TicketIcon size={18} /> : machine.currency === 'stars' ? <StarIcon size={18} /> : <CoinIcon size={18} />;
  return (
    <CandyButton variant="soft" onClick={offer.onPull} aria-label={`Pull again ${paymentPhrase(pay, machine)}`}>
      Pull again
      <span class={s.cost} aria-hidden="true">
        {icon}
        <span class="num">{pay === 'ticket' ? 1 : machine.price}</span>
      </span>
    </CandyButton>
  );
}

/** The card under a revealed item: name, rarity, flavor, NEW or duplicate progress, pet intro. */
export function RevealCard({ data, onClose, pullAgain }: RevealCardProps) {
  const def = getCollectible(data.itemId);
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const known = def?.category === 'pet' ? (data.pet?.name ?? state.value.pets[def.id]?.name ?? def.defaultName) : '';
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState(known);
  const [petName, setPetName] = useState(known);

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    if (naming) nameInput.current?.select();
  }, [naming]);

  // Stardust fusing into a star gets its own little moment once the card has landed.
  useEffect(() => {
    if (data.fusedStars <= 0) return;
    const t = setTimeout(() => {
      sfx.play('sparkle');
      haptic('success');
    }, 650);
    return () => clearTimeout(t);
  }, []);

  if (!def) return null;
  const newPet = def.category === 'pet' && data.isNew;
  const personality = data.pet ? PERSONALITY_BY_ID.get(data.pet.personality) : undefined;
  // A repeat friend is greeted by the name you know them by; the variant is on the line below.
  const title = newPet ? `Meet ${petName}!` : def.category === 'pet' ? petName : def.name;
  const summary = `You got ${def.name}, ${RARITY_LABEL[data.rarity]}. ${data.isNew ? 'New!' : `Duplicate, plus ${data.stardust} stardust.`}`;

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
    // Esc here only closes the name field, not the whole reveal.
    e.stopPropagation();
    setDraft(petName);
    stopNaming();
  };

  const toMeadow = () => {
    onClose();
    location.hash = '#/meadow';
  };

  return (
    <section class={s.card} aria-labelledby={titleId}>
      {data.isNew && (
        <span class={s.newSticker} aria-hidden="true">
          NEW!
        </span>
      )}
      <Pill tone={data.rarity} class={s.rarityPill}>
        {RARITY_REVEAL[data.rarity]}
      </Pill>
      <h2 id={titleId} ref={heading} tabIndex={-1} class={s.title}>
        {title}
      </h2>
      <p class={s.kind}>{kindLabel(def)}</p>
      {personality && (
        <p class={s.personality}>
          <Pill tone="blush">
            <span aria-hidden="true">{personality.emoji}</span> {personality.label}
          </Pill>
          <span>{personality.blurb}</span>
        </p>
      )}
      <p class={s.flavor}>{def.flavor}</p>

      {!data.isNew && (
        <div class={s.progress}>
          <span class={s.dupe}>
            <StardustIcon size={22} /> Duplicate: <b class="num">+{data.stardust}</b> stardust
          </span>
          {data.friendshipXp ? <span class={s.dupe}>A visit from their twin! +{data.friendshipXp} friendship 💕</span> : null}
          {data.fusedStars > 0 && (
            <span class={s.fusion}>
              <StarIcon size={22} /> Stardust fused: <b class="num">+{data.fusedStars}</b> {data.fusedStars === 1 ? 'star' : 'stars'}!
            </span>
          )}
        </div>
      )}

      {naming && (
        <form class={s.nameForm} onSubmit={saveName}>
          <label class="sr-only" for={`${titleId}-name`}>
            Name your new friend
          </label>
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
          <CandyButton type="submit" size="sm">
            Save
          </CandyButton>
        </form>
      )}

      {newPet && !naming && (
        <div class={s.petActions}>
          <CandyButton variant="soft" size="sm" onClick={() => setNaming(true)}>
            Name them
          </CandyButton>
          <CandyButton variant="soft" size="sm" onClick={toMeadow}>
            To the meadow
          </CandyButton>
        </div>
      )}

      <div class={s.actions}>
        {pullAgain && <PullAgainButton offer={pullAgain} />}
        <CandyButton onClick={onClose}>Done</CandyButton>
      </div>

      <p class="sr-only" role="status">
        {summary}
      </p>
    </section>
  );
}

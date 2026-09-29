import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { getCollectible } from '@/catalog/collectibles';
import { PERSONALITY_BY_ID } from '@/catalog/personalities';
import { renamePet } from '@/state/store';
import { StarIcon, StardustIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { CandyButton, Pill } from './ui/CandyButton';
import { RARITY_LABEL, RARITY_REVEAL, kindLabel } from './copy';
import type { RevealData } from './reveal';
import s from './RevealOverlay.module.css';

export interface RevealCardProps {
  data: RevealData;
  onClose: () => void;
  onPullAgain?: () => void;
}

const NAME_MAX = 20;

/** The card under a revealed item: name, rarity, flavor, NEW or duplicate progress, pet intro. */
export function RevealCard({ data, onClose, onPullAgain }: RevealCardProps) {
  const def = getCollectible(data.itemId);
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState(data.pet?.name ?? (def?.category === 'pet' ? def.defaultName : ''));
  const [petName, setPetName] = useState(data.pet?.name ?? (def?.category === 'pet' ? def.defaultName : ''));

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
  const newPet = def.category === 'pet' && data.isNew && data.pet;
  const personality = data.pet ? PERSONALITY_BY_ID.get(data.pet.personality) : undefined;
  const title = newPet ? `Meet ${petName}!` : def.name;
  const summary = `You got ${def.name}, ${RARITY_LABEL[data.rarity]}. ${data.isNew ? 'New!' : `Duplicate, plus ${data.stardust} stardust.`}`;

  const saveName = (e: Event) => {
    e.preventDefault();
    const name = draft.trim().slice(0, NAME_MAX) || petName;
    if (data.pet) renamePet(data.pet.id, name);
    setPetName(name);
    setNaming(false);
    sfx.play('chime');
    heading.current?.focus({ preventScroll: true });
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
            ref={nameInput}
          />
          <CandyButton type="submit" size="sm">
            Save
          </CandyButton>
        </form>
      )}

      <div class={s.actions}>
        {newPet && !naming && (
          <CandyButton variant="soft" size="sm" class={s.wide} onClick={() => setNaming(true)}>
            Name them
          </CandyButton>
        )}
        {onPullAgain && (
          <CandyButton variant="soft" onClick={onPullAgain}>
            Pull again
          </CandyButton>
        )}
        <CandyButton onClick={onClose}>Done</CandyButton>
      </div>

      <p class="sr-only" role="status">
        {summary}
      </p>
    </section>
  );
}

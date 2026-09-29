import type { JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { MachineDef, Rarity } from '@/catalog/types';
import { RARITY_FINISH } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import { MACHINE_BY_ID, seriesLabel } from '@/catalog/machines';
import { machineStatus, renamePet, state } from '@/state/store';
import type { Light } from '@/art/light';
import { CollectibleArt } from '@/art/CollectibleArt';
import { OpenCapsuleArt } from '@/art/machines/CapsuleArt';
import { pillFace } from '@/art/machines/theme';
import { mix } from '@/art/machines/color';
import { CoinIcon, StarIcon, StardustIcon, TicketIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { PillButton, Pill, type PillTone } from './ui/CandyButton';
import { SPECIES_NOUN, kindLabel, paymentPhrase, revealSentence, shortDate, tierLabel } from './copy';
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

const TONE: Record<Rarity, PillTone> = { common: 'common', uncommon: 'uncommon', rare: 'rare', ultra: 'ultra' };

function PullAgainButton({ offer }: { offer: PullAgainOffer }) {
  const { pay, machine } = offer;
  const icon = pay === 'ticket' ? <TicketIcon size={18} /> : machine.currency === 'stars' ? <StarIcon size={18} /> : <CoinIcon size={18} />;
  return (
    <PillButton variant="secondary" onClick={offer.onPull} aria-label={`Pull again ${paymentPhrase(pay, machine)}`}>
      Pull again
      <span class={s.cost} aria-hidden="true">
        {icon}
        <span class="num">{pay === 'ticket' ? 1 : machine.price}</span>
      </span>
    </PillButton>
  );
}

/** One four-point sparkle: the Secret's, and only the Secret's. */
function Sparkle() {
  return (
    <svg class={s.sparkle} viewBox="-10 -10 20 20" aria-hidden="true" focusable="false">
      <path d="M0 -9C0.8 -2.4 2.4 -0.8 9 0 2.4 0.8 0.8 2.4 0 9-0.8 2.4-2.4 0.8-9 0-2.4-0.8-0.8-2.4 0-9Z" fill="#F2C94C" />
    </svg>
  );
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
  const status = machine ? machineStatus(machine.id) : null;
  const finish = finishFor(data);
  const isPet = def.category === 'pet';
  const newPet = isPet && data.isNew;
  const inCapsule = data.via === 'pull' || data.secret;
  const cameHome = data.pet?.obtainedAt || Date.now();
  const theme = machine?.theme;
  // The Special print's band: the series colour let down with paper (its ink stays AA on it: contrast.test.ts).
  const vars = theme
    ? ({ '--series-band': mix(theme.body, '#FFFFFF', 0.55), '--series-ink': theme.ink, '--series': theme.body } as JSX.CSSProperties)
    : undefined;

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

  const place = () => {
    onClose();
    if (onPlace) onPlace(def.id);
    else location.hash = '#/shelf';
  };

  const letThemChoose = () => {
    onClose();
    onLetThemChoose?.(def.id);
  };

  const placeable = isPet || def.category === 'decor';

  return (
    <div class={s.scene} data-finish={finish} style={vars}>
      <div class={s.table} aria-hidden="true">
        {inCapsule && (
          <div class={s.halves}>
            <OpenCapsuleArt finish={finish} color={data.shell.color} color2={data.shell.color2} light={light} size="100%" />
          </div>
        )}
        <div class={quick ? s.figure : `${s.figure} ${s.stepOut}`}>
          <CollectibleArt id={data.itemId} size="100%" animated />
        </div>
        {data.secret && <Sparkle />}
      </div>

      <section class={s.card} aria-labelledby={titleId}>
        {(finish === 'rare' || finish === 'super' || finish === 'secret') && <span class={s.glint} aria-hidden="true" />}
        <header class={s.cardHead}>
          <p class={s.series}>
            {machine ? seriesLabel(machine) : 'Special Order'}
            {data.secret && <span class={s.secretOne}>, the secret one!</span>}
          </p>
          {status && (
            <p class={s.count}>
              <span class="num">{status.owned}</span> of <span class="num">{status.total}</span>
            </p>
          )}
        </header>
        <h2 id={titleId} ref={heading} tabIndex={-1} class={s.title}>
          {def.name}
        </h2>
        <p class={s.kind}>{isPet ? SPECIES_NOUN[def.species] : kindLabel(def)}</p>
        <p class={s.flavor}>{def.flavor}</p>
        <div class={s.fold} aria-hidden="true" />
        <p class={s.tier}>
          <Pill tone={data.secret ? 'secret' : TONE[data.rarity]}>{tierLabel(data.rarity, data.secret)}</Pill>
          <span>{RARITY_FINISH[data.rarity]}</span>
          {data.isNew && <span class={s.new}>New to your collection</span>}
        </p>

        {!data.isNew && (
          <div class={s.progress}>
            <span class={s.dupe}>
              <StardustIcon size={20} /> Onto the swap shelf · <b class="num">+{data.stardust}</b> swaps
            </span>
            {isPet && data.friendshipXp ? (
              <span class={s.dupe}>
                {petName} is already home. <b class="num">+{data.friendshipXp}</b> friendship
              </span>
            ) : null}
            {data.fusedStars > 0 && (
              <span class={s.fusion}>
                <StarIcon size={20} /> Ten swaps made a stamp · <b class="num">+{data.fusedStars}</b>
              </span>
            )}
          </div>
        )}

        {newPet && !naming && (
          <div class={s.nameTag}>
            <span class={s.tag}>
              <span class={s.tagName}>{petName}</span>
              <span class={s.tagDate}>came home {shortDate(cameHome)}</span>
            </span>
            <PillButton variant="quiet" size="sm" onClick={() => setNaming(true)}>
              Rename
            </PillButton>
          </div>
        )}

        {naming && (
          <form class={s.nameForm} onSubmit={saveName}>
            <label class={s.nameLabel} for={`${titleId}-name`}>
              {def.category === 'pet' ? `A name for the ${SPECIES_NOUN[def.species].toLowerCase()}` : 'A name'}
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
              <PillButton type="submit" size="sm">
                Save
              </PillButton>
            </div>
            {def.category === 'pet' && (
              <div class={s.ideas} role="group" aria-label="Name ideas">
                {nameIdeas(def.species, round, draft).map((n) => (
                  <button key={n} type="button" class={s.idea} onClick={() => setDraft(n)} onKeyDown={cancelName}>
                    {n}
                  </button>
                ))}
                <button type="button" class={s.idea} onClick={() => setRound((r) => r + 1)} onKeyDown={cancelName}>
                  Other names
                </button>
              </div>
            )}
          </form>
        )}

        <div class={s.actions}>
          {placeable && (
            <PillButton colors={machine ? { face: pillFace(machine), ink: '#3B3236' } : undefined} onClick={place}>
              {isPet ? 'Find them a place' : 'Find it a place'}
            </PillButton>
          )}
          {isPet && (
            <PillButton variant="secondary" onClick={letThemChoose}>
              Let them choose
            </PillButton>
          )}
        </div>
        <div class={s.actions}>
          {pullAgain && <PullAgainButton offer={pullAgain} />}
          <PillButton
            variant={placeable ? 'quiet' : 'primary'}
            colors={!placeable && machine ? { face: pillFace(machine), ink: '#3B3236' } : undefined}
            onClick={onClose}
          >
            Done
          </PillButton>
        </div>

        <p class="sr-only" role="status">
          {revealSentence(def, machine, data.rarity, data.secret, data.isNew, data.stardust)}
        </p>
      </section>
    </div>
  );
}

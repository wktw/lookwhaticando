/**
 * Steps 4 and 5 (DESIGN §9.6, VOICE §16), in their own chunk with the cabinets and the pets.
 *
 * 4. "Who comes home first?": the four first-pick cabinets (the domain's FIRST_CAPSULE_MACHINES:
 *    Cats · Cows · Dogs · Pond), two by two on a phone and in a row on a wide screen, with no
 *    price. Choosing one brings it forward for the first capsule, on the house
 *    (`pull(id, { free: true })` through CapsuleMachine): a coin in, the handle, the twist.
 *    The reveal card names the pet ("Rename", name ideas, "Another name") and says "Came home:
 *    today". "Find {name} a plant" goes on to step 5; "Let {name} choose" lets the pet pick
 *    (`letPetChoose`) and goes to Today; "Not now" goes to Today.
 * 5. "Find {name} a plant": the name once more, with ideas, and her new cuttings to choose from
 *    (`setCompanion`), or "Let {name} choose". A name idea is kept the moment it is tapped, and a
 *    typed name before Skip leaves the step (P-ui-13).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MutableRef } from 'preact/hooks';
import type { MachineId } from '@/catalog/types';
import { getMachine, seriesLabel } from '@/catalog/machines';
import { getCollectible } from '@/catalog/collectibles';
import { COMPANION, ONBOARDING, PET_CARD, fillLine } from '@/catalog/lines';
import { choseLine } from '@/catalog/format';
import { FIRST_CAPSULE_MACHINES } from '@/domain/gacha';
import { CabinetArt } from '@/art/machines/CabinetArt';
import { CollectibleArt } from '@/art/CollectibleArt';
import { PlantArt } from '@/art/plants';
import { useArtLight } from '@/art/scene/moment';
import { letPetChoose, renamePet, setCompanion, state } from '@/state/store';
import { CapsuleMachine } from '@/features/capsules/CapsuleMachine';
import { cameHomeLabel } from '@/features/capsules/copy';
import { nameIdeas } from '@/features/capsules/names';
import { haptic } from '@/fx/haptics';
import { sfx } from '@/fx/sound';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { toast } from '@/ui/toast';
import { ONBOARDING_COPY } from '@/features/you/copy';
import s from './Onboarding.module.css';

const NAME_MAX = 20;

/** Where the reveal sent her: on to step 5, or (after "Let {name} choose") to Today. */
type Intent = { kind: 'place' | 'chose'; petId: string };

function chooseFor(petId: string): void {
  const chose = letPetChoose(petId);
  if (!chose) return;
  const app = state.value;
  const name = app.pets[petId]?.name ?? getCollectible(petId)?.name ?? '';
  const habit = chose.habitId ? app.habits.find((h) => h.id === chose.habitId) : null;
  toast({ key: `chose-${petId}`, message: choseLine(name, chose, habit), tone: 'sage' });
}

/**
 * The cabinet whose first capsule is already committed but not yet opened (a reload mid-drop or
 * mid-reveal): the store's pendingReveal says which, so step 4 resumes it there instead of offering
 * all four cabinets again (creative-cr-d2, WP-A8).
 */
function waitingCabinet(): MachineId | null {
  const p = state.value.pendingReveal;
  return p && !p.order ? p.machineId : null;
}

export function FirstPickStep({ onFinish, onPlace }: { onFinish: () => void; onPlace: (petId: string) => void }) {
  const light = useArtLight();
  const [picked, setPicked] = useState<MachineId | null>(waitingCabinet);
  const [busy, setBusy] = useState(false);
  const intent = useRef<Intent | null>(null);

  const revealClosed = () =>
    // "Find {name} a plant" and "Let {name} choose" close the reveal first, then say which it was.
    queueMicrotask(() => {
      const i = intent.current;
      if (i?.kind === 'place') onPlace(i.petId);
      else onFinish();
    });

  if (picked) {
    const m = getMachine(picked);
    return (
      <div class={s.step}>
        <div class={s.pickedHead}>
          {/* Back to the four, until the coin is in (the space stays, so the title never jumps). */}
          <span class={s.back} style={{ visibility: busy ? 'hidden' : 'visible' }}>
            <IconButton icon="chevron-left" label={ONBOARDING_COPY.choose} disabled={busy} onClick={() => setPicked(null)} />
          </span>
          <h1 class={s.title}>{seriesLabel(m)}</h1>
        </div>
        <p class={s.lead}>{m.tagline}</p>
        <div class={s.machine}>
          <CapsuleMachine
            machine={m}
            active
            free
            light={light}
            onBusyChange={setBusy}
            onPlace={(id) => (intent.current = { kind: 'place', petId: id })}
            onLetThemChoose={(id) => {
              chooseFor(id);
              intent.current = { kind: 'chose', petId: id };
            }}
            onRevealClosed={revealClosed}
          />
        </div>
      </div>
    );
  }

  return (
    <div class={s.step}>
      <h1 class={s.title}>{ONBOARDING.firstPick}</h1>
      <p class={s.lead}>{ONBOARDING.firstPickLead}</p>
      <div class={s.cabinets}>
        {FIRST_CAPSULE_MACHINES.map((id) => {
          const m = getMachine(id);
          return (
            <button
              key={id}
              type="button"
              class={s.cabinet}
              aria-label={`${seriesLabel(m)}. ${m.tagline}`}
              onClick={() => {
                sfx.play('pop', { volume: 0.4 });
                haptic('tick');
                setPicked(id);
              }}
            >
              {/* The first capsule is on the house, so no price is printed on the cabinet. */}
              <CabinetArt machine={m} light={light} price={null} />
              <span class={s.cabinetName}>{seriesLabel(m)}</span>
              <span class={s.tagline}>{m.tagline}</span>
            </button>
          );
        })}
      </div>
      <div class={s.foot}>
        <Button variant="quiet" size="lg" block onClick={onFinish}>
          {ONBOARDING.notYet}
        </Button>
      </div>
    </div>
  );
}

export function PlaceStep({
  petId,
  habitIds,
  onDone,
  keepName: keepRef,
  canChange,
}: {
  petId: string;
  habitIds: string[];
  onDone: () => void;
  keepName?: MutableRef<(() => void) | null>;
  /** Onboarding's check that this window can change the save (false, with its note, when it can't). */
  canChange?: () => boolean;
}) {
  const app = state.value;
  const def = getCollectible(petId);
  const pet = app.pets[petId];
  const [draft, setDraft] = useState(pet?.name ?? def?.name ?? '');
  const [round, setRound] = useState(0);
  // The reveal has just named the pet (with its own Rename): here the name waits behind one.
  const [renaming, setRenaming] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renaming) nameInput.current?.focus();
  }, [renaming]);
  const habits = habitIds.map((id) => app.habits.find((h) => h.id === id)).filter((h): h is NonNullable<typeof h> => !!h && h.archivedOn === undefined);
  const light = useArtLight();
  // Skip (in onboarding's header) leaves through this step's name first; it goes with the step.
  useEffect(
    () => () => {
      if (keepRef) keepRef.current = null;
    },
    [],
  );

  if (!def || !pet || def.category !== 'pet') {
    return (
      <div class={s.step}>
        <h1 class={s.title}>{ONBOARDING.firstPick}</h1>
        <div class={s.foot}>
          <Button size="lg" block onClick={onDone}>
            {ONBOARDING_COPY.toToday}
          </Button>
        </div>
      </div>
    );
  }

  const name = draft.trim().slice(0, NAME_MAX) || pet.name;
  const keepName = () => {
    if (name !== pet.name) renamePet(petId, name);
  };
  if (keepRef) keepRef.current = keepName;
  /** A name idea is hers the moment she taps it: Skip, a reload or another window keep it too. */
  const takeIdea = (idea: string) => {
    // A name this window can't keep doesn't go in the field either (WP-C5): the note says why.
    if (canChange && !canChange()) return;
    setDraft(idea);
    const clean = idea.trim().slice(0, NAME_MAX);
    if (clean && clean !== pet.name) renamePet(petId, clean);
  };

  const home = (habitId: string) => {
    keepName();
    // The celebration layer says "{name} moved into {plant}." from the companion event.
    if (setCompanion(habitId, petId)) haptic('success');
    onDone();
  };

  const choose = () => {
    keepName();
    chooseFor(petId);
    onDone();
  };

  return (
    <div class={s.step}>
      <div class={s.petHead}>
        <span class={s.petArt} aria-hidden="true">
          <CollectibleArt id={petId} size={112} animated />
        </span>
        <p class={s.cameHome}>{cameHomeLabel(pet.obtainedAt)}</p>
      </div>
      <h1 class={s.title}>{fillLine(COMPANION.reveal.find, { name })}</h1>

      {renaming ? (
        <div class={s.nameField}>
          <label class={s.fieldLabel} for="onb-pet-name">
            {ONBOARDING_COPY.notice}
          </label>
          <input
            id="onb-pet-name"
            ref={nameInput}
            class={s.ownInput}
            value={draft}
            maxLength={NAME_MAX}
            autoComplete="off"
            enterKeyHint="done"
            onInput={(e) => setDraft(e.currentTarget.value)}
            onBlur={keepName}
          />
          <div class={s.ideas} role="group" aria-label={ONBOARDING_COPY.nameIdeas}>
            {nameIdeas(def.species, round, draft).map((n) => (
              <button key={n} type="button" class={s.idea} onClick={() => takeIdea(n)}>
                {n}
              </button>
            ))}
            <button type="button" class={s.idea} onClick={() => setRound((r) => r + 1)}>
              {ONBOARDING_COPY.anotherName}
            </button>
          </div>
        </div>
      ) : (
        <Button variant="quiet" size="sm" icon="edit" class={s.renameButton} onClick={() => setRenaming(true)}>
          {PET_CARD.buttons.rename}
        </Button>
      )}

      {habits.length > 0 && (
        <p class={s.note} id="onb-plants-lead">
          {fillLine(ONBOARDING_COPY.plantsLead, { name })}
        </p>
      )}
      {habits.length > 0 && (
        <ul class={s.plants} aria-labelledby="onb-plants-lead">
          {habits.map((h) => (
            <li key={h.id}>
              <button type="button" class={s.plant} onClick={() => home(h.id)}>
                <span class={s.plantArt} aria-hidden="true">
                  <PlantArt species={h.plant} stage={0} pot={h.pot} fit="icon" size={64} light={light} />
                </span>
                <span class={s.plantName}>{h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div class={s.foot}>
        <Button variant={habits.length ? 'secondary' : 'primary'} size="lg" block onClick={habits.length ? choose : () => (keepName(), onDone())}>
          {habits.length ? fillLine(COMPANION.reveal.choose, { name }) : ONBOARDING_COPY.toToday}
        </Button>
      </div>
    </div>
  );
}

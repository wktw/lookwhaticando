/**
 * Onboarding (DESIGN §9.6, VOICE §16): ninety seconds or less from a new place to the first pet,
 * and every step skippable.
 *
 *  (the install gate, in iPhone and Mac Safari tabs: "Just peek" · "Paste my plants")
 *  1. The empty sill in morning light: "New place. Which plants came with you?" and her name.
 *  2. "Pick up to 3.": the eight starters, "More ideas" and "Make my own". Each pick stands on the
 *     sill as a cutting in a glass. "Plant them" calls `completeOnboarding`.
 *  3. "Anything already done today?": live water buttons with the whole choreography, and the
 *     one-time top-up to 25 coins.
 *  4. "Who comes home first?": the four cabinets, and the first capsule on the house.
 *  5. The new pet's name, the came-home day, then "Find {name} a plant" or "Let {name} choose".
 *  Any "Not yet, I’ll earn it" / "Skip" at the end goes to Today, where the first-capsule card waits.
 *
 * The sill stays at the top through steps 1–3, so the plants she picks visibly arrive, and water
 * visibly lands. Steps 3–5 survive a reload (./progress).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DATA, INSTALL, ONBOARDING } from '@/catalog/lines';
import { TEMPLATES } from '@/catalog/templates';
import { Wordmark } from '@/art/icons/brand';
import { useArtLight } from '@/art/scene/moment';
import { enterDemo, state } from '@/state/store';
import { navigate } from '@/app/router';
import { holdUpdates } from '@/app/pwa';
import { InstallGate, shouldGateInstall } from '@/app/InstallGuide';
import { currentInstallPlatform } from '@/app/installPrompt';
import { Button } from '@/ui/Button';
import { announce } from '@/ui/announce';
import { cx } from '@/ui/cx';
import { ImportSheet } from '@/features/you/ImportSheet';
import { ONBOARDING_COPY } from '@/features/you/copy';
import { onboardingProgress, saveProgress } from './progress';
import { STEPS, nextPhase, stepIndex, type Phase, type Picks } from './flow';
import { SillStage, type StagePot } from './SillStage';
import { SillStep } from './SillStep';
import { PickStep, plantPicks } from './PickStep';
import { DoneTodayStep } from './DoneTodayStep';
import s from './Onboarding.module.css';

/** The gate is shown once per visit: after a peek at the demo, leaving it lands on step 1. */
const GATE_SEEN = 'catkin-gate-seen';

function gateSeen(): boolean {
  try {
    return sessionStorage.getItem(GATE_SEEN) === '1';
  } catch {
    return false;
  }
}
function markGateSeen(): void {
  try {
    sessionStorage.setItem(GATE_SEEN, '1');
  } catch {
    /* nothing to remember it in: the gate shows again next time */
  }
}

function firstPhase(): Phase {
  const p = onboardingProgress.value;
  if (state.value.profile.onboarded && p) return p.step;
  if (p) saveProgress(null); // left over from a save that has since been reset
  const hasSave = state.value.habits.length > 0;
  return !gateSeen() && shouldGateInstall(currentInstallPlatform(), hasSave) ? 'gate' : 'sill';
}

type CapsuleSteps = typeof import('./CapsuleSteps');
let capsuleSteps: Promise<CapsuleSteps> | null = null;
/** Steps 4 and 5 bring the cabinets and the pets: fetched while she is on the sill. */
const loadCapsuleSteps = () => (capsuleSteps ??= import('./CapsuleSteps').catch((e) => ((capsuleSteps = null), Promise.reject(e))));

function useCapsuleSteps(): CapsuleSteps | null {
  const [mod, setMod] = useState<CapsuleSteps | null>(null);
  useEffect(() => {
    let live = true;
    void loadCapsuleSteps().then(
      (m) => live && setMod(m),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return mod;
}

export function Onboarding() {
  const [phase, setPhase] = useState<Phase>(firstPhase);
  const [name, setName] = useState(state.value.profile.name);
  const [picks, setPicks] = useState<Picks>({ templateIds: [], custom: [] });
  const [importing, setImporting] = useState<false | 'file' | 'paste'>(false);
  const capsules = useCapsuleSteps();
  const light = useArtLight();
  const progress = onboardingProgress.value;
  const habitIds = progress?.habitIds ?? [];

  // No update reloads in the middle of this (DESIGN §11.1).
  useEffect(() => {
    holdUpdates.value = true;
    return () => {
      holdUpdates.value = false;
    };
  }, []);

  // Each step's heading takes focus, so VoiceOver starts reading the new step from its top.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h = document.querySelector<HTMLElement>('#main h1');
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }, [phase]);

  const finish = () => {
    saveProgress(null);
    navigate('today');
  };

  const go = (next: Phase | 'done', ids: string[] = habitIds, petId?: string) => {
    if (next === 'done') return finish();
    if (next === 'today' || next === 'first' || next === 'place') saveProgress({ step: next, habitIds: ids, ...(petId ? { petId } : progress?.petId ? { petId: progress.petId } : {}) });
    setPhase(next);
  };

  const plant = () => {
    const ids = plantPicks(name, picks);
    go(nextPhase('pick', ids.length), ids);
  };

  const skip = () => {
    if (phase === 'pick') {
      const ids = plantPicks(name, { templateIds: [], custom: [] });
      return go(nextPhase('pick', ids.length), ids);
    }
    go(nextPhase(phase, habitIds.length));
  };

  const peek = () => {
    markGateSeen();
    enterDemo();
    navigate('today');
  };

  if (phase === 'gate') {
    return (
      <div class={s.gate}>
        <InstallGate
          onPeek={peek}
          onPaste={() => setImporting('paste')}
          onStay={() => {
            markGateSeen();
            setPhase('sill');
          }}
        />
        <ImportSheet open={!!importing} title={INSTALL.paste} pasteFirst onClose={() => setImporting(false)} onImported={finish} />
      </div>
    );
  }

  const index = stepIndex(phase);
  const onSill = phase === 'sill' || phase === 'pick' || phase === 'today';
  const standalone = currentInstallPlatform() === 'installed';

  return (
    <div class={cx(s.page, onSill && s.withSill)} data-step={phase}>
      <header class={s.top}>
        <Wordmark size={22} light={light} class={s.brand} />
        <ol class={s.dots} aria-hidden="true">
          {STEPS.map((st, i) => (
            <li key={st} class={cx(s.dot, i === index && s.dotOn, i < index && s.dotDone)} />
          ))}
        </ol>
        <Button variant="quiet" size="sm" class={s.skip} onClick={phase === 'first' ? finish : skip}>
          {phase === 'first' ? ONBOARDING.notYet : ONBOARDING.skip}
        </Button>
      </header>

      {onSill && <SillStageFor phase={phase} picks={picks} habitIds={habitIds} />}

      <div class={s.body}>
        {phase === 'sill' && (
          <SillStep
            name={name}
            onName={setName}
            onNext={() => go('pick')}
            other={
              <Button variant="quiet" size="md" icon="import" onClick={() => setImporting(standalone ? 'paste' : 'file')}>
                {standalone ? INSTALL.paste : DATA.import}
              </Button>
            }
          />
        )}
        {phase === 'pick' && <PickStep picks={picks} onPicks={setPicks} onPlant={plant} />}
        {phase === 'today' && <DoneTodayStep habitIds={habitIds} onNext={() => go('first')} />}
        {(phase === 'first' || phase === 'place') && !capsules && <p class={s.lead}>{ONBOARDING.firstPickLead}</p>}
        {phase === 'first' && capsules && <capsules.FirstPickStep onFinish={finish} onPlace={(petId) => go('place', habitIds, petId)} />}
        {phase === 'place' && capsules && <capsules.PlaceStep petId={progress?.petId ?? ''} habitIds={habitIds} onDone={finish} />}
      </div>

      <ImportSheet
        open={!!importing}
        title={importing === 'paste' ? INSTALL.paste : DATA.import}
        pasteFirst={importing === 'paste'}
        onClose={() => setImporting(false)}
        onImported={() => {
          announce(DATA.imported);
          finish();
        }}
      />
    </div>
  );
}

/** The sill for steps 1–3: her picks as cuttings in glasses, then the planted habits. */
function SillStageFor({ phase, picks, habitIds }: { phase: Phase; picks: Picks; habitIds: string[] }) {
  const pots = useMemo<StagePot[] | null>(() => (phase === 'today' ? null : picksToPots(picks)), [phase, picks]);
  return <SillStage pots={pots} habitIds={habitIds} />;
}


function picksToPots(p: Picks): StagePot[] {
  const fromTemplates = p.templateIds.map((id) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    return { habitId: `t-${id}`, name: t.name, species: t.plant };
  });
  const custom = p.custom.map((h) => ({ habitId: `c-${h.name}`, name: h.name, species: h.plant }));
  return [...fromTemplates, ...custom];
}


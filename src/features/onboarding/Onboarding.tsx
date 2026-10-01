/**
 * Onboarding (DESIGN §9.6, VOICE §16): ninety seconds or less from a new place to the first pet,
 * and every step skippable.
 *
 *  (the install gate, in iPhone and Mac Safari tabs: "Just peek" · "Paste my plants")
 *  1. The empty sill in morning light: "New place. Which plants came with you?" and her name.
 *  2. "Pick up to 3.": the eight starters, "More ideas" and "Make my own". Each pick stands on the
 *     sill as a cutting in a glass. "Plant these" calls `completeOnboarding`.
 *  3. "Anything already done today?": live water buttons with the whole choreography, and the
 *     one-time top-up to 25 coins.
 *  4. "Who comes home first?": the four cabinets, and the first capsule on the house.
 *  5. The new pet's name, the came-home day, then "Find {name} a plant" or "Let {name} choose".
 *  Any "Not yet, I’ll earn it" / "Skip" at the end goes to Today, where the first-capsule card waits.
 *
 * The sill stays at the top through steps 1–3, so the plants she picks visibly arrive, and water
 * visibly lands. Steps 3–5 are the save's own (`profile.onboardingStep`, ./progress): the step shown
 * is the save's, so it survives a reload and follows another window's changes (WP-C5).
 *
 * Nothing moves on unless the save took it (WP-C5, creative-cr-d1): a planting or a step this window
 * can't write (another window owns the save, or a newer catkin's save is open) stays where it is,
 * keeps the picks, and says so under the shell's own note, which has "Use here".
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COMPANION, DATA, DATA_COPY, INSTALL, ONBOARDING, fillLine } from '@/catalog/lines';
import { TEMPLATES } from '@/catalog/templates';
import { Wordmark } from '@/art/icons/brand';
import { useArtLight } from '@/art/scene/moment';
import { enterDemo, readOnly, state } from '@/state/store';
import { navigate } from '@/app/router';
import { holdUpdates } from '@/app/pwa';
import { InstallGate, shouldGateInstall } from '@/app/InstallGuide';
import { currentInstallPlatform } from '@/app/installPrompt';
import { ScreenError, ScreenLoading } from '@/app/ScreenHost';
import { lazyModule, useLazyModule } from '@/app/useLazyModule';
import { Button } from '@/ui/Button';
import { announce } from '@/ui/announce';
import { dismissToast, findToast } from '@/ui/toast';
import { holdMoments } from '@/ui/sheetStack';
import { checkInKey, uncheckKey } from '@/fx/checkin';
import { cx } from '@/ui/cx';
import { ImportSheet } from '@/features/you/ImportSheet';
import { readClipboard } from '@/features/you/files';
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

/** Where this visit starts before anything is saved: the install gate once, else the sill. */
function firstPhase(): Phase {
  const hasSave = state.value.habits.length > 0;
  return !gateSeen() && shouldGateInstall(currentInstallPlatform(), hasSave) ? 'gate' : 'sill';
}

const NO_PICKS: Picks = { templateIds: [], custom: [] };

/** What a refused change says, by why this window can't change the save (null when it can). */
function refusalText(ro: (typeof readOnly)['value']): string | null {
  if (ro === 'other-window') return ONBOARDING_COPY.useHere;
  if (ro === 'newer-version') return DATA_COPY.readOnly;
  return null;
}

/**
 * Steps 4 and 5 bring the cabinets and the pets: fetched while she is on the sill. Until they
 * arrive the step shows its heading and a loading line; if they can't load, its heading and the
 * load error with "Try again" (WP-C4).
 */
const CAPSULE_STEPS = lazyModule(() => import('./CapsuleSteps'));

/** Gives a step's heading focus, so VoiceOver starts reading from its top. */
function focusHeading(h: HTMLElement | null | undefined): void {
  if (!h) return;
  h.tabIndex = -1;
  h.focus({ preventScroll: true });
}

/**
 * From the first watering to the end of onboarding, celebration banners and notes wait for Today
 * (the "First watering" and "First capsule" pins would otherwise cover the sill as the water
 * lands, then step 4's heading and Skip): `holdMoments()` holds them the way a full-screen moment
 * does, without making the page inert or locking its scroll.
 */
function useHoldCelebrations(on: boolean): void {
  useEffect(() => (on ? holdMoments() : undefined), [on]);
}

export function Onboarding() {
  /** The steps before anything is saved (the gate, the sill, the picks); steps 3–5 are the save's. */
  const [early, setEarly] = useState<Phase>(firstPhase);
  const [name, setName] = useState(state.value.profile.name);
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  /** A change this window couldn't make: the note shows until it can change the save again. */
  const [refused, setRefused] = useState(false);
  const ro = readOnly.value;
  /** Step 5's name, kept before Skip leaves the step (P-ui-13). */
  const keepPlaceName = useRef<(() => void) | null>(null);
  const [importing, setImporting] = useState<false | 'file' | 'paste'>(false);
  /** "Paste my plants": the clipboard read starts inside the tap (iPhone Safari allows no other). */
  const [clip, setClip] = useState<Promise<string | null> | null>(null);
  const pasteNow = () => {
    setClip(readClipboard());
    setImporting('paste');
  };
  const capsuleLoad = useLazyModule(CAPSULE_STEPS);
  const capsules = capsuleLoad.module;
  const page = useRef<HTMLDivElement>(null);
  const light = useArtLight();
  const progress = onboardingProgress.value;
  const phase: Phase = progress ? progress.step : early;
  const habitIds = progress?.habitIds ?? [];

  // After "Use here" this window can change the save again: the note has said its piece. And it
  // was about the step it was refused on: a step another window moves this one to starts without it.
  useEffect(() => {
    if (!refusalText(ro)) setRefused(false);
  }, [ro]);
  useEffect(() => setRefused(false), [phase]);

  // The save left the late steps without finishing them (started over in another window, which
  // this one followed): back to the sill, with nothing picked, like the fresh save it now shows.
  const late = progress !== null;
  const wasLate = useRef(late);
  useEffect(() => {
    if (wasLate.current && !late && !state.value.profile.onboarded) {
      setEarly('sill');
      setPicks(NO_PICKS);
    }
    wasLate.current = late;
  }, [late]);

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

  useHoldCelebrations(phase === 'today' || phase === 'first' || phase === 'place');

  // Steps 4 and 5 wait for their chunk. When it arrives after she waited for it, its heading takes
  // focus, unless she has moved focus somewhere of her own meanwhile. ("Try again" reloads the page
  // if importing again in it fails; steps 4 and 5 come back after a reload, ./progress.)
  const later = phase === 'first' || phase === 'place';
  const waited = useRef(false);
  if (later && !capsules) waited.current = true;
  useEffect(() => {
    if (!capsules || !waited.current) return;
    waited.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) focusHeading(page.current?.querySelector('h1'));
  }, [!!capsules]);

  /** The change didn't happen: stay, and say why (under the shell's note with "Use here"). */
  const refuse = () => {
    const text = refusalText(readOnly.peek());
    setRefused(true);
    if (text) announce(text);
  };
  /** For a step's own taps (a watering, a name idea): false, with the note, when this window can't change the save. */
  const canChange = (): boolean => {
    if (!refusalText(readOnly.peek())) return true;
    refuse();
    return false;
  };

  const finish = () => {
    if (!saveProgress(null)) return refuse();
    // The step's own watering notes had their say there; Today starts clean (the pins still wait for it).
    for (const id of habitIds) {
      for (const key of [checkInKey(id), uncheckKey(id)]) {
        const note = findToast(key);
        if (note) dismissToast(note.id);
      }
    }
    navigate('today');
  };

  /** A backup came in: the shell shows whatever its save is on (Today, or its own onboarding step). */
  const imported = () => navigate('today');

  const go = (next: Phase | 'done', ids: string[] = habitIds, petId?: string) => {
    if (next === 'done') return finish();
    if (next === 'today' || next === 'first' || next === 'place') {
      // The step shown is the save's: it moves only when the save took it.
      const pet = petId ?? progress?.petId;
      if (!saveProgress({ step: next, habitIds: ids, ...(pet ? { petId: pet } : {}) })) refuse();
      return;
    }
    setEarly(next);
  };

  /**
   * "Plant these" (and Skip on the picks: what she already picked is planted, not dropped). The save
   * then stands on step 3, or step 4 with nothing planted, and the step shown follows it. Refused,
   * the picks stay as they are for a retry after "Use here"; a save onboarded meanwhile (in another
   * window, or by an import) is shown as it is.
   */
  const plant = () => {
    const res = plantPicks(name, picks);
    if (res.ok) return;
    if (res.reason === 'read-only') return refuse();
    navigate('today');
  };

  const skip = () => {
    if (phase === 'pick') return plant();
    if (phase === 'place') keepPlaceName.current?.();
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
          onPaste={pasteNow}
          onStay={() => {
            markGateSeen();
            setEarly('sill');
          }}
        />
        <ImportSheet open={!!importing} title={INSTALL.paste} clip={clip} onClose={() => setImporting(false)} onImported={imported} />
      </div>
    );
  }

  const index = stepIndex(phase);
  const onSill = phase === 'sill' || phase === 'pick' || phase === 'today';
  const standalone = currentInstallPlatform() === 'installed';
  const note = refused ? refusalText(ro) : null;

  return (
    <div ref={page} class={cx(s.page, onSill && s.withSill)} data-step={phase}>
      <header class={s.top}>
        <Wordmark size={22} light={light} class={s.brand} />
        <span class={s.dotsWrap}>
          <span class="sr-only">{fillLine(ONBOARDING_COPY.stepOf, { n: index + 1, count: STEPS.length })}</span>
          <ol class={s.dots} aria-hidden="true">
            {STEPS.map((st, i) => (
              <li key={st} class={cx(s.dot, i === index && s.dotOn, i < index && s.dotDone)} />
            ))}
          </ol>
        </span>
        <Button variant="quiet" size="sm" class={s.skip} onClick={phase === 'first' ? finish : skip}>
          {ONBOARDING.skip}
        </Button>
      </header>

      {onSill && <SillStageFor phase={phase} picks={picks} habitIds={habitIds} />}

      <div class={s.body}>
        {note && (
          <p class={s.refused} data-onboarding-note="">
            {note}
          </p>
        )}
        {phase === 'sill' && (
          <SillStep
            name={name}
            onName={setName}
            onNext={() => go('pick')}
            other={
              <Button variant="quiet" size="sm" icon="import" onClick={() => (standalone ? pasteNow() : setImporting('file'))}>
                {standalone ? INSTALL.paste : DATA.import}
              </Button>
            }
          />
        )}
        {phase === 'pick' && <PickStep picks={picks} onPicks={setPicks} onPlant={plant} />}
        {phase === 'today' && <DoneTodayStep habitIds={habitIds} onNext={() => go('first')} canChange={canChange} />}
        {later && !capsules && (
          <CapsuleStepsPending
            heading={phase === 'place' && progress?.petId && state.value.pets[progress.petId] ? fillLine(COMPANION.reveal.find, { name: state.value.pets[progress.petId]!.name }) : ONBOARDING.firstPick}
            failed={capsuleLoad.status === 'error'}
            onRetry={capsuleLoad.retry}
          />
        )}
        {phase === 'first' && capsules && <capsules.FirstPickStep onFinish={finish} onPlace={(petId) => go('place', habitIds, petId)} />}
        {phase === 'place' && capsules && <capsules.PlaceStep petId={progress?.petId ?? ''} habitIds={habitIds} onDone={finish} keepName={keepPlaceName} canChange={canChange} />}
      </div>

      <ImportSheet
        open={!!importing}
        title={importing === 'paste' ? INSTALL.paste : DATA.import}
        clip={importing === 'paste' ? clip : null}
        onClose={() => setImporting(false)}
        onImported={(res) => {
          // Only what the import answered: no Undo is promised when no copy was kept (WP-A3).
          announce(res.undo ? DATA.imported : DATA_COPY.importedNoUndo);
          imported();
        }}
      />
    </div>
  );
}

/**
 * Steps 4 and 5 before their chunk is here: the step's own heading (so the step always has its one
 * h1), then a quiet loading line, or the load error with "Try again" in place of the lead. Skip
 * stays in the header. "Try again" hands focus to the heading first, since the button goes.
 */
function CapsuleStepsPending({ heading, failed, onRetry }: { heading: string; failed: boolean; onRetry: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <div class={s.step}>
      <h1 ref={title} class={s.title}>
        {heading}
      </h1>
      {failed ? (
        <ScreenError
          as="h2"
          onRetry={() => {
            focusHeading(title.current);
            onRetry();
          }}
        />
      ) : (
        <ScreenLoading />
      )}
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


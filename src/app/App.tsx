import { useEffect, useState } from 'preact/hooks';
import { cx } from '@/ui/cx';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { clockBehind, crossWindowNotice, damagedSave, damagedUnkept, demoMode, dismissCrossWindowNotice, durability, exitDemo, loadIssue, readOnly, retrySaving, useHere } from '@/state/store';
import { toast } from '@/ui/toast';
import { openHabitEditor } from '@/features/habits/open';
import { onboardingActive } from '@/features/onboarding/progress';
import { Icon } from '@/art/icons';
import { IconButton } from '@/ui/IconButton';
import { signal } from '@preact/signals';
import { currentTab } from './router';
import { routeFor } from './routes';
import { preloadAllWhenIdle } from './screens';
import { ScreenHost, ScreenLoading, ScreenError } from './ScreenHost';
import { SheetHosts } from './SheetHosts';
import { lazyModule, useLazyModule } from './useLazyModule';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { NEW_HABIT_EVENT } from './shortcuts';
import { SHELL_COPY } from './copy';
import s from './App.module.css';

const CLOCK_SEEN = 'catkin-clock-note';
function clockNoteAway(): boolean {
  try {
    return sessionStorage.getItem(CLOCK_SEEN) === '1';
  } catch {
    return false;
  }
}
/** The clock note, once put away, stays away for this visit (it may be true for days). */
const clockAway = signal(clockNoteAway());
function putClockAway(): void {
  clockAway.value = true;
  try {
    sessionStorage.setItem(CLOCK_SEEN, '1');
  } catch {
    /* for this page only, then */
  }
}

type Recovery = typeof import('@/features/you/recovery');
let recoveryChunk: Promise<Recovery> | null = null;
/** The recovery actions and sheets (You › Data's), loaded only when a note offers them. */
function loadRecovery(): Promise<Recovery> {
  recoveryChunk ??= import('@/features/you/recovery').catch((e: unknown) => {
    recoveryChunk = null;
    throw e;
  });
  return recoveryChunk;
}
const withRecovery = (use: (m: Recovery) => unknown) => () => void loadRecovery().then(use, () => undefined);

/** The Daily copies or Import sheet a note opened, right where she is (onboarding has no tabs). */
const recoverySheet = signal<null | 'snapshots' | 'import'>(null);

/** Hosts the sheets a note opens, once its module is in. */
function RecoveryHost() {
  const open = recoverySheet.value;
  const [mod, setMod] = useState<Recovery | null>(null);
  useEffect(() => {
    if (!open || mod) return;
    let live = true;
    loadRecovery().then(
      (m) => live && setMod(m),
      () => live && (recoverySheet.value = null),
    );
    return () => {
      live = false;
    };
  }, [open, mod]);
  if (!mod) return null;
  return <mod.RecoverySheets open={open} onClose={() => (recoverySheet.value = null)} />;
}

/** The load note she put away, for this visit (a later load issue is a new object, and shows). */
const loadNoteAway = signal<object | null>(null);

/** "Try again": writes what is waiting now, and says so if it still didn't save. */
function tryAgain(): void {
  retrySaving();
  if (durability.peek().kind === 'failing') toast({ key: 'save-retry', message: SHELL_LINES.stillNotSaved, tone: 'butter' });
}

type Action = { label: string; run: () => void };
type Note = { key: string; text: string; actions?: Action[]; close?: () => void };

/**
 * The calm notes above every screen (VOICE §18): another window owns the save ("Use here"), a
 * newer catkin's save opened read-only, a save that didn't go through (or can't be kept at all),
 * a save that couldn't be read (the one before it opened, or it was kept aside), a damaged save
 * whose room a full disk took (only in this window now, until it is saved), the save started
 * over in another window (put away with Close), the device clock behind, and, while peeking, the
 * demo pill with "Leave the demo".
 *
 * Every note about the save has a way forward (WP-A7, audit data-d10, data-d1): Save a backup
 * wherever the save shown is the only copy that counts, Try again on a change that didn't go
 * through, Save the damaged file, Daily copies and Import a backup for a save that couldn't be read.
 */
export function ShellBanners() {
  const ro = readOnly.value;
  const saveBackup: Action = { label: SHELL_LINES.saveBackup, run: withRecovery((m) => m.saveBackupNow()) };
  const dailyCopies: Action = { label: SHELL_LINES.dailyCopies, run: () => void (recoverySheet.value = 'snapshots') };
  const notes: Note[] = [];
  if (ro === 'other-window') {
    const [text = SHELL_LINES.otherWindow] = SHELL_LINES.otherWindow.split(' · ');
    notes.push({ key: 'other-window', text, actions: [{ label: SHELL_LINES.useHere, run: useHere }] });
  } else if (ro === 'newer-version') notes.push({ key: 'newer', text: SHELL_LINES.newerSave, actions: [saveBackup] });
  else {
    // A write that didn't go through (full or gone) is retried until it lands; with no storage at
    // all, nothing is kept past closing (audit data-d1, data-d2).
    const d = durability.value;
    if (d.kind === 'volatile') notes.push({ key: 'volatile', text: SHELL_LINES.volatile, actions: [saveBackup] });
    else if (d.kind === 'failing') notes.push({ key: 'save', text: SHELL_LINES.save, actions: [{ label: SHELL_LINES.tryAgain, run: tryAgain }, saveBackup] });
  }
  // A save that couldn't be read: the one before it opened, or it was kept aside (audit data-d10).
  const issue = loadIssue.value;
  const saveDamaged: Action = { label: SHELL_LINES.saveDamaged, run: withRecovery((m) => m.saveDamagedFile()) };
  const importBackup: Action = { label: SHELL_LINES.importBackup, run: () => void (recoverySheet.value = 'import') };
  // A full disk took the room the damaged file was kept in: it is only here now, so this note
  // takes the damaged note's place (it no longer is "kept"), with no Close, until it is saved.
  const unkept = damagedUnkept.value !== null;
  if (issue && issue !== loadNoteAway.value && (issue.kind === 'recovered-from-backup' || (issue.kind === 'corrupt-save' && !unkept))) {
    const close = () => void (loadNoteAway.value = issue);
    if (issue.kind === 'recovered-from-backup') notes.push({ key: 'recovered', text: SHELL_LINES.recovered, actions: [saveBackup, dailyCopies], close });
    else notes.push({ key: 'corrupt', text: SHELL_LINES.corrupt, actions: damagedSave() !== null ? [saveDamaged, dailyCopies, importBackup] : [dailyCopies, importBackup], close });
  }
  if (unkept) notes.push({ key: 'damaged', text: SHELL_LINES.damagedUnkept, actions: issue?.kind === 'corrupt-save' ? [saveDamaged, dailyCopies, importBackup] : [saveDamaged] });
  // Another window started over (or erased the save), and this one followed it (audit FS3).
  if (crossWindowNotice.value === 'started-over') notes.push({ key: 'started-over', text: SHELL_LINES.startedOver, close: dismissCrossWindowNotice });
  if (clockBehind.value && !clockAway.value) notes.push({ key: 'clock', text: SHELL_LINES.clock, close: putClockAway });
  const demo = demoMode.value;
  // The actions' module is fetched as soon as a note offers one, so a tap (the share sheet) finds it in.
  const offersRecovery = notes.some((n) => n.key !== 'other-window' && n.actions?.length);
  useEffect(() => {
    if (offersRecovery) void loadRecovery().catch(() => undefined);
  }, [offersRecovery]);
  return (
    <>
      {(notes.length > 0 || demo) && (
        <div class={s.banners}>
          {demo && (
            <div class={s.demo} role="status" data-demo-pill="">
              <span class={s.demoLabel}>
                <Icon name="sprout" size={16} />
                {SHELL_LINES.demoPill}
              </span>
              <button type="button" class={s.bannerButton} onClick={exitDemo}>
                {SHELL_LINES.leaveDemo}
              </button>
            </div>
          )}
          {notes.map((n) => (
            <div key={n.key} class={cx(s.banner, n.close && !n.actions && s.bannerQuiet)} role="status" data-banner={n.key}>
              <p class={s.bannerText}>{n.text}</p>
              {n.actions && (
                <span class={s.bannerActions}>
                  {n.actions.map((a) => (
                    <button key={a.label} type="button" class={s.bannerButton} onClick={a.run}>
                      {a.label}
                    </button>
                  ))}
                </span>
              )}
              {n.close && <IconButton icon="close" label={SHELL_LINES.close} size="sm" onClick={n.close} />}
            </div>
          ))}
        </div>
      )}
      <RecoveryHost />
    </>
  );
}

/**
 * Onboarding's chunk, loaded only for a save that needs it. If it can't load, an error with Try
 * again; a retry that fails in the page reloads it when that is safe, and onboarding comes back
 * from the save (./useLazyModule.ts, P-ui-22).
 */
const onboardingFlow = lazyModule(() => import('@/features/onboarding/Onboarding').then((m) => m.Onboarding));

/**
 * The responsive shell. Phones: the screen over a paper tab bar. ≥ 900 px: an oat sidebar and a
 * centred content column (720 px; the Shelf and Capsules get more room). A save that hasn't been
 * onboarded gets onboarding instead (DESIGN §9.6), full screen, with no tabs.
 */
export function App() {
  const tab = currentTab.value;
  const route = routeFor(tab);
  const onboarding = onboardingActive.value;
  const { status: flowStatus, module: Flow, retry } = useLazyModule(onboardingFlow, onboarding);

  useEffect(() => {
    document.title = onboarding || tab === 'today' ? SHELL_COPY.appName : `${route.label} · ${SHELL_COPY.appName}`;
  }, [tab, onboarding]);

  useEffect(() => {
    if (!onboarding) return preloadAllWhenIdle();
  }, [onboarding]);

  // "N plants a habit" (src/app/shortcuts.ts): the shell answers it wherever she is.
  useEffect(() => {
    const onNew = () => openHabitEditor();
    window.addEventListener(NEW_HABIT_EVENT, onNew);
    return () => window.removeEventListener(NEW_HABIT_EVENT, onNew);
  }, []);

  const skip = (
    <a class={s.skip} href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
      {SHELL_COPY.skip}
    </a>
  );

  if (onboarding) {
    return (
      <div class={s.shell}>
        {skip}
        <main id="main" class={s.onboarding} tabIndex={-1} aria-label={SHELL_COPY.appName}>
          <ShellBanners />
          {Flow ? <Flow /> : flowStatus === 'error' ? <ScreenError onRetry={retry} /> : <ScreenLoading />}
        </main>
      </div>
    );
  }

  return (
    <div class={s.shell}>
      {skip}
      <Sidebar tab={tab} />
      <main id="main" class={cx(s.main, route.wide && s.wide)} tabIndex={-1} aria-label={route.label}>
        <ShellBanners />
        <ScreenHost tab={tab} />
      </main>
      <TabBar tab={tab} />
      <SheetHosts />
    </div>
  );
}

import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { cx } from '@/ui/cx';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { clockBehind, demoMode, exitDemo, readOnly, saveStatus, useHere } from '@/state/store';
import { openHabitEditor } from '@/features/habits/open';
import { onboardingActive } from '@/features/onboarding/progress';
import { Icon } from '@/art/icons';
import { currentTab } from './router';
import { routeFor } from './routes';
import { preloadAllWhenIdle } from './screens';
import { ScreenHost, ScreenLoading, ScreenError } from './ScreenHost';
import { SheetHosts } from './SheetHosts';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { NEW_HABIT_EVENT } from './shortcuts';
import { SHELL_COPY } from './copy';
import s from './App.module.css';


/**
 * The calm notes above every screen (VOICE §18): another window owns the save ("Use here"), a
 * newer catkin's save opened read-only, a save that didn't go through, the device clock behind,
 * and, while peeking, the demo pill with "Leave the demo".
 */
export function ShellBanners() {
  const ro = readOnly.value;
  const notes: { key: string; text: string; action?: { label: string; run: () => void } }[] = [];
  if (ro === 'other-window') {
    const [text = SHELL_LINES.otherWindow] = SHELL_LINES.otherWindow.split(' · ');
    notes.push({ key: 'other-window', text, action: { label: SHELL_LINES.useHere, run: useHere } });
  } else if (ro === 'newer-version') notes.push({ key: 'newer', text: SHELL_LINES.newerSave });
  else if (ro === 'storage-full' || saveStatus.value.status === 'storage-full') notes.push({ key: 'save', text: SHELL_LINES.save });
  if (clockBehind.value) notes.push({ key: 'clock', text: SHELL_LINES.clock });
  const demo = demoMode.value;
  if (!notes.length && !demo) return null;
  return (
    <div class={s.banners}>
      {demo && (
        <div class={s.demo} role="status" data-demo-pill="">
          <span class={s.demoLabel}>
            <Icon name="sparkle" size={16} />
            {SHELL_LINES.demoPill}
          </span>
          <button type="button" class={s.bannerButton} onClick={exitDemo}>
            {SHELL_LINES.leaveDemo}
          </button>
        </div>
      )}
      {notes.map((n) => (
        <div key={n.key} class={s.banner} role="status" data-banner={n.key}>
          <p class={s.bannerText}>{n.text}</p>
          {n.action && (
            <button type="button" class={s.bannerButton} onClick={n.action.run}>
              {n.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Onboarding's chunk, loaded only for a save that needs it. */
function useOnboarding(needed: boolean): { Flow: ComponentType | null; failed: boolean; retry: () => void } {
  const [Flow, setFlow] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!needed || Flow) return;
    let live = true;
    setFailed(false);
    import('@/features/onboarding/Onboarding')
      .then((m) => live && setFlow(() => m.Onboarding))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [needed, attempt]);
  return { Flow, failed, retry: () => setAttempt((n) => n + 1) };
}

/**
 * The responsive shell. Phones: the screen over a paper tab bar. ≥ 900 px: an oat sidebar and a
 * centred content column (720 px; the Shelf and Capsules get more room). A save that hasn't been
 * onboarded gets onboarding instead (DESIGN §9.6), full screen, with no tabs.
 */
export function App() {
  const tab = currentTab.value;
  const route = routeFor(tab);
  const onboarding = onboardingActive.value;
  const { Flow, failed, retry } = useOnboarding(onboarding);

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
          {Flow ? <Flow /> : failed ? <ScreenError onRetry={retry} /> : <ScreenLoading />}
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

import type { ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { announce } from '@/ui/announce';
import { themeLight } from '@/ui/art/objects';
import { savedScroll, tabDirection } from './router';
import { loadedScreen, loadScreen } from './screens';
import { ErrorBoundary } from './ErrorBoundary';
import { SCREEN_COPY } from './copy';
import { routeFor, type TabId } from './routes';
import { lastInputWasKeyboard, trackInputModality } from './inputModality';
import { watchScene } from '@/fx/frameMonitor';
import s from './ScreenHost.module.css';

/**
 * Renders the current tab's screen: its lazy chunk, a quiet loading state, per-tab scroll, and a
 * calm entrance (a short crossfade with an 8 px slide toward the tab's side; no overshoot).
 * With reduced motion it only crossfades.
 *
 * A hash change alone says nothing to VoiceOver, so once a newly chosen tab's screen is on the
 * page it is announced ("Capsules"), and after keyboard navigation focus moves to its heading.
 * The first screen after launch is not announced (the page title already is).
 */
export function ScreenHost({ tab }: { tab: TabId }) {
  const [, setVersion] = useState(0);
  const [error, setError] = useState<{ tab: TabId } | null>(null);
  const Screen: ComponentType | undefined = loadedScreen(tab);
  const hostRef = useRef<HTMLDivElement>(null);
  /** The tab whose arrival was last announced (the launch tab counts as announced). */
  const announced = useRef<TabId>(tab);

  useEffect(trackInputModality, []);

  // A newly chosen tab, now on the page: say so, and bring keyboard focus to its heading.
  useEffect(() => {
    if (!Screen || announced.current === tab) return;
    announced.current = tab;
    announce(routeFor(tab).label);
    if (!lastInputWasKeyboard()) return;
    const heading = hostRef.current?.querySelector<HTMLElement>('h1');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [tab, !!Screen]);

  useEffect(() => {
    if (Screen) return;
    let live = true;
    setError(null);
    loadScreen(tab)
      .then(() => live && setVersion((v) => v + 1))
      .catch(() => live && setError({ tab }));
    return () => {
      live = false;
    };
  }, [tab, Screen]);

  // The Shelf keeps many small loops going: sample the frame rate once (auto-lite, DESIGN §11.1),
  // hold off-screen pets still, and let only the nearest few flick.
  useEffect(() => {
    const el = hostRef.current;
    if (tab !== 'shelf' || !Screen || !el) return;
    return watchScene(el);
  }, [tab, !!Screen]);

  // Restore this tab's scroll once its screen is actually on the page.
  useLayoutEffect(() => {
    if (Screen) window.scrollTo(0, savedScroll(tab));
  }, [tab, !!Screen]);

  const retry = () => {
    setError(null);
    loadScreen(tab)
      .then(() => setVersion((v) => v + 1))
      .catch(() => setError({ tab }));
  };

  return (
    <div key={tab} ref={hostRef} class={`${s.screen} ck-motion-safe`} data-dir={tabDirection.value}>
      {Screen ? (
        <ErrorBoundary key={tab}>
          <Screen />
        </ErrorBoundary>
      ) : error?.tab === tab ? (
        <ScreenError onRetry={retry} />
      ) : (
        <ScreenLoading />
      )}
    </div>
  );
}

type PlantsModule = typeof import('@/art/plants');
let plants: PlantsModule | null = null;
let plantsLoading: Promise<PlantsModule> | null = null;

/**
 * The sill's own pot and cutting (PotArt, PlantArt), so these screens show the same terracotta
 * pot and pothos cutting as the sill. The plant library loads beside the screen's chunk (the
 * screens use it too), keeping it out of the first-paint bundle; until it arrives, and if it
 * can't (offline before it was ever cached), the space stays quietly empty.
 */
function SillArt({ size, what }: { size: number; what: 'pot' | 'cutting' }) {
  const [mod, setMod] = useState<PlantsModule | null>(plants);
  useEffect(() => {
    if (mod) return;
    let live = true;
    plantsLoading ??= import('@/art/plants').then((m) => (plants = m));
    plantsLoading.then((m) => live && setMod(m)).catch(() => (plantsLoading = null));
    return () => {
      live = false;
    };
  }, []);
  if (!mod) return <span class={s.artSpace} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true" />;
  const light = themeLight();
  return what === 'pot' ? (
    <mod.PotArt pot="terracotta" size={size} light={light} />
  ) : (
    <mod.PlantArt species="pothos" stage={0} pot="terracotta" fit="icon" size={size} light={light} animated={false} />
  );
}

/**
 * Shown when a screen's chunk can't load (offline before it was ever cached, say). `as`: its title's
 * heading level, h2 where it stands under a step's own h1 (onboarding's capsule steps).
 */
export function ScreenError({ onRetry, as }: { onRetry: () => void; as?: 'h2' | 'h3' }) {
  return (
    <EmptyState title={SCREEN_COPY.loadErrorTitle} as={as} art={<SillArt what="pot" size={104} />} action={<Button onClick={onRetry}>{SCREEN_COPY.retry}</Button>}>
      {SCREEN_COPY.loadErrorText}
    </EmptyState>
  );
}

/** The lazy-load placeholder: a cutting in a glass. It fades in only if loading takes a moment. */
export function ScreenLoading() {
  return (
    <div class={s.loading} role="status">
      <SillArt what="cutting" size={84} />
      <p class={s.loadingText}>{SCREEN_COPY.loading}</p>
    </div>
  );
}

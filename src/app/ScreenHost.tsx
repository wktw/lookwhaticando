import type { ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { CuttingGlass, EmptyPot, themeLight } from '@/ui/art/objects';
import { savedScroll, tabDirection } from './router';
import { loadedScreen, loadScreen } from './screens';
import { ErrorBoundary } from './ErrorBoundary';
import { SCREEN_COPY } from './copy';
import type { TabId } from './routes';
import s from './ScreenHost.module.css';

/**
 * Renders the current tab's screen: its lazy chunk, a quiet loading state, per-tab scroll, and a
 * calm entrance (a short crossfade with an 8 px slide toward the tab's side; no overshoot).
 * With reduced motion it only crossfades.
 */
export function ScreenHost({ tab }: { tab: TabId }) {
  const [, setVersion] = useState(0);
  const [error, setError] = useState<{ tab: TabId } | null>(null);
  const Screen: ComponentType | undefined = loadedScreen(tab);

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
    <div key={tab} class={`${s.screen} ck-motion-safe`} data-dir={tabDirection.value}>
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

/** Shown when a screen's chunk can't load (offline before it was ever cached, say). */
export function ScreenError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState title={SCREEN_COPY.loadErrorTitle} art={<EmptyPot size={104} light={themeLight()} />} action={<Button onClick={onRetry}>{SCREEN_COPY.retry}</Button>}>
      {SCREEN_COPY.loadErrorText}
    </EmptyState>
  );
}

/** The lazy-load placeholder: a cutting in a glass. It fades in only if loading takes a moment. */
export function ScreenLoading() {
  return (
    <div class={s.loading} role="status">
      <CuttingGlass size={84} light={themeLight()} />
      <p class={s.loadingText}>{SCREEN_COPY.loading}</p>
    </div>
  );
}

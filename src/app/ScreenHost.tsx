import type { ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { PetArt } from '@/art/pets/PetArt';
import { CandyButton } from '@/ui/CandyButton';
import { EmptyState } from '@/ui/EmptyState';
import { savedScroll, tabDirection } from './router';
import { loadedScreen, loadScreen } from './screens';
import { ErrorBoundary } from './ErrorBoundary';
import type { TabId } from './routes';
import s from './ScreenHost.module.css';

/** Renders the active tab's screen: lazy chunk, cute loading state, per-tab scroll, soft entrance. */
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
    <div key={tab} class={s.screen} data-dir={tabDirection.value}>
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

/** Shown when a screen's chunk can't load (offline before it was cached, say). */
export function ScreenError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="This page is still asleep"
      art={<PetArt petId="pet-mochi" expression="sleep" size={104} />}
      action={
        <CandyButton icon="undo" onClick={onRetry}>
          Wake it up
        </CandyButton>
      }
    >
      It couldn’t load just now. Check your connection and try again?
    </EmptyState>
  );
}

/** The lazy-load placeholder: Mochi bobbing along. Fades in only if loading takes a moment. */
export function ScreenLoading() {
  return (
    <div class={s.loading} role="status">
      <div class={s.bob}>
        <PetArt petId="pet-mochi" size={84} animated />
      </div>
      <p class={s.loadingText}>
        Tidying up the meadow
        <span class={s.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}

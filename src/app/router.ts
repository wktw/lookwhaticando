/**
 * Tab state ⇄ location.hash, both ways. Links and navigate() push history entries, so the
 * back button and deep links work. Each tab remembers its own scroll position.
 */
import { effect, signal } from '@preact/signals';
import { formatHash, parseHash, type TabId } from './routes';

const initial = typeof location === 'undefined' ? parseHash('') : parseHash(location.hash);

export const currentTab = signal<TabId>(initial.tab);
/** Extra hash segments after the tab ('#/meadow/pet-x' → ['pet-x']) for screens that deep-link. */
export const routeRest = signal<string[]>(initial.rest);
/** +1 when the last switch moved right in the tab order, −1 when left (drives the slide). */
export const tabDirection = signal<1 | -1>(1);

const scrollByTab = new Map<TabId, number>();

export function savedScroll(tab: TabId): number {
  return scrollByTab.get(tab) ?? 0;
}

const ORDER: TabId[] = ['today', 'progress', 'capsules', 'meadow', 'you'];

function setTab(tab: TabId, rest: string[]) {
  const prev = currentTab.value;
  if (tab !== prev) {
    scrollByTab.set(prev, window.scrollY);
    tabDirection.value = ORDER.indexOf(tab) >= ORDER.indexOf(prev) ? 1 : -1;
  }
  routeRest.value = rest;
  currentTab.value = tab;
}

export function navigate(tab: TabId, rest: string[] = []): void {
  if (tab === currentTab.value && rest.join('/') === routeRest.value.join('/')) {
    // Re-selecting the current tab scrolls back to the top, like iOS.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  location.hash = formatHash(tab, rest);
}

/** Start syncing. Normalizes an empty/unknown hash to '#/today' without adding history. */
export function startRouter(): () => void {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const normalize = () => {
    const { tab, rest } = parseHash(location.hash);
    const canonical = formatHash(tab, rest);
    if (location.hash !== canonical) history.replaceState(history.state, '', canonical);
    setTab(tab, rest);
  };
  normalize();
  addEventListener('hashchange', normalize);
  // Setting the signal from code updates the URL too.
  const stop = effect(() => {
    const canonical = formatHash(currentTab.value, routeRest.value);
    if (parseHash(location.hash).tab !== currentTab.value) history.pushState(history.state, '', canonical);
  });
  return () => {
    removeEventListener('hashchange', normalize);
    stop();
  };
}

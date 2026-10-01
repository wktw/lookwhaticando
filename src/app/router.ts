/**
 * Tab state ⇄ location.hash, both ways. Links and navigate() push history entries, so the
 * back button and deep links work. Each tab remembers its own scroll position.
 */
import { effect, signal } from '@preact/signals';
import { prefersReducedMotion } from '@/fx/motion';
import { formatHash, parseHash, TAB_IDS, type TabId } from './routes';

const initial = typeof location === 'undefined' ? parseHash('') : parseHash(location.hash);

export const currentTab = signal<TabId>(initial.tab);
/**
 * Extra hash segments after the tab for screens that deep-link: '#/you/diagnostics', and the Shelf's
 * "put this thing somewhere" ('#/shelf/place/decor-yarn-ball', from a reveal's "Find it a place";
 * src/app/handoff.ts), which the Shelf takes in once and then clears with `replaceRest`.
 */
export const routeRest = signal<string[]>(initial.rest);
/** The Shelf's first segment for a thing to place: ['place', itemId]. */
export const PLACE_SEGMENT = 'place';
/** +1 when the last switch moved right in the tab order, −1 when left (drives the slide). */
export const tabDirection = signal<1 | -1>(1);

const scrollByTab = new Map<TabId, number>();

export function savedScroll(tab: TabId): number {
  return scrollByTab.get(tab) ?? 0;
}

const ORDER: readonly TabId[] = TAB_IDS;

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
    // Re-selecting the current tab scrolls back to the top, like iOS (instantly with reduced
    // motion: a JS 'smooth' scroll ignores the CSS reduced-motion override).
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return;
  }
  location.hash = formatHash(tab, rest);
}

/** Changes `tab`'s extra segments without a history entry (a deep link taken in, say), while it is the tab in the URL. */
export function replaceRest(tab: TabId, rest: string[]): void {
  if (typeof location !== 'undefined' && parseHash(location.hash).tab === tab) history.replaceState(history.state, '', formatHash(tab, rest));
  routeRest.value = rest;
}

/**
 * Start syncing. Normalizes an empty/unknown hash to '#/today', and an old one ('#/meadow') to
 * its new name ('#/shelf'), without adding history.
 */
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

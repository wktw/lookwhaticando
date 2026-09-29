/** Lazy screen loading with a shared cache, so preloads and navigation share one request. */
import type { ComponentType } from 'preact';
import { routeFor, TAB_IDS, type TabId } from './routes';

const loaded = new Map<TabId, ComponentType>();
const inflight = new Map<TabId, Promise<ComponentType>>();

export function loadedScreen(tab: TabId): ComponentType | undefined {
  return loaded.get(tab);
}

export function loadScreen(tab: TabId): Promise<ComponentType> {
  const hit = loaded.get(tab);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(tab);
  if (!p) {
    p = routeFor(tab)
      .load()
      .then((c) => {
        loaded.set(tab, c);
        return c;
      })
      .finally(() => inflight.delete(tab));
    inflight.set(tab, p);
  }
  return p;
}

/** Warm a screen's chunk (e.g. on tab press-down). Errors surface later, on navigation. */
export function preloadScreen(tab: TabId): void {
  loadScreen(tab).catch(() => undefined);
}

/** After first paint, quietly fetch the other screens while the browser is idle. */
export function preloadAllWhenIdle(): void {
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));
  idle(() => TAB_IDS.forEach(preloadScreen));
}

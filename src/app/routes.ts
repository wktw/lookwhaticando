/**
 * The five destinations (DESIGN §4). Screens are loaded lazily (one chunk each) from
 * '@/features/<x>/<X>Screen' (named export <X>Screen). Hash routing: '#/today' (default).
 */
import type { ComponentType } from 'preact';
import type { IconName } from '@/art/icons';

export const TAB_IDS = ['today', 'progress', 'capsules', 'meadow', 'you'] as const;
export type TabId = (typeof TAB_IDS)[number];

export interface RouteDef {
  id: TabId;
  label: string;
  icon: IconName;
  /** Wider content column on big screens (scenes and machines like room). */
  wide: boolean;
  load: () => Promise<ComponentType>;
}

export const ROUTES: readonly RouteDef[] = [
  { id: 'today', label: 'Today', icon: 'tab-today', wide: false, load: () => import('@/features/today/TodayScreen').then((m) => m.TodayScreen) },
  { id: 'progress', label: 'Progress', icon: 'tab-progress', wide: false, load: () => import('@/features/progress/ProgressScreen').then((m) => m.ProgressScreen) },
  { id: 'capsules', label: 'Capsules', icon: 'tab-capsules', wide: true, load: () => import('@/features/capsules/CapsulesScreen').then((m) => m.CapsulesScreen) },
  { id: 'meadow', label: 'Meadow', icon: 'tab-meadow', wide: true, load: () => import('@/features/meadow/MeadowScreen').then((m) => m.MeadowScreen) },
  { id: 'you', label: 'You', icon: 'tab-you', wide: false, load: () => import('@/features/you/YouScreen').then((m) => m.YouScreen) },
];

export const DEFAULT_TAB: TabId = 'today';

export function isTabId(s: string): s is TabId {
  return (TAB_IDS as readonly string[]).includes(s);
}

export function routeFor(id: TabId): RouteDef {
  return ROUTES.find((r) => r.id === id)!;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** '#/progress/extra' → { tab: 'progress', rest: ['extra'] }. Anything unknown → Today. */
export function parseHash(hash: string): { tab: TabId; rest: string[] } {
  const path = hash.replace(/^#!?\/?/, '').split('?')[0] ?? '';
  const [head = '', ...rest] = path.split('/').filter(Boolean).map(safeDecode);
  const tab = head.toLowerCase();
  return isTabId(tab) ? { tab, rest } : { tab: DEFAULT_TAB, rest: [] };
}

export function formatHash(tab: TabId, rest: readonly string[] = []): string {
  return `#/${[tab, ...rest.map(encodeURIComponent)].join('/')}`;
}

/** Keyboard shortcut digits: '1' → today … '5' → you. */
export function tabForDigit(key: string): TabId | null {
  const i = Number(key) - 1;
  return Number.isInteger(i) && i >= 0 && i < TAB_IDS.length ? TAB_IDS[i]! : null;
}

/**
 * Service worker registration (hosted PWA only; skipped in the single-file build, in dev,
 * and off http(s)). A new version is offered with a note ("Reload"); if she doesn't take it, it
 * applies while catkin is out of sight, never in front of her.
 *
 * Uses workbox-window directly (what virtual:pwa-register wraps): the virtual module only
 * exists when vite-plugin-pwa runs, and Rollup resolves dynamic imports even in dead branches,
 * so importing it would break `npm run build:single`.
 *
 * The update API (DESIGN §11.1 "Updates", You › About):
 * - `updateReady` is true while a new version waits (a note offers "Reload").
 * - `checkForUpdates()` asks the server now ("Check for updates").
 * - `reloadApp()` applies a waiting version, else simply reloads ("Reload app"); with a change
 *   that isn't written yet it says so first, with "Reload anyway".
 * - Coming back after more than 30 minutes away checks on its own, and a waiting version applies
 *   when the app is next hidden (so she never watches it reload), but never during a sheet, a
 *   reveal or onboarding (`holdUpdates`). Unsaved field text is committed on hide by its screen.
 */
import { getPlatform, type LifecycleEvent } from '@/platform/capabilities';
import { signal } from '@preact/signals';
import { toast } from '@/ui/toast';
import { anyLayerOpen } from '@/ui/sheetStack';
import { damagedUnkept, flushSaves, hasUnsavedWork } from '@/state/store';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { UPDATE_COPY } from '@/app/copy';

/** "A new version is ready · Reload" (VOICE §19): the note's words and its button. */
const [READY_TEXT = UPDATE_COPY.ready, RELOAD_LABEL = UPDATE_COPY.refresh] = SHELL_LINES.updateReady.split(' · ');

/** A new version is installed and waiting to take over. */
export const updateReady = signal(false);
/** True while something must not be interrupted by a reload (onboarding sets it). */
export const holdUpdates = signal(false);

/** How long the app must have been away before coming back checks for an update. */
export const RESUME_CHECK_MS = 30 * 60_000;

interface WorkboxLike {
  messageSkipWaiting(): void;
  addEventListener(type: string, fn: (e: { isUpdate?: boolean }) => void): void;
  register(): Promise<ServiceWorkerRegistration | undefined>;
}

let wb: WorkboxLike | null = null;
let registration: ServiceWorkerRegistration | undefined;
let lastCheck = 0;
/** A waiting version applies itself at most once per page (never a reload loop). */
let autoApplied = false;

/** Whether this build can update itself at all (the hosted PWA with a service worker). */
export function updatesSupported(): boolean {
  return browserReloadSupported() && getPlatform().updates === 'service-worker' && !import.meta.env.DEV && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator;
}

export function browserReloadSupported(): boolean {
  return getPlatform().install === 'web' && getPlatform().updates !== 'bundle';
}

function offerReload(): void {
  if (!browserReloadSupported() || getPlatform().updates !== 'service-worker') return;
  updateReady.value = true;
  toast({
    key: 'sw-update',
    message: READY_TEXT,
    tone: 'sage',
    duration: 0,
    action: { label: RELOAD_LABEL, onAction: () => reloadApp() },
  });
}

/**
 * Whether a reload now would interrupt her (a sheet, a reveal, onboarding) or lose a change that
 * isn't written yet (a save that is failing, or no storage at all; audit data-d2), or a damaged
 * save's text that only this window still holds (`damagedUnkept`, the WP-A7 review). The update
 * that applies itself while catkin is hidden waits for all of these.
 */
export function busy(): boolean {
  return holdUpdates.value || anyLayerOpen() || hasUnsavedWork() || damagedUnkept.value !== null;
}

/** How the page reloads (tests replace `run`: jsdom can't reload). */
export const pageReload = { run: (): void => location.reload() };

/**
 * "Reload app", or the update note's "Reload": the waiting version takes over and the page reloads
 * (or it simply reloads). A change still waiting for its moment is written first; one that can't
 * be written (a failing save, the writer lock not answered yet, a browser that keeps nothing) would
 * go with the reload, so she is told, and "Reload anyway" goes ahead (WP-A7, P-persistence-01).
 */
export function reloadApp(): void {
  if (!browserReloadSupported()) return;
  flushSaves();
  if (hasUnsavedWork()) {
    toast({
      key: 'reload-unsaved',
      message: SHELL_LINES.reloadUnsaved,
      tone: 'butter',
      duration: 0,
      action: { label: SHELL_LINES.reloadAnyway, onAction: () => reloadNow() },
    });
    return;
  }
  reloadNow();
}

function reloadNow(): void {
  if (!browserReloadSupported()) return;
  const waiting = registration?.waiting;
  if (wb && waiting) {
    wb.addEventListener('controlling', () => pageReload.run());
    wb.messageSkipWaiting();
    // If the new version never takes over (a stuck install), reload anyway.
    setTimeout(() => pageReload.run(), 3000);
    return;
  }
  pageReload.run();
}

export type UpdateCheck = 'ready' | 'up-to-date' | 'unavailable';

/** Waits (briefly) for an installing worker to settle; true when a version is then waiting. */
function settles(reg: ServiceWorkerRegistration, ms = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (reg.waiting) return resolve(true);
    const installing = reg.installing;
    if (!installing) return resolve(false);
    const timer = setTimeout(() => resolve(!!reg.waiting), ms);
    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed' && installing.state !== 'redundant') return;
      clearTimeout(timer);
      resolve(!!reg.waiting);
    });
  });
}

/** "Check for updates": asks the server for a newer version and says what it found. */
export async function checkForUpdates(): Promise<UpdateCheck> {
  if (!browserReloadSupported() || getPlatform().updates !== 'service-worker') return 'unavailable';
  if (updateReady.value) return 'ready';
  if (!registration) return 'unavailable';
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    return 'unavailable';
  }
  if (await settles(registration)) {
    if (!updateReady.value) offerReload();
    return 'ready';
  }
  return 'up-to-date';
}

/**
 * Leaving the app: a waiting version applies now, out of sight (after this event's other listeners,
 * such as a field committing its text, have run). Coming back: check after a long time away.
 */
function onVisibility(event: LifecycleEvent): void {
  if (!browserReloadSupported() || getPlatform().updates !== 'service-worker' || event === 'restore') return;
  if (event === 'pause') {
    if (updateReady.value && !autoApplied && !busy()) {
      autoApplied = true;
      setTimeout(() => {
        if (getPlatform().lifecycle.hidden && !busy()) reloadNow();
        else autoApplied = false;
      }, 0);
    }
    return;
  }
  if (Date.now() - lastCheck > RESUME_CHECK_MS) void checkForUpdates();
}

export async function registerServiceWorker(): Promise<void> {
  if (!updatesSupported()) return;
  try {
    const { Workbox } = await import('workbox-window');
    const box = new Workbox('./sw.js', { scope: './' }) as unknown as WorkboxLike;
    wb = box;
    box.addEventListener('waiting', () => offerReload());
    box.addEventListener('installed', (e) => {
      if (browserReloadSupported() && getPlatform().updates === 'service-worker' && !e.isUpdate) toast({ key: 'sw-offline', message: UPDATE_COPY.offline, tone: 'sage' });
    });
    registration = await box.register();
    lastCheck = Date.now();
    if (registration?.waiting) offerReload();
    getPlatform().lifecycle.subscribe(onVisibility);
  } catch {
    /* No service worker: the app still works online. */
  }
}

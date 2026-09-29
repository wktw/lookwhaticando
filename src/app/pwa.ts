/**
 * Service worker registration (hosted PWA only; skipped in the single-file build, in dev,
 * and off http(s)). Updates are offered gently, never forced.
 *
 * Uses workbox-window directly (what virtual:pwa-register wraps): the virtual module only
 * exists when vite-plugin-pwa runs, and Rollup resolves dynamic imports even in dead branches,
 * so importing it would break `npm run build:single`.
 *
 * The update API (DESIGN §11.1 "Updates", You › About):
 * - `updateReady` is true while a new version waits (a note offers "Reload").
 * - `checkForUpdates()` asks the server now ("Check for updates").
 * - `reloadApp()` applies a waiting version, else simply reloads ("Reload app").
 * - Coming back after more than 30 minutes away checks on its own, and a waiting version applies
 *   on the next hide → show, but never during a sheet, a reveal or onboarding (`holdUpdates`).
 */
import { signal } from '@preact/signals';
import { toast } from '@/ui/toast';
import { anyLayerOpen } from '@/ui/sheetStack';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { UPDATE_COPY } from './copy';

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
  return !__SINGLE_FILE__ && !import.meta.env.DEV && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator;
}

function offerReload(): void {
  updateReady.value = true;
  toast({
    key: 'sw-update',
    message: READY_TEXT,
    tone: 'sage',
    duration: 0,
    action: { label: RELOAD_LABEL, onAction: () => reloadApp() },
  });
}

/** Whether a reload now would interrupt her (a sheet, a reveal, onboarding). */
function busy(): boolean {
  return holdUpdates.value || anyLayerOpen();
}

/** "Reload app": the waiting version takes over and the page reloads (or it simply reloads). */
export function reloadApp(): void {
  const waiting = registration?.waiting;
  if (wb && waiting) {
    wb.addEventListener('controlling', () => location.reload());
    wb.messageSkipWaiting();
    // If the new version never takes over (a stuck install), reload anyway.
    setTimeout(() => location.reload(), 3000);
    return;
  }
  location.reload();
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

/** Coming back to the app: apply a waiting version if nothing is open, or check after a long time away. */
function onVisible(): void {
  if (document.visibilityState !== 'visible') return;
  if (updateReady.value && !autoApplied && !busy()) {
    autoApplied = true;
    reloadApp();
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
      if (!e.isUpdate) toast({ key: 'sw-offline', message: UPDATE_COPY.offline, tone: 'sage' });
    });
    registration = await box.register();
    lastCheck = Date.now();
    if (registration?.waiting) offerReload();
    document.addEventListener('visibilitychange', onVisible);
  } catch {
    /* No service worker: the app still works online. */
  }
}

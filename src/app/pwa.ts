/** The current web updater, isolated from feature code. Bundle capabilities disable it. */
export { updateReady, holdUpdates, browserReloadSupported, RESUME_CHECK_MS, updatesSupported, busy, pageReload, reloadApp, checkForUpdates, registerServiceWorker } from '@/platform/web/updates';
export type { UpdateCheck } from '@/platform/web/updates';

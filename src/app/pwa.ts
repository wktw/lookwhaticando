/**
 * Service worker registration (hosted PWA only; skipped in the single-file build, in dev,
 * and off http(s)). Updates are offered gently, never forced.
 *
 * Uses workbox-window directly (what virtual:pwa-register wraps): the virtual module only
 * exists when vite-plugin-pwa runs, and Rollup resolves dynamic imports even in dead branches,
 * so importing it would break `npm run build:single`.
 */
import { toast } from '@/ui/toast';

export async function registerServiceWorker(): Promise<void> {
  if (__SINGLE_FILE__ || import.meta.env.DEV) return;
  if (!/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;
  try {
    const { Workbox } = await import('workbox-window');
    const wb = new Workbox('./sw.js', { scope: './' });
    wb.addEventListener('waiting', () => {
      toast({
        key: 'sw-update',
        message: 'A fresh version is ready 🌱',
        tone: 'sage',
        duration: 0,
        action: {
          label: 'Refresh',
          onAction: () => {
            wb.addEventListener('controlling', () => location.reload());
            wb.messageSkipWaiting();
          },
        },
      });
    });
    wb.addEventListener('installed', (e) => {
      if (!e.isUpdate) toast({ key: 'sw-offline', message: 'Mochi Meadow now works offline 🌿', tone: 'sage' });
    });
    await wb.register();
  } catch {
    /* No service worker: the app still works online. */
  }
}

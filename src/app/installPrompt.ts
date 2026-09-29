/**
 * "Add to Home Screen" support: platform detection (pure, tested) and capture of Chromium's
 * beforeinstallprompt so the You screen can offer a one-tap Install button.
 */
import { signal } from '@preact/signals';

export type InstallPlatform =
  | 'installed' // already running as an app
  | 'ios-safari' // Share → Add to Home Screen
  | 'ios-other' // Chrome/Edge/Firefox on iOS: same, via their Share menu
  | 'mac-safari' // File → Add to Dock
  | 'prompt' // Chromium with a captured install prompt: one tap
  | 'chromium' // Chromium desktop without a prompt yet: the install icon in the address bar
  | 'android' // ⋮ menu → Install app / Add to Home screen
  | 'other';

export interface InstallEnv {
  ua: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
  canPrompt: boolean;
}

export function detectInstallPlatform({ ua, platform, maxTouchPoints, standalone, canPrompt }: InstallEnv): InstallPlatform {
  if (standalone) return 'installed';
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (canPrompt) return 'prompt';
  if (/Android/.test(ua)) return 'android';
  const chromium = /Chrome|Chromium|Edg\//.test(ua);
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !chromium && !/Firefox/.test(ua)) return 'mac-safari';
  if (chromium) return 'chromium';
  return 'other';
}

/**
 * Safari's major version from its user agent ("Version/26.0"). iOS 26 froze the OS number in
 * the UA but not this one, so it tells the new compact Safari (⋯ menu) from the classic toolbar.
 */
export function safariMajor(ua: string): number | null {
  const m = /Version\/(\d+)/.exec(ua);
  return m ? Number(m[1]) : null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** The deferred Chromium install prompt, when the browser offered one. */
export const installPrompt = signal<BeforeInstallPromptEvent | null>(null);
export const justInstalled = signal(false);

type StandaloneNavigator = Navigator & { standalone?: boolean };

export function currentInstallPlatform(): InstallPlatform {
  if (justInstalled.value) return 'installed';
  return detectInstallPlatform({
    ua: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as StandaloneNavigator).standalone === true,
    canPrompt: !!installPrompt.value,
  });
}

/** Call once at boot, before the browser fires beforeinstallprompt. */
export function captureInstallPrompt(): void {
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt.value = e as BeforeInstallPromptEvent;
  });
  addEventListener('appinstalled', () => {
    installPrompt.value = null;
    justInstalled.value = true;
  });
}

/** Show the browser's install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = installPrompt.value;
  if (!e) return false;
  installPrompt.value = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') justInstalled.value = true;
  return outcome === 'accepted';
}

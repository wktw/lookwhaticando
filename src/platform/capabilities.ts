/**
 * The web app's platform boundary. Configure once before boot, as with StoreRuntime; the
 * returned disposer is useful for isolated tests. This module exposes no native bridge and
 * reads no bridge from window. The browser remains the default in both web builds.
 */
import * as files from './web/files';
import { haptic, hapticsSupported, type HapticKind } from './web/haptics';
import * as installation from './web/install';
import { isAppleTouch, wantsStaticCal } from './web/environment';
import { MAX_IMPORT_BYTES } from '@/state/handoffCore';

export type LifecycleEvent = 'pause' | 'resume' | 'restore';
export interface PlatformCapabilities {
  files: typeof files & { readonly maxImportBytes: number; readonly calendarDelivery: 'static' | 'generated' };
  haptics: { feedback(kind: HapticKind): void; supported(): boolean };
  readonly updates: 'service-worker' | 'bundle' | 'single-file';
  readonly install: 'web' | 'native';
  installation: typeof installation & { readonly userAgent: string; readonly localFile: boolean };
  lifecycle: { subscribe(listener: (event: LifecycleEvent) => void): () => void; readonly hidden: boolean };
  /** True means handled. A false response leaves a real link's default browser action intact. */
  externalLinks: { open(url: string, options?: { fromLink?: boolean }): boolean };
  /** An optional future capability. The web app does not schedule notifications. */
  notifications?: { schedule(id: string, at: Date, text: string): Promise<void>; cancel(id: string): Promise<void> };
}

const web: PlatformCapabilities = {
  files: {
    ...files,
    maxImportBytes: MAX_IMPORT_BYTES,
    get calendarDelivery() {
      return wantsStaticCal({ single: __SINGLE_FILE__, protocol: location.protocol, appleTouch: isAppleTouch() }) ? 'static' : 'generated';
    },
  },
  haptics: { feedback: haptic, supported: hapticsSupported },
  get updates() { return __SINGLE_FILE__ || (typeof location !== 'undefined' && location.protocol === 'file:') ? 'single-file' : 'service-worker'; },
  install: 'web',
  installation: {
    ...installation,
    get userAgent() { return navigator.userAgent; },
    get localFile() { return location.protocol === 'file:'; },
  },
  lifecycle: {
    get hidden() { return document.visibilityState === 'hidden'; },
    subscribe(listener) {
      const visibility = () => listener(document.visibilityState === 'hidden' ? 'pause' : 'resume');
      const restore = (event: PageTransitionEvent) => { if (event.persisted) listener('restore'); };
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('pageshow', restore);
      return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pageshow', restore); };
    },
  },
  externalLinks: {
    open(url, options) {
      if (options?.fromLink) return false;
      const target = new URL(url, location.href);
      if (!/^https?:$/.test(target.protocol)) return false;
      window.open(target.href, '_blank', 'noopener,noreferrer');
      return true;
    },
  },
};
let platform: PlatformCapabilities = web;
export function getPlatform(): PlatformCapabilities { return platform; }
export function setPlatform(overrides: Partial<PlatformCapabilities>): () => void {
  const previous = platform;
  // Keep lazy browser getters lazy: importing the web app in a server-side test is safe.
  platform = Object.create(previous) as PlatformCapabilities;
  Object.defineProperties(platform, Object.getOwnPropertyDescriptors(overrides));
  return () => { platform = previous; };
}

/** Device observations for the bug report, filtered to the adapter that actually supplies them. */
export function capabilityDiagnostics(): { serviceWorker: 'controlling' | 'not controlling' | 'not supported'; shareSheet: boolean; vibration: boolean } {
  const p = getPlatform();
  const browser = p.install === 'web';
  return {
    serviceWorker: browser && p.updates !== 'bundle' && 'serviceWorker' in navigator
      ? navigator.serviceWorker.controller ? 'controlling' : 'not controlling'
      : 'not supported',
    shareSheet: p.files === web.files ? browser && 'share' in navigator : p.files.canShareFiles(),
    vibration: browser && p.haptics === web.haptics && typeof navigator.vibrate === 'function',
  };
}

import { describe, expect, it } from 'vitest';
import { detectInstallPlatform, safariMajor, type InstallEnv } from '@/app/installPrompt';
import { guideFor } from '@/app/InstallGuide';
import { resolveTheme } from '@/app/theme';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  // iOS 26 froze the OS version in the UA, but Safari's own version moves on.
  iphoneSafari26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1',
  ipadDesktopUa: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
};

const env = (ua: string, over: Partial<InstallEnv> = {}): InstallEnv => ({ ua, platform: /Mac/.test(ua) ? 'MacIntel' : 'Win32', maxTouchPoints: 0, standalone: false, canPrompt: false, ...over });

describe('install platform detection', () => {
  it('already installed wins', () => {
    expect(detectInstallPlatform(env(UA.iphoneSafari, { standalone: true }))).toBe('installed');
  });
  it('iOS Safari vs other iOS browsers', () => {
    expect(detectInstallPlatform(env(UA.iphoneSafari, { platform: 'iPhone', maxTouchPoints: 5 }))).toBe('ios-safari');
    expect(detectInstallPlatform(env(UA.iphoneChrome, { platform: 'iPhone', maxTouchPoints: 5 }))).toBe('ios-other');
  });
  it('iPadOS pretending to be a Mac is still iOS', () => {
    expect(detectInstallPlatform(env(UA.ipadDesktopUa, { maxTouchPoints: 5 }))).toBe('ios-safari');
  });
  it('macOS Safari gets Add to Dock', () => {
    expect(detectInstallPlatform(env(UA.macSafari))).toBe('mac-safari');
  });
  it('Chromium: one-tap prompt when captured, else the address-bar hint', () => {
    expect(detectInstallPlatform(env(UA.winEdge, { canPrompt: true }))).toBe('prompt');
    expect(detectInstallPlatform(env(UA.macChrome))).toBe('chromium');
    expect(detectInstallPlatform(env(UA.winEdge))).toBe('chromium');
  });
  it('Android without a prompt, and everything else', () => {
    expect(detectInstallPlatform(env(UA.android, { platform: 'Linux armv8l', maxTouchPoints: 5 }))).toBe('android');
    expect(detectInstallPlatform(env(UA.winFirefox))).toBe('other');
  });
});

describe('which iOS Safari steps to show', () => {
  it('reads Safari’s own version from the UA', () => {
    expect(safariMajor(UA.iphoneSafari26)).toBe(26);
    expect(safariMajor(UA.iphoneSafari)).toBe(18);
    expect(safariMajor(UA.iphoneChrome)).toBeNull();
  });
  it('iOS 26+ (or unknown) gets the ⋯ → Share → View More steps; older Safari the classic toolbar', () => {
    expect(guideFor('ios-safari', UA.iphoneSafari26)).toBe('ios-safari');
    expect(guideFor('ios-safari', UA.iphoneSafari)).toBe('ios-safari-classic');
    expect(guideFor('ios-safari', 'unknown')).toBe('ios-safari');
    expect(guideFor('mac-safari', UA.macSafari)).toBe('mac-safari');
  });
});

describe('theme resolution', () => {
  it('follows the system only on auto', () => {
    expect(resolveTheme('auto', true)).toBe('night');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('night', false)).toBe('night');
  });
});

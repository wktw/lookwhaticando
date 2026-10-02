/** Installation is a platform capability; embedded bundles never offer browser installation. */
import { getPlatform } from '@/platform/capabilities';
export { detectInstallPlatform, safariMajor, installPrompt, justInstalled } from '@/platform/web/install';
export type { InstallPlatform, InstallEnv } from '@/platform/web/install';
import type { InstallPlatform } from '@/platform/web/install';

export function currentInstallPlatform(): InstallPlatform {
  const platform = getPlatform();
  return platform.install === 'native' ? 'installed' : platform.installation.currentInstallPlatform();
}
export function captureInstallPrompt(): void {
  if (getPlatform().install === 'web') getPlatform().installation.captureInstallPrompt();
}
export function promptInstall(): Promise<boolean> {
  return getPlatform().install === 'web' ? getPlatform().installation.promptInstall() : Promise.resolve(false);
}

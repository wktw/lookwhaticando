import { render } from 'preact';
import '@/styles/global.css';
import { hydrate, startClock } from '@/state/store';
import { App } from '@/app/App';
import { startThemeSync } from '@/app/theme';
import { startRouter } from '@/app/router';
import { installShortcuts } from '@/app/shortcuts';
import { registerServiceWorker } from '@/app/pwa';
import { captureInstallPrompt } from '@/app/installPrompt';
import { installAudioUnlock } from '@/fx/sound';
import { CelebrationHost } from '@/fx/celebrations';
import { Toaster } from '@/ui/Toaster';
import { overlayRoot } from '@/ui/overlay';

hydrate();
startClock();
startThemeSync();
startRouter();
installShortcuts();
installAudioUnlock();
captureInstallPrompt();
overlayRoot();
// iOS only applies :active styles (candy presses) when a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true });

render(
  <>
    <App />
    <Toaster />
    <CelebrationHost />
  </>,
  document.getElementById('app')!,
);

void registerServiceWorker();

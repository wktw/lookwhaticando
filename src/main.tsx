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
import { LazyCelebrationHost } from '@/fx/celebrationHostLoader';
import { Toaster } from '@/ui/Toaster';
import { overlayRoot } from '@/ui/overlay';

/** The single file opened from disk (DESIGN §11.1): its saves live in this browser, for this file only. */
const TEST_COPY = location.protocol === 'file:';
const RIBBON_H = 28;

/**
 * "Test copy" ribbon for the file:// build. It sits in the top inset: --safe-top grows by its
 * height, so the shell, sheets, notes and overlays (which all pad by --safe-top) clear it.
 */
function TestCopyRibbon() {
  return (
    <div
      role="note"
      data-test-copy=""
      style={{
        position: 'fixed',
        insetInline: 0,
        top: 0,
        zIndex: 800,
        boxSizing: 'border-box',
        height: `calc(env(safe-area-inset-top, 0px) + ${RIBBON_H}px)`,
        padding: '0 12px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'var(--butter-100)',
        borderBottom: '1px solid var(--line)',
        color: 'var(--ink)',
        font: `700 12px/${RIBBON_H - 1}px var(--font-body)`,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      Test copy · saved only in this browser, for this file
    </div>
  );
}

if (TEST_COPY) document.documentElement.style.setProperty('--safe-top', `calc(env(safe-area-inset-top, 0px) + ${RIBBON_H}px)`);

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
    {TEST_COPY && <TestCopyRibbon />}
    <App />
    <Toaster />
    <LazyCelebrationHost />
  </>,
  document.getElementById('app')!,
);

void registerServiceWorker();

/**
 * "Put Mochi Meadow on your Home Screen": a card for the You screen plus an illustrated,
 * platform-aware steps sheet (iOS Safari, iOS other browsers, macOS Safari, Chromium, Android).
 */
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from '@/ui/Card';
import { CandyButton } from '@/ui/CandyButton';
import { Pill } from '@/ui/Pill';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { AppIconArt } from './AppIconArt';
import { currentInstallPlatform, installPrompt, promptInstall, type InstallPlatform } from './installPrompt';
import { AddToHomeArt, AndroidMenuArt, ChromeInstallArt, DockArt, HomeScreenArt, MacDockArt, ShareStepArt } from './installArt';
import s from './InstallGuide.module.css';

interface Step {
  title: string;
  text: string;
  art: () => JSX.Element;
}

const HOME: Step = { title: 'Tap Add', text: 'Mochi Meadow opens full-screen, works offline and gets her very own icon.', art: HomeScreenArt };

const GUIDES: Record<Exclude<InstallPlatform, 'installed'>, { title: string; steps: Step[] }> = {
  'ios-safari': {
    title: 'Add to your Home Screen',
    steps: [
      { title: 'Tap Share', text: 'The square with an arrow, in Safari’s toolbar.', art: () => <ShareStepArt /> },
      { title: 'Choose “Add to Home Screen”', text: 'Scroll the list a little if you don’t see it right away.', art: AddToHomeArt },
      HOME,
    ],
  },
  'ios-other': {
    title: 'Add to your Home Screen',
    steps: [
      { title: 'Tap Share', text: 'It’s in the address bar (or tucked in the ⋯ menu).', art: () => <ShareStepArt inAddressBar /> },
      { title: 'Choose “Add to Home Screen”', text: 'Scroll the list a little if you don’t see it right away.', art: AddToHomeArt },
      HOME,
    ],
  },
  'mac-safari': {
    title: 'Add to your Dock',
    steps: [
      { title: 'File → Add to Dock…', text: 'In Safari’s menu bar, open File and choose Add to Dock.', art: MacDockArt },
      { title: 'Click Add', text: 'Mochi Meadow gets her own window and a cozy spot in your Dock.', art: DockArt },
    ],
  },
  prompt: {
    title: 'Install Mochi Meadow',
    steps: [{ title: 'One tap', text: 'Press Install and your browser does the rest.', art: ChromeInstallArt }],
  },
  chromium: {
    title: 'Install Mochi Meadow',
    steps: [
      { title: 'Find the install icon', text: 'Click the little screen-with-an-arrow at the end of the address bar (or ⋮ → Install Mochi Meadow).', art: ChromeInstallArt },
      { title: 'Click Install', text: 'She opens in her own window, even offline.', art: DockArt },
    ],
  },
  android: {
    title: 'Add to your Home screen',
    steps: [
      { title: 'Open the ⋮ menu', text: 'Choose “Install app” or “Add to Home screen”.', art: AndroidMenuArt },
      HOME,
    ],
  },
  other: {
    title: 'Install Mochi Meadow',
    steps: [{ title: 'Try Safari, Chrome or Edge', text: 'Open this page in one of those to install it. Or keep using it right here, that works too!', art: HomeScreenArt }],
  },
};

async function install() {
  if (await promptInstall()) toast({ message: 'Welcome home, little meadow 🌱', tone: 'sage' });
}

export interface InstallSheetProps {
  open: boolean;
  onClose: () => void;
  /** Force a platform (gallery, tests); defaults to the detected one. */
  platform?: InstallPlatform;
}

export function InstallSheet({ open, onClose, platform }: InstallSheetProps) {
  const p = platform ?? currentInstallPlatform();
  if (p === 'installed') {
    return (
      <Sheet open={open} onClose={onClose} title="You’re all set" size="sm">
        <div class={s.done}>
          <AppIconArt size={96} shape="squircle" />
          <p>Mochi Meadow is installed. Find her on your Home Screen or Dock. 🌱</p>
        </div>
      </Sheet>
    );
  }
  const guide = GUIDES[p];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={guide.title}
      description="Full-screen, works offline, and your meadow is always one tap away."
      size="md"
      peek={<AppIconArt size={68} shape="squircle" />}
      footer={
        p === 'prompt' ? (
          <CandyButton size="lg" block onClick={() => void install().then(onClose)}>
            Install
          </CandyButton>
        ) : (
          <CandyButton variant="secondary" size="lg" block onClick={onClose}>
            Got it
          </CandyButton>
        )
      }
    >
      <ol class={s.steps}>
        {guide.steps.map((step, i) => (
          <li key={step.title} class={s.step}>
            <div class={s.stepText}>
              <span class={s.num} aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 class={s.stepTitle}>{step.title}</h3>
                <p class={s.stepBody}>{step.text}</p>
              </div>
            </div>
            <div class={s.artCard}>{step.art()}</div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/** The You-screen card: one line of why, one button of how. */
export function InstallGuide({ class: cls }: { class?: string }) {
  const [open, setOpen] = useState(false);
  const p = currentInstallPlatform();
  const canPrompt = !!installPrompt.value;
  return (
    <Card class={[s.card, cls].filter(Boolean).join(' ')} tone="blush">
      <AppIconArt size={60} shape="squircle" class={s.icon} />
      <div class={s.cardText}>
        <h3 class={s.cardTitle}>{p === 'mac-safari' ? 'Mochi Meadow in your Dock' : 'Mochi Meadow on your Home Screen'}</h3>
        <p class={s.cardBody}>{p === 'installed' ? 'Installed and cozy. Thank you!' : 'Full-screen, offline, one tap away.'}</p>
      </div>
      {p === 'installed' ? (
        <Pill tone="sage" variant="solid">
          Installed ✓
        </Pill>
      ) : canPrompt ? (
        <CandyButton size="sm" onClick={() => void install()}>
          Install
        </CandyButton>
      ) : (
        <CandyButton size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Show me how
        </CandyButton>
      )}
      <InstallSheet open={open} onClose={() => setOpen(false)} platform={p} />
    </Card>
  );
}

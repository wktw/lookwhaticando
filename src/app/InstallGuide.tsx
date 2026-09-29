/**
 * "Keep catkin on your Home Screen" (DESIGN §11.1): the install-first gate for Safari tabs, a
 * card for the You screen, and an illustrated, platform-aware steps sheet (iOS Safari 26 and
 * older, other iOS browsers, the Mac's Add to Dock, Chrome/Edge Install, Android).
 */
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { AppIconArt } from './AppIconArt';
import { currentInstallPlatform, installPrompt, promptInstall, safariMajor, type InstallPlatform } from './installPrompt';
import { AddToHomeArt, AndroidMenuArt, ChromeInstallArt, CompactShareArt, DockArt, HomeScreenArt, MacDockArt, ShareStepArt, ViewMoreArt } from './installArt';
import { INSTALL_COPY } from './copy';
import s from './InstallGuide.module.css';

export interface InstallStep {
  title: string;
  text: string;
  art: () => JSX.Element;
}

const HOME: InstallStep = { title: 'Tap Add', text: 'catkin opens full-screen, works offline and gets its own icon.', art: HomeScreenArt };

/** Guides by platform; iOS Safari has two, for the iOS 26 compact bar and the classic toolbar. */
export type InstallGuideKey = Exclude<InstallPlatform, 'installed'> | 'ios-safari-classic';

export const GUIDES: Record<InstallGuideKey, { title: string; steps: InstallStep[] }> = {
  'ios-safari': {
    title: INSTALL_COPY.gateTitle,
    steps: [
      { title: 'Tap ⋯, then Share', text: 'It’s at the end of Safari’s address bar. With the Top or Bottom layout, tap Share, the square with an arrow, instead.', art: CompactShareArt },
      { title: 'Tap View More, then Add to Home Screen', text: 'Scroll the share options a little to find View More.', art: ViewMoreArt },
      { ...HOME, text: 'Leave Open as Web App on. catkin opens full-screen, works offline and gets its own icon.' },
    ],
  },
  'ios-safari-classic': {
    title: INSTALL_COPY.gateTitle,
    steps: [
      { title: 'Tap Share', text: 'The square with an arrow, in Safari’s toolbar.', art: () => <ShareStepArt /> },
      { title: 'Choose Add to Home Screen', text: 'Scroll the list a little if it isn’t there straight away.', art: AddToHomeArt },
      HOME,
    ],
  },
  'ios-other': {
    title: INSTALL_COPY.gateTitle,
    steps: [
      { title: 'Tap Share', text: 'It’s in the address bar, or in the ⋯ menu.', art: () => <ShareStepArt inAddressBar /> },
      { title: 'Choose Add to Home Screen', text: 'Scroll the list a little if it isn’t there straight away.', art: AddToHomeArt },
      HOME,
    ],
  },
  'mac-safari': {
    title: 'Keep catkin in your Dock',
    steps: [
      { title: 'File, then Add to Dock', text: 'In Safari’s menu bar, open File and choose Add to Dock.', art: MacDockArt },
      { title: 'Click Add', text: 'catkin gets its own window and a place in your Dock.', art: DockArt },
    ],
  },
  prompt: {
    title: 'Install catkin',
    steps: [{ title: 'One click', text: 'Press Install and your browser does the rest.', art: ChromeInstallArt }],
  },
  chromium: {
    title: 'Install catkin',
    steps: [
      { title: 'Find the install icon', text: 'It’s at the end of the address bar: a small screen with an arrow. Or open ⋮ and choose Install catkin.', art: ChromeInstallArt },
      { title: 'Click Install', text: 'catkin opens in its own window, even offline.', art: DockArt },
    ],
  },
  android: {
    title: 'Add to your Home screen',
    steps: [{ title: 'Open the ⋮ menu', text: 'Choose Install app or Add to Home screen.', art: AndroidMenuArt }, HOME],
  },
  other: {
    title: 'Install catkin',
    steps: [{ title: 'Try Safari, Chrome or Edge', text: 'Open this page in one of them to install it. It works right here too.', art: HomeScreenArt }],
  },
};

/** Which guide to show: Safari before 26 still has the classic toolbar with Share in it. */
export function guideFor(platform: Exclude<InstallPlatform, 'installed'>, ua: string): InstallGuideKey {
  if (platform !== 'ios-safari') return platform;
  const v = safariMajor(ua);
  return v !== null && v < 26 ? 'ios-safari-classic' : 'ios-safari';
}

/**
 * The install-first gate (DESIGN §11.1) comes before onboarding only in Safari tabs (iPhone,
 * iPad and Mac) with nothing saved yet: there, a tab's storage can be cleared after 7 days.
 */
export function shouldGateInstall(platform: InstallPlatform, hasSave: boolean): boolean {
  return !hasSave && (platform === 'ios-safari' || platform === 'mac-safari');
}

async function install() {
  if (await promptInstall()) toast({ message: INSTALL_COPY.installedToast, tone: 'sage' });
}

function Steps({ steps }: { steps: InstallStep[] }) {
  return (
    <ol class={s.steps}>
      {steps.map((step, i) => (
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
  );
}

export interface InstallSheetProps {
  open: boolean;
  onClose: () => void;
  /** Force a platform or guide (gallery, tests); defaults to the detected one. */
  platform?: InstallPlatform | InstallGuideKey;
}

export function InstallSheet({ open, onClose, platform }: InstallSheetProps) {
  const p = platform ?? currentInstallPlatform();
  if (p === 'installed') {
    return (
      <Sheet open={open} onClose={onClose} title={INSTALL_COPY.doneTitle} size="sm">
        <div class={s.done}>
          <AppIconArt size={96} shape="squircle" />
          <p>{INSTALL_COPY.doneText}</p>
        </div>
      </Sheet>
    );
  }
  const guide = GUIDES[p === 'ios-safari-classic' ? p : guideFor(p, navigator.userAgent)];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={guide.title}
      description={INSTALL_COPY.sheetDescription}
      size="md"
      peek={<AppIconArt size={68} shape="squircle" />}
      footer={
        p === 'prompt' ? (
          <Button size="lg" block onClick={() => void install().then(onClose)}>
            {INSTALL_COPY.install}
          </Button>
        ) : (
          <Button variant="secondary" size="lg" block onClick={onClose}>
            {INSTALL_COPY.gotIt}
          </Button>
        )
      }
    >
      <Steps steps={guide.steps} />
    </Sheet>
  );
}

/**
 * The install-first gate: a full page before onboarding, with the reason in one line, the steps
 * for this browser, and "Just peek" for anyone who only wants to look around (the demo).
 */
export function InstallGate({ onPeek, platform }: { onPeek: () => void; platform?: InstallPlatform | InstallGuideKey }) {
  const p = platform ?? currentInstallPlatform();
  const key: InstallGuideKey = p === 'installed' ? 'other' : p === 'ios-safari-classic' ? p : guideFor(p, navigator.userAgent);
  const guide = GUIDES[key];
  return (
    <section class={s.gate} aria-labelledby="install-gate-title">
      <AppIconArt size={96} shape="squircle" class={s.gateIcon} />
      <h1 id="install-gate-title" class={s.gateTitle}>
        {guide.title}
      </h1>
      <p class={s.gateText}>{key === 'mac-safari' ? INSTALL_COPY.gateTextMac : INSTALL_COPY.gateText}</p>
      <Steps steps={guide.steps} />
      <Button variant="quiet" size="lg" block class={s.peek} onClick={onPeek}>
        {INSTALL_COPY.gatePeek}
      </Button>
    </section>
  );
}

/** The You-screen card: one line of why, one button of how. */
export function InstallGuide({ class: cls }: { class?: string }) {
  const [open, setOpen] = useState(false);
  const p = currentInstallPlatform();
  const canPrompt = !!installPrompt.value;
  return (
    <Card class={[s.card, cls].filter(Boolean).join(' ')}>
      <AppIconArt size={56} shape="squircle" class={s.icon} />
      <div class={s.cardText}>
        <h3 class={s.cardTitle}>{p === 'mac-safari' ? INSTALL_COPY.cardTitleDock : INSTALL_COPY.cardTitleHome}</h3>
        <p class={s.cardBody}>{p === 'installed' ? INSTALL_COPY.cardInstalled : INSTALL_COPY.cardPitch}</p>
      </div>
      {p === 'installed' ? (
        <Pill tone="sage">{INSTALL_COPY.installed}</Pill>
      ) : canPrompt ? (
        <Button size="sm" onClick={() => void install()}>
          {INSTALL_COPY.install}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {INSTALL_COPY.showMe}
        </Button>
      )}
      <InstallSheet open={open} onClose={() => setOpen(false)} platform={p} />
    </Card>
  );
}

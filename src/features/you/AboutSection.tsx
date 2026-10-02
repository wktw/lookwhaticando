/**
 * You › About (DESIGN §9.5): the wordmark, the tagline and the explainer, what catkin keeps to,
 * "How it works", "Credits", the version and build, "Check for updates" and "Reload app". Seven
 * taps on the version open Diagnostics (#/you/diagnostics).
 */
import { useRef, useState } from 'preact/hooks';
import { INSTALL, SETTINGS, fillLine } from '@/catalog/lines';
import { Wordmark } from '@/art/icons/brand';
import { useArtLight } from '@/art/scene/moment';
import { navigate } from '@/app/router';
import { currentInstallPlatform } from '@/app/installPrompt';
import { checkForUpdates, reloadApp, updateReady, updatesSupported } from '@/app/pwa';
import { ListRow } from '@/ui/ListRow';
import { SectionHeader } from '@/ui/SectionHeader';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/toast';
import { announce } from '@/ui/announce';
import { ABOUT_COPY, YOU } from './copy';
import { LicencesSheet } from './LicencesSheet';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import lr from '@/ui/ListRow.module.css';
import s from './You.module.css';

/** "Reload app": a round arrow in a lavender tile (the icon set has undo, not reload). */
function ReloadTile() {
  return (
    <span class={cx(lr.tile, toneClass('lavender'), s.glyphTile)} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12.5a7 7 0 1 1-2.05-5.45" />
        <path d="M18.6 3.8v4h-4" />
      </svg>
    </span>
  );
}

/** Taps on the version that open Diagnostics, and how long a pause resets the count. */
export const DIAGNOSTICS_TAPS = 7;
const TAP_RESET_MS = 1500;

export function buildLabel(): string {
  if (__SINGLE_FILE__ || location.protocol === 'file:') return ABOUT_COPY.build.single;
  if (import.meta.env.DEV) return ABOUT_COPY.build.dev;
  return currentInstallPlatform() === 'installed' ? ABOUT_COPY.build.pwa : ABOUT_COPY.build.tab;
}

function Prose({ items }: { items: readonly { title: string; text: string }[] }) {
  return (
    <div class={s.prose}>
      {items.map((it) => (
        <section key={it.title}>
          <h3>{it.title}</h3>
          <p>{it.text}</p>
        </section>
      ))}
    </div>
  );
}

export function AboutSection() {
  const light = useArtLight();
  const [sheet, setSheet] = useState<'how' | 'credits' | null>(null);
  const [licences, setLicences] = useState(false);
  const [checking, setChecking] = useState(false);
  const taps = useRef({ n: 0, at: 0 });
  const version = fillLine(SETTINGS.about.version, { version: __APP_VERSION__ });
  const canUpdate = updatesSupported();

  const tapVersion = () => {
    const now = Date.now();
    const t = taps.current;
    t.n = now - t.at > TAP_RESET_MS ? 1 : t.n + 1;
    t.at = now;
    if (t.n >= DIAGNOSTICS_TAPS) {
      t.n = 0;
      navigate('you', ['diagnostics']);
      return;
    }
    const left = DIAGNOSTICS_TAPS - t.n;
    if (t.n >= 4) announce(fillLine(ABOUT_COPY.diagnosticsIn, { n: left }));
  };

  const check = async () => {
    setChecking(true);
    const res = await checkForUpdates();
    setChecking(false);
    // 'ready' shows its own note with "Reload".
    if (res === 'up-to-date') toast({ key: 'up-to-date', message: INSTALL.upToDate, tone: 'sage' });
    if (res === 'unavailable') toast({ key: 'up-to-date', message: ABOUT_COPY.updatesOther, tone: 'sage' });
  };

  return (
    <section class={s.group} aria-labelledby="you-about">
      <SectionHeader title={YOU.sections.about} id="you-about" />
      <div class={s.card}>
        <div class={s.about}>
          <Wordmark size={40} light={light} />
          <p class={s.tagline}>{SETTINGS.about.tagline}</p>
          <p class={s.explainer}>{SETTINGS.about.explainer}</p>
          <h3 class="sr-only">{ABOUT_COPY.principlesTitle}</h3>
          <ul class={s.principles}>
            {ABOUT_COPY.principles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <ListRow leading="info" leadingTone="sage" title={SETTINGS.about.how} onClick={() => setSheet('how')} />
        <ListRow leading="heart" leadingTone="blush" title={SETTINGS.about.credits} onClick={() => setSheet('credits')} />
        {canUpdate ? (
          <ListRow
            leading="download"
            leadingTone="sky"
            title={updateReady.value ? INSTALL.updateReady.split(' · ')[0]! : INSTALL.checkUpdates}
            subtitle={checking ? ABOUT_COPY.checking : undefined}
            chevron={false}
            disabled={checking}
            onClick={() => (updateReady.value ? reloadApp() : void check())}
          />
        ) : null}
        <ListRow leading={<ReloadTile />} leadingTone="lavender" title={INSTALL.reloadApp} chevron={false} onClick={reloadApp} />
        <button type="button" class={`${s.row} ${s.inline} ${s.versionRow}`} onClick={tapVersion}>
          <span class={s.rowText}>
            <span class={`${s.label} ${s.version}`}>{version}</span>
            <span class={s.helper}>{buildLabel()}</span>
          </span>
        </button>
      </div>
      {!canUpdate && <p class={s.footer}>{__SINGLE_FILE__ || location.protocol === 'file:' ? ABOUT_COPY.updatesSingle : ABOUT_COPY.updatesOther}</p>}

      <Sheet open={sheet === 'how'} onClose={() => setSheet(null)} title={SETTINGS.about.how} size="md">
        <Prose items={ABOUT_COPY.how} />
      </Sheet>
      <Sheet open={sheet === 'credits'} onClose={() => setSheet(null)} title={SETTINGS.about.credits} size="md">
        <Prose items={ABOUT_COPY.credits} />
        <ListRow leading="info" title={ABOUT_COPY.licences.title} onClick={() => setLicences(true)} />
      </Sheet>
      <LicencesSheet open={licences} onClose={() => setLicences(false)} />
    </section>
  );
}

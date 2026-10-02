/**
 * Diagnostics (DESIGN §11.1, #/you/diagnostics, seven taps on the version): what this device says
 * about Little by Little, for a bug report. Display mode, storage, the save envelope, the service worker,
 * audio, share, haptics, the viewport, frame timing and the clock, with "Copy report".
 */
import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ERRORS } from '@/catalog/lines';
import { SAVE_KEY } from '@/state/persist';
import { clockBehind, demoMode, loadIssue, readOnly, repairClock, saveStatus, state, today } from '@/state/store';
import { currentInstallPlatform } from '@/app/installPrompt';
import { navigate } from '@/app/router';
import { updateReady } from '@/app/pwa';
import { sampleFrames, median, isLite } from '@/fx/frameMonitor';
import { Button } from '@/ui/Button';
import { SectionHeader } from '@/ui/SectionHeader';
import { toast } from '@/ui/toast';
import { DIAG_COPY } from './copy';
import { buildLabel } from './AboutSection';
import { canShareFiles, copyText } from './files';
import { hapticsSupported } from './PreferencesSection';
import s from './You.module.css';

type Rows = [string, string][];

const yes = (b: boolean) => (b ? 'yes' : 'no');

function kb(chars: number): string {
  return `${Math.round(chars / 102.4) / 10} KB`;
}

/** Everything that can be read at once. */
export function readDiagnostics(): Rows {
  const app = state.value;
  const nav = navigator as Navigator & { standalone?: boolean; audioSession?: { type?: string }; deviceMemory?: number };
  let raw = '';
  try {
    raw = localStorage.getItem(SAVE_KEY) ?? '';
  } catch {
    raw = '';
  }
  let envelope = 'none';
  try {
    if (raw) {
      const e = JSON.parse(raw) as { v?: number; rev?: number; appVersion?: string; savedAt?: number };
      envelope = `v${e.v} · rev ${e.rev} · ${e.appVersion} · ${e.savedAt ? new Date(e.savedAt).toISOString() : '?'} · ${kb(raw.length)}`;
    }
  } catch {
    envelope = `unreadable · ${kb(raw.length)}`;
  }
  const mode = ['fullscreen', 'standalone', 'minimal-ui', 'browser'].find((m) => matchMedia(`(display-mode: ${m})`).matches) ?? 'browser';
  const vv = window.visualViewport;
  return [
    ['Version', `${__APP_VERSION__} · ${buildLabel()}`],
    ['Build', typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'],
    ['Display mode', `${mode}${nav.standalone ? ' · iOS standalone' : ''} · ${currentInstallPlatform()}`],
    ['User agent', navigator.userAgent],
    ['Save', envelope],
    ['Last write', `${saveStatus.value.status} · rev ${saveStatus.value.rev} · ${kb(saveStatus.value.chars)}`],
    ['Window', readOnly.value ? `read only (${readOnly.value})` : demoMode.value ? 'demo' : 'owns the save'],
    ['Load note', loadIssue.value ? loadIssue.value.kind : 'none'],
    ['Habits', `${app.habits.length} · ${Object.keys(app.pets).length} pets · ${app.lifetime.checkins} waterings`],
    ['Today', `${today.value} · day starts ${Math.floor(app.settings.dayStartsAt / 60)}:${String(app.settings.dayStartsAt % 60).padStart(2, '0')}`],
    ['Clock', clockBehind.value ? ERRORS.clock : `ok · latest ${new Date(app.clock.maxEpochMs || Date.now()).toISOString()}`],
    ['Service worker', 'serviceWorker' in navigator ? `${navigator.serviceWorker.controller ? 'controlling' : 'not controlling'}${updateReady.value ? ' · update waiting' : ''}` : 'not supported'],
    ['Audio', `${'AudioContext' in window || 'webkitAudioContext' in window ? 'Web Audio' : 'none'}${nav.audioSession ? ` · session ${nav.audioSession.type ?? '?'}` : ''} · sounds ${app.settings.sound ? 'on' : 'off'}`],
    ['Share', `${'share' in navigator ? 'share sheet' : 'no share sheet'} · files ${yes(canShareFiles())}`],
    ['Haptics', `${hapticsSupported() ? 'supported' : 'not here'} · ${typeof navigator.vibrate === 'function' ? 'vibrate' : 'no vibrate'} · ${app.settings.haptics ? 'on' : 'off'}`],
    ['Viewport', `${innerWidth}×${innerHeight} @${devicePixelRatio}x${vv ? ` · visual ${Math.round(vv.width)}×${Math.round(vv.height)}` : ''}`],
    ['Motion', `${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full'} · setting ${app.settings.reduceMotion} · lite ${yes(isLite())}`],
    ['Theme', `${document.documentElement.dataset.theme ?? '?'} · setting ${app.settings.theme}`],
  ];
}

async function storageRows(): Promise<Rows> {
  const st = navigator.storage;
  if (!st?.estimate) return [['Storage', 'no estimate']];
  try {
    const [est, persisted] = await Promise.all([st.estimate(), st.persisted?.() ?? Promise.resolve(false)]);
    const mb = (n = 0) => `${Math.round(n / 104857.6) / 10} MB`;
    return [['Storage', `${mb(est.usage)} of ${mb(est.quota)} · persisted ${yes(persisted)}`]];
  } catch {
    return [['Storage', 'no estimate']];
  }
}

export function reportText(rows: Rows): string {
  return ['Little by Little diagnostics', new Date().toISOString(), ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
}

export function Diagnostics() {
  const [extra, setExtra] = useState<Rows>([]);
  const [frames, setFrames] = useState<string | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void storageRows().then((r) => live && setExtra(r));
    return () => {
      live = false;
    };
  }, []);
  const rows: Rows = [...readDiagnostics(), ...extra, ...(frames ? [['Frames', frames] as [string, string]] : []), ...(clock ? [['Clock check', clock] as [string, string]] : [])];

  const measure = async () => {
    setFrames('…');
    const times = await sampleFrames(2000);
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    setFrames(`median ${median(times).toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · ${times.length} frames`);
  };

  const checkClock = () => {
    const r = repairClock();
    setClock(r.behind ? `paused until ${r.resumesAt ? new Date(r.resumesAt).toISOString() : '?'}` : 'ok');
  };

  const copy = async () => {
    const ok = await copyText(reportText(rows));
    toast({ key: 'diag', message: ok ? DIAG_COPY.copied : ERRORS.copy, tone: 'sage' });
  };

  return (
    <section class={s.screen} aria-labelledby="diag-title">
      <Button variant="quiet" size="sm" icon="chevron-left" class={s.back} onClick={() => navigate('you')}>
        {DIAG_COPY.back}
      </Button>
      <header class={s.header}>
        <h1 id="diag-title" class={s.title}>
          {DIAG_COPY.title}
        </h1>
      </header>
      <p class={s.since}>{DIAG_COPY.lead}</p>
      <div class={s.actions} style={{ marginTop: 'var(--s-4)' }}>
        <Button icon="export" onClick={() => void copy()}>
          {ERRORS.diagnostics}
        </Button>
        <Button variant="secondary" onClick={() => void measure()}>
          {DIAG_COPY.measure}
        </Button>
        <Button variant="secondary" onClick={checkClock}>
          {DIAG_COPY.checkClock}
        </Button>
      </div>
      <div class={s.group}>
        <SectionHeader title={DIAG_COPY.device} as="h2" />
        <div class={s.card}>
          <dl class={s.diag}>
            {rows.map(([k, v]) => (
              <Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

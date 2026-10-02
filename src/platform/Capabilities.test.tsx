// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { getPlatform, setPlatform } from './capabilities';
import { InstallGate, InstallGuide, shouldGateInstall } from '@/app/InstallGuide';
import { currentInstallPlatform } from '@/app/installPrompt';
import { AboutSection } from '@/features/you/AboutSection';
import { RemindersSection } from '@/features/you/RemindersSection';
import { saveFile, readImportFile, copyLater } from '@/features/you/files';
import { checkForUpdates, pageReload, reloadApp, updateReady } from '@/app/pwa';
import { haptic } from '@/fx/haptics';
import { state } from '@/state/store';
import { INSTALL, REMINDERS } from '@/catalog/lines';

let restore: (() => void) | undefined;
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { cleanup(); restore?.(); restore = undefined; updateReady.value = false; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('injected platform capabilities', () => {
  it('an installed bundle has no Safari gate, install card, update banner or Reload app row', async () => {
    restore = setPlatform({ install: 'native', updates: 'bundle' });
    updateReady.value = true;
    expect(currentInstallPlatform()).toBe('installed');
    expect(shouldGateInstall('ios-safari', false)).toBe(false);
    const gate = render(<><InstallGate onPeek={() => {}} platform="ios-safari" /><InstallGuide /></>);
    expect(gate.container.textContent).toBe('');
    render(<AboutSection />);
    expect(screen.queryByText(INSTALL.reloadApp)).toBeNull();
    expect(screen.queryByText(INSTALL.checkUpdates)).toBeNull();
    expect(screen.queryByText(INSTALL.updateReady.split(' · ')[0]!)).toBeNull();
    const reload = vi.spyOn(pageReload, 'run');
    reloadApp();
    expect(reload).not.toHaveBeenCalled();
    await expect(checkForUpdates()).resolves.toBe('unavailable');
  });

  it('file delivery outcomes, cancellation, byte limits and gesture-time clipboard calls cross the same seam', async () => {
    const original = getPlatform();
    const delivery = vi.fn(async () => 'cancelled' as const);
    const read = vi.fn(original.files.readImportFile);
    const copy = vi.fn(async () => true);
    restore = setPlatform({ files: { ...original.files, maxImportBytes: 3, saveFile: delivery, readImportFile: read, copyLater: copy } });
    await expect(saveFile('backup.json', '{}')).resolves.toBe('cancelled');
    expect(delivery).toHaveBeenCalledWith('backup.json', '{}', undefined);
    const ctl = new AbortController(); ctl.abort();
    await expect(readImportFile(new File(['ok'], 'small'), { signal: ctl.signal })).resolves.toEqual({ ok: false, error: 'aborted' });
    await expect(readImportFile(new File(['long'], 'large'))).resolves.toEqual({ ok: false, error: 'too-large' });
    const pending = Promise.resolve('backup');
    const result = copyLater(pending);
    expect(copy).toHaveBeenCalledWith(pending); // Safari needs this before the first await.
    await expect(result).resolves.toBe(true);
  });

  it('keeps generated calendar export and honours the injected delivery path', () => {
    const original = getPlatform();
    const download = vi.fn();
    restore = setPlatform({ files: { ...original.files, calendarDelivery: 'generated', downloadText: download } });
    state.value = { ...state.value, settings: { ...state.value.settings, reminders: { morning: '07:30' } } };
    render(<RemindersSection />);
    fireEvent.click(screen.getByRole('button', { name: `${REMINDERS.add}, ${REMINDERS.rows.morning} 7:30 am` }));
    expect(download).toHaveBeenCalledWith(expect.stringMatching(/\.ics$/), expect.stringContaining('BEGIN:VCALENDAR'), 'text/calendar');
    expect(download.mock.calls[0]?.[1]).toContain('T073000');
  });

  it('keeps a real static calendar link and lets a platform handle external delivery synchronously', () => {
    const original = getPlatform();
    const open = vi.fn(() => true);
    restore = setPlatform({ files: { ...original.files, calendarDelivery: 'static' }, externalLinks: { open } });
    state.value = { ...state.value, settings: { ...state.value.settings, reminders: { morning: '07:30' } } };
    render(<RemindersSection />);
    const link = screen.getByRole('link', { name: `${REMINDERS.add}, ${REMINDERS.rows.morning} 7:30 am` });
    expect(link.getAttribute('href')).toBe('cal/morning-0730.ics');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(fireEvent.click(link)).toBe(false);
    expect(open).toHaveBeenCalledWith('cal/morning-0730.ics', { fromLink: true });
  });

  it('keeps the user setting above injected haptic feedback', () => {
    const feedback = vi.fn();
    restore = setPlatform({ haptics: { feedback } });
    state.value = { ...state.value, settings: { ...state.value.settings, haptics: false } };
    haptic('success');
    expect(feedback).not.toHaveBeenCalled();
    state.value = { ...state.value, settings: { ...state.value.settings, haptics: true } };
    haptic('success');
    expect(feedback).toHaveBeenCalledWith('success');
  });
});

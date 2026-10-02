import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHELL_COPY } from '@/app/copy';
import { DATA_COPY, ERRORS } from '@/catalog/lines';
import { SHELL_LINES } from '@/features/you/shellCopy';
import { MANIFEST } from '../../vite.config';
import { loadSave, memoryStorage, SAVE_KEY } from '@/state/persist';
import { parseBackupText } from '@/state/handoff';
import { lint } from './voiceLint';

describe('Little by Little: the name changes, the saved household stays', () => {
  it('uses the new name in the app, browser and install metadata without changing the installed app identity', () => {
    expect(SHELL_COPY.appName).toBe('Little by Little');
    expect(SHELL_COPY.brandLabel).toBe('Little by Little, go to Today');
    expect(MANIFEST.name).toBe('Little by Little');
    expect(MANIFEST.short_name).toBe('Little by Little');
    expect([MANIFEST.id, MANIFEST.start_url, MANIFEST.scope]).toEqual(['./', './', './']);
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<title>Little by Little</title>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Little by Little"');
  });

  it('keeps the renamed erasure guidance truthful across windows', () => {
    expect(DATA_COPY.eraseBlocked).toBe('The daily copies couldn’t be erased. Close other Little by Little windows, then try again.');
    // Erase everything and Start over share this follower note; daily copies may be gone.
    expect(ERRORS.startedOver).toBe('Little by Little was started over in another window, so it starts fresh here too.');
    expect(SHELL_LINES.startedOver).toBe(ERRORS.startedOver);
    expect(SHELL_LINES.erasePaused).toBe(ERRORS.erasePaused);
    expect(SHELL_LINES.erasePaused).toBe('Some data is still on this device. Changes are paused here. Open You to try again.');
  });

  it('opens a household saved by the original app at its original storage key', () => {
    const raw = readFileSync('tests/fixtures/saves/f6ed7ea/main-demo.json', 'utf8');
    const original = JSON.parse(raw).state;
    const storage = memoryStorage({ 'catkin:v1': raw });
    const loaded = loadSave(storage, SAVE_KEY);
    expect(loaded.kind).toBe('ok');
    if (loaded.kind !== 'ok') throw new Error('Original household was not read');
    expect(loaded.state.wallet).toEqual(original.wallet);
    expect(loaded.state.habits.map((habit) => habit.id)).toEqual(original.habits.map((habit: { id: string }) => habit.id));
    expect(loaded.state.pets).toEqual(original.pets);
    expect(storage.getItem('catkin:v1')).toBe(raw);
  });

  it('still reads actual old backups and handoff codes after the display name changes', async () => {
    for (const [file, household] of [['backup-demo.json', 'main-demo.json'], ['payload-fresh.txt', 'main-fresh.json']]) {
      const raw = readFileSync(`tests/fixtures/saves/f6ed7ea/${file}`, 'utf8');
      const original = JSON.parse(readFileSync(`tests/fixtures/saves/f6ed7ea/${household}`, 'utf8')).state;
      const imported = await parseBackupText(raw);
      expect(imported.ok, file).toBe(true);
      if (!imported.ok) throw new Error(`Original ${file} was refused`);
      expect(imported.state.profile.name).toBe(original.profile.name);
      expect(imported.state.wallet).toEqual(original.wallet);
    }
  });

  it('allows the chosen proper name while still rejecting motivational platitudes around it', () => {
    expect(lint('Little by Little is open in another window.')).toEqual([]);
    expect(lint('Open Little by Little.')).toEqual([]);
    expect(lint('You can grow, little by little.')).toContain('platitude: "little by little"');
    expect(lint('Little by Little. Great job.')).toContain('pep talk: "Great job"');
  });
});

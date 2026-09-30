// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import { createInitialState } from '@/state/defaults';
import { archiveHabit, completeOnboarding, configureStore, exportData, readOnly, setName, state } from '@/state/store';
import { memorySnapshotStore } from '@/state/snapshots';
import { routeRest } from '@/app/router';
import { toasts } from '@/ui/toast';
import { button, click, installDom, key, mount, type, until } from '@/features/capsules/testing';
import { YouScreen } from './YouScreen';

let view: ReturnType<typeof mount> | null = null;

const ids = () => [...state.value.habits].filter((h) => h.archivedOn === undefined).sort((a, b) => a.order - b.order).map((h) => h.name);
const dialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]'));
const byText = (text: string, root: ParentNode = document) => Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) ?? null;

beforeAll(() => {
  installDom();
  // jsdom has no IndexedDB: stand a lasting copy store in for it, as a browser has (an import's Undo needs one).
  configureStore({ snapshots: memorySnapshotStore({ durable: true }) });
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});
beforeEach(() => {
  localStorage.clear();
  state.value = createInitialState(Date.now());
  completeOnboarding({ name: 'Sam', templateIds: ['water', 'walk', 'read'] });
  routeRest.value = [];
  toasts.value = [];
  view = mount(<YouScreen />);
});
afterEach(() => {
  readOnly.value = false;
  view?.unmount();
  view = null;
  for (const d of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) d.remove();
});

describe('You (DESIGN §9.5)', () => {
  it('has exactly one h1 and every section, each under its own h2', () => {
    const h1s = view!.root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toBe('You');
    const h2s = Array.from(view!.root.querySelectorAll('h2')).map((h) => h.textContent);
    expect(h2s).toEqual(['Profile', 'Habits', 'Your days', 'Look and sound', 'Today and capsules', 'Accessibility', 'Watering time', 'Your data', 'On your Home Screen', 'About']);
  });

  it('shows her name and a plain count, never a 0', () => {
    expect(view!.root.textContent).toContain('Sam');
    expect(view!.root.textContent).toContain('3 habits');
    expect(view!.root.textContent).not.toMatch(/\b0 /);
  });

  it('saves a switch at once (Quiet rewards) and hides Quick open behind it', async () => {
    const quiet = Array.from(view!.root.querySelectorAll<HTMLInputElement>('input[role="switch"]')).find((i) => i.closest('label')?.textContent?.includes('Quiet rewards'))!;
    expect(view!.root.textContent).toContain('Quick open');
    await act(() => quiet.click());
    expect(state.value.settings.quietRewards).toBe(true);
    expect(view!.root.textContent).not.toContain('Quick open');
  });

  it('arranges habits with the keyboard, the buttons, and says where each went', async () => {
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
    await click(byText('Arrange'), 'Arrange');
    const grip = button('Move Drink water')!;
    await key(grip, 'ArrowDown');
    expect(ids()).toEqual(['Walk', 'Drink water', 'Read']);
    await key(button('Move Drink water')!, 'End');
    expect(ids()).toEqual(['Walk', 'Read', 'Drink water']);
    await click(button('Move Read up'), 'Move Read up');
    expect(ids()).toEqual(['Read', 'Walk', 'Drink water']);
    await until(() => document.body.textContent?.includes('Read, 1 of 3.'), 'the move read out');
    expect((button('Move Read up') as HTMLButtonElement).disabled).toBe(true);
    await click(byText('Done'), 'Done');
    expect(button('Move Read')).toBeNull();
  });

  it('brings an archived habit back to the sill, and says so', async () => {
    const read = state.value.habits.find((h) => h.name === 'Read')!;
    await act(() => archiveHabit(read.id));
    await click(button('Bring it back: Read'), 'Bring it back: Read');
    expect(state.value.habits.find((h) => h.id === read.id)!.archivedOn).toBeUndefined();
    expect(toasts.value.some((t) => String(t.message).startsWith('Read is back on the sill.'))).toBe(true);
    expect(view!.root.textContent).toContain('Nothing archived.');
  });

  it('turns a watering time on, and offers "Add to calendar" for it', async () => {
    const morning = view!.root.querySelector<HTMLSelectElement>('#you-water-morning')!;
    expect(view!.root.textContent).toContain('No watering times set.');
    await act(() => {
      morning.value = '07:30';
      morning.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(state.value.settings.reminders.morning).toBe('07:30');
    expect(button('Add to calendar, Morning 7:30 am')).not.toBeNull();
  });

  it('starts over only after two confirmations', async () => {
    await click(byText('Start over'), 'Start over');
    let dlg = await until(() => dialogs().find((d) => d.textContent?.includes('Every habit, plant and pet')), 'the first confirmation');
    await click(byText('Start over', dlg), 'confirm once');
    expect(state.value.habits).toHaveLength(3);
    dlg = await until(() => dialogs().find((d) => d.textContent?.includes('The daily copies stay')), 'the second confirmation');
    await click(byText('Start over', dlg), 'confirm twice');
    expect(state.value.habits).toHaveLength(0);
    expect(state.value.profile.onboarded).toBe(false);
  });

  it('disables every setting while another window owns the save, and keeps the backup', async () => {
    await act(() => {
      readOnly.value = 'other-window';
    });
    const switches = Array.from(view!.root.querySelectorAll<HTMLInputElement>('input[role="switch"]'));
    expect(switches.length).toBeGreaterThan(3);
    for (const sw of switches) expect(sw.matches(':disabled')).toBe(true);
    expect((view!.root.querySelector('#you-water-morning') as HTMLSelectElement).matches(':disabled')).toBe(true);
    expect(byText('Arrange')).toBeNull();
    expect(byText('Add a habit')).toBeNull();
    expect(view!.root.textContent).toContain('This window can’t change the save right now.');
    const save = Array.from(view!.root.querySelectorAll('button')).find((b) => b.textContent?.includes('Save a backup'))!;
    expect(save.matches(':disabled')).toBe(false);
  });

  it('keeps everything when either confirmation is declined', async () => {
    await click(byText('Start over'), 'Start over');
    const dlg = await until(() => dialogs().find((d) => d.textContent?.includes('Every habit, plant and pet')), 'the first confirmation');
    await click(byText('Keep everything', dlg), 'Keep everything');
    expect(state.value.habits).toHaveLength(3);
  });

  it('imports a pasted backup after describing it, with Undo import on the note', async () => {
    const json = exportData();
    await act(() => setName('Changed'));
    await click(button('Import a backup'), 'Import a backup');
    const sheet = await until(() => dialogs().find((d) => d.querySelector('textarea')), 'the import sheet');
    await type(sheet.querySelector('textarea') as unknown as HTMLInputElement, json);
    await until(() => sheet.textContent?.includes('This backup has 3 habits'), 'the preview');
    await click(byText('Import', sheet), 'Import');
    await until(() => state.value.profile.name === 'Sam', 'the import');
    const note = toasts.value.find((t) => t.message === 'Imported. You can undo this for 24 hours.');
    expect(note?.actions?.[0]?.label ?? note?.action?.label).toBe('Undo import');
  });

  it('says plainly when pasted text isn’t a backup', async () => {
    await click(button('Import a backup'), 'Import a backup');
    const sheet = await until(() => dialogs().find((d) => d.querySelector('textarea')), 'the import sheet');
    await type(sheet.querySelector('textarea') as unknown as HTMLInputElement, 'hello');
    await until(() => sheet.textContent?.includes('That file isn’t a catkin backup.'), 'the error');
    expect(byText('Import', sheet)).toBeNull();
  });

  it('opens Diagnostics at #/you/diagnostics, with its own h1 and Copy report', async () => {
    await act(() => {
      routeRest.value = ['diagnostics'];
    });
    const h1s = view!.root.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]!.textContent).toBe('Diagnostics');
    expect(byText('Copy report')).not.toBeNull();
    expect(view!.root.textContent).toContain('Display mode');
  });
});

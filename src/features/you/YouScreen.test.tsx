// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { archiveHabit, completeOnboarding, configureStore, exportData, flushSaves, hydrate, readOnly, setName, state } from '@/state/store';
import { memorySnapshotStore } from '@/state/snapshots';
import { routeRest } from '@/app/router';
import { toasts } from '@/ui/toast';
import { button, click, installDom, key, mount, pointer, type, until } from '@/features/capsules/testing';
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
  // Retire the prior test's queue as well as its bytes before planting this save.
  hydrate();
  completeOnboarding({ name: 'Sam', templateIds: ['water', 'walk', 'read'] });
  routeRest.value = [];
  toasts.value = [];
  view = mount(<YouScreen />);
});
afterEach(() => {
  vi.unstubAllGlobals();
  readOnly.value = false;
  view?.unmount();
  view = null;
  for (const d of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) d.remove();
});

describe('You (DESIGN §9.5)', () => {
  it('opens full licences from Credits and returns to the same sheet', async () => {
    const fetch_ = vi.fn().mockResolvedValue({ ok: true, text: async () => 'SIL OPEN FONT LICENSE Version 1.1\nCopyright The Project Authors' });
    vi.stubGlobal('fetch', fetch_);
    await click(byText('Credits'), 'Credits');
    const credits = dialogs().find((d) => d.textContent?.includes('Castoro'))!;
    byText('Licences', credits)?.focus();
    await click(byText('Licences', credits), 'Licences');
    const notices = await until(() => dialogs().find((d) => d.textContent?.includes('SIL OPEN FONT LICENSE')), 'the full notices');
    expect(notices.querySelector('[role="document"]')?.getAttribute('tabindex')).toBe('0');
    expect(fetch_).toHaveBeenCalledTimes(1);
    await key(notices, 'Escape');
    expect(credits.isConnected).toBe(true);
    expect(byText('Licences', credits)).toBe(document.activeElement);
  });

  it('keeps a failed licence load retryable inside its sheet', async () => {
    const fetch_ = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true, text: async () => 'SIL OPEN FONT LICENSE Version 1.1' });
    vi.stubGlobal('fetch', fetch_);
    await click(byText('Credits'), 'Credits');
    await click(byText('Licences'), 'Licences');
    await until(() => byText('Try again'), 'a retry after the failed request');
    await click(byText('Try again'), 'Try again');
    await until(() => document.body.textContent?.includes('SIL OPEN FONT LICENSE'), 'the retried notices');
    expect(fetch_).toHaveBeenCalledTimes(2);
  });

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
    // A delayed save must keep this order and the controls that announce it.
    await act(() => flushSaves());
    expect(ids()).toEqual(['Read', 'Walk', 'Drink water']);
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
    let dlg = await until(() => dialogs().find((d) => d.textContent?.includes('The habits, plants and pets here go.')), 'the first confirmation');
    await click(byText('Start over', dlg), 'confirm once');
    expect(state.value.habits).toHaveLength(3);
    dlg = await until(() => dialogs().find((d) => d.textContent?.includes('Start over now?')), 'the second confirmation');
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
    const dlg = await until(() => dialogs().find((d) => d.textContent?.includes('The habits, plants and pets here go.')), 'the first confirmation');
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

describe('Arrange: a cancelled drag never moves a habit (WP-C2: UI2-05)', () => {
  /** The order on screen, by each row's grip. */
  const shownOrder = () => Array.from(document.querySelectorAll('[data-move="grip"]')).map((b) => b.getAttribute('aria-label')!.replace(/^Move /, ''));

  /** Start dragging Drink water by its grip and pull it below the others (jsdom lays every row at 0). */
  async function dragWaterDown() {
    await click(byText('Arrange'), 'Arrange');
    const grip = button('Move Drink water')!;
    await act(() => {
      grip.dispatchEvent(pointer('pointerdown', { clientY: 0, pointerType: 'touch' }));
      grip.dispatchEvent(pointer('pointermove', { clientY: 50, pointerType: 'touch' }));
    });
    expect(shownOrder()).toEqual(['Walk', 'Read', 'Drink water']);
    return button('Move Drink water')!;
  }

  it('pointercancel mid-drag: the saved order is unchanged, and the list goes back to it', async () => {
    const grip = await dragWaterDown();
    await act(() => void grip.dispatchEvent(pointer('pointercancel', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
    expect(shownOrder()).toEqual(['Drink water', 'Walk', 'Read']);
    expect(grip.closest('li')!.style.transform).toBe('');
  });

  it('a lost pointer capture is not a cancel: moving the row down re-inserts it, and the drag goes on', async () => {
    // Chromium drops the grip's capture when the list re-inserts the dragged row (a move down) and
    // fires lostpointercapture mid-drag; the rest of the drag reaches the window (WP-C2 review).
    const grip = await dragWaterDown();
    await act(() => void grip.dispatchEvent(pointer('lostpointercapture', { clientY: 50, pointerType: 'touch' })));
    expect(shownOrder()).toEqual(['Walk', 'Read', 'Drink water']);
    await act(() => void document.body.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Walk', 'Read', 'Drink water']);
  });

  it('a pointercancel reaching only the window (the capture already lost) still cancels', async () => {
    await dragWaterDown();
    await act(() => void window.dispatchEvent(pointer('pointercancel', { clientY: 50, pointerType: 'touch' })));
    expect(shownOrder()).toEqual(['Drink water', 'Walk', 'Read']);
    await act(() => void document.body.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
  });

  it('the page hidden mid-drag (an app switch) cancels it, and a later pointerup moves nothing', async () => {
    const grip = await dragWaterDown();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      await act(() => void document.dispatchEvent(new Event('visibilitychange')));
    } finally {
      delete (document as { visibilityState?: unknown }).visibilityState;
    }
    expect(shownOrder()).toEqual(['Drink water', 'Walk', 'Read']);
    expect(grip.closest('li')!.style.transform).toBe('');
    await act(() => void grip.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
  });

  it('control: a visibilitychange to visible mid-drag is not a cancel', async () => {
    const grip = await dragWaterDown();
    await act(() => void document.dispatchEvent(new Event('visibilitychange')));
    await act(() => void grip.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Walk', 'Read', 'Drink water']);
  });

  it('the window losing focus mid-drag cancels it, and a later pointerup moves nothing', async () => {
    const grip = await dragWaterDown();
    await act(() => void window.dispatchEvent(new Event('blur')));
    expect(shownOrder()).toEqual(['Drink water', 'Walk', 'Read']);
    await act(() => void grip.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
  });

  it('leaving Arrange mid-drag (Done) takes the drag with it: a later pointerup on the window saves nothing', async () => {
    await dragWaterDown();
    await click(byText('Done'), 'Done');
    await act(() => void window.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Drink water', 'Walk', 'Read']);
  });

  it('control: pointerup still saves the move and reads it out', async () => {
    const grip = await dragWaterDown();
    await act(() => void grip.dispatchEvent(pointer('pointerup', { clientY: 50, pointerType: 'touch' })));
    expect(ids()).toEqual(['Walk', 'Read', 'Drink water']);
    await until(() => document.body.textContent?.includes('Drink water, 3 of 3.'), 'the move read out');
  });
});

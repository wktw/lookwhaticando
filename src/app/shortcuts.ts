/**
 * Desktop keyboard shortcuts (DESIGN §11.1): 1–5 switch tabs, N starts a new habit.
 * Esc belongs to sheets; Space on the handle belongs to the capsules screen.
 *
 * WCAG 2.1.4 (character key shortcuts, Level A): single-key shortcuts must be possible to turn
 * off. They follow `settings.keyboardShortcuts` (the You › Accessibility switch); until it is set
 * they are on only where there is a real keyboard and pointer, never on a phone. They never fire
 * with a modifier held, while typing, or under an open sheet.
 */
import { state } from '@/state/store';
import { anyLayerOpen } from '@/ui/sheetStack';
import { navigate } from './router';
import { tabForDigit } from './routes';

/** Ask whoever owns the habit editor to open it for a new habit. */
export const NEW_HABIT_EVENT = 'ck:new-habit';
/** The older name of the same event, still dispatched for listeners that use it. */
export const NEW_HABIT_EVENT_ALIAS = 'mm:new-habit';

declare global {
  interface WindowEventMap {
    'ck:new-habit': CustomEvent<void>;
    /** @deprecated listen for 'ck:new-habit'. */
    'mm:new-habit': CustomEvent<void>;
  }
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'range'].includes((el as HTMLInputElement).type));
}

/** A mouse or trackpad and hover: a computer, where single-key shortcuts are expected. */
export function pointerIsFine(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Whether the single-key shortcuts are on: the setting when she has made a choice, else the
 * device default (on with a fine pointer, off on touch).
 */
export function shortcutsEnabled(settings: object = state.value.settings, fine: boolean = pointerIsFine()): boolean {
  const choice = (settings as { keyboardShortcuts?: unknown }).keyboardShortcuts;
  return typeof choice === 'boolean' ? choice : fine;
}

export function installShortcuts({ enabled = () => shortcutsEnabled() }: { enabled?: () => boolean } = {}): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || anyLayerOpen()) return;
    const tab = tabForDigit(e.key);
    const isNew = e.key === 'n' || e.key === 'N';
    if ((!tab && !isNew) || !enabled()) return;
    e.preventDefault();
    if (tab) navigate(tab);
    else {
      window.dispatchEvent(new CustomEvent(NEW_HABIT_EVENT));
      window.dispatchEvent(new CustomEvent(NEW_HABIT_EVENT_ALIAS));
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

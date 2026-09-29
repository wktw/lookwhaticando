/**
 * Desktop keyboard shortcuts (DESIGN §11.1): 1–5 switch tabs, N starts a new habit.
 * Esc belongs to sheets; Space on the crank belongs to the capsules screen.
 */
import { anyLayerOpen } from '@/ui/sheetStack';
import { navigate } from './router';
import { tabForDigit } from './routes';

declare global {
  interface WindowEventMap {
    /** Ask whoever owns the habit editor to open it for a new habit. */
    'mm:new-habit': CustomEvent<void>;
  }
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'range'].includes((el as HTMLInputElement).type));
}

export function installShortcuts(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || anyLayerOpen()) return;
    const tab = tabForDigit(e.key);
    if (tab) {
      e.preventDefault();
      navigate(tab);
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('mm:new-habit'));
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

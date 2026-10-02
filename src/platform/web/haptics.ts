/**
 * Haptic feedback, gated by settings.haptics.
 * - Android & friends: navigator.vibrate with tiny patterns.
 * - iOS 18+ Safari (no vibrate API): clicking the label of a hidden `<input type=checkbox switch>`
 *   makes the system play its real switch haptic, but ONLY inside the user's gesture. So call
 *   haptic() synchronously from the tap (CelebrationHost does, as events arrive); from a timer
 *   it is skipped on iPhone, and 'success' is a single tick there.
 */

export type HapticKind = 'tick' | 'light' | 'medium' | 'success';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 6,
  light: 10,
  medium: 18,
  success: [10, 70, 16],
};

let switchLabel: HTMLLabelElement | null = null;

function iosSwitchLabel(): HTMLLabelElement | null {
  if (switchLabel?.isConnected) return switchLabel;
  if (typeof document === 'undefined') return null;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

function isAppleTouch(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function tapSwitch() {
  const label = iosSwitchLabel();
  if (!label) return;
  const previous = document.activeElement as HTMLElement | null;
  label.click();
  // The click can move focus to the hidden input; hand it straight back.
  if (document.activeElement !== previous) previous?.focus({ preventScroll: true });
}

export function haptic(kind: HapticKind = 'light'): void {
  try {
    if (typeof navigator === 'undefined') return;
    // Browsers ignore (and complain about) haptics before the first tap.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    // Outside a gesture the switch trick does nothing but toggle a hidden input.
    if (!isAppleTouch() || navigator.userActivation?.isActive === false) return;
    tapSwitch();
  } catch {
    /* Haptics are a garnish; never break the interaction. */
  }
}

/** Whether the browser offers useful feedback on this device. */
export function hapticsSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return isAppleTouch() || (coarse && typeof navigator.vibrate === 'function');
}

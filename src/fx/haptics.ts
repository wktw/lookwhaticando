/** Haptic feedback. STUB: implemented by the fxui module (vibrate + iOS 18 switch trick). */
export type HapticKind = 'tick' | 'light' | 'medium' | 'success';

export function haptic(_kind: HapticKind = 'light'): void {}

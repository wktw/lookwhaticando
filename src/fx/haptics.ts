/** Feedback stays synchronous with the gesture and respects the user's setting. */
import { state } from '@/state/store';
import { getPlatform } from '@/platform/capabilities';
import type { HapticKind } from '@/platform/web/haptics';
export type { HapticKind } from '@/platform/web/haptics';

export function haptic(kind: HapticKind = 'light'): void {
  if (!state.value.settings.haptics) return;
  try { getPlatform().haptics.feedback(kind); } catch { /* Feedback must never break the interaction. */ }
}

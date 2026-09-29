/**
 * The check-in flourish (DESIGN §9.1), for screens that check habits off:
 * sparkle puff at the button → "+5" floats up → coins fly to the wallet → chime + haptic tick.
 * Claims the check-in's coins so <CelebrationHost/> doesn't celebrate them twice.
 */
import type { CheckInResult } from '@/state/api';
import { burst } from './confetti';
import { flyCoins } from './coinFly';
import { floatText } from './floatingText';
import { haptic } from './haptics';
import { sfx } from './sound';
import { markCelebratedLocally } from './celebrations';

export function celebrateCheckIn(result: CheckInResult, habitId: string, at: Element | DOMRect): void {
  markCelebratedLocally(habitId);
  const rect = at instanceof Element ? at.getBoundingClientRect() : at;
  const coins = result.events.reduce((sum, e) => (e.type === 'coins' && e.reason === 'checkin' && e.habitId === habitId ? sum + e.amount : sum), 0);
  if (result.completed) {
    burst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, intensity: 'tiny', shapes: ['sparkle', 'circle', 'star'] });
    sfx.play('chime');
  } else {
    sfx.play('pop');
  }
  haptic('tick');
  if (coins > 0) {
    floatText(`+${coins}`, rect, { tone: 'coin' });
    void flyCoins({ from: rect, amount: coins, kind: 'coins' });
  }
}

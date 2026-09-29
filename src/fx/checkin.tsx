/**
 * The check-in flourish (DESIGN §9.1), for screens that check habits off. The CheckRing fills
 * and draws its own check; this plays the rest of the choreography in step with it: a "+5" chip,
 * the rising water-drop chime as the water tops out, one brass coin into the jar, a haptic tick.
 * Call it in the same tick as checkIn(): it claims the check-in's coins from <CelebrationHost/>
 * (so they're celebrated once) and reserves them, so the wallet counter waits for the coin.
 */
import type { CheckInResult } from '@/state/api';
import { CoinIcon } from '@/art/icons';
import { CHECKIN_CHOREOGRAPHY } from '@/ui/checkRing';
import { WaterDrop } from '@/ui/art/objects';
import { toast } from '@/ui/toast';
import { flyCoins } from './coinFly';
import { floatText } from './floatingText';
import { haptic } from './haptics';
import { sfx } from './sound';
import { reserve } from './walletLedger';
import { markCelebratedLocally } from './celebrations';
import { prefersReducedMotion } from './motion';
import { checkInLine, FX_UI } from './copy';

export function celebrateCheckIn(result: CheckInResult, habitId: string, at: Element | DOMRect): void {
  markCelebratedLocally(habitId);
  haptic('tick');
  const rect = at instanceof Element ? at.getBoundingClientRect() : at;
  const coins = result.events.reduce((sum, e) => (e.type === 'coins' && e.reason === 'checkin' && e.habitId === habitId ? sum + e.amount : sum), 0);
  const quick = prefersReducedMotion();
  const later = (ms: number, fn: () => void) => (quick ? fn() : void setTimeout(fn, ms));

  // A partial tap on a count habit is just a ring tick: a small drop, no chip, no coin.
  if (!result.completed) {
    sfx.play('chime', { volume: 0.45, pitch: 0.94 });
    return;
  }
  later(CHECKIN_CHOREOGRAPHY.chime, () => sfx.play('chime'));
  if (coins > 0) {
    // Reserve now (same tick as the store), fly once the check has drawn.
    const held = reserve('coins', coins);
    later(CHECKIN_CHOREOGRAPHY.check, () => floatText(`+${coins}`, rect, { tone: 'coin' }));
    later(CHECKIN_CHOREOGRAPHY.coin, () => void flyCoins({ from: rect, amount: coins, kind: 'coins', reservation: held }));
  }
}

export interface CheckInNoteOptions {
  habitId: string;
  habitName: string;
  /** Coins this check-in earned (shown as "+5" with a coin token). */
  coins: number;
  tiny?: boolean;
  /** An observed line from the pets' caption matrix ("Pudding opened one eye."). */
  note?: string;
  onUndo: () => void;
}

/**
 * The 4-second Undo note every completing check-in shows (DESIGN §5.2, §12):
 * "Walk, watered. +5 · Pudding opened one eye. · Undo". Rapid check-ins of the same habit
 * update one note instead of stacking.
 */
export function showCheckInNote({ habitId, habitName, coins, tiny = false, note, onUndo }: CheckInNoteOptions): string {
  const line = checkInLine(habitName, { tiny });
  return toast({
    key: `checkin-${habitId}`,
    message: (
      <>
        {line}
        {coins > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', verticalAlign: '-2px' }}>
            +{coins}
            <CoinIcon size={14} />
          </span>
        )}
      </>
    ),
    note,
    label: [line, coins > 0 ? `Plus ${coins} coins.` : '', note ?? ''].filter(Boolean).join(' '),
    art: <WaterDrop size={22} />,
    tone: 'sky',
    duration: 4000,
    action: { label: FX_UI.undo, onAction: onUndo },
  });
}

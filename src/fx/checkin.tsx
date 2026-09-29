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
import { themeLight, WaterDrop } from '@/ui/art/objects';
import { announceSettled, cancelSettled } from '@/ui/announce';
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

/** Check-ins waiting to be announced together, by habit (the burst rule, DESIGN §9.1). */
const heard = new Map<string, { name: string; coins: number; tiny: boolean; note?: string }>();
const SETTLE_GROUP = 'checkin';

/** How many reactions a settled burst reads out after the list of habits. */
export const MAX_SETTLED_NOTES = 2;

/** "Walk and Read watered. Plus 10 coins. Pudding opened one eye." — one sentence for every check-in since the last quiet. */
export function settledCheckInLine(entries: readonly { name: string; coins: number; tiny: boolean; note?: string }[]): string {
  if (entries.length === 0) return '';
  const coins = entries.reduce((sum, e) => sum + e.coins, 0);
  const plus = coins > 0 ? ` Plus ${coins} coins.` : '';
  if (entries.length === 1) {
    const e = entries[0]!;
    return [`${checkInLine(e.name, { tiny: e.tiny })}${plus}`, e.note ?? '', `${FX_UI.undo} available.`].filter(Boolean).join(' ');
  }
  const names = entries.map((e) => e.name);
  const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  // The pet and plant reactions sighted users read on each note: the latest distinct ones, at most two.
  const notes = [...new Set(entries.map((e) => e.note?.trim()).filter((n): n is string => !!n))].slice(-MAX_SETTLED_NOTES);
  return [`${list} watered.${plus}`, ...notes, `${FX_UI.undo} available.`].join(' ');
}

function announceCheckIns() {
  announceSettled(SETTLE_GROUP, () => {
    const line = settledCheckInLine([...heard.values()]);
    heard.clear();
    return line;
  });
}

/**
 * The 4-second Undo note every completing check-in shows (DESIGN §5.2, §12):
 * "Walk, watered. +5 · Pudding opened one eye. · Undo". Rapid check-ins of the same habit
 * update one note instead of stacking, and screen readers hear every check-in of a burst in one
 * sentence once the taps have stopped for 1.2 s.
 */
export function showCheckInNote({ habitId, habitName, coins, tiny = false, note, onUndo }: CheckInNoteOptions): string {
  const line = checkInLine(habitName, { tiny });
  heard.delete(habitId);
  heard.set(habitId, { name: habitName, coins, tiny, note });
  announceCheckIns();
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
    silent: true,
    art: <WaterDrop size={22} light={themeLight()} />,
    tone: 'sky',
    duration: 4000,
    action: {
      label: FX_UI.undo,
      onAction: () => {
        // Undone before it was read out: it is not announced at all.
        if (heard.delete(habitId)) heard.size ? announceCheckIns() : cancelSettled(SETTLE_GROUP);
        onUndo();
      },
    },
  });
}

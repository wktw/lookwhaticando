/**
 * The check-in flourish (DESIGN §9.1), for screens that check habits off. The CheckRing fills
 * and draws its own check; this plays the rest of the choreography in step with it: a "+5" chip,
 * the rising water-drop chime as the water tops out, one brass coin into the jar, a haptic tick.
 * Call it in the same tick as checkIn(): it claims the check-in's coins from <CelebrationHost/>
 * (so they're celebrated once) and reserves them, so the wallet counter waits for the coin.
 *
 * Then the note: showCheckInNote() words it from lines.ts CHECKIN_TOASTS, adds the aside (the
 * harvest, or now and then what the habit's companion did), and offers "Undo" and "Add a note".
 */
import type { CheckInResult, GameEvent } from '@/state/api';
import type { Species } from '@/catalog/types';
import { getCollectible } from '@/catalog/collectibles';
import { ASIDE_CHANCE, CHECKIN_ASIDES, fillLine, pickFrom } from '@/catalog/lines';
import { levelForXp } from '@/domain/levels';
import { state } from '@/state/store';
import { CoinIcon } from '@/art/icons';
import { CHECKIN_CHOREOGRAPHY } from '@/ui/checkRingModel';
import { themeLight, WaterDrop } from '@/ui/art/objects';
import { announceSettled, cancelSettled } from '@/ui/announce';
import { dismissToast, findToast, toast, toastIsReachable, type ToastAction } from '@/ui/toast';
import { flyCoins } from './coinFly';
import { floatText } from './floatingText';
import { haptic } from './haptics';
import { sfx } from './sound';
import { reserve } from './walletLedger';
import { markCelebratedLocally } from './celebrations';
import { prefersReducedMotion } from './motion';
import { checkInKind, checkInLine, FX_UI, harvestLine, plusCoins, uncheckLine, wateredBatchLine, type CheckInKind } from './copy';

/** Runs `fn` once the next frame has painted (a timeout queued from inside rAF). */
function afterFrame(fn: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(fn, 0));
  else setTimeout(fn, 0);
}

export function celebrateCheckIn(result: CheckInResult, habitId: string, at: Element | DOMRect): void {
  markCelebratedLocally(habitId);
  haptic('tick');
  const rect = at instanceof Element ? at.getBoundingClientRect() : at;
  const coins = result.events.reduce((sum, e) => (e.type === 'coins' && e.reason === 'checkin' && e.habitId === habitId ? sum + e.amount : sum), 0);
  const quick = prefersReducedMotion();
  // Reduced motion plays it all at once, but still after the tap's frame (never inside the tap).
  const later = (ms: number, fn: () => void) => void (quick ? afterFrame(fn) : setTimeout(fn, ms));

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

/* ------------------------------------------------------------------ */
/* The aside                                                           */
/* ------------------------------------------------------------------ */

/** A pet as the aside needs it. */
export interface AsidePet {
  name: string;
  species: Species;
  level: number;
}

export interface AsideInput {
  habitId: string;
  /** The check-in result's events (harvest, companionXp). */
  events: readonly GameEvent[];
  /** The habit's plant, for the harvest line. */
  plant?: Parameters<typeof harvestLine>[0];
  /** Looks up the companion named by a companionXp event. */
  pet(id: string): AsidePet | undefined;
  /** 0..1, stable per check-in: an aside shows when it falls under ASIDE_CHANCE. */
  roll: number;
  /** 23:00–06:00, or the companion is mid-nap: the asleep lines. */
  night: boolean;
  /** The last few asides said (never repeated within lines.ts RECENT_WINDOW). */
  recent?: readonly string[];
}

/**
 * The note's second line (VOICE §5): a harvest always shows ("A pinch of cat grass, into the
 * basket."); otherwise, about 1 in 4 check-ins, what the habit's companion did ("Pudding opened
 * one eye."), species-true and level-true, from lines.ts CHECKIN_ASIDES. Pure.
 */
export function checkInAside({ habitId, events, plant, pet, roll, night, recent = [] }: AsideInput): string | undefined {
  const harvest = events.find((e) => e.type === 'harvest' && e.habitId === habitId);
  if (harvest) return harvestLine(plant) ?? undefined;
  const company = events.find((e): e is Extract<GameEvent, { type: 'companionXp' }> => e.type === 'companionXp' && e.habitId === habitId);
  if (!company || roll >= ASIDE_CHANCE) return undefined;
  const p = pet(company.petId);
  if (!p) return undefined;
  const seed = Math.floor((roll / ASIDE_CHANCE) * 1e6);
  const template = pickFrom(night ? CHECKIN_ASIDES.asleep : CHECKIN_ASIDES.awake, p.species, seed, recent, { level: p.level, night });
  return template ? fillLine(template, { name: p.name }) : undefined;
}

/** A stable 0..1 from a string (the same check-in rolls the same aside). */
export function rollFor(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100_000) / 100_000;
}

const recentAsides: string[] = [];

function asideFromState(habitId: string, events: readonly GameEvent[]): string | undefined {
  const s = state.value;
  const habit = s.habits.find((h) => h.id === habitId);
  const checkin = events.find((e) => e.type === 'checkin' && e.habitId === habitId);
  const date = checkin && 'date' in checkin ? checkin.date : '';
  const hour = new Date().getHours();
  const line = checkInAside({
    habitId,
    events,
    plant: habit?.plant,
    pet: (id) => {
      const p = s.pets[id];
      const def = getCollectible(id);
      if (!p || def?.category !== 'pet') return undefined;
      return { name: p.name, species: def.species, level: levelForXp(p.xp) };
    },
    roll: rollFor(`${habitId}|${date}|${s.lifetime.checkins}`),
    night: hour >= 23 || hour < 6,
    recent: recentAsides,
  });
  if (line) {
    recentAsides.push(line);
    if (recentAsides.length > 5) recentAsides.shift();
  }
  return line;
}

/* ------------------------------------------------------------------ */
/* The note                                                            */
/* ------------------------------------------------------------------ */

export interface CheckInNoteOptions {
  habitId: string;
  habitName: string;
  /** Coins this check-in earned (shown as "+5" with a coin token). */
  coins: number;
  /** Which note (defaults from coins, tiny and count): 'watered' · 'count' · 'tiny' · 'noCoins' · 'history'. */
  kind?: CheckInKind;
  tiny?: boolean;
  /** A count habit reaching its target: "Drink water, watered. 8 glasses." */
  count?: number;
  unit?: string;
  /** A history edit: the day it was for ("Sat, Sep 27"). */
  date?: string;
  /** The check-in result's events: the harvest and the companion's aside come from them. */
  events?: readonly GameEvent[];
  /** An observed line to show instead ("Pudding opened one eye."). */
  note?: string;
  onUndo: () => void;
  /** "Add a note": opens the add-a-note field (VOICE §5). Without it the note offers Undo only. */
  onAddNote?: () => void;
}

interface Heard {
  name: string;
  coins: number;
  tiny: boolean;
  note?: string;
  kind?: CheckInKind;
}

/** The toast keys of a habit's check-in note and its un-watering note (kept apart, never merged). */
export const checkInKey = (habitId: string) => `checkin-${habitId}`;
export const uncheckKey = (habitId: string) => `uncheck-${habitId}`;

function putAway(key: string) {
  const live = findToast(key);
  if (live) dismissToast(live.id);
}

/** Check-ins waiting to be announced together, by habit (the burst rule, DESIGN §9.1). */
const heard = new Map<string, Heard>();
const SETTLE_GROUP = 'checkin';

/** How many reactions a settled burst reads out after the count of habits. */
export const MAX_SETTLED_NOTES = 2;

/**
 * One sentence for every check-in since the last quiet (VOICE §5): "Walk, watered. Plus 5 coins.
 * Pudding opened one eye. Undo available." · "3 habits watered. Plus 14 coins. Undo available."
 */
export function settledCheckInLine(entries: readonly Heard[]): string {
  if (entries.length === 0) return '';
  const coins = entries.reduce((sum, e) => sum + e.coins, 0);
  const undo = `${FX_UI.undo} available.`;
  if (entries.length === 1) {
    const e = entries[0]!;
    const kind = e.kind ?? checkInKind({ coins: e.coins, tiny: e.tiny });
    return [checkInLine(kind, { habit: e.name }), plusCoins(e.coins), e.note ?? '', undo].filter(Boolean).join(' ');
  }
  // The pet and plant reactions sighted users read on each note: the latest distinct ones, at most two.
  const notes = [...new Set(entries.map((e) => e.note?.trim()).filter((n): n is string => !!n))].slice(-MAX_SETTLED_NOTES);
  return [wateredBatchLine(entries.length, coins), ...notes, undo].join(' ');
}

function announceCheckIns() {
  announceSettled(SETTLE_GROUP, () => {
    const ready = [...heard].filter(([id]) => {
      const note = findToast(checkInKey(id));
      if (!note) heard.delete(id);
      return note && toastIsReachable(note.id);
    });
    for (const [id] of ready) heard.delete(id);
    return settledCheckInLine(ready.map(([, entry]) => entry));
  });
}

/**
 * The 4-second note every completing check-in shows (DESIGN §5.2, VOICE §5):
 * "Walk, watered. +5 · Pudding opened one eye. · Undo · Add a note". Rapid check-ins of the same
 * habit update one note instead of stacking, and screen readers hear every check-in of a burst in
 * one sentence once the taps have stopped for 1.2 s.
 */
export function showCheckInNote(opts: CheckInNoteOptions): string {
  const { habitId, habitName, coins, tiny = false, count, unit, date, events = [], onUndo, onAddNote } = opts;
  const kind = opts.kind ?? checkInKind({ coins, tiny, count, history: !!date });
  const line = checkInLine(kind, { habit: habitName, count, unit, date });
  const note = opts.note ?? (events.length ? asideFromState(habitId, events) : undefined);
  const chip = coins > 0 && kind !== 'history';
  // Watered again: the "not watered after all" note has had its say.
  putAway(uncheckKey(habitId));
  heard.delete(habitId);
  heard.set(habitId, { name: habitName, coins: chip ? coins : 0, tiny, note, kind });
  announceCheckIns();
  const actions: ToastAction[] = [
    {
      label: FX_UI.undo,
      onAction: () => {
        // Undone before it was read out: it is not announced at all.
        if (heard.delete(habitId)) heard.size ? announceCheckIns() : cancelSettled(SETTLE_GROUP);
        onUndo();
      },
    },
  ];
  if (onAddNote) actions.push({ label: FX_UI.addNote, onAction: onAddNote });
  return toast({
    key: checkInKey(habitId),
    message: (
      <>
        {line}
        {chip && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', verticalAlign: '-2px' }}>
            +{coins}
            <CoinIcon size={14} />
          </span>
        )}
      </>
    ),
    note,
    label: [line, chip ? plusCoins(coins) : '', note ?? ''].filter(Boolean).join(' '),
    silent: true,
    onReachable: announceCheckIns,
    art: <WaterDrop size={22} light={themeLight()} />,
    tone: 'sky',
    duration: 4000,
    actions,
  });
}

/**
 * The note after un-watering (VOICE §5): "Walk, not watered after all. The 5 coins went back in
 * the jar." · the coin, singular · "The coins were spent already, and stay spent." · or nothing
 * about coins at all. `spent` is how many of the check-in's coins were already spent.
 */
export function showUncheckNote({ habitId, habitName, refunded, spent = 0 }: { habitId: string; habitName: string; refunded: number; spent?: number }): string {
  const message = uncheckLine(habitName, { refunded, spent: spent > 0 && refunded <= 0 });
  heard.delete(habitId);
  // The check-in note (its aside, its Undo) no longer holds: put it away rather than merge into it.
  putAway(checkInKey(habitId));
  return toast({ key: uncheckKey(habitId), message, art: <WaterDrop size={22} light={themeLight()} />, tone: 'sky' });
}

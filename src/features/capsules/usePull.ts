import { useEffect, useRef, useState } from 'preact/hooks';
import type { MachineDef, MachineId } from '@/catalog/types';
import type { DomeBody } from '@/fx/physics';
import type { PullError } from '@/state/api';
import type { PendingReveal } from '@/state/types';
import type { RevealKey } from '@/domain/gacha';
import { finishReveal, machineStatus, ownership, pull, saveEpoch, state } from '@/state/store';
import { HANDLE_REST } from '@/art/machines/geometry';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { useDome } from './useDome';
import { useCrank } from './useCrank';
import { TICK_DEG, TURN_TARGET, ticksCrossed } from './ratchet';
import { animateChute, animateCoin, animateSink, closeFlap, jolt } from './choreography';
import { insertLabel, landedLine, nudgeText, pullErrorNotice, type FriendlyNotice } from './copy';
import { nextPayment, pullOptions, type Payment } from './payment';
import { prefersReducedMotion } from './motion';
import { capsuleShell, isWhiteish, revealFromPending, revealFromPull, type RevealData } from './reveal';
import type { TokenKind } from './Token';

export type Phase = 'idle' | 'inserting' | 'ready' | 'turning' | 'dropping' | 'waiting' | 'revealing';

/**
 * A capsule the store committed, as a cabinet shows it: the pending reveal it is (`key`; null when
 * a stand-in pull committed nothing) in the save it was shown in (`epoch`, the store's `saveEpoch`).
 */
interface Shown {
  data: RevealData;
  key: RevealKey | null;
  epoch: number;
}

/**
 * How each unopened capsule looked as it dropped (its shell's tint, the pet it brought), kept while
 * you visit other tabs. It is only choreography: the store's pendingReveal is the one authority for
 * "a capsule waits" (commit before animate, §7.1), and this look is used only while the pending
 * reveal is still that capsule, in the same save (`{epoch, machineId, itemId, at}`; WP-A8, UI2-02).
 */
const unopened = new Map<MachineId, Shown>();

const keyOf = (p: PendingReveal): RevealKey => ({ machineId: p.machineId, itemId: p.itemId, at: p.at });
const sameKey = (a: RevealKey, b: RevealKey) => a.machineId === b.machineId && a.itemId === b.itemId && a.at === b.at;

export interface PullOptions {
  /** The first capsule is on the house (onboarding): no price, and no second pull offered. */
  free?: boolean;
  /** Stands in for the store's pull (the dev gallery's demo counter). */
  pull?: typeof pull;
}

/** The capsule waiting in this cabinet in the save shown now, whenever and however it was committed. */
function resumeFor(machine: MachineDef): Shown | null {
  const pending = state.value.pendingReveal;
  const epoch = saveEpoch.value;
  const held = unopened.get(machine.id);
  // A Special Order's reveal belongs to the counter (CapsulesScreen), never to a cabinet's pull.
  if (!pending || pending.machineId !== machine.id || pending.order) return null;
  const key = keyOf(pending);
  if (held?.key && held.epoch === epoch && sameKey(held.key, key)) return held;
  if (held) unopened.delete(machine.id);
  const data = revealFromPending(pending, capsuleShell(machine.theme.capsules, 0));
  return data ? { data, key, epoch } : null;
}

/**
 * The pull's phase machine (DESIGN §7.2): pay → the token into the slot → turn the handle →
 * ka-chunk → a capsule sinks out of the window and drops into the chute → the reveal → reset
 * (or pull again). The store decides and commits the result at the ka-chunk, before anything
 * drops. Returns state for rendering and the refs the choreography animates.
 */
export function usePull(machine: MachineDef, active: boolean, options: PullOptions = {}) {
  const dome = useDome(machine, active);
  // The save shown: when it is replaced, this cabinet drops what it was doing (the effect below).
  const epoch = saveEpoch.value;
  const [resumed] = useState(() => (active ? resumeFor(machine) : null));
  const [phase, setPhase] = useState<Phase>(resumed ? 'revealing' : 'idle');
  const [payment, setPayment] = useState<Payment>(options.free ? 'free' : 'price');
  const [notice, setNotice] = useState<FriendlyNotice | null>(null);
  const [say, setSay] = useState('');
  const [nudging, setNudging] = useState(false);
  const [shown, setShown] = useState<Shown | null>(resumed);
  const shownNow = useRef(shown);
  const [sinking, setSinking] = useState<DomeBody | null>(null);
  const [chuteTint, setChuteTint] = useState(0);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  // Async choreography reads the live phase, not the one captured when it started.
  const phaseNow = useRef(phase);
  phaseNow.current = phase;

  const refs = {
    stage: useRef<HTMLDivElement>(null),
    handle: useRef<SVGGElement>(null),
    handleShadow: useRef<SVGGElement>(null),
    slot: useRef<SVGGElement>(null),
    flap: useRef<SVGGElement>(null),
    coin: useRef<SVGGElement>(null),
    sink: useRef<SVGGElement>(null),
    chute: useRef<SVGGElement>(null),
    handleControl: useRef<HTMLDivElement>(null),
    insertButton: useRef<HTMLButtonElement>(null),
  };
  const run = useRef({ progress: 0, completing: false, autoTurning: false, refocus: false, refillOwed: false, nudgeTimer: 0, openTimer: 0 }).current;

  /*
   * The interaction's lifetime (WP-A8, INV-7): it belongs to this mount and to the save shown when it
   * began. Every frame and timeout goes through `frame`/`later`, so unmounting or a replaced save
   * cancels them, and each awaited step asks `live()` before carrying on. Before the commit an
   * interruption pulls nothing; after it, the store's pendingReveal brings the capsule back.
   */
  const life = useRef({ alive: true, epoch, gen: 0, frames: new Set<number>(), timers: new Set<number>() }).current;
  /** Whether what started now may still act: this mount, this save, and no reset since. */
  const session = () => {
    const gen = life.gen;
    return () => life.alive && gen === life.gen && life.epoch === saveEpoch.peek();
  };
  const current = () => life.alive && life.epoch === saveEpoch.peek();
  const frame = (fn: FrameRequestCallback) => {
    const id = requestAnimationFrame((t) => {
      life.frames.delete(id);
      if (current()) fn(t);
    });
    life.frames.add(id);
  };
  const later = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => {
      life.timers.delete(id);
      if (current()) fn();
    }, ms);
    life.timers.add(id);
    return id;
  };
  const cancel = (id: number) => {
    clearTimeout(id);
    life.timers.delete(id);
  };
  /** A pause that simply never ends if the interaction is cancelled meanwhile. */
  const sleep = (ms: number) => new Promise<void>((resolve) => void later(resolve, ms));
  const cancelAll = () => {
    for (const id of life.frames) cancelAnimationFrame(id);
    for (const id of life.timers) clearTimeout(id);
    life.frames.clear();
    life.timers.clear();
    // The pile is the session's, not this interaction's: a capsule owed to it still goes back, at once.
    refill();
  };
  /** A fresh capsule tumbles in to take the opened one's place (once). */
  const refill = () => {
    if (!run.refillOwed) return;
    run.refillOwed = false;
    dome.refill();
  };

  const show = (next: Shown | null) => {
    shownNow.current = next;
    setShown(next);
  };
  /** Open a capsule the store already has waiting (a remount, a cabinet coming on screen, another save). */
  const resume = (r: Shown) => {
    show(r);
    phaseNow.current = 'revealing';
    setPhase('revealing');
  };

  const turnable = phase === 'ready' || phase === 'turning';
  const token: TokenKind = payment === 'ticket' ? 'ticket' : machine.currency === 'stars' && payment !== 'free' ? 'stamp' : 'coin';

  const setHandle = (progress: number, dir: number) => {
    const t = `rotate(${(HANDLE_REST + dir * progress).toFixed(1)})`;
    refs.handle.current?.setAttribute('transform', t);
    refs.handleShadow.current?.setAttribute('transform', t);
    const pct = Math.round((progress / TURN_TARGET) * 100);
    const el = refs.handleControl.current;
    el?.setAttribute('aria-valuenow', String(Math.min(100, pct)));
    el?.setAttribute('aria-valuetext', pct >= 100 ? 'One full turn' : `${pct}% of a turn`);
  };

  const crank = useCrank(turnable, {
    onGrab: () => setPhase('turning'),
    onAdvance: (progress, delta, dir) => {
      setHandle(progress, dir);
      // Turning stirs the capsules in proportion to how fast the handle goes round.
      dome.stir(Math.min(0.5, (delta / 360) * 4), dir * 0.9);
      const clicks = ticksCrossed(run.progress, progress);
      for (let i = 0; i < clicks; i++) {
        const tick = Math.floor(progress / TICK_DEG) - clicks + 1 + i;
        later(() => sfx.play('ratchet', { pitch: 1 + tick * 0.035 }), i * 45);
      }
      if (clicks > 0) {
        haptic('tick');
        dome.stir(0.12, dir);
      }
      run.progress = progress;
      if (progress >= TURN_TARGET) void complete(dir);
    },
    onAutoTurn: () => autoTurn(),
    onIdleTap: () => nudge(),
  });

  /* ---------------- insert ---------------- */

  const payError = (pay: Payment): { error: PullError; have?: number } | null => {
    const status = machineStatus(machine.id);
    if (!status.available) return { error: 'machine-unavailable' };
    // Still getting the writer lock: nothing could be saved yet, so the coin (or the free first
    // capsule) stays put and the machine works again a moment later (audit FS4).
    if (ownership.value === 'acquiring') return { error: 'acquiring' };
    if (pay === 'free') return null;
    if (pay === 'ticket') return state.value.wallet.tickets > 0 ? null : { error: 'no-ticket' };
    if (status.canAfford) return null;
    const w = state.value.wallet;
    return machine.currency === 'coins' ? { error: 'not-enough-coins', have: w.coins } : { error: 'not-enough-stars', have: w.stars };
  };

  const insert = async (pay: Payment) => {
    if (phaseNow.current !== 'idle' || !current()) return;
    const live = session();
    phaseNow.current = 'inserting';
    sfx.unlock();
    const err = payError(pay);
    if (err) {
      const n = pullErrorNotice(err.error, machine, err.have);
      phaseNow.current = 'idle';
      setNotice(n);
      setSay(n.text);
      haptic('light');
      jolt(refs.stage.current, 'nope', prefersReducedMotion());
      return;
    }
    setNotice(null);
    setNudging(false);
    setPayment(pay);
    setPhase('inserting');
    await sleep(0);
    const reduced = prefersReducedMotion();
    const kind: TokenKind = pay === 'ticket' ? 'ticket' : machine.currency === 'stars' && pay !== 'free' ? 'stamp' : 'coin';
    if (refs.coin.current) {
      await animateCoin(
        refs.coin.current,
        reduced,
        () => {
          if (!live()) return;
          sfx.play('coin');
          haptic('light');
          jolt(refs.stage.current, 'clink', reduced);
        },
        kind,
      );
      if (!live()) return;
    }
    setPhase('ready');
    setSay(`The ${kind === 'ticket' ? 'ticket' : kind} is in. Turn the handle: drag it round, or Space or Enter turns it.`);
  };

  /** The handle was tried before paying: point at the slot. */
  const nudge = () => {
    if (phaseNow.current !== 'idle') return;
    setNudging(true);
    cancel(run.nudgeTimer);
    run.nudgeTimer = later(() => setNudging(false), 1800);
    setSay(`${nudgeText(machine)} ${insertLabel(machine)}, then turn the handle.`);
    haptic('light');
    if (prefersReducedMotion()) return;
    refs.slot.current?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], {
      duration: 420,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    });
  };

  /* ---------------- the handle ---------------- */

  const autoTurn = () => {
    if (run.autoTurning || run.completing || !current()) return;
    setPhase('turning');
    const from = crank.progress();
    const remaining = TURN_TARGET - from;
    // Reduced motion: a static crank (DESIGN §7.2, DEC-E7). The handle goes round in one step, still
    // through the slider's value, so the turn is announced and the pull commits at once.
    if (prefersReducedMotion()) {
      crank.advanceBy(remaining);
      return;
    }
    run.autoTurning = true;
    const duration = 420 + remaining * 3.4;
    const t0 = performance.now();
    let turned = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const target = eased * remaining;
      crank.advanceBy(target - turned);
      turned = target;
      if (k < 1 && !run.completing) frame(step);
      else run.autoTurning = false;
    };
    frame(step);
  };

  /** Carry the handle the last bit round to a full turn (back to its resting angle). */
  const finishTurn = (dir: 1 | -1, reduced: boolean) =>
    new Promise<void>((resolve) => {
      if (reduced) {
        setHandle(0, dir);
        resolve();
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 240);
        setHandle(TURN_TARGET + (360 - TURN_TARGET) * (1 - (1 - k) ** 3), dir);
        if (k < 1) frame(step);
        else {
          setHandle(0, dir);
          resolve();
        }
      };
      frame(step);
    });

  /* ---------------- ka-chunk → the chute ---------------- */

  const complete = async (dir: 1 | -1) => {
    if (run.completing) return;
    // Nothing is pulled for a screen that has gone, or into a save the turn didn't begin on (UI2-01).
    if (!current()) return;
    const live = session();
    run.completing = true;
    setPhase('dropping');
    const reduced = prefersReducedMotion();
    sfx.play('ratchet', { pitch: 0.55, volume: 1 });
    haptic('medium');
    jolt(refs.stage.current, 'chunk', reduced);
    void finishTurn(dir, reduced);

    // Commit before animate: the store decides and saves the pull now, before anything drops.
    const outcome = (options.pull ?? pull)(machine.id, pullOptions(payment));
    if (!outcome.ok) {
      const w = state.value.wallet;
      const n = pullErrorNotice(outcome.error, machine, machine.currency === 'coins' ? w.coins : w.stars);
      setNotice(n);
      setSay(`Your ${token === 'ticket' ? 'ticket' : token} came back out. ${n.text}`);
      sfx.play('undo');
      resetMachine();
      // A capsule already waits here (another window pulled it into this same save): open that one.
      if (outcome.error === 'reveal-pending') {
        const r = resumeFor(machine);
        if (r) resume(r);
      }
      return;
    }

    // A coloured capsule near the exit goes before a white one: it's the one you'll open.
    const colors = machine.theme.capsules;
    const body = dome.release((b) => !isWhiteish(colors[b.tint % colors.length]!));
    const tint = body?.tint ?? 0;
    const pulled = revealFromPull(outcome, capsuleShell(colors, tint));
    // The pending reveal the store just committed is this capsule's identity (null for a stand-in pull).
    const p = state.peek().pendingReveal;
    const committed: Shown = { data: pulled, key: p && !p.order && p.machineId === machine.id && p.itemId === pulled.itemId ? keyOf(p) : null, epoch: life.epoch };
    if (committed.key) unopened.set(machine.id, committed);
    show(committed);
    setSinking(body);
    setChuteTint(tint);
    dome.stir(0.2, dir * 0.5);
    // From here on the capsule is committed: if this screen goes, the pending reveal brings it back.
    await sleep(reduced ? 0 : 60);
    if (refs.sink.current) {
      await animateSink(refs.sink.current, reduced);
      if (!live()) return;
    }
    setSinking(null);
    if (refs.chute.current) {
      await animateChute(refs.chute.current, refs.flap.current, reduced, (strength) => {
        if (!live()) return;
        sfx.play('thunk', { volume: strength });
        haptic(strength > 0.5 ? 'light' : 'tick');
      });
      if (!live()) return;
    }
    setPhase('waiting');
    phaseNow.current = 'waiting';
    setSay(landedLine(pulled.rarity, pulled.secret));
    run.openTimer = later(openReveal, reduced ? 300 : 700);
  };

  /** Take the capsule out of the chute and into the reveal (after a beat, or right away when tapped). */
  const openReveal = () => {
    cancel(run.openTimer);
    if (phaseNow.current !== 'waiting') return;
    phaseNow.current = 'revealing';
    setOrigin(refs.chute.current?.getBoundingClientRect() ?? null);
    setPhase('revealing');
  };

  const resetMachine = () => {
    for (const a of refs.chute.current?.getAnimations?.() ?? []) a.cancel();
    for (const a of refs.coin.current?.getAnimations?.() ?? []) a.cancel();
    closeFlap(refs.flap.current);
    crank.reset();
    run.progress = 0;
    run.completing = false;
    run.autoTurning = false;
    setHandle(0, 1);
    phaseNow.current = 'idle';
    setPhase('idle');
  };

  /* ---------------- the reveal ---------------- */

  /**
   * Close the reveal; `again` goes straight into the next pull, paid as its button said. It clears
   * only the capsule this reveal showed, in the save it was shown in: a close left over from another
   * reveal or another save does nothing (UI2-02).
   */
  const closeReveal = (again?: Payment) => {
    const was = shown;
    if (!life.alive || was !== shownNow.current || (was && was.epoch !== saveEpoch.peek())) return;
    if (was) {
      if (unopened.get(machine.id) === was) unopened.delete(machine.id);
      if (was.key) finishReveal({ ...was.key, epoch: was.epoch });
    }
    show(null);
    setOrigin(null);
    resetMachine();
    // A fresh capsule tumbles in to take its place.
    run.refillOwed = true;
    later(refill, 260);
    // Straight into the next token, so the carousel never unlocks in between.
    if (again) void insert(again);
    else run.refocus = true;
  };

  const again = phase === 'revealing' && !options.free ? nextPayment(payment, machineStatus(machine.id).canAfford, state.value.wallet.tickets) : null;

  // The chute empties once the reveal has taken the capsule; focus moves with the flow.
  useEffect(() => {
    if (phase === 'revealing') {
      for (const a of refs.chute.current?.getAnimations?.() ?? []) a.cancel();
      closeFlap(refs.flap.current);
    }
    if (phase === 'ready') refs.handleControl.current?.focus({ preventScroll: true });
    if (phase === 'idle' && run.refocus) {
      run.refocus = false;
      refs.insertButton.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  // Unmounted: nothing it scheduled runs, and nothing it awaited carries on (UI2-01).
  useEffect(
    () => () => {
      life.alive = false;
      cancelAll();
    },
    [],
  );

  // The save shown was replaced (an import, an Undo, a restore, Start over, the demo, another
  // window): what this cabinet was doing belonged to the old save. Before the commit nothing was
  // pulled, and the crank comes back; after it, only the new save's own waiting capsule is shown.
  useEffect(() => {
    if (life.epoch === epoch) return;
    life.epoch = epoch;
    life.gen++;
    cancelAll();
    show(null);
    setOrigin(null);
    setSinking(null);
    setNotice(null);
    setNudging(false);
    resetMachine();
    const r = active ? resumeFor(machine) : null;
    if (r) resume(r);
  }, [epoch]);

  // A neighbour becoming the cabinet on screen opens the capsule waiting in it (integration-i3).
  useEffect(() => {
    if (!active || phaseNow.current !== 'idle') return;
    const r = resumeFor(machine);
    if (r) resume(r);
  }, [active]);

  // "One moment" clears itself once this window has the writer lock (or knows it won't).
  useEffect(
    () =>
      ownership.subscribe((o) => {
        if (o !== 'acquiring') setNotice((n) => (n?.text === pullErrorNotice('acquiring', machine).text ? null : n));
      }),
    [machine],
  );

  // Space turns the handle (DESIGN §7.2) when nothing else wants the key.
  useEffect(() => {
    if (!active || !turnable) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== ' ' || e.repeat || t?.closest('button, a, input, textarea, select, [contenteditable], [role="slider"]')) return;
      // Not while a sheet or dialog is open over the cabinet.
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      autoTurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, turnable]);

  return {
    phase,
    turnable,
    payment,
    token,
    notice,
    say,
    nudging,
    /** The capsule on show, only while it belongs to the save shown. */
    reveal: shown && shown.epoch === epoch ? shown.data : null,
    sinking,
    chuteTint,
    origin,
    again,
    dome,
    crank,
    refs,
    insert,
    openReveal,
    closeReveal,
  };
}

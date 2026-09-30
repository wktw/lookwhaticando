import { useEffect, useRef, useState } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import type { DomeBody } from '@/fx/physics';
import type { PullError } from '@/state/api';
import { finishReveal, machineStatus, ownership, pull, state } from '@/state/store';
import { HANDLE_REST } from '@/art/machines/geometry';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { useDome } from './useDome';
import { useCrank } from './useCrank';
import { TICK_DEG, TURN_TARGET, ticksCrossed } from './ratchet';
import { animateChute, animateCoin, animateSink, closeFlap, jolt } from './choreography';
import { insertLabel, landedLine, nudgeText, pullErrorNotice, type FriendlyNotice } from './copy';
import { nextPayment, pullOptions, type Payment } from './payment';
import { prefersReducedMotion, wait } from './motion';
import { capsuleShell, isWhiteish, revealFromPending, revealFromPull, type RevealData } from './reveal';
import type { TokenKind } from './Token';

export type Phase = 'idle' | 'inserting' | 'ready' | 'turning' | 'dropping' | 'waiting' | 'revealing';

/**
 * A pull that hasn't been opened yet. The item is already yours once the handle completes its
 * turn, so if you leave mid-drop (another tab, say), the capsule is waiting when you come back.
 * After a reload the store's pendingReveal does the same (commit before animate, §7.1).
 */
const unopened = new Map<MachineDef['id'], RevealData>();

export interface PullOptions {
  /** The first capsule is on the house (onboarding): no price, and no second pull offered. */
  free?: boolean;
  /** Stands in for the store's pull (the dev gallery's demo counter). */
  pull?: typeof pull;
}

function resumeFor(machine: MachineDef): RevealData | null {
  const held = unopened.get(machine.id);
  if (held) return held;
  const pending = state.value.pendingReveal;
  // A Special Order's reveal belongs to the counter (CapsulesScreen), never to a cabinet's pull.
  if (pending?.machineId !== machine.id || pending.order) return null;
  return revealFromPending(pending, capsuleShell(machine.theme.capsules, 0));
}

/**
 * The pull's phase machine (DESIGN §7.2): pay → the token into the slot → turn the handle →
 * ka-chunk → a capsule sinks out of the window and drops into the chute → the reveal → reset
 * (or pull again). The store decides and commits the result at the ka-chunk, before anything
 * drops. Returns state for rendering and the refs the choreography animates.
 */
export function usePull(machine: MachineDef, active: boolean, options: PullOptions = {}) {
  const dome = useDome(machine, active);
  const [phase, setPhase] = useState<Phase>(() => (active && resumeFor(machine) ? 'revealing' : 'idle'));
  const [payment, setPayment] = useState<Payment>(options.free ? 'free' : 'price');
  const [notice, setNotice] = useState<FriendlyNotice | null>(null);
  const [say, setSay] = useState('');
  const [nudging, setNudging] = useState(false);
  const [reveal, setReveal] = useState<RevealData | null>(() => (active ? resumeFor(machine) : null));
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
  const run = useRef({ progress: 0, completing: false, autoTurning: false, refocus: false, nudgeTimer: 0, openTimer: 0 }).current;

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
        setTimeout(() => sfx.play('ratchet', { pitch: 1 + tick * 0.035 }), i * 45);
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
    if (phaseNow.current !== 'idle') return;
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
    await wait(0);
    const reduced = prefersReducedMotion();
    const kind: TokenKind = pay === 'ticket' ? 'ticket' : machine.currency === 'stars' && pay !== 'free' ? 'stamp' : 'coin';
    if (refs.coin.current) {
      await animateCoin(
        refs.coin.current,
        reduced,
        () => {
          sfx.play('coin');
          haptic('light');
          jolt(refs.stage.current, 'clink', reduced);
        },
        kind,
      );
    }
    setPhase('ready');
    setSay(`The ${kind === 'ticket' ? 'ticket' : kind} is in. Turn the handle: drag it round, or Space or Enter turns it.`);
  };

  /** The handle was tried before paying: point at the slot. */
  const nudge = () => {
    if (phaseNow.current !== 'idle') return;
    setNudging(true);
    clearTimeout(run.nudgeTimer);
    run.nudgeTimer = window.setTimeout(() => setNudging(false), 1800);
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
    if (run.autoTurning || run.completing) return;
    run.autoTurning = true;
    setPhase('turning');
    const from = crank.progress();
    const remaining = TURN_TARGET - from;
    const duration = prefersReducedMotion() ? 420 : 420 + remaining * 3.4;
    const t0 = performance.now();
    let turned = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const target = eased * remaining;
      crank.advanceBy(target - turned);
      turned = target;
      if (k < 1 && !run.completing) requestAnimationFrame(step);
      else run.autoTurning = false;
    };
    requestAnimationFrame(step);
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
        if (k < 1) requestAnimationFrame(step);
        else {
          setHandle(0, dir);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

  /* ---------------- ka-chunk → the chute ---------------- */

  const complete = async (dir: 1 | -1) => {
    if (run.completing) return;
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
      return;
    }

    // A coloured capsule near the exit goes before a white one: it's the one you'll open.
    const colors = machine.theme.capsules;
    const body = dome.release((b) => !isWhiteish(colors[b.tint % colors.length]!));
    const tint = body?.tint ?? 0;
    const pulled = revealFromPull(outcome, capsuleShell(colors, tint));
    unopened.set(machine.id, pulled);
    setReveal(pulled);
    setSinking(body);
    setChuteTint(tint);
    dome.stir(0.2, dir * 0.5);
    await wait(reduced ? 0 : 60);
    if (refs.sink.current) await animateSink(refs.sink.current, reduced);
    setSinking(null);
    if (refs.chute.current) {
      await animateChute(refs.chute.current, refs.flap.current, reduced, (strength) => {
        sfx.play('thunk', { volume: strength });
        haptic(strength > 0.5 ? 'light' : 'tick');
      });
    }
    setPhase('waiting');
    phaseNow.current = 'waiting';
    setSay(landedLine(pulled.rarity, pulled.secret));
    run.openTimer = window.setTimeout(openReveal, reduced ? 300 : 700);
  };

  /** Take the capsule out of the chute and into the reveal (after a beat, or right away when tapped). */
  const openReveal = () => {
    clearTimeout(run.openTimer);
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

  /** Close the reveal; `again` goes straight into the next pull, paid as its button said. */
  const closeReveal = (again?: Payment) => {
    unopened.delete(machine.id);
    finishReveal();
    setReveal(null);
    setOrigin(null);
    resetMachine();
    // A fresh capsule tumbles in to take its place.
    setTimeout(() => dome.refill(), 260);
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

  useEffect(
    () => () => {
      clearTimeout(run.nudgeTimer);
      clearTimeout(run.openTimer);
    },
    [],
  );

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
    reveal,
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

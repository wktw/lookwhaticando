import { useEffect, useRef, useState } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import type { DomeBody } from '@/fx/physics';
import type { PullError } from '@/state/api';
import { machineStatus, pull, state } from '@/state/store';
import { CRANK_REST } from '@/art/machines/geometry';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { useDome } from './useDome';
import { useCrank } from './useCrank';
import { TICK_DEG, TURN_TARGET, ticksCrossed } from './ratchet';
import { animateChute, animateCoin, animateDrop, animateSink, jolt } from './choreography';
import { nudgeText, pullErrorNotice, type FriendlyNotice } from './copy';
import { nextPayment, type Payment } from './payment';
import { prefersReducedMotion, wait } from './motion';
import { capsuleShell, isWhiteish, revealFromPull, type RevealData } from './reveal';

export type Phase = 'idle' | 'inserting' | 'ready' | 'turning' | 'dropping' | 'landed' | 'revealing';

/**
 * A pull that hasn't been opened yet. The item is already yours once the crank completes, so if
 * you leave mid-drop (another tab, say), the capsule is waiting for you when you come back.
 */
const unopened = new Map<MachineDef['id'], RevealData>();

/**
 * The pull's phase machine (DESIGN §9.3): pay → coin into the slot → turn the crank →
 * ka-chunk → a capsule sinks, comes down the chute, rolls out → reveal → reset (or pull again).
 * The result is decided only when the crank completes. Returns state for rendering and the
 * refs the choreography animates.
 */
export function usePull(machine: MachineDef, active: boolean) {
  const dome = useDome(machine, active);
  const [phase, setPhase] = useState<Phase>(() => (active && unopened.has(machine.id) ? 'revealing' : 'idle'));
  const [payment, setPayment] = useState<Payment>('price');
  const [notice, setNotice] = useState<FriendlyNotice | null>(null);
  const [say, setSay] = useState('');
  const [nudging, setNudging] = useState(false);
  const [reveal, setReveal] = useState<RevealData | null>(() => (active ? (unopened.get(machine.id) ?? null) : null));
  const [sinking, setSinking] = useState<DomeBody | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  // Async choreography reads the live phase, not the one captured when it started.
  const phaseNow = useRef(phase);
  phaseNow.current = phase;

  const refs = {
    stage: useRef<HTMLDivElement>(null),
    crank: useRef<SVGGElement>(null),
    slot: useRef<SVGGElement>(null),
    flap: useRef<SVGGElement>(null),
    coin: useRef<SVGGElement>(null),
    sink: useRef<SVGGElement>(null),
    chute: useRef<SVGGElement>(null),
    out: useRef<SVGGElement>(null),
    crankButton: useRef<HTMLButtonElement>(null),
    insertButton: useRef<HTMLButtonElement>(null),
  };
  const run = useRef({ progress: 0, completing: false, autoTurning: false, refocus: false, nudgeTimer: 0 }).current;

  const turnable = phase === 'ready' || phase === 'turning';
  const setCrankAngle = (deg: number) => refs.crank.current?.setAttribute('transform', `rotate(${deg.toFixed(1)})`);

  const crank = useCrank(turnable, {
    onGrab: () => setPhase('turning'),
    onAdvance: (progress, delta, dir) => {
      setCrankAngle(CRANK_REST + dir * progress);
      // The wheel inside stirs the pile in proportion to how fast you turn.
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

  const payError = (pay: Payment): PullError | null => {
    if (pay === 'ticket') return state.value.wallet.tickets > 0 ? null : 'no-ticket';
    const status = machineStatus(machine.id);
    if (!status.available) return 'machine-unavailable';
    if (!status.canAfford) return machine.currency === 'coins' ? 'not-enough-coins' : 'not-enough-stars';
    return null;
  };

  const insert = async (pay: Payment) => {
    if (phaseNow.current !== 'idle') return;
    phaseNow.current = 'inserting';
    sfx.unlock();
    const err = payError(pay);
    if (err) {
      const n = pullErrorNotice(err, machine);
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
    if (refs.coin.current) {
      await animateCoin(refs.coin.current, reduced, () => {
        sfx.play('coin');
        haptic('light');
        jolt(refs.stage.current, 'clink', reduced);
      });
    }
    setPhase('ready');
    setSay('In it goes! Now turn the crank: drag it around, or press it.');
  };

  /** The crank was tapped before paying: point at the slot. */
  const nudge = () => {
    if (phaseNow.current !== 'idle') return;
    setNudging(true);
    clearTimeout(run.nudgeTimer);
    run.nudgeTimer = window.setTimeout(() => setNudging(false), 1800);
    setSay(`${nudgeText(machine)} Tap Insert, then turn the crank.`);
    haptic('light');
    if (prefersReducedMotion()) return;
    refs.slot.current?.animate(
      [
        { transform: 'rotate(0deg) scale(1)' },
        { transform: 'rotate(-10deg) scale(1.1)' },
        { transform: 'rotate(8deg) scale(1.1)' },
        { transform: 'rotate(-4deg) scale(1.04)' },
        { transform: 'rotate(0deg) scale(1)' },
      ],
      { duration: 520, easing: 'ease-out' },
    );
    refs.insertButton.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], {
      duration: 380,
      delay: 120,
      easing: 'cubic-bezier(.34,1.56,.64,1)',
    });
  };

  /* ---------------- crank ---------------- */

  const autoTurn = () => {
    if (run.autoTurning || run.completing) return;
    run.autoTurning = true;
    setPhase('turning');
    const from = crank.progress();
    const remaining = TURN_TARGET - from;
    const duration = prefersReducedMotion() ? 420 : 380 + remaining * 3.2;
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

  /** Spin the handle the last bit round to a full turn (back to its resting angle). */
  const finishTurn = (dir: 1 | -1, reduced: boolean) =>
    new Promise<void>((resolve) => {
      if (reduced) {
        setCrankAngle(CRANK_REST);
        resolve();
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 200);
        setCrankAngle(CRANK_REST + dir * (TURN_TARGET + (360 - TURN_TARGET) * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });

  /* ---------------- ka-chunk → drop ---------------- */

  const complete = async (dir: 1 | -1) => {
    if (run.completing) return;
    run.completing = true;
    setPhase('dropping');
    const reduced = prefersReducedMotion();
    sfx.play('ratchet', { pitch: 0.55, volume: 1 });
    haptic('medium');
    jolt(refs.stage.current, 'chunk', reduced);
    void finishTurn(dir, reduced);

    // The result is decided now, at the drop.
    const outcome = pull(machine.id, payment === 'ticket' ? { useTicket: true } : {});
    if (!outcome.ok) {
      const n = pullErrorNotice(outcome.error, machine);
      setNotice(n);
      setSay(`Your ${payment === 'ticket' ? 'ticket' : machine.currency === 'stars' ? 'star' : 'coin'} popped back out. ${n.text}`);
      sfx.play('undo');
      resetMachine();
      return;
    }

    // A colored capsule near the exit goes before a white one: it's the one you'll open.
    const colors = machine.theme.capsules;
    const body = dome.release((b) => !isWhiteish(colors[b.tint % colors.length]!));
    const pulled = revealFromPull(outcome, capsuleShell(colors, body?.tint ?? 0));
    unopened.set(machine.id, pulled);
    setReveal(pulled);
    setSinking(body);
    dome.stir(0.2, dir * 0.5);
    await wait(reduced ? 0 : 60);
    if (refs.sink.current) await animateSink(refs.sink.current, reduced);
    setSinking(null);
    if (refs.chute.current) await animateChute(refs.chute.current, refs.flap.current, reduced);
    if (refs.out.current) {
      await animateDrop(refs.out.current, reduced, (strength) => {
        sfx.play('thunk', { volume: strength });
        haptic(strength > 0.5 ? 'light' : 'tick');
      });
    }
    setPhase('landed');
    phaseNow.current = 'landed';
    setSay('A capsule rolled out!');
    await wait(reduced ? 250 : 520);
    openReveal();
  };

  /** Lift the landed capsule into the reveal (after a beat, or right away if it's tapped). */
  const openReveal = () => {
    if (phaseNow.current !== 'landed') return;
    phaseNow.current = 'revealing';
    setOrigin(refs.out.current?.getBoundingClientRect() ?? null);
    setPhase('revealing');
  };

  const resetMachine = () => {
    for (const a of refs.out.current?.getAnimations?.() ?? []) a.cancel();
    for (const a of refs.coin.current?.getAnimations?.() ?? []) a.cancel();
    crank.reset();
    run.progress = 0;
    run.completing = false;
    run.autoTurning = false;
    setCrankAngle(CRANK_REST);
    phaseNow.current = 'idle';
    setPhase('idle');
  };

  /* ---------------- reveal ---------------- */

  /** Close the reveal; `again` goes straight into the next pull, paid as the button said. */
  const closeReveal = (again?: Payment) => {
    unopened.delete(machine.id);
    setReveal(null);
    setOrigin(null);
    resetMachine();
    // A fresh capsule tumbles in to take its place.
    setTimeout(() => dome.refill(), 260);
    // Straight into the next coin, so the carousel never unlocks in between.
    if (again) void insert(again);
    else run.refocus = true;
  };

  const again = phase === 'revealing' ? nextPayment(payment, machineStatus(machine.id).canAfford, state.value.wallet.tickets) : null;

  // Hide the rolled-out capsule once the overlay has lifted it away; move focus with the flow.
  useEffect(() => {
    if (phase === 'revealing') for (const a of refs.out.current?.getAnimations?.() ?? []) a.cancel();
    if (phase === 'ready') refs.crankButton.current?.focus({ preventScroll: true });
    if (phase === 'idle' && run.refocus) {
      run.refocus = false;
      refs.insertButton.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  useEffect(() => () => clearTimeout(run.nudgeTimer), []);

  // Space turns the crank (DESIGN §11.1) when nothing else wants the key.
  useEffect(() => {
    if (!active || !turnable) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== ' ' || e.repeat || t?.closest('button, a, input, textarea, select, [contenteditable]')) return;
      // Not while a sheet or dialog is open over the machine.
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      autoTurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, turnable]);

  return { phase, turnable, payment, notice, say, nudging, reveal, sinking, origin, again, dome, crank, refs, insert, openReveal, closeReveal };
}

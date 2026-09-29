import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import type { DomeBody } from '@/fx/physics';
import type { PullError } from '@/state/api';
import { machineStatus, pull, state } from '@/state/store';
import { MachineArt } from '@/art/machines/MachineArt';
import { DomeCapsules, capsuleTransforms } from '@/art/machines/DomeCapsules';
import { CapsuleShell } from '@/art/machines/CapsuleArt';
import { CRANK, CRANK_HIT_R, CRANK_REST, OUT_CAPSULE_R, REST, SLOT, VIEW_H, VIEW_W } from '@/art/machines/geometry';
import { CoinIcon, StarIcon, TicketIcon } from '@/art/icons';
import { sfx } from '@/fx/sound';
import { haptic } from '@/fx/haptics';
import { CandyButton, cx } from './ui/CandyButton';
import { useDome } from './useDome';
import { TICK_DEG, TURN_TARGET, useCrank } from './useCrank';
import { animateCoin, animateDrop, animateSink } from './choreography';
import { machineCandy, pullErrorNotice, type FriendlyNotice } from './copy';
import { prefersReducedMotion, wait } from './motion';
import { revealFromPull, type RevealData } from './reveal';
import { RevealOverlay } from './RevealOverlay';
import { Token, type TokenKind } from './Token';
import s from './CapsuleMachine.module.css';

type Phase = 'idle' | 'inserting' | 'ready' | 'turning' | 'dropping' | 'landed' | 'revealing';
type Payment = 'price' | 'ticket';

export interface CapsuleMachineProps {
  machine: MachineDef;
  /** Only the machine on screen runs physics and takes input; neighbors render at rest. */
  active: boolean;
  /** Tells the carousel to hold still while a pull is in progress. */
  onBusyChange?: (busy: boolean) => void;
}

/** Percent box over the machine art, in view-box units. */
function box(cx: number, cy: number, r: number) {
  return {
    left: `${((cx - r) / VIEW_W) * 100}%`,
    top: `${((cy - r) / VIEW_H) * 100}%`,
    width: `${((2 * r) / VIEW_W) * 100}%`,
    height: `${((2 * r) / VIEW_H) * 100}%`,
  };
}

/**
 * The signature moment (DESIGN §9.3): insert → turn the crank → ka-chunk → a capsule
 * drops, rolls out and bounces → reveal. The result is decided only when the crank completes.
 */
export function CapsuleMachine({ machine, active, onBusyChange }: CapsuleMachineProps) {
  const app = state.value;
  const tickets = app.wallet.tickets;
  const uid = `cm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const dome = useDome(machine, active);

  const [phase, setPhase] = useState<Phase>('idle');
  const [payment, setPayment] = useState<Payment>('price');
  const [notice, setNotice] = useState<FriendlyNotice | null>(null);
  const [say, setSay] = useState('');
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [sinking, setSinking] = useState<DomeBody | null>(null);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  // Async choreography reads the live phase, not the one captured when it started.
  const phaseNow = useRef(phase);
  phaseNow.current = phase;

  const crankEl = useRef<SVGGElement>(null);
  const flapEl = useRef<SVGGElement>(null);
  const coinEl = useRef<SVGGElement>(null);
  const outEl = useRef<SVGGElement>(null);
  const sinkEl = useRef<SVGGElement>(null);
  const crankButton = useRef<HTMLButtonElement>(null);
  const insertButton = useRef<HTMLButtonElement>(null);
  const run = useRef({ ticks: 0, completing: false, autoTurning: false, refocus: false, anims: [] as Animation[] }).current;

  const token: TokenKind = payment === 'ticket' ? 'ticket' : machine.currency === 'stars' ? 'star' : 'coin';
  const busy = phase !== 'idle';
  const turnable = phase === 'ready' || phase === 'turning';

  useEffect(() => onBusyChange?.(busy), [busy]);

  const setCrankAngle = (deg: number) => crankEl.current?.setAttribute('transform', `rotate(${deg.toFixed(1)})`);

  const crank = useCrank(turnable, {
    onGrab: () => setPhase('turning'),
    onAdvance: (progress, delta, dir) => {
      setCrankAngle(CRANK_REST + dir * progress);
      // The wheel inside stirs the pile in proportion to how fast you turn.
      dome.stir(Math.min(0.5, (delta / 360) * 2.4), dir * 0.8);
      const ticks = Math.floor(progress / TICK_DEG);
      if (ticks > run.ticks) {
        run.ticks = ticks;
        sfx.play('ratchet', { pitch: 1 + ticks * 0.035 });
        haptic('tick');
        dome.stir(0.1, dir);
      }
      if (progress >= TURN_TARGET) void complete(dir);
    },
    onAutoTurn: () => autoTurn(),
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
      return;
    }
    setNotice(null);
    setPayment(pay);
    setPhase('inserting');
    await wait(0);
    const reduced = prefersReducedMotion();
    if (coinEl.current) {
      await animateCoin(coinEl.current, reduced, () => {
        sfx.play('coin');
        haptic('light');
      });
    }
    setPhase('ready');
    setSay('In it goes! Now turn the crank: drag it around, or press it.');
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
    let done = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const target = eased * remaining;
      crank.advanceBy(target - done);
      done = target;
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
    void finishTurn(dir, reduced);

    // The result is decided now, at the drop.
    const outcome = pull(machine.id, payment === 'ticket' ? { useTicket: true } : {});
    if (!outcome.ok) {
      const n = pullErrorNotice(outcome.error, machine);
      setNotice(n);
      setSay(`Your ${token} popped back out. ${n.text}`);
      sfx.play('undo');
      resetMachine();
      return;
    }

    const body = dome.release();
    const colors = machine.theme.capsules;
    const tint = body?.tint ?? 0;
    const shell = { color: colors[tint % colors.length]!, color2: colors[(tint + 2) % colors.length]! };
    setReveal(revealFromPull(outcome, shell));
    setSinking(body);
    dome.stir(0.2, dir * 0.5);
    await wait(reduced ? 0 : 60);
    if (sinkEl.current) await animateSink(sinkEl.current, reduced);
    setSinking(null);

    if (outEl.current) {
      const anim = animateDrop(outEl.current, flapEl.current, reduced, (strength) => {
        sfx.play('thunk', { volume: strength });
        haptic(strength > 0.5 ? 'light' : 'tick');
      });
      await anim;
    }
    setPhase('landed');
    setSay('A capsule rolled out!');
    await wait(reduced ? 250 : 520);
    setOrigin(outEl.current?.getBoundingClientRect() ?? null);
    setPhase('revealing');
  };

  const resetMachine = () => {
    for (const a of outEl.current?.getAnimations?.() ?? []) a.cancel();
    for (const a of coinEl.current?.getAnimations?.() ?? []) a.cancel();
    crank.reset();
    run.ticks = 0;
    run.completing = false;
    run.autoTurning = false;
    setCrankAngle(CRANK_REST);
    setPhase('idle');
  };

  /* ---------------- reveal ---------------- */

  const closeReveal = (again?: boolean) => {
    const pay = payment;
    setReveal(null);
    setOrigin(null);
    run.refocus = !again;
    resetMachine();
    // A fresh capsule tumbles in to take its place.
    setTimeout(() => dome.refill(), 260);
    if (again) setTimeout(() => void insertAgain(pay), 420);
  };

  const insertAgain = (pay: Payment) => insert(pay === 'ticket' && state.value.wallet.tickets > 0 ? 'ticket' : 'price');

  const canPullAgain = (payment === 'ticket' && tickets > 0) || machineStatus(machine.id).canAfford;

  // Hide the rolled-out capsule once the overlay has lifted it away.
  useEffect(() => {
    if (phase === 'revealing') for (const a of outEl.current?.getAnimations?.() ?? []) a.cancel();
    if (phase === 'ready') crankButton.current?.focus({ preventScroll: true });
    if (phase === 'idle' && run.refocus) {
      run.refocus = false;
      insertButton.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  // Space turns the crank (DESIGN §11.1) when nothing else wants the key.
  useEffect(() => {
    if (!active || !turnable) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== ' ' || e.repeat || t?.closest('button, a, input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      autoTurn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, turnable]);

  /* ---------------- render ---------------- */

  const colors = machine.theme.capsules;
  const domeLayer = (
    <g>
      <DomeCapsules uid={uid} colors={colors} bodies={dome.bodies} register={active ? dome.register : undefined} />
      {sinking && (
        <g ref={sinkEl}>
          <g transform={capsuleTransforms(sinking).root}>
            <use href={`#${uid}-shell-${sinking.tint % colors.length}`} transform={capsuleTransforms(sinking).shell} />
            <use href={`#${uid}-shine`} />
          </g>
        </g>
      )}
    </g>
  );

  const candy = machineCandy(machine);
  const priceIcon = machine.currency === 'stars' ? <StarIcon size={22} /> : <CoinIcon size={22} />;

  return (
    <div class={s.machine} style={{ '--halo': machine.theme.trim } as Record<string, string>}>
      <div class={s.stage}>
        <MachineArt
          machine={machine}
          class={cx(s.art, turnable && 'is-ready')}
          dome={domeLayer}
          crankRef={crankEl}
          flapRef={flapEl}
          title={`${machine.name} capsule machine`}
        >
          <g ref={coinEl} class={s.token} style={{ opacity: 0 }}>
            <Token kind={token} />
          </g>
          <g ref={outEl} class={s.out} style={{ opacity: 0 }}>
            <g class={cx(phase === 'landed' && s.bob)}>
              <g transform={`scale(${OUT_CAPSULE_R / 40})`}>
                {reveal && (
                  <CapsuleShell rarity={reveal.rarity} color={reveal.shell.color} color2={reveal.shell.color2} stroke={6.2} animated={phase === 'landed'} />
                )}
              </g>
            </g>
          </g>
        </MachineArt>

        {active && phase === 'idle' && (
          <button
            type="button"
            class={s.hit}
            style={box(SLOT.cx, SLOT.cy, 26)}
            onClick={() => void insert('price')}
            aria-label={`Insert ${machine.price} ${machine.currency}`}
            tabIndex={-1}
          />
        )}
        {active && (
          <button
            ref={crankButton}
            type="button"
            class={cx(s.hit, s.crank, turnable && s.crankLive)}
            style={box(CRANK.cx, CRANK.cy, CRANK_HIT_R)}
            aria-label="Turn the crank"
            aria-describedby={`${uid}-crank-hint`}
            aria-disabled={!turnable}
            tabIndex={turnable ? 0 : -1}
            {...crank.handlers}
          />
        )}
        {active && phase === 'landed' && (
          <button type="button" class={s.hit} style={box(REST.x, REST.y, 26)} onClick={() => setPhase('revealing')} aria-label="Open your capsule" />
        )}
        {phase === 'ready' && (
          <div class={s.bubble} aria-hidden="true">
            Turn me!
          </div>
        )}
      </div>

      <div class={s.controls}>
        {phase === 'idle' ? (
          <div class={s.buttons}>
            <CandyButton buttonRef={insertButton} size="lg" colors={candy} onClick={() => void insert('price')} disabled={!active}>
              Insert {priceIcon}
              <span class="num">{machine.price}</span>
            </CandyButton>
            {tickets > 0 && (
              <CandyButton variant="soft" onClick={() => void insert('ticket')} disabled={!active}>
                <TicketIcon size={20} /> Use a ticket
              </CandyButton>
            )}
          </div>
        ) : (
          <p id={`${uid}-crank-hint`} class={s.hint}>
            {phase === 'inserting' || turnable ? 'Drag the crank around, or just tap it' : 'Here it comes…'}
          </p>
        )}
        {phase === 'idle' && (
          <span id={`${uid}-crank-hint`} class="sr-only">
            Insert first, then drag the crank in a circle or press it.
          </span>
        )}
        {notice && phase === 'idle' && (
          <p class={s.notice} role="note">
            {notice.text}
            {notice.link && (
              <>
                {' '}
                <a href={notice.link.href}>{notice.link.label}</a>
              </>
            )}
          </p>
        )}
      </div>

      <p class="sr-only" role="status" aria-live="polite">
        {say}
      </p>

      {phase === 'revealing' && reveal && (
        <RevealOverlay
          data={reveal}
          origin={origin}
          quickOpen={app.settings.quickOpen}
          onClose={() => closeReveal()}
          onPullAgain={canPullAgain ? () => closeReveal(true) : undefined}
        />
      )}
    </div>
  );
}

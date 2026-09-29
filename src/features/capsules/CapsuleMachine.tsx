import { useEffect, useId, useRef } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import { state } from '@/state/store';
import { MachineArt } from '@/art/machines/MachineArt';
import { DomeCapsules, capsuleTransforms } from '@/art/machines/DomeCapsules';
import { CapsuleShell } from '@/art/machines/CapsuleArt';
import { OUT_CAPSULE_R, REST, SLOT } from '@/art/machines/geometry';
import { startIdleLife } from '@/art/machines/idleLife';
import { CoinIcon, StarIcon, TicketIcon } from '@/art/icons';
import { CandyButton, cx } from './ui/CandyButton';
import { CrankHitArea, hitBox } from './HitAreas';
import { usePull } from './usePull';
import { currencyWord, machineCandy, nudgeText } from './copy';
import { prefersReducedMotion } from './motion';
import type { RevealData } from './reveal';
import { RevealOverlay } from './RevealOverlay';
import { Token } from './Token';
import s from './CapsuleMachine.module.css';

export interface CapsuleMachineProps {
  machine: MachineDef;
  /** Only the machine on screen runs physics, idle life and input; neighbors render at rest. */
  active: boolean;
  /** Tells the carousel to hold still while a pull is in progress. */
  onBusyChange?: (busy: boolean) => void;
}

/** The capsule that came out, drawn at machine scale (it's animated by its wrapper). */
function OutCapsule({ data, animated }: { data: RevealData | null; animated?: boolean }) {
  if (!data) return null;
  return (
    <g transform={`scale(${OUT_CAPSULE_R / 40})`}>
      <CapsuleShell rarity={data.rarity} color={data.shell.color} color2={data.shell.color2} stroke={6.2} animated={animated} />
    </g>
  );
}

/**
 * The signature moment (DESIGN §9.3): insert → turn the crank → ka-chunk → a capsule
 * drops down the chute, rolls out and bounces → reveal. See usePull for the flow.
 */
export function CapsuleMachine({ machine, active, onBusyChange }: CapsuleMachineProps) {
  const app = state.value;
  const tickets = app.wallet.tickets;
  const uid = `cm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const p = usePull(machine, active);
  const { phase, turnable, reveal, refs } = p;
  const busy = phase !== 'idle';

  useEffect(() => onBusyChange?.(busy), [busy]);

  // Now and then a blink or a tail flick, only on the machine you're looking at, at rest.
  useEffect(() => {
    if (!active || busy || !svg.current) return;
    return startIdleLife(svg.current, { enabled: () => !prefersReducedMotion() });
  }, [active, busy]);

  const colors = machine.theme.capsules;
  const domeLayer = (
    <g>
      <DomeCapsules uid={uid} colors={colors} bodies={p.dome.bodies} register={active ? p.dome.register : undefined} />
      {p.sinking && (
        <g ref={refs.sink}>
          <g transform={capsuleTransforms(p.sinking).root}>
            <use href={`#${uid}-shell-${p.sinking.tint % colors.length}`} transform={capsuleTransforms(p.sinking).shell} />
            <use href={`#${uid}-shine`} />
          </g>
        </g>
      )}
    </g>
  );

  const hintId = `${uid}-crank-hint`;
  const candy = machineCandy(machine);
  const priceIcon = machine.currency === 'stars' ? <StarIcon size={22} /> : <CoinIcon size={22} />;
  const token = p.payment === 'ticket' ? 'ticket' : machine.currency === 'stars' ? 'star' : 'coin';

  return (
    <div class={s.machine} style={{ '--halo': machine.theme.trim } as Record<string, string>}>
      <div ref={refs.stage} class={s.stage}>
        <MachineArt
          machine={machine}
          class={cx(s.art, turnable && 'is-ready')}
          dome={domeLayer}
          svgRef={svg}
          crankRef={refs.crank}
          slotRef={refs.slot}
          flapRef={refs.flap}
          title={`${machine.name} capsule machine`}
          chute={
            <g ref={refs.chute} style={{ opacity: 0 }}>
              <OutCapsule data={reveal} />
            </g>
          }
        >
          <g ref={refs.coin} class={s.token} style={{ opacity: 0 }}>
            <Token kind={token} />
          </g>
          <g ref={refs.out} class={s.out} style={{ opacity: 0 }}>
            <g class={cx(phase === 'landed' && s.bob)}>
              <OutCapsule data={reveal} animated={phase === 'landed'} />
            </g>
          </g>
        </MachineArt>

        {active && phase === 'idle' && (
          <button
            type="button"
            class={s.hit}
            style={hitBox(SLOT.cx, SLOT.cy, 26)}
            onClick={() => void p.insert('price')}
            aria-label={`Insert ${machine.price} ${currencyWord(machine)}`}
            tabIndex={-1}
          />
        )}
        {active && <CrankHitArea live={turnable} handlers={p.crank.handlers} buttonRef={refs.crankButton} hintId={hintId} />}
        {active && phase === 'landed' && (
          <button type="button" class={s.hit} style={hitBox(REST.x, REST.y, 26)} onClick={p.openReveal} aria-label="Open your capsule" />
        )}
        {phase === 'ready' && (
          <div class={s.bubble} aria-hidden="true">
            Turn me!
          </div>
        )}
        {p.nudging && phase === 'idle' && (
          <div class={cx(s.bubble, s.bubbleSlot)} aria-hidden="true">
            {nudgeText(machine, true)}
          </div>
        )}
      </div>

      <div class={s.controls}>
        {phase === 'idle' ? (
          <div class={s.buttons}>
            <CandyButton buttonRef={refs.insertButton} size="lg" colors={candy} onClick={() => void p.insert('price')} disabled={!active}>
              Insert {priceIcon}
              <span class="num">{machine.price}</span>
              <span class="sr-only"> {currencyWord(machine)}</span>
            </CandyButton>
            {tickets > 0 && (
              <CandyButton variant="soft" onClick={() => void p.insert('ticket')} disabled={!active}>
                <TicketIcon size={20} /> Use a ticket
              </CandyButton>
            )}
          </div>
        ) : (
          <p id={hintId} class={s.hint}>
            {phase === 'inserting' || turnable ? 'Drag the crank around, or just tap it' : 'Here it comes…'}
          </p>
        )}
        {phase === 'idle' && (
          <span id={hintId} class="sr-only">
            Insert first, then drag the crank in a circle or press it.
          </span>
        )}
        {p.notice && phase === 'idle' && (
          <p class={s.notice} role="note">
            {p.notice.text}
            {p.notice.link && (
              <>
                {' '}
                <a href={p.notice.link.href}>{p.notice.link.label}</a>
              </>
            )}
          </p>
        )}
      </div>

      <p class="sr-only" role="status" aria-live="polite">
        {p.say}
      </p>

      {phase === 'revealing' && reveal && (
        <RevealOverlay
          data={reveal}
          origin={p.origin}
          quickOpen={app.settings.quickOpen}
          onClose={() => p.closeReveal()}
          pullAgain={p.again ? { pay: p.again, machine, onPull: () => p.closeReveal(p.again ?? undefined) } : undefined}
        />
      )}
    </div>
  );
}

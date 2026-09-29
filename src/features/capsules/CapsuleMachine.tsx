import { useEffect, useId } from 'preact/hooks';
import type { MachineDef } from '@/catalog/types';
import type { Light } from '@/art/light';
import { state } from '@/state/store';
import { CabinetArt } from '@/art/machines/CabinetArt';
import { WindowCapsules, capsuleTransforms } from '@/art/machines/WindowCapsules';
import { CAPSULE_R, CHUTE_CAPSULE_R, CHUTE_REST, SLOT } from '@/art/machines/geometry';
import { lighting } from '@/art/machines/lighting';
import { pillFace } from '@/art/machines/theme';
import { CoinIcon, StarIcon, TicketIcon } from '@/art/icons';
import { PillButton, cx } from './ui/CandyButton';
import { HandleControl, hitBox } from './HitAreas';
import { usePull, type PullOptions } from './usePull';
import { currencyWord, nudgeText } from './copy';
import { RevealOverlay, type PlaceHandlers } from './RevealOverlay';
import { useSceneLight } from './sceneLight';
import { Token } from './Token';
import s from './CapsuleMachine.module.css';

export interface CapsuleMachineProps extends PlaceHandlers {
  machine: MachineDef;
  /** Only the cabinet on screen runs physics and takes input; its neighbours render at rest. */
  active: boolean;
  /** Tells the carousel to hold still while a pull is in progress. */
  onBusyChange?: (busy: boolean) => void;
  /** The scene's light; defaults to the lamp at night and the real window by day. */
  light?: Light;
  /** The first capsule, on the house (onboarding). */
  free?: PullOptions['free'];
  /** Called once a reveal closes (e.g. onboarding moves on). */
  onRevealClosed?: () => void;
  /** Stands in for the store's pull (the dev gallery). */
  pullWith?: PullOptions['pull'];
}

/**
 * The signature moment (DESIGN §7.2): the token into the slot → turn the handle → ka-chunk →
 * a capsule sinks out of the window and drops into the chute → take it out and open it. See
 * usePull for the flow.
 */
export function CapsuleMachine({
  machine,
  active,
  onBusyChange,
  light: lightProp,
  free,
  onRevealClosed,
  onPlace,
  onLetThemChoose,
  pullWith,
}: CapsuleMachineProps) {
  const app = state.value;
  const tickets = app.wallet.tickets;
  const uid = `cm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sceneLight = useSceneLight();
  const light = lightProp ?? sceneLight;
  const L = lighting(light);
  const p = usePull(machine, active, { free, pull: pullWith });
  const { phase, turnable, reveal, refs } = p;
  const busy = phase !== 'idle';

  useEffect(() => onBusyChange?.(busy), [busy]);

  const colors = machine.theme.capsules;
  const capsule = (tint: number) => (
    <>
      <use href={`#${uid}-shell-${tint % colors.length}`} />
      <use href={`#${uid}-shade`} />
      <use href={`#${uid}-glint`} />
    </>
  );
  const windowLayer = (
    <g>
      <WindowCapsules uid={uid} colors={colors} bodies={p.dome.bodies} lighting={L} register={active ? p.dome.register : undefined} />
      {p.sinking && (
        <g ref={refs.sink}>
          <g transform={capsuleTransforms(p.sinking).root}>
            <use href={`#${uid}-shell-${p.sinking.tint % colors.length}`} transform={capsuleTransforms(p.sinking).shell} />
            <use href={`#${uid}-shade`} />
            <use href={`#${uid}-glint`} />
          </g>
        </g>
      )}
    </g>
  );

  const hintId = `${uid}-handle-hint`;
  const priceIcon = machine.currency === 'stars' ? <StarIcon size={20} /> : <CoinIcon size={20} />;
  const hint =
    phase === 'inserting' || turnable
      ? 'Drag the handle round, or tap it'
      : phase === 'waiting'
        ? 'In the chute. Tap it to take it out'
        : phase === 'dropping'
          ? 'Here it comes'
          : '';

  return (
    <div class={s.machine}>
      <div ref={refs.stage} class={s.stage}>
        <CabinetArt
          machine={machine}
          light={light}
          class={cx(s.art, turnable && 'is-ready')}
          capsules={windowLayer}
          handleRef={refs.handle}
          handleShadowRef={refs.handleShadow}
          slotRef={refs.slot}
          flapRef={refs.flap}
          title={`${machine.number ? `${machine.number}, ` : ''}${machine.name} capsule cabinet`}
          chute={
            <g ref={refs.chute} style={{ opacity: 0 }}>
              <g transform={`scale(${(CHUTE_CAPSULE_R / CAPSULE_R).toFixed(3)})`}>{capsule(p.chuteTint)}</g>
            </g>
          }
        >
          <g ref={refs.coin} class={s.token} style={{ opacity: 0 }}>
            <Token kind={p.token} />
          </g>
        </CabinetArt>

        {active && phase === 'idle' && (
          <button
            type="button"
            class={s.hit}
            style={hitBox(SLOT.cx, SLOT.cy, 26)}
            onClick={() => void p.insert(free ? 'free' : 'price')}
            aria-label={free ? 'Insert the first coin' : `Insert ${machine.price} ${currencyWord(machine)}`}
            tabIndex={-1}
          />
        )}
        {active && <HandleControl live={turnable} percent={0} handlers={p.crank.handlers} buttonRef={refs.handleControl} hintId={hintId} />}
        {active && phase === 'waiting' && (
          <button
            type="button"
            class={s.hit}
            style={hitBox(CHUTE_REST.x, CHUTE_REST.y, 26)}
            onClick={p.openReveal}
            aria-label="Take the capsule out of the chute"
          />
        )}
        {p.nudging && phase === 'idle' && (
          <p class={s.note} aria-hidden="true">
            {nudgeText(machine, true)}
          </p>
        )}
      </div>

      <div class={s.controls}>
        {phase === 'idle' ? (
          <div class={s.buttons}>
            <PillButton
              buttonRef={refs.insertButton}
              size="lg"
              colors={{ face: pillFace(machine), ink: '#3B3236' }}
              onClick={() => void p.insert(free ? 'free' : 'price')}
              disabled={!active}
            >
              {free ? (
                <>
                  <CoinIcon size={20} /> Insert the first coin
                </>
              ) : (
                <>
                  Insert {priceIcon}
                  <span class="num">{machine.price}</span>
                  <span class="sr-only"> {currencyWord(machine)}</span>
                </>
              )}
            </PillButton>
            {!free && tickets > 0 && (
              <PillButton variant="secondary" onClick={() => void p.insert('ticket')} disabled={!active}>
                <TicketIcon size={20} /> Use a ticket
              </PillButton>
            )}
          </div>
        ) : (
          <p id={hintId} class={s.hint}>
            {hint}
          </p>
        )}
        {phase === 'idle' && (
          <span id={hintId} class="sr-only">
            Insert first, then turn the handle: drag it round, press it, or use the arrow keys.
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
          light={light}
          onClose={() => {
            p.closeReveal();
            onRevealClosed?.();
          }}
          onPlace={onPlace}
          onLetThemChoose={onLetThemChoose}
          pullAgain={p.again ? { pay: p.again, machine, onPull: () => p.closeReveal(p.again ?? undefined) } : undefined}
        />
      )}
    </div>
  );
}

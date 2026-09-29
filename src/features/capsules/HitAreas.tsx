import type { JSX, Ref } from 'preact';
import { CRANK, CRANK_HIT_R, VIEW_H, VIEW_W } from '@/art/machines/geometry';
import { cx } from './ui/CandyButton';
import s from './CapsuleMachine.module.css';

/** A percent box over the machine art, from a circle in view-box units. */
export function hitBox(x: number, y: number, r: number): JSX.CSSProperties {
  return {
    left: `${((x - r) / VIEW_W) * 100}%`,
    top: `${((y - r) / VIEW_H) * 100}%`,
    width: `${((2 * r) / VIEW_W) * 100}%`,
    height: `${((2 * r) / VIEW_H) * 100}%`,
  };
}

type CrankHandlers = Pick<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick'>;

export interface CrankHitAreaProps {
  /** Paid for and ready to turn. */
  live: boolean;
  handlers: CrankHandlers;
  buttonRef: Ref<HTMLButtonElement>;
  /** Id of the text that explains how to turn it. */
  hintId: string;
}

/**
 * The crank's invisible touch target (much larger than 44px at every machine size): drag it
 * round, tap it, or press Enter/Space on it. Before paying, a tap nudges you toward the slot.
 */
export function CrankHitArea({ live, handlers, buttonRef, hintId }: CrankHitAreaProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      class={cx(s.hit, s.crank, live && s.crankLive)}
      style={hitBox(CRANK.cx, CRANK.cy, CRANK_HIT_R)}
      aria-label="Turn the crank"
      aria-describedby={hintId}
      aria-disabled={!live}
      tabIndex={live ? 0 : -1}
      {...handlers}
    />
  );
}

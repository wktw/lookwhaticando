import type { JSX, Ref } from 'preact';
import { HANDLE, HANDLE_HIT_R, VIEW_H, VIEW_W } from '@/art/machines/geometry';
import { cx } from '@/ui/cx';
import s from './CapsuleMachine.module.css';

/** A percent box over the cabinet art, from a circle in view-box units. */
export function hitBox(x: number, y: number, r: number): JSX.CSSProperties {
  return {
    left: `${((x - r) / VIEW_W) * 100}%`,
    top: `${((y - r) / VIEW_H) * 100}%`,
    width: `${((2 * r) / VIEW_W) * 100}%`,
    height: `${((2 * r) / VIEW_H) * 100}%`,
  };
}

export type HandleHandlers = Pick<
  JSX.HTMLAttributes<HTMLElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick' | 'onKeyDown'
>;

export interface HandleControlProps {
  /** Paid for and ready to turn. */
  live: boolean;
  /** 0..100: how far round the handle is (for the slider value). */
  percent: number;
  handlers: HandleHandlers;
  buttonRef: Ref<HTMLDivElement>;
  /** Id of the text that explains how to turn it. */
  hintId: string;
}

/**
 * The handle's control, laid over the drawing: a slider (much larger than 44 px at every
 * cabinet size). Drag it round, tap it, press Enter or Space for a whole turn, or step it round
 * with the arrow keys. Before paying, a tap points at the slot.
 */
export function HandleControl({ live, percent, handlers, buttonRef, hintId }: HandleControlProps) {
  return (
    <div
      ref={buttonRef}
      role="slider"
      class={cx(s.hit, s.handle, live && s.handleLive)}
      style={hitBox(HANDLE.cx, HANDLE.cy, HANDLE_HIT_R)}
      aria-label="Turn the handle"
      aria-describedby={hintId}
      aria-disabled={!live}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={percent >= 100 ? 'One full turn' : `${Math.round(percent)}% of a turn`}
      tabIndex={live ? 0 : -1}
      {...handlers}
    />
  );
}

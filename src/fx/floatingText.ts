/** "+5" chips that pop up from where something happened and drift away. */
import { h, render } from 'preact';
import { CoinIcon, StarIcon } from '@/art/icons';
import { fxLayer, toPoint, type Point } from './layer';
import { prefersReducedMotion } from './motion';

export type FloatTone = 'coin' | 'star' | 'heart' | 'sage' | 'ink';

export interface FloatTextOptions {
  /** Color family of the chip (default 'coin'). */
  tone?: FloatTone;
  /** Show the currency icon before the text (coin/star tones). */
  icon?: boolean;
  /** Extra upward drift in px (default 54). */
  rise?: number;
}

export function floatText(text: string, at: DOMRect | Point, { tone = 'coin', icon = tone === 'coin' || tone === 'star', rise = 54 }: FloatTextOptions = {}): void {
  if (typeof document === 'undefined') return;
  const p = toPoint(at);
  const el = document.createElement('div');
  el.className = 'mm-fx-float';
  el.dataset.tone = tone;
  if (icon && (tone === 'coin' || tone === 'star')) {
    const holder = document.createElement('span');
    render(h(tone === 'coin' ? CoinIcon : StarIcon, { size: 18 }), holder);
    el.appendChild(holder.firstChild ?? holder);
  }
  el.appendChild(document.createTextNode(text));
  fxLayer().appendChild(el);

  // Center on the point: measure once, then animate transforms only.
  const w = el.offsetWidth;
  const x = p.x - w / 2;
  const y = p.y - 15;
  const at0 = `translate(${x}px, ${y}px)`;
  const keyframes: Keyframe[] = prefersReducedMotion()
    ? [
        { transform: at0, opacity: 0 },
        { transform: at0, opacity: 1, offset: 0.2 },
        { transform: at0, opacity: 1, offset: 0.75 },
        { transform: at0, opacity: 0 },
      ]
    : [
        { transform: `${at0} scale(0.5)`, opacity: 0 },
        { transform: `translate(${x}px, ${y - rise * 0.45}px) scale(1.12)`, opacity: 1, offset: 0.22, easing: 'cubic-bezier(.22,1,.36,1)' },
        { transform: `translate(${x}px, ${y - rise * 0.8}px) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${x}px, ${y - rise}px) scale(0.92)`, opacity: 0 },
      ];
  el.animate(keyframes, { duration: 950, easing: 'linear', fill: 'both' })
    .finished.catch(() => undefined)
    .then(() => el.remove());
}

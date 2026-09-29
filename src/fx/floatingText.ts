/** "+5" chips: a small paper note with a currency token, rising a little from where it happened. */
import { h, render } from 'preact';
import { CoinIcon, StampIcon } from '@/art/icons';
import { fxLayer, toPoint, type Point } from './layer';
import { prefersReducedMotion } from './motion';

/** coin / star: with that currency token · plain: text only. Older tones (heart, sage, ink) read as plain. */
export type FloatTone = 'coin' | 'star' | 'plain' | 'heart' | 'sage' | 'ink';

export interface FloatTextOptions {
  tone?: FloatTone;
  /** Show the currency token before the text (coin/star tones). */
  icon?: boolean;
  /** Upward drift in px (default 34). */
  rise?: number;
}

export function floatText(text: string, at: DOMRect | Point, { tone = 'coin', icon = tone === 'coin' || tone === 'star', rise = 34 }: FloatTextOptions = {}): void {
  if (typeof document === 'undefined') return;
  const p = toPoint(at);
  const el = document.createElement('div');
  el.className = 'ck-fx-float';
  const withIcon = icon && (tone === 'coin' || tone === 'star');
  el.dataset.tone = withIcon ? tone : 'plain';
  if (withIcon) {
    const holder = document.createElement('span');
    render(h(tone === 'coin' ? CoinIcon : StampIcon, { size: 16 }), holder);
    el.appendChild(holder.firstChild ?? holder);
  }
  el.appendChild(document.createTextNode(text));
  fxLayer().appendChild(el);

  // Centre above the point: measure once, then animate transforms only.
  const w = el.offsetWidth;
  const x = p.x - w / 2;
  const y = p.y - 44;
  const at0 = `translate(${x}px, ${y}px)`;
  const keyframes: Keyframe[] = prefersReducedMotion()
    ? [
        { transform: at0, opacity: 0 },
        { transform: at0, opacity: 1, offset: 0.2 },
        { transform: at0, opacity: 1, offset: 0.75 },
        { transform: at0, opacity: 0 },
      ]
    : [
        { transform: `translate(${x}px, ${y + 6}px)`, opacity: 0 },
        { transform: `translate(${x}px, ${y - rise * 0.35}px)`, opacity: 1, offset: 0.2, easing: 'cubic-bezier(.2,.8,.2,1)' },
        { transform: `translate(${x}px, ${y - rise * 0.8}px)`, opacity: 1, offset: 0.72 },
        { transform: `translate(${x}px, ${y - rise}px)`, opacity: 0 },
      ];
  el.animate(keyframes, { duration: 1000, easing: 'linear', fill: 'both' })
    .finished.catch(() => undefined)
    .then(() => el.remove());
}

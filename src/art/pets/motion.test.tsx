// @vitest-environment jsdom
/**
 * DESIGN §10.5: under reduced motion the pets still blink and breathe (≤ 1.5%); everything bigger holds still. The app
 * zeroes every animation not marked `.ck-motion-safe`, so the pet's root (breathing) and its blink groups carry it.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PetArt } from './PetArt';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('pets under reduced motion', () => {
  it('keep breathing and blinking: the live root and the blink groups are motion-safe', () => {
    const style = document.createElement('style');
    style.textContent = read('../../styles/global.css').replace(/@import[^;]+;/g, '') + read('./pet.css');
    document.head.appendChild(style);
    document.documentElement.dataset.motion = 'reduced';
    const host = document.createElement('div');
    document.body.appendChild(host);
    for (const petId of ['pet-cat-calico', 'pet-cow-holstein', 'pet-duck-yellow']) {
      render(<PetArt petId={petId} size={160} animated />, host);
      const svg = host.querySelector('svg')!;
      expect(svg.classList.contains('ck-motion-safe'), petId).toBe(true);
      const blinks = host.querySelectorAll('.pet-blink, .pet-slowblink');
      expect(blinks.length, petId).toBeGreaterThan(0);
      for (const b of blinks) expect(b.classList.contains('ck-motion-safe'), petId).toBe(true);
      // The app's reduce rule (0.01 ms) reaches the pet's other parts but not its breathing or its blinks.
      const zeroed = (el: Element) => getComputedStyle(el).animationDuration === '0.01ms';
      expect(zeroed(svg), `${petId} breathing`).toBe(false);
      for (const b of blinks) expect(zeroed(b), `${petId} blink`).toBe(false);
      expect(zeroed(host.querySelector('path')!), `${petId} a plain part`).toBe(true);
      // A still pet (not animated) is not marked.
      render(<PetArt petId={petId} size={160} />, host);
      expect(host.querySelector('svg')!.classList.contains('ck-motion-safe')).toBe(false);
    }
    render(null, host);
    host.remove();
    style.remove();
    delete document.documentElement.dataset.motion;
  });

  it.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ])('breathe by at most 1.5%, and switch off only the larger motions under reduce (%s)', (_name, newline) => {
    const css = read('./pet.css').replace(/\r?\n/g, newline);
    const start = css.indexOf('@keyframes pet-breathe');
    expect(start, 'breathing keyframes exist').toBeGreaterThanOrEqual(0);
    // A Windows checkout uses CRLF: stop at this rule, before the larger throat pulse.
    const end = css.slice(start).search(/}\r?\n}/);
    expect(end, 'breathing keyframes close').toBeGreaterThan(0);
    const breathe = css.slice(start, start + end);
    const scales = [...breathe.matchAll(/scale\(([\d.]+)(?:,\s*([\d.]+))?\)/g)];
    expect(scales.length, 'breathing scale values are checked').toBeGreaterThan(0);
    for (const m of scales) for (const v of [m[1], m[2]].filter(Boolean)) expect(Math.abs(Number(v) - 1)).toBeLessThanOrEqual(0.015);
    const reducedStart = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(reducedStart, 'reduced-motion overrides exist').toBeGreaterThanOrEqual(0);
    const reduced = css.slice(reducedStart);
    expect(reduced).not.toMatch(/\.pet-blink\b|\.pet-slowblink\b|pet-breathe/);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from 'preact';
import { BADGES } from '@/catalog/badges';
import { BadgeMedal } from '@/art/badges';
import { BADGE_EMBLEMS } from '@/art/badges/emblems';
import { EARNED, LOCKED } from '@/art/badges/palette';

function medal(badgeId: string, earned: boolean, size = 88) {
  const host = document.createElement('div');
  render(<BadgeMedal badgeId={badgeId} earned={earned} size={size} />, host);
  return host.querySelector('svg')!;
}

describe('badge medals', () => {
  it('has a custom emblem for every catalog badge', () => {
    for (const b of BADGES) expect(BADGE_EMBLEMS[b.id], b.id).toBeTypeOf('function');
  });

  it('draws earned medals in color and unearned ones muted', () => {
    for (const b of BADGES) {
      const earned = medal(b.id, true).outerHTML;
      const locked = medal(b.id, false).outerHTML;
      expect(earned, b.id).toContain(EARNED.gold);
      expect(locked, b.id).not.toContain(EARNED.gold);
      expect(locked, b.id).not.toContain(EARNED.ink);
    }
  });

  it('gives each medal instance its own gradient id', () => {
    const host = document.createElement('div');
    render(
      <div>
        <BadgeMedal badgeId="first-ultra" earned />
        <BadgeMedal badgeId="first-ultra" earned />
      </div>,
      host,
    );
    const [a, b] = [...host.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('switches to the compact shelf layout at 64 px and below', () => {
    const scale = (size: number) => /scale\(([\d.]+)\)/.exec(medal('night-owl', true, size).innerHTML)![1];
    expect(Number(scale(48))).toBeGreaterThan(Number(scale(88)));
    expect(scale(64)).toBe(scale(48));
    const host = document.createElement('div');
    render(<BadgeMedal badgeId="night-owl" earned size={48} compact={false} />, host);
    expect(host.querySelector('svg')!.innerHTML).toBe(medal('night-owl', true, 88).innerHTML);
  });

  it('repaints every locked swatch at night (the CSS mirrors LOCKED)', () => {
    const css = readFileSync('src/art/badges/badge.module.css', 'utf8');
    for (const hex of Object.values(LOCKED)) expect(css, hex).toMatch(new RegExp(`\\[(fill|stroke)='${hex}' i\\]`));
  });

  it('still renders a medal for an unknown badge id', () => {
    expect(medal('future-badge', true).querySelectorAll('path').length).toBeGreaterThan(3);
  });
});

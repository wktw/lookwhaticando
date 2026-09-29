// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { BADGES } from '@/catalog/badges';
import { BadgeMedal } from '@/art/badges';
import { BADGE_EMBLEMS } from '@/art/badges/emblems';
import { EARNED } from '@/art/badges/palette';

function medal(badgeId: string, earned: boolean) {
  const host = document.createElement('div');
  render(<BadgeMedal badgeId={badgeId} earned={earned} size={88} />, host);
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

  it('still renders a medal for an unknown badge id', () => {
    expect(medal('future-badge', true).querySelectorAll('path').length).toBeGreaterThan(3);
  });
});

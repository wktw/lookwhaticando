// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { BADGES } from '@/catalog/badges';
import { BadgeMedal, EnamelPin, PIN_PLATE, PLATES, plateFor } from '@/art/badges';
import { BADGE_EMBLEMS } from '@/art/badges/emblems';
import { METAL, NOT_YET, plateEnamel } from '@/art/badges/palette';
import css from '@/art/badges/badge.module.css';

function pin(badgeId: string, earned: boolean, size = 88) {
  const host = document.createElement('div');
  render(<BadgeMedal badgeId={badgeId} earned={earned} size={size} />, host);
  return host.querySelector('svg')!;
}

describe('pins', () => {
  it('has an emblem for every catalog badge, including the newest', () => {
    for (const b of BADGES) expect(BADGE_EMBLEMS[b.id], b.id).toBeTypeOf('function');
    for (const id of ['wind-down', 'album-complete', 'first-harvest']) expect(BADGE_EMBLEMS[id], id).toBeTypeOf('function');
  });

  it('gives every badge an enamel pin: a plate in its family with a brass rim', () => {
    for (const b of BADGES) {
      const svg = pin(b.id, true);
      const plate = PLATES[plateFor(b.id)].d;
      const face = svg.querySelector(`path[d="${plate}"][fill="${plateEnamel(b.color)}"]`);
      expect(face, b.id).not.toBeNull();
      expect(face!.getAttribute('stroke'), b.id).toBe(METAL.rim);
      expect(svg.getAttribute('data-earned')).toBe('true');
      expect(svg.querySelector(`.${css.emblem}`)!.children.length, b.id).toBeGreaterThan(0);
    }
  });

  it('draws every unearned pin outline-only: a dashed plate in --ink-disabled, no enamel or metal', () => {
    for (const b of BADGES) {
      const svg = pin(b.id, false);
      const plate = svg.querySelector(`path[d="${PLATES[plateFor(b.id)].d}"]`)!;
      expect(plate.getAttribute('fill'), b.id).toBe('none');
      expect(plate.getAttribute('stroke'), b.id).toBe(NOT_YET);
      expect(plate.getAttribute('stroke-dasharray'), b.id).toBeTruthy();
      expect(svg.getAttribute('class'), b.id).toContain(css.notYet);
      expect(svg.innerHTML, b.id).not.toContain(METAL.rim);
      expect(svg.innerHTML, b.id).not.toContain(plateEnamel(b.color));
    }
    expect(NOT_YET).toContain('--ink-disabled');
  });

  it('only cuts pins to known plates', () => {
    for (const plate of Object.values(PIN_PLATE)) expect(PLATES[plate]).toBeDefined();
    expect(plateFor('not-a-badge')).toBe('round');
  });

  it('never uses gradients, filters or masks, and needs no element ids', () => {
    for (const b of BADGES) {
      for (const earned of [true, false]) {
        const svg = pin(b.id, earned);
        expect(svg.querySelector('linearGradient, radialGradient, filter, mask, [id]'), b.id).toBeNull();
      }
    }
  });

  it('is decorative unless titled', () => {
    expect(pin('first-checkin', true).getAttribute('aria-hidden')).toBe('true');
    const host = document.createElement('div');
    render(<EnamelPin badgeId="first-checkin" earned={false} title="First Sprout, not yet" />, host);
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('First Sprout, not yet');
  });

  it('uses a heavier rim at grid sizes (64 px and below)', () => {
    const rim = (size: number, compact?: boolean) => {
      const host = document.createElement('div');
      render(<BadgeMedal badgeId="first-checkin" earned size={size} compact={compact} />, host);
      return Number(host.querySelector(`path[stroke="${METAL.rim}"]`)!.getAttribute('stroke-width'));
    };
    expect(rim(48)).toBeGreaterThan(rim(120));
    expect(rim(64)).toBe(rim(48));
    expect(rim(48, false)).toBe(rim(120));
  });

  it('still renders a pin for an unknown badge id', () => {
    expect(pin('future-badge', true).querySelectorAll('path').length).toBeGreaterThan(3);
  });
});

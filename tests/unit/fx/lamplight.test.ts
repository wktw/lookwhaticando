// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { lampIsLit } from '@/fx/celebrations';

const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m);

describe('the perfect day’s lamp', () => {
  it('is lit from 8 pm through the small hours, by the room’s clock', () => {
    expect(lampIsLit(at(20), 'light')).toBe(true);
    expect(lampIsLit(at(23, 30), 'light')).toBe(true);
    expect(lampIsLit(at(0, 30), 'light')).toBe(true);
    expect(lampIsLit(at(4, 45), 'light')).toBe(true);
  });

  it('is out by day on a daylight page', () => {
    expect(lampIsLit(at(5, 30), 'light')).toBe(false);
    expect(lampIsLit(at(12), 'light')).toBe(false);
    expect(lampIsLit(at(19, 45), undefined)).toBe(false);
  });

  it('is always lit in Lamplight', () => {
    expect(lampIsLit(at(12), 'night')).toBe(true);
  });
});

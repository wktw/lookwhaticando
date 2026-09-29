import { describe, expect, it } from 'vitest';
import { shadeSide, windowLight } from '@/art/light';

const at = (month: number, h: number, m = 0) => new Date(2026, month, 15, h, m);

describe('Windowlight', () => {
  it('the sun crosses the window left to right, then the lamp takes over', () => {
    expect(windowLight(at(8, 8))).toMatchObject({ from: 'left', night: false });
    expect(windowLight(at(8, 13))).toMatchObject({ from: 'top', night: false });
    expect(windowLight(at(8, 17))).toMatchObject({ from: 'right', night: false });
    expect(windowLight(at(8, 22))).toMatchObject({ from: 'right', night: true, sun: 1 });
    expect(windowLight(at(8, 4))).toMatchObject({ night: true, sun: 0 });
  });

  it('winter evenings are dark earlier, and the southern hemisphere is six months out', () => {
    expect(windowLight(at(11, 17)).night).toBe(true);
    expect(windowLight(at(5, 17)).night).toBe(false);
    expect(windowLight(at(11, 17), 'south').night).toBe(false);
  });

  it('quantizes to 15 minutes', () => {
    expect(windowLight(at(8, 10, 1))).toEqual(windowLight(at(8, 10, 14)));
  });

  it('puts the shade away from the light, mirrored for left-facing art', () => {
    expect(shadeSide({ from: 'left', night: false })).toBe('right');
    expect(shadeSide({ from: 'left', night: false }, 'left')).toBe('left');
    expect(shadeSide({ from: 'top', night: false })).toBe('under');
  });
});

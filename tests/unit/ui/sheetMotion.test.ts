import { describe, expect, it } from 'vitest';
import { pickSnap, projection, rubberBand, velocityOf } from '@/ui/sheetMotion';

describe('sheet gesture math', () => {
  it('rubber-bands: gives less the further you pull, never past the dimension', () => {
    const d = 600;
    const a = rubberBand(50, d);
    const b = rubberBand(100, d);
    const c = rubberBand(10_000, d);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(50);
    expect(b - a).toBeLessThan(a);
    expect(c).toBeLessThan(d);
    expect(rubberBand(-50, d)).toBeCloseTo(-a);
    expect(rubberBand(0, d)).toBe(0);
    expect(rubberBand(40, 0)).toBe(0);
  });

  it('projects flicks forward in their direction', () => {
    expect(projection(0)).toBe(0);
    expect(projection(1)).toBeGreaterThan(50);
    expect(projection(-1)).toBeLessThan(-50);
  });

  it('snaps to the nearest point, or where a flick would carry it', () => {
    const points = [0, 300, 700]; // large, medium, dismissed
    expect(pickSnap(points, 120, 0)).toBe(0);
    expect(pickSnap(points, 260, 0)).toBe(1);
    expect(pickSnap(points, 120, 2)).toBe(1); // a quick flick down from near the top
    expect(pickSnap(points, 360, 3)).toBe(2); // a fast flick down dismisses
    expect(pickSnap(points, 520, -3)).toBe(1); // a flick up brings it back
  });

  it('measures velocity over the recent window only', () => {
    expect(velocityOf([])).toBe(0);
    expect(velocityOf([{ y: 10, t: 5 }])).toBe(0);
    const samples = [
      { y: 0, t: 0 },
      { y: 0, t: 200 }, // a pause…
      { y: 50, t: 250 },
      { y: 100, t: 300 }, // …then a flick
    ];
    expect(velocityOf(samples)).toBeCloseTo(1);
  });
});

// @vitest-environment jsdom
/** The Progress and ritual drawings (M1 art audit): day glyphs, pressings, note cards and the month's jar. */
import { describe, expect, it } from 'vitest';
import { render, type JSX } from 'preact';
import { NIGHT_LIGHT } from '@/art/light';
import { ROUTINES } from '@/domain/routines';
import { DayGlyph, MAX_JAR_STEMS, MAX_REST_FLOWERS, MonthJar, NoteCard, Pressing, flowerScale, glyphKind, jarStems } from './index';

function draw(node: JSX.Element): HTMLElement {
  const host = document.createElement('div');
  render(node, host);
  return host;
}

const day = { from: 'left', night: false } as const;

describe('DayGlyph', () => {
  it('draws a flower sized by how full the day was, a bud, a sprout, a moon or a leaf, and nothing for an empty day', () => {
    expect(glyphKind('done', 1)).toBe('flower');
    expect(glyphKind('partial', 0.2)).toBe('bud');
    expect(glyphKind('partial', 0.6)).toBe('flower');
    expect(glyphKind('tiny', 1)).toBe('sprout');
    expect(glyphKind('rest', null)).toBe('moon');
    expect(glyphKind('off', null)).toBe('moon');
    expect(glyphKind('paused', null)).toBe('leaf');
    for (const s of ['none', 'unscheduled', 'future', 'before-start', 'archived'] as const) expect(glyphKind(s, 0)).toBeNull();
    expect(flowerScale(0.5)).toBeLessThan(flowerScale(1));
    expect(flowerScale(null)).toBe(1);
    expect(draw(<DayGlyph state="none" fraction={0} light={day} />).querySelector('svg')!.children).toHaveLength(0);
    expect(draw(<DayGlyph state="rest" light={day} />).querySelector('[data-glyph="moon"]')).not.toBeNull();
  });

  it('never outlines and never uses red', () => {
    for (const state of ['done', 'partial', 'tiny', 'rest', 'paused'] as const) {
      for (const light of [day, NIGHT_LIGHT]) {
        const html = draw(<DayGlyph state={state} fraction={0.5} light={light} title="Tue 29" />).innerHTML;
        expect(html).not.toMatch(/#(E|F)[0-4][0-4][0-4]{3}\b/i);
        expect(html).not.toContain('filter');
      }
    }
  });
});

describe('the rituals', () => {
  it('presses a small flower for each rest day, up to six, and sizes the pressing by the share', () => {
    const rests = (n: number) => Number(draw(<Pressing species="lavender" share={0.5} rests={n} light={day} />).querySelector('[data-rests]')?.getAttribute('data-rests') ?? 0);
    expect(rests(0)).toBe(0);
    expect(rests(3)).toBe(3);
    expect(rests(20)).toBe(MAX_REST_FLOWERS);
  });

  it('sketches any routine on a Sunday Note, and draws every kind', () => {
    for (const r of ROUTINES) expect(draw(<NoteCard kind="sundayNote" sketch={r} light={day} />).querySelector(`[data-sketch="${r}"]`), r).not.toBeNull();
    for (const kind of ['sundayNote', 'herbarium', 'anniversary', 'story'] as const) expect(draw(<NoteCard kind={kind} light={NIGHT_LIGHT} />).querySelector(`[data-note="${kind}"]`)).not.toBeNull();
  });

  it('fills the jar with a stem for each habit watered, up to fourteen', () => {
    const stems = Array.from({ length: 20 }, (_, i) => ({ habitId: `h${i}`, plant: 'begonia' as const }));
    expect(draw(<MonthJar stems={stems} light={day} />).querySelectorAll('[data-stem]')).toHaveLength(MAX_JAR_STEMS);
    expect(draw(<MonthJar stems={[]} light={day} />).querySelectorAll('[data-stem]')).toHaveLength(0);
    const lay = jarStems(5);
    expect(lay[0]!.angle).toBeLessThan(0);
    expect(lay[4]!.angle).toBeGreaterThan(0);
  });
});

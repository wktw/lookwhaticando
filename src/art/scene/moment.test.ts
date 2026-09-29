// @vitest-environment jsdom
/** One light for the whole app (DESIGN §10.4; the M1 art audit's "three light sources"). */
import { afterEach, describe, expect, it } from 'vitest';
import { DAY_LIGHT, NIGHT_LIGHT } from '@/art/light';
import { artLight, artLightFor, pageLamplight, retainWindowClock, setWindowHemisphere, windowClock, windowHemisphere, windowMoment } from './moment';
import { momentAt } from './time';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  setWindowHemisphere('north');
});

describe('the app’s one light', () => {
  it('lights art outside a scene like the band: the window at this hour, the lamp in Lamplight', () => {
    const morning = momentAt(new Date(2026, 5, 10, 8, 0));
    expect(artLightFor(morning, false)).toEqual({ from: morning.light.from, night: false });
    expect(artLightFor(morning, true)).toBe(NIGHT_LIGHT);
    // A daylight page after dark keeps the morning window (art never goes dark on a light page).
    expect(artLightFor(momentAt(new Date(2026, 5, 10, 23, 30)), false)).toBe(DAY_LIGHT);
  });

  it('keeps one moment per quarter hour, follows the hemisphere, and the theme', () => {
    windowClock.value = new Date(2026, 0, 15, 12, 1);
    const a = windowMoment.value;
    windowClock.value = new Date(2026, 0, 15, 12, 14);
    expect(windowMoment.value).toBe(a);
    windowClock.value = new Date(2026, 0, 15, 12, 16);
    expect(windowMoment.value).not.toBe(a);
    expect(windowMoment.value.season).toBe('winter');
    setWindowHemisphere('south');
    expect(windowHemisphere.value).toBe('south');
    expect(windowMoment.value.season).toBe('summer');
    pageLamplight.value = true;
    expect(artLight.value).toBe(NIGHT_LIGHT);
    pageLamplight.value = false;
  });

  it('runs the clock only while something holds it, and reads the theme when it starts', () => {
    document.documentElement.dataset.theme = 'night';
    const release = retainWindowClock();
    expect(pageLamplight.value).toBe(true);
    const again = retainWindowClock();
    release();
    release();
    again();
    document.documentElement.dataset.theme = 'light';
    const r = retainWindowClock();
    expect(pageLamplight.value).toBe(false);
    r();
  });
});

describe('the scene module’s public face', () => {
  it('exports the interaction, decor and light contracts screens build on', async () => {
    const scene = await import('./index');
    for (const name of ['SillScene', 'ShelfScene', 'WindowsillBand', 'decorToScene', 'sceneToDecor', 'windowMoment', 'setWindowHemisphere', 'useArtLight', 'KEEPSAKE_ART', 'ROUTINE_ART', 'ObjectArt']) expect(scene, name).toHaveProperty(name);
  });
});

describe('ObjectArt', () => {
  it('draws every keepsake and every routine object on its own', async () => {
    const { render } = await import('preact');
    const { h } = await import('preact');
    const { ObjectArt, KEEPSAKE_KINDS, ROUTINE_ART } = await import('./index');
    const host = document.createElement('div');
    for (const k of KEEPSAKE_KINDS) {
      render(h(ObjectArt, { keepsake: k, light: DAY_LIGHT }), host);
      expect(host.querySelector(`svg[data-object="${k}"] path`), k).not.toBeNull();
    }
    for (const r of Object.keys(ROUTINE_ART) as (keyof typeof ROUTINE_ART)[]) {
      render(h(ObjectArt, { routine: r, light: NIGHT_LIGHT }), host);
      expect(host.querySelector(`svg[data-object="${r}"] path`), r).not.toBeNull();
    }
    render(null, host);
  });
});

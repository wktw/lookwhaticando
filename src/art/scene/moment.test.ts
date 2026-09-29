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
  it('lights art outside a scene like the band: the window at this hour, the lamp after dark', () => {
    const morning = momentAt(new Date(2026, 5, 10, 8, 0));
    expect(artLightFor(morning)).toEqual({ from: morning.light.from, night: false });
    expect(artLightFor(momentAt(new Date(2026, 5, 10, 23, 30)))).toBe(NIGHT_LIGHT);
  });

  it('agrees with the band for every theme and every quarter hour (the clock sets the light, the theme the paper)', () => {
    const release = retainWindowClock();
    try {
      for (const theme of ['light', 'night', undefined] as const) {
        if (theme) document.documentElement.dataset.theme = theme;
        else delete document.documentElement.dataset.theme;
        for (const hemisphere of ['north', 'south'] as const) {
          setWindowHemisphere(hemisphere);
          for (const month of [0, 5]) {
            for (let q = 0; q < 96; q++) {
              windowClock.value = new Date(2026, month, 15, Math.floor(q / 4), (q % 4) * 15);
              pageLamplight.value = theme === 'night';
              const band = windowMoment.value.light;
              const at = `${theme ?? 'auto'} ${hemisphere} m${month} ${q / 4}h`;
              expect(artLight.value.from, at).toBe(band.from);
              expect(artLight.value.night, at).toBe(band.night);
            }
          }
        }
      }
    } finally {
      release();
    }
  });

  it('keeps one moment per quarter hour, follows the hemisphere, and ignores the theme', () => {
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
    expect(artLight.value.night).toBe(false);
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

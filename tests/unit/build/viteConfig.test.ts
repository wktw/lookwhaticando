import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import config, { manualChunks, MANIFEST, PRECACHE_GLOB, PRECACHE_IGNORE, PRELOAD_FONTS, STARTUP_END, STARTUP_START, stripBetween } from '../../../vite.config';

describe('vite.config.ts', () => {
  it('keeps launch screens, screenshots and Latin Extended Nunito out of the precache', () => {
    expect(PRECACHE_IGNORE).toEqual(expect.arrayContaining(['splash/**', 'screenshots/**', 'assets/nunito-latin-ext-*.woff2']));
    // includeAssets would bypass the ignores; the glob covers public/ icons already.
    expect(readFileSync('vite.config.ts', 'utf8')).not.toMatch(/^\s*includeAssets:/m);
    expect(PRECACHE_GLOB.join()).toContain('png');
  });

  it('gives the two big generated art tables chunks of their own', () => {
    expect(manualChunks('/repo/src/art/scene/decor/shade.gen.ts')).toBe('art-shade');
    expect(manualChunks('C:\\repo\\src\\art\\pets\\crescents\\data.ts')).toBe('pet-crescents');
    expect(manualChunks('/repo/src/art/pets/PetArt.tsx')).toBeUndefined();
  });

  it('preloads exactly the first-paint fonts', () => {
    const match = (f: string) => PRELOAD_FONTS.some((re) => re.test(f));
    expect(match('/assets/castoro-latin-400-normal-W6cD29UF.woff2')).toBe(true);
    expect(match('/assets/nunito-latin-wght-normal-BzFMHfZw.woff2')).toBe(true);
    expect(match('/assets/castoro-latin-400-italic-DaOt8cIu.woff2')).toBe(false);
    expect(match('/assets/nunito-latin-ext-wght-normal-CXYtwYOx.woff2')).toBe(false);
  });

  it('strips the launch screens for the single file, and only them', () => {
    const html = readFileSync('index.html', 'utf8');
    const out = stripBetween(html, STARTUP_START, STARTUP_END);
    expect(html).toContain('apple-touch-startup-image');
    expect(out).not.toContain('apple-touch-startup-image');
    expect(out).not.toContain(STARTUP_START);
    expect(out).toContain('<link rel="apple-touch-icon"');
    expect(out).toContain('<!--favicon-->');
    expect(stripBetween('<a>no markers</a>', STARTUP_START, STARTUP_END)).toBe('<a>no markers</a>');
  });

  it('describes an app that turns sideways, installs richly and has shortcuts', () => {
    expect(MANIFEST).not.toHaveProperty('orientation');
    expect(MANIFEST.icons?.filter((i) => i.purpose === 'maskable').map((i) => i.sizes)).toEqual(['192x192', '512x512']);
    expect(MANIFEST.shortcuts?.map((s) => s.url)).toEqual(['./#/today', './#/capsules']);
    expect(MANIFEST.screenshots?.map((s) => s.form_factor)).toEqual(['narrow', 'wide']);
    // Every image the manifest lists is in public/.
    const files = [...(MANIFEST.icons ?? []), ...(MANIFEST.shortcuts ?? []).flatMap((s) => s.icons ?? []), ...(MANIFEST.screenshots ?? [])].map((i) => i.src);
    for (const f of files) expect(() => readFileSync(`public/${f}`), f).not.toThrow();
  });
});


it('disables script preloads so a failed request can recover after a Safari reload', async () => {
  const built = await config({ command: 'build', mode: 'production' });
  expect(built.build?.modulePreload).toBe(false);
});

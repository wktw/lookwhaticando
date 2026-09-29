/**
 * WCAG contrast guard for the design tokens (M0 a11y audit). Parses tokens.css and checks
 * every text pair ≥ 4.5:1 and every UI pair ≥ 3:1, in both themes, plus that the night
 * block and the prefers-color-scheme fallback declare identical values.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MACHINES } from '@/catalog/machines';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

function block(selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  if (!m) throw new Error(`block not found: ${selector}`);
  const out: Record<string, string> = {};
  for (const d of m[1]!.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[d[1]!] = d[2]!.toLowerCase();
  return out;
}

const light = block(/:root\s*\{([\s\S]*?)\n\}/);
const nightOnly = block(/:root\[data-theme='night'\]\s*\{([\s\S]*?)\n\}/);
const night = { ...light, ...nightOnly };
const media = block(/:root:not\(\[data-theme='light'\]\):not\(\[data-theme='night'\]\)\s*\{([\s\S]*?)\n  \}/);

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const FAMILIES = ['blush', 'peach', 'butter', 'sage', 'mint', 'sky', 'lavender', 'lilac'];
const SURFACES = ['bg', 'bg-2', 'card'];

function pairs(t: Record<string, string>) {
  const text: [string, string][] = [];
  const ui: [string, string][] = [];
  for (const s of SURFACES) {
    text.push(['ink', s], ['ink-2', s], ['ink-3', s]);
    ui.push(['focus', s], ['control-border', s]);
  }
  for (const f of FAMILIES) {
    text.push(['on-accent', `${f}-500`]);
    for (const s of [...SURFACES, `${f}-100`]) text.push([`${f}-700`, s]);
  }
  return { text, ui };
}

describe.each([
  ['light', light],
  ['night', night],
] as const)('%s theme contrast', (_name, t) => {
  const { text, ui } = pairs(t);
  it.each(text)('text %s on %s ≥ 4.5', (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!), `${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it.each(ui)('ui %s on %s ≥ 3', (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!), `${fg}/${bg}`).toBeGreaterThanOrEqual(3);
  });
});

describe('theme blocks', () => {
  it('prefers-color-scheme fallback matches the night theme', () => {
    for (const [k, v] of Object.entries(media)) expect(v, k).toBe(night[k]);
  });
  it('machine label ink is readable on its trim', () => {
    for (const m of MACHINES) expect(ratio(m.theme.ink, m.theme.trim), m.id).toBeGreaterThanOrEqual(4.5);
  });
});

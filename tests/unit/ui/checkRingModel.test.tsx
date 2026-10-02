// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { CheckRing } from '@/ui/CheckRing';
import { CHECK_RING_MS, CHECKIN_CHOREOGRAPHY, countLabelPlacement, ringState, surfaceY, waterLevel } from '@/ui/checkRingModel';

let host: HTMLElement;

function mount(node: preact.ComponentChild) {
  host = document.createElement('div');
  document.body.appendChild(host);
  act(() => render(node, host));
  return host.querySelector('button')!;
}

afterEach(() => {
  if (host) act(() => render(null, host));
  document.body.innerHTML = '';
  delete document.documentElement.dataset.motion;
});

describe('water level', () => {
  it('is empty, full, or the count toward its target', () => {
    expect(waterLevel({ state: 'empty' })).toBe(0);
    expect(waterLevel({ state: 'done' })).toBe(1);
    expect(waterLevel({ count: 5, target: 8 })).toBe(0.625);
    expect(waterLevel({ count: 0, target: 8 })).toBe(0);
  });

  it('tiny counts as done; rest holds no water', () => {
    expect(waterLevel({ state: 'tiny' })).toBe(1);
    expect(waterLevel({ state: 'rest', count: 3, target: 8 })).toBe(0);
  });

  it('over target stays full ("10/8" earns no more water)', () => {
    expect(waterLevel({ count: 10, target: 8 })).toBe(1);
    expect(ringState({ count: 10, target: 8 })).toBe('done');
    expect(ringState({ count: 7, target: 8 })).toBe('empty');
  });

  it('the surface rises as the level rises, from below the ring to above it', () => {
    const ys = [0, 0.125, 0.5, 0.875, 1].map(surfaceY);
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeLessThan(ys[i - 1]!);
    expect(surfaceY(0)).toBeGreaterThan(48);
    expect(surfaceY(1)).toBeLessThan(0);
  });

  it('the "5/8" label sits in the larger of air and water, never across the surface', () => {
    for (const level of [1 / 8, 3 / 8, 5 / 8, 7 / 8]) {
      const { y, inWater } = countLabelPlacement(level);
      const s = surfaceY(level);
      if (inWater) expect(y - 4).toBeGreaterThan(s);
      else expect(y + 4).toBeLessThan(s - 3);
    }
  });
});

describe('check-in choreography', () => {
  it('is over within 700 ms and never runs backwards', () => {
    const t = CHECKIN_CHOREOGRAPHY;
    expect(t.total).toBeLessThanOrEqual(700);
    for (const [name, at] of Object.entries(t)) expect(at, name).toBeLessThanOrEqual(t.total);
    expect(t.check).toBeGreaterThanOrEqual(t.ringFill + CHECK_RING_MS.fill);
    expect(t.coin).toBeGreaterThan(t.check);
    expect(t.toast).toBeGreaterThan(t.coin);
    expect(t.check + CHECK_RING_MS.check).toBeLessThanOrEqual(t.total);
  });
});

describe('<CheckRing>', () => {
  it('a one-tap habit is a button named with the habit, aria-pressed with its state', () => {
    const onClick = vi.fn();
    let btn = mount(<CheckRing label="Walk" state="empty" description="26 of the last 30 days" onClick={onClick} />);
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Walk');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(document.getElementById(btn.getAttribute('aria-describedby')!)?.textContent).toBe('26 of the last 30 days');
    act(() => btn.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    act(() => render(<CheckRing label="Walk" state="done" />, host));
    btn = host.querySelector('button')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.dataset.state).toBe('done');
  });

  it('tiny reads as done; rest is not pressed and shows its moon', () => {
    let btn = mount(<CheckRing label="Read" state="tiny" />);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    act(() => render(<CheckRing label="Stretch" state="rest" description="Resting today" />, host));
    btn = host.querySelector('button')!;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.dataset.state).toBe('rest');
  });

  it('a count habit is an "add" button described by its count, with the water at count/target', () => {
    const btn = mount(<CheckRing label="Add 1 glass to Drink water" count={5} target={8} description="5 of 8 glasses" />);
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe('Add 1 glass to Drink water');
    expect(document.getElementById(btn.getAttribute('aria-describedby')!)?.textContent).toBe('5 of 8 glasses');
    expect(btn.dataset.level).toBe('0.625');
    expect(btn.textContent).toContain('5/8');
    const water = btn.querySelector<SVGGElement>('g[style]')!;
    expect(water.style.transform).toBe(`translateY(${surfaceY(0.625)}px)`);
  });

  it('keyboard users get a real button (Enter and Space activate natively) with a 44 px target', () => {
    const btn = mount(<CheckRing label="Walk" />);
    expect(btn.type).toBe('button');
    expect(btn.disabled).toBe(false);
    expect(Number.parseFloat(btn.style.width)).toBeGreaterThanOrEqual(44);
  });

  it('drains when unchecked: the flow flips so the mark lifts before the water falls', () => {
    let btn = mount(<CheckRing label="Walk" state="done" />);
    expect(btn.dataset.flow).toBe('fill');
    act(() => render(<CheckRing label="Walk" state="empty" />, host));
    btn = host.querySelector('button')!;
    expect(btn.dataset.flow).toBe('drain');
  });

  it('reduced motion fills instantly', () => {
    let btn = mount(<CheckRing label="Walk" state="done" />);
    expect(btn.hasAttribute('data-instant')).toBe(false);
    act(() => render(null, host));
    document.documentElement.dataset.motion = 'reduced';
    btn = mount(<CheckRing label="Walk" state="done" />);
    expect(btn.hasAttribute('data-instant')).toBe(true);
  });
});

describe('rest state contrast (DESIGN §10.1: UI pairs ≥ 3:1)', () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const tokens = read('../../../src/styles/tokens.css');
  const ring = read('../../../src/ui/CheckRing.module.css');
  const hexes = (block: string) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]));
  const light = hexes(tokens.match(/:root\s*\{([\s\S]*?)\n\}/)![1]!);
  const night = { ...light, ...hexes(tokens.match(/:root\[data-theme='night'\]\s*\{([\s\S]*?)\n\}/)![1]!) };
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x! + 0.05) / (y! + 0.05);
  };
  /** The token a rule paints with, e.g. `.moon { fill: var(--lavender-700) }` → lavender-700. */
  const tokenOf = (selector: string, prop: string) => {
    const rule = ring.match(new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`))![1]!;
    return rule.match(new RegExp(`${prop}:\\s*var\\(--([\\w-]+)\\)`))![1]!;
  };

  it.each([
    ['light', light],
    ['night', night],
  ] as const)('the resting edge and the moon read on the card (%s)', (_name, t) => {
    const edge = tokenOf('.quiet .edge', 'stroke');
    const moon = tokenOf('.moon', 'fill');
    expect(ratio(t[edge]!, t.card!), `edge ${edge}`).toBeGreaterThanOrEqual(3);
    expect(ratio(t[moon]!, t.card!), `moon ${moon}`).toBeGreaterThanOrEqual(3);
  });
});

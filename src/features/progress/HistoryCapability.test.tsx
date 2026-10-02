// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createInitialState } from '@/state/defaults';
import { state } from '@/state/store';
import { habitEditorRequest } from '@/features/habits/open';
import { habitDetailVM } from '@/state/views/habit';
import { habit, monthly, rule, weekly, DAILY, range, on } from '../../../tests/unit/domain/helpers';
import { Calendar } from './Calendar';
import { ProgressScreen } from './ProgressScreen';
import { Stats } from '@/features/habits/detail/Parts';
import { NOW, TODAY, UTC, button, click, installDom, mount, pause, useState_ } from './testing';

let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
afterEach(() => { view?.unmount(); view = null; });
function base() { return createInitialState(NOW); }

it.each([weekly(3), monthly(6)])('the $kind calendar offers add/remove/add on a closed bare day', async (schedule) => {
  useState_({ ...base(), habits: [habit({ startedOn: '2026-01-01', schedule })] });
  view = mount(<Calendar habitId="h1" month="2026-08" />);
  await click(document.querySelector('[data-date="2026-08-05"]'));
  for (const name of ['Water it for Aug 5', 'Not watered after all', 'Water it for Aug 5']) {
    await click(button(name), name);
  }
  expect(state.value.logs.h1?.['2026-08-05']).toEqual({ kind: 'log', count: 1 });
  expect(state.value.wallet.coins).toBe(0);
});

it.each(['paused', 'off', 'rest'] as const)('offers a legal correction for an older %s day', async (kind) => {
  const s = { ...base(), habits: [habit({ startedOn: '2026-09-01', pauses: kind === 'paused' ? [{ start: '2026-09-01', end: '2026-09-15' }] : [] })] };
  if (kind === 'off') s.offDays['2026-09-05'] = true;
  if (kind === 'rest') s.logs.h1 = { '2026-09-05': { kind: 'rest' } };
  useState_(s);
  view = mount(<Calendar habitId="h1" />);
  await click(document.querySelector('[data-date="2026-09-05"]'));
  await click(button('Water it for Sep 5'));
  expect(state.value.logs.h1?.['2026-09-05']?.kind).toBe('log');
});

it('explains the protected period and never offers a removal that the reducer refuses', async () => {
  useState_({ ...base(), habits: [habit({ startedOn: '2026-09-01', schedule: monthly(6) })], logs: { h1: { '2026-09-05': { kind: 'log', count: 1 } } } });
  view = mount(<Calendar habitId="h1" />);
  await click(document.querySelector('[data-date="2026-09-05"]'));
  expect(button('Not watered after all')).toBeNull();
  expect(document.body.textContent).toContain('This watering can be removed once its period is outside the week strip on Today.');
});

it('offers neither Water nor Open Today outside the habit’s lifetime', async () => {
  useState_({ ...base(), habits: [habit({ startedOn: '2026-09-01', archivedOn: '2026-09-05' })] });
  view = mount(<Calendar habitId="h1" />);
  for (const date of ['2026-09-10', '2026-09-28']) {
    await click(document.querySelector(`[data-date="${date}"]`));
    expect(button(/^Water it/)).toBeNull();
    expect(document.querySelector('a[href="#/today"]')).toBeNull();
    expect(document.body.textContent).toContain('That day is outside this habit’s tracking dates.');
  }
});

describe('Progress without habits', () => {
  it('keeps pins, anniversary notes, filed seasons and lifetime records beside Add a habit', async () => {
    const s = base();
    s.badges['first-checkin'] = NOW;
    s.lifetime.perfectDays = 8;
    s.lifetime.showUpDays = 12;
    s.inbox = [{ kind: 'anniversary', id: 'a', date: '2026-09-01', years: 1, waterings: 50, stars: 0 }];
    s.seasons = { filed: [{ key: '2026-06-01', name: 'summer', start: '2026-06-01', end: '2026-08-31', hemisphere: 'north', plants: [], waterings: 12 }] };
    useState_(s);
    view = mount(<ProgressScreen />);
    await pause(250);
    expect(document.querySelector('[data-pin="first-checkin"][data-earned="true"]')).not.toBeNull();
    expect(document.querySelector('[data-ritual="anniversary"]')).not.toBeNull();
    expect(document.querySelector('[data-memory="seasons"]')).not.toBeNull();
    expect(document.querySelector('[data-section="records"]')?.textContent).toContain('12 days');
    expect(document.querySelector('[data-section="calendar"]')).toBeNull();
    await click(button('Add a habit'));
    expect(habitEditorRequest.value).toEqual({});
  });
  it('keeps a keepsake visible when it is the only history left', async () => {
    const s = base();
    s.keepsakes = [{ id: 'k-old-2', habitId: 'old', petId: 'old-pet', stage: 2, kind: 'brass-seed', date: '2026-08-01' }];
    useState_(s);
    view = mount(<ProgressScreen />);
    await pause(250);
    expect(document.querySelector('[data-memory="keepsakes"]')?.textContent).toContain('Aug 1');
    expect(button('Add a habit')).not.toBeNull();
  });
});

it('shows both a 3-week best run and a 7-day current run after a rhythm change', () => {
  const h = habit({ startedOn: '2026-09-01', rules: [rule('2026-09-01', weekly(3)), rule('2026-09-21', DAILY)] });
  const s = { ...base(), habits: [h], logs: { h1: { ...on(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-14', '2026-09-15', '2026-09-16']), ...range('2026-09-23', TODAY) } } };
  useState_(s);
  const vm = habitDetailVM(s, { today: TODAY, now: NOW, local: UTC }, 'h1')!;
  expect(vm.stats.best?.unit).toBe('weeks');
  view = mount(<Stats vm={vm} />);
  expect(view.root.textContent).toContain('3 weeks in a row');
  expect(view.root.textContent).toContain('7 days in a row');
});

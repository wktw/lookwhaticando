// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getMachine } from '@/catalog/machines';
import { itemsInMachine, SECRET_IDS } from '@/catalog/collectibles';
import { state } from '@/state/store';
import { LeafletCard, LeafletFull } from './Leaflet';
import { installDom, mount } from './testing';

let view: ReturnType<typeof mount> | null = null;
beforeAll(installDom);
afterEach(() => {
  view?.unmount();
  view = null;
});

const cats = getMachine('cats');
const first = itemsInMachine('cats').find((i) => i.rarity === 'common')!;
const secretId = itemsInMachine('cats').find((i) => SECRET_IDS.has(i.id))!.id;

function own(ids: string[]) {
  state.value = { ...state.value, collection: Object.fromEntries(ids.map((id) => [id, { count: 1, firstAt: 0 }])) };
}

describe('the lineup leaflet', () => {
  it('ticks what you have, not by fill alone, and gives the hidden Secret one sparkle', () => {
    own([first.id]);
    view = mount(<LeafletCard machine={cats} onOpen={() => {}} />);
    const cells = Array.from(document.querySelectorAll('button > span span span'));
    const ticked = cells.filter((c) => c.querySelector('svg circle'));
    expect(ticked).toHaveLength(1);
    const secret = cells.find((c) => c.textContent === '?')!;
    expect(secret.querySelectorAll('svg')).toHaveLength(1);
    expect(document.querySelectorAll('svg path[d^="M0 -9"]')).toHaveLength(1);
  });

  it('the sparkle goes once the Secret has been pulled', () => {
    own([secretId]);
    view = mount(<LeafletFull machine={cats} />);
    expect(document.body.textContent).not.toMatch(/\?/);
    expect(document.querySelectorAll('svg path[d^="M0 -9"]')).toHaveLength(0);
  });
});

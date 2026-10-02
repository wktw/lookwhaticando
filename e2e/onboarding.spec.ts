/**
 * Onboarding (DESIGN §9.6) and the shell around it: a first boot lands in onboarding, not the tabs;
 * the steps plant real habits, water them and reach the first capsule; a reload resumes; "Not yet,
 * I’ll earn it" goes to Today; the install gate shows in an iPhone Safari tab, and "Just peek" opens
 * the demo with its pill. axe (WCAG 2.2 AA) on each step it passes through.
 */
import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/state/defaults';
import { encodeEnvelope } from '../src/state/persist';
import { transact } from '../src/domain/tx';
import { mulberry32 } from '../src/domain/rng';
import { appDayKey, runtimeLocalTime } from '../src/domain/dates';
import * as habits from '../src/domain/habits';
import { expectNoAxeViolations, watchErrors } from './support';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

const h1 = (page: Page) => page.locator('main h1');
/** A celebration banner (a new pin) and its close button. */
const pinBanner = (page: Page) => page.getByRole('button', { name: 'Put the note away' });

/** The saved state, as this window last wrote it. */
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1') ?? 'null')?.state as { wallet: { coins: number }; pets: Record<string, unknown> } | undefined);

/** Step 4 on the house: the Cows cabinet, a coin in, the handle, the capsule opened, to "Find … a plant". */
async function firstCapsule(page: Page) {
  await page.getByRole('button', { name: /^No\. 02 · Cows/ }).click();
  await page.getByRole('button', { name: /^Put a coin in/ }).first().click();
  const handle = page.getByRole('slider', { name: 'Turn the handle' });
  await expect(handle).toHaveAttribute('aria-disabled', 'false');
  await handle.focus();
  await page.keyboard.press('Enter');
  const find = page.getByRole('button', { name: /^Find .+ a plant$/ });
  for (let i = 0; i < 30 && !(await find.isVisible().catch(() => false)); i++) {
    // The capsule in the tray, then the capsule itself in the reveal ("Open capsule, … finish").
    const open = page.getByRole('button', { name: /Open the capsule|take it out|tray/i }).locator('visible=true').first();
    if (await open.count()) await open.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await find.click();
  await expect(h1(page)).toHaveText(/^Find .+ a plant$/);
}

/** A first boot; on the phone projects (an iPhone's Safari tab) past the install gate, into the tab. */
async function start(page: Page) {
  await page.goto('./#/today');
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  const sill = page.getByRole('heading', { level: 1, name: 'New place. Which plants came with you?' });
  await expect(stay.or(sill)).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await expect(sill).toBeVisible();
}

test('the full app name fits beside onboarding navigation', async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 900) await page.setViewportSize({ ...viewport, width: 320 });
  await start(page);
  await page.evaluate(() => document.fonts.ready);
  const brand = page.getByText('Little by Little', { exact: true });
  await expect(brand).toBeVisible();
  const name = await brand.boundingBox();
  const steps = await page.locator('header ol').boundingBox();
  const skip = await page.getByRole('button', { name: 'Skip', exact: true }).boundingBox();
  expect(name).not.toBeNull();
  expect(steps).not.toBeNull();
  expect(skip).not.toBeNull();
  expect(name!.x + name!.width).toBeLessThan(steps!.x);
  expect(steps!.x + steps!.width).toBeLessThan(skip!.x);
  const header = await page.locator('header').evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(header.scroll).toBeLessThanOrEqual(header.width);
});

/** A watering's decorative +5 has a finite fade even with reduced motion. */
async function afterWateringFlourish(page: Page, audit: () => Promise<void>) {
  // Observe natural completion; do not finish animations, hide nodes, or weaken the page audit.
  await expect(page.locator('.ck-fx-layer .ck-fx-float')).toHaveCount(0);
  await audit();
}

async function fadingWateringFixture(page: Page) {
  await page.setContent(`<!doctype html><html lang="en"><head><title>Watering audit control</title><style>
    body { background: #fffdf9; color: #3b3236; font: 16px sans-serif; }
    .ck-fx-float { background: #fffdf9; }
  </style></head><body><main><h1>Watered</h1><p id="persistent">Your watering is saved.</p><button>Next</button></main>
  <div class="ck-fx-layer" aria-hidden="true"><div class="ck-fx-float">+5</div></div></body></html>`);
  await page.evaluate(() => {
    const chip = document.querySelector<HTMLElement>('.ck-fx-float')!;
    const fade = chip.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: 1000, fill: 'both' });
    fade.pause(); fade.currentTime = 982;
    void fade.finished.catch(() => undefined).then(() => chip.remove());
    (window as unknown as { wateringFade: Animation }).wateringFade = fade;
  });
}

const finishWateringFade = (page: Page) => page.evaluate(() => (window as unknown as { wateringFade: Animation }).wateringFade.finish());

test('the watering audit waits for the finite flourish and then checks the retained page', async ({ page }, info) => {
  await fadingWateringFixture(page);
  let audited = false;
  const scan = afterWateringFlourish(page, async () => { audited = true; await expectNoAxeViolations(page, info); }).then(() => null, error => error);
  try {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(audited).toBe(false);
    await expect(page.locator('.ck-fx-float')).toHaveCount(1);
    await finishWateringFade(page);
    expect(await scan).toBeNull();
    expect(audited).toBe(true);
    await expect(page.getByText('Your watering is saved.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  } finally {
    await finishWateringFade(page);
    await scan;
  }
});

test('the watering audit still reports persistent low-contrast text after the flourish', async ({ page }, info) => {
  await fadingWateringFixture(page);
  await page.locator('#persistent').evaluate(el => { (el as HTMLElement).style.color = '#aaa'; });
  await finishWateringFade(page);
  await expect(afterWateringFlourish(page, () => expectNoAxeViolations(page, info))).rejects.toThrow('color-contrast');
  await expect(page.locator('#persistent')).toHaveCSS('color', 'rgb(170, 170, 170)');
});

test('a first boot is onboarding: sill → picks → water → the four cabinets → Today', async ({ page }, info) => {
  const errors = watchErrors(page);
  await start(page);
  // No tabs yet.
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await expectNoAxeViolations(page, info);

  await page.getByLabel('Your name').fill('Maya');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(h1(page)).toHaveText('Pick up to 3.');
  await page.getByRole('button', { name: 'Drink water' }).click();
  await page.getByRole('button', { name: 'Walk', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Walk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectNoAxeViolations(page, info);
  await page.getByRole('button', { name: 'Plant these' }).click();

  await expect(h1(page)).toHaveText('Anything already done today?');
  await expectNoAxeViolations(page, info);
  await page.getByRole('button', { name: 'Walk', exact: true }).click();
  await expect(page.getByText('There are 25 coins in the jar. That’s a capsule.')).toBeVisible();
  // The pins and notes wait for Today: nothing covers the sill, the heading or Skip.
  await page.waitForTimeout(900);
  await expect(pinBanner(page)).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Notes' })).toHaveCount(0);
  await afterWateringFlourish(page, () => expectNoAxeViolations(page, info));
  await expect(page.getByRole('button', { name: 'Add 1 glass to Drink water' })).toBeVisible();

  // A reload lands back on the same step.
  await page.reload();
  await expect(h1(page)).toHaveText('Anything already done today?');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(h1(page)).toHaveText('Who comes home first?');
  for (const name of ['No. 01 · Cats', 'No. 02 · Cows', 'No. 03 · Dogs', 'No. 04 · Pond']) await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(pinBanner(page)).toHaveCount(0);
  await expectNoAxeViolations(page, info);
  await page.getByRole('button', { name: 'Not yet, I’ll earn it' }).first().click();

  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeAttached();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the first capsule, on the house: a pet comes home and moves into a plant', async ({ page }) => {
  test.skip(test.info().project.name.includes('desktop'), 'one journey through the cabinet is enough');
  const errors = watchErrors(page);
  await start(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Read' }).click();
  await page.getByRole('button', { name: 'Plant it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await firstCapsule(page);
  // The reveal named the pet; here the name waits behind Rename.
  await expect(page.getByRole('button', { name: 'Another name' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('button', { name: 'Another name' }).click();
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('watered on step 3, then the capsule on the house: one pet, and the capsule spends the top-up', async ({ page }) => {
  test.skip(test.info().project.name.includes('desktop'), 'one journey through the cabinet is enough');
  const errors = watchErrors(page);
  await start(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Read' }).click();
  await page.getByRole('button', { name: 'Plant it' }).click();
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page.getByText('There are 25 coins in the jar. That’s a capsule.')).toBeVisible();
  await expect.poll(async () => (await saved(page))?.wallet.coins).toBe(25);
  await page.getByRole('button', { name: 'Next' }).click();
  await firstCapsule(page);
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
  // The pins held back through onboarding arrive on Today.
  await expect(pinBanner(page).first()).toBeVisible();
  await expect.poll(async () => Object.keys((await saved(page))?.pets ?? {}).length).toBe(1);
  // The free capsule spends the top-up (domain/gacha.ts): the watering's own 5 coins stay in the jar.
  await expect.poll(async () => (await saved(page))?.wallet.coins).toBe(5);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('offline, step 4’s chunk can’t load: its heading, Try again in place of the lead, and back online the cabinets (WP-C4)', async ({ page }) => {
  // The chunk is aborted the way an offline fetch fails, from the first boot (it is fetched on the sill).
  const chunk = '**/*CapsuleSteps*';
  await page.route(chunk, (r) => r.abort('internetdisconnected'));
  await start(page);
  await page.getByRole('button', { name: 'Skip' }).click(); // sill → picks
  await page.getByRole('button', { name: 'Skip' }).click(); // nothing planted → step 4
  await expect(h1(page)).toHaveText('Who comes home first?');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.getByText('Your first capsule is on the house. Choose a cabinet.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();

  // Offline, Try again does not reload (that could land on the browser's own offline page): the
  // error comes back in the same page, under the same heading.
  let loads = 0;
  page.on('load', () => loads++);
  await page.evaluate(() => ((window as unknown as { samePage: boolean }).samePage = true));
  await page.context().setOffline(true);
  await retry.click();
  await page.waitForTimeout(600);
  await expect(retry).toBeVisible();
  await expect(h1(page)).toHaveText('Who comes home first?');
  expect(loads).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBe(true);

  // Back online, Chromium still keeps the failed chunk for the life of the page, so Try again
  // reloads (online, nothing unsaved), and step 4 comes back from its saved progress with the cabinets.
  await page.context().setOffline(false);
  await page.unroute(chunk);
  await retry.click();
  await expect(page.getByRole('button', { name: /^No\. 01 · Cats/ })).toBeVisible();
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(h1(page)).toHaveText('Who comes home first?');
  await expect(h1(page)).toBeFocused();
});

test('offline, onboarding’s own chunk can’t load: Try again, and back online onboarding (WP-C4 follow-up, P-ui-22)', async ({ page }) => {
  // The chunk is aborted the way an offline fetch fails, from the first boot.
  const chunk = /\/Onboarding[-.][^/]*$/;
  await page.route(chunk, (r) => r.abort('internetdisconnected'));
  await page.goto('./#/today');
  const stay = page.getByRole('button', { name: 'Keep it in this tab' });
  const failed = page.getByRole('heading', { name: 'This page didn’t load' });
  await expect(failed).toBeVisible();
  const retry = page.getByRole('button', { name: 'Try again' });

  let loads = 0;
  page.on('load', () => loads++);
  await page.evaluate(() => ((window as unknown as { samePage: boolean }).samePage = true));
  await page.context().setOffline(true);
  await retry.click();
  await page.waitForTimeout(600);
  await expect(retry).toBeVisible();
  expect(loads).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { samePage?: boolean }).samePage)).toBe(true);

  // Back online, Try again reloads (Chromium keeps the failed chunk for the life of the page), and
  // onboarding comes back from the save (on a phone, its install gate first: it is in that chunk).
  await page.context().setOffline(false);
  await page.unroute(chunk);
  await retry.click();
  const sill = page.getByRole('heading', { level: 1, name: 'New place. Which plants came with you?' });
  await expect(stay.or(sill)).toBeVisible();
  if (await stay.isVisible()) await stay.click();
  await expect(sill).toBeVisible();
});

test('an upgrade in the middle of onboarding: the old catkin:onboarding key is folded into the save, and its step shows (WP-C5)', async ({ page }) => {
  const errors = watchErrors(page);
  // A save as a build before WP-C5 left it on step 4: onboarded, its habit, the step beside it.
  const now = Date.now();
  const env = { now, today: appDayKey(now, 180, runtimeLocalTime), local: runtimeLocalTime, rng: mulberry32(7) };
  const out = transact(createInitialState(now), env, (tx) => ({ ids: habits.completeOnboarding(tx, { name: 'Sam', templateIds: ['walk'] }) }));
  const seeded = [encodeEnvelope(out.state, 1, now, 'old'), JSON.stringify({ step: 'first', habitIds: out.ids })];
  await page.addInitScript(([save, legacy]) => {
    if (sessionStorage.getItem('ck-e2e-seeded')) return;
    localStorage.setItem('catkin:v1', save!);
    localStorage.setItem('catkin:onboarding', legacy!);
    sessionStorage.setItem('ck-e2e-seeded', '1');
  }, seeded);
  // The fold's own chunk loads only because there is a key.
  const fold = page.waitForResponse((r) => /\/(state\/onboarding\.ts|onboarding-[^/]*\.js)(\?|$)/.test(r.url()));
  await page.goto('./#/today');
  expect((await fold).ok()).toBe(true);
  await expect(h1(page)).toHaveText('Who comes home first?');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('catkin:onboarding'))).toBeNull();
  const step = await page.evaluate(() => JSON.parse(localStorage.getItem('catkin:v1')!).state.profile.onboardingStep);
  expect(step).toEqual({ step: 'first', habitIds: out.ids });
  await page.reload();
  await expect(h1(page)).toHaveText('Who comes home first?');
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('in an iPhone Safari tab', () => {
  test.use({ userAgent: IPHONE_SAFARI });

  test('the install gate comes first; "Just peek" opens the demo with its pill; leaving it goes to step 1', async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto('./#/today');
    await expect(h1(page)).toHaveText('Keep Little by Little on your Home Screen');
    await expect(page.getByRole('button', { name: 'Paste my plants' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep it in this tab' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoAxeViolations(page, info);
    await page.getByRole('button', { name: 'Just peek' }).click();
    const pill = page.locator('[data-demo-pill]');
    await expect(pill).toContainText('The demo');
    await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
    await pill.getByRole('button', { name: 'Leave the demo' }).click();
    await expect(h1(page)).toHaveText('New place. Which plants came with you?');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

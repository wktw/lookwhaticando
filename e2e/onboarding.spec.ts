/**
 * Onboarding (DESIGN §9.6) and the shell around it: a first boot lands in onboarding, not the tabs;
 * the steps plant real habits, water them and reach the first capsule; a reload resumes; "Not yet,
 * I’ll earn it" goes to Today; the install gate shows in an iPhone Safari tab, and "Just peek" opens
 * the demo with its pill. axe (WCAG 2.2 AA) on each step it passes through.
 */
import { expect, test, type Page } from '@playwright/test';
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
  await expectNoAxeViolations(page, info);
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

test.describe('in an iPhone Safari tab', () => {
  test.use({ userAgent: IPHONE_SAFARI });

  test('the install gate comes first; "Just peek" opens the demo with its pill; leaving it goes to step 1', async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto('./#/today');
    await expect(h1(page)).toHaveText('Keep catkin on your Home Screen');
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

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
  await page.getByRole('button', { name: 'Plant them' }).click();

  await expect(h1(page)).toHaveText('Anything already done today?');
  await page.getByRole('button', { name: 'Walk', exact: true }).click();
  await expect(page.getByText('There are 25 coins in the jar. That’s a capsule.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add 1 glass to Drink water' })).toBeVisible();
  await expectNoAxeViolations(page, info);

  // A reload lands back on the same step.
  await page.reload();
  await expect(h1(page)).toHaveText('Anything already done today?');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(h1(page)).toHaveText('Who comes home first?');
  for (const name of ['No. 01 · Cats', 'No. 02 · Cows', 'No. 03 · Dogs', 'No. 04 · Pond']) await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
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
  await page.getByRole('button', { name: /^No\. 02 · Cows/ }).click();
  await page.getByRole('button', { name: /^Put a coin in/ }).first().click();
  await page.getByRole('button', { name: /Turn the handle/ }).first().click();
  const find = page.getByRole('button', { name: /^Find .+ a plant$/ });
  for (let i = 0; i < 6 && !(await find.isVisible().catch(() => false)); i++) {
    const open = page.getByRole('button', { name: /Open capsule|take it out|tray/i }).first();
    if (await open.isVisible().catch(() => false)) await open.click({ force: true });
    await page.waitForTimeout(800);
  }
  await find.click();
  await expect(h1(page)).toHaveText(/^Find .+ a plant$/);
  await page.getByRole('button', { name: 'Another name' }).click();
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Today');
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

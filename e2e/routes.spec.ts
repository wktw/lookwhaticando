/**
 * Every route renders, in light and dark, on a phone and a desktop: no uncaught error, no console
 * error, the right theme, and no axe violations.
 */
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, openRoute, ROUTES, watchErrors } from './support';

for (const route of ROUTES) {
  test(`${route.label} renders cleanly and passes axe`, async ({ page }, info) => {
    const errors = watchErrors(page);
    await openRoute(page, route.id);
    await expect(page.locator('main')).toHaveAttribute('aria-label', route.label);
    const dark = info.project.use.colorScheme === 'dark';
    await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'night' : 'light');
    // Let lazy art, fonts and idle preloads settle before reading the page.
    await page.waitForLoadState('networkidle');
    await expectNoAxeViolations(page, info);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('the tab bar or sidebar moves between all five routes', async ({ page }) => {
  const errors = watchErrors(page);
  await openRoute(page, 'today');
  for (const route of ROUTES.slice(1)) {
    await page.getByRole('link', { name: route.label, exact: true }).locator('visible=true').first().click();
    await expect(page).toHaveURL(new RegExp(`#/${route.id}$`));
    await expect(page.locator('main h1')).toBeVisible();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

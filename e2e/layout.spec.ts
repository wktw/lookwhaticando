/** DESIGN §11.2: no horizontal overflow at 320 px, on any route. */
import { expect, test } from '@playwright/test';
import { horizontalOverflow, openRoute, ROUTES, watchErrors } from './support';

for (const route of ROUTES) {
  test(`${route.label} reflows at 320 px`, async ({ page }) => {
    const errors = watchErrors(page);
    await openRoute(page, route.id);
    await page.waitForLoadState('networkidle');
    const o = await horizontalOverflow(page);
    expect(o.scrollWidth, `the page scrolls sideways at ${o.clientWidth} px:\n${o.culprits.join('\n')}`).toBeLessThanOrEqual(o.clientWidth);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

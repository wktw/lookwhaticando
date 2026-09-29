/** Shared e2e helpers: error capture, route opening and the axe check. */
import { expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES, TAB_IDS, type TabId } from '../src/app/routes';

export { ROUTES, TAB_IDS, type TabId };

/** The axe rule sets catkin is held to (DESIGN §11.2: WCAG AA, plus axe's best practices). */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Collect uncaught errors and console errors from the moment it's called. Failed network loads
 * show up too (a missing chunk, font or icon logs a console error).
 */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

/**
 * Open a route the way a person would: load the app, then follow the hash. Resolves once the
 * screen's heading is visible (every screen has exactly one h1 inside <main>).
 */
export async function openRoute(page: Page, tab: TabId, base = './'): Promise<void> {
  const url = `${base}#/${tab}`;
  if (page.url() === 'about:blank') {
    // A first boot is onboarding now (and, in an iPhone Safari tab, the install gate first).
    await page.goto(url);
    const stay = page.getByRole('button', { name: 'Keep it in this tab' });
    const skip = page.getByRole('button', { name: 'Skip' });
    await expect(stay.or(skip).or(page.getByRole('navigation', { name: 'Main' }).first())).toBeVisible();
    if (await stay.isVisible()) await stay.click();
    while (await skip.isVisible()) await skip.click(); // sill → pick (nothing planted) → cabinets → Today
    await page.evaluate((t) => (location.hash = `#/${t}`), tab);
  } else await page.evaluate((t) => (location.hash = `#/${t}`), tab);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
}

/** Fails the test with a readable list when axe finds anything. */
export async function expectNoAxeViolations(page: Page, info: TestInfo): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const lines = result.violations.flatMap((v) => [`${v.id} (${v.impact ?? 'n/a'}): ${v.help}`, ...v.nodes.slice(0, 5).map((n) => `    ${n.target.join(' ')}  ${(n.failureSummary ?? '').replace(/\s+/g, ' ')}`)]);
  if (lines.length) await info.attach('axe-violations', { body: lines.join('\n'), contentType: 'text/plain' });
  expect(lines, `axe found ${result.violations.length} violation(s):\n${lines.join('\n')}`).toEqual([]);
}

/** Horizontal overflow: the document must never scroll sideways (DESIGN §11.2, 320 px reflow). */
export async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number; culprits: string[] }> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const culprits: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || (r.right <= vw + 1 && r.left >= -1)) continue;
      // Anything inside a clipping or scrolling box is fine (carousels, scenes).
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox !== 'visible') {
          clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (!clipped && getComputedStyle(el).position !== 'fixed') culprits.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className?.toString() ?? '').slice(0, 40)} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: vw, culprits: culprits.slice(0, 8) };
  });
}

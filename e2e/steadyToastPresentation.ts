import type { Page } from '@playwright/test';

/**
 * Reparenting live notes restarts their entrance fade, and another note can arrive during axe.
 * Audit their steady presentation without changing base opacity, colours, content, actions or
 * application clocks. The journey and the notes' art retain ordinary motion; this temporary
 * rule covers only card/text motion for each explicit scan, including notes inserted mid-scan.
 */
export async function withSteadyToastPresentation(page: Page, audit: () => Promise<void>) {
  const style = await page.addStyleTag({ content: `
    [data-toast-id], [data-toast-id] > div:has(> p) {
      animation: none !important;
      transition: none !important;
    }
  ` });
  try {
    await audit();
  } finally {
    await style.evaluate(node => { node.parentNode?.removeChild(node); });
    await style.dispose();
  }
}

/** The #overlay-root portal target for sheets, dialogs, toasts and banners (created on demand). */
export function overlayRoot(): HTMLElement {
  let el = document.getElementById('overlay-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'overlay-root';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Base z-index for sheets; each stacked sheet adds 2. The full scale above the app:
 * sheets 100+ · toasts 200 · celebration banners 250 · epic moment 260 · confetti 280 · fx sprites 300.
 */
export const Z_SHEET = 100;

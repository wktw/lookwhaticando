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
 * sheets 100+ · toasts 200 · epic scrim 240 · confetti 245 · epic card 248 · celebration banners 250
 * · fx sprites 300. Confetti flies over dimmed pages but behind the cards it bursts out from.
 */
export const Z_SHEET = 100;

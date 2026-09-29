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
 * sheets 100+ · notes (toasts) 200 · epic dimmed room 240 · petals 245 · epic card 248 ·
 * celebration notes 250 · fx sprites (the coin, chips, the glint) 300. Petals drift over a dimmed
 * page but behind the note they fall from, so they never cross its words.
 */
export const Z_SHEET = 100;

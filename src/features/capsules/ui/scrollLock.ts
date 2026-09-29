let locks = 0;
let saved = '';

/**
 * Lock page scroll under a modal. Locks nest (a wish reveal opens while its sheet is still
 * closing), and the page scrolls again only when the last one is released, in any order.
 */
export function lockScroll(): () => void {
  const root = document.documentElement;
  if (locks++ === 0) {
    saved = root.style.overflow;
    root.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) root.style.overflow = saved;
  };
}

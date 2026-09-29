/**
 * Shared bookkeeping for stacked modal layers (sheets, dialogs, the capsule reveal, the epic
 * celebration): who is on top (owns Esc + focus), background `inert`, and a scroll lock that also
 * holds on iOS. A full-screen *moment* (the reveal, the epic card) also asks celebration banners
 * and toasts to wait until it closes, so nothing draws over it (see momentOpen).
 */
const stack: string[] = [];
const moments = new Set<string>();
const listeners = new Set<() => void>();

let lockedScrollY = 0;
let savedBodyStyle = '';

function lockScroll() {
  const body = document.body;
  lockedScrollY = window.scrollY;
  savedBodyStyle = body.getAttribute('style') ?? '';
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  // position:fixed is the only lock iOS Safari fully honors; offset keeps the page where it was.
  body.style.position = 'fixed';
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.overflow = 'hidden';
  if (gutter > 0) body.style.paddingRight = `${gutter}px`;
}

function unlockScroll() {
  const body = document.body;
  if (savedBodyStyle) body.setAttribute('style', savedBodyStyle);
  else body.removeAttribute('style');
  window.scrollTo(0, lockedScrollY);
}

function setAppInert(inert: boolean) {
  const app = document.getElementById('app');
  if (app) app.inert = inert;
}

function notify() {
  for (const fn of listeners) fn();
}

export interface LayerOptions {
  /** A full-screen moment (the capsule reveal, the epic card): banners and toasts wait for it. */
  moment?: boolean;
}

export function pushLayer(id: string, opts: LayerOptions = {}): void {
  if (stack.includes(id)) return;
  if (opts.moment) moments.add(id);
  if (!stack.length) {
    lockScroll();
    setAppInert(true);
  }
  stack.push(id);
  notify();
}

export function removeLayer(id: string): void {
  const i = stack.indexOf(id);
  if (i < 0) return;
  stack.splice(i, 1);
  moments.delete(id);
  if (!stack.length) {
    setAppInert(false);
    unlockScroll();
  }
  notify();
}

export function isTopLayer(id: string): boolean {
  return stack[stack.length - 1] === id;
}

/** 0 for the top layer, 1 for the one under it… (-1 when not open). */
export function layerDepth(id: string): number {
  const i = stack.indexOf(id);
  return i < 0 ? -1 : stack.length - 1 - i;
}

export function layerIndex(id: string): number {
  return stack.indexOf(id);
}

export function anyLayerOpen(): boolean {
  return stack.length > 0;
}

/** A full-screen moment is open (the capsule reveal, the epic card), optionally ignoring one of them. */
export function momentOpen(except?: string): boolean {
  for (const id of moments) if (id !== except) return true;
  return false;
}

export function onLayersChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

function isVisible(el: HTMLElement): boolean {
  return typeof el.checkVisibility === 'function' ? el.checkVisibility() : !el.closest('[hidden]');
}

export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => isVisible(el) || el === document.activeElement);
}

/** Keep Tab / Shift+Tab cycling inside `root`. Call from a keydown handler. */
export function trapTab(e: KeyboardEvent, root: HTMLElement): void {
  if (e.key !== 'Tab') return;
  const items = focusables(root);
  if (!items.length) {
    e.preventDefault();
    root.focus();
    return;
  }
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

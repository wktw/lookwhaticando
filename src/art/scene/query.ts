/** Finding a pet's actor in a scene by its key, without CSS.escape (keys are free text; jsdom has no CSS.escape). */
export function petNode(root: ParentNode | null | undefined, key: string): HTMLElement | null {
  if (!root) return null;
  for (const el of root.querySelectorAll<HTMLElement>('[data-pet]')) if (el.dataset.pet === key) return el;
  return null;
}

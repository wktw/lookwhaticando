/** An iPhone or iPad (iPadOS reports a Mac with touch). */
export function isAppleTouch(ua: string = navigator.userAgent, platform: string = navigator.platform, touch: number = navigator.maxTouchPoints ?? 0): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touch > 1);
}

/**
 * Whether "Add to calendar" should use the static file: an iPhone or iPad running the hosted app
 * (a generated file can't reach Calendar from the installed app, and the tab does the same for
 * consistency). The single file has no public folder, so it always makes the file itself.
 */
export function wantsStaticCal(env: { single: boolean; protocol: string; appleTouch: boolean }): boolean {
  return !env.single && /^https?:$/.test(env.protocol) && env.appleTouch;
}

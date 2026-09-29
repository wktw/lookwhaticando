/** The Today band's collapse (DESIGN §9.1): 168 px open, 64 px stuck under the status bar. */

export const BAND_OPEN_PX = 168;
export const BAND_CLOSED_PX = 64;
/**
 * While it collapses, the sill slides down this share of the crop, so that at 64 px the pot rims and
 * the residents' heads sit in the lower 40 px (under the screen's short date chip), not sliced.
 */
export const BAND_FOLLOW = 0.4;

export interface BandCollapse {
  /** 0 open … 1 collapsed, clamped. */
  t: number;
  /** Pixels cropped off the top (the band is translated up by the same). */
  clip: number;
  /** Pixels the scene inside slides down, keeping the pots under the crop. */
  follow: number;
  /** The visible height. */
  height: number;
}

/** Collapse math, for transforms and a clip only (never re-layout). */
export function bandCollapse(collapse: number, open = BAND_OPEN_PX, closed = BAND_CLOSED_PX): BandCollapse {
  const t = Number.isFinite(collapse) ? Math.min(1, Math.max(0, collapse)) : 0;
  const range = Math.max(0, open - closed);
  const clip = +(range * t).toFixed(2);
  return { t, clip, follow: +(clip * BAND_FOLLOW).toFixed(2), height: +(open - clip).toFixed(2) };
}

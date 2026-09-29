/** Confetti & particle bursts on a shared overlay canvas. STUB: implemented by the fxui module. */
export interface BurstOptions {
  /** Viewport coordinates of the origin. Defaults to screen center. */
  x?: number;
  y?: number;
  /** Relative size of the celebration. */
  intensity?: 'tiny' | 'small' | 'medium' | 'big' | 'epic';
  /** Particle shapes to use. */
  shapes?: ('petal' | 'heart' | 'star' | 'circle' | 'sparkle' | 'coin')[];
  /** CSS colors; defaults to the pastel palette. */
  colors?: string[];
}

export function burst(_opts: BurstOptions = {}): void {}

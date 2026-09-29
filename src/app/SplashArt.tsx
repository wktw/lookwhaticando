import { PetArt } from '@/art/pets/PetArt';
import { Sparkle } from '@/ui/Sparkle';
import s from './SplashArt.module.css';

/**
 * The launch screen (rendered to PNG by scripts/generate-icons.mjs for iOS startup images):
 * Mochi on a soft glow with the wordmark, in the light or night palette.
 */
export function SplashArt({ theme = 'light', width, height }: { theme?: 'light' | 'night'; width: number; height: number }) {
  const unit = Math.min(width, height);
  return (
    <div class={s.splash} data-splash={theme} style={{ width: `${width}px`, height: `${height}px`, '--u': `${unit / 100}px` }}>
      <div class={s.glow} />
      <div class={s.center}>
        <PetArt petId="pet-mochi" size={unit * 0.44} expression={theme === 'night' ? 'sleep' : 'idle'} />
        <p class={s.wordmark}>
          Mochi <span>Meadow</span>
        </p>
      </div>
      <Sparkle class={s.s1} size={unit * 0.06} />
      <Sparkle class={s.s2} size={unit * 0.035} />
      <Sparkle class={s.s3} size={unit * 0.045} />
    </div>
  );
}

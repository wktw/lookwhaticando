import { Wordmark } from '@/art/icons/brand';
import { DAY_LIGHT, NIGHT_LIGHT } from '@/art/light';
import s from './SplashArt.module.css';

/**
 * The launch screen (rendered to PNG by scripts/generate-icons.mjs for the iOS startup images): the
 * app's own paper, the catkin sprig and the lowercase wordmark, a little above centre. Light is paper
 * (#FAF6EF); night is lamplight's indigo paper (#1E1A22), so the first paint matches either theme.
 */
export function SplashArt({ theme = 'light', width, height }: { theme?: 'light' | 'night'; width: number; height: number }) {
  const unit = Math.min(width, height) / 100;
  return (
    <div class={s.splash} data-splash={theme} style={{ width: `${width}px`, height: `${height}px` }}>
      <div class={s.center}>
        <Wordmark size={Math.round(unit * 13 * 10) / 10} light={theme === 'night' ? NIGHT_LIGHT : DAY_LIGHT} />
      </div>
    </div>
  );
}

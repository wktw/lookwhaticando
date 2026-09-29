/**
 * The launch screen (rendered to PNG by scripts/generate-icons.mjs for the iOS startup images): the app's own paper,
 * the icon's scene (the black cat on the pot rim, the Holstein calf beside it, DESIGN §1 "Many animals") and the
 * lowercase wordmark, a little above centre. Light is paper (#FAF6EF); night is Lamplight's indigo paper (#1E1A22), so
 * the first paint matches either theme. At night the scene is lit by the lamp, like the room.
 */
import { Wordmark } from './brand';
import { DAY_LIGHT, NIGHT_LIGHT } from '@/art/light';
import { IconScene } from './appIcon';

export const SPLASH_PAPER = { light: { bg: '#FAF6EF', ink: '#3B3236' }, night: { bg: '#1E1A22', ink: '#F4EDE6' } } as const;

export function LaunchArt({ theme = 'light', width, height }: { theme?: 'light' | 'night'; width: number; height: number }) {
  const unit = Math.min(width, height) / 100;
  const paper = SPLASH_PAPER[theme];
  return (
    <div
      data-splash={theme}
      style={{ position: 'relative', display: 'grid', placeItems: 'center', overflow: 'hidden', width: `${width}px`, height: `${height}px`, background: paper.bg, color: paper.ink }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: `${(unit * 3).toFixed(1)}px`, transform: 'translateY(-6%)' }}>
        <IconScene size={Math.round(unit * 34)} night={theme === 'night'} />
        <Wordmark size={Math.round(unit * 11 * 10) / 10} light={theme === 'night' ? NIGHT_LIGHT : DAY_LIGHT} />
      </div>
    </div>
  );
}

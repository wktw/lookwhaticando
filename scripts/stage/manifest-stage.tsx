/**
 * Bare stages for scripts/manifest-assets.mjs (dev server only, never built):
 *  - ?maskable=<px>             the app icon inside the maskable safe zone (AppIconArt 'maskable')
 *  - ?shortcut=<icon>&size=<px> a home-screen shortcut: the tab's own glyph, active colours, on paper
 * Each renders exactly one square #stage-art and nothing else.
 */
import { render } from 'preact';
import '@/styles/global.css';
import { AppIconArt } from '@/app/AppIconArt';
import { Icon, type IconName } from '@/art/icons';

const params = new URLSearchParams(location.search);
const maskable = Number(params.get('maskable')) || 0;
const shortcut = params.get('shortcut') as IconName | null;
const size = maskable || Number(params.get('size')) || 96;

function Stage() {
  if (maskable) return <AppIconArt size={size} shape="maskable" />;
  if (shortcut) {
    // Launchers crop shortcut icons to a circle or squircle: the glyph stays in the middle 60%.
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <Icon name={shortcut} size={Math.round(size * 0.56)} filled />
      </div>
    );
  }
  return null;
}

render(
  <div id="stage-art" style={{ width: `${size}px`, height: `${size}px`, lineHeight: 0 }}>
    <Stage />
  </div>,
  document.getElementById('stage')!,
);

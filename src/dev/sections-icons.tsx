/**
 * Gallery sections for the icons module. View all with /gallery.html?only=icons, one with ?only=<id>:
 * icons-brand, icons-appicon, icons-splash, icons-install, icons-tabs, icons-currency, icons-pins,
 * icons-pinsizes, icons-habits, icons-habittones, icons-glyphs. Add &theme=night for lamplight; the dark
 * panels also carry the night tokens inline, so day and night sit side by side.
 * icons-appicon&stage=<shape>&size=<px> and icons-splash&splash=<theme>&w&h are the bare stages that
 * scripts/generate-icons.mjs screenshots.
 */
import type { ComponentChildren, JSX } from 'preact';
import { CatkinSprig, Wordmark } from '@/art/icons/brand';
import { Icon, ICON_ALIASES, ICON_NAMES, CoinIcon, StampIcon, SwapIcon, TicketIcon, type IconName } from '@/art/icons';
import { NIGHT_LIGHT } from '@/art/light';
import { AppIconArt, type AppIconShape } from '@/app/AppIconArt';
import { SplashArt } from '@/app/SplashArt';
import { GumballArt } from '@/app/GumballArt';
import { AddToHomeArt, AndroidMenuArt, ChromeInstallArt, CompactShareArt, DockArt, HomeScreenArt, MacDockArt, ShareStepArt, ViewMoreArt } from '@/app/installArt';
import { BadgeMedal } from '@/art/badges';
import { BADGES } from '@/catalog/badges';
import { HabitIcon } from '@/art/habit-icons';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { PASTELS } from '@/catalog/types';
import type { GallerySection } from './sections';

/**
 * A self-contained Lamplight panel: the night tokens this module reads, set inline, plus
 * data-theme="night" for theme-aware CSS. So night art can sit beside day art on one page.
 */
const NIGHT_TOKENS = {
  '--bg': '#1e1a22',
  '--card': '#2d2733',
  '--ink': '#f4ede6',
  '--ink-2': '#cfc5c9',
  '--ink-3': '#afa3a9',
  '--ink-disabled': '#7d7280',
  '--line': '#3d3545',
  '--blush-300': '#86506a',
  '--blush-700': '#f6c9d3',
  '--lavender-300': '#5e5084',
  '--shadow-sm': '0 1px 0 rgba(0, 0, 0, 0.2), 0 2px 8px -4px rgba(0, 0, 0, 0.5)',
};
const NIGHT = { ...NIGHT_TOKENS, background: '#1E1A22', color: '#F4EDE6', borderRadius: '18px', padding: '18px' } as JSX.CSSProperties;
const DAY: JSX.CSSProperties = { background: '#FAF6EF', color: '#3B3236', borderRadius: '18px', padding: '18px' };

function Caption({ children }: { children: ComponentChildren }) {
  return <small style={{ fontSize: '11px', color: 'inherit', opacity: 0.75, textAlign: 'center', lineHeight: 1.2 }}>{children}</small>;
}

function Brand() {
  return (
    <div class="gal-row" style={{ gap: '18px', alignItems: 'stretch' }}>
      <div style={{ ...DAY, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Wordmark size={64} />
        <Wordmark size={32} />
        <Wordmark size={18} />
        <Wordmark size={32} sprig={false} />
        <div class="gal-row" style={{ alignItems: 'flex-end' }}>
          {[160, 96, 48, 32, 20].map((s) => (
            <CatkinSprig key={s} size={s} />
          ))}
        </div>
      </div>
      <div data-theme="night" style={{ ...NIGHT, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Wordmark size={64} />
        <Wordmark size={32} />
        <Wordmark size={18} />
        <Wordmark size={32} sprig={false} />
        <div class="gal-row" style={{ alignItems: 'flex-end' }}>
          {[160, 96, 48, 32, 20].map((s) => (
            <CatkinSprig key={s} size={s} light={NIGHT_LIGHT} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Fixed wallpaper fills (not theme tokens), so each panel reads the same in either gallery theme. */
const WALLPAPERS = [
  { name: 'On a light wallpaper', bg: '#EDE7DF', ink: '#3B3236' },
  { name: 'On a dark wallpaper', bg: '#2A2530', ink: '#EEE8EC' },
];
/** Browser tab strips for the favicon: a pale one and a dark one. */
const TAB_STRIPS = [
  { name: 'Favicon on a light tab strip', bg: '#F1F3F4', ink: '#3B3236' },
  { name: 'Favicon on a dark tab strip', bg: '#35363A', ink: '#EEE8EC' },
];

function AppIcons({ params }: { params: URLSearchParams }) {
  const stage = params.get('stage') as AppIconShape | null;
  if (stage) {
    // A bare stage for scripts/generate-icons.mjs: exactly one icon, nothing else.
    const size = Number(params.get('size')) || 512;
    return (
      <div id="icon-stage" style={{ width: `${size}px`, height: `${size}px`, lineHeight: 0 }}>
        <AppIconArt size={size} shape={stage} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <AppIconArt size={1024} shape="squircle" title="catkin app icon, 1024 px" />
      {WALLPAPERS.map((w) => (
        <div key={w.name} style={{ background: w.bg, borderRadius: '18px', padding: '18px 22px 22px', color: w.ink }}>
          <h3 style={{ margin: '0 0 14px', font: '600 13px/1.2 var(--font-ui, system-ui)', color: w.ink }}>{w.name}</h3>
          <div class="gal-row" style={{ gap: '26px', alignItems: 'flex-end' }}>
            {[180, 60, 29].map((s) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <AppIconArt size={s} shape="squircle" />
                <Caption>{s}</Caption>
              </div>
            ))}
            {(['square', 'maskable'] as const).map((shape) => (
              <div key={shape} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <AppIconArt size={120} shape={shape} />
                <Caption>{shape}</Caption>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div class="gal-row" style={{ gap: '18px' }}>
        {TAB_STRIPS.map((t) => (
          <div key={t.name} style={{ background: t.bg, borderRadius: '12px', padding: '14px 18px', color: t.ink }}>
            <h3 style={{ margin: '0 0 10px', font: '600 13px/1.2 var(--font-ui, system-ui)', color: t.ink }}>{t.name}</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[16, 32, 64].map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', font: '12px system-ui' }}>
                  <AppIconArt size={s} shape="favicon" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_NAMES: IconName[] = ['tab-today', 'tab-progress', 'tab-capsules', 'tab-shelf', 'tab-you'];
const TAB_LABELS = ['Today', 'Progress', 'Capsules', 'Shelf', 'You'];
const GLYPH_NAMES = ICON_NAMES.filter((n) => !n.startsWith('tab-') && !ICON_ALIASES[n]);

/** A tab bar mock: one tab active at a time, inactive tabs in --ink-2 like the app shell. */
function TabBarMock({ active }: { active: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        width: '380px',
        padding: '10px 6px 8px',
        borderRadius: '22px',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--ink-2)',
      }}
    >
      {TAB_NAMES.map((n, i) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: i === active ? 'var(--ink)' : 'var(--ink-2)' }}>
          <Icon name={n} size={26} filled={i === active} />
          <span style={{ fontSize: '11px', fontWeight: i === active ? 800 : 650 }}>{TAB_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Tabs() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div key={String(night)} data-theme={night ? 'night' : 'light'} style={{ ...(night ? NIGHT : DAY), display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div class="gal-row" style={{ gap: '22px', color: 'var(--ink-2)' }}>
            {TAB_NAMES.map((n) => (
              <div key={n} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[24, 28, 48].map((s) => (
                  <Icon key={s} name={n} size={s} />
                ))}
                {[24, 28, 48].map((s) => (
                  <span key={s} style={{ color: 'var(--ink)' }}>
                    <Icon name={n} size={s} filled />
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div class="gal-row">
            {TAB_NAMES.map((n, i) => (
              <TabBarMock key={n} active={i} />
            ))}
          </div>
          <div class="gal-row" style={{ alignItems: 'flex-end' }}>
            {[28, 36, 40, 64, 120].map((sz) => (
              <GumballArt key={sz} size={sz} />
            ))}
            <Caption>the raised Capsules mark (GumballArt)</Caption>
          </div>
        </div>
      ))}
    </div>
  );
}

const TOKENS = [
  { name: 'Coin', C: CoinIcon },
  { name: 'Stamp', C: StampIcon },
  { name: 'Swap', C: SwapIcon },
  { name: 'Ticket', C: TicketIcon },
];

function Tokens({ fs }: { fs: number }) {
  const t = { width: `${fs * 1.15}px`, height: `${fs * 1.15}px` };
  return (
    <p style={{ fontSize: `${fs}px`, margin: 0, lineHeight: 1.5 }}>
      Walk, watered. +5 <CoinIcon style={t} /> · 3 <StampIcon style={t} /> enclosed · <SwapIcon count={4} style={t} /> 4 of 10 swaps · 1{' '}
      <TicketIcon style={t} /> on the sill.
    </p>
  );
}

function Currency() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div key={String(night)} data-theme={night ? 'night' : 'light'} style={{ ...(night ? NIGHT : DAY), display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div class="gal-row" style={{ gap: '28px', alignItems: 'flex-end' }}>
            {TOKENS.map(({ name, C }) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div class="gal-row" style={{ gap: '10px', alignItems: 'flex-end' }}>
                  {[96, 48, 20, 14].map((s) => (
                    <C key={s} size={s} />
                  ))}
                </div>
                <Caption>{name}</Caption>
              </div>
            ))}
          </div>
          <div class="gal-row" style={{ gap: '6px' }}>
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <SwapIcon count={i} size={40} />
                <Caption>{i}</Caption>
              </div>
            ))}
          </div>
          <Tokens fs={15} />
          <Tokens fs={20} />
        </div>
      ))}
    </div>
  );
}

function Glyphs({ params }: { params: URLSearchParams }) {
  const zoom = Number(params.get('zoom')) || 0;
  const sizes = zoom ? [zoom] : [20, 28];
  const only = params.get('names')?.split(',');
  const names = only ? GLYPH_NAMES.filter((n) => only.includes(n)) : GLYPH_NAMES;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div
          key={String(night)}
          data-theme={night ? 'night' : 'light'}
          style={{ ...(night ? NIGHT : DAY), display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${zoom ? zoom + 30 : 104}px, 1fr))`, gap: '10px' }}
        >
          {names.map((n) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--ink)' }}>
              <div class="gal-row" style={{ gap: '10px', alignItems: 'center' }}>
                {sizes.map((s) => (
                  <Icon key={s} name={n} size={s} filled={n === 'heart'} />
                ))}
                {!zoom && <Icon name={n} size={28} style={{ color: 'var(--blush-700)' }} />}
              </div>
              <Caption>{n}</Caption>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Pins({ params }: { params: URLSearchParams }) {
  const size = Number(params.get('zoom')) || 88;
  const only = params.get('ids')?.split(',');
  const badges = only ? BADGES.filter((b) => only.includes(b.id)) : BADGES;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div
          key={String(night)}
          data-theme={night ? 'night' : 'light'}
          style={{ ...(night ? NIGHT : DAY), display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${size * 2 + 24}px, 1fr))`, gap: '14px 10px' }}
        >
          {badges.map((b) => (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div class="gal-row" style={{ gap: '6px' }}>
                <BadgeMedal badgeId={b.id} earned size={size} title={b.name} />
                <BadgeMedal badgeId={b.id} earned={false} size={size} title={`${b.name}, not yet`} />
              </div>
              <Caption>
                {b.name} · {b.color}
              </Caption>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PinSizes() {
  const picks = ['first-checkin', 'checkins-100', 'first-capsule', 'wind-down', 'first-harvest', 'steady-month'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div key={String(night)} data-theme={night ? 'night' : 'light'} style={{ ...(night ? NIGHT : DAY) }}>
          <div class="gal-row" style={{ gap: '10px', alignItems: 'flex-end' }}>
            {picks.map((id) => [32, 48, 64, 120].map((s) => <BadgeMedal key={`${id}-${s}`} badgeId={id} earned size={s} />))}
          </div>
          <div class="gal-row" style={{ gap: '10px', alignItems: 'flex-end', marginTop: '10px' }}>
            {picks.map((id) => [32, 48, 64, 120].map((s) => <BadgeMedal key={`${id}-${s}`} badgeId={id} earned={false} size={s} />))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** All 48 habit icons at 20 and 40 px, each in a different family, on day and night cards. */
function HabitIcons({ params }: { params: URLSearchParams }) {
  const zoom = Number(params.get('zoom')) || 0;
  const only = params.get('ids')?.split(',');
  const icons = only ? HABIT_ICONS.filter((i) => only.includes(i.id)) : HABIT_ICONS;
  const sizes = zoom ? [zoom] : [20, 40];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[false, true].map((night) => (
        <div
          key={String(night)}
          data-theme={night ? 'night' : 'light'}
          style={{ ...(night ? NIGHT : DAY), display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${zoom ? zoom + 24 : 96}px, 1fr))`, gap: '12px 8px' }}
        >
          {icons.map((icon, i) => (
            <div key={icon.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div class="gal-row" style={{ gap: '8px', alignItems: 'center' }}>
                {sizes.map((s) => (
                  <HabitIcon key={s} id={icon.id} tone={PASTELS[i % PASTELS.length]} size={s} title={icon.label} />
                ))}
              </div>
              <Caption>{icon.id}</Caption>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** One icon in all eight families (&id=water). */
function HabitTones({ params }: { params: URLSearchParams }) {
  const ids = (params.get('id') ?? 'water,book,watering-can,piggy-bank').split(',');
  return (
    <div style={{ ...DAY, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ids.map((id) => (
        <div key={id} class="gal-row" style={{ gap: '10px' }}>
          {PASTELS.map((t) => (
            <HabitIcon key={t} id={id} tone={t} size={40} />
          ))}
          {PASTELS.map((t) => (
            <HabitIcon key={`${t}-20`} id={id} tone={t} size={20} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Splash({ params }: { params: URLSearchParams }) {
  const theme = params.get('splash') as 'light' | 'night' | null;
  if (theme) {
    // A bare full-screen stage for scripts/generate-icons.mjs.
    const w = Number(params.get('w')) || 390;
    const h = Number(params.get('h')) || 844;
    return (
      <div id="splash-stage" style={{ position: 'fixed', inset: 0, zIndex: 9999 } as JSX.CSSProperties}>
        <SplashArt theme={theme} width={w} height={h} />
      </div>
    );
  }
  return (
    <div class="gal-row" style={{ gap: '18px', alignItems: 'flex-start' }}>
      {(['light', 'night'] as const).map((t) => (
        <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ borderRadius: '28px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <SplashArt theme={t} width={236} height={512} />
          </div>
          <Caption>{t} · 236 × 512</Caption>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{ borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <SplashArt theme="light" width={375} height={667} />
        </div>
        <Caption>SE · 375 × 667</Caption>
      </div>
    </div>
  );
}

const INSTALL_ART = [
  { name: 'ShareStepArt', A: () => <ShareStepArt /> },
  { name: 'ShareStepArt · address bar', A: () => <ShareStepArt inAddressBar /> },
  { name: 'CompactShareArt', A: CompactShareArt },
  { name: 'ViewMoreArt', A: ViewMoreArt },
  { name: 'AddToHomeArt', A: AddToHomeArt },
  { name: 'HomeScreenArt', A: HomeScreenArt },
  { name: 'MacDockArt', A: MacDockArt },
  { name: 'DockArt', A: DockArt },
  { name: 'ChromeInstallArt', A: ChromeInstallArt },
  { name: 'AndroidMenuArt', A: AndroidMenuArt },
];

function Install() {
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {INSTALL_ART.map(({ name, A }) => (
        <div key={name} class="gal-cell">
          <A />
          <Caption>{name}</Caption>
        </div>
      ))}
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  { id: 'icons-brand', title: 'Wordmark and sprig · day and lamplight', render: () => <Brand /> },
  { id: 'icons-appicon', title: 'App icon · 1024, 180, 60, 29 px on light and dark wallpapers', render: (p) => <AppIcons params={p} /> },
  { id: 'icons-splash', title: 'Launch screens · paper, the sprig and the wordmark', render: (p) => <Splash params={p} /> },
  { id: 'icons-install', title: 'Install guide art (&theme=night for lamplight)', render: () => <Install /> },
  { id: 'icons-tabs', title: 'Tab icons · inactive and active at 24, 28, 48 px · day and lamplight', render: () => <Tabs /> },
  { id: 'icons-currency', title: 'Currency tokens · 96, 48, 20, 14 px and inline at 15 and 20 px', render: () => <Currency /> },
  { id: 'icons-pins', title: 'Pins · earned and not yet (&zoom=<px>, &ids=a,b)', render: (p) => <Pins params={p} /> },
  { id: 'icons-pinsizes', title: 'Pins at 32, 48, 64, 120 px', render: () => <PinSizes /> },
  { id: 'icons-habits', title: 'Habit icons · all 48 at 20 and 40 px (&zoom=<px>, &ids=a,b)', render: (p) => <HabitIcons params={p} /> },
  { id: 'icons-habittones', title: 'Habit icons in every family (&id=a,b)', render: (p) => <HabitTones params={p} /> },
  { id: 'icons-glyphs', title: 'UI glyphs · 20 and 28 px (&zoom=<px> for one size, &names=a,b to filter)', render: (p) => <Glyphs params={p} /> },
];

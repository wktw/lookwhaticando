/**
 * Gallery sections for the icons module: UI glyphs, tab icons, currency, habit icons, badge
 * medals and an in-context mock. View all with /gallery.html?only=icons, one with ?only=<id>.
 * Review helpers: `&zoom=<px>` enlarges the UI, habit and badge grids; `&ids=a,b` filters the
 * habit showcase and badge grid.
 */
import type { ComponentChildren, JSX } from 'preact';
import { Icon, ICON_NAMES, CoinIcon, StarIcon, StardustIcon, TicketIcon, type IconName } from '@/art/icons';
import { HabitIcon } from '@/art/habit-icons';
import { BadgeMedal } from '@/art/badges';
import { BADGES } from '@/catalog/badges';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { PASTELS } from '@/catalog/types';
import type { GallerySection } from './sections';

const TAB_NAMES = ICON_NAMES.filter((n) => n.startsWith('tab-'));
const UI_NAMES = ICON_NAMES.filter((n) => !n.startsWith('tab-'));

/** A self-contained "Moonlight Meadow" surface, so night colors can sit beside light ones. */
const NIGHT: JSX.CSSProperties = { background: '#221C30', color: '#F8EEF3', borderRadius: '18px', padding: '14px' };
const NIGHT_CARD = '#342C4B';
const zoomOf = (params: URLSearchParams) => Number(params.get('zoom')) || 0;

function Label({ children }: { children: ComponentChildren }) {
  return <small style={{ fontSize: '11px', color: 'inherit', opacity: 0.75, textAlign: 'center', lineHeight: 1.2 }}>{children}</small>;
}

function GlyphCell({ name, color, card, zoom }: { name: IconName; color: string; card?: string; zoom: number }) {
  const sizes = zoom ? [zoom] : [20, 24, 32];
  return (
    <div class="gal-cell" style={{ color, ...(card ? { background: card, boxShadow: 'none' } : {}) }}>
      <div class="gal-row" style={{ gap: '10px' }}>
        {sizes.map((s) => (
          <Icon key={s} name={name} size={s} />
        ))}
      </div>
      <Label>{name}</Label>
    </div>
  );
}

function GlyphGrid({ color, card, zoom }: { color: string; card?: string; zoom: number }) {
  return (
    <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${zoom ? zoom + 40 : 130}px, 1fr))`, gap: '10px' }}>
      {UI_NAMES.map((n) => (
        <GlyphCell key={n} name={n} color={color} card={card} zoom={zoom} />
      ))}
    </div>
  );
}

/** A mock tab bar: one tab active at a time, like the real app shell. */
function TabBar({ active, ink, activeInk, surface }: { active: IconName; ink: string; activeInk: string; surface: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', background: surface, borderRadius: '22px', padding: '10px 6px', width: '360px' }}>
      {TAB_NAMES.map((n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: n === active ? activeInk : ink }}>
          <Icon name={n} size={28} filled={n === active} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600 }}>{n.slice(4)}</span>
        </div>
      ))}
    </div>
  );
}

const CURRENCY = [
  { name: 'Coin', C: CoinIcon },
  { name: 'Star', C: StarIcon },
  { name: 'Stardust', C: StardustIcon },
  { name: 'Ticket', C: TicketIcon },
];

export const SECTIONS: GallerySection[] = [
  {
    id: 'icons-ui',
    title: 'UI icons · 20 / 24 / 32 px · ink, accent, night',
    render: (params) => {
      const zoom = zoomOf(params);
      return (
        <div style={{ display: 'grid', gap: '16px' }}>
          <GlyphGrid color="var(--ink)" zoom={zoom} />
          <GlyphGrid color="var(--blush-700)" zoom={zoom} />
          <div style={NIGHT}>
            <GlyphGrid color="#F8EEF3" card={NIGHT_CARD} zoom={zoom} />
          </div>
        </div>
      );
    },
  },
  {
    id: 'icons-tabs',
    title: 'Tab icons · outline & filled (active)',
    render: () => (
      <div style={{ display: 'grid', gap: '16px' }}>
        <div class="gal-row">
          {TAB_NAMES.map((n) => (
            <div class="gal-cell" key={n} style={{ color: 'var(--ink)' }}>
              <div class="gal-row" style={{ gap: '10px' }}>
                <Icon name={n} size={24} />
                <Icon name={n} size={24} filled />
                <Icon name={n} size={48} style={{ color: 'var(--ink-3)' }} />
                <Icon name={n} size={48} filled />
                <Icon name={n} size={120} />
                <Icon name={n} size={120} filled />
              </div>
              <Label>{n}</Label>
            </div>
          ))}
        </div>
        <div class="gal-row">
          {TAB_NAMES.map((n) => (
            <TabBar key={n} active={n} ink="var(--ink-3)" activeInk="var(--ink)" surface="var(--card)" />
          ))}
        </div>
        <div class="gal-row" style={NIGHT}>
          {TAB_NAMES.map((n) => (
            <TabBar key={n} active={n} ink="#8D7F9C" activeInk="#F8EEF3" surface={NIGHT_CARD} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'icons-currency',
    title: 'Currency · 16 / 24 / 48 px (+ stardust levels)',
    render: () => (
      <div style={{ display: 'grid', gap: '16px' }}>
        <div class="gal-row">
          {CURRENCY.map(({ name, C }) => (
            <div class="gal-cell" key={name}>
              <div class="gal-row" style={{ gap: '10px' }}>
                <C size={16} />
                <C size={24} />
                <C size={48} />
                <C size={120} />
              </div>
              <Label>{name}</Label>
            </div>
          ))}
        </div>
        <div class="gal-row">
          <div class="gal-cell">
            <div class="gal-row" style={{ gap: '10px' }}>
              {[0, 0.1, 0.3, 0.5, 0.7, 0.9, 1].map((l) => (
                <StardustIcon key={l} size={56} level={l} />
              ))}
            </div>
            <Label>Stardust level 0 · 0.1 · 0.3 · 0.5 · 0.7 · 0.9 · 1</Label>
          </div>
          <div class="gal-cell" style={{ background: NIGHT_CARD }}>
            <div class="gal-row" style={{ gap: '10px' }}>
              {CURRENCY.map(({ name, C }) => (
                <C key={name} size={32} />
              ))}
            </div>
            <Label>
              <span style={{ color: '#F8EEF3' }}>Night card</span>
            </Label>
          </div>
          <div class="gal-cell">
            <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px' }}>
              {CURRENCY.map(({ name, C }, i) => (
                <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <C size={18} title={name} /> {[128, 6, 4, 2][i]}
                </span>
              ))}
            </div>
            <Label>Wallet pill (18 px)</Label>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'icons-habits',
    title: 'Habit icons · every tone at 28 px (light + night card)',
    render: (params) => {
      const size = zoomOf(params) || 28;
      const grid: JSX.CSSProperties = { display: 'grid', gridTemplateColumns: `140px repeat(${PASTELS.length}, ${size + 6}px)`, gap: '4px 6px', alignItems: 'center' };
      return (
        <div class="gal-row" style={{ alignItems: 'flex-start', gap: '16px' }}>
          {[{ bg: 'var(--card)', ink: 'var(--ink-2)' }, { bg: NIGHT_CARD, ink: '#CBBCD0' }].map(({ bg, ink }) => (
            <div key={bg} style={{ ...grid, background: bg, color: ink, padding: '12px', borderRadius: '18px' }}>
              {HABIT_ICONS.map((icon) => [
                <small key={icon.id} style={{ fontSize: '11px' }}>
                  {icon.id}
                </small>,
                ...PASTELS.map((tone) => <HabitIcon key={`${icon.id}-${tone}`} id={icon.id} tone={tone} size={size} />),
              ])}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'icons-habits-showcase',
    title: 'Habit icons · 48 px showcase (&ids=a,b filters, &zoom=px enlarges)',
    render: (params) => {
      const size = zoomOf(params) || 48;
      const ids = params.get('ids')?.split(',');
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(96, size + 24)}px, 1fr))`, gap: '10px' }}>
          {HABIT_ICONS.filter((icon) => !ids || ids.includes(icon.id)).map((icon, i) => (
            <div class="gal-cell" key={icon.id}>
              <HabitIcon id={icon.id} tone={PASTELS[i % PASTELS.length]} size={size} title={icon.label} />
              <Label>
                {icon.label} · {icon.id}
              </Label>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'icons-badges',
    title: 'Badge medals · earned & unearned at 88 px (&zoom=px enlarges, &ids=a,b filters)',
    render: (params) => {
      const size = zoomOf(params) || 88;
      const ids = params.get('ids')?.split(',');
      return (
        <div class="gal-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size * 2 + 40}px, 1fr))`, gap: '10px' }}>
          {BADGES.filter((b) => !ids || ids.includes(b.id)).map((b) => (
            <div class="gal-cell" key={b.id}>
              <div class="gal-row" style={{ gap: '6px' }}>
                <BadgeMedal badgeId={b.id} earned size={size} title={b.name} />
                <BadgeMedal badgeId={b.id} earned={false} size={size} title={`${b.name} (locked)`} />
              </div>
              <b>{b.name}</b>
              <Label>
                {b.id} · {b.color} · {b.stars}★
              </Label>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'icons-badges-sizes',
    title: 'Badge medals · 48 / 64 / 120 px, light & night',
    render: () => {
      const picks = ['first-checkin', 'perfect-week', 'night-owl', 'set-complete', 'first-ultra'];
      const row = (earned: boolean) => (
        <div class="gal-row" style={{ gap: '8px' }}>
          {picks.map((id) => [48, 64, 120].map((s) => <BadgeMedal key={`${id}-${s}`} badgeId={id} earned={earned} size={s} />))}
        </div>
      );
      return (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div class="gal-cell" style={{ alignItems: 'flex-start' }}>
            {row(true)}
            {row(false)}
          </div>
          <div class="gal-cell" style={{ alignItems: 'flex-start', background: NIGHT_CARD }}>
            {row(true)}
            {row(false)}
          </div>
        </div>
      );
    },
  },
  {
    id: 'icons-context',
    title: 'In context · habit rows, streak glyph, wallet, badge shelf (light & night)',
    render: () => (
      <div class="gal-row" style={{ alignItems: 'flex-start', gap: '16px' }}>
        <ContextCard />
        <div style={{ ...NIGHT, padding: 0 }}>
          <ContextCard night />
        </div>
      </div>
    ),
  },
];

const SAMPLE_HABITS = [
  { icon: 'water', name: 'Drink water', tone: 'sky', sub: '5 / 8 glasses', streak: false },
  { icon: 'yoga', name: 'Yoga', tone: 'lavender', sub: '2 of 3 this week', streak: false },
  { icon: 'book', name: 'Read', tone: 'peach', sub: '12 days', streak: true },
  { icon: 'watering-can', name: 'Water the plants', tone: 'sage', sub: '26 of last 30 days', streak: false },
] as const;

/** A tiny mock of Today + a badge shelf, to judge the icon sets side by side. */
function ContextCard({ night = false }: { night?: boolean }) {
  const c = night
    ? { card: NIGHT_CARD, ink: '#F8EEF3', ink2: '#CBBCD0', chip: (t: string) => ({ sky: '#2B3450', lavender: '#352D55', peach: '#4A3438', sage: '#2F3B36' })[t]! }
    : { card: 'var(--card)', ink: 'var(--ink)', ink2: 'var(--ink-2)', chip: (t: string) => `var(--${t}-100)` };
  return (
    <div style={{ background: c.card, color: c.ink, borderRadius: '22px', padding: '14px 16px', width: '360px', display: 'grid', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '20px' }}>Today</span>
        <span style={{ display: 'inline-flex', gap: '10px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <CoinIcon size={18} title="Coins" /> 128
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <StarIcon size={18} title="Stars" /> 6
          </span>
        </span>
      </div>
      {SAMPLE_HABITS.map((h) => (
        <div key={h.icon} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: c.chip(h.tone), borderRadius: '14px', padding: '6px', display: 'inline-flex' }}>
            <HabitIcon id={h.icon} tone={h.tone} size={34} />
          </span>
          <span style={{ flex: 1, display: 'grid' }}>
            <b style={{ fontSize: '15px' }}>{h.name}</b>
            <small style={{ color: c.ink2, display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px' }}>
              {h.streak && <Icon name="streak" size={15} style={{ color: 'var(--peach-500)' }} />}
              {h.sub}
            </small>
          </span>
          <button type="button" aria-label={`More actions for ${h.name}`} style={{ color: c.ink2, padding: '6px' }}>
            <Icon name="more" size={20} />
          </button>
        </div>
      ))}
      <div class="gal-row" style={{ gap: '4px', justifyContent: 'space-between' }}>
        {['first-checkin', 'perfect-week', 'comeback', 'night-owl', 'set-complete'].map((id, i) => (
          <BadgeMedal key={id} badgeId={id} earned={i < 3} size={58} />
        ))}
      </div>
    </div>
  );
}

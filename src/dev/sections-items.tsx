/**
 * Gallery sections for item art (treats and decor). View with /gallery.html?only=items, or one
 * section: ?only=items-treats · items-treats-light · items-decor · items-decor-small · items-shelf.
 * Narrow any section to some items with &ids=strawberry,cardboard-box.
 */
import type { JSX } from 'preact';
import { DECOR, TREATS } from '@/catalog/collectibles';
import type { CollectibleDef } from '@/catalog/types';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { TREAT_ART } from '@/art/items';
import { DECOR_ENTRIES } from '@/art/scene/decor';
import type { GallerySection } from './sections';

const LIGHTS: { label: string; light: Light }[] = [
  { label: 'light left', light: DAY_LIGHT },
  { label: 'light above', light: { from: 'top', night: false } },
  { label: 'light right', light: { from: 'right', night: false } },
  { label: 'lamplight', light: NIGHT_LIGHT },
];

const ROOM = {
  day: { wall: '#F1E8DC', sill: '#E7D7BF', edge: '#DCCAB0' },
  night: { wall: '#3E3A5C', sill: '#4C4769', edge: '#433E5E' },
};

/** A patch of wall and sill behind an item, so its crescent and contact shadow read as in the room. */
function Room({ night, children, size, sill = 86 }: { night: boolean; children: JSX.Element; size: number; sill?: number }) {
  const r = night ? ROOM.night : ROOM.day;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ borderRadius: '10px', display: 'block' }}>
      <rect width="100" height="100" fill={r.wall} />
      <rect y={sill} width="100" height={100 - sill} fill={r.sill} />
      <rect y={sill} width="100" height="1" fill={r.edge} />
      {children}
    </svg>
  );
}

function pick<T extends CollectibleDef>(all: readonly T[], params: URLSearchParams, prefix: string): T[] {
  const ids = params
    .get('ids')
    ?.split(',')
    .map((s) => `${prefix}-${s.trim()}`);
  return ids ? all.filter((d) => ids.includes(d.id)) : [...all];
}

const caption = { fontSize: '11px', color: 'var(--ink-2)', textAlign: 'center' } as const;

export const SECTIONS: GallerySection[] = [
  {
    id: 'items-treats',
    title: 'Treats at 96 px and 40 px',
    render: (params) => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {pick(TREATS, params, 'treat').map((t) => {
          const Art = TREAT_ART[t.id];
          return (
            <div class="gal-cell" key={t.id}>
              <div class="gal-row" style={{ gap: '8px', alignItems: 'flex-end' }}>
                <svg viewBox="0 0 100 100" width={96} height={96} role="img" aria-label={t.name}>
                  {Art ? Art() : null}
                </svg>
                <svg viewBox="0 0 100 100" width={40} height={40} aria-hidden="true">
                  {Art ? Art() : null}
                </svg>
              </div>
              <b>{t.name}</b>
              <small>{t.flavor}</small>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'items-treats-light',
    title: 'Treats in window light from the left, above and the right, and in lamplight',
    render: (params) => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))' }}>
        {pick(TREATS, params, 'treat').map((t) => {
          const Art = TREAT_ART[t.id];
          return (
            <div class="gal-cell" key={t.id}>
              <div class="gal-row" style={{ gap: '6px' }}>
                {LIGHTS.map(({ label, light }) => (
                  <Room key={label} night={light.night} size={80} sill={84}>
                    {Art ? Art({ light }) : <g />}
                  </Room>
                ))}
              </div>
              <b>{t.name}</b>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'items-decor',
    title: 'Decor at 120 px: window light from the left, above and the right, then lamplight',
    render: (params) => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(540px, 100%), 1fr))' }}>
        {pick(DECOR, params, 'decor').map((d) => {
          const entry = DECOR_ENTRIES[d.id];
          return (
            <div class="gal-cell" key={d.id}>
              <div class="gal-row" style={{ gap: '8px' }}>
                {LIGHTS.map(({ label, light }) => (
                  <div key={label} style={{ display: 'grid', justifyItems: 'center', gap: '2px' }}>
                    <Room night={light.night} size={120} sill={88}>
                      {entry ? entry.art({ light, night: light.night }) : <g />}
                    </Room>
                    <span style={caption}>{label}</span>
                  </div>
                ))}
              </div>
              <b>{d.name}</b>
              <small>
                {entry ? `size ${entry.size}` : 'no art'}
                {entry?.hang ? ' · hangs from the window' : ''}
                {entry?.flat ? ' · lies flat' : ''}
                {entry?.glow ? ' · glows at night' : ''}
              </small>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'items-decor-small',
    title: 'Decor icons at 64, 40 and 32 px',
    render: (params) => (
      <div class="gal-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {pick(DECOR, params, 'decor').map((d) => {
          const entry = DECOR_ENTRIES[d.id];
          return (
            <div class="gal-cell" key={d.id}>
              <div class="gal-row" style={{ gap: '8px', alignItems: 'flex-end' }}>
                {[64, 40, 32].map((s) => (
                  <svg key={s} viewBox="0 0 100 100" width={s} height={s} aria-hidden="true">
                    {entry ? entry.art() : null}
                  </svg>
                ))}
              </div>
              <b>{d.name}</b>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    id: 'items-shelf',
    title: "Decor at true relative size, beside a 16-unit box: a sitting cat's height",
    render: (params) => {
      const unit = Number(params.get('unit')) || 7;
      const night = params.get('night') === '1';
      const r = night ? ROOM.night : ROOM.day;
      const items = pick(DECOR, params, 'decor').filter((d) => DECOR_ENTRIES[d.id]);
      return (
        <div
          style={{ background: r.wall, borderRadius: '14px', padding: '16px 16px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', rowGap: '0' }}
        >
          <div style={{ display: 'grid', justifyItems: 'center', borderBottom: `${unit * 1.2}px solid ${r.sill}`, paddingRight: `${unit}px` }}>
            <div
              style={{
                width: `${unit * 16}px`,
                height: `${unit * 16}px`,
                border: '1.5px dashed var(--ink-3)',
                borderRadius: '4px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                color: 'var(--ink-3)',
              }}
            >
              16
            </div>
          </div>
          {items.map((d) => {
            const e = DECOR_ENTRIES[d.id]!;
            const px = e.size * unit;
            const wide = ((e.bounds[1] - e.bounds[0]) / 100) * px;
            return (
              <div
                key={d.id}
                title={d.name}
                style={{ display: 'grid', justifyItems: 'center', borderBottom: `${unit * 1.2}px solid ${r.sill}`, padding: `0 ${unit * 0.8}px` }}
              >
                <svg
                  viewBox={`${e.bounds[0]} 0 ${e.bounds[1] - e.bounds[0]} 100`}
                  width={wide}
                  height={px}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={{ display: 'block', marginBottom: `${-px * 0.08}px` }}
                >
                  {e.art({ night, light: night ? NIGHT_LIGHT : DAY_LIGHT, line: 16 / e.size })}
                </svg>
              </div>
            );
          })}
        </div>
      );
    },
  },
];

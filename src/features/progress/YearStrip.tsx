/**
 * The year (DESIGN §9.2): a strip of day flowers, one column a week, seven rows, 53 × 7 in full at
 * ≥ 600 px and scrolling sideways on a phone (opening on this week). A day is a flower sized by how
 * full it was, a moon for a rest or a day off, a small leaf for a pause, and a faint dot for a day
 * with nothing; the months are marked above. The drawing is aria-hidden: its text alternative is
 * the summary under it ("312 waterings in 2026, across 180 days").
 *
 * Drawn as one SVG with a handful of paths (every flower of a kind in one path), so a full year is a
 * few DOM nodes, not 371 components.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { GLYPH_INKS } from '@/art/progress';
import { nightTone } from '@/art/scene/decor/kit';
import { useArtLight } from '@/art/scene/moment';
import { yearSummaryLine } from '@/catalog/format';
import { EMPTY } from '@/catalog/lines';
import { firstTrackedDay } from '@/domain/insights';
import { trackingOf } from '@/domain/consistency';
import { selectYearQuilt, type YearQuiltVM } from '@/state/selectors';
import { state, today } from '@/state/store';
import { IconButton } from '@/ui/IconButton';
import { PROGRESS_UI } from './copy';
import s from './YearStrip.module.css';

/** One cell of the strip on its own canvas (px at the phone size). */
export const CELL = 14;
const TOP = 16;

const f = (n: number) => +n.toFixed(2);
const dot = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`;

/** Five petals round a heart. */
export function flower(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    d += dot(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.46);
  }
  return d;
}

const moon = (cx: number, cy: number, r: number) => `M${f(cx + r * 0.2)} ${f(cy - r)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r * 0.95)} ${f(cy + r * 0.45)}A${f(r * 0.8)} ${f(r * 0.8)} 0 1 1 ${f(cx + r * 0.2)} ${f(cy - r)}Z`;
const leaf = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy + r * 0.8)}C${f(cx - r)} ${f(cy - r * 0.2)} ${f(cx - r * 0.1)} ${f(cy - r)} ${f(cx + r)} ${f(cy - r)}C${f(cx + r)} ${f(cy)} ${f(cx + r * 0.1)} ${f(cy + r * 0.8)} ${f(cx - r)} ${f(cy + r * 0.8)}Z`;

export interface YearPaths {
  petals: string;
  hearts: string;
  sprouts: string;
  moons: string;
  leaves: string;
  quiet: string;
  width: number;
  height: number;
  months: { label: string; x: number }[];
}

/** The strip's paths for a year (pure: tests and the component). */
export function yearPaths(vm: YearQuiltVM): YearPaths {
  const p = { petals: '', hearts: '', sprouts: '', moons: '', leaves: '', quiet: '' };
  const half = CELL / 2;
  vm.weeks.forEach((col, x) => {
    col.forEach((patch, y) => {
      if (!patch) return;
      const cx = x * CELL + half;
      const cy = TOP + y * CELL + half;
      switch (patch.state) {
        case 'done':
        case 'partial': {
          if (patch.state === 'partial' && (patch.fraction ?? 0) <= 0) {
            p.quiet += dot(cx, cy, 1.3);
            break;
          }
          const r = half * 0.92 * (0.5 + 0.5 * Math.max(0, Math.min(1, patch.fraction ?? 1)));
          p.petals += flower(cx, cy, r);
          p.hearts += dot(cx, cy, r * 0.28);
          break;
        }
        case 'tiny':
          p.sprouts += flower(cx, cy, half * 0.62);
          p.hearts += dot(cx, cy, half * 0.62 * 0.28);
          break;
        case 'rest':
        case 'off':
          p.moons += moon(cx - 0.6, cy, half * 0.62);
          break;
        case 'paused':
          p.leaves += leaf(cx, cy, half * 0.55);
          break;
        default:
          p.quiet += dot(cx, cy, 1.3);
      }
    });
  });
  return { ...p, width: vm.weeks.length * CELL, height: TOP + 7 * CELL, months: vm.months.map((m) => ({ label: m.label, x: m.column * CELL + 1 })) };
}

export function YearStrip() {
  const cur = Number(today.value.slice(0, 4));
  const [year, setYear] = useState(cur);
  const vm = selectYearQuilt(year).value;
  const first = firstTrackedDay(trackingOf(state.value));
  const firstYear = first ? Number(first.slice(0, 4)) : cur;
  const paths = useMemo(() => yearPaths(vm), [vm]);
  const light = useArtLight();
  const c = (hex: string) => (light.night ? nightTone(hex) : hex);
  const scroller = useRef<HTMLDivElement>(null);
  const summary = yearSummaryLine({ year, ...vm.summary });

  // Open on this week (or the year's end), a little in from the right edge.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const col = vm.todayColumn ?? vm.weeks.length - 1;
    const x = ((col + 1) / vm.weeks.length) * el.scrollWidth - el.clientWidth + 24;
    el.scrollLeft = Math.max(0, x);
  }, [year]);

  return (
    <div class={s.year}>
      <div class={s.nav}>
        <IconButton icon="chevron-left" label={PROGRESS_UI.year.prev} onClick={() => setYear(year - 1)} disabled={year <= firstYear} />
        <h3 class={s.label} aria-live="polite">
          {year}
        </h3>
        <IconButton icon="chevron-right" label={PROGRESS_UI.year.next} onClick={() => setYear(year + 1)} disabled={year >= cur} />
      </div>
      <div ref={scroller} class={s.scroller} aria-hidden="true" data-year-strip={year}>
        <svg class={s.svg} viewBox={`0 0 ${paths.width} ${paths.height}`} style={{ '--cols': vm.weeks.length } as never} focusable="false">
          {paths.months.map((m) => (
            <text key={m.label} x={m.x} y={10} class={s.monthText}>
              {m.label}
            </text>
          ))}
          <path d={paths.quiet} fill="var(--line)" />
          <path d={paths.leaves} fill={c(GLYPH_INKS.leaf)} />
          <path d={paths.moons} fill={c(GLYPH_INKS.moon)} />
          <path d={paths.sprouts} fill={c(GLYPH_INKS.leaf)} />
          <path d={paths.petals} fill={c(GLYPH_INKS.petal)} />
          <path d={paths.hearts} fill={c(GLYPH_INKS.heart)} />
        </svg>
      </div>
      <p class={s.summary}>{summary ?? EMPTY.progress}</p>
    </div>
  );
}

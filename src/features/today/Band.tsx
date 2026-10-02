/**
 * The windowsill band (DESIGN §9.1): the nearest stretch of the sill in Windowlight, 168 px tall,
 * collapsing to 64 px as the page scrolls. Top left, on an 85% card chip: the greeting (the screen's
 * h1) and the long date. Top right: the wallet pill. On the sill ledge: the vine chip ("3 of 5 · +18
 * coins"). Collapsed: the short date · a mini ring · the wallet. Tapping the window opens the Shelf.
 *
 * The collapse is driven by scroll without a single Preact render: a signal feeds the band's own
 * transforms, and two CSS variables (`--c` 0…1 and `--clip` in px) drive the chips and the clip.
 */
import { signal } from '@preact/signals';
import { forwardRef } from 'preact/compat';
import type { Ref } from 'preact';
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { WindowsillBand, type WindowsillBandHandle } from '@/art/scene';
import type { SillPot, ShelfPet } from '@/art/scene';
import { BAND_CLOSED_PX, BAND_MAX_POTS, BAND_OPEN_PX } from '@/art/scene';
import { CoinIcon } from '@/art/icons';
import { COUNTS, GREETINGS, TODAY_LINES, fillLine } from '@/catalog/lines';
import { dayProgressAria, vineChip } from '@/catalog/format';
import { amountHead } from './WalletSheet';
import type { AppState } from '@/state/types';
import type { TodayVM } from '@/state/selectors';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { cx } from '@/ui/cx';
import { navigate } from '@/app/router';
import { foundLine } from '@/fx/copy';
import { prefersReducedMotion } from '@/fx/motion';
import { openPetCard } from '@/features/habits/open';
import { TODAY_COPY } from './copy';
import s from './Band.module.css';

/** How far the page scrolls while the band collapses (px). */
export const COLLAPSE_RANGE = BAND_OPEN_PX - BAND_CLOSED_PX;

export interface BandHandle {
  /** Pour onto the habit's pot and show its tag a moment (a pot off the band is left alone). */
  pour(habitId: string): void;
  /** The habit's resident looks up. */
  react(habitId: string): void;
}

export interface BandProps {
  vm: TodayVM;
  state: Pick<AppState, 'pets' | 'habits'>;
  coins: number;
  /** The letter or story waiting on the sill opens its sheet. */
  onOpenNote?: () => void;
  /** The wallet pill: "What can I get?". */
  onWallet: () => void;
  /**
   * Draw the scene (the sill, the pots, the residents: about a thousand nodes). Today passes false
   * for its first frame so the list paints first; the chips show at once either way.
   */
  scene?: boolean;
}

/** The greeting (VOICE §5): "Afternoon, Sam." · "Morning." with no name set. Early and late have two, picked by the day. */
export function greetingLine(g: TodayVM['greeting'], dayOfMonth: number): string {
  const options = GREETINGS[g.birthday ? 'birthday' : g.period];
  const template = options[dayOfMonth % options.length]!;
  return g.name ? fillLine(template, { userName: g.name }) : template.replace(', {userName}', '');
}

/** The band's pots: the view model's sill (card order, the current block first), with looks, bows and routines. */
export function bandPots(vm: Pick<TodayVM, 'sill' | 'blocks' | 'doneForPeriod' | 'thisMonth' | 'notToday'>, habits: AppState['habits']): SillPot[] {
  const colour = new Map(habits.map((h) => [h.id, h]));
  const cards = new Map([...vm.blocks.flatMap((b) => b.cards), ...vm.doneForPeriod, ...vm.thisMonth, ...vm.notToday].map((c) => [c.id, c]));
  return vm.sill.map((p) => {
    const card = cards.get(p.habitId);
    const partner = card?.after ? colour.get(card.after.habitId)?.color : undefined;
    const pot: SillPot = { habitId: p.habitId, name: p.name, species: p.species, stage: p.stage, progress: p.progress, pot: p.pot, damp: p.damp, pulse: p.pulse };
    if (p.note) pot.note = p.note;
    if (p.blooms !== undefined) pot.blooms = p.blooms;
    if (p.look) pot.look = { colour: p.look.colour, shape: p.look.shape, ...(p.look.shape === 'paired' && partner ? { partnerColour: partner } : {}) };
    if (p.bow) pot.bow = true;
    if (p.routine) pot.routine = p.routine.routine;
    if (card && card.plant.flourishes > 0) pot.flourishes = card.plant.flourishes;
    return pot;
  });
}

/** The band's pots with `guest` in the last of its places (when it isn't on the band already). */
export function withGuest(pots: SillPot[], guest: string | null): SillPot[] {
  if (!guest || pots.slice(0, BAND_MAX_POTS).some((p) => p.habitId === guest)) return pots;
  const g = pots.find((p) => p.habitId === guest);
  if (!g) return pots;
  return [...pots.slice(0, BAND_MAX_POTS - 1), g, ...pots.slice(BAND_MAX_POTS - 1).filter((p) => p !== g)];
}

/** The band's residents: each pot's pet that is out, once, sitting in that pot. */
export function bandPets(vm: Pick<TodayVM, 'sill'>, pets: AppState['pets']): ShelfPet[] {
  const out: ShelfPet[] = [];
  const seen = new Set<string>();
  for (const p of vm.sill) {
    const id = p.resident?.petId;
    const pet = id ? pets[id] : undefined;
    if (!id || !pet || !pet.inMeadow || seen.has(id)) continue;
    seen.add(id);
    out.push({ key: id, petId: id, name: pet.name, personality: pet.personality, outfit: pet.outfit, home: p.habitId, place: 'sill' });
  }
  return out;
}

/**
 * A value that changes identity only when its key does, and after the frame that changed it: a
 * watering redraws the band's world (a thousand nodes) in the next task, never in the tap's own
 * frame. The pour itself (the band's own state) still starts at once.
 */
function useSettled<T>(value: T, key: string): T {
  const [held, setHeld] = useState(() => ({ key, value }));
  const latest = useRef({ key, value });
  latest.current = { key, value };
  useEffect(() => {
    if (held.key === key) return;
    if (typeof requestAnimationFrame !== 'function') return setHeld(latest.current);
    let t: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => (t = setTimeout(() => setHeld(latest.current), 0)));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [key, held.key]);
  return held.value;
}

/** How long a smooth scroll of the pot row takes to settle before the pour starts. */
export const REVEAL_MS = 320;

/**
 * Scrolls the band's pot row so the habit's pot is in view (smoothly, or at once with reduced
 * motion). Returns how long to wait before pouring: 0 when the pot was already in view.
 */
export function revealPot(root: HTMLElement, habitId: string): number {
  const row = root.querySelector<HTMLElement>('[role="group"][aria-label]');
  const pot = row?.querySelector<HTMLElement>(`[data-habit="${habitId.replace(/["\\]/g, "\\$&")}"]`);
  if (!row || !pot) return 0;
  const r = row.getBoundingClientRect();
  const p = pot.getBoundingClientRect();
  if (r.width === 0 || p.width === 0 || typeof row.scrollTo !== 'function') return 0;
  // The chips cover the row's left end while the band is open; keep the pot clear of them.
  const margin = Math.min(48, r.width / 6);
  if (p.left >= r.left + margin && p.right <= r.right - 8) return 0;
  const left = row.scrollLeft + (p.left + p.width / 2) - (r.left + r.width / 2);
  const reduce = prefersReducedMotion();
  row.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
  return reduce ? 0 : REVEAL_MS;
}

export const Band = forwardRef(function Band({ vm, state, coins, onOpenNote, onWallet, scene = true }: BandProps, ref: Ref<BandHandle>) {
  const wrap = useRef<HTMLDivElement>(null);
  const band = useRef<WindowsillBandHandle>(null);
  const collapse = useMemo(() => signal(0), []);
  const [tagFor, setTagFor] = useState<string | undefined>(undefined);
  const tagTimer = useRef<ReturnType<typeof setTimeout>>();

  // Kept by value: the view model is rebuilt on every commit, the band's world only when a pot changed.
  const potsNow = bandPots(vm, state.habits);
  const potsKey = JSON.stringify(potsNow);
  const settled = useSettled(potsNow, potsKey);
  // A habit beyond the band's six, watered: its pot comes onto the sill as a guest in the sixth
  // place (DESIGN §9.1: every watering pours onto its own pot), and stays until another does.
  const [guest, setGuest] = useState<string | null>(null);
  const pots = useMemo(() => withGuest(settled, guest), [settled, guest]);
  const petsNow = bandPets(vm, state.pets);
  const petsKey = JSON.stringify(petsNow);
  const pets = useSettled(petsNow, petsKey);
  const onBand = useMemo(() => new Set(pots.slice(0, BAND_MAX_POTS).map((p) => p.habitId)), [pots]);
  const residentOf = useMemo(() => new Map(vm.sill.map((p) => [p.habitId, p.resident?.petId ?? null])), [vm.sill]);
  type PourTarget = { habitId: string; date: string; version: number };
  const versions = useRef(new Map<string, number>());
  const latestWatering = useRef({ date: vm.date, pots: potsNow });
  const previousWatering = useRef(latestWatering.current);
  latestWatering.current = { date: vm.date, pots: potsNow };
  const pourTimers = useRef(new Map<ReturnType<typeof setTimeout>, PourTarget>());
  /** A pour waiting for its guest pot to be drawn, bound to the same watering and day. */
  const pendingPour = useRef<PourTarget | null>(null);
  const validPour = (target: PourTarget) => target.date === latestWatering.current.date
    && target.version === (versions.current.get(target.habitId) ?? 0)
    && latestWatering.current.pots.some((p) => p.habitId === target.habitId && p.damp);

  useLayoutEffect(() => {
    const previous = previousWatering.current;
    for (const p of previous.pots) {
      const next = potsNow.find((n) => n.habitId === p.habitId);
      if (previous.date !== vm.date || !next || (p.damp && !next.damp) || (next.pulse ?? 0) < (p.pulse ?? 0)) {
        versions.current.set(p.habitId, (versions.current.get(p.habitId) ?? 0) + 1);
      }
    }
    previousWatering.current = latestWatering.current;
    for (const [timer, target] of pourTimers.current) {
      if (validPour(target)) continue;
      clearTimeout(timer);
      pourTimers.current.delete(timer);
    }
    if (pendingPour.current && !validPour(pendingPour.current)) pendingPour.current = null;
  }, [potsKey, vm.date]);

  // The pour onto a pot that is on the band (scrolled into view first, so it is seen).
  const pourOnBand = (target: PourTarget) => {
    const { habitId } = target;
    const go = () => {
      band.current?.pour(habitId);
      setTagFor(habitId);
      clearTimeout(tagTimer.current);
      tagTimer.current = setTimeout(() => setTagFor(undefined), 2600);
    };
    const wait = wrap.current ? revealPot(wrap.current, habitId) : 0;
    if (wait > 0) {
      const timer = setTimeout(() => {
        pourTimers.current.delete(timer);
        if (validPour(target)) go();
      }, wait);
      pourTimers.current.set(timer, target);
    }
    else go();
  };

  useImperativeHandle<BandHandle, BandHandle>(
    ref,
    () => ({
      pour(habitId) {
        const target = { habitId, date: latestWatering.current.date, version: versions.current.get(habitId) ?? 0 };
        if (onBand.has(habitId)) return pourOnBand(target);
        if (!settled.some((p) => p.habitId === habitId)) return;
        pendingPour.current = target;
        setGuest(habitId);
      },
      react(habitId) {
        const pet = residentOf.get(habitId);
        if (pet && onBand.has(habitId) && pets.some((p) => p.key === pet)) band.current?.react(pet);
      },
    }),
    [onBand, residentOf, pets, settled],
  );
  useEffect(() => () => {
    clearTimeout(tagTimer.current);
    for (const timer of pourTimers.current.keys()) clearTimeout(timer);
    pourTimers.current.clear();
    pendingPour.current = null;
  }, []);

  // The guest pot is drawn: pour onto it once that frame is on screen.
  useEffect(() => {
    const target = pendingPour.current;
    if (!target || !onBand.has(target.habitId)) return;
    pendingPour.current = null;
    let t: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => (t = setTimeout(() => {
      if (validPour(target)) pourOnBand(target);
    }, 0)));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [onBand]);

  // Scroll drives the collapse without a render: inline styles on the few elements that move (never an
  // inherited custom property, which would restyle the whole drawing), and the band's own signal.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const part = (name: string) => el.querySelector<HTMLElement>(`[data-part="${name}"]`);
    const clip = part('clip');
    const greeting = part('greeting');
    const mini = part('mini');
    const vine = part('vine');
    let raf = 0;
    let last = -1;
    const apply = () => {
      raf = 0;
      const t = Math.min(1, Math.max(0, window.scrollY / COLLAPSE_RANGE));
      if (t === last) return;
      last = t;
      if (clip) clip.style.clipPath = `inset(0 0 ${(t * COLLAPSE_RANGE).toFixed(1)}px 0 round var(--band-radius))`;
      if (greeting) {
        greeting.style.opacity = String(Math.max(0, 1 - t * 2.4));
        greeting.style.transform = t ? `translateY(${(-10 * t).toFixed(1)}px) scale(${(1 - t * 0.12).toFixed(3)})` : '';
      }
      if (mini) mini.style.opacity = String(Math.min(1, Math.max(0, (t - 0.55) * 2.6)));
      if (vine) vine.style.opacity = String(Math.max(0, 1 - t * 3));
      el.toggleAttribute('data-collapsed', t > 0.6);
      collapse.value = t;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    // The first read waits for the frame, so mounting never forces a layout of the whole page.
    raf = requestAnimationFrame(apply);
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // A coin that lands on the jar drops into it (one per landing, however many taps it carries).
  const onJarBump = (e: AnimationEvent) => {
    if (e.animationName === 'ck-wallet-bump') band.current?.coinToJar();
  };

  const quiet = vm.quietRewards;
  const vine = vineChip(vm.progress, quiet || !vm.isToday ? 0 : vm.coinsToday);
  const valueText = dayProgressAria(vm.progress);
  const day = Number(vm.date.slice(8, 10));
  const greeting = greetingLine(vm.greeting, day);
  const found = vm.found;
  const foundPet = found ? state.pets[found.petId] : undefined;
  const note = vm.letterWaiting
    ? { kind: vm.letterWaiting.kind, label: TODAY_LINES.letterWaiting[vm.letterWaiting.kind], onOpen: () => onOpenNote?.() }
    : vm.storyWaiting
      ? { kind: 'story' as const, label: fillLine(TODAY_LINES.storyWaiting, { habit: state.habits.find((h) => h.id === vm.storyWaiting!.habitId)?.name ?? '' }), onOpen: () => onOpenNote?.() }
      : undefined;
  const monthJar = useMemo(() => ({ stems: vm.monthJar }), [JSON.stringify(vm.monthJar)]); // eslint-disable-line react-hooks/exhaustive-deps
  const walletLabel = `${amountHead(coins, COUNTS.coins)}. ${TODAY_COPY.whatCanIGet}`;

  return (
    <div ref={wrap} class={s.wrap} data-quiet={quiet ? '' : undefined}>
      <div class={s.clip} data-part="clip">
        {/* The greeting comes first for screen readers and Tab (it floats over the band). */}
        <div class={s.greeting} data-part="greeting">
          <h1 class={s.hello} id="today-title" tabIndex={-1}>
            {greeting}
          </h1>
          <p class={s.date}>{vm.dateLabel}</p>
        </div>
        {scene ? (
          <WindowsillBand
            ref={band}
            class={s.band}
            pots={pots}
            pets={pets}
            coins={quiet ? 0 : coins}
            collapse={collapse}
            hemisphere={vm.season.hemisphere}
            onWindowTap={() => navigate('shelf')}
            chipInset={104}
            tagFor={tagFor}
            cutting={{ stage: vm.cutting.stage, overall: vm.cutting.overall }}
            {...(found ? { found: { seed: found.seed, label: foundPet ? foundLine(foundPet.name, found.seed) : undefined, onTap: () => openPetCard(found.petId) } } : {})}
            {...(note ? { note } : {})}
            cake={vm.birthday !== null}
            monthJar={monthJar}
          />
        ) : (
          <div class={cx(s.band, s.placeholder)} aria-hidden="true" />
        )}
        <div class={s.mini} data-part="mini" aria-hidden="true">
          <span class={s.miniDate}>{vm.shortDate}</span>
          <MiniRing fraction={vm.progress.fraction} />
        </div>
        {vine && (
          <p class={s.vine} data-part="vine" role="progressbar" aria-label={TODAY_COPY.today} aria-valuemin={0} aria-valuemax={vm.progress.total || 1} aria-valuenow={vm.progress.total ? vm.progress.done : 1} aria-valuetext={valueText ?? vine}>
            {vine}
          </p>
        )}
        {!quiet && (
          <>
            <button type="button" class={s.wallet} data-wallet-target="coins" aria-label={walletLabel} onClick={onWallet}>
              <CoinIcon size={20} />
              <AnimatedNumber value={coins} walletKind="coins" class={s.walletNum} />
            </button>
            <span class={s.jar} data-wallet-target="coins" aria-hidden="true" onAnimationStart={onJarBump} />
          </>
        )}
      </div>
    </div>
  );
});

/** The collapsed band's day ring: a hairline circle that fills as the day's habits are watered. */
function MiniRing({ fraction }: { fraction: number }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <svg class={cx(s.ring, f >= 1 && s.ringFull)} viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
      <circle class={s.ringTrack} cx="10" cy="10" r={r} />
      <circle class={s.ringFill} cx="10" cy="10" r={r} stroke-dasharray={`${(c * f).toFixed(2)} ${c.toFixed(2)}`} transform="rotate(-90 10 10)" />
    </svg>
  );
}

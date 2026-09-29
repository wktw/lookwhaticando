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
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'preact/hooks';
import { WindowsillBand, type WindowsillBandHandle } from '@/art/scene';
import type { SillPot, ShelfPet } from '@/art/scene';
import { BAND_CLOSED_PX, BAND_OPEN_PX } from '@/art/scene';
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

export const Band = forwardRef(function Band({ vm, state, coins, onOpenNote, onWallet }: BandProps, ref: Ref<BandHandle>) {
  const wrap = useRef<HTMLDivElement>(null);
  const band = useRef<WindowsillBandHandle>(null);
  const collapse = useMemo(() => signal(0), []);
  const [tagFor, setTagFor] = useState<string | undefined>(undefined);
  const tagTimer = useRef<ReturnType<typeof setTimeout>>();

  const pots = useMemo(() => bandPots(vm, state.habits), [vm, state.habits]);
  const pets = useMemo(() => bandPets(vm, state.pets), [vm.sill, state.pets]);
  const onBand = useMemo(() => new Set(pots.slice(0, 6).map((p) => p.habitId)), [pots]);
  const residentOf = useMemo(() => new Map(vm.sill.map((p) => [p.habitId, p.resident?.petId ?? null])), [vm.sill]);

  useImperativeHandle<BandHandle, BandHandle>(
    ref,
    () => ({
      pour(habitId) {
        if (!onBand.has(habitId)) return;
        band.current?.pour(habitId);
        setTagFor(habitId);
        clearTimeout(tagTimer.current);
        tagTimer.current = setTimeout(() => setTagFor(undefined), 2600);
      },
      react(habitId) {
        const pet = residentOf.get(habitId);
        if (pet && onBand.has(habitId) && pets.some((p) => p.key === pet)) band.current?.react(pet);
      },
    }),
    [onBand, residentOf, pets],
  );
  useEffect(() => () => clearTimeout(tagTimer.current), []);

  // Scroll drives the collapse: CSS variables and the band's signal, never a render.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    let last = -1;
    const apply = () => {
      raf = 0;
      const t = Math.min(1, Math.max(0, window.scrollY / COLLAPSE_RANGE));
      if (t === last) return;
      last = t;
      el.style.setProperty('--c', t.toFixed(3));
      el.style.setProperty('--clip', `${(t * COLLAPSE_RANGE).toFixed(1)}px`);
      el.toggleAttribute('data-collapsed', t > 0.6);
      collapse.value = t;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
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
  const walletLabel = `${amountHead(coins, COUNTS.coins)}. ${TODAY_COPY.whatCanIGet}`;

  return (
    <div ref={wrap} class={s.wrap} data-quiet={quiet ? '' : undefined}>
      <div class={s.clip}>
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
        />
        <div class={s.greeting}>
          <h1 class={s.hello} id="today-title" tabIndex={-1}>
            {greeting}
          </h1>
          <p class={s.date}>{vm.dateLabel}</p>
        </div>
        <div class={s.mini} aria-hidden="true">
          <span class={s.miniDate}>{vm.shortDate}</span>
          <MiniRing fraction={vm.progress.fraction} />
        </div>
        {vine && (
          <p class={s.vine} role="progressbar" aria-label={TODAY_COPY.today} aria-valuemin={0} aria-valuemax={vm.progress.total || 1} aria-valuenow={vm.progress.total ? vm.progress.done : 1} aria-valuetext={valueText ?? vine}>
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

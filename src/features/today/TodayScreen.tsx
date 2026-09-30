/**
 * Today (DESIGN §9.1, the landing route): the windowsill band, the week strip, the habit list by time
 * block, and the notes and pages that arrive on the sill. Check in, see the day's progress, and look
 * forward to opening it; with every game element hidden it is still a complete habit tracker.
 *
 * Nothing opens modally at launch: letters, stories, offers and the Season Review wait as cards
 * below the list and as a note on the sill.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CardPlant } from '@/art/plants/CardPlant';
import { CHECKIN_TOASTS, EMPTY, TODAY_LINES, fillLine } from '@/catalog/lines';
import { backdatingBanner, forDayLabel, weekdayName } from '@/catalog/format';
import { isInBackfillWindow } from '@/domain/activity';
import { shortDateLabel } from '@/domain/dates';
import { NEW_HABIT_EVENT } from '@/app/shortcuts';
import { selectToday, type HabitCardVM } from '@/state/selectors';
import { state, today, toggleOffDay } from '@/state/store';
import type { DateKey } from '@/state/types';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Toggle } from '@/ui/Toggle';
import { cx } from '@/ui/cx';
import { toast } from '@/ui/toast';
import { openHabitDetail, openHabitEditor } from '@/features/habits/open';
import { Band, type BandHandle } from './Band';
import { CardMenu, type MenuItem } from './CardMenu';
import { CountPad } from './CountPad';
import { HabitCard, holdAction } from './HabitCard';
import { HabitList } from './HabitList';
import { NoteSheet, type NoteTarget } from './NoteSheet';
import { Notices, type NoticesHandle } from './Notices';
import { WalletSheet } from './WalletSheet';
import { WeekStrip } from './WeekStrip';
import { cancelChoreography, countTo, flipRest, tapAction, unwater, water, type Stage } from './checkin';
import { HIDDEN_RESET_MS, bandOrder, cardsById, liveGroups, selectDay, selectedDay, snapshotGroups, structureKey, todayFocus, type GroupSnapshot } from './state';
import { TODAY_COPY } from './copy';
import s from './TodayScreen.module.css';

/** "Take today off?" as the title and the rest as the message, so the dialog never says it twice. */
const OFF_ASK_SPLIT = TODAY_LINES.takeTodayOffConfirm.indexOf('? ') + 1;
const offAskTitle = OFF_ASK_SPLIT > 0 ? TODAY_LINES.takeTodayOffConfirm.slice(0, OFF_ASK_SPLIT) : TODAY_LINES.takeTodayOff;
const offAskMessage = OFF_ASK_SPLIT > 0 ? TODAY_LINES.takeTodayOffConfirm.slice(OFF_ASK_SPLIT + 1) : TODAY_LINES.takeTodayOffConfirm;

/**
 * What an open editor (the number pad, the inline stepper, the ⋯ menu) works on: the habit and the
 * day it was opened for. The page's selected day can move under it (back to today after a minute
 * hidden, or on a new day, DESIGN §5.3); the editor keeps writing the day it shows (DEC-E6), or
 * closes and says so. It never writes another day (WP-C1).
 */
export interface EditorTarget {
  habitId: string;
  date: DateKey;
}

/**
 * The number pad's card for its day, or null once that day can't be edited from Today: the day has
 * left the week strip (a new day moved it past the backfill window), the habit is no longer on it
 * (deleted, paused), or it is no longer a count to key in.
 */
function padCardFor(pad: EditorTarget, today: DateKey): HabitCardVM | null {
  if (!isInBackfillWindow(pad.date, today)) return null;
  const card = cardsById(selectToday(pad.date < today ? pad.date : undefined).value).get(pad.habitId);
  return card && holdAction(card) === 'pad' ? card : null;
}

/**
 * The day the back-to-today note names: its weekday within the last six days, else its date
 * ("Thu, Sep 24"). A day a week back has today's weekday, so "Thursday" on a Thursday would read as
 * today (VOICE §5).
 */
/** How many frames a hand-off waits for its habit's card before it settles for the page's heading. */
const FOCUS_FRAMES = 20;

const leftDay = (d: DateKey, today: DateKey): string => (isInBackfillWindow(d, today) ? weekdayName(d) : shortDateLabel(d));

/**
 * False for the screen's first frame: the band's scene and the notes below the list draw one frame
 * later, so switching to Today paints the greeting, the strip and the first cards at once.
 */
function useAfterFirstFrame(): boolean {
  const [ready, setReady] = useState(typeof requestAnimationFrame !== 'function');
  useEffect(() => {
    if (ready) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => (t = setTimeout(() => setReady(true), 0)));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);
  return ready;
}

export function TodayScreen() {
  const st = state.value;
  const t = today.value;
  const ready = useAfterFirstFrame();
  const picked = selectedDay.value;
  const vm = selectToday(picked !== null && picked < t ? picked : undefined).value;
  const date = vm.date;
  const past = !vm.isToday;

  const band = useRef<BandHandle>(null);
  const notices = useRef<NoticesHandle>(null);
  const [menu, setMenu] = useState<(EditorTarget & { anchor: HTMLElement }) | null>(null);
  const [pad, setPad] = useState<EditorTarget | null>(null);
  const [adjusting, setAdjusting] = useState<EditorTarget | null>(null);
  const [note, setNoteTarget] = useState<NoteTarget | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  /** "Take today off?" is open for this day. */
  const [offAsk, setOffAsk] = useState<DateKey | null>(null);
  const editors = useRef({ menu, pad, adjusting, offAsk });
  editors.current = { menu, pad, adjusting, offAsk };

  /**
   * The page has just gone back to today (a new day, or a minute hidden). Each open editor keeps its
   * day while Today can still edit it; one that can't closes, and a note says which day was left as
   * it was. The ⋯ menu always closes (its card was redrawn); the inline stepper lives in its card, so
   * it closes when its day is not the one shown now.
   */
  const pageWentBack = () => {
    const day = today.value;
    const { menu: m, pad: p, adjusting: a, offAsk: o } = editors.current;
    const left: string[] = [];
    const name = (id: string) => state.value.habits.find((h) => h.id === id)?.name;
    const leave = (e: EditorTarget) => {
      const habit = name(e.habitId);
      if (habit) left.push(fillLine(TODAY_LINES.editorClosed, { habit, day: leftDay(e.date, day) }));
    };
    if (p && !padCardFor(p, day)) {
      setPad(null);
      leave(p);
    }
    if (a && a.date !== day) {
      setAdjusting(null);
      leave(a);
    }
    if (m) {
      setMenu(null);
      if (m.date !== day) leave(m);
    }
    if (o !== null && o !== day) {
      setOffAsk(null);
      left.push(fillLine(TODAY_LINES.dayOffClosed, { day: leftDay(o, day) }));
    }
    if (left[0]) toast({ key: 'editor-closed', message: left[0], tone: 'lavender' });
  };
  const wentBack = useRef(pageWentBack);
  wentBack.current = pageWentBack;

  // The selected day goes back to today on a new day, after a minute hidden, and on leaving Today.
  const [wake, setWake] = useState(0);
  const firstDay = useRef(t);
  useEffect(() => {
    if (t !== firstDay.current) {
      selectDay(null, t);
      wentBack.current();
    }
    firstDay.current = t;
  }, [t]);
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= HIDDEN_RESET_MS) {
        selectDay(null, today.value);
        wentBack.current();
        setWake((w) => w + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      selectDay(null, today.value);
      cancelChoreography();
    };
  }, []);


  // A hand-off that brought her here for a habit on this day ("Open Today" on a calendar day,
  // src/app/handoff.ts): focus goes to its ring once the card is on the page (a folded row opens for
  // it), so the next Enter waters it; with no card for it that day, to the page's heading. A request
  // for another day than the one shown is stale and dropped.
  const screen = useRef<HTMLElement>(null);
  const focusFor = todayFocus.value;
  useEffect(() => {
    if (!focusFor) return;
    if (focusFor.date !== date) {
      todayFocus.value = null;
      return;
    }
    let frames = 0;
    let raf = 0;
    const land = () => {
      const root = screen.current;
      const card = Array.from(root?.querySelectorAll<HTMLElement>('article[data-habit]') ?? []).find((a) => a.dataset.habit === focusFor.habitId);
      const ring = card?.querySelector<HTMLElement>('button[data-state]');
      if (!ring && ++frames < FOCUS_FRAMES) {
        raf = requestAnimationFrame(land);
        return;
      }
      (ring ?? root?.querySelector<HTMLElement>('#today-title'))?.focus();
      todayFocus.value = null;
    };
    raf = requestAnimationFrame(land);
    return () => cancelAnimationFrame(raf);
  }, [focusFor, date]);

  // "N plants a habit" (src/app/shortcuts.ts).
  useEffect(() => {
    const onNew = () => openHabitEditor();
    addEventListener(NEW_HABIT_EVENT, onNew);
    return () => removeEventListener(NEW_HABIT_EVENT, onNew);
  }, []);

  // Group membership: a snapshot taken on load and on a new day or a changed habit, never on a tap.
  const snap = useRef<{ key: string; groups: GroupSnapshot[]; band: string[] } | null>(null);
  const key = `${structureKey(st, date, t)}#${wake}`;
  const byId = cardsById(vm);
  if (!snap.current || snap.current.key !== key) {
    const groups = snapshotGroups(vm);
    snap.current = { key, groups, band: bandOrder(liveGroups(groups, byId)) };
  }
  const groups = liveGroups(snap.current.groups, byId);

  // The band shows six pots: what is still to water when the snapshot was taken, in the list's order,
  // so most taps pour onto a pot on the sill; like the list, it never reorders on a tap.
  const orderKey = snap.current.band.join('|');
  const bandVm = useMemo(() => {
    const at = new Map(snap.current!.band.map((id, i) => [id, i]));
    const sill = [...vm.sill].sort((a, b) => (at.get(a.habitId) ?? 999) - (at.get(b.habitId) ?? 999));
    return { ...vm, sill };
  }, [vm, orderKey]);

  // A day picked on the strip closes the stepper and the menu of the day it leaves.
  useEffect(() => {
    setAdjusting((a) => (a && a.date !== date ? null : a));
    setMenu((m) => (m && m.date !== date ? null : m));
  }, [date]);

  const stage: Stage = {
    pour: (id) => band.current?.pour(id),
    react: (id) => band.current?.react(id),
    quiet: vm.quietRewards,
    addNote: (id, d) => {
      const h = state.value.habits.find((x) => x.id === id);
      const log = state.value.logs[id]?.[d];
      if (h) setNoteTarget({ habitId: id, habitName: h.name, date: d, note: log?.note ?? null });
    },
  };
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const ringOf = (id: string) => document.querySelector<HTMLElement>(`[data-habit="${id}"] [data-state]`);

  // Every card action carries the day that card shows.
  const onRing = useCallback((card: HabitCardVM, ring: HTMLElement, d: DateKey) => {
    switch (tapAction(card)) {
      case 'water':
        water(card, d, ring, stageRef.current);
        break;
      case 'unwater':
        unwater(card, d, stageRef.current);
        break;
      case 'unrest':
        flipRest(card, d);
        break;
      case 'adjust':
        setAdjusting((a) => (a?.habitId === card.id && a.date === d ? null : { habitId: card.id, date: d }));
        break;
    }
  }, []);
  const onHold = useCallback((card: HabitCardVM, ring: HTMLElement, d: DateKey) => {
    const action = holdAction(card);
    if (action === 'pad') setPad({ habitId: card.id, date: d });
    else if (action === 'tiny') water(card, d, ring, stageRef.current, { tiny: true });
  }, []);
  const onMore = useCallback(
    (card: HabitCardVM, anchor: HTMLElement, d: DateKey) => setMenu((m) => (m?.habitId === card.id && m.date === d ? null : { habitId: card.id, date: d, anchor })),
    [],
  );
  const onOpen = useCallback((card: HabitCardVM) => openHabitDetail(card.id), []);
  const onCount = useCallback((card: HabitCardVM, n: number, d: DateKey) => countTo(card, d, n, ringOf(card.id), stageRef.current), []);
  const onAdjusted = useCallback(() => setAdjusting(null), []);

  // The menu belongs to the day it was opened on: it shows only while that day is the page's.
  const menuCard = menu && menu.date === date ? byId.get(menu.habitId) : undefined;
  const menuItems = (c: HabitCardVM, d: DateKey): MenuItem[] => {
    const items: MenuItem[] = [];
    if (c.tinyLabel && (c.canTiny || c.tiny)) {
      items.push({ id: 'tiny', label: TODAY_COPY.menu.tiny, hint: c.tinyLabel, icon: 'tiny', checked: c.tiny, onSelect: () => (c.tiny ? unwater(c, d, stage) : void water(c, d, ringOf(c.id), stage, { tiny: true })) });
    }
    // The number pad's menu way in (DESIGN §11.2: every long press has a button).
    if (holdAction(c) === 'pad') items.push({ id: 'count', label: TODAY_COPY.menu.howMany, icon: 'drop', onSelect: () => setPad({ habitId: c.id, date: d }) });
    if (c.restAllowed || c.rested) items.push({ id: 'rest', label: TODAY_COPY.menu.rest, icon: 'rest', checked: c.rested, onSelect: () => flipRest(c, d) });
    items.push({ id: 'note', label: c.note ? TODAY_COPY.menu.editNote : TODAY_COPY.menu.note, icon: 'note', onSelect: () => stage.addNote(c.id, d) });
    items.push({ id: 'details', label: TODAY_COPY.menu.details, icon: 'info', onSelect: () => openHabitDetail(c.id) });
    items.push({ id: 'edit', label: TODAY_COPY.menu.edit, icon: 'edit', onSelect: () => openHabitEditor({ id: c.id }) });
    return items;
  };

  const residentOf = new Map(vm.sill.map((p) => [p.habitId, p.resident?.petId ?? null]));
  const compact = vm.compactToday;
  const renderCard = (c: HabitCardVM, eager: boolean) => (
    <HabitCard
      card={c}
      date={date}
      past={past}
      weekStart={st.settings.weekStart}
      compact={compact}
      residentPetId={residentOf.get(c.id) ?? null}
      adjusting={adjusting?.habitId === c.id && adjusting.date === date}
      eager={eager}
      onRing={onRing}
      onHold={onHold}
      onMore={onMore}
      onOpen={onOpen}
      onCount={onCount}
      onAdjusted={onAdjusted}
    />
  );

  // The number pad reads and writes its own day, whichever day the page shows now.
  const padCard = pad ? padCardFor(pad, t) : null;
  useEffect(() => {
    if (pad && !padCard) setPad(null);
  });
  // Garnish lands on the band only when the pad's day is the one the band shows.
  const padStage: Stage = pad && pad.date === date ? stage : { ...stage, pour: () => undefined, react: () => undefined };
  const padRing = (id: string) => (pad && pad.date === date ? ringOf(id) : null);
  const allResting = groups.length > 0 && groups.every((g) => g.cards.every((c) => c.rested));
  const nothingOn = !vm.empty && groups.length === 0 && !vm.offDay.isOff;
  const off = vm.offDay;
  const offUsed = off.perMonth - off.remaining;

  const setOff = (on: boolean) => {
    if (on) return setOffAsk(date);
    toggleOffDay(date);
    toast({ key: 'offday', message: CHECKIN_TOASTS.offDayUndo, tone: 'lavender' });
  };

  return (
    <section ref={screen} class={cx(s.screen, past && s.past, compact && s.compact)} aria-labelledby="today-title">
      <Band ref={band} vm={bandVm} state={st} coins={st.wallet.coins} scene={ready} onOpenNote={() => notices.current?.openSill()} onWallet={() => setWalletOpen(true)} />

      <WeekStrip days={vm.weekStrip} onSelect={(d: DateKey) => selectDay(d, t)} />

      {/* Under the strip, so choosing a day never moves the strip under her finger. */}
      {vm.backdating && (
        <div class={s.pastBanner} role="status">
          <span class={s.pastText}>{backdatingBanner(vm.backdating.date)}</span>
          <Button variant="secondary" onClick={() => selectDay(null, t)}>
            {TODAY_LINES.backToToday}
          </Button>
        </div>
      )}


      <div class={s.content}>
        <div class={s.main}>
          {/* A clock behind is the shell's banner, on every tab (App.tsx), so Today doesn't say it twice. */}
          {vm.offDay.isOff && <p class={cx(s.notice, s.offNotice)}>{CHECKIN_TOASTS.offDay}</p>}

          {vm.empty ? (
            <section class={s.empty} aria-labelledby="today-empty">
              <div class={s.emptyArt} aria-hidden="true">
                <CardPlant species="pothos" stage={0} pot="terracotta" size={112} />
              </div>
              <h2 class={s.emptyTitle} id="today-empty">
                {EMPTY.today.slice(0, EMPTY.today.indexOf('.') + 1)}
              </h2>
              <p class={s.emptyText}>{EMPTY.today.slice(EMPTY.today.indexOf('.') + 2)}</p>
              <Button icon="plus" size="lg" onClick={() => openHabitEditor()}>
                {EMPTY.addHabit}
              </Button>
            </section>
          ) : (
            <>
              {nothingOn && <p class={s.quiet}>{EMPTY.nothingOn}</p>}
              {allResting && !vm.offDay.isOff && <p class={s.quiet}>{EMPTY.allResting}</p>}
              <HabitList key={snap.current.key} groups={groups} paused={vm.paused} renderCard={renderCard} onOpenHabit={openHabitDetail} reveal={focusFor?.date === date ? focusFor.habitId : null} />
            </>
          )}
        </div>

        {/* What arrives on the sill: under the list on a phone, a rail beside it on a wide screen. */}
        <div class={s.rail}>
          {ready && <Notices ref={notices} vm={vm} />}

          {!vm.empty && (
            <div class={s.footer}>
              <Button variant="secondary" icon="plus" onClick={() => openHabitEditor()}>
                {TODAY_COPY.addHabit}
              </Button>
              {off.canToggle && (off.isOff || off.remaining > 0) && (
                <div class={s.offDay}>
                  <Toggle checked={off.isOff} onChange={setOff} label={TODAY_LINES.takeTodayOff} tone="lavender" description={offUsed > 0 ? fillLine(TODAY_LINES.offDayAllowance, { count: offUsed }) : undefined} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {menu && menuCard && (
        <CardMenu
          anchor={menu.anchor}
          label={past ? forDayLabel(menuCard.name, date) : menuCard.name}
          items={menuItems(menuCard, date)}
          onClose={(restore) => {
            const a = menu.anchor;
            setMenu(null);
            if (restore) a.focus();
          }}
        />
      )}
      <CountPad
        card={padCard}
        date={pad?.date ?? t}
        past={pad !== null && pad.date < t}
        onCount={(c, n) => pad && countTo(c, pad.date, n, padRing(c.id), padStage)}
        onTiny={(c) => {
          if (!pad) return;
          setPad(null);
          water(c, pad.date, padRing(c.id), padStage, { tiny: true });
        }}
        onClose={() => setPad(null)}
      />
      <NoteSheet target={note} onClose={() => setNoteTarget(null)} />
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} />
      <ConfirmDialog
        open={offAsk !== null}
        title={offAskTitle}
        message={offAskMessage}
        confirmLabel={TODAY_LINES.takeTodayOff}
        cancelLabel={TODAY_LINES.notNow}
        onCancel={() => setOffAsk(null)}
        onConfirm={() => {
          const d = offAsk;
          setOffAsk(null);
          if (d !== null && toggleOffDay(d).ok) toast({ key: 'offday', message: CHECKIN_TOASTS.offDay, tone: 'lavender' });
        }}
      />
    </section>
  );
}

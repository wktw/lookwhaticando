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
import { backdatingBanner, forDayLabel } from '@/catalog/format';
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
import { HabitCard } from './HabitCard';
import { HabitList } from './HabitList';
import { NoteSheet, type NoteTarget } from './NoteSheet';
import { Notices, type NoticesHandle } from './Notices';
import { WalletSheet } from './WalletSheet';
import { WeekStrip } from './WeekStrip';
import { cancelChoreography, countTo, flipRest, tapAction, unwater, water, type Stage } from './checkin';
import { HIDDEN_RESET_MS, cardsById, liveGroups, orderedIds, selectDay, selectedDay, snapshotGroups, structureKey, type GroupSnapshot } from './state';
import { TODAY_COPY } from './copy';
import s from './TodayScreen.module.css';

export function TodayScreen() {
  const st = state.value;
  const t = today.value;
  const picked = selectedDay.value;
  const vm = selectToday(picked !== null && picked < t ? picked : undefined).value;
  const date = vm.date;
  const past = !vm.isToday;

  // The selected day goes back to today on a new day, after a minute hidden, and on leaving Today.
  const [wake, setWake] = useState(0);
  const firstDay = useRef(t);
  useEffect(() => {
    if (t !== firstDay.current) selectDay(null, t);
    firstDay.current = t;
  }, [t]);
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= HIDDEN_RESET_MS) {
        selectDay(null, today.value);
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

  // "N plants a habit" (src/app/shortcuts.ts).
  useEffect(() => {
    const onNew = () => openHabitEditor();
    addEventListener(NEW_HABIT_EVENT, onNew);
    return () => removeEventListener(NEW_HABIT_EVENT, onNew);
  }, []);

  // Group membership: a snapshot taken on load and on a new day or a changed habit, never on a tap.
  const snap = useRef<{ key: string; groups: GroupSnapshot[] } | null>(null);
  const key = `${structureKey(st, date, t)}#${wake}`;
  if (!snap.current || snap.current.key !== key) snap.current = { key, groups: snapshotGroups(vm) };
  const byId = cardsById(vm);
  const groups = liveGroups(snap.current.groups, byId);
  const order = orderedIds(groups);

  // The band follows the list's order, so a watered pot never jumps along the sill.
  const orderKey = order.join('|');
  const bandVm = useMemo(() => {
    const at = new Map(order.map((id, i) => [id, i]));
    const sill = [...vm.sill].sort((a, b) => (at.get(a.habitId) ?? 999) - (at.get(b.habitId) ?? 999));
    return { ...vm, sill };
  }, [vm, orderKey]);

  const band = useRef<BandHandle>(null);
  const notices = useRef<NoticesHandle>(null);
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [padId, setPadId] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [note, setNoteTarget] = useState<NoteTarget | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [offAsk, setOffAsk] = useState(false);

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
  const dateRef = useRef(date);
  dateRef.current = date;

  const ringOf = (id: string) => document.querySelector<HTMLElement>(`[data-habit="${id}"] [data-state]`);

  const onRing = useCallback((card: HabitCardVM, ring: HTMLElement) => {
    const d = dateRef.current;
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
        setAdjusting((a) => (a === card.id ? null : card.id));
        break;
    }
  }, []);
  const onHold = useCallback((card: HabitCardVM, ring: HTMLElement) => {
    if (!card.flexible && card.target > 1 && !card.rested) setPadId(card.id);
    else if (card.tinyLabel && card.canTiny) water(card, dateRef.current, ring, stageRef.current, { tiny: true });
  }, []);
  const onMore = useCallback((card: HabitCardVM, anchor: HTMLElement) => setMenu((m) => (m?.id === card.id ? null : { id: card.id, anchor })), []);
  const onOpen = useCallback((card: HabitCardVM) => openHabitDetail(card.id), []);
  const onCount = useCallback((card: HabitCardVM, n: number) => countTo(card, dateRef.current, n, ringOf(card.id), stageRef.current), []);
  const onAdjusted = useCallback(() => setAdjusting(null), []);

  const menuCard = menu ? byId.get(menu.id) : undefined;
  const menuItems = (c: HabitCardVM): MenuItem[] => {
    const items: MenuItem[] = [];
    if (c.tinyLabel && (c.canTiny || c.tiny)) {
      items.push({ id: 'tiny', label: TODAY_COPY.menu.tiny, hint: c.tinyLabel, icon: 'tiny', checked: c.tiny, onSelect: () => (c.tiny ? unwater(c, date, stage) : void water(c, date, ringOf(c.id), stage, { tiny: true })) });
    }
    if (c.restAllowed || c.rested) items.push({ id: 'rest', label: TODAY_COPY.menu.rest, icon: 'rest', checked: c.rested, onSelect: () => flipRest(c, date) });
    items.push({ id: 'note', label: c.note ? TODAY_COPY.menu.editNote : TODAY_COPY.menu.note, icon: 'note', onSelect: () => stage.addNote(c.id, date) });
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
      adjusting={adjusting === c.id}
      eager={eager}
      onRing={onRing}
      onHold={onHold}
      onMore={onMore}
      onOpen={onOpen}
      onCount={onCount}
      onAdjusted={onAdjusted}
    />
  );

  const padCard = padId ? (byId.get(padId) ?? null) : null;
  const allResting = groups.length > 0 && groups.every((g) => g.cards.every((c) => c.rested));
  const nothingOn = !vm.empty && groups.length === 0 && !vm.offDay.isOff;
  const off = vm.offDay;
  const offUsed = off.perMonth - off.remaining;

  const setOff = (on: boolean) => {
    if (on) return setOffAsk(true);
    toggleOffDay(date);
    toast({ key: 'offday', message: CHECKIN_TOASTS.offDayUndo, tone: 'lavender' });
  };

  return (
    <section class={cx(s.screen, past && s.past, compact && s.compact)} aria-labelledby="today-title">
      <Band ref={band} vm={bandVm} state={st} coins={st.wallet.coins} onOpenNote={() => notices.current?.openSill()} onWallet={() => setWalletOpen(true)} />

      {vm.backdating && (
        <div class={s.pastBanner} role="status">
          <span class={s.pastText}>{backdatingBanner(vm.backdating.date)}</span>
          <Button size="sm" variant="secondary" onClick={() => selectDay(null, t)}>
            {TODAY_LINES.backToToday}
          </Button>
        </div>
      )}

      <WeekStrip days={vm.weekStrip} onSelect={(d: DateKey) => selectDay(d, t)} />

      <div class={s.content}>
        {vm.clockBehind && <p class={s.notice}>{TODAY_LINES.clockBehind}</p>}
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
            <HabitList key={snap.current.key} groups={groups} paused={vm.paused} renderCard={renderCard} onOpenHabit={openHabitDetail} />
          </>
        )}

        <Notices ref={notices} vm={vm} />

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

      {menu && menuCard && (
        <CardMenu
          anchor={menu.anchor}
          label={past ? forDayLabel(menuCard.name, date) : menuCard.name}
          items={menuItems(menuCard)}
          onClose={(restore) => {
            const a = menu.anchor;
            setMenu(null);
            if (restore) a.focus();
          }}
        />
      )}
      <CountPad card={padCard} onCount={(c, n) => countTo(c, date, n, ringOf(c.id), stage)} onTiny={(c) => (setPadId(null), void water(c, date, ringOf(c.id), stage, { tiny: true }))} onClose={() => setPadId(null)} />
      <NoteSheet target={note} onClose={() => setNoteTarget(null)} />
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} />
      <ConfirmDialog
        open={offAsk}
        title={TODAY_LINES.takeTodayOff}
        message={TODAY_LINES.takeTodayOffConfirm}
        confirmLabel={TODAY_LINES.takeTodayOff}
        cancelLabel={TODAY_LINES.notNow}
        onCancel={() => setOffAsk(false)}
        onConfirm={() => {
          setOffAsk(false);
          if (toggleOffDay(date).ok) toast({ key: 'offday', message: CHECKIN_TOASTS.offDay, tone: 'lavender' });
        }}
      />
    </section>
  );
}

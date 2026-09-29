/**
 * The Habit Editor (DESIGN §5.1, §14; VOICE §22): a new habit (from an idea or from scratch) or an
 * edit. Name and icon (suggested from the name) · colour · plant and pot (owned, with the rest shown
 * as teasers that name their series) · how often · how much · the tiny version · when · after… ·
 * do it or avoid it · about how long · why it matters · just this season · who keeps it company.
 * An edit to the rule asks from when; an existing habit can be archived or deleted.
 *
 * Field notes come from HABIT_ISSUES (what to do, never "invalid").
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { HabitIcon } from '@/art/habit-icons';
import { Icon } from '@/art/icons';
import { CollectibleArt } from '@/art/CollectibleArt';
import { HABIT_ICONS } from '@/catalog/habitIcons';
import { MACHINE_BY_ID, seriesLabel } from '@/catalog/machines';
import { PLANTS, POTS } from '@/catalog/collectibles';
import { TEMPLATES, TEMPLATE_GROUPS } from '@/catalog/templates';
import { PASTELS, type MachineId, type PastelKey, type PlantSpeciesId, type PotId } from '@/catalog/types';
import { COMPANION, DATA, EMPTY, HABIT_ISSUES, PERIOD_WORDS, SETTINGS, STAGE_LINES, capitalise, fillLine, plantPhrase } from '@/catalog/lines';
import { periodWord, scheduleText } from '@/catalog/format';
import { LIMITS, MAX_BIG_HABITS, habitInputFromTemplate, validateHabitInput } from '@/domain/habits';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, monthDayLabel } from '@/domain/dates';
import type { RuleEditTiming } from '@/domain/rules';
import type { HabitInput } from '@/state/api';
import type { HabitEditorVM } from '@/state/selectors';
import type { Effort, Schedule, TimeOfDay, Weekday } from '@/state/types';
import { archiveHabit, createHabit, deleteHabit, setCompanion, state, today, updateHabit } from '@/state/store';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Sheet } from '@/ui/Sheet';
import { Segmented } from '@/ui/Segmented';
import { Stepper } from '@/ui/Stepper';
import { TextArea, TextField } from '@/ui/TextField';
import { Toggle } from '@/ui/Toggle';
import { toast } from '@/ui/toast';
import { cx } from '@/ui/cx';
import { RadioTiles, type RadioTile } from './RadioTiles';
import { MONTHLY_EVERY, UNIT_PRESETS, WEEKLY_EVERY, cleanInput, fieldOf, isFlexibleKind, issuesByField, maxTimes, patchOf, scheduleFor, toggleDay, touchesRule, withName, withSchedule, withUnitPreset, type ScheduleKind } from './form';
import { EDITOR_COPY } from './copy';
import s from './HabitEditor.module.css';

const E = SETTINGS.editor;

export interface HabitEditorProps {
  vm: HabitEditorVM;
  /** Called with the habit's id once it is planted or saved, or null when it was archived or deleted. */
  onDone: (habitId: string | null) => void;
  /** The form's primary button lives in the sheet's footer: it submits this form. */
  formId: string;
  /** Told whether the form holds anything that closing would lose (the host asks before discarding). */
  onDirty?: (dirty: boolean) => void;
}

function Section({ id, title, children, note, class: cls }: { id: string; title: string; children: ComponentChildren; note?: string; class?: string }) {
  return (
    <section class={cx(s.section, cls)} aria-labelledby={`${id}-t`}>
      <h3 class={s.sectionTitle} id={`${id}-t`}>
        {title}
      </h3>
      {children}
      {note && (
        <p class={s.fieldNote} role="alert">
          {note}
        </p>
      )}
    </section>
  );
}

/** Fields shown before "More" (a note on any other field opens it). */
const EARLY_FIELDS = new Set<string>(['name', 'icon', 'schedule']);

/** The locked teaser's series: "In No. 05 · Garden". */
function seriesOf(source: string): string | undefined {
  const m = MACHINE_BY_ID.get(source as MachineId);
  return m ? fillLine(EDITOR_COPY.locked, { series: seriesLabel(m) }) : undefined;
}

export function HabitEditor({ vm, onDone, formId, onDirty }: HabitEditorProps) {
  const [form, setForm] = useState<HabitInput>(() => ({ ...vm.input }));
  const [iconChosen, setIconChosen] = useState(vm.mode === 'edit');
  const [template, setTemplate] = useState<string | null>(null);
  const [group, setGroup] = useState<string>(TEMPLATE_GROUPS[0]!.id);
  const [iconQuery, setIconQuery] = useState('');
  const [iconsOpen, setIconsOpen] = useState(false);
  const [companion, setCompanionPick] = useState<string | null>(vm.companion);
  const [applyFrom, setApplyFrom] = useState<RuleEditTiming>('today');
  const [shown, setShown] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  // "More": everything past the name, ideas, how often and when. Open from the start for an edit.
  const [more, setMore] = useState(vm.mode === 'edit');
  // Bumped on a submit with something to fix: focus moves to the first field that needs it.
  const [fix, setFix] = useState(0);
  const weekStart = state.value.settings.weekStart;

  const set = (patch: Partial<HabitInput>) => setForm((f) => ({ ...f, ...patch }));
  const clean = cleanInput(form);
  const issues = useMemo(() => validateHabitInput(state.value, clean, vm.habitId ?? undefined, today.value), [JSON.stringify(clean), vm.habitId]);
  const notes = issuesByField(issues);
  const patch = vm.mode === 'edit' ? patchOf(vm.input, clean) : {};
  const ruleEdit = vm.mode === 'edit' && touchesRule(patch);
  const flexible = isFlexibleKind(form.schedule.kind);
  const counting = !flexible && form.target > 1;

  // Anything typed or chosen is worth a question before it is thrown away.
  const dirty = vm.mode === 'edit' ? Object.keys(patch).length > 0 || companion !== vm.companion : form.name.trim().length > 0 || template !== null;
  useEffect(() => onDirty?.(dirty), [dirty]);

  useEffect(() => {
    if (!fix) return;
    const root = document.getElementById(formId);
    const field = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const alert = root?.querySelector<HTMLElement>('[role="alert"]');
    const target = field ?? alert?.closest('section')?.querySelector<HTMLElement>('input, textarea, button:not([disabled]), [tabindex="0"]') ?? null;
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [fix]);

  const pickTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplate(id);
    const input = habitInputFromTemplate(t);
    const owned = new Set(vm.plants);
    setForm({ ...input, plant: owned.has(input.plant) ? input.plant : form.plant, ...(vm.bigAtLimit && input.effort === 'big' ? { effort: 'steady' as Effort } : {}) });
    setIconChosen(true);
  };

  const submit = (e: Event) => {
    e.preventDefault();
    setShown(true);
    if (issues.length > 0) {
      if (issues.some((i) => !EARLY_FIELDS.has(fieldOf(i)))) setMore(true);
      setFix((n) => n + 1);
      return;
    }
    if (vm.mode === 'new') {
      let id = '';
      try {
        id = createHabit(clean);
      } catch {
        return;
      }
      if (!id) return;
      if (companion) setCompanion(id, companion);
      const plant = plantPhrase(clean.name, clean.plant);
      toast({ key: `planted-${id}`, message: fillLine(STAGE_LINES[0]!, { Plant: capitalise(plant), plant }), tone: 'sage' });
      onDone(id);
      return;
    }
    const id = vm.habitId!;
    try {
      if (Object.keys(patch).length > 0) updateHabit(id, patch, ruleEdit ? applyFrom : 'today');
    } catch {
      return;
    }
    if (companion !== vm.companion) setCompanion(id, companion);
    toast({ key: `saved-${id}`, message: EDITOR_COPY.saved, tone: 'sage' });
    onDone(id);
  };

  const note = (k: keyof typeof notes) => (shown || k === 'effort' ? notes[k] : undefined);

  /* ---------- options ---------- */
  const iconMatches = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    return q ? HABIT_ICONS.filter((i) => i.label.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q))) : HABIT_ICONS;
  }, [iconQuery]);
  const iconTiles: RadioTile<string>[] = iconMatches.map((i) => ({ value: i.id, label: i.label, art: <HabitIcon id={i.id} size={30} tone={form.color} /> }));
  const colourTiles: RadioTile<PastelKey>[] = PASTELS.map((p) => ({ value: p, label: capitalise(p), art: <span class={cx(s.swatch, `ck-tone-${p}`)} /> }));
  const owned = new Set(vm.plants);
  const plantTiles: RadioTile<PlantSpeciesId>[] = PLANTS.filter((p) => p.source === 'starter' || owned.has(p.plant) || MACHINE_BY_ID.has(p.source as MachineId)).map((p) => ({
    value: p.plant,
    label: p.name,
    art: <CollectibleArt id={p.id} size={48} muted={!owned.has(p.plant)} />,
    ...(owned.has(p.plant) ? {} : { disabled: true, hint: seriesOf(p.source) }),
  }));
  const ownedPots = new Set(vm.pots);
  const potTiles: RadioTile<PotId>[] = POTS.filter((p) => p.source === 'starter' || ownedPots.has(p.pot) || MACHINE_BY_ID.has(p.source as MachineId)).map((p) => ({
    value: p.pot,
    label: p.name,
    art: <CollectibleArt id={p.id} size={40} muted={!ownedPots.has(p.pot)} />,
    ...(ownedPots.has(p.pot) ? {} : { disabled: true, hint: seriesOf(p.source) }),
  }));
  const kinds = E.howOften.options;
  const days = Array.from({ length: 7 }, (_, i) => ((i + weekStart) % 7) as Weekday);
  const everyTiles = (sch: Schedule): RadioTile<string>[] =>
    (sch.kind === 'weekly' ? WEEKLY_EVERY : MONTHLY_EVERY).map((n) => ({ value: String(n), label: capitalise((PERIOD_WORDS[sch.kind as 'weekly' | 'monthly'] as Record<number, string>)[n] ?? String(n)) }));
  const followTiles: RadioTile<string>[] = vm.anchors.map((a) => ({ value: a.habitId, label: a.name }));
  const companionTiles: RadioTile<string>[] = [
    { value: '', label: COMPANION.editor.none },
    ...vm.companions.map((p) => {
      const other = p.keepsHabitId && p.keepsHabitId !== vm.habitId ? state.value.habits.find((h) => h.id === p.keepsHabitId)?.name : undefined;
      return { value: p.petId, label: p.name, art: <CollectibleArt id={p.petId} size={32} />, ...(other ? { hint: fillLine(EDITOR_COPY.keepsCompany, { habit: other }) } : {}) };
    }),
  ];

  return (
    <>
      <form id={formId} class={s.form} onSubmit={submit} noValidate>

        <div class={s.nameRow} ref={nameRef}>
          <button type="button" class={s.iconButton} aria-label={`${E.icon}: ${HABIT_ICONS.find((i) => i.id === form.icon)?.label ?? ''}. ${EDITOR_COPY.chooseIcon}`} aria-expanded={iconsOpen} onClick={() => setIconsOpen((o) => !o)}>
            <HabitIcon id={form.icon} size={34} tone={form.color} />
          </button>
          <TextField
            class={s.name}
            label={E.name}
            value={form.name}
            onValue={(v) => setForm((f) => withName(f, v, iconChosen))}
            maxLength={LIMITS.name}
            error={note('name')}
            autoComplete="off"
            enterkeyhint="done"
            data-autofocus={vm.mode === 'new' ? '' : undefined}
          />
        </div>

        {vm.mode === 'new' && (
          <Section id="ideas" title={EDITOR_COPY.ideas}>
            <div class={s.ideas}>
              <RadioTiles<string> label={EDITOR_COPY.ideaGroups} variant="chip" value={group} onChange={setGroup} options={TEMPLATE_GROUPS.map((g) => ({ value: g.id, label: g.label }))} class={s.groups} />
              <RadioTiles
                label={TEMPLATE_GROUPS.find((g) => g.id === group)?.label ?? EDITOR_COPY.ideas}
                variant="chip"
                value={template}
                onChange={pickTemplate}
                options={TEMPLATES.filter((t) => t.group === group).map((t) => ({ value: t.id, label: t.name, art: <HabitIcon id={t.icon} size={22} tone={t.color as PastelKey} /> }))}
              />
            </div>
          </Section>
        )}

        {iconsOpen && (
          <Section id="icon" title={E.icon} note={note('icon')}>
            <TextField label={EDITOR_COPY.searchIcons} hideLabel icon="search" type="search" value={iconQuery} onValue={setIconQuery} placeholder={EDITOR_COPY.searchIcons} />
            {iconTiles.length === 0 ? (
              <p class={s.empty}>{EMPTY.iconPicker}</p>
            ) : (
              <RadioTiles
                label={E.icon}
                variant="icon"
                hideLabels
                value={form.icon}
                onChange={(icon) => {
                  set({ icon });
                  setIconChosen(true);
                }}
                options={iconTiles}
              />
            )}
          </Section>
        )}

        <Section id="often" title={E.howOften.label} note={note('schedule')}>
          <RadioTiles<ScheduleKind>
            label={E.howOften.label}
            labelledBy="often-t"
            variant="chip"
            value={form.schedule.kind}
            onChange={(k) => setForm((f) => withSchedule(f, scheduleFor(k, f.schedule)))}
            options={(['daily', 'days', 'weekly', 'monthly'] as const).map((k) => ({ value: k, label: kinds[k] }))}
          />
          {form.schedule.kind === 'days' && (
            <div class={s.days} role="group" aria-label={EDITOR_COPY.days}>
              {days.map((d) => {
                const on = (form.schedule as { days: Weekday[] }).days.includes(d);
                return (
                  <button key={d} type="button" class={cx(s.day, on && s.dayOn)} aria-pressed={on} aria-label={WEEKDAY_NAMES[d]} onClick={() => setForm((f) => withSchedule(f, { kind: 'days', days: toggleDay((f.schedule as { days: Weekday[] }).days, d) }))}>
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
          )}
          {(form.schedule.kind === 'weekly' || form.schedule.kind === 'monthly') && (
            <div class={s.flexible}>
              <Stepper
                label={EDITOR_COPY.times}
                showLabel
                value={form.schedule.times}
                min={1}
                max={maxTimes(form.schedule)}
                onChange={(times) => setForm((f) => withSchedule(f, { ...(f.schedule as Extract<Schedule, { kind: 'weekly' | 'monthly' }>), times } as Schedule))}
              />
              <p class={s.subTitle} id="every-t">
                {EDITOR_COPY.every}
              </p>
              <RadioTiles
                label={EDITOR_COPY.every}
                labelledBy="every-t"
                variant="chip"
                value={String(form.schedule.every)}
                onChange={(v) => setForm((f) => withSchedule(f, { ...(f.schedule as Extract<Schedule, { kind: 'weekly' | 'monthly' }>), every: Number(v) } as Schedule))}
                options={everyTiles(form.schedule)}
              />
            </div>
          )}
          <p class={s.summary}>{scheduleText(form.schedule, weekStart)}</p>
        </Section>

        <Section id="when" title={E.when.label}>
          <Segmented<TimeOfDay> label={E.when.label} block size="sm" value={form.timeOfDay} onChange={(timeOfDay) => set({ timeOfDay })} options={(['morning', 'midday', 'evening', 'anytime'] as const).map((k) => ({ value: k, label: E.when.options[k] }))} />
        </Section>

        <button type="button" class={s.more} aria-expanded={more} aria-controls="editor-more" onClick={() => setMore((m) => !m)}>
          <span>{EDITOR_COPY.more}</span>
          <Icon name="chevron-down" size={18} class={s.moreChevron} />
        </button>

        <div id="editor-more" class={s.moreBody} hidden={!more}>
          {more && (
            <>
        <Section id="colour" title={E.colour}>
          <RadioTiles label={E.colour} variant="swatch" hideLabels value={form.color} onChange={(color) => set({ color })} options={colourTiles} />
        </Section>

        <Section id="plant" title={E.plant} note={note('plant')}>
          <RadioTiles label={E.plant} variant="tile" value={form.plant} onChange={(plant) => set({ plant })} options={plantTiles} class={s.scroller} />
          <h3 class={s.subTitle} id="pot-t">
            {E.pot}
          </h3>
          <RadioTiles label={E.pot} labelledBy="pot-t" variant="tile" value={form.pot} onChange={(pot) => set({ pot })} options={potTiles} class={s.scroller} />
        </Section>

        {!flexible && (
          <Section id="amount" title={E.howMuch} note={note('amount')}>
            <div class={s.amount}>
              <Stepper label={EDITOR_COPY.amount} showLabel value={form.target} min={1} max={100_000} step={form.target >= 10 ? form.step : 1} unit={form.unit} onChange={(target) => set({ target })} />
              {counting && <Stepper label={EDITOR_COPY.step} showLabel value={form.step} min={1} max={Math.max(1, form.target)} onChange={(step) => set({ step })} unit={form.unit} />}
            </div>
            <div class={s.presets} role="group" aria-label={EDITOR_COPY.unit}>
              {UNIT_PRESETS.map((p) => (
                <button key={p.unit} type="button" class={cx(s.preset, form.unit === p.unit && s.presetOn)} aria-pressed={form.unit === p.unit} onClick={() => setForm((f) => withUnitPreset(f, p))}>
                  {p.unit}
                </button>
              ))}
            </div>
            <TextField label={EDITOR_COPY.unit} value={form.unit ?? ''} onValue={(unit) => set({ unit })} maxLength={LIMITS.unit} />
          </Section>
        )}

        <Section id="tiny" title={E.tiny.label} note={note('tiny')}>
          <TextField
            label={E.tiny.label}
            hideLabel
            value={form.tiny?.label ?? ''}
            placeholder={E.tiny.placeholder}
            maxLength={LIMITS.anchor}
            onValue={(label) => set({ tiny: label ? { ...(form.tiny ?? {}), label } : undefined })}
          />
          {counting && form.tiny && (
            <Stepper label={EDITOR_COPY.tinyCount} showLabel value={form.tiny.count ?? Math.max(1, Math.floor(form.target / 2))} min={1} max={Math.max(1, form.target - 1)} unit={form.unit} onChange={(count) => set({ tiny: { ...form.tiny!, count } })} />
          )}
        </Section>

        <Section id="after" title={E.anchor.label} note={note('anchor')}>
          <TextField label={E.anchor.label} hideLabel value={form.anchor ?? ''} placeholder={E.anchor.placeholder} maxLength={LIMITS.anchor} onValue={(anchor) => set({ anchor })} />
          {followTiles.length > 0 && (
            <>
              <p class={s.subTitle} id="follow-t">
                {EDITOR_COPY.follow}
              </p>
              <RadioTiles
                label={EDITOR_COPY.follow}
                labelledBy="follow-t"
                variant="chip"
                value={form.anchorHabitId ?? null}
                onChange={(id) => set({ anchorHabitId: form.anchorHabitId === id ? undefined : id })}
                options={followTiles}
              />
              {form.anchorHabitId && followTiles.some((t) => t.value === form.anchorHabitId) && (
                <p class={s.fieldHelp}>{fillLine(EDITOR_COPY.followHelp, { habit: followTiles.find((t) => t.value === form.anchorHabitId)!.label })}</p>
              )}
            </>
          )}
        </Section>

        <Section id="polarity" title={E.polarity.label}>
          <Segmented<'build' | 'avoid'> label={E.polarity.label} block size="sm" value={form.polarity} onChange={(polarity) => set({ polarity })} options={(['build', 'avoid'] as const).map((k) => ({ value: k, label: E.polarity.options[k] }))} />
        </Section>

        <Section id="effort" title={E.effort.label} note={note('effort') ?? (vm.bigAtLimit && form.effort !== 'big' && vm.input.effort !== 'big' ? fillLine(HABIT_ISSUES['too-many-big'], { max: MAX_BIG_HABITS }) : undefined)}>
          <RadioTiles<Effort> label={E.effort.label} labelledBy="effort-t" variant="chip" value={form.effort} onChange={(effort) => set({ effort })} options={(['light', 'steady', 'big'] as const).map((k) => ({ value: k, label: E.effort.options[k] }))} />
        </Section>

        <Section id="why" title={E.why} note={note('why')}>
          <TextArea label={E.why} hideLabel value={form.why ?? ''} placeholder={EDITOR_COPY.whyPlaceholder} maxLength={LIMITS.why} showCount rows={2} onValue={(why) => set({ why })} />
        </Section>

        <div class={s.section}>
          <Toggle
            label={E.season}
            checked={form.endsOn !== undefined}
            onChange={(on) => set({ endsOn: on ? vm.seasonEnds : undefined })}
            description={fillLine(EDITOR_COPY.seasonHelp, { date: monthDayLabel(form.endsOn ?? vm.seasonEnds) })}
          />
          {note('endsOn') && (
            <p class={s.fieldNote} role="alert">
              {note('endsOn')}
            </p>
          )}
        </div>

        {vm.companions.length > 0 && state.value.settings.showCompanions !== false && (
          <Section id="company" title={COMPANION.editor.title}>
            <RadioTiles label={COMPANION.editor.title} variant="chip" value={companion ?? ''} onChange={(v) => setCompanionPick(v || null)} options={companionTiles} />
          </Section>
        )}

            </>
          )}
        </div>

        {ruleEdit && (
          <Section id="apply" title={EDITOR_COPY.applyFrom}>
            <RadioTiles<RuleEditTiming>
              label={EDITOR_COPY.applyFrom}
              labelledBy="apply-t"
              variant="chip"
              value={applyFrom}
              onChange={setApplyFrom}
              options={(['today', 'next-period', 'tomorrow'] as const).map((k) => ({
                value: k,
                label: fillLine(EDITOR_COPY.applyOptions[k], { period: isFlexibleKind(vm.input.schedule.kind) ? periodWord({ kind: vm.input.schedule.kind as 'weekly' | 'monthly', every: (vm.input.schedule as { every: number }).every }) : 'week' }),
              }))}
            />
          </Section>
        )}

        {vm.mode === 'edit' && (
          <div class={s.danger}>
            <Button variant="secondary" icon="archive" onClick={() => setConfirm('archive')}>
              {EDITOR_COPY.archive}
            </Button>
            <Button variant="quiet" icon="trash" onClick={() => setConfirm('delete')}>
              {EDITOR_COPY.delete}
            </Button>
          </div>
        )}
      </form>

      {vm.mode === 'edit' && (
        <>
          <ConfirmDialog
            open={confirm === 'archive'}
            title={EDITOR_COPY.archive}
            message={fillLine(DATA.archive, { habit: vm.input.name })}
            confirmLabel={EDITOR_COPY.archive}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              archiveHabit(vm.habitId!);
              onDone(null);
            }}
          />
          <Sheet open={confirm === 'delete'} onClose={() => setConfirm(null)} title={fillLine(DATA.delete, { habit: vm.input.name })} role="alertdialog" size="sm" detents={['content']} initialFocus="[data-keep]">
            <div class={s.deleteBody}>
              <p class={s.deleteAsk}>{DATA.keepPlant}</p>
              <Button
                block
                size="lg"
                data-keep
                onClick={() => {
                  setConfirm(null);
                  deleteHabit(vm.habitId!, { keepPlant: true });
                  onDone(null);
                }}
              >
                {DATA.keepOnBalcony}
              </Button>
              <Button
                block
                size="lg"
                variant="danger"
                onClick={() => {
                  setConfirm(null);
                  deleteHabit(vm.habitId!, { keepPlant: false });
                  onDone(null);
                }}
              >
                {DATA.deleteEverything}
              </Button>
            </div>
          </Sheet>
        </>
      )}
    </>
  );
}

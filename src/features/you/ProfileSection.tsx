/** You › Profile (DESIGN §9.5): the card at the top, her name and her birthday. */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { BIRTHDAY, COUNTS, SETTINGS } from '@/catalog/lines';
import { counted } from '@/catalog/format';
import { MONTH_NAMES } from '@/domain/dates';
import { movedInOn } from '@/domain/eventDays';
import { dayLabel } from './when';
import { CatkinSprig } from '@/art/icons/brand';
import { useArtLight } from '@/art/scene/moment';
import { setBirthday, setName, state, storeLocal } from '@/state/store';
import { TextField } from '@/ui/TextField';
import { fillLine } from '@/catalog/lines';
import { Row } from './parts';
import { PREFS_COPY, YOU } from './copy';
import s from './You.module.css';

const PETS = { one: '1 pet', other: '{count} pets' } as const;
const NAME_MAX = 40;

/** 'MM-DD' ⇄ month and day (0 = not set). */
export function splitBirthday(mmdd: string | undefined): { month: number; day: number } {
  const m = mmdd ? /^(\d{2})-(\d{2})$/.exec(mmdd) : null;
  return m ? { month: Number(m[1]), day: Number(m[2]) } : { month: 0, day: 0 };
}

export function joinBirthday(month: number, day: number): string | undefined {
  if (!month || !day) return undefined;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Days in a month for a birthday (February keeps the 29th). */
export const birthdayDays = (month: number): number => (month ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]! : 31);

/** A plain count line: "7 habits · 14 pets · 401 waterings" (a dot never starts a line). */
export function profileFacts(opts: { habits: number; pets: number; waterings: number; quiet: boolean }): string {
  return [
    opts.habits > 0 ? counted(opts.habits, COUNTS.habits) : null,
    opts.pets > 0 && !opts.quiet ? counted(opts.pets, PETS) : null,
    opts.waterings > 0 ? counted(opts.waterings, COUNTS.waterings) : null,
  ]
    .filter((f): f is string => f !== null)
    .map((f) => f.replace(/ /g, '\u00a0'))
    .join('\u00a0· ');
}

function NameRow() {
  const saved = state.value.profile.name;
  const [draft, setDraft] = useState(saved);
  /** Her own typing not yet saved (an import or the demo replacing the name doesn't count). */
  const dirty = useRef(false);
  // Follow the save when it changes underneath (an import, the demo).
  useEffect(() => {
    dirty.current = false;
    setDraft(saved);
  }, [saved]);
  const commit = () => {
    if (dirty.current && draft.trim() !== saved) setName(draft);
    dirty.current = false;
  };
  // Half-typed when she leaves the app (or an update reloads it while hidden): keep it.
  const latest = useRef(commit);
  latest.current = commit;
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && latest.current();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      latest.current();
    };
  }, []);
  return (
    <Row stack>
      <TextField
        label={SETTINGS.name.label}
        hint={SETTINGS.name.helper}
        value={draft}
        onValue={(v) => {
          dirty.current = true;
          setDraft(v);
        }}
        maxLength={NAME_MAX}
        autoComplete="given-name"
        enterKeyHint="done"
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
            commit();
            e.currentTarget.blur();
          }
        }}
      />
    </Row>
  );
}

function BirthdayRow() {
  const { month, day } = splitBirthday(state.value.profile.birthday);
  const id = useId();
  const set = (m: number, d: number) => setBirthday(joinBirthday(m, Math.min(d || 1, birthdayDays(m))));
  return (
    <Row stack>
      <span class={s.fieldTop}>
        <span class={s.fieldLabel} id={`${id}-label`}>
          {BIRTHDAY.label}
        </span>
      </span>
      <div class={s.selects} role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`}>
        <select
          class={s.select}
          aria-label={PREFS_COPY.birthdayMonth}
          value={String(month)}
          onChange={(e) => {
            const m = Number(e.currentTarget.value);
            if (!m) setBirthday(undefined);
            else set(m, day);
          }}
        >
          <option value="0">{PREFS_COPY.notSet}</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={String(i + 1)}>
              {name}
            </option>
          ))}
        </select>
        <select class={s.select} aria-label={PREFS_COPY.birthdayDay} value={String(day)} disabled={!month} onChange={(e) => set(month, Number(e.currentTarget.value))}>
          {!month && <option value="0">{PREFS_COPY.birthdayDay}</option>}
          {Array.from({ length: birthdayDays(month) }, (_, i) => (
            <option key={i} value={String(i + 1)}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
      <span class={s.fieldHint} id={`${id}-help`}>
        {BIRTHDAY.helper}
      </span>
    </Row>
  );
}

/**
 * Profile: one card. Her name in Castoro, how long the sill has been hers and a few plain counts,
 * then the name and birthday fields.
 */
export function ProfileSection() {
  const app = state.value;
  const light = useArtLight();
  const facts = profileFacts({
    habits: app.habits.filter((h) => h.archivedOn === undefined).length,
    pets: Object.keys(app.pets).length,
    waterings: app.lifetime.checkins,
    quiet: app.settings.quietRewards,
  });
  return (
    <section class={s.profileGroup} aria-labelledby="you-profile">
      <h2 id="you-profile" class="sr-only">
        {YOU.sections.profile}
      </h2>
      <div class={s.card}>
        <div class={s.profile}>
          <span class={s.sprig} aria-hidden="true">
            <CatkinSprig size={44} light={light} />
          </span>
          <div class={s.who}>
            {/* No name yet: the field below asks for one; the card doesn't say it twice. */}
            {app.profile.name && <p class={s.name}>{app.profile.name}</p>}
            <p class={s.since}>{fillLine(YOU.sinceLine, { date: dayLabel(movedInOn(app, storeLocal())) })}</p>
            {facts && <p class={s.facts}>{facts}</p>}
          </div>
        </div>
        <NameRow />
        <BirthdayRow />
      </div>
    </section>
  );
}

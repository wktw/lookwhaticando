/**
 * You › Preferences (DESIGN §9.5, VOICE §22): the day, the look and sound, Today and the capsules,
 * and accessibility. Every change is saved at once (`updateSettings`, which clamps and validates).
 */
import { getPlatform } from '@/platform/capabilities';
import { SETTINGS } from '@/catalog/lines';
import { DAY_STARTS_AT_MAX, DAY_STARTS_AT_MIN } from '@/domain/dates';
import { hemisphereOf } from '@/domain/hemisphere';
import { state, updateSettings } from '@/state/store';
import type { Settings } from '@/state/types';
import { shortcutsEnabled } from '@/app/shortcuts';
import { sfx } from '@/fx/sound';
import { Icon } from '@/art/icons';
import { Group, Row, SegmentRow, SelectRow, ToggleRow } from './parts';
import { PREFS_COPY, YOU } from './copy';
import { minutesLabel } from './calendar';
import s from './You.module.css';

/** Day-start choices: midnight to 6 am, every half hour. */
export const DAY_START_OPTIONS = Array.from({ length: (DAY_STARTS_AT_MAX - DAY_STARTS_AT_MIN) / 30 + 1 }, (_, i) => {
  const m = DAY_STARTS_AT_MIN + i * 30;
  return { value: m, label: minutesLabel(m) };
});

/** Keyboard shortcuts only where a keyboard is likely: a fine pointer (a Mac, an iPad with a trackpad). */
export function keyboardLikely(): boolean {
  return typeof matchMedia !== 'function' || matchMedia('(any-pointer: fine)').matches || !matchMedia('(pointer: coarse)').matches;
}

/** Haptics only where the device can play them: a phone's vibration, or an iPhone's switch tick. */
export function hapticsSupported(): boolean {
  return getPlatform().haptics.supported();
}

const set = (patch: Partial<Settings>) => updateSettings(patch);

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function DaysSection() {
  const st = state.value;
  const g = st.settings;
  const weekday = (d: 0 | 1) => ({ value: String(d) as '0' | '1', label: PREFS_COPY.weekdays[d] });
  return (
    <Group id="days" title={YOU.sections.days}>
      <SegmentRow label={SETTINGS.weekStart.label} helper={SETTINGS.weekStart.helper} value={String(g.weekStart) as '0' | '1'} options={[weekday(1), weekday(0)]} onChange={(v) => set({ weekStart: v === '0' ? 0 : 1 })} />
      <SelectRow label={SETTINGS.dayStart.label} helper={SETTINGS.dayStart.helper} value={g.dayStartsAt} options={DAY_START_OPTIONS} onChange={(v) => set({ dayStartsAt: v })} />
      <SelectRow
        label={SETTINGS.hemisphere.label}
        value={hemisphereOf(st, timeZone())}
        options={[
          { value: 'north', label: SETTINGS.hemisphere.options.north },
          { value: 'south', label: SETTINGS.hemisphere.options.south },
        ]}
        onChange={(v) => set({ hemisphere: v })}
      />
    </Group>
  );
}

export function LookSection() {
  const g = state.value.settings;
  const themes = (['auto', 'light', 'night'] as const).map((v) => ({ value: v, label: SETTINGS.theme.options[v] }));
  return (
    <Group id="look" title={YOU.sections.look}>
      <SegmentRow label={SETTINGS.theme.label} value={g.theme} options={themes} onChange={(v) => set({ theme: v })} />
      <ToggleRow label={SETTINGS.sounds.label} helper={SETTINGS.sounds.helper} checked={g.sound} onChange={(v) => set({ sound: v })} />
      {g.sound && (
        <Row label={<label for="you-volume">{SETTINGS.volume.label}</label>} stack>
          <span class={s.volume}>
            <Icon name="mute" size={20} />
            <input
              id="you-volume"
              class={s.range}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(g.volume * 100)}
              style={{ '--fill': `${Math.round(g.volume * 100)}%` }}
              aria-valuetext={`${Math.round(g.volume * 100)}%`}
              onInput={(e) => set({ volume: Number(e.currentTarget.value) / 100 })}
              // A small coin at the new level, so she hears what she chose.
              onChange={() => sfx.play('coin', { volume: 0.8 })}
            />
            <Icon name="volume" size={20} />
          </span>
        </Row>
      )}
      {hapticsSupported() && <ToggleRow label={SETTINGS.haptics.label} helper={SETTINGS.haptics.helper} checked={g.haptics} onChange={(v) => set({ haptics: v })} />}
    </Group>
  );
}

export function TodayPrefsSection() {
  const g = state.value.settings;
  return (
    <Group id="today-prefs" title={YOU.sections.today}>
      <ToggleRow label={SETTINGS.quietRewards.label} helper={SETTINGS.quietRewards.helper} checked={g.quietRewards} onChange={(v) => set({ quietRewards: v })} />
      <ToggleRow label={SETTINGS.compactToday.label} helper={SETTINGS.compactToday.helper} checked={g.compactToday === true} onChange={(v) => set({ compactToday: v })} />
      <ToggleRow label={SETTINGS.companions.label} helper={SETTINGS.companions.helper} checked={g.showCompanions !== false} onChange={(v) => set({ showCompanions: v })} />
      {!g.quietRewards && <ToggleRow label={SETTINGS.quickOpen.label} helper={SETTINGS.quickOpen.helper} checked={g.quickOpen} onChange={(v) => set({ quickOpen: v })} />}
      <ToggleRow label={SETTINGS.quoteNotes.label} helper={SETTINGS.quoteNotes.helper} checked={g.quoteNotes !== false} onChange={(v) => set({ quoteNotes: v })} />
    </Group>
  );
}

export function AccessSection() {
  const g = state.value.settings;
  const motion = (['auto', 'on', 'off'] as const).map((v) => ({ value: v, label: SETTINGS.reduceMotion.options[v] }));
  return (
    <Group id="access" title={YOU.sections.access}>
      <SegmentRow label={SETTINGS.reduceMotion.label} value={g.reduceMotion} options={motion} onChange={(v) => set({ reduceMotion: v })} />
      {keyboardLikely() && <ToggleRow label={PREFS_COPY.shortcuts.label} helper={PREFS_COPY.shortcuts.helper} checked={shortcutsEnabled(g)} onChange={(v) => set({ keyboardShortcuts: v })} />}
    </Group>
  );
}

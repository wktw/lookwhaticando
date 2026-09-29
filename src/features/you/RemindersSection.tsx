/**
 * You › Watering time (DESIGN §11.1, VOICE §20): a time for Morning, Midday and Evening, each with
 * "Add to calendar". catkin can't send notifications, so the calendar does the reminding.
 */
import { EMPTY, REMINDERS } from '@/catalog/lines';
import type { WateringSlot } from '@/domain/profile';
import { state, updateSettings, wateringTimeFile } from '@/state/store';
import { Button } from '@/ui/Button';
import { Icon } from '@/art/icons';
import { cx } from '@/ui/cx';
import { toneClass } from '@/ui/tone';
import bs from '@/ui/Button.module.css';
import { Group } from './parts';
import { PREFS_COPY } from './copy';
import { WATERING_SLOTS, clockLabel, isAppleTouch, slotTimes, staticCalPath, wantsStaticCal } from './calendar';
import { downloadText } from './files';
import s from './You.module.css';

function setTime(slot: WateringSlot, time: string | null) {
  const reminders = { ...state.value.settings.reminders };
  if (time) reminders[slot] = time;
  else delete reminders[slot];
  updateSettings({ reminders });
}

function staticCal(): boolean {
  return wantsStaticCal({ single: __SINGLE_FILE__, protocol: location.protocol, appleTouch: isAppleTouch() });
}

function AddToCalendar({ slot, time }: { slot: WateringSlot; time: string }) {
  const label = `${REMINDERS.add}, ${REMINDERS.rows[slot]} ${clockLabel(time)}`;
  if (staticCal()) {
    // A real link to a real file: Calendar takes it from an installed iPhone app.
    return (
      <a class={cx(bs.btn, bs.secondary, bs.sm, toneClass('blush'))} href={staticCalPath(slot, time)} target="_blank" rel="noopener" aria-label={label} data-cal={slot}>
        <span class={bs.icon}>
          <Icon name="calendar" size={18} />
        </span>
        <span class={bs.label}>{REMINDERS.add}</span>
      </a>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      icon="calendar"
      aria-label={label}
      data-cal={slot}
      onClick={() => {
        const file = wateringTimeFile(slot);
        if (file) downloadText(file.name, file.text, 'text/calendar');
      }}
    >
      {REMINDERS.add}
    </Button>
  );
}

export function RemindersSection() {
  const reminders = state.value.settings.reminders;
  const any = WATERING_SLOTS.some((slot) => reminders[slot]);
  return (
    <Group id="reminders" title={REMINDERS.title} footer={any ? REMINDERS.helper : `${EMPTY.reminders} ${REMINDERS.helper}`}>
      {WATERING_SLOTS.map((slot) => {
        const time = reminders[slot] ?? '';
        const id = `you-water-${slot}`;
        return (
          <div key={slot} class={`${s.row} ${s.inline}`}>
            <span class={s.rowText}>
              <label class={s.label} for={id}>
                {REMINDERS.rows[slot]}
              </label>
            </span>
            <span class={s.actions}>
              {time && <AddToCalendar slot={slot} time={time} />}
              <select id={id} class={s.select} value={time} onChange={(e) => setTime(slot, e.currentTarget.value || null)}>
                <option value="">{PREFS_COPY.off}</option>
                {slotTimes(slot).map((t) => (
                  <option key={t} value={t}>
                    {clockLabel(t)}
                  </option>
                ))}
              </select>
            </span>
          </div>
        );
      })}
    </Group>
  );
}


/**
 * You (DESIGN §9.5): who she is, her habits in her order, how catkin behaves, watering times, her
 * data, the install guide and About. On a phone, one calm column of paper groups under small-caps
 * labels; from 1180 px, two columns (her profile, habits and preferences; then accessibility,
 * watering time, data, the install guide and About), in the same reading order. At
 * #/you/diagnostics, Diagnostics instead.
 *
 * While this window can't change the save (another window owns it, or a newer catkin wrote it),
 * every setting sits in a disabled fieldset; saving or copying a backup still works.
 */
import { routeRest } from '@/app/router';
import { ProfileSection } from './ProfileSection';
import { HabitsSection } from './HabitsSection';
import { AccessSection, DaysSection, LookSection, TodayPrefsSection } from './PreferencesSection';
import { RemindersSection } from './RemindersSection';
import { DataSection } from './DataSection';
import { InstallSection } from './InstallSection';
import { AboutSection } from './AboutSection';
import { Diagnostics } from './Diagnostics';
import { DATA_COPY, YOU } from './copy';
import { saveLocked } from './lock';
import s from './You.module.css';

export function YouScreen() {
  if (routeRest.value[0] === 'diagnostics') return <Diagnostics />;
  const locked = saveLocked();
  return (
    <section class={s.screen} aria-labelledby="you-title">
      <header class={s.header}>
        <h1 id="you-title" class={s.title}>
          {YOU.title}
        </h1>
      </header>
      {locked && <p class={s.lockedNote}>{DATA_COPY.readOnly}</p>}
      <div class={s.columns}>
        <div class={s.column}>
          <fieldset class={s.lock} role="none" disabled={locked}>
            <ProfileSection />
            <HabitsSection />
            <DaysSection />
            <LookSection />
            <TodayPrefsSection />
          </fieldset>
        </div>
        <div class={s.column}>
          <fieldset class={s.lock} role="none" disabled={locked}>
            <AccessSection />
            <RemindersSection />
          </fieldset>
          <DataSection />
          <InstallSection />
          <AboutSection />
        </div>
      </div>
    </section>
  );
}

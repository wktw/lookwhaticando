/**
 * You (DESIGN §9.5): who she is, her habits in her order, how catkin behaves, watering times, her
 * data, the install guide and About. One calm column of paper groups under small-caps labels; at
 * #/you/diagnostics, Diagnostics instead.
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
import { YOU } from './copy';
import s from './You.module.css';

export function YouScreen() {
  if (routeRest.value[0] === 'diagnostics') return <Diagnostics />;
  return (
    <section class={s.screen} aria-labelledby="you-title">
      <header class={s.header}>
        <h1 id="you-title" class={s.title}>
          {YOU.title}
        </h1>
      </header>
      <ProfileSection />
      <HabitsSection />
      <DaysSection />
      <LookSection />
      <TodayPrefsSection />
      <AccessSection />
      <RemindersSection />
      <DataSection />
      <InstallSection />
      <AboutSection />
    </section>
  );
}

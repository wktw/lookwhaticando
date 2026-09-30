/**
 * The cards on Today below the list (DESIGN §9.1, §13, §14): what arrived on the sill and what is
 * offered, never modal. The first capsule, a letter waiting, a story on a plant tag, the Keeping
 * Company offer (at most once a day, never after 3 declines), the Season Review with its fresh-start
 * chips, the birthday and came-home days, and (once) the pets that settled on the Balcony Box.
 */
import type { ComponentChildren, Ref } from 'preact';
import { forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { CollectibleArt } from '@/art/CollectibleArt';
import { NoteCard } from '@/art/progress';
import { Icon } from '@/art/icons';
import { BIRTHDAY, CAME_HOME, COMPANION, PET_CARD, TODAY_LINES, fillLine, plantPhrase } from '@/catalog/lines';
import { movedToPlaceLine, plural } from '@/catalog/format';
import { navigate } from '@/app/router';
import type { PlaceId } from '@/catalog/types';
import type { DateKey } from '@/state/types';
import type { CompanionOfferVM, TodayVM } from '@/state/selectors';
import { declineCompanionOffer, noteCompanionOffer, noteSettledNotice, setCompanion, state, today } from '@/state/store';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/toast';
import { openPetCard } from '@/features/habits/open';
import { StorySheet, type StoryTarget } from './SillSheets';
import { openRitual } from '@/features/rituals/open';
import { SeasonReviewCard } from './SeasonReview';
import { TODAY_COPY } from './copy';
import s from './Notices.module.css';

export interface NoticesHandle {
  /** The note or story on the sill was tapped: open it. */
  openSill(): void;
}

/**
 * The offer, once shown today, stays on Today until she answers it (the store marks it shown the
 * moment it appears, so the view model drops it at once).
 */
const offerLatch = signal<{ day: DateKey; offer: CompanionOfferVM } | null>(null);

/**
 * The one-time Balcony settling notice (DEC-P10): shown once. The store forgets it the moment it
 * appears (so a reload never shows it again), and it stays on Today for the rest of the day.
 */
const settledLatch = signal<{ day: DateKey; pets: { petId: string; place: PlaceId }[] } | null>(null);

function Notice({ art, title, children, actions, below, tone }: { art?: ComponentChildren; title: string; children?: ComponentChildren; actions?: ComponentChildren; below?: ComponentChildren; tone?: 'butter' | 'lavender' | 'blush' | 'sage' }) {
  return (
    <section class={s.notice} data-tone={tone} aria-label={title}>
      {art && (
        <div class={s.art} aria-hidden="true">
          {art}
        </div>
      )}
      <div class={s.words}>
        <p class={s.title}>{title}</p>
        {children}
        {actions && <div class={s.actions}>{actions}</div>}
      </div>
      {below && <div class={s.below}>{below}</div>}
    </section>
  );
}

export const Notices = forwardRef(function Notices({ vm }: { vm: TodayVM }, ref: Ref<NoticesHandle>) {
  const [story, setStory] = useState<StoryTarget | null>(null);
  const st = state.value;
  const day = today.value;

  useImperativeHandle(ref, () => ({
    openSill() {
      if (vm.letterWaiting) openRitual(vm.letterWaiting.id, { fromSill: true });
      else if (vm.storyWaiting) setStory(vm.storyWaiting);
    },
  }));

  // Keeping Company: latch the offer for today and tell the store it was shown.
  useEffect(() => {
    if (vm.companionOffer && vm.isToday && offerLatch.value?.day !== day) {
      offerLatch.value = { day, offer: vm.companionOffer };
      noteCompanionOffer();
    }
  }, [vm.companionOffer, day]);
  // The one-time settling notice: latch it for today and tell the store it was shown.
  useEffect(() => {
    if (vm.settled.length === 0 || !vm.isToday) return;
    const held = settledLatch.value?.day === day ? settledLatch.value.pets : [];
    settledLatch.value = { day, pets: [...held, ...vm.settled.filter((x) => !held.some((h) => h.petId === x.petId))] };
    noteSettledNotice();
  }, [vm.settled, vm.isToday, day]);
  const settled = settledLatch.value?.day === day ? settledLatch.value.pets : vm.isToday ? vm.settled : [];

  const latched = offerLatch.value;
  const offer = latched && latched.day === day && vm.showCompanions ? latched.offer : null;
  const offerPet = offer ? st.pets[offer.petId] : undefined;
  const freeHabits = offer ? offer.habitIds.map((id) => st.habits.find((h) => h.id === id && h.archivedOn === undefined && h.companionId === undefined)).filter((h) => h !== undefined) : [];
  const closeOffer = () => (offerLatch.value = null);
  const pair = (habitId: string, chose: boolean) => {
    if (!offer || !offerPet) return;
    const h = st.habits.find((x) => x.id === habitId);
    if (!h || !setCompanion(habitId, offer.petId)) return;
    const plant = plantPhrase(h.name, h.plant);
    toast({ key: 'company', message: fillLine(chose ? COMPANION.chose : COMPANION.movedIn, { name: offerPet.name, plant }), tone: 'blush' });
    closeOffer();
  };

  const quiet = vm.quietRewards;
  const storyHabit = vm.storyWaiting ? st.habits.find((h) => h.id === vm.storyWaiting!.habitId) : undefined;

  return (
    <>
      {vm.seasonReview && vm.isToday && <SeasonReviewCard review={vm.seasonReview} />}

      {vm.letterWaiting && (
        <Notice
          art={<NoteCard kind={vm.letterWaiting.kind} size={64} />}
          title={TODAY_LINES.letterWaiting[vm.letterWaiting.kind]}
          tone="butter"
          actions={
            <Button onClick={() => openRitual(vm.letterWaiting!.id, { fromSill: true })}>
              {TODAY_COPY.read}
            </Button>
          }
        />
      )}

      {vm.storyWaiting && storyHabit && (
        <Notice
          art={<NoteCard kind="story" size={64} />}
          title={fillLine(TODAY_LINES.storyWaiting, { habit: storyHabit.name })}
          tone="blush"
          actions={
            <Button onClick={() => setStory(vm.storyWaiting)}>
              {TODAY_COPY.read}
            </Button>
          }
        />
      )}

      {offer && offerPet && freeHabits.length > 0 && (
        <Notice
          art={<CollectibleArt id={offer.petId} size={64} />}
          title={fillLine(COMPANION.reveal.find, { name: offerPet.name })}
          tone="blush"
          below={
            <>
              <div class={s.chips} role="group" aria-label={fillLine(TODAY_COPY.pickPlant, { name: offerPet.name })}>
                {freeHabits.map((h) => (
                  <button key={h.id} type="button" class={s.chip} onClick={() => pair(h.id, false)}>
                    {h.name}
                  </button>
                ))}
              </div>
              <div class={s.actions}>
                {offer.suggested && (
                  <Button onClick={() => pair(offer.suggested!, true)}>
                    {fillLine(COMPANION.reveal.choose, { name: offerPet.name })}
                  </Button>
                )}
                <Button
                  variant="quiet"
                  onClick={() => {
                    declineCompanionOffer();
                    closeOffer();
                  }}
                >
                  {COMPANION.reveal.notNow}
                </Button>
              </div>
            </>
          }
        >
        </Notice>
      )}

      {vm.birthday && (
        <Notice art={<Icon name="gift" size={36} />} title={BIRTHDAY.card} tone="blush">
          {vm.birthday.petIds.length > 0 && (
            <ul class={s.lines}>
              {vm.birthday.petIds.slice(0, 4).map((id, i) => (
                <li key={id}>{fillLine(BIRTHDAY.pets[i % BIRTHDAY.pets.length]!, { name: st.pets[id]?.name ?? '' })}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      {vm.cameHome.map((c) =>
        st.pets[c.petId] ? (
          <Notice key={c.petId} art={<CollectibleArt id={c.petId} size={56} />} title={fillLine(plural(c.years, CAME_HOME.pet), { name: st.pets[c.petId]!.name, years: c.years })} tone="sage">
            <div class={s.actions}>
              <Button variant="secondary" onClick={() => openPetCard(c.petId)}>
                {fillLine(PET_CARD.nameTag, { name: st.pets[c.petId]!.name })}
              </Button>
            </div>
          </Notice>
        ) : null,
      )}

      {settled.map((x) =>
        st.pets[x.petId] ? (
          <Notice key={`settled-${x.petId}`} art={<CollectibleArt id={x.petId} size={56} />} title={movedToPlaceLine(st.pets[x.petId]!.name, x.place)} tone="sage">
            <div class={s.actions}>
              <Button variant="secondary" onClick={() => openPetCard(x.petId)}>
                {fillLine(PET_CARD.nameTag, { name: st.pets[x.petId]!.name })}
              </Button>
            </div>
          </Notice>
        ) : null,
      )}

      {!quiet && vm.firstCapsuleWaiting ? (
        <Notice
          art={<Icon name="tab-capsules" size={36} />}
          title={TODAY_LINES.firstCapsuleWaiting}
          tone="butter"
          actions={
            <Button onClick={() => navigate('capsules')}>
              {TODAY_COPY.toCapsules}
            </Button>
          }
        />
      ) : (
        !quiet && vm.firstCapsule && <Notice art={<Icon name="tab-capsules" size={36} />} title={TODAY_LINES.firstCapsule} tone="butter" />
      )}

      <StorySheet target={story} onClose={() => setStory(null)} />
    </>
  );
});

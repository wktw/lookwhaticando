/**
 * Gallery sections for the fxui module: the UI kit (light + night panels), FX triggers,
 * sounds, celebrations, the install guide, and the app icon / splash stages that
 * scripts/generate-icons.mjs screenshots. View with /gallery.html?only=fxui.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { GallerySection } from './sections';
import { state, wallet } from '@/state/store';
import { emitGameEvents } from '@/state/events';
import type { GameEvent } from '@/state/api';
import type { Habit } from '@/state/types';
import { PetArt } from '@/art/pets/PetArt';
import { CoinIcon, StarIcon } from '@/art/icons';
import {
  AnimatedNumber,
  CandyButton,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  FilterChip,
  IconButton,
  ListGroup,
  ListRow,
  Pill,
  ProgressBar,
  ProgressRing,
  RarityPill,
  SectionHeader,
  Segmented,
  Sheet,
  Stepper,
  TextArea,
  TextField,
  Toaster,
  Toggle,
  toast,
  type CandyVariant,
} from '@/ui';
import { PASTELS, RARITIES } from '@/catalog/types';
import { burst } from '@/fx/confetti';
import { flyCoins } from '@/fx/coinFly';
import { floatText } from '@/fx/floatingText';
import { haptic } from '@/fx/haptics';
import { PET_VOICES, SFX_NAMES, sfx, type PetVoice } from '@/fx/sound';
import { SparkleBurst } from '@/fx/SparkleBurst';
import { CelebrationHost } from '@/fx/celebrations';
import { walletDelta } from '@/fx/celebrationPlan';
import { celebrateCheckIn } from '@/fx/checkin';
import { InstallGuide, InstallSheet, type InstallGuideKey } from '@/app/InstallGuide';
import { AppIconArt, type AppIconShape } from '@/app/AppIconArt';
import { SplashArt } from '@/app/SplashArt';
import { ScreenError, ScreenLoading } from '@/app/ScreenHost';
import { ErrorFallback } from '@/app/ErrorBoundary';
import { WalletSummary } from '@/app/WalletSummary';
import { GumballArt } from '@/app/GumballArt';
import type { InstallPlatform } from '@/app/installPrompt';

/* ------------------------------------------------------------------------------------------ */
/* Gallery scaffolding                                                                         */
/* ------------------------------------------------------------------------------------------ */

const GALLERY_CSS = `
.fxui-panels { display: flex; flex-wrap: wrap; gap: 16px; }
.fxui-panel { flex: 1 1 380px; min-width: 0; padding: 18px; border-radius: 26px; background: var(--bg); color: var(--ink); box-shadow: 0 0 0 1px var(--line); }
.fxui-panel > .fxui-cap { font: 700 12px var(--font-body); color: var(--ink-2); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 12px; }
.fxui-stack { display: flex; flex-direction: column; gap: 14px; }
.fxui-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.fxui-sub { font: 800 12px var(--font-body); color: var(--ink-2); margin: 6px 0 -4px; }
.fxui-wallet { position: fixed; top: 12px; right: 12px; z-index: 90; display: flex; gap: 8px; }
.fxui-wallet > span { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px 0 8px; border-radius: 999px; background: var(--card); box-shadow: var(--shadow-md); font: 600 17px var(--font-display); }
.fxui-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.fxui-pressed > span:nth-of-type(2) { transform: translateY(3px); }
`;

let tokensInstalled = false;

function installGalleryCss() {
  if (document.getElementById('fxui-gallery-css')) return;
  const el = document.createElement('style');
  el.id = 'fxui-gallery-css';
  el.textContent = GALLERY_CSS;
  document.head.appendChild(el);
}
installGalleryCss();

/**
 * Lets a panel render in the other theme: copies the :root light/night token rules onto
 * `.fxui-panel[data-theme=…]`. Components' own night rules key off [data-theme='night'].
 */
function installPanelTokens() {
  if (tokensInstalled) return;
  tokensInstalled = true;
  const light: string[] = [];
  const night: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const sel = rule.selectorText.replace(/'/g, '"');
      if (sel === ':root') light.push(rule.style.cssText);
      else if (sel === ':root[data-theme="night"]') night.push(rule.style.cssText);
    }
  }
  const el = document.createElement('style');
  el.textContent = `.fxui-panel[data-theme="light"]{${light.join('')}}\n.fxui-panel[data-theme="night"]{${night.join('')}}`;
  document.head.appendChild(el);
}

type Theme = 'light' | 'night';

/** Renders children once per theme, side by side (only night when the page itself is night). */
function Panels({ children }: { children: (theme: Theme) => ComponentChildren }) {
  const [, setReady] = useState(false);
  useLayoutEffect(() => {
    installPanelTokens();
    setReady(true);
  }, []);
  const pageNight = document.documentElement.dataset.theme === 'night';
  const themes: Theme[] = pageNight ? ['night'] : ['light', 'night'];
  return (
    <div class="fxui-panels">
      {themes.map((t) => (
        <div key={t} class="fxui-panel" data-theme={t}>
          <div class="fxui-cap">{t === 'light' ? 'Morning Meadow · light' : 'Moonlight Meadow · night'}</div>
          {children(t)}
        </div>
      ))}
    </div>
  );
}

function Sub({ children }: { children: ComponentChildren }) {
  return <p class="fxui-sub">{children}</p>;
}

let hostOwner: object | null = null;

/** Mounts one Toaster + CelebrationHost (and a wallet target) for the whole gallery page. */
function FxHosts() {
  const [me] = useState(() => ({}));
  if (!hostOwner) hostOwner = me;
  useEffect(
    () => () => {
      if (hostOwner === me) hostOwner = null;
    },
    [],
  );
  useLayoutEffect(installPanelTokens, []);
  if (hostOwner !== me) return null;
  const w = wallet.value;
  return (
    <>
      <div class="fxui-wallet" aria-label="Demo wallet">
        <span data-wallet-target="coins">
          <CoinIcon size={26} />
          <AnimatedNumber value={w.coins} walletKind="coins" />
        </span>
        <span data-wallet-target="stars">
          <StarIcon size={24} />
          <AnimatedNumber value={w.stars} walletKind="stars" />
        </span>
      </div>
      <Toaster />
      <CelebrationHost />
    </>
  );
}

const DEMO_HABITS: [string, string, Habit['plant'], Habit['pot'], Habit['color']][] = [
  ['h-walk', 'Morning walk', 'sunflower', 'terracotta', 'sage'],
  ['h-water', 'Drink water', 'monstera', 'cream', 'sky'],
  ['h-yoga', 'Yoga', 'lavender', 'blush', 'lavender'],
];

/** Gives the stub store a few habits and coins so celebrations have names to say. */
function seedDemoState() {
  const s = state.value;
  if (s.habits.length) return;
  const habits: Habit[] = DEMO_HABITS.map(([id, name, plant, pot, color], order) => ({
    id,
    name,
    icon: 'sparkle',
    color,
    plant,
    pot,
    schedule: { kind: 'daily' },
    target: 1,
    effort: 'steady',
    createdOn: '2026-06-01',
    pauses: [],
    order,
  }));
  state.value = { ...s, habits, profile: { ...s.profile, name: 'Sam', buddy: 'pet-mochi' }, wallet: { coins: 120, stars: 6, tickets: 1, stardust: 4 } };
}

function addCoins(n: number) {
  const s = state.value;
  state.value = { ...s, wallet: { ...s.wallet, coins: s.wallet.coins + n } };
}

function addStars(n: number) {
  const s = state.value;
  state.value = { ...s, wallet: { ...s.wallet, stars: s.wallet.stars + n } };
}

/** What the store does: commit the events' coins and stars, then emit them (same tick). */
function commitAndEmit(events: GameEvent[]) {
  for (const e of events) {
    const d = walletDelta(e);
    if (d?.kind === 'coins') addCoins(d.amount);
    else if (d?.kind === 'stars') addStars(d.amount);
  }
  emitGameEvents(events);
}

const rectOf = (e: MouseEvent) => (e.currentTarget as HTMLElement).getBoundingClientRect();

/* ------------------------------------------------------------------------------------------ */
/* UI kit                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const VARIANTS: CandyVariant[] = ['primary', 'secondary', 'soft', 'ghost', 'danger'];

function Buttons({ params }: { params: URLSearchParams }) {
  const [busy, setBusy] = useState(false);
  // ?focus=1 shows the keyboard focus ring (programmatic focus on load counts as keyboard focus).
  useEffect(() => {
    if (params.get('focus')) document.querySelector<HTMLElement>('[data-demo-focus]')?.focus();
  }, []);
  return (
    <Panels>
      {(theme) => (
        <div class="fxui-stack">
          <Sub>Variants</Sub>
          <div class="fxui-row">
            {VARIANTS.map((v) => (
              <CandyButton key={v} variant={v}>
                {v[0]!.toUpperCase() + v.slice(1)}
              </CandyButton>
            ))}
          </div>
          <Sub>Sizes, icons, loading, disabled</Sub>
          <div class="fxui-row">
            <CandyButton size="sm" icon="plus">
              Small
            </CandyButton>
            <CandyButton size="md" icon="plus">
              Add habit
            </CandyButton>
            <CandyButton size="lg" iconRight="chevron-right">
              Large
            </CandyButton>
          </div>
          <Sub>States: loading · pressed · focus ring (?focus=1) · live loading</Sub>
          <div class="fxui-row">
            <CandyButton loading>Saving</CandyButton>
            <CandyButton class="fxui-pressed">Pressed</CandyButton>
            <CandyButton variant="secondary" class="fxui-pressed">
              Pressed
            </CandyButton>
            <CandyButton variant="soft" tone="sky" {...(theme === 'light' ? { 'data-demo-focus': true } : {})}>
              Focused
            </CandyButton>
            <CandyButton loading={busy} variant="secondary" onClick={() => (setBusy(true), setTimeout(() => setBusy(false), 1600))}>
              {busy ? 'Saving' : 'Tap to load'}
            </CandyButton>
          </div>
          <div class="fxui-row">
            <CandyButton disabled>Disabled</CandyButton>
            <CandyButton variant="secondary" disabled>
              Disabled
            </CandyButton>
            <CandyButton icon={<CoinIcon size={20} />} tone="butter">
              Insert 25
            </CandyButton>
          </div>
          <Sub>Tones (primary · soft)</Sub>
          <div class="fxui-row">
            {PASTELS.map((t) => (
              <CandyButton key={t} tone={t} size="sm">
                {t}
              </CandyButton>
            ))}
          </div>
          <div class="fxui-row">
            {PASTELS.map((t) => (
              <CandyButton key={t} tone={t} variant="soft" size="sm">
                {t}
              </CandyButton>
            ))}
          </div>
          <CandyButton size="lg" block icon="sparkle">
            Block button
          </CandyButton>
          <Sub>IconButton: plain · soft · candy · card · pressed</Sub>
          <div class="fxui-row">
            <IconButton icon="more" label="More" />
            <IconButton icon="edit" label="Edit" variant="soft" />
            <IconButton icon="heart" label="Favorite" variant="soft" tone="blush" pressed />
            <IconButton icon="plus" label="Add" variant="candy" />
            <IconButton icon="plus" label="Add" variant="candy" tone="sage" size="lg" />
            <IconButton icon="camera" label="Photo" variant="card" />
            <IconButton icon="close" label="Close" variant="soft" size="sm" tone="lavender" />
            <IconButton icon="trash" label="Delete" variant="plain" disabled />
          </div>
        </div>
      )}
    </Panels>
  );
}

function ControlsPanel() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [theme, setTheme] = useState<'auto' | 'light' | 'night'>('auto');
  const [week, setWeek] = useState<'mon' | 'sun'>('mon');
  const [filters, setFilters] = useState<Record<string, boolean>>({ Cats: true, Cows: false, Bunnies: true, Treats: false });
  const [count, setCount] = useState(8);
  const [name, setName] = useState('Drink water');
  const [bad, setBad] = useState('');
  const [notes, setNotes] = useState('A glass with every meal, and one before bed.');
  return (
    <div class="fxui-stack">
      <Sub>Toggle</Sub>
      <Card padding="sm" style={{ padding: '4px 16px' }}>
        <Toggle checked={on} onChange={setOn} label="Sounds" description="Soft chimes and pet voices" />
        <Toggle checked={off} onChange={setOff} label="Quick capsule open" />
        <Toggle checked disabled onChange={() => undefined} label="Disabled" />
      </Card>
      <Sub>Segmented</Sub>
      <Segmented
        label="Theme"
        block
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'light', label: 'Light', icon: 'sun' },
          { value: 'night', label: 'Night', icon: 'moon' },
        ]}
      />
      <Segmented
        label="Week starts on"
        size="sm"
        value={week}
        onChange={setWeek}
        options={[
          { value: 'mon', label: 'Monday' },
          { value: 'sun', label: 'Sunday' },
        ]}
      />
      <Sub>FilterChip · Chip</Sub>
      <div class="fxui-row">
        {Object.entries(filters).map(([k, v], i) => (
          <FilterChip key={k} selected={v} tone={PASTELS[i * 2]} onChange={(sel) => setFilters({ ...filters, [k]: sel })} count={[9, 8, 7, 12][i]}>
            {k}
          </FilterChip>
        ))}
      </div>
      <div class="fxui-row">
        <Chip tone="sage">Daily</Chip>
        <Chip tone="sky" icon="calendar">
          3× a week
        </Chip>
        <Chip tone="lilac" onRemove={() => toast({ message: 'Removed 🌸' })} removeLabel="Remove Yoga">
          Yoga
        </Chip>
      </div>
      <Sub>Stepper</Sub>
      <Stepper label="Glasses per day" showLabel value={count} onChange={setCount} min={1} max={20} unit="glasses" />
      <Sub>TextField · TextArea</Sub>
      <TextField label="Habit name" value={name} onValue={setName} maxLength={40} showCount placeholder="What do you want to grow?" />
      <TextField label="Search" hideLabel icon="search" value="" onValue={() => undefined} placeholder="Search friends and treats" type="search" />
      <TextField label="Reminder time" value={bad} onValue={setBad} error={bad ? undefined : 'Pick a time and we’ll add it to your calendar.'} placeholder="08:30" trailing="am" />
      <TextArea label="Notes" hint="Only you can see this." value={notes} onValue={setNotes} rows={2} />
    </div>
  );
}

function Controls() {
  return <Panels>{() => <ControlsPanel />}</Panels>;
}

function Surfaces() {
  return (
    <Panels>
      {() => (
        <div class="fxui-stack">
          <SectionHeader
            title="This week"
            subtitle="6 of 7 check-ins · 86%"
            action={
              <CandyButton variant="ghost" size="sm">
                See all
              </CandyButton>
            }
          />
          <div class="fxui-row" style={{ alignItems: 'stretch' }}>
            <Card style={{ flex: '1 1 140px' }}>
              <b>Plain card</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>White, 22px corners, warm shadow.</p>
            </Card>
            <Card tone="butter" flat style={{ flex: '1 1 140px' }}>
              <b>Tinted card</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>For wells and callouts.</p>
            </Card>
            <Card as="button" interactive tone="lavender" style={{ flex: '1 1 140px' }} onClick={() => sfx.play('pop')}>
              <b>Interactive</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>Lifts on hover, squishes on press.</p>
            </Card>
          </div>
          <ListGroup title="Preferences" footer="Sounds follow your phone’s silent switch.">
            <ListRow leading="volume" leadingTone="peach" title="Sounds" trailing={<Toggle checked hideLabel label="Sounds" onChange={() => undefined} />} />
            <ListRow leading="moon" leadingTone="lavender" title="Theme" subtitle="Follows your device" trailing="Auto" onClick={() => undefined} />
            <ListRow leading="calendar" leadingTone="sky" title="Week starts on" trailing="Monday" onClick={() => undefined} />
            <ListRow leading={<PetArt petId="pet-mochi" size={36} shadow={false} />} title="Buddy" subtitle="Mochi keeps you company on Today" onClick={() => undefined} />
            <ListRow leading="trash" leadingTone="danger" title="Reset everything" destructive onClick={() => undefined} />
          </ListGroup>
          <Card padding="none">
            <EmptyState
              title="Let’s plant your first habit!"
              art={<PetArt petId="pet-mochi" expression="happy" size={112} animated />}
              action={
                <CandyButton icon="plus" size="lg">
                  Add a habit
                </CandyButton>
              }
            >
              Pick something tiny. Mochi will cheer for every check-in.
            </EmptyState>
          </Card>
        </div>
      )}
    </Panels>
  );
}

function AnimatedDemo() {
  const [n, setN] = useState(120);
  return (
    <div class="fxui-row">
      <span style={{ font: '600 28px var(--font-display)', minWidth: '90px' }}>
        <AnimatedNumber value={n} />
      </span>
      <CandyButton size="sm" variant="soft" tone="butter" onClick={() => setN(n + 25)}>
        +25
      </CandyButton>
      <CandyButton size="sm" variant="soft" tone="sky" onClick={() => setN(Math.max(0, n - 25))}>
        −25
      </CandyButton>
    </div>
  );
}

function Status() {
  const [v, setV] = useState(0.62);
  return (
    <Panels>
      {() => (
        <div class="fxui-stack">
          <Sub>ProgressRing</Sub>
          <div class="fxui-row" style={{ gap: '18px' }}>
            <ProgressRing value={0.26} label="26% this week" size={72} tone="sky">
              <span class="num" style={{ fontSize: '18px', fontWeight: 600 }}>
                26%
              </span>
            </ProgressRing>
            <ProgressRing value={v} label={`${Math.round(v * 100)}% consistent this month`} size={112} tone="sage">
              <span class="num" style={{ fontSize: '28px', fontWeight: 600 }}>
                {Math.round(v * 100)}%
              </span>
              <small style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: '12px' }}>September</small>
            </ProgressRing>
            <ProgressRing value={1} label="All done today" size={88} tone="blush">
              <span class="num" style={{ fontSize: '20px', fontWeight: 600 }}>
                5/5
              </span>
            </ProgressRing>
            <CandyButton size="sm" variant="soft" tone="sage" onClick={() => setV(Math.random())}>
              Shuffle
            </CandyButton>
          </div>
          <Sub>ProgressBar</Sub>
          <ProgressBar value={v} label="Set progress" valueText="7 of 18" tone="blush" />
          <ProgressBar value={0.3} label="Friendship" tone="lavender" size="sm" />
          <ProgressBar value={0.9} label="Sunshine to Blooming" tone="butter" size="lg" />
          <ProgressBar value={0} label="Empty" tone="sky" />
          <Sub>Pill · RarityPill</Sub>
          <div class="fxui-row">
            <Pill tone="butter" icon={<CoinIcon size={18} />}>
              25
            </Pill>
            <Pill tone="lavender" icon={<StarIcon size={18} />} variant="solid">
              3
            </Pill>
            <Pill tone="sage">Set complete ✓</Pill>
            <Pill>Until Nov 10</Pill>
            <Pill variant="solid">7 / 18</Pill>
            <Pill tone="blush" size="sm" variant="solid">
              NEW!
            </Pill>
          </div>
          <div class="fxui-row">
            {RARITIES.map((r) => (
              <RarityPill key={r} rarity={r} />
            ))}
            {RARITIES.map((r) => (
              <RarityPill key={`${r}-sm`} rarity={r} size="sm" />
            ))}
          </div>
          <Sub>AnimatedNumber</Sub>
          <AnimatedDemo />
        </div>
      )}
    </Panels>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Sheets                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function Sheets({ params }: { params: URLSearchParams }) {
  const [open, setOpen] = useState<string | null>(params.get('open'));
  const [inner, setInner] = useState(false);
  const [name, setName] = useState('Morning walk');
  const [kind, setKind] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [remind, setRemind] = useState(true);
  const close = () => setOpen(null);
  return (
    <div class="fxui-stack">
      <FxHosts />
      <div class="fxui-row">
        <CandyButton onClick={() => setOpen('basic')}>Habit editor sheet</CandyButton>
        <CandyButton variant="secondary" onClick={() => setOpen('tall')}>
          Tall sheet (medium ↔ large)
        </CandyButton>
        <CandyButton variant="secondary" onClick={() => setOpen('stack')}>
          Stacked sheets
        </CandyButton>
        <CandyButton variant="soft" onClick={() => setOpen('peek')}>
          Sheet with peeking pet
        </CandyButton>
        <CandyButton variant="danger" onClick={() => setOpen('confirm')}>
          Confirm (danger)
        </CandyButton>
        <CandyButton variant="ghost" onClick={() => setOpen('sticky')}>
          Non-dismissible
        </CandyButton>
      </div>

      <Sheet
        open={open === 'basic'}
        onClose={close}
        title="Edit habit"
        description="Small and steady grows the best plants."
        footer={
          <>
            <CandyButton variant="secondary" size="lg" onClick={close}>
              Cancel
            </CandyButton>
            <CandyButton size="lg" onClick={() => (close(), toast({ message: 'Saved “Morning walk” 🌻', tone: 'sage' }))}>
              Save
            </CandyButton>
          </>
        }
      >
        <div class="fxui-stack">
          <TextField label="Name" value={name} onValue={setName} maxLength={40} showCount />
          <Segmented
            label="How often"
            block
            value={kind}
            onChange={setKind}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
          <Toggle checked={remind} onChange={setRemind} label="Calendar reminder" description="Adds an event your phone reminds you about" />
        </div>
      </Sheet>

      <Sheet open={open === 'tall'} onClose={close} title="Collection book" detents={['medium', 'large']}>
        <ListGroup>
          {Array.from({ length: 24 }, (_, i) => (
            <ListRow key={i} leading="sparkle" leadingTone={PASTELS[i % PASTELS.length]} title={`Collectible #${i + 1}`} subtitle="Drag the sheet up to see more" />
          ))}
        </ListGroup>
      </Sheet>

      <Sheet open={open === 'stack'} onClose={close} title="Pet sheet" description="Tap below to stack a second sheet.">
        <div class="fxui-stack">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <PetArt petId="pet-mochi" size={120} animated />
          </div>
          <CandyButton block onClick={() => setInner(true)}>
            Open wardrobe
          </CandyButton>
        </div>
        <Sheet open={inner} onClose={() => setInner(false)} title="Wardrobe" size="sm">
          <p style={{ color: 'var(--ink-2)' }}>A second sheet on top. Esc closes just this one; focus returns to the button below.</p>
          <div style={{ marginTop: '16px' }}>
            <CandyButton block variant="secondary" onClick={() => setInner(false)}>
              Done
            </CandyButton>
          </div>
        </Sheet>
      </Sheet>

      <Sheet open={open === 'peek'} onClose={close} title="Mochi says hi" peek={<PetArt petId="pet-mochi" expression="happy" size={92} animated />}>
        <p style={{ color: 'var(--ink-2)' }}>Sheets can carry a little friend peeking over the top edge.</p>
      </Sheet>

      <ConfirmDialog
        open={open === 'confirm'}
        tone="danger"
        title="Delete “Morning walk”?"
        message="Its plant and history go too. You can archive it instead to keep them."
        art={<PetArt petId="pet-mochi" expression="surprised" size={96} />}
        confirmLabel="Delete habit"
        cancelLabel="Keep it"
        onConfirm={() => (close(), toast({ message: 'Habit deleted', action: { label: 'Undo', onAction: () => toast({ message: 'Restored 🌱', tone: 'sage' }) } }))}
        onCancel={close}
      />

      <Sheet open={open === 'sticky'} onClose={close} title="Choose one" dismissible={false} size="sm">
        <p style={{ color: 'var(--ink-2)', marginBottom: '16px' }}>No drag, scrim or Esc dismissal: this sheet waits for a choice.</p>
        <CandyButton block onClick={close}>
          Okay!
        </CandyButton>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* FX                                                                                          */
/* ------------------------------------------------------------------------------------------ */

function Fx() {
  const [spark, setSpark] = useState(0);
  useEffect(seedDemoState, []);
  const checkIn = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    // Like a screen: checkIn() commits and emits, then the flourish claims its coins.
    const events: GameEvent[] = [{ type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-walk' }];
    commitAndEmit(events);
    celebrateCheckIn({ events, coins: 5, completed: true, rewarded: true }, 'h-walk', el);
  };
  return (
    <div class="fxui-stack">
      <FxHosts />
      <Panels>{() => <FxTriggers spark={spark} setSpark={setSpark} checkIn={checkIn} />}</Panels>
    </div>
  );
}

function FxTriggers({ spark, setSpark, checkIn }: { spark: number; setSpark: (n: number) => void; checkIn: (e: MouseEvent) => void }) {
  return (
    <div class="fxui-stack">
      <Sub>Confetti (at the button · big & epic without an origin fire corner cannons)</Sub>
      <div class="fxui-row">
        {(['tiny', 'small', 'medium'] as const).map((i) => (
          <CandyButton key={i} variant="soft" tone="blush" onClick={(e) => burst({ ...center(rectOf(e)), intensity: i })}>
            {i}
          </CandyButton>
        ))}
        <CandyButton variant="soft" tone="peach" onClick={() => burst({ intensity: 'big' })}>
          big
        </CandyButton>
        <CandyButton tone="butter" onClick={() => burst({ intensity: 'epic' })}>
          epic
        </CandyButton>
        <CandyButton variant="soft" tone="butter" onClick={(e) => burst({ ...center(rectOf(e)), intensity: 'medium', shapes: ['coin'] })}>
          coins
        </CandyButton>
        <CandyButton variant="soft" tone="lilac" onClick={(e) => burst({ ...center(rectOf(e)), intensity: 'small', shapes: ['heart'], colors: ['#FFC4D3', '#F58CAA', '#FF9FB8'] })}>
          hearts
        </CandyButton>
      </div>
      <Sub>Coin flight → wallet (top right) · floating text · sparkle burst · haptics</Sub>
      <div class="fxui-row">
        <CandyButton icon="check" tone="sage" onClick={checkIn}>
          Check in (+5)
        </CandyButton>
        <CandyButton variant="secondary" icon={<CoinIcon size={20} />} onClick={(e) => (addCoins(24), void flyCoins({ from: rectOf(e), amount: 24 }))}>
          Fly 24 coins
        </CandyButton>
        <CandyButton variant="secondary" icon={<StarIcon size={20} />} onClick={(e) => (addStars(3), void flyCoins({ from: rectOf(e), amount: 3, kind: 'stars' }))}>
          Fly 3 stars
        </CandyButton>
        <CandyButton variant="soft" tone="butter" onClick={(e) => floatText('+5', rectOf(e))}>
          +5 float
        </CandyButton>
        <CandyButton variant="soft" tone="lavender" onClick={(e) => floatText('+1', rectOf(e), { tone: 'star' })}>
          +1 star float
        </CandyButton>
        <CandyButton variant="soft" tone="blush" onClick={(e) => floatText('♥ +4', rectOf(e), { tone: 'heart' })}>
          ♥ float
        </CandyButton>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <CandyButton variant="soft" tone="sky" onClick={() => setSpark(spark + 1)}>
            Sparkle burst
          </CandyButton>
          <SparkleBurst trigger={spark} count={8} radius={44} />
        </span>
        <CandyButton variant="ghost" onClick={() => haptic('tick')}>
          Haptic tick
        </CandyButton>
        <CandyButton variant="ghost" onClick={() => haptic('success')}>
          Haptic success
        </CandyButton>
      </div>
      <Sub>Toasts</Sub>
      <div class="fxui-row">
        <CandyButton variant="secondary" onClick={() => toast({ message: 'Saved 🌱', tone: 'sage' })}>
          Simple
        </CandyButton>
        <CandyButton variant="secondary" onClick={() => toast({ message: 'Walk marked as a rest day', action: { label: 'Undo', onAction: () => toast({ message: 'Back on the list 🌼' }) } })}>
          With Undo
        </CandyButton>
        <CandyButton
          variant="secondary"
          onClick={() => toast({ message: 'Patches loves Strawberry! 💕', art: <PetArt petId="pet-cat-calico" size={34} expression="love" shadow={false} />, tone: 'blush' })}
        >
          With pet art
        </CandyButton>
        <CandyButton variant="secondary" onClick={() => rapidCheckins()}>
          Rapid coins (coalesced)
        </CandyButton>
        <CandyButton
          variant="secondary"
          onClick={() => toast({ key: 'sw-update', message: 'A fresh version is ready 🌱', tone: 'sage', duration: 0, action: { label: 'Refresh', onAction: () => undefined } })}
        >
          Update ready
        </CandyButton>
      </div>
    </div>
  );
}

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Five quick check-ins nobody celebrated locally: one calm, growing toast. */
function rapidCheckins() {
  seedDemoState();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => commitAndEmit([{ type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-water' }]), i * 180);
  }
}

const VOICE_PET: Record<PetVoice, string> = {
  mew: 'pet-mochi',
  moo: 'pet-cow-holstein',
  woof: 'pet-dog-corgi',
  squeak: 'pet-bunny-white',
  ribbit: 'pet-frog-green',
  grr: 'pet-bear-brown',
  peep: 'pet-hamster-golden',
  quack: 'pet-duck-yellow',
};

function Sounds() {
  return (
    <div class="fxui-stack">
      <Sub>Sound effects</Sub>
      <div class="fxui-row">
        {SFX_NAMES.map((n) => (
          <CandyButton key={n} size="sm" variant="secondary" onClick={() => sfx.play(n)}>
            {n}
          </CandyButton>
        ))}
      </div>
      <Sub>Pet voices</Sub>
      <div class="fxui-row">
        {PET_VOICES.map((v) => (
          <CandyButton key={v} variant="soft" tone="peach" icon={<PetArt petId={VOICE_PET[v]} size={28} shadow={false} />} onClick={() => sfx.voice(v)}>
            {v}
          </CandyButton>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Celebrations                                                                                */
/* ------------------------------------------------------------------------------------------ */

const CELEBRATIONS: Record<string, { label: string; events: GameEvent[] }> = {
  perfectDay: {
    label: 'Perfect day',
    events: [
      { type: 'perfectDay', date: '2026-09-29', coins: 10 },
      { type: 'coins', amount: 10, reason: 'perfect' },
    ],
  },
  milestone: {
    label: 'Milestone (7 days)',
    events: [
      { type: 'milestone', habitId: 'h-walk', rung: 7, unit: 'days', coins: 25, stars: 1, tickets: 0 },
      { type: 'coins', amount: 25, reason: 'milestone' },
      { type: 'stars', amount: 1, reason: 'milestone' },
    ],
  },
  badge: {
    label: 'Badge',
    events: [
      { type: 'badge', badgeId: 'first-perfect-day', stars: 1 },
      { type: 'stars', amount: 1, reason: 'badge' },
    ],
  },
  bloom: { label: 'Plant blooms', events: [{ type: 'plantStage', habitId: 'h-yoga', stage: 5, stageName: 'Blooming' }] },
  evergreen: {
    label: 'Plant evergreen',
    events: [
      { type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' },
      { type: 'badge', badgeId: 'first-evergreen', stars: 5 },
      { type: 'stars', amount: 5, reason: 'badge' },
    ],
  },
  stacked: {
    label: 'Stacked (perfect day + milestone + badge + goal)',
    events: [
      { type: 'perfectDay', date: '2026-09-29', coins: 12 },
      { type: 'coins', amount: 12, reason: 'perfect' },
      { type: 'milestone', habitId: 'h-water', rung: 30, unit: 'days', coins: 60, stars: 2, tickets: 1 },
      { type: 'coins', amount: 60, reason: 'milestone' },
      { type: 'stars', amount: 2, reason: 'milestone' },
      { type: 'tickets', amount: 1 },
      { type: 'badge', badgeId: 'checkins-50', stars: 2 },
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
    ],
  },
  exclusive: {
    label: 'Exclusive (epic)',
    events: [
      { type: 'milestone', habitId: 'h-walk', rung: 90, unit: 'days', coins: 120, stars: 4, tickets: 1, exclusive: 'wear-evergreen-crown' },
      { type: 'coins', amount: 120, reason: 'milestone' },
      { type: 'stars', amount: 4, reason: 'milestone' },
    ],
  },
  bestFriends: { label: 'Best friends (pet L10)', events: [{ type: 'petLevel', petId: 'pet-mochi', level: 10 }] },
  sprout: { label: 'Plant sprouted (toast)', events: [{ type: 'plantStage', habitId: 'h-water', stage: 2, stageName: 'Seedling' }] },
  period: {
    label: 'Weekly goal (toast)',
    events: [
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
      { type: 'coins', amount: 10, reason: 'period' },
    ],
  },
  welcome: {
    label: 'Welcome back (toast)',
    events: [
      { type: 'welcomeBack', habitId: 'h-walk', coins: 3 },
      { type: 'coins', amount: 3, reason: 'welcome' },
    ],
  },
  petLevel: { label: 'Friendship level (toast)', events: [{ type: 'petLevel', petId: 'pet-mochi', level: 3 }] },
  favorite: { label: 'Favorite found (toast)', events: [{ type: 'favoriteFound', petId: 'pet-mochi', treatId: 'treat-strawberry' }] },
  fusion: {
    label: 'Stardust fusion (toast)',
    events: [
      { type: 'stardust', amount: 8, fused: 1 },
      { type: 'stars', amount: 1, reason: 'fusion' },
    ],
  },
  letter: { label: 'Letter (toast)', events: [{ type: 'letter', letterId: 'w-2026-09-21' }] },
};

/** A banner, a letter and a screen's Undo toast all at once: toasts must stay visible below it. */
function collision() {
  commitAndEmit([...CELEBRATIONS.perfectDay!.events, { type: 'letter', letterId: 'w-2026-09-28' }]);
  toast({ message: 'Walk marked as a rest day', action: { label: 'Undo', onAction: () => toast({ message: 'Back on the list 🌼' }) } });
}

function Celebrations({ params }: { params: URLSearchParams }) {
  useEffect(() => {
    seedDemoState();
    const auto = params.get('celebrate');
    const run = auto === 'collision' ? collision : auto && CELEBRATIONS[auto] ? () => commitAndEmit(CELEBRATIONS[auto]!.events) : null;
    if (run) {
      const t = setTimeout(run, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);
  return (
    <div class="fxui-stack">
      <FxHosts />
      <div class="fxui-row">
        {Object.entries(CELEBRATIONS).map(([k, c]) => (
          <CandyButton key={k} size="sm" variant={c.label.includes('toast') ? 'secondary' : 'soft'} tone={k === 'exclusive' ? 'butter' : 'blush'} onClick={() => commitAndEmit(c.events)}>
            {c.label}
          </CandyButton>
        ))}
        <CandyButton size="sm" variant="secondary" onClick={collision}>
          Banner + letter + Undo (collision)
        </CandyButton>
        <CandyButton size="sm" variant="secondary" onClick={() => rapidCheckins()}>
          Rapid check-ins (toast)
        </CandyButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Install, app icon, splash                                                                   */
/* ------------------------------------------------------------------------------------------ */

const PLATFORMS: (InstallPlatform | InstallGuideKey)[] = ['ios-safari', 'ios-safari-classic', 'ios-other', 'mac-safari', 'prompt', 'chromium', 'android', 'other', 'installed'];

function Install({ params }: { params: URLSearchParams }) {
  const [platform, setPlatform] = useState<InstallPlatform | InstallGuideKey | null>((params.get('install') as InstallPlatform | InstallGuideKey | null) ?? null);
  return (
    <div class="fxui-stack">
      <FxHosts />
      <Panels>{() => <InstallGuide />}</Panels>
      <div class="fxui-row">
        {PLATFORMS.map((p) => (
          <CandyButton key={p} size="sm" variant="secondary" onClick={() => setPlatform(p)}>
            {p}
          </CandyButton>
        ))}
      </div>
      <InstallSheet open={!!platform} platform={platform ?? 'ios-safari'} onClose={() => setPlatform(null)} />
    </div>
  );
}

function Shell() {
  return (
    <Panels>
      {() => (
        <div class="fxui-row" style={{ alignItems: 'stretch' }}>
          <Card padding="none" style={{ flex: '1 1 260px' }}>
            <ScreenLoading />
          </Card>
          <Card padding="none" style={{ flex: '1 1 260px' }}>
            <ScreenError onRetry={() => toast({ message: 'Waking it up… 🌱' })} />
          </Card>
          <Card padding="none" style={{ flex: '1 1 260px' }}>
            <ErrorFallback onRetry={() => toast({ message: 'Trying again 🌱' })} />
          </Card>
          <div class="fxui-stack" style={{ flex: '1 1 220px' }}>
            <WalletSummary />
            <div class="fxui-row">
              <GumballArt size={40} />
              <GumballArt size={64} />
            </div>
          </div>
        </div>
      )}
    </Panels>
  );
}

const SHAPES: AppIconShape[] = ['square', 'squircle', 'maskable'];

function AppIcon({ params }: { params: URLSearchParams }) {
  const stage = params.get('stage') as AppIconShape | null;
  if (stage) {
    const size = Number(params.get('size') ?? 512);
    return (
      <div id="mm-icon-stage" style={{ width: `${size}px`, height: `${size}px` }}>
        <AppIconArt size={size} shape={stage} />
      </div>
    );
  }
  return (
    <div class="fxui-stack">
      {SHAPES.map((shape) => (
        <div key={shape} class="fxui-row" style={{ alignItems: 'flex-end', gap: '18px' }}>
          <b style={{ width: '80px' }}>{shape}</b>
          {[180, 96, 60, 32].map((s) => (
            <div key={s} style={{ borderRadius: shape === 'squircle' ? 0 : `${s * 0.225}px`, overflow: 'hidden', lineHeight: 0 }}>
              <AppIconArt size={s} shape={shape} title={`${shape} ${s}`} />
            </div>
          ))}
          {shape === 'maskable' && (
            <div style={{ borderRadius: '50%', overflow: 'hidden', lineHeight: 0 }} title="maskable, circle mask">
              <AppIconArt size={96} shape={shape} />
            </div>
          )}
        </div>
      ))}
      <div class="fxui-row">
        <b style={{ width: '80px' }}>favicon</b>
        <img src="/icons/favicon.svg" width={64} height={64} alt="favicon" />
        <img src="/icons/favicon.svg" width={32} height={32} alt="" />
        <img src="/icons/favicon.svg" width={16} height={16} alt="" />
      </div>
    </div>
  );
}

function Splash({ params }: { params: URLSearchParams }) {
  const theme = params.get('splash') as 'light' | 'night' | null;
  if (theme) {
    const w = Number(params.get('w') ?? 393);
    const h = Number(params.get('h') ?? 852);
    return (
      <div id="mm-splash-stage" style={{ position: 'fixed', inset: 0, zIndex: 9999 } as JSX.CSSProperties}>
        <SplashArt theme={theme} width={w} height={h} />
      </div>
    );
  }
  return (
    <div class="fxui-row" style={{ alignItems: 'flex-start' }}>
      {(['light', 'night'] as const).map((t) => (
        <div key={t} style={{ borderRadius: '28px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <SplashArt theme={t} width={236} height={512} />
        </div>
      ))}
    </div>
  );
}

export const SECTIONS: GallerySection[] = [
  { id: 'fxui-buttons', title: 'UI kit · CandyButton & IconButton', render: (p) => <Buttons params={p} /> },
  { id: 'fxui-controls', title: 'UI kit · Toggle, Segmented, Chips, Stepper, Fields', render: () => <Controls /> },
  { id: 'fxui-surfaces', title: 'UI kit · Card, ListRow, SectionHeader, EmptyState', render: () => <Surfaces /> },
  { id: 'fxui-status', title: 'UI kit · ProgressRing, ProgressBar, Pills, AnimatedNumber', render: () => <Status /> },
  { id: 'fxui-sheets', title: 'UI kit · Sheet & ConfirmDialog', render: (p) => <Sheets params={p} /> },
  { id: 'fxui-fx', title: 'FX · confetti, coin flight, floating text, sparkles, toasts', render: () => <Fx /> },
  { id: 'fxui-sounds', title: 'FX · sounds & pet voices', render: () => <Sounds /> },
  { id: 'fxui-celebrations', title: 'FX · celebrations (banners, epic moment, calm toasts)', render: (p) => <Celebrations params={p} /> },
  { id: 'fxui-shell', title: 'App · loading, error & error-boundary states, wallet, gumball', render: () => <Shell /> },
  { id: 'fxui-install', title: 'App · install guide', render: (p) => <Install params={p} /> },
  { id: 'fxui-appicon', title: 'App · icon (square · squircle · maskable) & favicon', render: (p) => <AppIcon params={p} /> },
  { id: 'fxui-splash', title: 'App · launch screen', render: (p) => <Splash params={p} /> },
];

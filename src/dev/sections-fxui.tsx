/**
 * Gallery sections for the ui module: the catkin kit (day and Lamplight panels side by side),
 * the water-fill check ring, the kit's small drawings, notes and celebrations, petals and the
 * coin, sounds, the install guide, and the app shell at 390 px and 1200 px. The app icon and
 * launch screen stages stay here because scripts/generate-icons.mjs screenshots them.
 * View with /gallery.html?only=fxui (or one section id).
 */
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { GallerySection } from './sections';
import { state, wallet } from '@/state/store';
import { emitGameEvents } from '@/state/events';
import type { GameEvent } from '@/state/api';
import type { Habit } from '@/state/types';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { CoinIcon, StarIcon, TicketIcon } from '@/art/icons';
import {
  AnimatedNumber,
  Button,
  Card,
  CheckRing,
  CheckRingArt,
  CHECK_RING_MS,
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
  type ButtonVariant,
  type CheckRingMark,
} from '@/ui';
import { ToastNote } from '@/ui/Toaster';
import { CuttingGlass, EmptyPot, ObjectArt, PaperNote, WaterDrop, type ObjectName } from '@/ui/art/objects';
import { PASTELS, RARITIES } from '@/catalog/types';
import { burst } from '@/fx/confetti';
import { flyCoins } from '@/fx/coinFly';
import { floatText } from '@/fx/floatingText';
import { haptic } from '@/fx/haptics';
import { PET_VOICES, SFX_NAMES, sfx } from '@/fx/sound';
import { glintAt, SparkleBurst } from '@/fx/SparkleBurst';
import { CelebrationHost } from '@/fx/celebrations';
import { CELEBRATION_ANCHOR, RewardInline } from '@/fx/CelebrationBanner';
import { walletDelta } from '@/fx/celebrationPlan';
import { celebrateCheckIn, showCheckInNote } from '@/fx/checkin';
import { restLine } from '@/fx/copy';
import { InstallGate, InstallGuide, InstallSheet, type InstallGuideKey } from '@/app/InstallGuide';
import { AppIconArt, type AppIconShape } from '@/app/AppIconArt';
import { SplashArt } from '@/app/SplashArt';
import { ScreenError, ScreenLoading } from '@/app/ScreenHost';
import { ErrorFallback } from '@/app/ErrorBoundary';
import { WalletSummary } from '@/app/WalletSummary';
import type { InstallPlatform } from '@/app/installPrompt';

/* ------------------------------------------------------------------------------------------ */
/* Gallery scaffolding                                                                         */
/* ------------------------------------------------------------------------------------------ */

const GALLERY_CSS = `
.fxui-panels { display: flex; flex-wrap: wrap; gap: 16px; }
.fxui-panel { flex: 1 1 380px; min-width: 0; padding: 18px; border-radius: 14px; background: var(--bg); color: var(--ink); border: 1px solid var(--line); }
.fxui-panel > .fxui-cap { font: 800 11px/1 var(--font-body); color: var(--ink-2); letter-spacing: var(--tracking-caps); text-transform: uppercase; margin-bottom: 14px; }
.fxui-stack { display: flex; flex-direction: column; gap: 14px; }
.fxui-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.fxui-sub { font: 800 11px/1.2 var(--font-body); color: var(--ink-2); letter-spacing: var(--tracking-caps); text-transform: uppercase; margin: 8px 0 -2px; }
.fxui-note { font: 600 12px/1.35 var(--font-body); color: var(--ink-2); }
.fxui-wallet { position: fixed; top: 12px; right: 12px; z-index: 90; display: flex; gap: 8px; }
.fxui-wallet > span { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px 0 8px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); font: 800 14px var(--font-body); font-variant-numeric: tabular-nums; }
.fxui-frames { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
.fxui-frame { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 64px; }
.fxui-frame small { font: 700 11px/1.2 var(--font-body); color: var(--ink-2); text-align: center; }
.fxui-habit { display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); box-shadow: var(--kit-card-shadow); }
.fxui-habit b { display: block; font: 400 19px/1.15 var(--font-display); }
.fxui-habit i { display: block; font: italic 400 14px/1.3 var(--font-display); color: var(--ink-2); }
.fxui-habit span { display: block; font: 650 13px/1.3 var(--font-body); color: var(--ink-2); margin-top: 2px; }
.fxui-habit > div { flex: 1; min-width: 0; }
.fxui-art { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
.fxui-art > div { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border-radius: 12px; background: var(--bg-2); }
.fxui-art small { font: 700 11px/1.2 var(--font-body); color: var(--ink-2); }
.fxui-band { position: relative; height: 168px; border-radius: 14px; overflow: hidden; background: linear-gradient(#f3e2d6, #f3e2d6 60%, #e7d7c3 60%); border: 1px solid var(--line); }
.fxui-band::before { content: ''; position: absolute; left: 24px; top: 16px; width: 150px; height: 84px; border-radius: 6px; background: linear-gradient(#cfe3f1, #eaf2f8); box-shadow: inset 0 0 0 5px #fffdf9; }
.fxui-iframe { border: 1px solid var(--line); border-radius: 14px; background: var(--bg); box-shadow: var(--kit-card-shadow); display: block; }
.fxui-shots { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
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
  // Night gets the day rules first: aliases like --accent-ink: var(--blush-700) must resolve on the panel.
  el.textContent = `.fxui-panel[data-theme="light"]{${light.join('')}}\n.fxui-panel[data-theme="night"]{${light.join('')}${night.join('')}}`;
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
          <div class="fxui-cap">{t === 'light' ? 'Paper · day' : 'Lamplight · night'}</div>
          {children(t)}
        </div>
      ))}
    </div>
  );
}

const lightFor = (t: Theme): Light => (t === 'night' ? NIGHT_LIGHT : DAY_LIGHT);

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
          <CoinIcon size={20} />
          <AnimatedNumber value={w.coins} walletKind="coins" />
        </span>
        <span data-wallet-target="stars">
          <StarIcon size={20} />
          <AnimatedNumber value={w.stars} walletKind="stars" />
        </span>
      </div>
      <Toaster />
      <CelebrationHost />
    </>
  );
}

const DEMO_HABITS: [string, string, Habit['plant'], Habit['pot'], Habit['color']][] = [
  ['h-walk', 'Walk', 'pothos', 'terracotta', 'sage'],
  ['h-water', 'Drink water', 'pilea', 'cream', 'sky'],
  ['h-yoga', 'Yoga', 'lavender', 'blush', 'lavender'],
  ['h-read', 'Read', 'begonia', 'cream', 'blush'],
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
    rules: [{ from: '2026-06-01', schedule: { kind: 'daily' }, target: 1, step: 1 }],
    effort: 'steady',
    timeOfDay: 'anytime',
    polarity: 'build',
    createdAt: Date.parse('2026-06-01'),
    startedOn: '2026-06-01',
    pauses: [],
    order,
  }));
  state.value = { ...s, habits, profile: { ...s.profile, name: 'Sam', buddy: 'pet-cat-orange' }, wallet: { coins: 124, stars: 6, tickets: 1, stardust: 4 } };
}

function addCoins(n: number) {
  const s = state.value;
  state.value = { ...s, wallet: { ...s.wallet, coins: s.wallet.coins + n } };
}

function addStars(n: number) {
  const s = state.value;
  state.value = { ...s, wallet: { ...s.wallet, stars: s.wallet.stars + n } };
}

/** What the store does: commit the events' coins and stamps, then emit them (same tick). */
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
/* Buttons                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'tint', 'quiet'];
const LABEL: Record<string, string> = { primary: 'Water it', secondary: 'Add a note', tint: 'Tiny version', quiet: 'Not today' };

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
          <Sub>Variants · rest</Sub>
          <div class="fxui-row">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v}>
                {LABEL[v]}
              </Button>
            ))}
          </div>
          <Sub>Pressed (sinks 1 px, deepens 6%)</Sub>
          <div class="fxui-row">
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} data-pressed="">
                {LABEL[v]}
              </Button>
            ))}
          </div>
          <Sub>Focus · loading · disabled</Sub>
          <div class="fxui-row">
            <Button variant="secondary" {...(theme === 'light' ? { 'data-demo-focus': true } : {})}>
              Focused
            </Button>
            <Button loading>Saving</Button>
            <Button loading={busy} variant="secondary" onClick={() => (setBusy(true), setTimeout(() => setBusy(false), 1600))}>
              {busy ? 'Saving' : 'Tap to load'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
          <Sub>Sizes and icons</Sub>
          <div class="fxui-row">
            <Button size="sm" icon="plus">
              Add habit
            </Button>
            <Button icon={<CoinIcon size={18} />} tone="butter">
              Insert 25
            </Button>
            <Button size="lg" iconRight="chevron-right" variant="secondary">
              Continue
            </Button>
            <Button variant="danger">Delete habit</Button>
          </div>
          <Sub>Tones · primary</Sub>
          <div class="fxui-row">
            {PASTELS.map((t) => (
              <Button key={t} tone={t} size="sm">
                {t}
              </Button>
            ))}
          </div>
          <Sub>Tones · tint and quiet</Sub>
          <div class="fxui-row">
            {PASTELS.map((t) => (
              <Button key={t} tone={t} variant="tint" size="sm">
                {t}
              </Button>
            ))}
          </div>
          <div class="fxui-row">
            {PASTELS.map((t) => (
              <Button key={t} tone={t} variant="quiet" size="sm">
                {t}
              </Button>
            ))}
          </div>
          <Button size="lg" block>
            Find them a plant
          </Button>
          <Sub>IconButton · plain · soft · filled · paper disc · pressed · disabled</Sub>
          <div class="fxui-row">
            <IconButton icon="more" label="More" />
            <IconButton icon="edit" label="Edit" variant="soft" tone="sage" />
            <IconButton icon="heart" label="Favourite" variant="soft" tone="blush" pressed />
            <IconButton icon="plus" label="Add" variant="candy" />
            <IconButton icon="plus" label="Add" variant="candy" tone="sage" size="lg" />
            <IconButton icon="camera" label="Photo" variant="card" />
            <IconButton icon="close" label="Close" variant="card" size="sm" />
            <IconButton icon="trash" label="Delete" disabled />
          </div>
        </div>
      )}
    </Panels>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The water-fill check ring                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** Frames of the check-in, drawn from the same values the live ring animates between. */
function ringFrame(ms: number): { level: number; mark: CheckRingMark; p: number } {
  const ease = (t: number) => 1 - (1 - t) ** 3;
  const fill = Math.min(1, ms / CHECK_RING_MS.fill);
  const check = Math.max(0, Math.min(1, (ms - CHECK_RING_MS.checkDelay) / CHECK_RING_MS.check));
  return { level: ease(fill), mark: 'check', p: ease(check) };
}

const FRAMES = [0, 60, 120, 180, 240, 300, 420];

function RingStates({ theme }: { theme: Theme }) {
  const [walk, setWalk] = useState(false);
  const [glasses, setGlasses] = useState(5);
  const [tiny, setTiny] = useState(false);
  return (
    <div class="fxui-stack">
      <Sub>The check-in, frame by frame (ms)</Sub>
      <div class="fxui-frames">
        {FRAMES.map((ms) => {
          const f = ringFrame(ms);
          return (
            <div key={ms} class="fxui-frame">
              <CheckRingArt still level={f.level} mark={f.mark} markProgress={f.p} full={f.level >= 0.999} />
              <small>{ms}</small>
            </div>
          );
        })}
      </div>
      <Sub>States</Sub>
      <div class="fxui-frames">
        {(
          [
            ['empty', <CheckRingArt still level={0} mark={null} />],
            ['filling', <CheckRingArt still level={0.55} mark={null} />],
            ['checked', <CheckRingArt still level={1} mark="check" />],
            ['1/8', <CheckRingArt still level={1 / 8} mark={null} countLabel="1/8" />],
            ['5/8', <CheckRingArt still level={5 / 8} mark={null} countLabel="5/8" />],
            ['7/8', <CheckRingArt still level={7 / 8} mark={null} countLabel="7/8" />],
            ['rest', <CheckRingArt still level={0} mark="moon" quiet />],
            ['tiny', <CheckRingArt still level={1} mark="sprout" />],
          ] as [string, JSX.Element][]
        ).map(([label, art]) => (
          <div key={label} class="fxui-frame">
            {art}
            <small>{label}</small>
          </div>
        ))}
      </div>
      <Sub>Up close (96 px)</Sub>
      <div class="fxui-frames">
        <CheckRingArt still size={96} level={5 / 8} mark={null} countLabel="5/8" />
        <CheckRingArt still size={96} level={1} mark="check" />
        <CheckRingArt still size={96} level={0} mark="moon" quiet />
        <CheckRingArt still size={96} level={1} mark="sprout" />
        <CheckRingArt still size={96} level={1} mark="check" tone="sage" />
      </div>
      <Sub>Live · tap them (reduced motion fills instantly)</Sub>
      <div class="fxui-stack">
        <div class="fxui-habit">
          <div>
            <b>Walk</b>
            <i>after lunch</i>
            <span>26 of the last 30 days</span>
          </div>
          <CheckRing label="Walk" state={walk ? 'done' : 'empty'} description="26 of the last 30 days" onClick={() => setWalk(!walk)} />
        </div>
        <div class="fxui-habit">
          <div>
            <b>Drink water</b>
            <i>after coffee</i>
            <span>{glasses} of 8 glasses</span>
          </div>
          <CheckRing label="Add 1 glass to Drink water" count={glasses} target={8} description={`${glasses} of 8 glasses`} onClick={() => setGlasses(glasses >= 8 ? 0 : glasses + 1)} />
        </div>
        <div class="fxui-habit">
          <div>
            <b>Stretch</b>
            <i>after the alarm</i>
            <span>{restLine('Stretch')}</span>
          </div>
          <CheckRing label="Stretch" state="rest" description="Resting today" />
        </div>
        <div class="fxui-habit">
          <div>
            <b>Read</b>
            <i>before bed</i>
            <span>{tiny ? 'Tiny version' : '12 days'}</span>
          </div>
          <CheckRing label="Read" state={tiny ? 'tiny' : 'empty'} description={tiny ? 'Tiny version logged' : '12 days'} onClick={() => setTiny(!tiny)} />
        </div>
      </div>
      <p class="fxui-note">{theme === 'night' ? 'Water stays ramune blue at night; the paper inside the ring is the night card.' : 'Water rises with a meniscus in 240 ms, then a hairline check draws in 180 ms.'}</p>
    </div>
  );
}

function CheckRings() {
  return <Panels>{(t) => <RingStates theme={t} />}</Panels>;
}

/* ------------------------------------------------------------------------------------------ */
/* Controls & surfaces                                                                         */
/* ------------------------------------------------------------------------------------------ */

function ControlsPanel() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [theme, setTheme] = useState<'auto' | 'light' | 'night'>('auto');
  const [week, setWeek] = useState<'mon' | 'sun'>('mon');
  const [filters, setFilters] = useState<Record<string, boolean>>({ Cats: true, Cows: false, Pond: false, Garden: true });
  const [count, setCount] = useState(8);
  const [name, setName] = useState('Drink water');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('A glass with every meal, and one before bed.');
  return (
    <div class="fxui-stack">
      <Sub>Toggle</Sub>
      <Card padding="none" style={{ padding: '4px 16px' }}>
        <Toggle checked={on} onChange={setOn} label="Sounds" description="A drop of water when you check in" />
        <Toggle checked={off} onChange={setOff} label="Quick open" />
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
          { value: 'light', label: 'Paper', icon: 'sun' },
          { value: 'night', label: 'Lamplight', icon: 'moon' },
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
      <Sub>Filter chips · tags</Sub>
      <div class="fxui-row">
        {Object.entries(filters).map(([k, v], i) => (
          <FilterChip key={k} selected={v} tone={(['blush', 'sky', 'mint', 'sage'] as const)[i]} onChange={(sel) => setFilters({ ...filters, [k]: sel })} count={[9, 8, 7, 12][i]}>
            {k}
          </FilterChip>
        ))}
      </div>
      <div class="fxui-row">
        <Chip tone="sage">Daily</Chip>
        <Chip tone="sky" icon="calendar">
          3 times a week
        </Chip>
        <Chip tone="lilac" onRemove={() => toast({ message: 'Removed.' })} removeLabel="Remove Yoga">
          Yoga
        </Chip>
      </div>
      <Sub>Stepper</Sub>
      <Stepper label="Glasses a day" showLabel value={count} onChange={setCount} min={1} max={20} unit="glasses" />
      <Sub>Text fields</Sub>
      <TextField label="Habit name" value={name} onValue={setName} maxLength={40} showCount placeholder="What would you like to grow?" />
      <TextField label="Search" hideLabel icon="search" value="" onValue={() => undefined} placeholder="Search the Field Guide" type="search" />
      <TextField label="Watering time" value={time} onValue={setTime} error={time ? undefined : 'Choose a time, and it goes in your calendar.'} placeholder="08:30" trailing="am" />
      <TextArea label="Note" hint="Only you can see this." value={notes} onValue={setNotes} rows={2} />
    </div>
  );
}

function Controls() {
  return <Panels>{() => <ControlsPanel />}</Panels>;
}

function Surfaces() {
  return (
    <Panels>
      {(theme) => (
        <div class="fxui-stack">
          <SectionHeader title="Today" meta="3 of 5 · +18 coins" />
          <SectionHeader variant="display" title="This afternoon" meta="1 of 4 watered" />
          <div class="fxui-row" style={{ alignItems: 'stretch' }}>
            <Card style={{ flex: '1 1 140px' }}>
              <b>Paper card</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>Radius 14, a hairline, a barely-there warm shadow.</p>
            </Card>
            <Card tone="butter" flat style={{ flex: '1 1 140px' }}>
              <b>Tinted</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>For wells and callouts.</p>
            </Card>
            <Card as="button" interactive style={{ flex: '1 1 140px' }} onClick={() => sfx.play('pop')}>
              <b>Interactive</b>
              <p style={{ color: 'var(--ink-2)', fontSize: '14px' }}>A deeper shadow on hover, a 1 px press.</p>
            </Card>
          </div>
          <ListGroup title="Preferences" footer="Sounds follow your phone’s silent switch.">
            <ListRow leading="volume" leadingTone="peach" title="Sounds" trailing={<Toggle checked hideLabel label="Sounds" onChange={() => undefined} />} />
            <ListRow leading="moon" leadingTone="lavender" title="Theme" subtitle="Follows your device" trailing="Auto" onClick={() => undefined} />
            <ListRow leading="calendar" leadingTone="sky" title="Week starts on" trailing="Monday" onClick={() => undefined} />
            <ListRow leading={<WaterDrop size={26} />} title="Watering times" subtitle="Morning, evening" onClick={() => undefined} />
            <ListRow leading="trash" leadingTone="danger" title="Delete everything" destructive onClick={() => undefined} />
          </ListGroup>
          <Card padding="none">
            <EmptyState
              title="An empty sill"
              art={<EmptyPot size={112} light={lightFor(theme)} />}
              action={
                <Button icon="plus" size="lg">
                  Plant a habit
                </Button>
              }
            >
              Start small. You can add more anytime.
            </EmptyState>
          </Card>
          <Card padding="none">
            <EmptyState compact title="No notes yet" art={<PaperNote size={88} light={lightFor(theme)} />}>
              Notes you add to a watering show up here.
            </EmptyState>
          </Card>
        </div>
      )}
    </Panels>
  );
}

function AnimatedDemo() {
  const [n, setN] = useState(124);
  return (
    <div class="fxui-row">
      <span style={{ font: '400 28px var(--font-display)', minWidth: '90px' }}>
        <AnimatedNumber value={n} />
      </span>
      <Button size="sm" variant="tint" tone="butter" onClick={() => setN(n + 25)}>
        +25
      </Button>
      <Button size="sm" variant="tint" tone="sky" onClick={() => setN(Math.max(0, n - 25))}>
        −25
      </Button>
    </div>
  );
}

function Status() {
  const [v, setV] = useState(26 / 30);
  return (
    <Panels>
      {() => (
        <div class="fxui-stack">
          <Sub>ProgressRing</Sub>
          <div class="fxui-row" style={{ gap: '18px' }}>
            <ProgressRing value={3 / 5} label="3 of 5 today" valueText="3 of 5" size={64} tone="sky">
              <span class="num" style={{ fontSize: '17px' }}>3/5</span>
            </ProgressRing>
            <ProgressRing value={v} label="Showed up 26 of the last 30 days" size={112} tone="sage">
              <span class="num" style={{ fontSize: '28px' }}>{Math.round(v * 30)}</span>
              <small style={{ color: 'var(--ink-2)', fontWeight: 700, fontSize: '11px' }}>of 30 days</small>
            </ProgressRing>
            <ProgressRing value={1} label="All watered today" size={80} tone="blush">
              <span class="num" style={{ fontSize: '19px' }}>5/5</span>
            </ProgressRing>
            <Button size="sm" variant="tint" tone="sage" onClick={() => setV(Math.random())}>
              Shuffle
            </Button>
          </div>
          <Sub>ProgressBar</Sub>
          <ProgressBar value={7 / 18} label="Field Guide: Cats" valueText="7 of 18" tone="blush" />
          <ProgressBar value={0.3} label="Friendship" tone="lavender" size="sm" />
          <ProgressBar value={0.9} label="Toward Blooming" tone="butter" size="lg" />
          <ProgressBar value={0} label="Empty" tone="sky" />
          <Sub>Pills</Sub>
          <div class="fxui-row">
            <Pill tone="butter" icon={<CoinIcon size={16} />}>
              25
            </Pill>
            <Pill tone="lavender" icon={<StarIcon size={16} />} variant="solid">
              3
            </Pill>
            <Pill tone="sage">Set complete</Pill>
            <Pill>Until Nov 10</Pill>
            <Pill variant="solid">7 of 18</Pill>
            <Pill tone="blush" size="sm" variant="solid">
              New
            </Pill>
          </div>
          <Sub>Tier labels (printed finishes)</Sub>
          <div class="fxui-row">
            {RARITIES.map((r) => (
              <RarityPill key={r} rarity={r} />
            ))}
            <RarityPill rarity="ultra" secret />
          </div>
          <div class="fxui-row">
            {RARITIES.map((r) => (
              <RarityPill key={r} rarity={r} size="sm" />
            ))}
            <RarityPill rarity="ultra" secret size="sm" />
          </div>
          <Sub>AnimatedNumber</Sub>
          <AnimatedDemo />
        </div>
      )}
    </Panels>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The kit's small drawings                                                                    */
/* ------------------------------------------------------------------------------------------ */

const OBJECTS: ObjectName[] = ['pot', 'cutting', 'watering-can', 'note', 'drop'];
const LIGHTS: [string, Light][] = [
  ['window left', { from: 'left', night: false }],
  ['noon, top', { from: 'top', night: false }],
  ['window right', { from: 'right', night: false }],
  ['lamplight', NIGHT_LIGHT],
];

function Objects() {
  return (
    <Panels>
      {(theme) => (
        <div class="fxui-stack">
          {OBJECTS.map((name) => (
            <div key={name} class="fxui-stack" style={{ gap: '6px' }}>
              <Sub>{name}</Sub>
              <div class="fxui-art">
                {LIGHTS.map(([label, light]) => (
                  <div key={label}>
                    <ObjectArt name={name} size={96} light={light} />
                    <small>{label}</small>
                  </div>
                ))}
                <div>
                  <div class="fxui-row" style={{ gap: '8px', alignItems: 'flex-end', minHeight: '96px' }}>
                    <ObjectArt name={name} size={48} light={lightFor(theme)} />
                    <ObjectArt name={name} size={32} light={lightFor(theme)} />
                    <ObjectArt name={name} size={20} light={lightFor(theme)} />
                  </div>
                  <small>48 · 32 · 20</small>
                </div>
              </div>
            </div>
          ))}
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
  const [name, setName] = useState('Walk');
  const [kind, setKind] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [remind, setRemind] = useState(true);
  const close = () => setOpen(null);
  return (
    <div class="fxui-stack">
      <FxHosts />
      <div class="fxui-row">
        <Button onClick={() => setOpen('basic')}>Habit editor</Button>
        <Button variant="secondary" onClick={() => setOpen('tall')}>
          Tall sheet
        </Button>
        <Button variant="secondary" onClick={() => setOpen('stack')}>
          Stacked sheets
        </Button>
        <Button variant="tint" onClick={() => setOpen('peek')}>
          Sheet with art
        </Button>
        <Button variant="danger" onClick={() => setOpen('confirm')}>
          Confirm
        </Button>
        <Button variant="quiet" onClick={() => setOpen('sticky')}>
          Waits for a choice
        </Button>
      </div>

      <Sheet
        open={open === 'basic'}
        onClose={close}
        title="Edit habit"
        description="Changes apply from today. Earlier days keep their rules."
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={close}>
              Cancel
            </Button>
            <Button size="lg" onClick={() => (close(), toast({ message: 'Walk is saved.', tone: 'sage' }))}>
              Save
            </Button>
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
          <Toggle checked={remind} onChange={setRemind} label="Watering time" description="Adds a calendar event that reminds you" />
        </div>
      </Sheet>

      <Sheet open={open === 'tall'} onClose={close} title="Field Guide" detents={['medium', 'large']}>
        <ListGroup>
          {Array.from({ length: 24 }, (_, i) => (
            <ListRow key={i} leading="sparkle" leadingTone={PASTELS[i % PASTELS.length]} title={`Page ${i + 1}`} subtitle="Drag the sheet up to see more" />
          ))}
        </ListGroup>
      </Sheet>

      <Sheet open={open === 'stack'} onClose={close} title="Walk" description="Tap below to stack a second sheet.">
        <div class="fxui-stack">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <CuttingGlass size={110} />
          </div>
          <Button block onClick={() => setInner(true)}>
            Add a note
          </Button>
        </div>
        <Sheet open={inner} onClose={() => setInner(false)} title="Note" size="sm">
          <p style={{ color: 'var(--ink-2)' }}>A second sheet on top. Esc closes only this one, and focus goes back to the button below.</p>
          <div style={{ marginTop: '16px' }}>
            <Button block variant="secondary" onClick={() => setInner(false)}>
              Done
            </Button>
          </div>
        </Sheet>
      </Sheet>

      <Sheet open={open === 'peek'} onClose={close} title="Rooting" peek={<CuttingGlass size={96} />}>
        <p style={{ color: 'var(--ink-2)' }}>White roots through the glass. Two more waterings and it moves into its pot.</p>
      </Sheet>

      <ConfirmDialog
        open={open === 'confirm'}
        tone="danger"
        title="Delete Walk?"
        message="Its plant and history go too. Archive it instead to keep them on the balcony shelf."
        art={<EmptyPot size={80} />}
        confirmLabel="Delete habit"
        cancelLabel="Keep it"
        onConfirm={() => (close(), toast({ message: 'Walk is deleted.', action: { label: 'Undo', onAction: () => toast({ message: 'Walk is back.', tone: 'sage' }) } }))}
        onCancel={close}
      />

      <Sheet open={open === 'sticky'} onClose={close} title="Choose one" dismissible={false} size="sm">
        <p style={{ color: 'var(--ink-2)', marginBottom: '16px' }}>No drag, scrim or Esc: this sheet waits for a choice.</p>
        <Button block onClick={close}>
          Done
        </Button>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Notes (toasts)                                                                              */
/* ------------------------------------------------------------------------------------------ */

const noop = () => undefined;

function Notes({ params }: { params: URLSearchParams }) {
  useEffect(() => {
    seedDemoState();
    if (params.get('live')) {
      showCheckInNote({ habitId: 'h-walk', habitName: 'Walk', coins: 5, note: 'Pudding opened one eye.', onUndo: noop });
      toast({ message: 'Everything kept. There’s a ticket on the sill.', art: <TicketIcon size={22} />, tone: 'blush', duration: 0 });
    }
  }, []);
  const coin = (n: number) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', verticalAlign: '-2px' }}>
      +{n}
      <CoinIcon size={14} />
    </span>
  );
  return (
    <div class="fxui-stack">
      <FxHosts />
      <Panels>
        {(theme) => (
          <div class="fxui-stack" style={{ maxWidth: '420px' }}>
            <Sub>Check-in (4 s, with Undo)</Sub>
            <ToastNote
              item={{ message: <>Walk, watered.{coin(5)}</>, note: 'Pudding opened one eye.', art: <WaterDrop size={22} />, action: { label: 'Undo', onAction: noop }, version: 0 }}
            />
            <ToastNote item={{ message: <>Drink water, tiny version.{coin(3)}</>, art: <WaterDrop size={22} />, action: { label: 'Undo', onAction: noop }, version: 0 }} />
            <Sub>Small moments</Sub>
            <ToastNote item={{ message: <>Everything kept. There’s a ticket on the sill. <RewardInline rewards={{ coins: 20, stars: 0, tickets: 1, stardust: 0 }} /></>, art: <TicketIcon size={22} />, version: 0 }} />
            <ToastNote item={{ message: 'Your yoga plant is potted up.', art: <CuttingGlass size={30} light={lightFor(theme)} />, version: 0 }} />
            <ToastNote item={{ message: 'There’s a note on the sill.', art: <PaperNote size={30} light={lightFor(theme)} />, version: 0 }} />
            <ToastNote item={{ message: '+18 coins', art: <CoinIcon size={22} />, version: 0 }} />
            <ToastNote item={{ message: 'A new version of catkin is ready.', action: { label: 'Refresh', onAction: noop }, version: 0 }} />
          </div>
        )}
      </Panels>
      <Sub>Live: the notes sit above the tab bar (?live=1)</Sub>
      <div class="fxui-row">
        <Button variant="secondary" onClick={() => showCheckInNote({ habitId: 'h-walk', habitName: 'Walk', coins: 5, note: 'Pudding opened one eye.', onUndo: () => toast({ message: 'Walk is back to unwatered.' }) })}>
          Check-in note
        </Button>
        <Button variant="secondary" onClick={() => rapidCheckins()}>
          Rapid coins (one note)
        </Button>
        <Button variant="secondary" onClick={() => toast({ key: 'sw-update', message: 'A new version of catkin is ready.', tone: 'sage', duration: 0, action: { label: 'Refresh', onAction: noop } })}>
          Update ready
        </Button>
      </div>
    </div>
  );
}

/** Five quick check-ins nobody celebrated locally: one calm, growing note. */
function rapidCheckins() {
  seedDemoState();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => commitAndEmit([{ type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-water' }]), i * 180);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* FX: petals, the coin, the glint                                                            */
/* ------------------------------------------------------------------------------------------ */

function Fx({ params }: { params: URLSearchParams }) {
  const [glint, setGlint] = useState(0);
  useEffect(seedDemoState, []);
  // ?fx=petals|petals-point|coin|glint|checkin fires once after load (shoot with --motion and a --wait).
  useEffect(() => {
    const fx = params.get('fx');
    if (!fx) return;
    const t = setTimeout(() => {
      const target = document.querySelector<HTMLElement>('[data-fx-origin]');
      const r = target?.getBoundingClientRect() ?? new DOMRect(innerWidth / 2 - 40, innerHeight / 2, 80, 40);
      if (fx === 'petals') burst({ intensity: 'big' });
      if (fx === 'petals-point') burst({ x: r.left + r.width / 2, y: r.top, intensity: 'medium' });
      if (fx === 'coin') (addCoins(5), void flyCoins({ from: r, amount: 5 }));
      if (fx === 'glint') setGlint(1);
      if (fx === 'checkin') target?.click();
    }, 200);
    return () => clearTimeout(t);
  }, []);
  const checkIn = (e: MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    // Like a screen: checkIn() commits and emits, then the flourish claims its coins.
    const events: GameEvent[] = [{ type: 'coins', amount: 5, reason: 'checkin', habitId: 'h-walk' }];
    commitAndEmit(events);
    celebrateCheckIn({ events, coins: 5, completed: true, partial: false, rewarded: true }, 'h-walk', el);
    showCheckInNote({ habitId: 'h-walk', habitName: 'Walk', coins: 5, note: 'Pudding opened one eye.', onUndo: noop });
  };
  return (
    <div class="fxui-stack">
      <FxHosts />
      <p class="fxui-note">Petals: at most 12, in the plants’ own colours, drifting down with a gentle turn. One brass coin at a time. One foil glint for a rare reveal.</p>
      <div class="fxui-row" style={{ marginTop: '220px' }}>
        <Button data-fx-origin="" onClick={checkIn}>
          Check in (+5)
        </Button>
        <Button variant="tint" tone="blush" onClick={(e) => burst({ ...center(rectOf(e)), intensity: 'medium' })}>
          Petals from here
        </Button>
        <Button variant="tint" tone="sage" onClick={() => burst({ intensity: 'big' })}>
          Petals past the window
        </Button>
        <Button variant="secondary" icon={<CoinIcon size={18} />} onClick={(e) => (addCoins(25), void flyCoins({ from: rectOf(e), amount: 25 }))}>
          One coin (+25)
        </Button>
        <Button variant="secondary" icon={<StarIcon size={18} />} onClick={(e) => (addStars(1), void flyCoins({ from: rectOf(e), amount: 1, kind: 'stars' }))}>
          One stamp
        </Button>
        <Button variant="tint" tone="butter" onClick={(e) => floatText('+5', rectOf(e))}>
          +5 chip
        </Button>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Button variant="tint" tone="lavender" onClick={() => setGlint(glint + 1)}>
            Foil glint
          </Button>
          <SparkleBurst trigger={glint} />
        </span>
        <Button variant="quiet" onClick={(e) => glintAt(rectOf(e))}>
          Glint at a point
        </Button>
        <Button variant="quiet" onClick={() => haptic('tick')}>
          Haptic tick
        </Button>
      </div>
    </div>
  );
}

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* ------------------------------------------------------------------------------------------ */
/* Sounds                                                                                      */
/* ------------------------------------------------------------------------------------------ */

const SOUND_NOTE: Partial<Record<string, string>> = {
  chime: 'check-in: a drop, then a rising glass chime',
  coin: 'a brass coin into the jar',
  whoosh: 'a sheet: paper rustle',
  ratchet: 'the capsule handle',
  pop: 'opening',
  fanfare: 'wind chimes',
};

function Sounds() {
  return (
    <div class="fxui-stack">
      <Sub>Sound effects</Sub>
      <div class="fxui-row">
        {SFX_NAMES.map((n) => (
          <Button key={n} size="sm" variant="secondary" title={SOUND_NOTE[n]} onClick={() => sfx.play(n)}>
            {n}
          </Button>
        ))}
      </div>
      <Sub>Pet voices</Sub>
      <div class="fxui-row">
        {PET_VOICES.map((v) => (
          <Button key={v} size="sm" variant="tint" tone="peach" onClick={() => sfx.voice(v)}>
            {v}
          </Button>
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
  bloom: { label: 'Blooming', events: [{ type: 'plantStage', habitId: 'h-yoga', stage: 5, stageName: 'Blooming' }] },
  evergreen: {
    label: 'Evergreen + Laurel Sprig (epic)',
    events: [
      { type: 'plantStage', habitId: 'h-walk', stage: 7, stageName: 'Evergreen' },
      { type: 'exclusive', collectibleId: 'wear-laurel-sprig' },
    ],
  },
  showUp: {
    label: 'Showing up (30 days)',
    events: [
      { type: 'showUp', days: 30, stars: 3, tickets: 1 },
      { type: 'stars', amount: 3, reason: 'showup' },
      { type: 'tickets', amount: 1 },
    ],
  },
  windowSeat: {
    label: 'The Window Seat (epic)',
    events: [
      { type: 'showUp', days: 365, stars: 12, tickets: 3, exclusive: 'decor-window-seat' },
      { type: 'stars', amount: 12, reason: 'showup' },
      { type: 'tickets', amount: 3 },
    ],
  },
  pin: {
    label: 'A new pin',
    events: [
      { type: 'badge', badgeId: 'first-perfect-day', stars: 1 },
      { type: 'stars', amount: 1, reason: 'badge' },
    ],
  },
  stacked: {
    label: 'Stacked (one note)',
    events: [
      { type: 'perfectDay', date: '2026-09-29', coins: 12 },
      { type: 'coins', amount: 12, reason: 'perfect' },
      { type: 'rung', habitId: 'h-water', streak: 30, unit: 'days', tierDays: 30, coins: 40 },
      { type: 'coins', amount: 40, reason: 'rung' },
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
    ],
  },
  bestFriends: { label: 'Best friends', events: [{ type: 'petLevel', petId: 'pet-cat-orange', level: 10 }] },
  potted: { label: 'Potted up (note)', events: [{ type: 'plantStage', habitId: 'h-read', stage: 2, stageName: 'Potted' }] },
  period: {
    label: 'Done for the week (note)',
    events: [
      { type: 'periodGoal', habitId: 'h-yoga', period: 'week', coins: 10 },
      { type: 'coins', amount: 10, reason: 'period' },
    ],
  },
  welcome: {
    label: 'Welcome home (note)',
    events: [
      { type: 'welcomeHome', coins: 20, tickets: 1 },
      { type: 'coins', amount: 20, reason: 'home' },
      { type: 'tickets', amount: 1 },
    ],
  },
  letter: { label: 'Note on the sill', events: [{ type: 'letter', letterId: 'w-2026-09-21' }] },
  swaps: {
    label: 'Swaps to a stamp (note)',
    events: [
      { type: 'stardust', amount: 8, fused: 1 },
      { type: 'stars', amount: 1, reason: 'fusion' },
    ],
  },
};

function Celebrations({ params }: { params: URLSearchParams }) {
  useEffect(() => {
    seedDemoState();
    const auto = params.get('celebrate');
    const run = auto && CELEBRATIONS[auto] ? () => commitAndEmit(CELEBRATIONS[auto]!.events) : null;
    if (run) {
      const t = setTimeout(run, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);
  return (
    <div class="fxui-stack">
      <FxHosts />
      <p class="fxui-note">A mock windowsill band marks where notes belong ({CELEBRATION_ANCHOR}); the note tucks over its lower edge.</p>
      <div class="fxui-band" {...{ [CELEBRATION_ANCHOR]: '' }} />
      <div class="fxui-row">
        {Object.entries(CELEBRATIONS).map(([k, c]) => (
          <Button key={k} size="sm" variant={c.label.includes('note') ? 'secondary' : 'tint'} tone={c.label.includes('epic') ? 'butter' : 'blush'} onClick={() => commitAndEmit(c.events)}>
            {c.label}
          </Button>
        ))}
        <Button size="sm" variant="secondary" onClick={() => rapidCheckins()}>
          Rapid check-ins
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Install, shell, app                                                                         */
/* ------------------------------------------------------------------------------------------ */

const PLATFORMS: (InstallPlatform | InstallGuideKey)[] = ['ios-safari', 'ios-safari-classic', 'ios-other', 'mac-safari', 'prompt', 'chromium', 'android', 'other', 'installed'];

function Install({ params }: { params: URLSearchParams }) {
  const [platform, setPlatform] = useState<InstallPlatform | InstallGuideKey | null>((params.get('install') as InstallPlatform | InstallGuideKey | null) ?? null);
  const gate = params.get('gate') as InstallGuideKey | null;
  return (
    <div class="fxui-stack">
      <FxHosts />
      <Panels>{() => <InstallGuide />}</Panels>
      <div class="fxui-row">
        {PLATFORMS.map((p) => (
          <Button key={p} size="sm" variant="secondary" onClick={() => setPlatform(p)}>
            {p}
          </Button>
        ))}
      </div>
      <Sub>The install-first gate (?gate=ios-safari|mac-safari)</Sub>
      <div class="fxui-row" style={{ alignItems: 'flex-start' }}>
        {(gate ? [gate] : (['ios-safari', 'mac-safari'] as InstallGuideKey[])).map((p) => (
          <Card key={p} padding="none" style={{ width: '390px', background: 'var(--bg)' }}>
            <InstallGate platform={p} onPeek={() => toast({ message: 'Opening the demo sill.' })} />
          </Card>
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
            <ScreenError onRetry={() => toast({ message: 'Trying again.' })} />
          </Card>
          <Card padding="none" style={{ flex: '1 1 260px' }}>
            <ErrorFallback onRetry={() => toast({ message: 'Trying again.' })} />
          </Card>
          <div class="fxui-stack" style={{ flex: '1 1 220px' }}>
            <WalletSummary />
          </div>
        </div>
      )}
    </Panels>
  );
}

/** The real app in frames: the phone with its tab bar, the desktop with its sidebar. */
function AppShell({ params }: { params: URLSearchParams }) {
  const route = params.get('route') ?? 'today';
  // The frames run the app itself (it follows the OS theme, like the gallery).
  const src = (w: number) => `/index.html?frame=${w}#/${route}`;
  return (
    <div class="fxui-shots">
      <div class="fxui-stack" style={{ gap: '6px' }}>
        <Sub>Phone · 390 px</Sub>
        <iframe class="fxui-iframe" title="catkin at 390 px" src={src(390)} width={390} height={760} />
      </div>
      <div class="fxui-stack" style={{ gap: '6px' }}>
        <Sub>Mac · 1200 px (shown at 70%)</Sub>
        <div style={{ width: '840px', height: '532px', overflow: 'hidden', borderRadius: '14px' }}>
          <iframe class="fxui-iframe" title="catkin at 1200 px" src={src(1200)} width={1200} height={760} style={{ transform: 'scale(0.7)', transformOrigin: '0 0' }} />
        </div>
      </div>
    </div>
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
        </div>
      ))}
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
  { id: 'fxui-buttons', title: 'UI kit · buttons and icon buttons', render: (p) => <Buttons params={p} /> },
  { id: 'fxui-checkring', title: 'UI kit · the water-fill check ring', render: () => <CheckRings /> },
  { id: 'fxui-controls', title: 'UI kit · toggle, segmented, chips, stepper, fields', render: () => <Controls /> },
  { id: 'fxui-surfaces', title: 'UI kit · cards, section headers, list rows, empty states', render: () => <Surfaces /> },
  { id: 'fxui-status', title: 'UI kit · progress, pills, tier labels, numbers', render: () => <Status /> },
  { id: 'fxui-objects', title: 'UI kit · small drawings, under every light', render: () => <Objects /> },
  { id: 'fxui-sheets', title: 'UI kit · sheets and the confirm dialog', render: (p) => <Sheets params={p} /> },
  { id: 'fxui-notes', title: 'Notes (toasts)', render: (p) => <Notes params={p} /> },
  { id: 'fxui-fx', title: 'FX · petals, the coin, the foil glint', render: (p) => <Fx params={p} /> },
  { id: 'fxui-sounds', title: 'FX · sounds and pet voices', render: () => <Sounds /> },
  { id: 'fxui-celebrations', title: 'FX · celebration notes and the epic moment', render: (p) => <Celebrations params={p} /> },
  { id: 'fxui-shell', title: 'App · loading, error and error-boundary states, wallet', render: () => <Shell /> },
  { id: 'fxui-app', title: 'App · the shell at 390 px and 1200 px', render: (p) => <AppShell params={p} /> },
  { id: 'fxui-install', title: 'App · install guide and the install-first gate', render: (p) => <Install params={p} /> },
  { id: 'fxui-appicon', title: 'App · icon (square · squircle · maskable)', render: (p) => <AppIcon params={p} /> },
  { id: 'fxui-splash', title: 'App · launch screen', render: (p) => <Splash params={p} /> },
];

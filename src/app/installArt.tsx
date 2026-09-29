/**
 * Little code-drawn illustrations for the install guide. Colors come from tokens via classes,
 * so they work in light and night. Each draws on a 240 × 132 canvas.
 */
import type { ComponentChildren } from 'preact';
import { SPARKLE_PATH } from '@/ui/Sparkle';
import { AppIconArt } from './AppIconArt';
import s from './installArt.module.css';

function Frame({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <svg class={s.art} viewBox="0 0 240 132" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Spark({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return <path class={s.spark} d={SPARKLE_PATH} transform={`translate(${x} ${y}) scale(${0.55 * k})`} />;
}

/** A pulsing highlight ring around the thing to tap. */
function Ring({ x, y, r = 17 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle class={s.ringFill} cx={x} cy={y} r={r} />
      <circle class={s.ring} cx={x} cy={y} r={r} />
      <circle class={s.pulse} cx={x} cy={y} r={r} style={{ transformOrigin: `${x}px ${y}px` }} />
    </g>
  );
}

function ShareGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g class={s.glyph} transform={`translate(${x} ${y})`}>
      <path d="M-7 -2 v9 a3 3 0 0 0 3 3 h8 a3 3 0 0 0 3 -3 v-9" />
      <path d="M0 3 v-14 M-4.5 -6.5 L0 -11 L4.5 -6.5" />
    </g>
  );
}

/** iOS Safari's toolbar with the Share button highlighted. */
export function ShareStepArt({ inAddressBar = false }: { inAddressBar?: boolean }) {
  return (
    <Frame label={inAddressBar ? 'Browser address bar with the Share button highlighted' : 'Safari toolbar with the Share button highlighted'}>
      <rect class={s.screen} x="12" y="8" width="216" height="116" rx="20" />
      <rect class={s.well} x="30" y="24" width="180" height="28" rx="14" />
      <text class={s.url} x="120" y="42" text-anchor="middle">
        mochi meadow
      </text>
      {inAddressBar ? (
        <>
          <Ring x={194} y={38} r={13} />
          <ShareGlyph x={194} y={39} />
          <g class={s.glyph}>
            <path d="M38 92 l-6 -6 l6 -6" />
            <path d="M74 80 l6 6 l-6 6" />
            <rect x="152" y="80" width="12" height="12" rx="3" />
            <path d="M196 86 h0.01 M202 86 h0.01 M190 86 h0.01" stroke-width="3.4" />
          </g>
        </>
      ) : (
        <>
          <g class={s.glyph}>
            <path d="M40 92 l-6 -6 l6 -6" />
            <path d="M76 80 l6 6 l-6 6" />
            <path d="M152 80 q5 -2 8 1 q3 -3 8 -1 v12 q-5 -2 -8 1 q-3 -3 -8 -1 z" />
            <rect x="194" y="80" width="11" height="11" rx="3" />
            <rect x="198" y="84" width="11" height="11" rx="3" />
          </g>
          <Ring x={120} y={86} />
          <ShareGlyph x={120} y={87} />
        </>
      )}
      <Spark x={inAddressBar ? 214 : 143} y={inAddressBar ? 18 : 66} />
      <Spark x={inAddressBar ? 176 : 98} y={inAddressBar ? 60 : 106} k={0.6} />
    </Frame>
  );
}

/** The share sheet list with "Add to Home Screen" highlighted. */
export function AddToHomeArt() {
  const rows: [string, number, boolean][] = [
    ['Copy', 26, false],
    ['Add to Home Screen', 62, true],
    ['Add Bookmark', 98, false],
  ];
  return (
    <Frame label="Share menu with Add to Home Screen highlighted">
      <rect class={s.screen} x="22" y="6" width="196" height="120" rx="18" />
      {rows.map(([label, y, hl]) => (
        <g key={label}>
          {hl && <rect class={s.rowHl} x="30" y={y - 15} width="180" height="30" rx="11" />}
          <text class={hl ? s.rowTextHl : s.rowText} x="42" y={y + 4}>
            {label}
          </text>
          <g class={s.glyph} transform={`translate(192 ${y})`}>
            {hl ? (
              <>
                <rect x="-8" y="-8" width="16" height="16" rx="4.5" />
                <path d="M0 -4 v8 M-4 0 h8" />
              </>
            ) : label === 'Copy' ? (
              <>
                <rect x="-7" y="-5" width="10" height="12" rx="2.5" />
                <path d="M-3 -5 v-2 a2 2 0 0 1 2 -2 h6 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 h-2" />
              </>
            ) : (
              <path d="M-7 -6 q4 -2 7 1 q3 -3 7 -1 v11 q-4 -2 -7 1 q-3 -3 -7 -1 z" />
            )}
          </g>
          {!hl && y < 90 && <path class={s.divider} d={`M42 ${y + 18} H206`} />}
        </g>
      ))}
      <Spark x={214} y={40} />
    </Frame>
  );
}

/** A home screen with Mochi's icon newly arrived. */
export function HomeScreenArt() {
  const others: [number, number, string][] = [
    [46, 30, '#BBDCF6'],
    [96, 30, '#C3DFB4'],
    [196, 30, '#FFE593'],
    [46, 84, '#D6C8F8'],
    [146, 84, '#FFCBA8'],
    [196, 84, '#B3E6D6'],
  ];
  return (
    <Frame label="Home screen with the Mochi Meadow icon">
      <rect class={s.wallpaper} x="12" y="4" width="216" height="124" rx="20" />
      {others.map(([x, y, c]) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 17} y={y - 17} width="34" height="34" rx="10" fill={c} opacity="0.85" />
          <rect class={s.labelBar} x={x - 11} y={y + 22} width="22" height="4" rx="2" />
        </g>
      ))}
      <g class={s.newApp}>
        <svg x="126" y="10" width="40" height="40" viewBox="0 0 100 100">
          <AppIconArt size="100" shape="squircle" />
        </svg>
        <text class={s.appLabel} x="146" y="62" text-anchor="middle">
          Mochi Meadow
        </text>
      </g>
      <Spark x={170} y={12} k={1.1} />
      <Spark x={120} y={46} k={0.6} />
    </Frame>
  );
}

/** macOS Safari: File menu → Add to Dock… */
export function MacDockArt() {
  return (
    <Frame label="Safari File menu with Add to Dock highlighted">
      <rect class={s.screen} x="6" y="6" width="228" height="120" rx="14" />
      <rect class={s.well} x="6" y="6" width="228" height="20" rx="10" />
      <text class={s.menu} x="20" y="20">
        Safari
      </text>
      <rect class={s.rowHl} x="56" y="9" width="30" height="14" rx="5" />
      <text class={s.menuBold} x="62" y="20">
        File
      </text>
      <text class={s.menu} x="98" y="20">
        Edit
      </text>
      <text class={s.menu} x="130" y="20">
        View
      </text>
      <rect class={s.dropdown} x="54" y="28" width="120" height="70" rx="9" />
      <text class={s.rowText} x="66" y="46">
        New Window
      </text>
      <text class={s.rowText} x="66" y="64">
        New Tab
      </text>
      <rect class={s.rowSolid} x="60" y="72" width="108" height="20" rx="6" />
      <text class={s.rowTextSolid} x="66" y="86">
        Add to Dock…
      </text>
      <rect class={s.well} x="150" y="102" width="74" height="18" rx="7" />
      <svg x="178" y="98" width="20" height="20" viewBox="0 0 100 100">
        <AppIconArt size="100" shape="squircle" />
      </svg>
      <Spark x={184} y={70} />
    </Frame>
  );
}

/** A Mac Dock with Mochi Meadow newly settled in (and running). */
export function DockArt() {
  const icons: [number, string][] = [
    [40, '#BBDCF6'],
    [72, '#C3DFB4'],
    [168, '#FFE593'],
    [200, '#D6C8F8'],
  ];
  return (
    <Frame label="Mac Dock with the Mochi Meadow icon">
      <rect class={s.wallpaper} x="6" y="6" width="228" height="120" rx="14" />
      <rect class={s.dock} x="22" y="78" width="196" height="40" rx="14" />
      {icons.map(([x, c]) => (
        <rect key={x} x={x - 13} y="85" width="26" height="26" rx="8" fill={c} opacity="0.9" />
      ))}
      <g class={s.newApp}>
        <svg x="98" y="58" width="44" height="44" viewBox="0 0 100 100">
          <AppIconArt size="100" shape="squircle" />
        </svg>
        <circle class={s.running} cx="120" cy="113" r="2" />
      </g>
      <rect class={s.tooltip} x="84" y="30" width="72" height="20" rx="8" />
      <text class={s.appLabel} x="120" y="44" text-anchor="middle">
        Mochi Meadow
      </text>
      <Spark x={150} y={60} k={1.1} />
      <Spark x={94} y={70} k={0.6} />
    </Frame>
  );
}

/** Chromium desktop: the install icon at the end of the address bar. */
export function ChromeInstallArt() {
  return (
    <Frame label="Browser address bar with the install icon highlighted">
      <rect class={s.screen} x="8" y="8" width="224" height="116" rx="14" />
      <rect class={s.well} x="18" y="20" width="204" height="28" rx="14" />
      <text class={s.url} x="94" y="38" text-anchor="middle">
        mochi meadow
      </text>
      <Ring x={202} y={34} r={13} />
      <g class={s.glyph} transform="translate(202 34)">
        <rect x="-7" y="-6" width="14" height="10" rx="2" />
        <path d="M-3 7 h6 M0 -3 v4 M-2.5 -0.5 L0 2 L2.5 -0.5" />
      </g>
      <svg x="92" y="62" width="56" height="56" viewBox="0 0 100 100">
        <AppIconArt size="100" shape="squircle" />
      </svg>
      <Spark x={222} y={58} />
      <Spark x={78} y={70} k={0.6} />
    </Frame>
  );
}

/** Android Chrome: ⋮ menu → Install app. */
export function AndroidMenuArt() {
  return (
    <Frame label="Browser menu with Install app highlighted">
      <rect class={s.screen} x="40" y="6" width="160" height="120" rx="16" />
      <g class={s.glyph}>
        <path d="M184 18 h0.01 M184 24 h0.01 M184 30 h0.01" stroke-width="3.6" />
      </g>
      <text class={s.rowText} x="56" y="46">
        New tab
      </text>
      <text class={s.rowText} x="56" y="70">
        Bookmarks
      </text>
      <rect class={s.rowHl} x="48" y="80" width="144" height="26" rx="10" />
      <text class={s.rowTextHl} x="56" y="97">
        Install app
      </text>
      <Spark x={196} y={82} />
    </Frame>
  );
}

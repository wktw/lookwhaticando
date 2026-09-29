/**
 * The kit's own small drawings: ordinary things drawn simply and exactly (DESIGN §10.4), for
 * empty states, loading and error screens, and notes. Flat matte fills, no outlines; each
 * standing shape has a hard shade crescent in var(--shade) on the side away from the light and
 * a flat contact shadow in var(--contact). At night the lamp is the light: shades flip and the
 * lit side warms toward var(--lamp). Crescents are precomputed (./objectPaths).
 */
import type { ComponentChildren } from 'preact';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { CAN, CUTTING, DROP, NOTE, POT, type Crescents } from './objectPaths';

export interface ObjectArtProps {
  /** Rendered size in px (square). */
  size?: number;
  /** The scene's light (DESIGN §10.4). Defaults to daylight from the window on the left. */
  light?: Light;
  /** An accessible name; without one the drawing is decorative. */
  title?: string;
  class?: string;
}

/** The light that matches the page theme, for drawings outside a lit scene (empty states, errors). */
export function themeLight(): Light {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'night' ? NIGHT_LIGHT : DAY_LIGHT;
}

/** A solid shape: its fill, the lamp's warmth at night, and its shade crescent. */
function Solid({ d, fill, shade, light, opacity }: { d: string; fill: string; shade?: Crescents; light: Light; opacity?: number }) {
  return (
    <>
      <path d={d} fill={fill} opacity={opacity} />
      {light.night && <path d={d} fill="var(--lamp)" opacity={0.08} />}
      {shade && <path d={shade[light.from]} fill="var(--shade)" />}
    </>
  );
}

function Frame({ size = 48, title, class: cls, box = 48, children }: ObjectArtProps & { box?: number; children: ComponentChildren }) {
  return (
    <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} class={cls} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {children}
    </svg>
  );
}

const Contact = ({ cx, cy, rx }: { cx: number; cy: number; rx: number }) => <ellipse cx={cx} cy={cy} rx={rx} ry={1.8} fill="var(--contact)" />;

/** An empty terracotta pot, waiting. */
export function EmptyPot({ light = DAY_LIGHT, ...rest }: ObjectArtProps) {
  return (
    <Frame {...rest}>
      <Contact cx={24} cy={42.8} rx={13} />
      <Solid d={POT.body} fill="#DFA286" shade={POT.bodyShade} light={light} />
      <path d={POT.underRim} fill="var(--shade)" />
      <Solid d={POT.rim} fill="#D1937A" shade={POT.rimShade} light={light} />
      <path d="M12.4 17.8 Q24 19.5 35.6 17.8 Q24 16.6 12.4 17.8 Z" fill="#A36A55" />
    </Frame>
  );
}

/** A pothos cutting rooting in a glass of water: how every habit's plant begins. */
export function CuttingGlass({ light = DAY_LIGHT, ...rest }: ObjectArtProps) {
  return (
    <Frame {...rest}>
      <Contact cx={24} cy={43} rx={9} />
      <path d={CUTTING.glass} fill="#E4EEF2" opacity={0.62} />
      <path d={CUTTING.water} fill="#C9DCE7" opacity={0.92} />
      <path d="M17 25 Q24 26.5 31.07 25 Q24 23.7 17 25 Z" fill="#E7F0F5" />
      {/* Roots, then the stem rising out of the water. */}
      <path d="M24.6 39.2C23.4 40.4 22.1 40.8 20.9 40.9M24.6 39.2C25.5 40.4 26.8 41 28.1 41.1M24.6 38.6C24.4 40 24.2 41.2 23.8 42.2" fill="none" stroke="#FFFDF9" stroke-width={0.8} stroke-linecap="round" />
      <path d="M24.6 39.5C24 32 23.6 24 24.3 15C24.7 11 25.8 8.8 27.6 7.3" fill="none" stroke="#8DAA79" stroke-width={1.1} stroke-linecap="round" />
      <path d={CUTTING.glassShade[light.from]} fill="var(--shade)" />
      <path d="M19.2 18.2L20.2 18.2L19.9 37.8L19 37.8Z" fill="#fff" opacity={0.7} />
      <ellipse cx={24} cy={15} rx={7.5} ry={0.9} fill="none" stroke="#fff" stroke-opacity={0.85} stroke-width={0.7} />
      <Solid d={CUTTING.leafL} fill="#9CBC87" shade={CUTTING.leafLShade} light={light} />
      <Solid d={CUTTING.leafR} fill="#BCD3A3" shade={CUTTING.leafRShade} light={light} />
    </Frame>
  );
}

/** A blue enamel watering can. */
export function WateringCan({ light = DAY_LIGHT, ...rest }: ObjectArtProps) {
  return (
    <Frame {...rest}>
      <Contact cx={27} cy={42.6} rx={15} />
      <Solid d={CAN.handle} fill="#97B1CC" shade={CAN.handleShade} light={light} />
      <Solid d={CAN.spout} fill="#A8C0D8" shade={CAN.spoutShade} light={light} />
      <Solid d={CAN.rose} fill="#8FA9C4" shade={CAN.roseShade} light={light} />
      <Solid d={CAN.body} fill="#A8C0D8" shade={CAN.bodyShade} light={light} />
      <path d={CAN.band} fill="#97B1CC" />
      {light.night ? null : <path d="M16.2 26L17.4 26L17.4 39L16.2 39Z" fill="#fff" opacity={0.45} />}
    </Frame>
  );
}

/** A folded note with a brass paper clip ("There's a note on the sill"). */
export function PaperNote({ light = DAY_LIGHT, ...rest }: ObjectArtProps) {
  return (
    <Frame {...rest}>
      <path d={NOTE.paper} fill="#FFFDF9" />
      <path d={NOTE.paperShade[light.from]} fill="var(--shade)" />
      <path d={NOTE.fold} fill="#EDE3D6" />
      <path d={NOTE.lines} fill="#D8CEC3" />
      <path d="M15.3 16.4L14.8 9.1C14.7 7.3 17.4 7.1 17.6 8.9L18.3 17.6C18.4 19 16.3 19.2 16.2 17.8L15.7 11" fill="none" stroke="#C4A158" stroke-width={1} stroke-linecap="round" />
    </Frame>
  );
}

/** A single water drop (the check-in note's mark). */
export function WaterDrop({ size = 24, title, class: cls }: Omit<ObjectArtProps, 'light'>) {
  return (
    <Frame size={size} title={title} class={cls} box={24}>
      <path d={DROP.body} fill="#B3D1E8" />
      <path d={DROP.shade.left} fill="rgba(94, 76, 154, 0.16)" />
      <ellipse cx={9.4} cy={15.2} rx={1} ry={2.1} transform="rotate(18 9.4 15.2)" fill="#fff" opacity={0.8} />
    </Frame>
  );
}

export type ObjectName = 'watering-can' | 'note' | 'drop' | 'cutting' | 'pot';

/** Any of the drawings above by name (celebration art, gallery). */
export function ObjectArt({ name, ...props }: ObjectArtProps & { name: ObjectName }) {
  switch (name) {
    case 'watering-can':
      return <WateringCan {...props} />;
    case 'note':
      return <PaperNote {...props} />;
    case 'drop':
      return <WaterDrop {...props} />;
    case 'cutting':
      return <CuttingGlass {...props} />;
    case 'pot':
      return <EmptyPot {...props} />;
  }
}

/**
 * The kit's own small drawings: ordinary things drawn simply and exactly (DESIGN §10.4), for
 * empty states, error screens and notes. The pot and the cutting are the sill's own PotArt and
 * PlantArt (src/art/plants). Flat matte fills, no outlines; each standing shape has a hard shade crescent in var(--shade) on the side away from the light and
 * a flat contact shadow in var(--contact). At night the lamp is the light: shades flip and the
 * lit side warms toward var(--lamp). Crescents are precomputed (./objectPaths).
 */
import type { ComponentChildren } from 'preact';
import { DAY_LIGHT, NIGHT_LIGHT, type Light } from '@/art/light';
import { DROP, NOTE, TIN_CAN, type Crescents } from './objectPaths';

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


/** The tin watering can: the Shelf's Tin Watering Can decor, drawn from the same shapes and palette. */
const TIN = { body: '#BCC6CE', band: '#D3DADF', dark: '#8F9BA6', rose: '#A9B4BE' };

export function WateringCan({ light = DAY_LIGHT, ...rest }: ObjectArtProps) {
  return (
    <Frame {...rest} box={100}>
      <ellipse cx={52} cy={92.4} rx={30} ry={2.4} fill="var(--contact)" />
      <Solid d={TIN_CAN.handle} fill={TIN.body} shade={TIN_CAN.handleShade} light={light} />
      <Solid d={TIN_CAN.spout} fill={TIN.body} shade={TIN_CAN.spoutShade} light={light} />
      <Solid d={TIN_CAN.rose} fill={TIN.rose} shade={TIN_CAN.roseShade} light={light} />
      <path d={TIN_CAN.body} fill={TIN.body} />
      {light.night && <path d={TIN_CAN.body} fill="var(--lamp)" opacity={0.08} />}
      <path d="M30 58.5H70L69.9 62H30.1Z" fill={TIN.band} />
      <path d="M30.5 80H69.5L69.4 83.4H30.6Z" fill={TIN.band} />
      {TIN_CAN.bodyShade[light.from] && <path d={TIN_CAN.bodyShade[light.from]} fill="var(--shade)" />}
      <Solid d={TIN_CAN.lip} fill={TIN.band} shade={TIN_CAN.lipShade} light={light} />
      <ellipse cx={50} cy={46.6} rx={17} ry={2.6} fill={TIN.dark} />
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

/** A single water drop (the check-in note's mark), lit like everything else on the sill. */
export function WaterDrop({ size = 24, light = DAY_LIGHT, title, class: cls }: ObjectArtProps) {
  return (
    <Frame size={size} title={title} class={cls} box={24}>
      <Solid d={DROP.body} fill="#B3D1E8" shade={DROP.shade} light={light} />
      <path d={DROP.lit[light.from]} fill="#D3E5F2" />
    </Frame>
  );
}

/**
 * The kit's own drawings. The pot and the cutting are not here: they are the sill's own PotArt and
 * PlantArt (src/art/plants), so a pot is the same pot everywhere.
 */
export type ObjectName = 'watering-can' | 'note' | 'drop';

/** Any of the drawings above by name (celebration art, gallery). */
export function ObjectArt({ name, ...props }: ObjectArtProps & { name: ObjectName }) {
  switch (name) {
    case 'watering-can':
      return <WateringCan {...props} />;
    case 'note':
      return <PaperNote {...props} />;
    case 'drop':
      return <WaterDrop {...props} />;
  }
}

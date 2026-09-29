/**
 * Where decor goes, and where it (and the planter) sits on the ground, for a scene of a given
 * aspect (width ÷ height). Everything here is computed from the same layout the scene draws
 * (layout.ts), so default decor never lands on the tree's swing, the gate or the sun.
 */
import { DECOR_SLOTS, type DecorSlot } from '@/catalog/types';
import { DECOR_ENTRIES } from './decor';
import { depthAt, HORIZON, insideX } from './ground';
import { GATE, GATE_HALF, PATH_FRONT, RAINBOW_SKY, SWING_END, decorUnitScale, groundX, mix, onTree, unitScale } from './layout';
import { planterBox } from './meadow/Planter';
import type { PlacedDecor } from './MeadowScene';

export interface GroundPos {
  x: number;
  y: number;
}

/** A box on the ground in ground coordinates: x0…x1 across, y0 (back) … y1 (front). */
export interface GroundRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** The phone-portrait aspect the static defaults are computed for. */
const PHONE_ASPECT = 0.7;
/** Typical canvas size and art bounds for a slot whose item is unknown. */
const TYPICAL = { size: 24, bounds: [10, 90] as const };
/** Breathing room between neighbours, in meadow units. */
const GAP_U = 1.5;

const BACK_LEFT_Y = 0.07;
const BACK_RIGHT_Y = 0.03;
/** Ground slots: a spot on each side of the path and one in front, clear of the planter. */
const GROUND_SLOTS = {
  'ground-left': { x: 0.17, y: 0.46 },
  'ground-center': { x: 0.36, y: 0.7 },
  'ground-right': { x: 0.84, y: 0.4 },
} as const;

/** Sky anchors on the big tree canvas: fairy lights drape over the canopy, balloons tie to the branch tip. */
const CANOPY_DRAPE = { x: 232, y: 292 };
const BRANCH_TIP = { x: 386, y: 352 };
/** The rainbow's feet rest on the far hills, this many meadow units above the horizon. */
const FAR_RIDGE_U = 15;

/** How far an item reaches left and right of where it stands, in scene heights. */
function reach(itemId: string | undefined, y: number, aspect: number): [number, number] {
  const e = itemId ? DECOR_ENTRIES[itemId] : undefined;
  const size = e?.size ?? TYPICAL.size;
  const [b0, b1] = e?.bounds ?? TYPICAL.bounds;
  const w = (size * decorUnitScale(aspect) * depthAt(y)) / 100;
  return [(0.5 - b0 / 100) * w, (b1 / 100 - 0.5) * w];
}

const u = (units: number, aspect: number) => (units * unitScale(aspect)) / 100;
/** A sky height (fraction of the scene height from the top) as a ground y. */
const skyY = (top: number) => top / HORIZON - 1;
/** Height of a tree-canvas y, as a fraction of the scene height from the top. */
const treeTop = (cy: number, aspect: number) => HORIZON - u((460 - cy) / 10, aspect);

/** The stepping-stone path's centre (in scene heights) at ground depth y. */
export function pathAt(y: number, aspect: number): number {
  return mix(GATE, PATH_FRONT, Math.max(0, Math.min(1, y))).at(aspect);
}

function skyPos(itemId: string | undefined, aspect: number): GroundPos {
  const entry = itemId ? DECOR_ENTRIES[itemId] : undefined;
  const size = entry?.size ?? TYPICAL.size;
  const du = decorUnitScale(aspect) / 100;
  switch (entry?.sky) {
    case 'canopy':
      return { x: groundX(onTree(CANOPY_DRAPE.x), aspect), y: skyY(treeTop(CANOPY_DRAPE.y, aspect)) };
    case 'hills': {
      const feet = HORIZON - u(FAR_RIDGE_U, aspect);
      return { x: groundX(RAINBOW_SKY, aspect), y: skyY(feet - 0.34 * size * du) };
    }
    default: {
      // Tied to the tip of the swing branch by its string (or, for anything else, hung there).
      const tie = entry?.tied?.[1] ?? 50;
      const knot = treeTop(BRANCH_TIP.y, aspect);
      return { x: groundX(onTree(BRANCH_TIP.x), aspect), y: skyY(knot - ((tie - 50) / 100) * size * du) };
    }
  }
}

/**
 * The default spot for a slot's decor in a scene of this aspect (width ÷ height).
 * Pass the item for a snug fit: back items stand clear of the swing and the gate, sky items tie
 * onto the tree or rise from behind the hills away from the sun.
 */
export function decorDefaultPos(slot: DecorSlot, aspect: number, itemId?: string): GroundPos {
  const gap = u(GAP_U, aspect);
  switch (slot) {
    case 'back-left': {
      const [l] = reach(itemId, BACK_LEFT_Y, aspect);
      return { x: (SWING_END.at(aspect) + l + gap) / aspect, y: BACK_LEFT_Y };
    }
    case 'back-right': {
      const [l, r] = reach(itemId, BACK_RIGHT_Y, aspect);
      const gateRight = GATE.at(aspect) + u(GATE_HALF, aspect);
      const wanted = Math.max(gateRight + l + gap, (gateRight + aspect) / 2);
      return { x: Math.min(aspect - r - gap, wanted) / aspect, y: BACK_RIGHT_Y };
    }
    case 'sky':
      return skyPos(itemId, aspect);
    default: {
      const base = GROUND_SLOTS[slot];
      const [l, r] = reach(itemId, base.y, aspect);
      const path = pathAt(base.y, aspect);
      const room = u(4, aspect);
      let x = base.x * aspect;
      // Step off the stepping stones, toward whichever side the slot is on.
      if (x < path && x + r > path - room) x = path - room - r;
      if (x >= path && x - l < path + room) x = path + room + l;
      return { x: x / aspect, y: base.y };
    }
  }
}

/** Default spots for a phone-portrait scene (aspect 0.7), for any item. Prefer `decorDefaultPos`. */
export const DECOR_DEFAULT_POS: Record<DecorSlot, GroundPos> = Object.fromEntries(
  DECOR_SLOTS.map((slot) => [slot, decorDefaultPos(slot, PHONE_ASPECT)]),
) as Record<DecorSlot, GroundPos>;

/** The Meadow's decor (one item per slot, as in `AppState.meadow.decor`) at its default spots. */
export function placeDecor(slots: Partial<Record<DecorSlot, string>>, aspect: number): PlacedDecor[] {
  return DECOR_SLOTS.flatMap((slot) => {
    const itemId = slots[slot];
    return itemId ? [{ itemId, ...decorDefaultPos(slot, aspect, itemId) }] : [];
  });
}

/**
 * The patch of ground a placed item covers, for steering pets around it (null for sky decor).
 * `flat` items (blanket, puddle) are fine to stand on; others are best walked around.
 */
export function decorGroundRect(itemId: string, x: number, y: number, aspect: number): (GroundRect & { flat: boolean }) | null {
  const e = DECOR_ENTRIES[itemId];
  if (!e || y < 0) return null;
  const unit = decorUnitScale(aspect);
  const cx = insideX(x, y, e.size, e.bounds, aspect, unit);
  const [l, r] = reach(itemId, y, aspect);
  const depth = (e.deep * e.size * unit * depthAt(y)) / 100 / 100 / (1 - HORIZON);
  return { x0: cx - l / aspect, x1: cx + r / aspect, y0: Math.max(0, y - depth), y1: y, flat: !!e.flat };
}

/** The ground the planter box covers when it holds `count` plants (null when empty). */
export function planterGroundRect(count: number, aspect: number): GroundRect | null {
  if (count <= 0) return null;
  const box = planterBox(count);
  const x0 = u(box.left, aspect) / aspect;
  const rim = 1 - u(box.rim, aspect);
  return { x0, x1: x0 + u(box.width, aspect) / aspect, y0: (rim - HORIZON) / (1 - HORIZON), y1: 1 };
}

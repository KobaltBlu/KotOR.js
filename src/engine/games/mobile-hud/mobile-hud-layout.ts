/**
 * Screen layout for the touch HUD.
 *
 * Every size here is in layout units: a 640-high screen (768-high on screens
 * no wider than about 4:3), scaled to the real viewport by `hudScale`. All
 * returned rects are viewport pixels, top-left origin.
 *
 * @file mobile-hud-layout.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type HudRect = { left: number; top: number; width: number; height: number };

/** Screens at or below this width/height ratio lay out against a 768-high screen. */
export const HUD_NARROW_ASPECT = 1.4333;
export const HUD_UNITS_HIGH = 640;
export const HUD_UNITS_HIGH_NARROW = 768;

export const HUD_MARGIN = 8;

/** Bottom-left pause/solo/stealth block. */
export const HUD_LEFT_BLOCK = { width: 104, height: 148 };
/** Party portraits are the desktop layout grown by this much. */
export const HUD_PARTY_GROW = 1.6;
/** Minimap and notification icons grow by this much. */
export const HUD_MAP_GROW = 1.1;

/** Slots keep the tall shape of the desktop scroll-slot art. */
export const HUD_SELF_SLOT = { width: 80, height: 124, gap: 12 };
export const HUD_SELF_SLOT_WIDE = { width: 70, height: 110, gap: 10 };
export const HUD_TARGET_SLOT = { width: 72, height: 112, gap: 12 };
/** Share of a slot's height taken by each of its top and bottom arrow bands. */
export const HUD_SLOT_BAND = 0.2;
/** The expand tab reaches this far past the slot's edge, for an easier tap. */
export const HUD_TAB_REACH = 20;

export const HUD_NAME = { width: 300, height: 22, healthHeight: 10 };

export const HUD_GEAR = 80;
export const HUD_ROUND_BUTTON = 60;


export const HUD_POPUP = {
  width: 410,
  /** On small screens the list takes up to this share of the width, capped at `maxSmallWidth` px, so names fit on one line. */
  smallShare: 0.42,
  maxSmallWidth: 420,
  rowTop: 26,
  rowHeight: 48,
  rowSpacing: 52,
  icon: 48,
  close: { width: 190, height: 44, bottom: 14 },
  maxRows: 32,
};

const r = (v: number) => Math.round(v);

export function hudScale(vpW: number, vpH: number): number {
  if(!(vpW > 0) || !(vpH > 0)) return 1;
  const units = (vpW / vpH) <= HUD_NARROW_ASPECT ? HUD_UNITS_HIGH_NARROW : HUD_UNITS_HIGH;
  return vpH / units;
}

export function rect(left: number, top: number, width: number, height: number): HudRect {
  return { left: r(left), top: r(top), width: Math.max(1, r(width)), height: Math.max(1, r(height)) };
}

/** Bounding box of a set of rects (undefined entries skipped). */
export function boundsOf(rects: (HudRect | undefined)[]): HudRect | undefined {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(const b of rects){
    if(!b) continue;
    minX = Math.min(minX, b.left);
    minY = Math.min(minY, b.top);
    maxX = Math.max(maxX, b.left + b.width);
    maxY = Math.max(maxY, b.top + b.height);
  }
  if(minX === Infinity) return undefined;
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Move a group of desktop-layout rects as one block: keep their arrangement,
 * grow them by `grow * S`, and put the block's top-left (or bottom-left when
 * `fromBottom`) corner at `dest`.
 */
export function placeCluster(
  originals: Record<string, HudRect | undefined>,
  grow: number,
  S: number,
  dest: { left: number; top?: number; bottom?: number },
): Record<string, HudRect> {
  const box = boundsOf(Object.values(originals));
  const out: Record<string, HudRect> = {};
  if(!box) return out;
  const k = grow * S;
  const originTop = typeof dest.bottom === 'number'
    ? dest.bottom - box.height * k
    : (dest.top ?? 0);
  for(const [name, o] of Object.entries(originals)){
    if(!o) continue;
    out[name] = rect(
      dest.left + (o.left - box.left) * k,
      originTop + (o.top - box.top) * k,
      o.width * k,
      o.height * k,
    );
  }
  return out;
}

/** Centre `inner` (w×h) inside `outer`. */
export function centerIn(outer: HudRect, w: number, h: number): HudRect {
  return rect(outer.left + (outer.width - w) / 2, outer.top + (outer.height - h) / 2, w, h);
}

export type SlotStrip = { slots: HudRect[]; tabs: HudRect[]; icons: HudRect[]; arrows: HudRect[]; span: HudRect };

/** Icon between the slot's two arrow bands. */
function slotIcon(slot: HudRect): HudRect {
  const size = Math.min(slot.width * 0.86, slot.height * (1 - 2 * HUD_SLOT_BAND));
  return centerIn(slot, size, size);
}

/** The slot's top (`top`) or bottom arrow band. */
export function slotBand(slot: HudRect, top: boolean): HudRect {
  const h = slot.height * HUD_SLOT_BAND;
  return rect(slot.left, top ? slot.top : slot.top + slot.height - h, slot.width, h);
}

/** Touch area that opens the slot's list: its arrow band plus a little beyond the edge. */
export function slotTab(slot: HudRect, top: boolean, S: number): HudRect {
  const band = slotBand(slot, top);
  const reach = HUD_TAB_REACH * S;
  return top
    ? rect(band.left, band.top - reach, band.width, band.height + reach)
    : rect(band.left, band.top, band.width, band.height + reach);
}

/** Arrow drawn in a slot band; the desktop arrow art is twice as wide as it is tall. */
export function slotArrow(slot: HudRect, top: boolean): HudRect {
  const band = slotBand(slot, top);
  const w = Math.min(band.width * 0.6, band.height * 0.85 * 2);
  return centerIn(band, w, w / 2);
}

/** Personal action slots, bottom-right, with their expand tabs above. */
export function selfSlotStrip(vpW: number, vpH: number, S: number, count: number): SlotStrip {
  const spec = count > 4 ? HUD_SELF_SLOT_WIDE : HUD_SELF_SLOT;
  const w = spec.width * S;
  const h = spec.height * S;
  const stride = (spec.width + spec.gap) * S;
  const right = vpW - HUD_MARGIN * S;
  const top = vpH - HUD_MARGIN * S - h;
  const slots: HudRect[] = [];
  const tabs: HudRect[] = [];
  const icons: HudRect[] = [];
  const arrows: HudRect[] = [];
  for(let i = 0; i < count; i++){
    const left = right - (count - i) * stride + spec.gap * S;
    const slot = rect(left, top, w, h);
    slots.push(slot);
    icons.push(slotIcon(slot));
    tabs.push(slotTab(slot, true, S));
    arrows.push(slotArrow(slot, true));
  }
  const span = boundsOf(slots) ?? rect(right, top, 0, h);
  return { slots, tabs, icons, arrows, span };
}

export type TargetLayout = SlotStrip & { name: HudRect; health: HudRect };

/** Target name, health bar and action slots, fixed at the top centre. */
export function targetStrip(vpW: number, S: number, count: number): TargetLayout {
  const cx = vpW / 2;
  const nameW = HUD_NAME.width * S;
  const name = rect(cx - nameW / 2, HUD_MARGIN * S, nameW, HUD_NAME.height * S);
  const health = rect(name.left, name.top + name.height + 2 * S, nameW, HUD_NAME.healthHeight * S);
  const spec = HUD_TARGET_SLOT;
  const w = spec.width * S;
  const h = spec.height * S;
  const total = (count * spec.width + Math.max(0, count - 1) * spec.gap) * S;
  const top = health.top + health.height + 6 * S;
  const slots: HudRect[] = [];
  const tabs: HudRect[] = [];
  const icons: HudRect[] = [];
  const arrows: HudRect[] = [];
  for(let i = 0; i < count; i++){
    const left = cx - total / 2 + i * (spec.width + spec.gap) * S;
    const slot = rect(left, top, w, h);
    slots.push(slot);
    icons.push(slotIcon(slot));
    tabs.push(slotTab(slot, false, S));
    arrows.push(slotArrow(slot, false));
  }
  const span = boundsOf(slots) ?? rect(cx, top, 0, h);
  return { name, health, slots, tabs, icons, arrows, span };
}

export type LeftBlock = {
  backing: HudRect;
  /** Button rings; the toggles' own art is drawn larger than its ring. */
  pause: HudRect; solo: HudRect; stealth: HudRect;
  pauseIcon: HudRect; soloIcon: HudRect; stealthIcon: HudRect;
};

/** The desktop toggle art leaves wide transparent margins, so it is drawn this much larger than its ring. */
export const HUD_TOGGLE_ART_GROW = 1.35;

/** Pause button over the party and stealth toggles, bottom-left. */
export function leftBlock(vpH: number, S: number): LeftBlock {
  const m = 6 * S;
  const backing = rect(m, vpH - m - HUD_LEFT_BLOCK.height * S, HUD_LEFT_BLOCK.width * S, HUD_LEFT_BLOCK.height * S);
  const pause = rect(backing.left + 10 * S, backing.top + 6 * S, 84 * S, 84 * S);
  const solo = rect(backing.left + 5 * S, backing.top + 96 * S, 46 * S, 46 * S);
  const stealth = rect(backing.left + 53 * S, backing.top + 96 * S, 46 * S, 46 * S);
  const grow = (b: HudRect) => centerIn(b, b.width * HUD_TOGGLE_ART_GROW, b.height * HUD_TOGGLE_ART_GROW);
  return { backing, pause, solo, stealth, pauseIcon: grow(pause), soloIcon: grow(solo), stealthIcon: grow(stealth) };
}

/** Left edge and bottom of the party portraits, right of the left block. */
export function partyAnchor(vpH: number, S: number): { left: number; bottom: number } {
  return { left: (6 + HUD_LEFT_BLOCK.width + 8) * S, bottom: vpH - 6 * S };
}

export type TopRight = { gear: HudRect; help: HudRect; save: HudRect };

export function topRightButtons(vpW: number, S: number): TopRight {
  const m = HUD_MARGIN * S;
  const g = HUD_GEAR * S;
  const b = HUD_ROUND_BUTTON * S;
  const gear = rect(vpW - m - g, m, g, g);
  const yb = m + (g - b) / 2;
  const help = rect(gear.left - m - b, yb, b, b);
  const save = rect(help.left - m - b, yb, b, b);
  return { gear, help, save };
}

/** The desktop action queue and Disengage block grows by this much. */
export const HUD_COMBAT_GROW = 1.7;

/** Desktop action queue and Disengage, grown and centred at the bottom. */
export function combatCluster(
  originals: Record<string, HudRect | undefined>,
  vpW: number,
  vpH: number,
  S: number,
): Record<string, HudRect> {
  const box = boundsOf(Object.values(originals));
  if(!box) return {};
  const width = box.width * HUD_COMBAT_GROW * S;
  return placeCluster(originals, HUD_COMBAT_GROW, S, { left: vpW / 2 - width / 2, bottom: vpH - 6 * S });
}

export type PopupLayout = {
  blocker: HudRect;
  panel: HudRect;
  rows: HudRect[];
  icons: HudRect[];
  labels: HudRect[];
  close: HudRect;
};

/**
 * Right-hand list for one slot. Rows shrink together when they would run
 * into the close button.
 */
export function popupLayout(vpW: number, vpH: number, S: number, count: number): PopupLayout {
  const P = HUD_POPUP;
  const n = Math.max(0, Math.min(count, P.maxRows));
  const w = Math.min(Math.max(P.width * S, Math.min(vpW * P.smallShare, P.maxSmallWidth)), vpW);
  const panel = rect(vpW - w, 0, w, vpH);
  const close = rect(panel.left + (w - P.close.width * S) / 2, vpH - (P.close.bottom + P.close.height) * S, P.close.width * S, P.close.height * S);
  const top = P.rowTop * S;
  const room = close.top - 8 * S - top;
  let spacing = P.rowSpacing * S;
  let height = P.rowHeight * S;
  if(n > 0 && spacing * n > room){
    spacing = room / n;
    height = Math.max(1, spacing - 2 * S);
  }
  const pad = 14 * S;
  const icon = Math.min(P.icon * S, height);
  const rows: HudRect[] = [];
  const icons: HudRect[] = [];
  const labels: HudRect[] = [];
  for(let i = 0; i < n; i++){
    const row = rect(panel.left + pad, top + i * spacing, w - pad * 2, height);
    rows.push(row);
    icons.push(rect(row.left + row.width - icon - 4 * S, row.top + (row.height - icon) / 2, icon, icon));
    labels.push(rect(row.left + 10 * S, row.top, row.width - icon - 20 * S, row.height));
  }
  return { blocker: rect(0, 0, vpW, vpH), panel, rows, icons, labels, close };
}

/** "Name (N)" for stacks above one. */
export function popupRowText(name: string, stackSize?: number): string {
  const n = Math.trunc(Number(stackSize) || 0);
  return n > 1 ? `${name} (${n})` : name;
}

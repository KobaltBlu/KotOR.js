import type { IGUIControlExtent } from "@/interface/gui/IGUIControlExtent";
import { GameEngineType } from "@/enums/engine/GameEngineType";

/**
 * Retail GUI design letterbox base (GUI panel HitCheckMouse / GetLocalMouseCoords).
 * K1 / TSL Aspyr — same 0x280 / 0x1e0 constants.
 */
export const GUI_DESIGN_WIDTH = 640;
export const GUI_DESIGN_HEIGHT = 480;

/**
 * Semantic panel coord flags for GetLocalMouseCoords / GetExtentAccountingForPanelOffset.
 *
 * K1 bit layout: CenterInViewport=bit3, DockDesignX=bit5, DockDesignY=bit6.
 * TSL Aspyr uses different raw bits for dock (bit4/bit5) and has no center path
 * callers still OR these semantic flags; the engine branch applies the correct gate.
 * UseExtentOffset (bit0) is shared by both.
 */
export enum GUIPanelCoordFlags {
  None = 0,
  /** When set: use GetExtentAccountingForPanelOffset (no 640×480 mouse letterbox). Bit 0. */
  UseExtentOffset = 0x1,
  /**
   * K1: center panel in viewport (bit 3).
   * TSL Aspyr: when set, skip dock (bit 3 clear is required to dock).
   */
  CenterInViewport = 0x8,
  /** Dock X: left += (viewportWidth - 640) / 2. Semantic; K1 bit5 / TSL Aspyr bit4. */
  DockDesignX = 0x20,
  /** Dock Y: top += (viewportHeight - 480) / 2. Semantic; K1 bit6 / TSL Aspyr bit5. */
  DockDesignY = 0x40,
}

/** Truncating integer division matching C `/` on signed ints (toward zero). */
export function truncDiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Coerce to a retail GUI extent field (ReadFieldINT / int store). */
export function asExtentInt(n: number): number {
  return Math.trunc(n) | 0;
}

/**
 * Inclusive max of a TL span in centered space: [−truncDiv(n,2), n−truncDiv(n,2)].
 * Prefer this over +truncDiv(n,2) so odd sizes keep the extra pixel on the max side.
 */
export function centeredExtentMax(n: number): number {
  const size = asExtentInt(n);
  return size - truncDiv(size, 2);
}

/**
 * Integer orthographic frustum matching TL-centered GUI space.
 * Avoids float `width/2` half-pixel edges when the viewport size is odd (thin L/R GUI strokes).
 */
export function orthoFrustumInt(width: number, height: number): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const w = asExtentInt(width);
  const h = asExtentInt(height);
  return {
    left: -truncDiv(w, 2),
    right: centeredExtentMax(w),
    top: centeredExtentMax(h),
    bottom: -truncDiv(h, 2),
  };
}

/**
 * XY corners for Three.js `PlaneGeometry(1, 1, 1, 1)` so edges match {@link orthoFrustumInt}.
 * Vertex order matches Three's grid (top row then bottom). Prefer this over
 * `mesh.scale.set(w, h)` which spans float ±w/2 and thins odd-size RTT blits.
 */
export function orthoAlignedUnitPlanePositions(
  width: number,
  height: number
): [[number, number], [number, number], [number, number], [number, number]] {
  const f = orthoFrustumInt(width, height);
  return [
    [f.left, f.top],
    [f.right, f.top],
    [f.left, f.bottom],
    [f.right, f.bottom],
  ];
}

/** Minimal position-attribute surface (Three BufferAttribute). */
export interface OrthoPlanePositionAttr {
  setXYZ(index: number, x: number, y: number, z: number): void;
  needsUpdate: boolean;
}

/**
 * Write TL-centered int edges into a `PlaneGeometry(1,1,1,1)` position attribute.
 * Odd widths/heights keep the extra pixel on max X/Y so fills meet border inners
 * instead of leaving a 0.5px gap from float ±w/2 scale.
 */
export function writeOrthoAlignedPlanePositions(
  position: OrthoPlanePositionAttr,
  width: number,
  height: number,
  z: number = 0,
): void {
  const corners = orthoAlignedUnitPlanePositions(width, height);
  for(let i = 0; i < 4; i++){
    position.setXYZ(i, corners[i][0], corners[i][1], z);
  }
  position.needsUpdate = true;
}

export function copyExtentInt(src: IGUIControlExtent): IGUIControlExtent {
  return {
    left: asExtentInt(src.left),
    top: asExtentInt(src.top),
    width: asExtentInt(src.width),
    height: asExtentInt(src.height),
  };
}

/**
 * Retail GetExtentAccountingForPanelOffset.
 * K1 — center (bit3) returns early; else dock X/Y (bits 5/6).
 * TSL Aspyr — if bit3 set, copy only; else dock when dock flags set.
 */
export function getExtentAccountingForPanelOffset(
  extent: IGUIControlExtent,
  viewportWidth: number,
  viewportHeight: number,
  flags: number = GUIPanelCoordFlags.None,
  engine: GameEngineType = GameEngineType.KOTOR,
): IGUIControlExtent {
  const out = copyExtentInt(extent);
  const vpW = asExtentInt(viewportWidth);
  const vpH = asExtentInt(viewportHeight);

  if(engine === GameEngineType.TSL){
    // Aspyr: CenterInViewport set → no dock; else apply DockDesignX/Y.
    if((flags & GUIPanelCoordFlags.CenterInViewport) !== 0){
      return out;
    }
    if((flags & GUIPanelCoordFlags.DockDesignX) !== 0){
      out.left = out.left + truncDiv(vpW - GUI_DESIGN_WIDTH, 2);
    }
    if((flags & GUIPanelCoordFlags.DockDesignY) !== 0){
      out.top = out.top + truncDiv(vpH - GUI_DESIGN_HEIGHT, 2);
    }
    return out;
  }

  // K1
  if((flags & GUIPanelCoordFlags.CenterInViewport) !== 0){
    out.left = out.left + truncDiv(vpW - out.width, 2);
    out.top = out.top + truncDiv(vpH - out.height, 2);
    return out;
  }
  if((flags & GUIPanelCoordFlags.DockDesignX) !== 0){
    out.left = out.left + truncDiv(vpW - GUI_DESIGN_WIDTH, 2);
  }
  if((flags & GUIPanelCoordFlags.DockDesignY) !== 0){
    out.top = out.top + truncDiv(vpH - GUI_DESIGN_HEIGHT, 2);
  }
  return out;
}

export interface IGUILocalMouse {
  x: number;
  y: number;
}

/**
 * Convert centered Y-up UI mouse (relative to panel widget origin) into panel-local
 * top-left Y-down ints. Panel widget origin is at `offset` in centered UI space
 * (MenuTop offset.y=198, CharGen offset.x/y, …).
 */
export function panelLocalFromCenteredUI(
  uiX: number,
  uiY: number,
  panelExtent: IGUIControlExtent,
  offsetX: number = 0,
  offsetY: number = 0,
): IGUILocalMouse {
  const relX = asExtentInt(uiX) - asExtentInt(offsetX);
  const relY = asExtentInt(uiY) - asExtentInt(offsetY);
  const panelW = asExtentInt(panelExtent.width);
  const panelH = asExtentInt(panelExtent.height);
  const panelLeft = asExtentInt(panelExtent.left);
  const panelTop = asExtentInt(panelExtent.top);
  return {
    x: relX + truncDiv(panelW, 2) - panelLeft,
    y: truncDiv(panelH, 2) - relY - panelTop,
  };
}

/**
 * Apply panel widget offset to letterbox-path panel-local mouse (Y-down).
 * offset is Y-up (Three.js widget.position); invert Y when translating.
 */
export function applyPanelOffsetToLetterboxLocal(
  local: IGUILocalMouse,
  offsetX: number = 0,
  offsetY: number = 0,
): IGUILocalMouse {
  return {
    x: asExtentInt(local.x - asExtentInt(offsetX)),
    y: asExtentInt(local.y + asExtentInt(offsetY)),
  };
}

/**
 * Retail GetLocalMouseCoords K1 / TSL Aspyr.
 * Both use design letterbox 640×480 (0x280 / 0x1e0). Returns mouse in panel-local
 * top-left Y-down integer space.
 *
 * When UseExtentOffset|CenterInViewport: local = mouse - ((viewport - panelSize)/2 + panel.origin)
 * which matches KotOR.js centering the panel design rect in the ortho viewport.
 */
export function getLocalMouseCoords(
  panelExtent: IGUIControlExtent,
  mouseX: number,
  mouseY: number,
  screenWidth: number,
  screenHeight: number,
  flags: number = GUIPanelCoordFlags.UseExtentOffset,
  engine: GameEngineType = GameEngineType.KOTOR,
): IGUILocalMouse {
  let x = asExtentInt(mouseX);
  let y = asExtentInt(mouseY);
  const screenW = asExtentInt(screenWidth);
  const screenH = asExtentInt(screenHeight);

  if((flags & GUIPanelCoordFlags.UseExtentOffset) === 0){
    x = x - truncDiv(screenW - GUI_DESIGN_WIDTH, 2);
    y = y - truncDiv(screenH - GUI_DESIGN_HEIGHT, 2);
    x = x - asExtentInt(panelExtent.left);
    y = y - asExtentInt(panelExtent.top);
    return { x, y };
  }

  const adjusted = getExtentAccountingForPanelOffset(panelExtent, screenW, screenH, flags, engine);
  x = x - adjusted.left;
  y = y - adjusted.top;
  return { x, y };
}

/**
 * Retail HitCheckMouse.
 * Inclusive AABB: left ≤ x ≤ left+width AND top ≤ y ≤ top+height.
 */
export function hitCheckMouseLocal(
  extent: IGUIControlExtent,
  localX: number,
  localY: number,
): boolean {
  const left = asExtentInt(extent.left);
  const top = asExtentInt(extent.top);
  const right = left + asExtentInt(extent.width);
  const bottom = top + asExtentInt(extent.height);
  const x = asExtentInt(localX);
  const y = asExtentInt(localY);
  return x >= left && x <= right && y >= top && y <= bottom;
}

/**
 * Retail HitCheckMouse — children walked last→first;
 * first hit wins. Overlapping siblings do not both receive input.
 * `childHit[i]` is true when child i's HitCheckMouse succeeds.
 *
 * When `childSelectable` is provided, prefer the topmost *selectable* hit
 * (retail HandleMouseMove / GetIsSelectable — decorative labels like LBLH_*
 * and equip LBL_INV_* must not steal hover from their buttons).
 */
export function selectTopmostHitChildIndex(
  childHit: readonly boolean[],
  childSelectable?: readonly boolean[],
): number {
  if (childSelectable && childSelectable.length === childHit.length) {
    for (let i = childHit.length - 1; i >= 0; i--) {
      if (childHit[i] && childSelectable[i]) {
        return i;
      }
    }
  }
  for (let i = childHit.length - 1; i >= 0; i--) {
    if (childHit[i]) {
      return i;
    }
  }
  return -1;
}

/**
 * Skill-flow row slot extent.left (parent-local, top-left) for feat/power icons.
 * Indices 0/1/2 = left / center / right; matches centered widget.position.x layout.
 */
export function skillFlowSlotExtentLeft(slotIndex: number, protoWidth: number, slotWidth: number): number {
  const pw = asExtentInt(protoWidth);
  const w = asExtentInt(slotWidth);
  switch (slotIndex) {
    case 2: return pw - w;
    case 1: return truncDiv(pw - w, 2);
    default: return 0;
  }
}

/** Centered Three.js X within the row from a parent-local extent.left. */
export function skillFlowCenteredXFromExtentLeft(extentLeft: number, slotWidth: number, protoWidth: number): number {
  return asExtentInt(extentLeft) + truncDiv(asExtentInt(slotWidth), 2) - truncDiv(asExtentInt(protoWidth), 2);
}

/**
 * Arrow between slots: centered X is ±trunc(trunc(protoW - iconW, 2), 2).
 * Returns parent-local extent.left for hit-testing.
 */
export function skillFlowArrowExtentLeft(
  slotIndex: number,
  protoWidth: number,
  iconWidth: number,
  arrowWidth: number,
): number {
  const gapHalf = truncDiv(truncDiv(asExtentInt(protoWidth) - asExtentInt(iconWidth), 2), 2);
  const centeredX = slotIndex === 2 ? gapHalf : -gapHalf;
  return asExtentInt(centeredX) + truncDiv(asExtentInt(protoWidth), 2) - truncDiv(asExtentInt(arrowWidth), 2);
}

/**
 * Convert centered Y-up UI mouse into list-control-local top-left Y-down ints
 * using the list's world/UI AABB (`GUIControl.box` / `calculateBox`).
 *
 * Prefer this over `panelLocal - list.extent` when the list widget is docked in
 * viewport space while `extent.left/top` still hold design (or hacked) values
 * e.g. InGameDialog LB_REPLIES.
 */
export function listLocalFromWorldBox(
  uiX: number,
  uiY: number,
  boxMinX: number,
  boxMinY: number,
  boxMaxY: number,
): IGUILocalMouse {
  return {
    x: asExtentInt(uiX) - asExtentInt(boxMinX),
    y: asExtentInt(boxMaxY) - asExtentInt(uiY),
  };
}

/** Inclusive UI-space AABB test (anchored HUD / viewport-docked list). */
export function hitCheckMouseWorldBox(
  uiX: number,
  uiY: number,
  boxMinX: number,
  boxMinY: number,
  boxMaxX: number,
  boxMaxY: number,
): boolean {
  const x = asExtentInt(uiX);
  const y = asExtentInt(uiY);
  return (
    x >= asExtentInt(boxMinX) && x <= asExtentInt(boxMaxX) &&
    y >= asExtentInt(boxMinY) && y <= asExtentInt(boxMaxY)
  );
}

/**
 * Convert retail TL Y-down extent to centered Y-up widget center (Three.js ortho).
 * Uses truncating integer math so widget XY stay on the pixel grid.
 */
export function extentToCenteredPosition(
  extent: IGUIControlExtent,
  parentWidth: number,
  parentHeight: number,
): { x: number; y: number } {
  const left = asExtentInt(extent.left);
  const top = asExtentInt(extent.top);
  const width = asExtentInt(extent.width);
  const height = asExtentInt(extent.height);
  const parentW = asExtentInt(parentWidth);
  const parentH = asExtentInt(parentHeight);

  const posX = left - truncDiv(parentW - width, 2);
  const posY = -top + truncDiv(parentH - height, 2);
  return { x: posX, y: posY };
}

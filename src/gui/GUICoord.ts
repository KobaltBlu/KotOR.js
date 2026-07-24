import type { IGUIControlExtent } from "@/interface/gui/IGUIControlExtent";
import { GameEngineType } from "@/enums/engine/GameEngineType";

/**
 * Retail GUI design letterbox base (CSWGuiPanel HitCheckMouse / GetLocalMouseCoords).
 * K1 @ 0040b690 / 0040ba20; TSL Aspyr @ 0090e350 — same 0x280 / 0x1e0 constants.
 */
export const GUI_DESIGN_WIDTH = 640;
export const GUI_DESIGN_HEIGHT = 480;

/**
 * Semantic panel coord flags for GetLocalMouseCoords / GetExtentAccountingForPanelOffset.
 *
 * K1 @ 0040aa00 bit layout: CenterInViewport=bit3, DockDesignX=bit5, DockDesignY=bit6.
 * TSL Aspyr @ 0090e4a0 uses different raw bits for dock (bit4/bit5) and has no center path —
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

/** Coerce to a retail CSWGuiExtent field (ReadFieldINT / int store). */
export function asExtentInt(n: number): number {
  return Math.trunc(n) | 0;
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
 * Retail CSWGuiPanel::GetExtentAccountingForPanelOffset.
 * K1 @ 0040aa00 — center (bit3) returns early; else dock X/Y (bits 5/6).
 * TSL Aspyr @ 0090e4a0 — if bit3 set, copy only; else dock when dock flags set.
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
    // Aspyr @ 0090e4a0: CenterInViewport set → no dock; else apply DockDesignX/Y.
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

  // K1 @ 0040aa00
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
 * Retail CSWGuiPanel::GetLocalMouseCoords @ 0040ba20 (K1) / @ 0090e350 (TSL Aspyr).
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
 * Retail CSWGuiControl::HitCheckMouse @ 004187c0 (assembly).
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

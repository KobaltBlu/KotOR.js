/**
 * World ↔ screen math for the PTH 2D path map (XY plane, +Y up).
 *
 * @file pthMap2D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const PTH_MAP_EMPTY_SPAN = 20;
export const PTH_MAP_FIT_PADDING_PX = 40;
export const PTH_MAP_MIN_SCALE = 2;
export const PTH_MAP_MAX_SCALE = 400;

export interface PthMapViewport {
  centerX: number;
  centerY: number;
  scale: number;
}

export interface PthMapPoint {
  x: number;
  y: number;
}

export interface PthMapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function pthCanLoadRoomModels(hasGameData: boolean): boolean {
  return !!hasGameData;
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: PthMapViewport,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: width / 2 + (worldX - viewport.centerX) * viewport.scale,
    y: height / 2 - (worldY - viewport.centerY) * viewport.scale,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: PthMapViewport,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: viewport.centerX + (screenX - width / 2) / viewport.scale,
    y: viewport.centerY - (screenY - height / 2) / viewport.scale,
  };
}

export function boundsFromPoints(points: PthMapPoint[]): PthMapBounds | undefined {
  if (!points.length) {
    return undefined;
  }
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function fitViewportToBounds(
  bounds: PthMapBounds | undefined,
  width: number,
  height: number,
  paddingPx: number = PTH_MAP_FIT_PADDING_PX
): PthMapViewport {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  if (!bounds) {
    return {
      centerX: 0,
      centerY: 0,
      scale: Math.min(w, h) / PTH_MAP_EMPTY_SPAN,
    };
  }
  const spanX = Math.max(1e-4, bounds.maxX - bounds.minX);
  const spanY = Math.max(1e-4, bounds.maxY - bounds.minY);
  const innerW = Math.max(1, w - paddingPx * 2);
  const innerH = Math.max(1, h - paddingPx * 2);
  const scale = Math.min(
    PTH_MAP_MAX_SCALE,
    Math.max(PTH_MAP_MIN_SCALE, Math.min(innerW / spanX, innerH / spanY))
  );
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    scale,
  };
}

export function zoomViewportAtScreen(
  viewport: PthMapViewport,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  factor: number
): PthMapViewport {
  const world = screenToWorld(screenX, screenY, viewport, width, height);
  const scale = Math.min(PTH_MAP_MAX_SCALE, Math.max(PTH_MAP_MIN_SCALE, viewport.scale * factor));
  return {
    centerX: world.x - (screenX - width / 2) / scale,
    centerY: world.y + (screenY - height / 2) / scale,
    scale,
  };
}

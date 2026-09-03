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
/** Target on-screen spacing between adjacent grid lines (px). */
export const PTH_MAP_GRID_TARGET_PX = 50;
/** Draw point index labels when scale is at or above this (px per world unit). */
export const PTH_MAP_LABEL_MIN_SCALE = 18;
export const PTH_MAP_GRID_MAJOR_EVERY = 5;

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

export interface PthMapGridLines {
  /** World X positions for vertical lines. */
  vertical: number[];
  /** World Y positions for horizontal lines. */
  horizontal: number[];
}

/**
 * Pick a 1/2/5×10^n world step so grid spacing stays near `targetPx` on screen.
 */
export function niceGridStep(scale: number, targetPx: number = PTH_MAP_GRID_TARGET_PX): number {
  const raw = targetPx / Math.max(1e-6, scale);
  const exp = Math.floor(Math.log10(raw));
  const mag = Math.pow(10, exp);
  const norm = raw / mag;
  let nice: number;
  if (norm <= 1) {
    nice = 1;
  } else if (norm <= 2) {
    nice = 2;
  } else if (norm <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * mag;
}

/**
 * World-space X and Y grid lines that intersect the visible viewport.
 */
export function gridLinesInView(
  viewport: PthMapViewport,
  width: number,
  height: number,
  step: number
): PthMapGridLines {
  const safeStep = Math.max(1e-9, step);
  const corners = [
    screenToWorld(0, 0, viewport, width, height),
    screenToWorld(width, 0, viewport, width, height),
    screenToWorld(0, height, viewport, width, height),
    screenToWorld(width, height, viewport, width, height),
  ];
  let minX = corners[0].x;
  let maxX = corners[0].x;
  let minY = corners[0].y;
  let maxY = corners[0].y;
  for (let i = 1; i < corners.length; i++) {
    const c = corners[i];
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }

  const i0 = Math.floor(minX / safeStep);
  const i1 = Math.ceil(maxX / safeStep);
  const j0 = Math.floor(minY / safeStep);
  const j1 = Math.ceil(maxY / safeStep);

  const vertical: number[] = [];
  for (let i = i0; i <= i1; i++) {
    vertical.push(i * safeStep);
  }
  const horizontal: number[] = [];
  for (let j = j0; j <= j1; j++) {
    horizontal.push(j * safeStep);
  }
  return { vertical, horizontal };
}

export function isMajorGridLine(world: number, step: number, majorEvery: number = PTH_MAP_GRID_MAJOR_EVERY): boolean {
  const safeStep = Math.max(1e-9, step);
  const index = Math.round(world / safeStep);
  return index % majorEvery === 0;
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

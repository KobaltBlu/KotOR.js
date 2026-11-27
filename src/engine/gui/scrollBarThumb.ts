import { asExtentInt, truncDiv } from "@engine/gui/GUICoord";
import { borderInnerExtent } from "@engine/gui/borderInnerExtent";

/**
 * SetExtent — thumb size inside border
 * GetInnerExtent. Height floors at 4 when maxValue > 1.
 */
export function scrollBarThumbSize(params: {
  trackWidth: number;
  trackHeight: number;
  borderDimension: number;
  innerOffset?: number;
  innerOffsetY?: number;
  maxValue: number;
  visibleItemCount: number;
}): { width: number; height: number; travel: number } {
  const inner = borderInnerExtent({
    width: asExtentInt(params.trackWidth),
    height: asExtentInt(params.trackHeight),
    dimension: asExtentInt(params.borderDimension),
    innerOffset: asExtentInt(params.innerOffset || 0),
    innerOffsetY: asExtentInt(params.innerOffsetY ?? params.innerOffset ?? 0),
  });
  const innerW = Math.max(1, asExtentInt(inner.width));
  const innerH = Math.max(1, asExtentInt(inner.height));
  const maxValue = params.maxValue | 0;
  const visible = params.visibleItemCount | 0;

  let thumbH: number;
  if (maxValue > 1) {
    thumbH = asExtentInt((visible / (visible + maxValue)) * innerH);
    if (thumbH < 4) thumbH = 4;
    if (thumbH > innerH) thumbH = innerH;
  } else {
    thumbH = innerH;
  }

  return {
    width: innerW,
    height: Math.max(1, thumbH),
    travel: Math.max(0, innerH - thumbH),
  };
}

/**
 * HandleMouseCapturedMovement thumb drag.
 * `startValue` is the 1-based scroll_position when shouldScroll, else cur.
 * Returns the same units as startValue (1-based or 0-based accordingly).
 */
export function scrollBarDragValue(params: {
  deltaY: number;
  travel: number;
  startValue: number;
  maxIndex: number;
  /** When true, clamp result to [1, maxIndex+1] (pages); else [0, maxIndex]. */
  oneBased: boolean;
}): number {
  const travel = Math.max(1, params.travel | 0);
  const maxIdx = Math.max(0, params.maxIndex | 0);
  let next = Math.trunc((params.deltaY / travel) * maxIdx + params.startValue + 0.5);
  if (params.oneBased) {
    const pages = maxIdx + 1;
    if (next < 1) next = 1;
    if (next > pages) next = pages;
  } else {
    if (next < 0) next = 0;
    if (next > maxIdx) next = maxIdx;
  }
  return next;
}

/** Three.js Y-up thumb center from 0..1 scroll fraction along travel. */
export function scrollBarThumbCenterY(travel: number, t: number): number {
  const tr = Math.max(0, asExtentInt(travel));
  return asExtentInt(truncDiv(tr, 2) - t * tr);
}

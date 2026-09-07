import { asExtentInt, clampFrameDim, truncDiv } from "@/gui/GUICoord";

export { centeredExtentMax } from "@/gui/GUICoord";

export type BorderSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

/**
 * Edge/corner PlaneGeometry centers + sizes in widget-local centered space (ints).
 *
 * Draw uses top-left rects. In center space that span is
 * [−truncDiv(w,2), w−truncDiv(w,2)), not ±truncDiv(w,2). Using ±truncDiv(innerW,2) as
 * PlaneGeometry centers drops the right (and top) pixel when the control size is odd.
 *
 * Dimension is {@link clampFrameDim}'d so oversized borders take the remaining half
 * on each side and the center fill collapses to 0.
 */
export function borderSideExtent(params: {
  width: number;
  height: number;
  dimension: number;
  side: BorderSide | string;
  shrinkWidth?: number;
  /** Optional override after ew−dim (GUIProtoItem legacy clamp). */
  innerW?: number;
}): { top: number; left: number; width: number; height: number } {
  const ew = asExtentInt(params.width);
  const eh = asExtentInt(params.height);
  const dim = clampFrameDim(params.dimension, ew, eh);
  const shrinkWidth = asExtentInt(params.shrinkWidth ?? 0);

  const innerW =
    params.innerW !== undefined ? asExtentInt(params.innerW) : Math.max(0, ew - dim);
  const innerH = Math.max(0, eh - dim);

  const halfW = truncDiv(ew, 2);
  const rightExtent = ew - halfW;
  const halfH = truncDiv(eh, 2);
  const topExtent = eh - halfH;
  const halfDim = truncDiv(dim, 2);
  const halfShrink = truncDiv(shrinkWidth, 2);

  // PlaneGeometry centers so strip outer edges land on TL extent bounds.
  const leftCenter = -halfW + halfDim;
  const rightCenter = rightExtent - halfDim - shrinkWidth;
  const bottomCenter = -halfH + halfDim;
  const topCenter = topExtent - halfDim;

  let top = 0;
  let left = 0;
  let width = 0;
  let height = 0;

  switch (params.side) {
    case "top":
      top = bottomCenter;
      left = -halfShrink;
      width = innerW - dim - shrinkWidth;
      height = dim;
      break;
    case "bottom":
      top = topCenter;
      left = -halfShrink;
      width = innerW - dim - shrinkWidth;
      height = dim;
      break;
    case "left":
      top = 0;
      left = leftCenter;
      width = innerH - dim;
      height = dim;
      break;
    case "right":
      top = 0;
      left = rightCenter;
      width = innerH - dim;
      height = dim;
      break;
    case "topLeft":
      top = topCenter;
      left = leftCenter;
      width = dim;
      height = dim;
      break;
    case "topRight":
      top = topCenter;
      left = rightCenter;
      width = dim;
      height = dim;
      break;
    case "bottomLeft":
      top = bottomCenter;
      left = leftCenter;
      width = dim;
      height = dim;
      break;
    case "bottomRight":
      top = bottomCenter;
      left = rightCenter;
      width = dim;
      height = dim;
      break;
  }

  return { top, left, width, height };
}

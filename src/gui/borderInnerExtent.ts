import { asExtentInt, asGuiSize, clampFrameDim, truncDiv } from "@/gui/GUICoord";

/**
 * Matches retail GetInnerExtent (K1) for width/height.
 *
 * corner/edge sizes come from the border DIMENSION (GetBorderDim), clamped with
 * {@link asGuiSize} / {@link clampFrameDim}. DIMENSION 0 means no corner/edge
 * geometry in KotOR.js (retail would use corner/edge image sizes there — not
 * modeled). INNEROFFSET is then applied with retail's axis asymmetry:
 * width = (w - 2*corner) + 2*min(INNEROFFSET, DIMENSION)
 * height = (h - 2*corner) + 2*INNEROFFSETY (raw, no cap)
 * plus the degenerate-collapse test: if content is smaller than half an edge tile, it collapses.
 * When the clamped frame consumes the control, the fill/content hole is 0.
 */
export function borderInnerExtent(params: {
  width: number;
  height: number;
  dimension: number;
  innerOffset: number;
  innerOffsetY?: number;
}): { width: number; height: number } {
  const ew = asExtentInt(params.width);
  const eh = asExtentInt(params.height);
  const dim = clampFrameDim(params.dimension, ew, eh);
  const corner = dim;
  const edge = dim;

  let w = ew - 2 * corner;
  if (w < 1 || (edge !== 0 && truncDiv(w, edge) === 0 && w < truncDiv(edge, 2))) {
    w = 0;
  }

  let h = eh - 2 * corner;
  if (h < 1 || (edge !== 0 && truncDiv(h, edge) === 0 && h < truncDiv(edge, 2))) {
    h = 0;
  }

  const rawInnerX = asExtentInt(params.innerOffset);
  const rawInnerY = asExtentInt(params.innerOffsetY ?? params.innerOffset);
  const cappedInnerX = Math.min(rawInnerX, asGuiSize(params.dimension));

  return {
    width: w + 2 * cappedInnerX,
    height: h + 2 * rawInnerY,
  };
}

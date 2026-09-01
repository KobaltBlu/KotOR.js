import { truncDiv } from "@/gui/GUICoord";

/**
 * Matches retail GetInnerExtent (K1) for width/height.
 *
 * corner/edge sizes come from the border DIMENSION (GetBorderDim). DIMENSION 0 means no
 * corner/edge geometry in KotOR.js (retail would use corner/edge image sizes there — not
 * modeled). INNEROFFSET is then applied with retail's axis asymmetry:
 * width = (w - 2*corner) + 2*min(INNEROFFSET, DIMENSION)
 * height = (h - 2*corner) + 2*INNEROFFSETY (raw, no cap)
 * plus the degenerate-collapse test: if content is smaller than half an edge tile, it collapses.
 */
export function borderInnerExtent(params: {
  width: number;
  height: number;
  dimension: number;
  innerOffset: number;
  innerOffsetY?: number;
}): { width: number; height: number } {
  const ew = params.width | 0;
  const eh = params.height | 0;
  const dim = params.dimension | 0;
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

  const rawInnerX = params.innerOffset | 0;
  const rawInnerY = (params.innerOffsetY ?? params.innerOffset) | 0;
  const cappedInnerX = Math.min(rawInnerX, dim);

  return {
    width: w + 2 * cappedInnerX,
    height: h + 2 * rawInnerY,
  };
}

import { asExtentInt, asGuiSize, clampFrameDim, truncDiv } from "@engine/gui/GUICoord";

/**
 * matches engine behavior GetInnerExtent for width/height.
 *
 * corner/edge sizes come from GetBorderDim (DIMENSION, else edge/corner texture
 * height), clamped with {@link asGuiSize} / {@link clampFrameDim}. INNEROFFSET
 * is then applied with 's axis asymmetry:
 * width = (w - 2*corner) + 2*min(INNEROFFSET, DIMENSION)
 * height = (h - 2*corner) + 2*effectiveY (raw, no cap)
 *
 * TSL GetInnerExtent: when INNEROFFSETY is 0, Y falls back to INNEROFFSET.
 * Pass {@link applyInnerOffset} false for Draw fill holes (no inset, no fallback).
 */
export function borderInnerExtent(params: {
  width: number;
  height: number;
  dimension: number;
  innerOffset: number;
  innerOffsetY?: number;
  /** When false, skip INNEROFFSET/Y (fill Draw hole). Default true. */
  applyInnerOffset?: boolean;
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

  if (params.applyInnerOffset === false) {
    return { width: w, height: h };
  }

  const rawInnerX = asExtentInt(params.innerOffset);
  // TSL: INNEROFFSETY == 0 → fall back to INNEROFFSET (not literal zero).
  const rawInnerYIn = params.innerOffsetY;
  const rawInnerY = asExtentInt(
    (rawInnerYIn === 0 || rawInnerYIn == null) ? params.innerOffset : rawInnerYIn,
  );
  const cappedInnerX = Math.min(rawInnerX, asGuiSize(params.dimension));

  return {
    width: w + 2 * cappedInnerX,
    height: h + 2 * rawInnerY,
  };
}

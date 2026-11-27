import { asExtentInt } from "@engine/gui/GUICoord";

/**
 * GUI extent snapshot stored in control_extents
 * (AddControls; restored in OrganizeControls).
 */
export type ListBoxSavedExtent = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function snapshotListBoxExtent(extent: {
  left: number;
  top: number;
  width: number;
  height: number;
}): ListBoxSavedExtent {
  return {
    left: asExtentInt(extent.left),
    top: asExtentInt(extent.top),
    width: asExtentInt(extent.width),
    height: asExtentInt(extent.height),
  };
}

/** Apply a saved extent onto a mutable extent-like object (tests / restore). */
export function applyListBoxSavedExtent(
  target: { left: number; top: number; width: number; height: number },
  saved: ListBoxSavedExtent,
): void {
  target.left = asExtentInt(saved.left);
  target.top = asExtentInt(saved.top);
  target.width = asExtentInt(saved.width);
  target.height = asExtentInt(saved.height);
}

/** pitch = padding + item_height (OrganizeControls). */
export function listBoxRowPitch(padding: number, itemHeight: number): number {
  return padding + itemHeight;
}

export function maxItemHeightFromHeights(heights: readonly number[]): number {
  let max = 0;
  for (let i = 0; i < heights.length; i++) {
    if (heights[i] > max) {
      max = heights[i];
    }
  }
  return max;
}

/**
 * OrganizeControls leftover :
 * leftover = (viewport_height - items_per_page * pitch) - padding
 * stretch = leftover / items_per_page (trunc toward 0); rem = leftover - stretch * ipp
 */
export function listBoxLeftoverStretch(
  viewportHeight: number,
  itemsPerPage: number,
  pitch: number,
  padding: number,
): { stretchPerItem: number; remainderPixels: number } {
  const ipp = itemsPerPage | 0;
  if (ipp <= 0) {
    return { stretchPerItem: 0, remainderPixels: 0 };
  }
  const leftover = ((viewportHeight | 0) - ipp * (pitch | 0)) - (padding | 0);
  const stretchPerItem = (leftover / ipp) | 0;
  const remainderPixels = leftover - ipp * stretchPerItem;
  return { stretchPerItem, remainderPixels };
}

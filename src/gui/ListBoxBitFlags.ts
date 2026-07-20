/**
 * Retail CSWGuiListBox_BitFlags (swkotor.exe).
 * Defaults match CSWGuiListBox constructor @ 0041be40.
 */
export interface ListBoxBitFlags {
  selectOnLeftClick: boolean;
  suppressControlCleanup: boolean;
  restoreSavedExtents: boolean;
  layoutDirty: boolean;
  scrollbarOnLeft: boolean;
  scrollbarVisible: boolean;
  looping: boolean;
  anchorTop: boolean;
  variableItemHeight: boolean;
  noSelectMode: boolean;
  clipPartiallyVisibleItems: boolean;
  animateScrollArrows: boolean;
  autoScrollToSelection: boolean;
}

export function createDefaultListBoxBitFlags(): ListBoxBitFlags {
  return {
    // Click-to-select by default so hover does not override a committed click.
    // Call setSelectOnLeftClick(false) for retail hover-select lists.
    selectOnLeftClick: true,
    suppressControlCleanup: true,
    restoreSavedExtents: false,
    layoutDirty: true,
    scrollbarOnLeft: true,
    scrollbarVisible: true,
    looping: false,
    anchorTop: true,
    variableItemHeight: false,
    noSelectMode: false,
    clipPartiallyVisibleItems: false,
    animateScrollArrows: true,
    autoScrollToSelection: true,
  };
}

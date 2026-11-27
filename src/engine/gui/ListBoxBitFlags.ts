/**
 * list-box bit flags.
 * Defaults match the list box constructor.
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
    // list box ctor — selectOnLeftClick = false (hover-select).
    // setProtoBuilder sets protoClickSelects for click-to-select custom rows.
    selectOnLeftClick: false,
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

/**
 * Resolve GUIProtoItem list-row body height.
 *
 * When alignExtentToWrappedText is false (inventory / save / equip), retail uses the
 * PROTOITEM extent height only — text may wrap visually but does not change pitch.
 * When true (description-style rows), grow to fit text geometry.
 */
export function resolveProtoItemHeight(
  extentHeight: number,
  textHeight: number,
  alignExtentToWrappedText: boolean,
): number {
  const h = extentHeight | 0;
  if (!alignExtentToWrappedText) {
    return h;
  }
  const textH = textHeight | 0;
  return textH > h ? textH : h;
}

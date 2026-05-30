/**
 * Minimal list-item payload for GUI list controls (e.g. inventory items).
 * Implemented by ModuleItem and other node types used in GUIListBox.
 */
export interface IGUIControlListNode {
  getIcon?(): string;
  getName?(): string;
  getStackSize?(): number;
  toString(): string;
}

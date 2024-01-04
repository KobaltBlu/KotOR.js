/**
 * GUIControlTypeMask enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControlTypeMask.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GUIControlTypeMask {
  GUIControl      = (1 << 0),
  GUIButton       = (1 << 1),
  GUICheckBox     = (1 << 2),
  GUILabel        = (1 << 3),
  GUIListBox      = (1 << 4),
  GUIPanel        = (1 << 5),
  GUIProgressBar  = (1 << 6),
  GUIProtoItem    = (1 << 7),
  GUIScrollBar    = (1 << 8),
  GUISlider       = (1 << 9),
}
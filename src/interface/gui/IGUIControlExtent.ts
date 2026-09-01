/**
 * IGUIControlExtent interface.
 *
 * Mirrors retail GUI extent (16 bytes): int left, top, width, height.
 * K1 Load reads LEFT/TOP/WIDTH/HEIGHT as INT.
 * Runtime values must stay integers (see asExtentInt / GUIControl setters).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IGUIControlExtent.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IGUIControlExtent {
  /** Top-left Y-down pixel Y (int). */
  top: number,
  /** Top-left Y-down pixel X (int). */
  left: number,
  /** Width in pixels (int). */
  width: number,
  /** Height in pixels (int). */
  height: number
}

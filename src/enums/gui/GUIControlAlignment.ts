/**
 * GUIControlAlignment enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIControlAlignment.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GUIControlAlignment {
  //Horizontal
  HorizontalLeft =   0x01,
  HorizontalCenter = 0x02,
  HorizontalRight =  0x04,
  HorizontalMask =   0x07,

  //Vertical
  VerticalTop =      0x08,
  VerticalCenter =   0x10,
  VerticalBottom =   0x20,
  VerticalMask =     0x38
};
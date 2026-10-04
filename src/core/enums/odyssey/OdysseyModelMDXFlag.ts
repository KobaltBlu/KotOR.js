/**
 * OdysseyModelMDXFlag enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelMDXFlag.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum OdysseyModelMDXFlag {
  VERTEX    = 0x0001,
  UV1       = 0x0002,
  UV2       = 0x0004,
  UV3       = 0x0008,
  UV4       = 0x0010,
  NORMAL    = 0x0020,
  COLOR     = 0x0040,
  TANGENT1  = 0x0080,
  TANGENT2  = 0x0100,
  TANGENT3  = 0x0200,
  TANGENT4  = 0x0400
}
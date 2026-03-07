/**
 * OdysseyModelNodeType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelNodeType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum OdysseyModelNodeType {
  Header    = 0x0001,
  Light     = 0x0002,
  Emitter   = 0x0004,
  Camera    = 0x0008,
  Reference = 0x0010,
  Mesh      = 0x0020,
  Skin      = 0x0040,
  Anim      = 0x0080,
  Dangly    = 0x0100,
  AABB      = 0x0200,
  Saber     = 0x0800, //2081
};
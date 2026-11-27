/**
 * NWScriptDataType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptDataType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum NWScriptDataType {
  VOID = 0x00,
  INTEGER = 0x03,
  FLOAT = 0x04,
  STRING = 0x05,
  OBJECT = 0x06,

  EFFECT = 0x10,
  EVENT = 0x11,
  LOCATION = 0x12,
  TALENT = 0x13,
  VECTOR = 0x14,
  STRUCTURE = 0x24,
  ACTION = 0xFF,
}

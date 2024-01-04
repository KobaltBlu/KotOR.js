/**
 * GFFDataType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GFFDataType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum GFFDataType {
  BYTE = 0,
  CHAR = 1,
  WORD = 2,
  SHORT = 3,
  DWORD = 4,
  INT = 5,
  DWORD64 = 6,
  INT64 = 7,
  FLOAT = 8,
  DOUBLE = 9,
  CEXOSTRING = 10,
  RESREF = 11,
  CEXOLOCSTRING = 12,
  VOID = 13,
  STRUCT = 14,
  LIST = 15,
  ORIENTATION = 16,
  VECTOR = 17,
  STRREF
};
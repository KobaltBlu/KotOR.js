/**
 * IOdysseyFileHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyFileHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyFileHeader {
  flagBinary: number;
  mdlDataSize: number;
  mdxDataSize: number;

  modelDataOffset: number;
  rawDataOffset: number;
}
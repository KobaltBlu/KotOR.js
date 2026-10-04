/**
 * ITGAHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ITGAHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ITGAHeader {
  ID: number;
  ColorMapType: number;
  FileType: number;

  //Simple color map detection (May not be adequate)
  hasColorMap: boolean;
  ColorMapIndex: number;

  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  bitsPerPixel: number;
  imageDescriptor: number;

  pixelDataOffset: number;
};
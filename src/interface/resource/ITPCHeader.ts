import type { PixelFormat } from '../../enums/graphics/tpc/PixelFormat';

/**
 * ITPCHeader interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ITPCHeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ITPCHeader {
  dataSize: number;
  alphaTest: number;
  width: number;
  height: number;
  encoding: number;
  mipMapCount: number;
  bytesPerPixel: number;
  bitsPerPixel: number;
  minDataSize: number;
  compressed: boolean
  hasAlpha: boolean
  format: PixelFormat;
  isCubemap: boolean;
  faces: number;
}
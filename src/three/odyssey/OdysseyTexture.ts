import * as THREE from "three";
import { TXI } from "../../resource/TXI";

/**
 * OdysseyTexture class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyTexture.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyTexture extends THREE.Texture {

  txi: TXI = new TXI('');
  header: any;
  pack: number = 0;
  bumpMapType: string;

  constructor(
    image?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    mapping?: THREE.Mapping,
    wrapS?: THREE.Wrapping,
    wrapT?: THREE.Wrapping,
    magFilter?: THREE.TextureFilter,
    minFilter?: THREE.TextureFilter,
    format?: THREE.PixelFormat|THREE.CompressedPixelFormat,
    type?: THREE.TextureDataType,
    anisotropy?: number,
    encoding?: THREE.TextureEncoding,
  ){
    super(image, mapping, wrapS, wrapT, magFilter, minFilter, format as THREE.PixelFormat, type, anisotropy, encoding);
    this.txi = new TXI();
  }
}
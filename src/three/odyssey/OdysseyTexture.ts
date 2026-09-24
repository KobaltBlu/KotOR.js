import * as THREE from "three";
import { TXI } from "@/resource/TXI";

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
  /**
   * TGA descriptor origin (bits 4–5): 0=BL, 1=BR, 2=UL, 3=UR.
   * Used so cycle contact-sheet splits match ImageGetSubImage on raw buffers.
   */
  tgaOrigin: number = 0;
  /**
   * gl_textures — one GPU texture per cycle frame.
   * Index 0 is this texture itself when proceduretype is cycle.
   */
  cycleFrames: THREE.Texture[] = [];

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
    colorSpace?: THREE.ColorSpace,
  ){
    super(image, mapping, wrapS, wrapT, magFilter, minFilter, format as THREE.PixelFormat, type, anisotropy, colorSpace);
    this.txi = new TXI();
  }
}

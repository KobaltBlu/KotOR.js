import * as THREE from "three";
import { TXI } from "./TXI";

export class OdysseyTexture extends THREE.Texture {

  txi: TXI;
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
    format?: THREE.PixelFormat,
    type?: THREE.TextureDataType,
    anisotropy?: number,
    encoding?: THREE.TextureEncoding,
  ){
    super(image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, encoding);
    this.txi = new TXI();
  }
}
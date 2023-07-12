import * as THREE from "three";
import type { TXI } from "../../resource/TXI";

export class OdysseyCompressedTexture extends THREE.CompressedTexture {
  material: THREE.Material;
  bumpMapType: string;
  txi: TXI;
  header: any;
  pack: number;

  constructor(mipmaps: ImageData[], width: number, height: number, format?: THREE.CompressedPixelFormat, type?: THREE.TextureDataType, mapping?: THREE.Mapping, wrapS?: THREE.Wrapping, wrapT?: THREE.Wrapping, magFilter?: THREE.TextureFilter, minFilter?: THREE.TextureFilter, anisotropy?: number, encoding?: THREE.TextureEncoding){
    super(mipmaps, width, height, format, type, mapping, wrapS, wrapT, magFilter, minFilter, anisotropy, encoding);
  }

}
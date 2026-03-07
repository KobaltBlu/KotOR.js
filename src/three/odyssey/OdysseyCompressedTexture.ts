import * as THREE from "three";
import { OdysseyTexture } from "./OdysseyTexture";

/**
 * OdysseyCompressedTexture class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyCompressedTexture.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyCompressedTexture extends OdysseyTexture {
  material: THREE.Material;
  isCompressedTexture: boolean = true;

  constructor(mipmaps: ImageData[], width: number, height: number, format?: THREE.CompressedPixelFormat, type?: THREE.TextureDataType, mapping?: THREE.Mapping, wrapS?: THREE.Wrapping, wrapT?: THREE.Wrapping, magFilter?: THREE.TextureFilter, minFilter?: THREE.TextureFilter, anisotropy?: number, encoding?: THREE.TextureEncoding){
    super(null, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, encoding);

		this.image = { width: width, height: height };
		this.mipmaps = mipmaps;

		// no flipping for cube textures
		// (also flipping doesn't work for compressed textures )

		this.flipY = false;

		// can't generate mipmaps for compressed textures
		// mips must be embedded in DDS files

		this.generateMipmaps = false;
  }

}
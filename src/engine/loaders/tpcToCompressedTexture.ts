import * as THREE from 'three';
import { TXIPROCEDURETYPE } from "@core/enums/graphics/txi/TXIPROCEDURETYPE";
import { PixelFormat } from "@core/enums/graphics/tpc/PixelFormat";
import { TPCObject } from "@core/resource/TPCObject";
import { PixelManager } from "@core/utility/PixelManager";
import { OdysseyCompressedTexture } from "@engine/render/three/odyssey/OdysseyCompressedTexture";

const CUBEMAP_FACE_REMAP = [1, 0, 2, 3, 4, 5];
const CUBEMAP_FACE_ROTATIONS = [3, 1, 0, 2, 2, 0];

function pixelFormatToThree(format: PixelFormat): THREE.PixelFormat | THREE.CompressedPixelFormat {
  switch (format) {
    case PixelFormat.DXT1:
      return THREE.RGB_S3TC_DXT1_Format;
    case PixelFormat.DXT5:
      return THREE.RGBA_S3TC_DXT5_Format;
    case PixelFormat.DXT3:
      return THREE.RGBA_S3TC_DXT3_Format;
    default:
      return THREE.RGBAFormat;
  }
}

/** Convert TPC bytes into an OdysseyCompressedTexture for the engine. */
export function tpcToCompressedTexture(tpc: TPCObject) {
  //Convert the TPC into a THREE.CompressedTexture for use in the engine
  // glImage — cycle textures get one GL tid per frame.

    let images = [];
    let texDatas = tpc.getDDS( true );
    const frameCount = texDatas.frameCount || 1;
    const isCycle = tpc.txi.procedureType == TXIPROCEDURETYPE.CYCLE && frameCount > 1;

    const buildFrameTexture = (mipmaps: any[], width: number, height: number): OdysseyCompressedTexture => {
      const tex = new OdysseyCompressedTexture( mipmaps, width, height );
      tex.name = tpc.filename;
      if ( texDatas.mipmapCount === 1 ) {
        tex.minFilter = THREE.LinearFilter;
      }
      tex.format = pixelFormatToThree(texDatas.format);
      // CreateTexture — default wrap is GL_REPEAT when TXI clamp bits are clear.
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      (tex as any).bumpMapType = 'NORMAL';
      (tex as any).header = tpc.header;
      (tex as any).pack = tpc.pack;
      (tex as any).txi = tpc.txi;
      return tex;
    };

    if ( isCycle ) {
      // Per-frame mip chains — CreateProcessedTexture / GetCompressedContactSheetOffset
      const cycleFrames: OdysseyCompressedTexture[] = [];
      for ( let f = 0; f < frameCount; f++ ) {
        const start = f * texDatas.mipmapCount;
        const frameMips = texDatas.mipmaps.slice(start, start + texDatas.mipmapCount);
        const frameTex = buildFrameTexture(frameMips, texDatas.width, texDatas.height);
        cycleFrames.push(frameTex);
      }
      // Index 0 is the returned texture itself (matches engine behavior gl_textures[0] == first_gl_texture)
      const _texture = cycleFrames[0];
      _texture.cycleFrames = cycleFrames;
      for ( let f = 1; f < cycleFrames.length; f++ ) {
        cycleFrames[f].cycleFrames = cycleFrames;
      }
      (_texture as any).clone = function () {
        let cloned = new this.constructor().copy( this );
        cloned.format = this.format;
        cloned.needsUpdate = true;
        cloned.bumpMapType = this.bumpMapType;
        cloned.header = this.header;
        cloned.txi = this.txi;
        cloned.cycleFrames = this.cycleFrames;
        return this;
      };
      return _texture;
    }

    let _texture: OdysseyCompressedTexture|THREE.CanvasTexture = buildFrameTexture(
      texDatas.mipmaps, texDatas.width, texDatas.height
    );

      if ( texDatas.isCubemap ) {
        const faces = texDatas.mipmaps.length / texDatas.mipmapCount;
        // Only the uncompressed path is remapped/rotated by (CreateCubeTexture);
        // DXT cubemaps (CreateProcessedCubeTexture) upload faces in order, unrotated.
        const applyOdysseyCubemapOrientation = !tpc.header.compressed;
        for ( let f = 0; f < faces; f ++ ) {
          const targetFace = applyOdysseyCubemapOrientation ? CUBEMAP_FACE_REMAP[ f ] : f;
          images[ targetFace ] = { mipmaps : [], width: texDatas.width, height: texDatas.height } as any;
          for ( let i = 0; i < texDatas.mipmapCount; i++ ) {
            const mipmap = texDatas.mipmaps[ f * texDatas.mipmapCount + i ];
            if(applyOdysseyCubemapOrientation){
              for(let r = 0; r < CUBEMAP_FACE_ROTATIONS[ f ]; r++){
                mipmap.data = PixelManager.Rotate90deg(mipmap.data, 4, mipmap.width, mipmap.height);
              }
            }
            images[ targetFace ].mipmaps.push( mipmap );
          }
        }
        (_texture as any).image = images;
        _texture.image.width = texDatas.width;
        _texture.image.height = texDatas.height;
        _texture.mipmaps = images[ 0 ].mipmaps;
        // CreateCubeTexture — GL_TEXTURE_CUBE_MAP with GL_CLAMP_TO_EDGE on S/T/R.
        // Mark as CubeTexture so Three binds via setTextureCube (WebGLRenderer.initTexture).
        (_texture as any).isCubeTexture = true;
        _texture.mapping = THREE.CubeReflectionMapping;
        _texture.wrapS = _texture.wrapT = THREE.ClampToEdgeWrapping;
      } else {
        _texture.image.width = texDatas.width;
        _texture.image.height = texDatas.height;
        _texture.mipmaps = texDatas.mipmaps;
      }

    (_texture as any).clone = function () {
      let cloned = new this.constructor().copy( this );
      cloned.format = this.format;
      cloned.needsUpdate = true;
      cloned.bumpMapType = this.bumpMapType;
      cloned.header = this.header;
      cloned.txi = this.txi;
      cloned.cycleFrames = this.cycleFrames;
      return this;
    };

    return _texture;
}

import * as THREE from 'three';
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TXI } from "@/resource/TXI";
// @ts-ignore
import * as dxtJs from "dxt-js";
import { PixelFormat } from "@/enums/graphics/tpc/PixelFormat";
import { ENCODING } from "@/enums/graphics/tpc/Encoding";
import { OdysseyCompressedTexture } from "@/three/odyssey/OdysseyCompressedTexture";
import { ITPCHeader } from "@/interface/resource/ITPCHeader";
import { ITPCObjectOptions } from "@/interface/resource/ITPCObjectOptions";
import { PixelManager } from "@/utility/PixelManager";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";

const TPCHeaderLength = 128;

/**
 * Retail GLRender::CreateCubeTexture @ 00424000 (uncompressed cubemaps only):
 * source face i is quarter-rotated clockwise CUBEMAP_FACE_ROTATIONS[i] times
 * (tables @ 0078db38) and uploaded to GL face CUBEMAP_FACE_REMAP[i] (@ 0078db50).
 * The DXT path (CreateProcessedCubeTexture) uploads faces in order, unrotated.
 */
const CUBEMAP_FACE_REMAP = [1, 0, 2, 3, 4, 5];
const CUBEMAP_FACE_ROTATIONS = [3, 1, 0, 2, 2, 0];

/**
 * TPCObject class.
 * 
 * Class representing a TPC compressed texture file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TPCObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TPCObject {
  static worker: Worker;

  header: ITPCHeader;
  txi: TXI = new TXI('');
  file: Uint8Array;
  filename: string;
  pack: number;

  canvas: OffscreenCanvas[] = [];

  constructor ( args = {} as ITPCObjectOptions ) {

    const _default: ITPCObjectOptions = {} as ITPCObjectOptions;

    const options = {..._default, ...args};

    this.file = options.file;
    this.filename = options.filename;
    this.pack = options.pack;
    this.header = this.readHeader();
    this.txi = new TXI( this.getTXIData() );

  }

  getTXIData(): string {

    try{
      let _txiOffset = this.getDataLength() + TPCHeaderLength;
      let _txiDataLength = this.file.length - _txiOffset;

      if (_txiDataLength > 0){
        let txiReader = new BinaryReader(this.file.slice(_txiOffset, _txiOffset + _txiDataLength ));
        let txiData = '';
        let ch;
        
        while ((ch = txiReader.readChar() || '\0').charCodeAt(0) != 0)
          txiData = txiData + ch;

        return txiData;
      }else{
        return '';
      }
    }catch(e){
      console.error('getTXIData', e);
      return '';
    }

  }

  getMIPMaps(){

  }

  /**
   * Extract DDS/mipmap data from the TPC.
   * @param compressMipMaps Keep DXT compressed (true) or decompress to RGBA (false).
   * @param options.stitchCycleFrames When true, rebuild cycle frames into one contact-sheet
   *   atlas (Forge preview). Engine path keeps frames split — retail CAurTextureBasic::glImage
   *   @ 00420970 uploads one GL texture per frame.
   */
  getDDS( compressMipMaps: boolean = true, options?: { stitchCycleFrames?: boolean } ) {

  	let dds = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1, isCubemap: false, frameCount: 1 } as any;

    // Parse header
    if(this.header === null)
      this.header = this.readHeader();

  	if (!this.header.compressed) {
      // Uncompressed
      switch(this.header.encoding){
        case ENCODING.GRAY:
          // 8bpp grayscale
        break;
        case ENCODING.RGB:
    			dds.format = 1023;//THREE.RGBAFormat
        break;
        case ENCODING.RGBA:
          dds.format = 1023;//THREE.RGBAFormat;
        break;
        case ENCODING.BGRA:
          dds.format = 1023;//THREE.RGBAFormat;
        break;
      }
    }else{
      switch(this.header.encoding){
        case ENCODING.RGB:
          // S3TC DXT1
          dds.format = 33776;//THREE.RGB_S3TC_DXT1_Format;
        break;
        case ENCODING.RGBA:
          // S3TC DXT5
          dds.format = 33779;//THREE.RGBA_S3TC_DXT5_Format;
        break;
      }
    }

  	dds.mipmapCount = this.header.mipMapCount;
  	dds.isCubemap = this.header.isCubemap;
  	dds.width = this.header.width;
  	dds.height = this.header.height;

    let dataOffset = TPCHeaderLength;

    // TXI proceduretype cycle:
    //  - Compressed (CreateProcessedTexture @ 00424dd0): sequential per-frame mip chains
    //    with stride from GetCompressedContactSheetOffset @ 00424d70 (full chain, square frameW).
    //  - Uncompressed (CreateTexture @ 00424980): 2D contact sheet + ImageGetSubImage.
    const isCycle = this.txi.procedureType == TXIPROCEDURETYPE.CYCLE
      && (this.txi.numx | 0) > 0 && (this.txi.numy | 0) > 0
      && (this.txi.numx * this.txi.numy) > 1;

    if(isCycle && this.header.compressed){
      return this.getDDSCompressedCycle(dds, compressMipMaps, !!options?.stitchCycleFrames);
    }

    if(isCycle && !this.header.compressed){
      // Uncompressed contact sheet — dimensions stay full sheet until split below
    }

  	for ( let face = 0; face < this.header.faces; face++ ) {

  		let width = dds.width;
  		let height = dds.height;
      let dataSize = this.header.dataSize;
      let dataLength = 0;
      let byteArray = new Uint8Array(0);

  		for ( let i = 0; i < dds.mipmapCount; i++ ) {

  			if ( !this.header.compressed ) {
  				dataLength = width * height * this.header.minDataSize;
          const rawBuffer = this.file.slice(dataOffset, dataOffset + dataLength);
          if(this.header.encoding == ENCODING.RGB){
            byteArray = new Uint8Array( (rawBuffer.length/3) * 4 );
            let n = 4 * width * height;
            let s = 0, d = 0;
            while (d < n) {
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = 255;
            }
          }else if(this.header.encoding == ENCODING.GRAY){
            byteArray = new Uint8Array(rawBuffer.length * 4);
            for(let p = 0, d = 0; p < rawBuffer.length; p++){
              const v = rawBuffer[p];
              byteArray[d++] = v;
              byteArray[d++] = v;
              byteArray[d++] = v;
              byteArray[d++] = 255;
            }
          }else if(this.header.encoding == ENCODING.BGRA){
            byteArray = new Uint8Array(rawBuffer.length);
            for(let p = 0; p < rawBuffer.length; p += 4){
              byteArray[p    ] = rawBuffer[p + 2];
              byteArray[p + 1] = rawBuffer[p + 1];
              byteArray[p + 2] = rawBuffer[p    ];
              byteArray[p + 3] = rawBuffer[p + 3];
            }
          }else{
            byteArray = rawBuffer;
          }
  			} else {
          dataLength = Math.max(
            this.header.minDataSize,
            TPCObject.getCompressedMipByteLength(width, height, this.header.encoding)
          );
          byteArray = this.file.slice(dataOffset, dataOffset + dataLength);
          if(!compressMipMaps){
            const dxtFlag = this.header.encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
            byteArray = Uint8Array.from(dxtJs.decompress(byteArray, width, height, dxtFlag));
          }
  			}

  			dds.mipmaps.push({
          data: byteArray,
          width: width,
          height: height
        });

  			dataOffset += dataLength;

  			width = Math.max( width >> 1, 1 );
  			height = Math.max( height >> 1, 1 );
        dataSize = Math.max( dataSize >> 2, this.header.minDataSize );

  		}

    }

    // Uncompressed cycle: ImageGetSubImage each cell into its own mip chain.
    if(isCycle && !this.header.compressed){
      if(options?.stitchCycleFrames){
        dds.frameCount = 1;
      }else{
        dds = this.splitUncompressedCycleContactSheet(dds);
      }
    }

  	return dds;

  }

  /**
   * Compressed cycle TPCs — retail CreateProcessedTexture @ 00424dd0 /
   * GetCompressedContactSheetOffset @ 00424d70.
   *
   * On disk: [frame0 full mip chain][frame1 full mip chain]... with stride
   * = sum of DXT sizes for square frameW down to 1x1 (header.mipMapCount may be 1;
   * lower mips still occupy the stride). Header width/height are the logical sheet size.
   */
  private getDDSCompressedCycle(dds: any, compressMipMaps: boolean, stitchCycleFrames: boolean): any {
    const numx = this.txi.numx | 0;
    const numy = this.txi.numy | 0;
    const frameCount = numx * numy;
    const frameW = Math.max(1, Math.floor(this.header.width / numx));
    const frameH = Math.max(1, Math.floor(this.header.height / numy));
    // Retail GetBPP: DXT5 → 4, DXT1 → 3
    const bpp = this.header.encoding == ENCODING.RGBA ? 4 : 3;
    const uploadMips = Math.max(1, this.header.mipMapCount);
    const dxtFlag = this.header.encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;

    dds.width = frameW;
    dds.height = frameH;
    dds.mipmapCount = uploadMips;
    dds.frameCount = frameCount;
    dds.mipmaps = [];

    for(let f = 0; f < frameCount; f++){
      let dataOffset = TPCHeaderLength + TPCObject.getCompressedContactSheetOffset(f, frameW, bpp);
      let width = frameW;
      let height = frameH;

      for(let m = 0; m < uploadMips; m++){
        const dataLength = Math.max(
          this.header.minDataSize,
          TPCObject.getCompressedMipByteLength(width, height, this.header.encoding)
        );
        let byteArray = this.file.slice(dataOffset, dataOffset + dataLength);
        if(!compressMipMaps){
          byteArray = Uint8Array.from(dxtJs.decompress(byteArray, width, height, dxtFlag));
        }
        dds.mipmaps.push({ data: byteArray, width, height });
        dataOffset += dataLength;
        width = Math.max(width >> 1, 1);
        height = Math.max(height >> 1, 1);
      }
      // Bytes past uploadMips within frameStride are skipped; next frame starts at stride*(f+1).
    }

    if(stitchCycleFrames){
      return this.stitchCompressedCycleFrames(dds, compressMipMaps);
    }
    return dds;
  }

  /**
   * Forge preview: rebuild sequential cycle frames into a numx×numy contact sheet.
   */
  private stitchCompressedCycleFrames(dds: any, compressMipMaps: boolean): any {
    const numx = this.txi.numx | 0;
    const numy = this.txi.numy | 0;
    const frameCount = numx * numy;
    const frameW = dds.width as number;
    const frameH = dds.height as number;
    const mipmapCount = dds.mipmapCount as number;
    const encoding = this.header.encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
    const mipmaps: { data: Uint8Array, width: number, height: number }[] = [];

    let imageWidth = this.header.width;
    let imageHeight = this.header.height;
    let mipFrameW = frameW;
    let mipFrameH = frameH;

    for(let m = 0; m < mipmapCount; m++){
      const sheetRgba = new Uint8ClampedArray(imageWidth * imageHeight * 4);

      for(let i = 0; i < frameCount; i++){
        const mipmap = dds.mipmaps[m + (i * mipmapCount)];
        if(!mipmap) continue;
        const rgba = Uint8ClampedArray.from(
          compressMipMaps
            ? dxtJs.decompress(mipmap.data, mipFrameW, mipFrameH, encoding)
            : mipmap.data
        );
        const col = i % numx;
        const row = Math.floor(i / numx);
        const destX = col * mipFrameW;
        const destY = row * mipFrameH;
        for(let y = 0; y < mipFrameH; y++){
          const srcOff = y * mipFrameW * 4;
          const dstOff = ((destY + y) * imageWidth + destX) * 4;
          sheetRgba.set(rgba.subarray(srcOff, srcOff + mipFrameW * 4), dstOff);
        }
      }

      mipmaps.push({
        data: compressMipMaps
          ? dxtJs.compress(sheetRgba, imageWidth, imageHeight, encoding)
          : new Uint8Array(sheetRgba.buffer, sheetRgba.byteOffset, sheetRgba.byteLength),
        width: imageWidth,
        height: imageHeight,
      });

      mipFrameW = Math.max(mipFrameW >> 1, 1);
      mipFrameH = Math.max(mipFrameH >> 1, 1);
      imageWidth = Math.max(imageWidth >> 1, 1);
      imageHeight = Math.max(imageHeight >> 1, 1);
    }

    dds.mipmaps = mipmaps;
    dds.width = this.header.width;
    dds.height = this.header.height;
    dds.frameCount = 1;
    return dds;
  }

  /**
   * Uncompressed cycle contact sheet → per-frame mip chains.
   * Retail CreateTexture @ 00424980 ImageGetSubImage(x = (i%numx)*fw, y = (i/numx)*fh).
   */
  private splitUncompressedCycleContactSheet(dds: any): any {
    const numx = this.txi.numx | 0;
    const numy = this.txi.numy | 0;
    const frameCount = numx * numy;
    const sheetMips = dds.mipmaps as { data: Uint8Array, width: number, height: number }[];
    const mipmapCount = dds.mipmapCount;
    const frameMips: { data: Uint8Array, width: number, height: number }[] = [];

    for(let i = 0; i < frameCount; i++){
      const col = i % numx;
      const row = Math.floor(i / numx);

      for(let m = 0; m < mipmapCount; m++){
        const sheet = sheetMips[m];
        if(!sheet) continue;

        const frameW = Math.max(1, Math.floor(sheet.width / numx));
        const frameH = Math.max(1, Math.floor(sheet.height / numy));
        const data = TPCObject.extractRgbaSubImage(
          sheet.data, sheet.width, sheet.height,
          col * frameW, row * frameH, frameW, frameH
        );
        frameMips.push({ data, width: frameW, height: frameH });
      }
    }

    dds.mipmaps = frameMips;
    dds.width = Math.max(1, Math.floor(this.header.width / numx));
    dds.height = Math.max(1, Math.floor(this.header.height / numy));
    dds.frameCount = frameCount;
    return dds;
  }

  /** Retail ImageGetSubImage @ 0045f000 — RGBA8 rectangle copy. */
  static extractRgbaSubImage(
    src: Uint8Array, srcW: number, srcH: number,
    x: number, y: number, w: number, h: number
  ): Uint8Array {
    const out = new Uint8Array(w * h * 4);
    const copyW = Math.min(w, Math.max(0, srcW - x));
    const copyH = Math.min(h, Math.max(0, srcH - y));
    for(let row = 0; row < copyH; row++){
      const srcOff = ((y + row) * srcW + x) * 4;
      const dstOff = row * w * 4;
      out.set(src.subarray(srcOff, srcOff + copyW * 4), dstOff);
    }
    return out;
  }

  /**
   * Retail GetCompressedContactSheetOffset @ 00424d70.
   * Returns byte offset to frameIndex's mip chain. Assumes square frames (retail uses frameW only).
   * bpp == 4 → DXT5 (16-byte blocks), else DXT1 (8-byte blocks).
   */
  static getCompressedContactSheetOffset(frameIndex: number, frameWidth: number, bpp: number): number {
    const blockBytes = (bpp === 4) ? 16 : 8;
    let fw = frameWidth | 0;
    let blocks = (fw + 3) >> 2;
    let mipChain = blocks * blocks * blockBytes;
    while(fw > 1){
      fw >>= 1;
      blocks = (fw + 3) >> 2;
      mipChain += blocks * blocks * blockBytes;
    }
    return mipChain * frameIndex;
  }

  generateMipMapCount(width = 0, height = 0){
    let nWidth = width;
    let nHeight = height;
    let dataSize = 0;
    let running = true;
    let mips = 0;

    let multiplier = (this.header.encoding == ENCODING.RGB) ? 0.5 : 1;

    while(running){
      let mipMapSize = Math.max((nWidth * nHeight) * multiplier, this.header.minDataSize);
      //console.log(nWidth, nHeight, mipMapSize);
      dataSize += mipMapSize;//Math.max( dataSize >> 2, this.header.minDataSize );
      if(nWidth == 1 && nHeight == 1){
        running = false;
      }
      nWidth = Math.max( nWidth >> 1, 1 );
      nHeight = Math.max( nHeight >> 1, 1 );
      mips += 1;
    }
    return mips;
  }

  static generateMipMapCountForDimensions(width = 0, height = 0){
    let nWidth = Math.max(1, width | 0);
    let nHeight = Math.max(1, height | 0);
    let mips = 0;
    while(true){
      mips += 1;
      if(nWidth === 1 && nHeight === 1){
        break;
      }
      nWidth = Math.max(nWidth >> 1, 1);
      nHeight = Math.max(nHeight >> 1, 1);
    }
    return mips;
  }

  static getCompressedMipByteLength(width: number, height: number, encoding: ENCODING){
    const blockBytes = encoding == ENCODING.RGB ? 8 : 16;
    const blockW = Math.max(1, Math.floor((width + 3) / 4));
    const blockH = Math.max(1, Math.floor((height + 3) / 4));
    return blockW * blockH * blockBytes;
  }

  readHeader(): ITPCHeader {

    // Parse header
    let Header: ITPCHeader = {} as ITPCHeader;
    let Reader = new BinaryReader(this.file.slice(0, TPCHeaderLength));
    Reader.seek(0);
    Header.dataSize = Reader.readUInt32();
    Header.alphaTest = Reader.readSingle();

    // Image dimensions
    Header.width = Reader.readUInt16();
    Header.height = Reader.readUInt16();

    // How's the pixel data encoded?
    Header.encoding = Reader.readByte();

    // Number of mip maps in the image
    Header.mipMapCount = Math.max( 1, Reader.readByte() );

    Header.bytesPerPixel = 4;
    Header.bitsPerPixel = (Header.bytesPerPixel * 8);

    Header.minDataSize = 0;
    Header.compressed = false;
    Header.hasAlpha = false;

    if (Header.dataSize == 0) {
      // Uncompressed
      Header.compressed = false;
      switch(Header.encoding){
        case ENCODING.GRAY:
          Header.hasAlpha = false;
          Header.format = PixelFormat.R8G8B8;
          Header.bytesPerPixel = 1;
          Header.bitsPerPixel = 8;
          Header.minDataSize = 1;
          Header.dataSize = Header.width * Header.height;
        break;
        case ENCODING.RGB:
          Header.hasAlpha = false;
          Header.format = PixelFormat.R8G8B8;
          Header.bytesPerPixel = 3;
          Header.bitsPerPixel = 24;
          Header.minDataSize = 3;
          Header.dataSize = Header.width * Header.height * 3;
        break;
        case ENCODING.RGBA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.R8G8B8A8;
          Header.bytesPerPixel = 4;
          Header.bitsPerPixel = 32;
          Header.minDataSize = 4;
          Header.dataSize = Header.width * Header.height * 4;
        break;
        case ENCODING.BGRA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.B8G8R8A8;
          Header.bytesPerPixel = 4;
          Header.bitsPerPixel = 32;
          Header.minDataSize = 4;
          Header.dataSize = Header.width * Header.height * 4;
        break;
        default:
          console.error('TPCObject', Header);
          throw 'Unknown';
      }
    }else{
      switch(Header.encoding){
        case ENCODING.RGB:
          // S3TC DXT1
          Header.compressed = true;
          Header.hasAlpha = false;
          Header.format = PixelFormat.DXT1;
          Header.bytesPerPixel = 4;
          Header.bitsPerPixel = 32;
          Header.minDataSize = 8;
        break;
        case ENCODING.RGBA:
          // S3TC DXT5
          Header.compressed = true;
          Header.hasAlpha = true;
          Header.format = PixelFormat.DXT5;
          Header.bytesPerPixel = 4;
          Header.bitsPerPixel = 32;
          Header.minDataSize = 16;
        break;
        default:
          console.error('TPCObject', Header);
      }
    }

    // Extract mipmaps buffers
    Header.isCubemap = false;
    if( ( Header.height / Header.width ) == 6 ){
      Header.isCubemap = true;
      Header.height = Header.width;
    }

    Header.faces = Header.isCubemap ? 6 : 1;

    return Header;

  }

  getDataLength() {

      let dataLength = 0;

      for ( let face = 0; face < this.header.faces; face ++ ) {

    		let width = this.header.width;
    		let height = this.header.height;
        let dataSize = this.header.dataSize;

    		for ( let i = 0; i < this.header.mipMapCount; i ++ ) {
    			if ( !this.header.compressed ) {
    				dataLength += width * height * this.header.minDataSize;
    			} else {
    				dataLength += dataSize;
    			}

    			width = Math.max( width >> 1, 1 );
    			height = Math.max( height >> 1, 1 );
          dataSize = Math.max( dataSize >> 2, this.header.minDataSize );
    		}

    	}

      return dataLength;

  }

  FlipY(pixelData: any){
    let offset = 0;
    let stride = this.header.width * 4;

    if(pixelData == null)
      throw 'Missing pixelData'

    let unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }

    return pixelData;

  }

  //Convert the TPC into a THREE.CompressedTexture for use in the engine
  // Retail CAurTextureBasic::glImage @ 00420970 — cycle textures get one GL tid per frame.
  toCompressedTexture(){
    let images = [];
    let texDatas = this.getDDS( true );
    const frameCount = texDatas.frameCount || 1;
    const isCycle = this.txi.procedureType == TXIPROCEDURETYPE.CYCLE && frameCount > 1;

    const buildFrameTexture = (mipmaps: any[], width: number, height: number): OdysseyCompressedTexture => {
      const tex = new OdysseyCompressedTexture( mipmaps, width, height );
      tex.name = this.filename;
      if ( texDatas.mipmapCount === 1 ) {
        tex.minFilter = THREE.LinearFilter;
      }
      tex.format = texDatas.format;
      // Retail CreateTexture @ 00424980 — default wrap is GL_REPEAT when TXI clamp bits are clear.
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      (tex as any).bumpMapType = 'NORMAL';
      (tex as any).header = this.header;
      (tex as any).pack = this.pack;
      (tex as any).txi = this.txi;
      return tex;
    };

    if ( isCycle ) {
      // Per-frame mip chains — CreateProcessedTexture @ 00424dd0 / GetCompressedContactSheetOffset
      const cycleFrames: OdysseyCompressedTexture[] = [];
      for ( let f = 0; f < frameCount; f++ ) {
        const start = f * texDatas.mipmapCount;
        const frameMips = texDatas.mipmaps.slice(start, start + texDatas.mipmapCount);
        const frameTex = buildFrameTexture(frameMips, texDatas.width, texDatas.height);
        cycleFrames.push(frameTex);
      }
      // Index 0 is the returned texture itself (mirrors retail gl_textures[0] == first_gl_texture)
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
        // Only the uncompressed path is remapped/rotated by retail (CreateCubeTexture);
        // DXT cubemaps (CreateProcessedCubeTexture) upload faces in order, unrotated.
        const applyRetailOrientation = !this.header.compressed;
        for ( let f = 0; f < faces; f ++ ) {
          const targetFace = applyRetailOrientation ? CUBEMAP_FACE_REMAP[ f ] : f;
          images[ targetFace ] = { mipmaps : [], width: texDatas.width, height: texDatas.height } as any;
          for ( let i = 0; i < texDatas.mipmapCount; i++ ) {
            const mipmap = texDatas.mipmaps[ f * texDatas.mipmapCount + i ];
            if(applyRetailOrientation){
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
        // Retail CreateCubeTexture — GL_TEXTURE_CUBE_MAP with GL_CLAMP_TO_EDGE on S/T/R.
        // Mark as CubeTexture so Three binds via setTextureCube (WebGLRenderer.initTexture).
        (_texture as any).isCubeTexture = true;
        _texture.mapping = THREE.CubeReflectionMapping;
        _texture.wrapS = _texture.wrapT = THREE.ClampToEdgeWrapping;
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

}


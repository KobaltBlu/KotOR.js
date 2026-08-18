import * as THREE from 'three';
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { TXI } from "@/resource/TXI";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
// @ts-ignore
import * as dxtJs from "dxt-js";
import { PixelFormat } from "@/enums/graphics/tpc/PixelFormat";
import { ENCODING } from "@/enums/graphics/tpc/Encoding";
import { OdysseyCompressedTexture } from "@/three/odyssey/OdysseyCompressedTexture";
import { ITPCHeader } from "@/interface/resource/ITPCHeader";
import { ITPCObjectOptions } from "@/interface/resource/ITPCObjectOptions";
import { ITPCExportOptions } from "@/interface/resource/ITPCExportOptions";

const TPCHeaderLength = 128;

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
  static readonly HEADER_LENGTH = TPCHeaderLength;

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
    if (this.isCycleTexture()) {
      const cycleTxi = this.getTXIData();
      if (cycleTxi.trim()) {
        this.txi = new TXI(cycleTxi);
      }
    }

  }

  getTXIData(): string {

    try{
      if(!(this.file instanceof Uint8Array) || this.file.length <= TPCHeaderLength){
        return '';
      }
      const headerOffset = this.getDataLength() + TPCHeaderLength;
      const fromHeader = this.readTxiStringAt(headerOffset);
      const leftover = this.file.length - headerOffset;
      const fromTail = this.readTxiFromFileTail();
      const headerTrim = fromHeader.trim();
      const tailTrim = fromTail.trim();
      const tailUsable = !!(tailTrim && this.txiTextLooksValid(fromTail, true));
      if (tailUsable) {
        if (!headerTrim || (tailTrim.length > headerTrim.length && (
          tailTrim.endsWith(headerTrim) || !this.txiTextLooksValid(fromHeader, false)
        ))) {
          return fromTail;
        }
      }
      if (headerTrim && this.txiTextLooksValid(fromHeader, false)) {
        return fromHeader;
      }
      if (leftover <= 1) {
        return '';
      }
      return tailUsable ? fromTail : fromHeader;
    }catch(e){
      console.error('getTXIData', e);
      return '';
    }

  }

  private readTxiStringAt(offset: number): string {
    if(offset < 0 || offset >= this.file.length){
      return '';
    }
    const txiReader = new BinaryReader(this.file.slice(offset, this.file.length));
    let txiData = '';
    let ch;
    while ((ch = txiReader.readChar() || '\0').charCodeAt(0) != 0)
      txiData = txiData + ch;
    return txiData;
  }

  private readTxiFromFileTail(): string {
    if(!(this.file instanceof Uint8Array) || this.file.length <= TPCHeaderLength){
      return '';
    }
    let end = this.file.length;
    if (this.file[end - 1] === 0) {
      end -= 1;
    }
    let start = end;
    while (start > TPCHeaderLength) {
      const c = this.file[start - 1];
      if (c === 0) {
        break;
      }
      if (c !== 9 && c !== 10 && c !== 13 && (c < 32 || c >= 127)) {
        break;
      }
      start -= 1;
    }
    while (start < end && this.file[start] < 32) {
      start += 1;
    }
    let text = '';
    for (let i = start; i < end; i++) {
      text += String.fromCharCode(this.file[i]);
    }
    return text;
  }

  private txiTextLooksValid(text: string, requireKeyword = false): boolean {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return !requireKeyword;
    }
    let printable = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed.charCodeAt(i);
      if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) {
        printable += 1;
      }
    }
    if (printable / trimmed.length < 0.85) {
      return false;
    }
    if (requireKeyword) {
      return /\b(proceduretype|blending|mipmap|bumpmaptexture|envmaptexture|numx|numy|cube|isbumpmap|compresstexture|filter|clamp|decal|defaultwidth|defaultheight|fps)\b/i.test(trimmed);
    }
    return /[a-zA-Z]/.test(trimmed);
  }

  private isCycleTexture(): boolean {
    return this.txi?.procedureType == TXIPROCEDURETYPE.CYCLE
      && this.txi.numx > 0
      && this.txi.numy > 0;
  }

  /**
   * Retail cycle TPCs often store mipMapCount=1 while packing a full
   * per-frame mip chain (dataSize is then the whole pixel payload).
   * Using the header count would treat those smaller mips as later frames.
   */
  getCycleMipMapCount(): number {
    const headerMips = Math.max(1, this.header.mipMapCount);
    if (!this.isCycleTexture()) {
      return headerMips;
    }
    const frameW = Math.max(1, Math.floor(this.header.width / this.txi.numx));
    const frameH = Math.max(1, Math.floor(this.header.height / this.txi.numy));
    const frames = this.txi.numx * this.txi.numy;
    const fullMips = TPCObject.generateMipMapCountForDimensions(frameW, frameH);
    if (headerMips >= fullMips) {
      return headerMips;
    }
    const fullPayload = frames * TPCObject.mipChainByteLength(
      frameW,
      frameH,
      fullMips,
      this.header.compressed,
      this.header.encoding,
    );
    const available = (this.file instanceof Uint8Array ? this.file.length : 0) - TPCHeaderLength;
    if (available >= fullPayload) {
      return fullMips;
    }
    return headerMips;
  }

  getMIPMaps(){

  }

  getDDS( compressMipMaps: boolean = true ) {

  	let dds = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1, isCubemap: false } as any;

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

    //Detect Animated Textures
    if(this.txi.procedureType == 1){
      this.header.faces = this.txi.numx * this.txi.numy;
      dds.width  = this.header.width / this.txi.numx;
      dds.height  = this.header.height / this.txi.numy;
      dds.mipmapCount = this.getCycleMipMapCount();
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

    ///////////////////////////////////
    // REBUILD ANIMATED FRAMES
    ///////////////////////////////////
    
    //Combine Extracted mipMaps into a single mipmap if this texture is a procedureType = cycle texture
    if(this.txi.procedureType == 1){
      try{
        let encoding = (this.header.encoding == ENCODING.RGB) ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
        let mipmaps = [];

        dds.width = this.header.width;
        dds.height = this.header.height;

        let imageWidth = this.header.width;
        let imageHeight = this.header.height;
        let frameWidth = (imageWidth / this.txi.numx);
        let frameHeight = (imageHeight / this.txi.numy);
        let frameCount = (this.txi.numx * this.txi.numy);

        for(let m = 0; m < dds.mipmapCount; m++){
          const atlas = new Uint8Array(imageWidth * imageHeight * 4);

          for(let i = 0; i < frameCount; i++){
            let mipmap = dds.mipmaps[m + (i * dds.mipmapCount)];
            let uint8 = Uint8Array.from(
              compressMipMaps ? dxtJs.decompress(mipmap.data, frameWidth, frameHeight, encoding) : mipmap.data
            );
            const x = i % this.txi.numx;
            const y = Math.floor(i / this.txi.numx);
            TPCObject.blitRgba(atlas, imageWidth, x * frameWidth, y * frameHeight, uint8, frameWidth, frameHeight);
          }

          let mipmap_data = compressMipMaps ? dxtJs.compress(atlas, imageWidth, imageHeight, encoding) : atlas;

          mipmaps.push({
            data: mipmap_data,
            width: imageWidth,
            height: imageHeight
          });

          frameWidth = Math.max( frameWidth >> 1, 1 );
          frameHeight = Math.max( frameHeight >> 1, 1 );
          imageWidth = Math.max( imageWidth >> 1, 1 );
          imageHeight = Math.max( imageHeight >> 1, 1 );
        }
        dds.mipmaps = mipmaps;
        return dds;
      }catch(e){
        console.error(e);
      }
    }

  	return dds;

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

  static getUncompressedBytesPerPixel(encoding: ENCODING){
    switch(encoding){
      case ENCODING.GRAY:
        return 1;
      case ENCODING.RGB:
        return 3;
      case ENCODING.RGBA:
      case ENCODING.BGRA:
        return 4;
      default:
        return 4;
    }
  }

  static mipChainByteLength(
    width: number,
    height: number,
    mipMapCount: number,
    compressed: boolean,
    encoding: ENCODING,
  ){
    let total = 0;
    let w = Math.max(1, width | 0);
    let h = Math.max(1, height | 0);
    const bpp = TPCObject.getUncompressedBytesPerPixel(encoding);
    const count = Math.max(1, mipMapCount | 0);
    for (let i = 0; i < count; i++) {
      if (compressed) {
        total += TPCObject.getCompressedMipByteLength(w, h, encoding);
      } else {
        total += w * h * bpp;
      }
      w = Math.max(w >> 1, 1);
      h = Math.max(h >> 1, 1);
    }
    return total;
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

    if (this.isCycleTexture()) {
      const frameW = Math.max(1, Math.floor(this.header.width / this.txi.numx));
      const frameH = Math.max(1, Math.floor(this.header.height / this.txi.numy));
      const frames = this.txi.numx * this.txi.numy;
      return frames * TPCObject.mipChainByteLength(
        frameW,
        frameH,
        this.getCycleMipMapCount(),
        this.header.compressed,
        this.header.encoding,
      );
    }

    const faces = Math.max(1, this.header.faces || 1);
    return faces * TPCObject.mipChainByteLength(
      this.header.width,
      this.header.height,
      this.header.mipMapCount,
      this.header.compressed,
      this.header.encoding,
    );

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
  toCompressedTexture(){
    let images = [];
    let texDatas = this.getDDS( true );
    let _texture: OdysseyCompressedTexture|THREE.CanvasTexture = new OdysseyCompressedTexture( texDatas.mipmaps, texDatas.width, texDatas.height );

    // if(this.canvas.length){
    //   _texture = new THREE.CanvasTexture(this.canvas[0] as any);
    // }else{
      if ( texDatas.isCubemap ) {
        let faces = texDatas.mipmaps.length / texDatas.mipmapCount;
        for ( let f = 0; f < faces; f ++ ) {
          images[ f ] = { mipmaps : [] } as any;
          for ( let i = 0; i < texDatas.mipmapCount; i++ ) {
            images[ f ].mipmaps.push( texDatas.mipmaps[ f * texDatas.mipmapCount + i ] );
            images[ f ].format = THREE.CubeReflectionMapping;//texDatas.format;
            images[ f ].width = texDatas.width;
            images[ f ].height = texDatas.height;

            _texture.mipmaps = images[ f ].mipmaps;
          }
        }
        (_texture as any).image = images;
        _texture.image.width = texDatas.width;
        _texture.image.height = texDatas.height;
      } else {
        _texture.image.width = texDatas.width;
        _texture.image.height = texDatas.height;
        _texture.mipmaps = texDatas.mipmaps;
      }
    // }

    _texture.name = this.filename;

    if ( texDatas.mipmapCount === 1 ) {
      _texture.minFilter = THREE.LinearFilter;
    }

    _texture.format = texDatas.format;
    _texture.needsUpdate = true;
    (_texture as any).bumpMapType = 'NORMAL';

    (_texture as any).header = this.header;
    (_texture as any).pack = this.pack;
    (_texture as any).txi = null;

    (_texture as any).txi = this.txi;

    (_texture as any).clone = function () {
      let cloned = new this.constructor().copy( this );
      cloned.format = this.format;
      cloned.needsUpdate = true;
      cloned.bumpMapType = this.bumpMapType;
      cloned.header = this.header;
      cloned.txi = this.txi;
      return this;
    };

    return _texture;
  }

  /**
   * Write an Odyssey TPC file from level-0 RGBA (file orientation).
   */
  static toExportBuffer(options: ITPCExportOptions): Uint8Array {
    const width = Math.max(1, options.width | 0);
    const height = Math.max(1, options.height | 0);
    const encoding = options.encoding;
    const compressed = !!options.compressed && encoding != ENCODING.GRAY && encoding != ENCODING.BGRA;
    const alphaTest = Number.isFinite(options.alphaTest) ? options.alphaTest as number : 1.0;
    const cycle = options.cycle && options.cycle.numx > 0 && options.cycle.numy > 0
      ? options.cycle
      : undefined;
    const isCubemap = !cycle && !!options.isCubemap && height === width * 6;
    const faceWidth = isCubemap ? width : width;
    const faceHeight = isCubemap ? width : height;
    const frameWidth = cycle ? Math.max(1, Math.floor(width / cycle.numx)) : faceWidth;
    const frameHeight = cycle ? Math.max(1, Math.floor(height / cycle.numy)) : faceHeight;
    const requestedMips = options.mipMapCount == 1
      ? 1
      : TPCObject.generateMipMapCountForDimensions(frameWidth, frameHeight);
    const mipMapCount = Math.max(1, requestedMips | 0);
    const src = options.rgba instanceof Uint8Array ? options.rgba : new Uint8Array(options.rgba);

    const faces: Uint8Array[] = [];
    if (cycle) {
      for (let y = 0; y < cycle.numy; y++) {
        for (let x = 0; x < cycle.numx; x++) {
          faces.push(TPCObject.extractRgbaRect(
            src, width, x * frameWidth, y * frameHeight, frameWidth, frameHeight,
          ));
        }
      }
    } else if (isCubemap) {
      for (let face = 0; face < 6; face++) {
        faces.push(TPCObject.extractRgbaRect(src, width, 0, face * width, width, width));
      }
    } else {
      faces.push(new Uint8Array(src.subarray(0, width * height * 4)));
    }

    const encodedFaces: Uint8Array[][] = [];
    for (let f = 0; f < faces.length; f++) {
      const levels: Uint8Array[] = [];
      let mip = faces[f];
      let mw = frameWidth;
      let mh = frameHeight;
      for (let i = 0; i < mipMapCount; i++) {
        const levelRgba = i == 0
          ? mip
          : TPCObject.downsampleRgba(faces[f], frameWidth, frameHeight, mw, mh);
        levels.push(TPCObject.encodeMipLevel(levelRgba, mw, mh, encoding, compressed));
        mw = Math.max(mw >> 1, 1);
        mh = Math.max(mh >> 1, 1);
      }
      encodedFaces.push(levels);
    }

    const mip0Size = encodedFaces[0][0].length;
    const payloadBytes = encodedFaces.reduce((sum, levels) => {
      let n = 0;
      for (let i = 0; i < levels.length; i++) {
        n += levels[i].length;
      }
      return sum + n;
    }, 0);
    // Retail cycle TPCs set mipMapCount=1 and dataSize to the whole pixel blob
    // so CResTPC can find TXI without knowing about numx/numy.
    const headerMipMapCount = cycle && compressed ? 1 : mipMapCount;
    const dataSize = !compressed ? 0 : (cycle ? payloadBytes : mip0Size);
    const headerWidth = cycle ? width : faceWidth;
    const headerHeight = cycle ? height : (isCubemap ? faceWidth * 6 : faceHeight);

    const writer = new BinaryWriter(new Uint8Array(0));
    writer.writeUInt32(dataSize);
    writer.writeSingle(alphaTest);
    writer.writeUInt16(headerWidth);
    writer.writeUInt16(headerHeight);
    writer.writeUInt8(encoding);
    writer.writeUInt8(headerMipMapCount);
    while (writer.tell() < TPCHeaderLength) {
      writer.writeUInt8(0);
    }
    for (let f = 0; f < encodedFaces.length; f++) {
      for (let i = 0; i < encodedFaces[f].length; i++) {
        writer.writeBytes(encodedFaces[f][i]);
      }
    }
    const txi = (options.txi || "").trim();
    if (txi.length) {
      writer.writeStringNullTerminated(`${txi}\n`);
    }
    return writer.buffer;
  }

  static extractRgbaRect(
    src: Uint8Array | Uint8ClampedArray,
    srcW: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Uint8Array {
    const out = new Uint8Array(Math.max(0, w) * Math.max(0, h) * 4);
    for (let row = 0; row < h; row++) {
      const srcOff = ((y + row) * srcW + x) * 4;
      out.set(src.subarray(srcOff, srcOff + w * 4), row * w * 4);
    }
    return out;
  }

  static blitRgba(
    dst: Uint8Array,
    dstW: number,
    dx: number,
    dy: number,
    src: Uint8Array | Uint8ClampedArray,
    srcW: number,
    srcH: number,
  ): void {
    for (let row = 0; row < srcH; row++) {
      const srcOff = row * srcW * 4;
      const dstOff = ((dy + row) * dstW + dx) * 4;
      dst.set(src.subarray(srcOff, srcOff + srcW * 4), dstOff);
    }
  }

  static downsampleRgba(
    src: Uint8Array | Uint8ClampedArray,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
  ): Uint8Array {
    if (srcW === dstW && srcH === dstH) {
      return new Uint8Array(src);
    }
    const out = new Uint8Array(dstW * dstH * 4);
    const xRatio = srcW / dstW;
    const yRatio = srcH / dstH;
    for (let y = 0; y < dstH; y++) {
      const sy = (y + 0.5) * yRatio - 0.5;
      const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(sy)));
      const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));
      const fy = sy - y0;
      for (let x = 0; x < dstW; x++) {
        const sx = (x + 0.5) * xRatio - 0.5;
        const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(sx)));
        const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
        const fx = sx - x0;
        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;
        const o = (y * dstW + x) * 4;
        for (let c = 0; c < 4; c++) {
          const v0 = src[i00 + c] * (1 - fx) + src[i10 + c] * fx;
          const v1 = src[i01 + c] * (1 - fx) + src[i11 + c] * fx;
          out[o + c] = Math.round(v0 * (1 - fy) + v1 * fy);
        }
      }
    }
    return out;
  }

  static encodeMipLevel(
    rgba: Uint8Array,
    width: number,
    height: number,
    encoding: ENCODING,
    compressed: boolean,
  ): Uint8Array {
    if (compressed) {
      const dxtFormat = encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
      return new Uint8Array(dxtJs.compress(new Uint8Array(rgba), width, height, dxtFormat));
    }
    const count = width * height;
    if (encoding == ENCODING.GRAY) {
      const out = new Uint8Array(count);
      for (let i = 0, s = 0; i < count; i++, s += 4) {
        out[i] = Math.round(0.299 * rgba[s] + 0.587 * rgba[s + 1] + 0.114 * rgba[s + 2]);
      }
      return out;
    }
    if (encoding == ENCODING.RGB) {
      const out = new Uint8Array(count * 3);
      for (let i = 0, s = 0, d = 0; i < count; i++, s += 4) {
        out[d++] = rgba[s];
        out[d++] = rgba[s + 1];
        out[d++] = rgba[s + 2];
      }
      return out;
    }
    if (encoding == ENCODING.BGRA) {
      const out = new Uint8Array(count * 4);
      for (let i = 0, s = 0; i < count; i++, s += 4) {
        out[s] = rgba[s + 2];
        out[s + 1] = rgba[s + 1];
        out[s + 2] = rgba[s];
        out[s + 3] = rgba[s + 3];
      }
      return out;
    }
    return new Uint8Array(rgba.subarray(0, count * 4));
  }

}


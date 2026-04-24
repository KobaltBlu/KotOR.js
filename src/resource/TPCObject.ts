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

const TPCHeaderLength = 128;
export type WriteTPCFormat = 'tpc' | 'tga' | 'dds' | 'bmp';

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

    this.file = options.file ?? new Uint8Array(TPCHeaderLength);
    this.filename = options.filename ?? '';
    this.pack = options.pack ?? 0;
    this.header = this.readHeader();
    this.txi = new TXI( this.getTXIData() );

  }

  getTXIData(): string {

    try{
      const _txiOffset = this.getDataLength() + TPCHeaderLength;
      const _txiDataLength = this.file.length - _txiOffset;

      if (_txiDataLength > 0){
        const txiReader = new BinaryReader(this.file.slice(_txiOffset, _txiOffset + _txiDataLength ));
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

  getDDS( compressMipMaps: boolean = true ) {

  	const dds = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1, isCubemap: false } as any;

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
      dds.mipmapCount = this.generateMipMapCount(dds.width, dds.height);
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
            const n = 4 * width * height;
            let s = 0, d = 0;
            while (d < n) {
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = rawBuffer[s++];
              byteArray[d++] = 255;
            }
          }else{
            byteArray = rawBuffer;
          }
  			} else {
          if(this.header.encoding == ENCODING.RGB){
            dataLength = Math.max(this.header.minDataSize, width * height * 0.5);
            dataLength = Math.max(this.header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * this.header.minDataSize);
          }else if(this.header.encoding == ENCODING.RGBA){
            dataLength = Math.max(this.header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * this.header.minDataSize);
          }
          byteArray = this.file.slice(dataOffset, dataOffset + dataLength);
          if(!compressMipMaps){
            byteArray = dxtJs.decompress(byteArray, width, height, this.header.encoding == ENCODING.RGB ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5 );
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
        //console.log('TPCObject: Rebuilding Frames', this.filename);
        const encoding = (this.header.encoding == ENCODING.RGB) ? dxtJs.flags.DXT1 : dxtJs.flags.DXT5;
        const mipmaps = [];

        dds.width = this.header.width;
        dds.height = this.header.height;

        let imageWidth = this.header.width;
        let imageHeight = this.header.height;
        let frameWidth = (imageWidth / this.txi.numx);
        let frameHeight = (imageHeight / this.txi.numy);
        const frameCount = (this.txi.numx * this.txi.numy);

        for(let m = 0; m < dds.mipmapCount; m++){
          const frames = [];

          //Create an OffsreenCanvas so we can stitch the frames back together
          this.canvas[m] = new OffscreenCanvas(imageWidth, imageHeight);
          const ctx = this.canvas[m].getContext('2d');

          //Get the proper frames from the old mipmaps list
          for(let i = 0; i < frameCount; i++){
            const mipmap = dds.mipmaps[m + (i * dds.mipmapCount)];
            //console.log(m + (i * dds.mipmapCount), mipmap);
            const uint8 = Uint8ClampedArray.from(
              compressMipMaps ? dxtJs.decompress(mipmap.data, frameWidth, frameHeight, encoding) : mipmap.data
              // (window as any).dxt.decompress(mipmap.data, frameWidth, frameHeight, encoding)
            );
            //console.log(uint8, frameWidth, frameHeight);
            frames.push(
              new ImageData(uint8, frameWidth, frameHeight)
            );
          }

          //Merge the frames onto the canvas
          for(let y = 0; y < this.txi.numy; y++){
            const frameY = (y * this.txi.numx);
            for(let x = 0; x < this.txi.numx; x++){
              //console.log(frameY + x, x * frameWidth2, y * frameHeight2);
              ctx.putImageData(frames[frameY + x], x * frameWidth, y * frameHeight);
            }
          }
          //console.log(imageWidth, imageHeight, frameWidth, frameHeight);
          //Extract the merged image
          const mergedImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);

          //Compress it with the proper DXT encoding
          const mipmap_data = compressMipMaps ? dxtJs.compress(mergedImageData.data, imageWidth, imageHeight, encoding) : mergedImageData.data;

          //Add it the the new mipmaps list
          mipmaps.push({
            data: mipmap_data,
            width: imageWidth,
            height: imageHeight
          });

          //Resize Next Frame
          frameWidth = Math.max( frameWidth >> 1, 1 );
          frameHeight = Math.max( frameHeight >> 1, 1 );
          //Resize Next Image
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

    const multiplier = (this.header.encoding == ENCODING.RGB) ? 0.5 : 1;

    while(running){
      const mipMapSize = Math.max((nWidth * nHeight) * multiplier, this.header.minDataSize);
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

  readHeader(): ITPCHeader {

    // Parse header
    const Header: ITPCHeader = {} as ITPCHeader;
    const Reader = new BinaryReader(this.file.slice(0, TPCHeaderLength));
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
          Header.minDataSize = 1;
          Header.dataSize = Header.width * Header.height;
        break;
        case ENCODING.RGB:
          Header.hasAlpha = false;
          Header.format = PixelFormat.R8G8B8;
          Header.minDataSize = 3;
          Header.dataSize = Header.width * Header.height * 3;
        break;
        case ENCODING.RGBA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.R8G8B8A8;
          Header.minDataSize = 4;
          Header.dataSize = Header.width * Header.height * 4;
        break;
        case ENCODING.BGRA:
          Header.hasAlpha = true;
          Header.format = PixelFormat.B8G8R8A8;
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
          Header.minDataSize = 8;
        break;
        case ENCODING.RGBA:
          // S3TC DXT5
          Header.compressed = true;
          Header.hasAlpha = true;
          Header.format = PixelFormat.DXT5;
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
    const stride = this.header.width * 4;

    if(pixelData == null)
      throw 'Missing pixelData'

    const unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }

    return pixelData;

  }

  //Convert the TPC into a THREE.CompressedTexture for use in the engine
  toCompressedTexture(){
    const images = [];
    const texDatas = this.getDDS( true );
    const _texture: OdysseyCompressedTexture|THREE.CanvasTexture = new OdysseyCompressedTexture( texDatas.mipmaps, texDatas.width, texDatas.height );

    // if(this.canvas.length){
    //   _texture = new THREE.CanvasTexture(this.canvas[0] as any);
    // }else{
      if ( texDatas.isCubemap ) {
        const faces = texDatas.mipmaps.length / texDatas.mipmapCount;
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
        (_texture as { image: { width: number; height: number } }).image = images as unknown as { width: number; height: number };
        (_texture as { image: { width: number; height: number } }).image.width = texDatas.width;
        (_texture as { image: { width: number; height: number } }).image.height = texDatas.height;
      } else {
        const img = (_texture as { image: { width: number; height: number } }).image;
        img.width = texDatas.width;
        img.height = texDatas.height;
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
      const cloned = new this.constructor().copy( this );
      cloned.format = this.format;
      cloned.needsUpdate = true;
      cloned.bumpMapType = this.bumpMapType;
      cloned.header = this.header;
      cloned.txi = this.txi;
      return this;
    };

    return _texture;
  }

  toBuffer(): Uint8Array {
    const dataLength = this.getDataLength();
    const writer = new BinaryWriter();
    writer.writeUInt32(this.header.compressed ? this.header.dataSize : 0);
    writer.writeSingle(this.header.alphaTest ?? 1);
    writer.writeUInt16(this.header.width);
    writer.writeUInt16(this.header.height);
    writer.writeByte(this.header.encoding);
    writer.writeByte(this.header.mipMapCount);
    while (writer.position < TPCHeaderLength) {
      writer.writeByte(0);
    }
    const data = this.file.slice(TPCHeaderLength, TPCHeaderLength + dataLength);
    writer.writeBytes(data.length ? data : new Uint8Array(dataLength));
    const txiBytes = this.txi.toBuffer();
    if (txiBytes.length) {
      writer.writeBytes(txiBytes);
    }
    writer.writeByte(0);
    return writer.buffer;
  }

  toTGABuffer(): Uint8Array {
    const width = this.header.width;
    const height = this.header.height;
    const rawPixelData = this.file.slice(TPCHeaderLength, TPCHeaderLength + width * height * 4);
    const pixelData = new Uint8Array(width * height * 4);
    pixelData.set(rawPixelData.slice(0, pixelData.length));
    const out = new Uint8Array(18 + pixelData.length);
    const view = new DataView(out.buffer);
    out[2] = 2;
    view.setUint16(3, 0, true);
    view.setUint16(5, 0, true);
    out[7] = 0;
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, width, true);
    view.setUint16(14, height, true);
    out[16] = 32;
    out[17] = 0x28;
    out.set(pixelData, 18);
    return out;
  }

  toDDSBuffer(): Uint8Array {
    const width = this.header.width;
    const height = this.header.height;
    const payload = this.file.slice(TPCHeaderLength, TPCHeaderLength + this.getDataLength());
    const writer = new BinaryWriter();
    writer.writeUInt32(0x20534444);
    writer.writeUInt32(124);
    writer.writeUInt32(0x00021007);
    writer.writeUInt32(height);
    writer.writeUInt32(width);
    writer.writeUInt32(payload.length || Math.max(16, width * height * 4));
    writer.writeUInt32(0);
    writer.writeUInt32(this.header.mipMapCount);
    for (let i = 0; i < 11; i++) writer.writeUInt32(0);
    writer.writeUInt32(32);
    writer.writeUInt32(0x00000004);
    writer.writeUInt32(this.header.compressed ? (this.header.encoding === ENCODING.RGB ? 0x31545844 : 0x35545844) : 0);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt32(0x00001000);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeUInt32(0);
    writer.writeBytes(payload.length ? payload : new Uint8Array(Math.max(16, width * height * 4)));
    return writer.buffer;
  }

  toBMPBuffer(): Uint8Array {
    const width = this.header.width;
    const height = this.header.height;
    const rowSize = ((width * 3 + 3) >> 2) << 2;
    const pixelBytes = rowSize * height;
    const totalSize = 54 + pixelBytes;
    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);
    out[0] = 0x42;
    out[1] = 0x4d;
    view.setUint32(2, totalSize, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setUint32(18, width, true);
    view.setUint32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    const rgba = this.file.slice(TPCHeaderLength, TPCHeaderLength + width * height * 4);
    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        out[offset++] = rgba[src + 2] ?? 0;
        out[offset++] = rgba[src + 1] ?? 0;
        out[offset++] = rgba[src] ?? 0;
      }
      while ((offset - 54) % rowSize !== 0) {
        out[offset++] = 0;
      }
    }
    return out;
  }

  static fromBuffer(buffer: Uint8Array, filename = '', pack = 0): TPCObject {
    return readTPCFromBuffer(buffer, filename, pack);
  }

}

function makeTPCBuffer(width: number, height: number, encoding: ENCODING, data: Uint8Array, compressed = false, mipMapCount = 1, compressedDataSize?: number): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeUInt32(compressed ? ((compressedDataSize && compressedDataSize > 0) ? compressedDataSize : data.length) : 0);
  writer.writeSingle(1.0);
  writer.writeUInt16(width);
  writer.writeUInt16(height);
  writer.writeByte(encoding);
  writer.writeByte(mipMapCount);
  while (writer.position < TPCHeaderLength) {
    writer.writeByte(0);
  }
  writer.writeBytes(data);
  writer.writeByte(0);
  return writer.buffer;
}

function parseTGA(buffer: Uint8Array): { width: number; height: number; data: Uint8Array } {
  if (buffer.length < 18) {
    throw new Error('Invalid TGA buffer');
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const imageType = view.getUint8(2);
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const bitsPerPixel = view.getUint8(16);
  if (imageType !== 2 || width <= 0 || height <= 0 || (bitsPerPixel !== 24 && bitsPerPixel !== 32)) {
    throw new Error('Unsupported TGA format');
  }
  const pixelSize = bitsPerPixel / 8;
  const data = new Uint8Array(width * height * 4);
  let source = 18;
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 2] = buffer[source++] ?? 0;
    data[i * 4 + 1] = buffer[source++] ?? 0;
    data[i * 4] = buffer[source++] ?? 0;
    data[i * 4 + 3] = pixelSize === 4 ? (buffer[source++] ?? 255) : 255;
  }
  return { width, height, data };
}

function parseBMP(buffer: Uint8Array): { width: number; height: number; data: Uint8Array } {
  if (buffer.length < 54 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
    throw new Error('Invalid BMP buffer');
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const offset = view.getUint32(10, true);
  const width = view.getUint32(18, true);
  const height = view.getUint32(22, true);
  const bitsPerPixel = view.getUint16(28, true);
  if (bitsPerPixel !== 24) {
    throw new Error('Unsupported BMP format');
  }
  const rowSize = ((width * 3 + 3) >> 2) << 2;
  const data = new Uint8Array(width * height * 4);
  let source = offset;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * 4;
      data[dest + 2] = buffer[source++] ?? 0;
      data[dest + 1] = buffer[source++] ?? 0;
      data[dest] = buffer[source++] ?? 0;
      data[dest + 3] = 255;
    }
    while ((source - offset) % rowSize !== 0) {
      source++;
    }
  }
  return { width, height, data };
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

function isLikelyBioWareDDS(buffer: Uint8Array): boolean {
  if (buffer.length < 20) {
    return false;
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const bpp = view.getUint32(8, true);
  const dataSize = view.getUint32(12, true);
  const reserved = view.getUint32(16, true);
  return width > 0 && height > 0 && (bpp === 3 || bpp === 4) && dataSize > 0 && reserved === 0;
}

function parseDDS(buffer: Uint8Array): { width: number; height: number; encoding: ENCODING; data: Uint8Array; compressed: boolean; mipMapCount: number; topLevelDataSize?: number } {
  if (buffer.length >= 4 && buffer[0] === 0x44 && buffer[1] === 0x44 && buffer[2] === 0x53 && buffer[3] === 0x20) {
    if (buffer.length < 128) {
      throw new Error('Invalid DDS buffer');
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const width = view.getUint32(16, true);
    const height = view.getUint32(12, true);
    const mipMapCount = Math.max(1, view.getUint32(28, true));
    const topLevelDataSize = view.getUint32(20, true);
    const pixelFormatFlags = view.getUint32(80, true);
    const fourCC = view.getUint32(84, true);
    const bitCount = view.getUint32(88, true);
    const redMask = view.getUint32(92, true);
    const greenMask = view.getUint32(96, true);
    const blueMask = view.getUint32(100, true);
    const alphaMask = view.getUint32(104, true);
    const payload = buffer.slice(128);

    if (fourCC === 0x31545844) {
      return { width, height, encoding: ENCODING.RGB, data: payload, compressed: true, mipMapCount, topLevelDataSize };
    }

    if (fourCC === 0x35545844) {
      return { width, height, encoding: ENCODING.RGBA, data: payload, compressed: true, mipMapCount, topLevelDataSize };
    }

    const isRGB = (pixelFormatFlags & 0x40) !== 0;
    const hasAlpha = (pixelFormatFlags & 0x1) !== 0;
    if (isRGB && bitCount === 32 && redMask === 0x00FF0000 && greenMask === 0x0000FF00 && blueMask === 0x000000FF && alphaMask === 0xFF000000) {
      return { width, height, encoding: ENCODING.BGRA, data: payload, compressed: false, mipMapCount };
    }

    if (isRGB && !hasAlpha && bitCount === 24 && redMask === 0x00FF0000 && greenMask === 0x0000FF00 && blueMask === 0x000000FF) {
      const rgb = new Uint8Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        const src = i * 3;
        const dest = i * 3;
        rgb[dest] = payload[src + 2] ?? 0;
        rgb[dest + 1] = payload[src + 1] ?? 0;
        rgb[dest + 2] = payload[src] ?? 0;
      }
      return { width, height, encoding: ENCODING.RGB, data: rgb, compressed: false, mipMapCount };
    }

    throw new Error('Unsupported DDS format');
  }

  if (!isLikelyBioWareDDS(buffer)) {
    throw new Error('Invalid DDS buffer');
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const bpp = view.getUint32(8, true);
  const topLevelDataSize = view.getUint32(12, true);

  if (!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
    throw new Error('BioWare DDS requires power-of-two dimensions');
  }

  const encoding = bpp === 3 ? ENCODING.RGB : ENCODING.RGBA;
  const minDataSize = encoding === ENCODING.RGB ? 8 : 16;
  let mipWidth = width;
  let mipHeight = height;
  let offset = 20;
  let mipMapCount = 0;

  while (offset < buffer.length) {
    const mipLength = Math.max(
      minDataSize,
      Math.floor((mipWidth + 3) / 4) * Math.floor((mipHeight + 3) / 4) * minDataSize,
    );

    if (offset + mipLength > buffer.length) {
      throw new Error('Invalid BioWare DDS buffer');
    }

    offset += mipLength;
    mipMapCount += 1;
    if (mipWidth === 1 && mipHeight === 1) {
      break;
    }
    mipWidth = Math.max(mipWidth >> 1, 1);
    mipHeight = Math.max(mipHeight >> 1, 1);
  }

  return {
    width,
    height,
    encoding,
    data: buffer.slice(20, offset),
    compressed: true,
    mipMapCount,
    topLevelDataSize,
  };
}

export function isTPCBuffer(buffer: Uint8Array): boolean {
  if (!buffer || buffer.length < TPCHeaderLength) {
    return false;
  }
  try {
    const probe = new TPCObject({ file: buffer, filename: '', pack: 0 });
    return probe.header.width > 0 && probe.header.height > 0 && [ENCODING.GRAY, ENCODING.RGB, ENCODING.RGBA, ENCODING.BGRA].includes(probe.header.encoding);
  } catch {
    return false;
  }
}

export function detectTPCFormat(buffer: Uint8Array): 'tpc' | 'dds' | 'bmp' | 'tga' {
  if (buffer.length >= 4 && buffer[0] === 0x44 && buffer[1] === 0x44 && buffer[2] === 0x53 && buffer[3] === 0x20) {
    return 'dds';
  }
  if (isLikelyBioWareDDS(buffer)) {
    return 'dds';
  }
  if (isTPCBuffer(buffer)) {
    return 'tpc';
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp';
  }
  return 'tga';
}

export function readTPCFromBuffer(buffer: Uint8Array, filename = '', pack = 0): TPCObject {
  const format = detectTPCFormat(buffer);
  if (format === 'tpc') {
    return new TPCObject({ file: buffer, filename, pack });
  }
  if (format === 'dds') {
    const parsed = parseDDS(buffer);
    return new TPCObject({ file: makeTPCBuffer(parsed.width, parsed.height, parsed.encoding, parsed.data, parsed.compressed, parsed.mipMapCount, parsed.topLevelDataSize), filename, pack });
  }
  if (format === 'bmp') {
    const parsed = parseBMP(buffer);
    return new TPCObject({ file: makeTPCBuffer(parsed.width, parsed.height, ENCODING.RGBA, parsed.data, false), filename, pack });
  }
  const parsed = parseTGA(buffer);
  return new TPCObject({ file: makeTPCBuffer(parsed.width, parsed.height, ENCODING.RGBA, parsed.data, false), filename, pack });
}

export function writeTPCToBuffer(tpc: TPCObject, format: WriteTPCFormat = 'tpc'): Uint8Array {
  if (format === 'tga') {
    return tpc.toTGABuffer();
  }
  if (format === 'dds') {
    return tpc.toDDSBuffer();
  }
  if (format === 'bmp') {
    return tpc.toBMPBuffer();
  }
  return tpc.toBuffer();
}


import * as THREE from 'three';
import { BinaryReader } from "../utility/binary/BinaryReader";
import { TXI } from './TXI';
// @ts-ignore
import * as dxtJs from "dxt-js";
import { PixelFormat } from '../enums/graphics/tpc/PixelFormat';
import { ENCODING } from '../enums/graphics/tpc/Encoding';
import { OdysseyCompressedTexture } from '../three/odyssey/OdysseyCompressedTexture';
import { ITPCHeader } from '../interface/resource/ITPCHeader';
import { ITPCObjectOptions } from '../interface/resource/ITPCObjectOptions';

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
            let n = 4 * width * height;
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
          let frames = [];

          //Create an OffsreenCanvas so we can stitch the frames back together
          this.canvas[m] = new OffscreenCanvas(imageWidth, imageHeight);
          let ctx = this.canvas[m].getContext('2d');

          //Get the proper frames from the old mipmaps list
          for(let i = 0; i < frameCount; i++){
            let mipmap = dds.mipmaps[m + (i * dds.mipmapCount)];
            //console.log(m + (i * dds.mipmapCount), mipmap);
            let uint8 = Uint8ClampedArray.from( 
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
            let frameY = (y * this.txi.numx);
            for(let x = 0; x < this.txi.numx; x++){
              //console.log(frameY + x, x * frameWidth2, y * frameHeight2);
              ctx.putImageData(frames[frameY + x], x * frameWidth, y * frameHeight);
            }
          }
          //console.log(imageWidth, imageHeight, frameWidth, frameHeight);
          //Extract the merged image
          let mergedImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);

          //Compress it with the proper DXT encoding
          let mipmap_data = compressMipMaps ? dxtJs.compress(mergedImageData.data, imageWidth, imageHeight, encoding) : mergedImageData.data;

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

}


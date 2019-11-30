/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TPCObject class.
 */

const PixelFormat = {
  R8G8B8 : 1,
  B8G8R8 : 2,
  R8G8B8A8 : 3,
  B8G8R8A8 : 4,
  A1R5G5B5 : 5,
  R5G6B5 : 6,
  Depth16 : 7,
  DXT1 : 8,
  DXT3 : 9,
  DXT5 : 10
};

const ENCODING = {
  GRAY: 1,
  RGB: 2,
  RGBA: 4,
  BGRA: 12
}

const TPCHeaderLength = 128;

class TPCObject {

  constructor ( args = {} ) {

    args = Object.assign({
      file: null,
      filename: null
    }, args);

    this.file = args.file;
    this.filename = args.filename;
    this.header = this.readHeader();
    this.txi = null;

  }

  getTXIData() {

    try{
      let _txiOffset = this.getDataLength() + TPCHeaderLength;
      let _txiDataLength = this.file.length - _txiOffset;

      if (_txiDataLength > 0){
        let txiReader = new BinaryReader(Buffer.from( this.file.buffer, _txiOffset, _txiDataLength ));
        let txiData = '';
        let ch;
        
        while ((ch = txiReader.ReadChar() || '\0').charCodeAt() != 0)
          txiData = txiData + ch;

        this.txi = txiData;

        return this.txi;
      }else{
        return this.txi = '';
      }
    }catch(e){
      console.error('getTXIData', e);
      return this.txi = '';
    }

  }

  getPixelData( onLoad = null ) {

    // Parse header
    if(this.header === null)
      this.header = this.readHeader();

    let worker = new Worker('worker/worker-tex.js');

    worker.addEventListener('message', function(e) {
      //console.log('TPCObject', 'Worker said: ', e.data);
      if(onLoad != null)
        onLoad(new Uint8Array(e.data));
    }, false);

    worker.postMessage({
      Header: this.header,
      buffer: this.file,
      PixelFormat: PixelFormat
    }, [this.file.buffer]);

    this.txi = this.getTXIData();

  }

  getDDS( loadMipmaps ) {

  	let dds = { mipmaps: [], width: 0, height: 0, format: null, mipmapCount: 1 };

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
    			dds.format = THREE.RGBFormat;
        break;
        case ENCODING.RGBA:
          dds.format = THREE.RGBAFormat;
        break;
        case ENCODING.BGRA:
          dds.format = THREE.RGBAFormat;
        break;
      }
    }else{
      switch(this.header.encoding){
        case ENCODING.RGB:
          // S3TC DXT1
          dds.format = THREE.RGB_S3TC_DXT1_Format;
        break;
        case ENCODING.RGBA:
          // S3TC DXT5
          dds.format = THREE.RGBA_S3TC_DXT5_Format;
        break;
      }
    }

  	dds.mipmapCount = this.header.mipMapCount;
  	dds.isCubemap = this.header.isCubemap;
  	dds.width = this.header.width;
  	dds.height = this.header.height;

  	let dataOffset = TPCHeaderLength;

  	for ( let face = 0; face < this.header.faces; face++ ) {

  		let width = dds.width;
  		let height = dds.height;
      let dataSize = this.header.dataSize;
      let dataLength = 0;
      let byteArray = Buffer.alloc(0);

  		for ( let i = 0; i < dds.mipmapCount; i++ ) {

  			if ( !this.header.compressed ) {
  				dataLength = width * height * this.header.minDataSize;
          byteArray = Buffer.from( this.file.buffer, dataOffset, dataLength );
  			} else {
  				dataLength = dataSize;
  				byteArray = Buffer.from( this.file.buffer, dataOffset, dataLength );
  			}

  			dds.mipmaps.push( { "data": byteArray, "width": width, "height": height } );

  			dataOffset += dataLength;

  			width = Math.max( width >> 1, 1 );
  			height = Math.max( height >> 1, 1 );
        dataSize = Math.max( dataSize >> 2, this.header.minDataSize );

  		}

  	}

  	return dds;

  }

  readHeader() {

    // Parse header
    let Header = {};
    let Reader = new BinaryReader(Buffer.from(this.file, 0, TPCHeaderLength ));
    Reader.Seek(0);
    Header.dataSize = Reader.ReadUInt32();
    Header.alphaTest = Reader.ReadSingle();

    // Image dimensions
    Header.width = Reader.ReadUInt16();
    Header.height = Reader.ReadUInt16();

    // How's the pixel data encoded?
    Header.encoding = Reader.ReadByte();

    // Number of mip maps in the image
    Header.mipMapCount = Math.max( 1, Reader.ReadByte() );

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

  FlipY(pixelData = null){
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
    let texture = new THREE.CompressedTexture();
    texture.txi = null;

    texture.clone = function () {

      let cloned = new this.constructor().copy( this );
      cloned.format = this.format;
      cloned.needsUpdate = true;
      cloned.bumpMapType = this.bumpMapType;
      cloned.header = this.header;
      cloned.txi = this.txi;
      return cloned;
    
    }

    let texDatas = this.getDDS( true );

    //console.log('TPCLoader', this.filename, texDatas);

    texture.name = this.filename;
    if ( texDatas.isCubemap ) {
      let faces = texDatas.mipmaps.length / texDatas.mipmapCount;
      for ( let f = 0; f < faces; f ++ ) {
        images[ f ] = { mipmaps : [] };
        for ( let i = 0; i < texDatas.mipmapCount; i++ ) {
          images[ f ].mipmaps.push( texDatas.mipmaps[ f * texDatas.mipmapCount + i ] );
          images[ f ].format = THREE.CubeReflectionMapping;//texDatas.format;
          images[ f ].width = texDatas.width;
          images[ f ].height = texDatas.height;

          texture.mipmaps = images[ f ].mipmaps;
        }
      }
      texture.image = images;
      texture.image.width = texDatas.width;
      texture.image.height = texDatas.height;
    } else {
      texture.image.width = texDatas.width;
      texture.image.height = texDatas.height;
      texture.mipmaps = texDatas.mipmaps;
    }

    if ( texDatas.mipmapCount === 1 ) {
      texture.minFilter = THREE.LinearFilter;
    }

    texture.format = texDatas.format;
    texture.needsUpdate = true;
    texture.bumpMapType = 'NORMAL';

    texture.txi = new TXI( this.getTXIData() );
    texture.header = this.header;
    return texture;
  }

}

module.exports = TPCObject;

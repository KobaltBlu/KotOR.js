/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TGAObject class.
 */

class TGAObject {

  constructor ( args = {} ) {

    args = Object.assign({
      file: null,
      filename: null
    }, args);

    console.log('TGAObject', args);

    this.file = args.file;
    this.filename = args.filename;

    this.header = this.readHeader();
    this.pixelData = Buffer.alloc(0);
    this.txi = null;

  }

  readHeader(){

    if(this.file instanceof Buffer){
      let reader = new BinaryReader(this.file);

      let Header = {};

      Header.ID = reader.ReadByte();
      Header.ColorMapType = reader.ReadByte();
      Header.FileType = reader.ReadByte();

      //Simple color map detection (May not be adequate)
      Header.hasColorMap = Header.ColorMapType === 0 ? false : true;
      Header.ColorMapIndex = reader.ReadByte();

      if(Header.hasColorMap){

      }

      Header.offsetX = reader.ReadUInt32();
      Header.offsetY = reader.ReadUInt32();
      Header.width = reader.ReadUInt16();
      Header.height = reader.ReadUInt16();

      Header.bitsPerPixel = reader.ReadByte();
      Header.imageDescriptor = reader.ReadByte();

      Header.pixelDataOffset = reader.position;

      return Header;
    }

    return {
      ID: 0,
      ColorMapType: 0,
      FileType: 2,
      ColorMapIndex: 0,
      offsetX: 0,
      offsetY: 0,
      width: 1,
      height: 1,
      bitsPerPixel: 32,
      imageDescriptor: 0
    };

  }

  getPixelData( onLoad = null ){

    let reader = new BinaryReader(this.file);
    console.log('TGAObject', this.header)
  	reader.Seek(this.header.pixelDataOffset);

    //32bpp RGBA
    if(this.header.bitsPerPixel == 32){
      if(onLoad != null)
        onLoad( reader.ReadBytes( this.header.width * this.header.height * 4 ) );
    }

    //24bpp RGB
    if(this.header.bitsPerPixel == 24){
      if(onLoad != null)
        onLoad( reader.ReadBytes( this.header.width * this.header.height * 3 ) );
    }

    //8bpp Gray
    if(this.header.bitsPerPixel == 8){
      if(onLoad != null)
        onLoad( reader.ReadBytes( this.header.width * this.header.height ) );
    }

  }

  export( file = '' ){
    return new Promise( (resolve, reject) => {
      let writer = new BinaryWriter();

      writer.WriteByte(this.header.ID);
      writer.WriteByte(this.header.ColorMapType);
      writer.WriteByte(this.header.FileType);
      writer.WriteByte(this.header.ColorMapIndex);
      writer.WriteUInt32(this.header.offsetX);
      writer.WriteUInt32(this.header.offsetY);
      writer.WriteUInt16(this.header.width);
      writer.WriteUInt16(this.header.height);
      writer.WriteByte(this.header.bitsPerPixel);
      writer.WriteByte(this.header.imageDescriptor);
  
      try{
        writer.WriteBytes(this.pixelData);
      }catch(e){
        reject(e);
      }
  
      fs.writeFile(file, writer.buffer, (err) => {
        if(err){
          reject(err);
        }else{
          resolve(true);
        }
      });
    });
  }

  static FlipY(pixelData = null, width = 1, height = 1){
    let offset = 0;
    let stride = width * 4;

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }
  }

  static FromCanvas( canvas ){

    if(canvas instanceof HTMLCanvasElement || canvas instanceof OffscreenCanvas){

      let tga = new TGAObject();
      let ctx = canvas.getContext('2d');

      tga.header.width = canvas.width;
      tga.header.height = canvas.height;
      tga.header.bitsPerPixel = 32;
      let data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      tga.pixelData = new Uint8Array(data.length);

      let rowByteLength = data.length / tga.header.height;
      for(let i = 0; i < tga.header.height; i++){
        let offset = rowByteLength * i;
        for(let j = 0, k = rowByteLength; j < rowByteLength; j += 4, k -= 4){
          tga.pixelData[offset + j]     = data[offset + (k - 2)]; // red
          tga.pixelData[offset + j + 1] = data[offset + (k - 3)]; // green
          tga.pixelData[offset + j + 2] = data[offset + (k - 4)]; // blue
          tga.pixelData[offset + j + 3] = data[offset + (k - 1)]; // alpha
        }
      }

      TGAObject.FlipY(tga.pixelData, tga.width, tga.height);

      return tga;

    }

    return undefined;

  }

}

TGAObject.Type = {
	NO_DATA:      0,
	INDEXED:      1,
	RGB:          2,
	GREY:         3,
	RLE_INDEXED:  9,
	RLE_RGB:     10,
	RLE_GREY:    11
};

TGAObject.Origin = {
	BOTTOM_LEFT:  0x00,
	BOTTOM_RIGHT: 0x01,
	TOP_LEFT:     0x02,
	TOP_RIGHT:    0x03,
	SHIFT:        0x04,
	MASK:         0x30
};

module.exports = TGAObject;

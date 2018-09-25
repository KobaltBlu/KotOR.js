/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TGAObject class.
 */

class TGAObject {

  constructor ( args = {} ) {

    args = $.extend({
      file: null,
      filename: null
    }, args);

    console.log('TGAObject', args);

    this.file = args.file;
    this.filename = args.filename;

    this.header = this.readHeader();
    this.txi = null;

  }

  readHeader(){

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

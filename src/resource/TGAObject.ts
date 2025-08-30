import { BinaryReader } from "../utility/binary/BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import { ITGAObjectOptions } from "../interface/graphics/tga/ITGAObjectOptions";
import { ITGAHeader } from "../interface/graphics/tga/ITGAHeader";
import { GameFileSystem } from "../utility/GameFileSystem";

/**
 * TGAObject class.
 * 
 * Class representing a TGA texture file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TGAObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TGAObject {

  file: Uint8Array;
  header: ITGAHeader;
  pixelData: Uint8Array;
  txi: any;
  filename: string;

  constructor ( args: ITGAObjectOptions = {} as ITGAObjectOptions ) {

    const _default: ITGAObjectOptions = {
      file: new Uint8Array(0),
      filename: '',
    } as ITGAObjectOptions;

    const options = {..._default, ...args};

    console.log('TGAObject', args);

    if(typeof options.file === 'string'){
      this.file = new Uint8Array(0);
    }else if(options.file instanceof Uint8Array){
      this.file = options.file;
    }

    this.filename = options.filename;

    this.header = this.readHeader();
    this.pixelData = new Uint8Array(0);

  }

  readHeader(): ITGAHeader {
    const Header = {
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
    } as ITGAHeader;

    if(this.file instanceof Uint8Array && !!this.file.length){
      let reader = new BinaryReader(this.file);

      Header.ID = reader.readByte();
      Header.ColorMapType = reader.readByte();
      Header.FileType = reader.readByte();

      //Simple color map detection (May not be adequate)
      Header.hasColorMap = Header.ColorMapType === 0 ? false : true;
      Header.ColorMapIndex = reader.readByte();

      if(Header.hasColorMap){

      }

      Header.offsetX = reader.readUInt32();
      Header.offsetY = reader.readUInt32();
      Header.width = reader.readUInt16();
      Header.height = reader.readUInt16();

      Header.bitsPerPixel = reader.readByte();
      Header.imageDescriptor = reader.readByte();

      Header.pixelDataOffset = reader.position;

    }

    return Header

  }

  getPixelData( onLoad?: Function ){

    let reader = new BinaryReader(this.file);
    console.log('TGAObject', this.header)
  	reader.seek(this.header.pixelDataOffset);

    //32bpp RGBA
    if(this.header.bitsPerPixel == 32){
      if(onLoad != null)
        onLoad( reader.readBytes( this.header.width * this.header.height * 4 ) );
    }

    //24bpp RGB
    if(this.header.bitsPerPixel == 24){
      if(onLoad != null)
        onLoad( reader.readBytes( this.header.width * this.header.height * 3 ) );
    }

    //8bpp Gray
    if(this.header.bitsPerPixel == 8){
      if(onLoad != null)
        onLoad( reader.readBytes( this.header.width * this.header.height ) );
    }

  }

  async toExportBuffer(): Promise<Uint8Array> {
    let writer = new BinaryWriter();

    writer.writeByte(this.header.ID);
    writer.writeByte(this.header.ColorMapType);
    writer.writeByte(this.header.FileType);
    writer.writeByte(this.header.ColorMapIndex);
    writer.writeUInt32(this.header.offsetX);
    writer.writeUInt32(this.header.offsetY);
    writer.writeUInt16(this.header.width);
    writer.writeUInt16(this.header.height);
    writer.writeByte(this.header.bitsPerPixel);
    writer.writeByte(this.header.imageDescriptor);

    writer.writeBytes(this.pixelData);

    return writer.buffer;
  }

  async export( resRef = '' ){
    const buffer = await this.toExportBuffer();
    await GameFileSystem.writeFile(resRef, buffer);
    return true;
  }

  static FlipY(pixelData: Uint8Array, width = 1, height = 1){
    let offset = 0;
    let stride = width * 4;

    //if(!pixelData) pixelData = this.pixelData;

    let unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }
  }

  static FromCanvas( canvas: HTMLCanvasElement|OffscreenCanvas ){
    const tga = new TGAObject();
    if(canvas instanceof HTMLCanvasElement || canvas instanceof OffscreenCanvas){

      let ctx: CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D = canvas.getContext('2d') as any;
      if(ctx){
        tga.header.width = canvas.width;
        tga.header.height = canvas.height;
        tga.header.bitsPerPixel = 32;
        tga.header.FileType = 2;
        let data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        tga.pixelData = new Uint8Array(data.length);

        let rowByteLength = data.length / tga.header.height;
        for(let i = 0; i < tga.header.height; i++){
          let offset = rowByteLength * i;
          for(let j = 0, k = rowByteLength; j < rowByteLength; j += 4, k -= 4){
            tga.pixelData[offset + j]     = data[offset + j + 2];//(k - 2)]; // red
            tga.pixelData[offset + j + 1] = data[offset + j + 1];//(k - 3)]; // green
            tga.pixelData[offset + j + 2] = data[offset + j + 0];//(k - 4)]; // blue
            tga.pixelData[offset + j + 3] = data[offset + j + 3];//(k - 1)]; // alpha
          }
        }

        TGAObject.FlipY(tga.pixelData, tga.header.width, tga.header.height);
      }

    }

    return tga;

  }

}

/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { BinaryWriter } from "../BinaryWriter";
import * as fs from 'fs';
import * as THREE from "three";
import { ITGAObjectOptions } from "../interface/graphics/tga/ITGAObjectOptions";
import { TGAHeader } from "../interface/graphics/tga/TGAHeader";

/* @file
 * The TGAObject class.
 */

export class TGAObject {

  file: Buffer;
  header: TGAHeader;
  pixelData: Buffer;
  txi: any;
  filename: string;

  constructor ( args: ITGAObjectOptions = {} as ITGAObjectOptions ) {

    const _default: ITGAObjectOptions = {
      file: Buffer.alloc(0),
      filename: '',
    } as ITGAObjectOptions;

    const options = {..._default, ...args};

    console.log('TGAObject', args);

    if(typeof options.file === 'string'){
      this.file = Buffer.alloc(0);
    }else if(options.file instanceof Buffer){

    }

    this.filename = options.filename;

    this.header = this.readHeader();
    this.pixelData = Buffer.alloc(0);

  }

  readHeader(): TGAHeader {
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
    } as TGAHeader;

    if(this.file instanceof Buffer){
      let reader = new BinaryReader(this.file);

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

    }

    return Header

  }

  getPixelData( onLoad: Function|undefined = undefined ){

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

  static FlipY(pixelData: Buffer, width = 1, height = 1){
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

      let ctx: CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null = canvas.getContext('2d');
      if(ctx){
        tga.header.width = canvas.width;
        tga.header.height = canvas.height;
        tga.header.bitsPerPixel = 32;
        let data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        tga.pixelData = Buffer.allocUnsafe(data.length);

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

        TGAObject.FlipY(tga.pixelData, tga.header.width, tga.header.height);
      }

    }

    return tga;

  }

}

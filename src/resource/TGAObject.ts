/* eslint-disable import/order */
import { ITGAHeader } from "@/interface/graphics/tga/ITGAHeader";
import { ITGAObjectOptions } from "@/interface/graphics/tga/ITGAObjectOptions";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from "@/utility/FormatSerialization";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);
import type { TXI } from "@/resource/TXI";

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
  txi: TXI | null = null;
  filename: string;

  constructor ( args: ITGAObjectOptions = {} as ITGAObjectOptions ) {

    const _default: ITGAObjectOptions = {
      file: new Uint8Array(0),
      filename: '',
    } as ITGAObjectOptions;

    const options = {..._default, ...args};

    log.info('TGAObject', args);

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
      const reader = new BinaryReader(this.file);

      Header.ID = reader.readByte();
      Header.ColorMapType = reader.readByte();
      Header.FileType = reader.readByte();

      //Simple color map detection (May not be adequate)
      Header.hasColorMap = Header.ColorMapType === 0 ? false : true;
      Header.ColorMapIndex = reader.readByte();

      if(Header.hasColorMap){
        // Color map present; layout read from header fields above.
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

  getPixelData( onLoad?: (pixels: Uint8Array) => void ){

    const reader = new BinaryReader(this.file);
    log.info('TGAObject', this.header);
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
    const writer = new BinaryWriter();

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

  toJSON(): { header: ITGAHeader; pixelDataBase64: string; filename: string } {
    const pd = this.pixelData ?? new Uint8Array(0);
    let b64 = '';
    if (pd.length) {
      const buf = (typeof globalThis !== 'undefined' && (globalThis as { Buffer?: { from: (u: Uint8Array) => { toString: (enc: string) => string } } }).Buffer)
        ? Buffer.from(pd).toString('base64')
        : btoa(String.fromCharCode(...pd));
      b64 = buf;
    }
    return { header: { ...this.header }, pixelDataBase64: b64, filename: this.filename ?? '' };
  }

  fromJSON(json: string | ReturnType<TGAObject['toJSON']>): void {
    const obj = typeof json === 'string' ? (JSON.parse(json) as ReturnType<TGAObject['toJSON']>) : json;
    Object.assign(this.header, obj.header ?? {});
    this.filename = obj.filename ?? '';
    if (obj.pixelDataBase64) {
      const raw = (typeof globalThis !== 'undefined' && (globalThis as { Buffer?: unknown }).Buffer)
        ? Buffer.from(obj.pixelDataBase64, 'base64')
        : Uint8Array.from(atob(obj.pixelDataBase64), c => c.charCodeAt(0));
      this.pixelData = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    } else this.pixelData = new Uint8Array(0);
  }

  toXML(): string { return objectToXML(this.toJSON()); }
  fromXML(xml: string): void { this.fromJSON(xmlToObject(xml) as ReturnType<TGAObject['toJSON']>); }
  toYAML(): string { return objectToYAML(this.toJSON()); }
  fromYAML(yaml: string): void { this.fromJSON(yamlToObject(yaml) as ReturnType<TGAObject['toJSON']>); }
  toTOML(): string { return objectToTOML(this.toJSON()); }
  fromTOML(toml: string): void { this.fromJSON(tomlToObject(toml) as ReturnType<TGAObject['toJSON']>); }

  static FlipY(pixelData: Uint8Array, width = 1, _height = 1){
    let offset = 0;
    const stride = width * 4;

    //if(!pixelData) pixelData = this.pixelData;

    const unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }
  }

  static FromCanvas( canvas: HTMLCanvasElement|OffscreenCanvas ){
    const tga = new TGAObject();
    if(canvas instanceof HTMLCanvasElement || canvas instanceof OffscreenCanvas){

      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if(ctx){
        tga.header.width = canvas.width;
        tga.header.height = canvas.height;
        tga.header.bitsPerPixel = 32;
        tga.header.FileType = 2;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        tga.pixelData = new Uint8Array(data.length);

        const rowByteLength = data.length / tga.header.height;
        for(let i = 0; i < tga.header.height; i++){
          const offset = rowByteLength * i;
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

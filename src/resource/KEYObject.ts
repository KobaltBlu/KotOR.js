import * as path from 'path';

import { IBIFEntry } from '@/interface/resource/IBIFEntry';
import { IBIFResource } from '@/interface/resource/IBIFResource';
import { IKEYEntry } from '@/interface/resource/IKEYEntry';
import { BIFManager } from '@/managers/BIFManager';
import { BIFObject } from '@/resource/BIFObject';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from '@/utility/FormatSerialization';
import { GameFileSystem } from '@/utility/GameFileSystem';

/**
 * KEYObject class.
 *
 * Class representing a KEY file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file KEYObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class KEYObject {
  bifs: IBIFEntry[] = [];
  keys: IKEYEntry[] = [];

  file: string = '';
  reader: BinaryReader;
  fileType: string = 'KEY ';
  FileVersion: string = 'V1  ';
  bifCount: number = 0;
  keyCount: number = 0;
  offsetToFileTable: number = 0;
  offsetToKeyTable: number = 0;
  buildYear: number = 0;
  buildDay: number = 0;
  reserved: Uint8Array;

  constructor(){
    this.keys = [];
  }

  loadBuffer(buffer: Uint8Array): void {
    this.reader = new BinaryReader(buffer);

    this.fileType = this.reader.readChars(4);
    this.FileVersion = this.reader.readChars(4);
    if (this.fileType !== 'KEY ' || this.FileVersion !== 'V1  ') {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    this.bifCount = this.reader.readUInt32();
    this.keyCount = this.reader.readUInt32();
    this.offsetToFileTable = this.reader.readUInt32();
    this.offsetToKeyTable = this.reader.readUInt32();
    this.buildYear = this.reader.readUInt32();
    this.buildDay = this.reader.readUInt32();
    this.reserved = this.reader.readBytes(32);

    this.bifs = [];
    this.keys = [];

    this.reader.seek(this.offsetToFileTable);
    for(let i = 0; i < this.bifCount; i++){
      this.bifs[i] = {
        fileSize:this.reader.readUInt32(),
        filenameOffset: this.reader.readUInt32(),
        filenameSize: this.reader.readUInt16(),
        drives: this.reader.readUInt16()
      } as IBIFEntry;
    }

    for(let i = 0; i < this.bifCount; i++){
      this.reader.seek(this.bifs[i].filenameOffset);
      this.bifs[i].filename = this.reader.readChars(this.bifs[i].filenameSize).replace(/\0[\s\S]*$/g,'').toLocaleString().split('\\').join(path.sep);
    }

    this.reader.seek(this.offsetToKeyTable);
    for(let i = 0; i < this.keyCount; i++){
      this.keys[i] = {
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,''),
        resType: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
      } as IKEYEntry;
    }
  }

  async loadFile(file: string){
    const buffer = await GameFileSystem.readFile(file);
    this.loadBuffer(buffer);
  }

  getFileLabel(index = 0){
    for(let i = 0; i < this.keys.length; i++){
      if(index == this.keys[i].resId)
        return this.keys[i].resRef;
    }
    /*try{
      return this.keys[index].ResRef;
    }catch(e) { return null; }*/
    return null;
  }

  getFileKey(ResRef: string, ResType: number){
    for(let i = 0; i < this.keys.length; i++){
      const key = this.keys[i];
      if ( key.resRef == ResRef && key.resType == ResType){
        return key;
      }
    }
    return null;
  }

  getFileKeyByRes(Res: IBIFResource): IKEYEntry {
    for(let i = 0; i < this.keys.length; i++){
      const key = this.keys[i];
      if ( key.resId == Res.Id && key.resType == Res.resType){
        return key;
      }
    }
    return;
  }

  getFilesByResType(ResType: number){
    const bifResults: IBIFResource[][] = [];
    this.bifs.forEach( (bifRes: IBIFEntry, index: number) => {
      if(BIFManager.bifs.has(index)){
        const bif = BIFManager.bifs.get(index);
        if(bif){
          bifResults[index] = bif.resources.filter( (res: IBIFResource) => {
            return res.resType == ResType;
          });
        }
      }
    });
    return bifResults.flat();
  }

  async getFileBuffer(key: IKEYEntry): Promise<Uint8Array>{
    if(!key){ return new Uint8Array(0); }

    const bif: BIFObject = BIFManager.bifs.get(KEYObject.getBIFIndex(key.resId));
    if(!bif){ return new Uint8Array(0); }

    const buffer = await bif.getResourceBuffer(bif.getResourceById(key.resId));
    return buffer;
  }

  static getBIFIndex( ResID: number = 0 ): number{
    return (ResID >> 20);
  }

  static getBIFResourceIndex( ResID: number = 0 ): number{
    return (ResID & 0x3FFF);
  }

  toJSON(): { fileType: string; fileVersion: string; bifCount: number; keyCount: number; bifs: IBIFEntry[]; keys: IKEYEntry[] } {
    return {
      fileType: this.fileType,
      fileVersion: this.FileVersion,
      bifCount: this.bifs.length,
      keyCount: this.keys.length,
      bifs: this.bifs.map((bif) => ({ ...bif })),
      keys: this.keys.map((key) => ({ ...key })),
    };
  }

  fromJSON(json: string | ReturnType<KEYObject['toJSON']>): void {
    const data = typeof json === 'string' ? JSON.parse(json) as ReturnType<KEYObject['toJSON']> : json;
    this.fileType = data.fileType || 'KEY ';
    this.FileVersion = data.fileVersion || 'V1  ';
    this.bifs = (data.bifs || []).map((bif) => ({ ...bif }));
    this.keys = (data.keys || []).map((key) => ({ ...key }));
    this.bifCount = data.bifCount ?? this.bifs.length;
    this.keyCount = data.keyCount ?? this.keys.length;
  }

  toXML(): string { return objectToXML({ json: JSON.stringify(this.toJSON()) }); }
  fromXML(xml: string): void {
    const data = xmlToObject(xml) as { json?: string } | ReturnType<KEYObject['toJSON']>;
    if (typeof (data as { json?: string }).json === 'string') {
      this.fromJSON((data as { json: string }).json);
      return;
    }
    this.fromJSON(data as ReturnType<KEYObject['toJSON']>);
  }
  toYAML(): string { return objectToYAML(this.toJSON()); }
  fromYAML(yaml: string): void { this.fromJSON(yamlToObject(yaml) as ReturnType<KEYObject['toJSON']>); }
  toTOML(): string { return objectToTOML(this.toJSON()); }
  fromTOML(toml: string): void { this.fromJSON(tomlToObject(toml) as ReturnType<KEYObject['toJSON']>); }

}

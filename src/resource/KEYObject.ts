/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as path from 'path';
import { BinaryReader } from '../BinaryReader';
import { BIFObject, BIFResource } from './BIFObject';
import { BIFManager } from '../managers/BIFManager';
import { GameFileSystem } from '../utility/GameFileSystem';

/* @file
 * The KEYObject class.
 */

export interface BIF {
  fileSize: number;
  filenameOffset: number;
  filenameSize: number;
  drives: number;
  filename: string;
}

export interface KEY {
  resRef: string,
  resType: number,
  resId: number,
}

export class KEYObject {
  bifs: BIF[] = [];
  keys: KEY[] = [];

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
  reserved: Buffer;

  constructor(){
    this.keys = [];
  }

  loadFile(file: string, onComplete?: Function){
    
    GameFileSystem.readFile(file).then( (buffer) => {

      this.reader = new BinaryReader(buffer);

      this.fileType = this.reader.readChars(4);
      this.FileVersion = this.reader.readChars(4);
      this.bifCount = this.reader.readUInt32();
      this.keyCount = this.reader.readUInt32();
      this.offsetToFileTable = this.reader.readUInt32();
      this.offsetToKeyTable = this.reader.readUInt32();
      this.buildYear = this.reader.readUInt32();
      this.buildDay = this.reader.readUInt32();
      this.reserved = this.reader.readBytes(32);

      this.bifs = [];

      this.reader.seek(this.offsetToFileTable);
      for(let i = 0; i < this.bifCount; i++){
        this.bifs[i] = {
          fileSize:this.reader.readUInt32(),
          filenameOffset: this.reader.readUInt32(),
          filenameSize: this.reader.readUInt16(),
          drives: this.reader.readUInt16()
        } as BIF;
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
        } as KEY;
      }

      if(typeof onComplete === 'function'){
        onComplete();
      }

    }).catch( (err) => {
      console.error(err);
      if(typeof onComplete === 'function'){
        onComplete();
      }
    })
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
      let key = this.keys[i];
      if ( key.resRef == ResRef && key.resType == ResType){
        return key;
      }
    }
    return null;
  }

  getFileKeyByRes(Res: BIFResource): KEY {
    for(let i = 0; i < this.keys.length; i++){
      let key = this.keys[i];
      if ( key.resId == Res.Id && key.resType == Res.resType){
        return key;
      }
    }
    return;
  }

  getFilesByResType(ResType: number){
    const bifResults: BIFResource[][] = [];
    this.bifs.forEach( (bifRes: BIF, index: number) => {
      if(BIFManager.bifs.has(index)){
        const bif = BIFManager.bifs.get(index);
        if(bif){
          bifResults[index] = bif.resources.filter( (res: BIFResource) => {
            return res.resType == ResType;
          });
        }
      }
    });
    return bifResults.flat();
  }

  async getFileBuffer(key: KEY): Promise<Buffer>{
    if(!key){ return Buffer.allocUnsafe(0); }

    const bif: BIFObject = BIFManager.bifs.get(KEYObject.getBIFIndex(key.resId));
    if(!bif){ return Buffer.allocUnsafe(0); }

    const buffer = await bif.getResourceBuffer(bif.GetResourceById(key.resId));
    return buffer;
  }

  static getBIFIndex( ResID: number = 0 ): number{
    return (ResID >> 20);
  }

  static getBIFResourceIndex( ResID: number = 0 ): number{
    return (ResID & 0x3FFF);
  }

}

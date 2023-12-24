/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from 'fs';
import * as path from 'path';
import { BinaryReader } from '../BinaryReader';
import { BIFObject, BIFResource } from './BIFObject';
import { BIFManager } from '../managers/BIFManager';
import { GameFileSystem } from '../utility/GameFileSystem';

/* @file
 * The KEYObject class.
 */

export interface BIF {
  FileSize: number;
  FilenameOffset: number;
  FilenameSize: number;
  Drives: number;
  filename: string;
}

export interface KEY {
  ResRef: string,
  ResType: number,
  ResID: number,
}

export class KEYObject {
  bifs: BIF[] = [];
  keys: KEY[] = [];

  file: string = '';
  reader: BinaryReader;
  FileType: string = 'KEY ';
  FileVersion: string = 'V1  ';
  BIFCount: number = 0;
  KeyCount: number = 0;
  OffsetToFileTable: number = 0;
  OffsetToKeyTable: number = 0;
  BuildYear: number = 0;
  BuildDay: number = 0;
  Reserved: Buffer;

  constructor(){
    this.keys = [];
  }

  loadFile(file: string, onComplete?: Function){
    
    GameFileSystem.readFile(file).then( (buffer) => {

      this.reader = new BinaryReader(buffer);

      this.FileType = this.reader.readChars(4);
      this.FileVersion = this.reader.readChars(4);
      this.BIFCount = this.reader.readUInt32();
      this.KeyCount = this.reader.readUInt32();
      this.OffsetToFileTable = this.reader.readUInt32();
      this.OffsetToKeyTable = this.reader.readUInt32();
      this.BuildYear = this.reader.readUInt32();
      this.BuildDay = this.reader.readUInt32();
      this.Reserved = this.reader.readBytes(32);

      this.bifs = [];

      this.reader.seek(this.OffsetToFileTable);
      for(let i = 0; i < this.BIFCount; i++){
        this.bifs[i] = {
          FileSize:this.reader.readUInt32(),
          FilenameOffset: this.reader.readUInt32(),
          FilenameSize: this.reader.readUInt16(),
          Drives: this.reader.readUInt16()
        } as BIF;
      }

      for(let i = 0; i < this.BIFCount; i++){
        this.reader.seek(this.bifs[i].FilenameOffset);
        this.bifs[i].filename = this.reader.readChars(this.bifs[i].FilenameSize).replace(/\0[\s\S]*$/g,'').toLocaleString().split('\\').join(path.sep);
      }

      this.reader.seek(this.OffsetToKeyTable);
      for(let i = 0; i < this.KeyCount; i++){
        this.keys[i] = {
          ResRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,''),
          ResType: this.reader.readUInt16(),
          ResID: this.reader.readUInt32(),
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

  GetFileLabel(index = 0){
    for(let i = 0; i < this.keys.length; i++){
      if(index == this.keys[i].ResID)
        return this.keys[i].ResRef;
    }
    /*try{
      return this.keys[index].ResRef;
    }catch(e) { return null; }*/
    return null;
  }

  GetFileKey(ResRef: string, ResType: number){
    for(let i = 0; i < this.keys.length; i++){
      let key = this.keys[i];
      if ( key.ResRef == ResRef && key.ResType == ResType){
        return key;
      }
    }
    return null;
  }

  GetFileKeyByRes(Res: BIFResource): KEY {
    for(let i = 0; i < this.keys.length; i++){
      let key = this.keys[i];
      if ( key.ResID == Res.ID && key.ResType == Res.ResType){
        return key;
      }
    }
    return;
  }

  GetFilesByResType(ResType: number){
    const bifResults: BIFResource[][] = [];
    this.bifs.forEach( (bifRes: BIF, index: number) => {
      if(BIFManager.bifs.has(index)){
        const bif = BIFManager.bifs.get(index);
        if(bif){
          bifResults[index] = bif.resources.filter( (res: BIFResource) => {
            return res.ResType == ResType;
          });
        }
      }
    });
    return bifResults.flat();
  }

  GetFileData(key: KEY, onComplete?: Function, onError?: Function){
    if(key){
      const bif: BIFObject = BIFManager.bifs.get(KEYObject.GetBIFIndex(key.ResID));
      if(bif){
        bif.GetResourceData(bif.GetResourceById(key.ResID), onComplete);
        return true;
      }
    }

    if(typeof onError === 'function')
      onError(undefined);
    
    return false;
  }

  GetFileDataAsync(key: KEY): Promise<Buffer> {
    return new Promise<Buffer>( (resolve, reject) => {
      this.GetFileData(key, resolve, reject);
    });
  }

  static GetBIFIndex( ResID: number = 0 ): number{
    return (ResID >> 20);
  }

  static GetBIFResourceIndex( ResID: number = 0 ): number{
    return (ResID & 0x3FFF);
  }

}

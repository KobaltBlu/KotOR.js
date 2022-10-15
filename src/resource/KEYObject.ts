/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from 'fs';
import * as path from 'path';
import { BinaryReader } from '../BinaryReader';
import { BIFObject, BIFResource } from './BIFObject';
import { BIFManager } from '../managers/BIFManager';

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
  bifs: BIF[];
  keys: KEY[];

  file: string;
  reader: BinaryReader;
  FileType: string;
  FileVersion: string;
  BIFCount: number;
  KeyCount: number;
  OffsetToFileTable: number;
  OffsetToKeyTable: number;
  BuildYear: number;
  BuildDay: number;
  Reserved: Buffer;

  constructor(file: string, onComplete?: Function){
    this.file = file;
    this.keys = [];
    fs.readFile(file, (err, binary) => {

      this.reader = new BinaryReader(binary);

      this.FileType = this.reader.ReadChars(4);
      this.FileVersion = this.reader.ReadChars(4);
      this.BIFCount = this.reader.ReadUInt32();
      this.KeyCount = this.reader.ReadUInt32();
      this.OffsetToFileTable = this.reader.ReadUInt32();
      this.OffsetToKeyTable = this.reader.ReadUInt32();
      this.BuildYear = this.reader.ReadUInt32();
      this.BuildDay = this.reader.ReadUInt32();
      this.Reserved = this.reader.ReadBytes(32);

      this.bifs = [];

      this.reader.Seek(this.OffsetToFileTable);
      for(let i = 0; i!=this.BIFCount; i++){
        this.bifs[i] = {
          FileSize:this.reader.ReadUInt32(),
          FilenameOffset: this.reader.ReadUInt32(),
          FilenameSize: this.reader.ReadUInt16(),
          Drives: this.reader.ReadUInt16()
        } as BIF;
      }

      for(let i = 0; i!=this.BIFCount; i++){
        this.reader.Seek(this.bifs[i].FilenameOffset);
        this.bifs[i].filename = this.reader.ReadChars(this.bifs[i].FilenameSize).replace(/\0[\s\S]*$/g,'').toLocaleString().split('\\').join(path.sep);
      }

      this.reader.Seek(this.OffsetToKeyTable);
      for(let i = 0; i!=this.KeyCount; i++){
        this.keys[i] = {
          ResRef: this.reader.ReadChars(16).replace(/\0[\s\S]*$/g,''),
          ResType: this.reader.ReadUInt16(),
          ResID: this.reader.ReadUInt32(),
        } as KEY;
      }

      if(onComplete != null)
        onComplete();

    });


  }

  GetFileLabel(index = 0){
    for(let i = 0; i!=this.keys.length; i++){
      if(index == this.keys[i].ResID)
        return this.keys[i].ResRef;
    }
    /*try{
      return this.keys[index].ResRef;
    }catch(e) { return null; }*/
    return null;
  }

  GetFileKey(ResRef: string, ResType: number){
    for(let i = 0; i!=this.keys.length; i++){
      let key = this.keys[i];
      if ( key.ResRef == ResRef && key.ResType == ResType){
        return key;
      }
    }
    return null;
  }

  GetFileKeyByRes(Res: BIFResource): KEY{
    for(let i = 0; i!=this.keys.length; i++){
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

  GetFileData(key: KEY, onComplete?: Function){

    // if(key != null){

    //   let bifs = Object.keys(Global.kotorBIF);
    //   let bif = Global.kotorBIF[bifs[key.ResID >> 20]];

    //   if(typeof bif != undefined){
    //     bif.GetResourceData(bif.GetResourceById(key.ResID), onComplete);
    //     return true;
    //   }
      
    //   return false;

    // }
    
    // return false;
  
  }

  GetFileDataSync(key: KEY){
    
    // if(key != null){

    //   let bifs = Object.keys(Global.kotorBIF);
    //   let bif = Global.kotorBIF[bifs[key.ResID >> 20]];

    //   if(typeof bif != undefined){
    //     return bif.GetResourceDataSync(bif.GetResourceById(key.ResID));
    //   }
      
    //   return null;

    // }
    
    // return null;
  
  }

  static GetBIFIndex( ResID: number = 0 ): number{
    return (ResID >> 20);
  }

  static GetBIFResourceIndex( ResID: number = 0 ): number{
    return (ResID & 0x3FFF);
  }

}

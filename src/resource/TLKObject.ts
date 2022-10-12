/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import * as fs from 'fs';
import { TLKString } from "./TLKString";

/* @file
 * The TLKObject class.
 */

export class TLKObject {

  file: Buffer|string;
  reader: BinaryReader;
  TLKStrings: TLKString[];

  onSuccess: Function|undefined;
  onProgress: Function|undefined
  FileType: string;
  FileVersion: string;
  LanguageID: number;
  StringCount: number;
  StringEntriesOffset: number;

  constructor(file: Buffer|string = '', onSuccess: Function|undefined = undefined, onProgress: Function|undefined = undefined){
    this.file = file;
    this.TLKStrings = [];
    console.log('TLKObject', 'Opening TLK');
    if(this.file instanceof Buffer){
      fs.readFile(this.file, (err, binary) => {
        console.log('TLKObject', 'Reading');
        this.reader = new BinaryReader(binary);
        this.reader.Seek(0);
        
        this.FileType = this.reader.ReadChars(4);
        this.FileVersion = this.reader.ReadChars(4);
        this.LanguageID = this.reader.ReadUInt32();
        this.StringCount = this.reader.ReadUInt32();
        this.StringEntriesOffset = this.reader.ReadUInt32();
        this.reader.Seek(20);
        for(let i = 0; i!=this.StringCount; i++) {

          this.TLKStrings[i] = new TLKString(
            this.reader.ReadUInt32(), //flags
            this.reader.ReadChars(16).replace(/\0[\s\S]*$/g,''), //SoundResRef
            this.reader.ReadUInt32(), //VolumeVariance
            this.reader.ReadUInt32(), //PitchVariance
            this.StringEntriesOffset + this.reader.ReadUInt32(), //StringOffset
            this.reader.ReadUInt32(), //StringLength
            this.reader.ReadUInt32(), //SoundLength
            null
          );

          let pos = this.reader.Tell();
          this.reader.Seek(this.TLKStrings[i].StringOffset);
          //console.log(this.TLKStrings[i].StringOffset);
          this.TLKStrings[i].Value = this.reader.ReadChars(this.TLKStrings[i].StringLength).replace(/\0[\s\S]*$/g,'');
          this.reader.Seek(pos);

          //if(typeof onProgress == 'function')
          //  onProgress(i+1, this.StringCount);

        }
        console.log('TLKObject', 'Done');
        if(onSuccess != null)
          onSuccess();
      });
    }
  }

  GetStringById(id: number, onReturn: Function|undefined = undefined): string {
    if(this.TLKStrings[id] != null){
      if(this.TLKStrings[id].Value == null){
        this.TLKStrings[id].GetValue(this.reader, onReturn);
      }else{
        if(onReturn != null)
          onReturn(this.TLKStrings[id].Value);
      }
    }

    try{
      return this.TLKStrings[id].Value;
    }catch(e){
      return '';
    }
  }

  AddTLKString(tlkString: TLKString){
    this.TLKStrings.push(tlkString);
  }

  Search( term = '' ){
    return this.TLKStrings.filter( (tlk) => {
      if(tlk.Value.indexOf(term) >= 0){
        return true;
      }
    }).map( tlk => { return {tlk: tlk, value: tlk.Value, index: this.TLKStrings.indexOf(tlk)} });
  }

}

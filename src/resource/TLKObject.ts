import { BinaryReader } from "../BinaryReader";
import { TLKString } from "./TLKString";
import { GameFileSystem } from "../utility/GameFileSystem";

/**
 * TLKObject class.
 * 
 * Class representing a Talk Table file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TLKObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TLKObject {

  file: Uint8Array|string;
  reader: BinaryReader;
  TLKStrings: TLKString[];

  onSuccess: Function;
  onProgress: Function
  FileType: string;
  FileVersion: string;
  LanguageID: number;
  StringCount: number;
  StringEntriesOffset: number;

  constructor(file: Uint8Array|string = '', onSuccess?: Function, onProgress?: Function){
    this.file = file;
    this.TLKStrings = [];
    console.log('TLKObject', 'Opening TLK');
    if(typeof this.file === 'string'){
      this.LoadFromDisk(this.file, onProgress).then( () => {
        if(typeof onSuccess === 'function') onSuccess();
      }).catch( () => {
        if(typeof onSuccess === 'function') onSuccess();
      });
    }else if(file instanceof Uint8Array){
      this.LoadFromBuffer(this.file, onProgress).then( () => {
        if(typeof onSuccess === 'function') onSuccess();
      }).catch( () => {
        if(typeof onSuccess === 'function') onSuccess();
      });
    }
  }

  LoadFromBuffer( buffer: Uint8Array, onProgress?: Function ){
    return new Promise<void>( (resolve, reject) => {
      try{
        console.log('TLKObject', 'Reading');
        this.reader = new BinaryReader(buffer);
        this.reader.seek(0);
        
        this.FileType = this.reader.readChars(4);
        this.FileVersion = this.reader.readChars(4);
        this.LanguageID = this.reader.readUInt32();
        this.StringCount = this.reader.readUInt32();
        this.StringEntriesOffset = this.reader.readUInt32();
        this.reader.seek(20);
        for(let i = 0, len = this.StringCount; i < len; i++) {
          this.TLKStrings[i] = new TLKString(
            this.reader.readUInt32(), //flags
            this.reader.readChars(16).replace(/\0[\s\S]*$/g,''), //SoundResRef
            this.reader.readUInt32(), //VolumeVariance
            this.reader.readUInt32(), //PitchVariance
            this.StringEntriesOffset + this.reader.readUInt32(), //StringOffset
            this.reader.readUInt32(), //StringLength
            this.reader.readUInt32(), //SoundLength
            null
          );

          let pos = this.reader.tell();
          this.reader.seek(this.TLKStrings[i].StringOffset);
          //console.log(this.TLKStrings[i].StringOffset);
          this.TLKStrings[i].Value = this.reader.readChars(this.TLKStrings[i].StringLength).replace(/\0[\s\S]*$/g,'');
          this.reader.seek(pos);

          if(typeof onProgress == 'function')
            onProgress(i+1, this.StringCount);
        }
        console.log('TLKObject', 'Done');
        resolve();
      }catch(e){
        reject(e);
      }
    })
  }

  LoadFromDisk( resource_path: string, onProgress?: Function ){
    return new Promise<void>( (resolve, reject) => {
      GameFileSystem.readFile(resource_path).then((buffer) => {
        this.LoadFromBuffer(buffer, onProgress).then( () => {
          resolve();
        }).catch( () => {
          reject();
        });
      }).catch((err) => {
        reject();
      })
    });
  }

  GetStringById(id: number, onReturn?: Function): string {
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

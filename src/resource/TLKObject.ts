import { BinaryReader } from "../utility/binary/BinaryReader";
import { BinaryWriter } from "../utility/binary/BinaryWriter";
import { TLKString } from "./TLKString";
import { GameFileSystem } from "../utility/GameFileSystem";
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from "../utility/FormatSerialization";

export interface TLKJSONEntry {
  index: number;
  flags: number;
  value: string;
  soundResRef: string;
  volumeVariance: number;
  pitchVariance: number;
  soundLength: number;
}

export interface TLKJSONData {
  fileType: string;
  fileVersion: string;
  languageId: number;
  stringCount: number;
  entries: TLKJSONEntry[];
}

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
      if((tlk.Value ?? '').indexOf(term) >= 0){
        return true;
      }
    }).map( tlk => { return {tlk: tlk, value: tlk.Value, index: this.TLKStrings.indexOf(tlk)} });
  }

  toJSON(): TLKJSONData {
    const entries = this.TLKStrings.map((entry, index) => ({
      index,
      flags: entry.flags ?? 0,
      value: entry.Value ?? '',
      soundResRef: entry.SoundResRef ?? '',
      volumeVariance: entry.VolumeVariance ?? 0,
      pitchVariance: entry.PitchVariance ?? 0,
      soundLength: entry.SoundLength ?? 0,
    }));

    return {
      fileType: this.FileType || 'TLK ',
      fileVersion: this.FileVersion || 'V3.0',
      languageId: this.LanguageID ?? 0,
      stringCount: entries.length,
      entries,
    };
  }

  fromJSON(json: string | TLKJSONData): void {
    const source = typeof json === 'string' ? JSON.parse(json) as TLKJSONData : json;
    this.FileType = (source.fileType || 'TLK ').padEnd(4).slice(0, 4);
    this.FileVersion = (source.fileVersion || 'V3.0').padEnd(4).slice(0, 4);
    this.LanguageID = source.languageId ?? 0;
    this.TLKStrings = (source.entries ?? []).map((entry) => {
      const value = entry.value ?? '';
      return new TLKString(
        entry.flags ?? 0,
        entry.soundResRef ?? '',
        entry.volumeVariance ?? 0,
        entry.pitchVariance ?? 0,
        0,
        value.length,
        entry.soundLength ?? 0,
        value,
      );
    });
    this.StringCount = this.TLKStrings.length;
    this.StringEntriesOffset = 20 + this.StringCount * 40;
  }

  static fromJSON(json: string | TLKJSONData): TLKObject {
    const tlk = new TLKObject();
    tlk.fromJSON(json);
    return tlk;
  }

  toXML(): string {
    return objectToXML(this.toJSON());
  }

  fromXML(xml: string): void {
    this.fromJSON(xmlToObject(xml) as TLKJSONData);
  }

  static fromXML(xml: string): TLKObject {
    const tlk = new TLKObject();
    tlk.fromXML(xml);
    return tlk;
  }

  toYAML(): string {
    return objectToYAML(this.toJSON());
  }

  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as TLKJSONData);
  }

  static fromYAML(yaml: string): TLKObject {
    const tlk = new TLKObject();
    tlk.fromYAML(yaml);
    return tlk;
  }

  toTOML(): string {
    return objectToTOML(this.toJSON());
  }

  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as TLKJSONData);
  }

  static fromTOML(toml: string): TLKObject {
    const tlk = new TLKObject();
    tlk.fromTOML(toml);
    return tlk;
  }

  toBuffer(): Uint8Array {
    const stringCount = this.TLKStrings.length;
    const headerSize = 20;
    const entrySize = 40;
    const stringEntriesOffset = headerSize + stringCount * entrySize;

    let stringDataSize = 0;
    const stringLengths: number[] = [];
    for (let i = 0; i < stringCount; i++) {
      const value = this.TLKStrings[i].Value != null ? String(this.TLKStrings[i].Value) : '';
      stringLengths.push(value.length);
      stringDataSize += value.length;
    }

    const totalSize = stringEntriesOffset + stringDataSize;
    const writer = new BinaryWriter(new Uint8Array(totalSize));

    writer.writeChars((this.FileType || 'TLK ').padEnd(4).slice(0, 4));
    writer.writeChars((this.FileVersion || 'V3.0').padEnd(4).slice(0, 4));
    writer.writeUInt32(this.LanguageID ?? 0);
    writer.writeUInt32(stringCount);
    writer.writeUInt32(stringEntriesOffset);

    let stringOffset = 0;
    for (let i = 0; i < stringCount; i++) {
      const entry = this.TLKStrings[i];
      writer.writeUInt32(entry.flags ?? 0);
      const soundResRef = (entry.SoundResRef ?? '').replace(/\0[\s\S]*$/g, '').padEnd(16, '\0').slice(0, 16);
      writer.writeChars(soundResRef);
      writer.writeUInt32(entry.VolumeVariance ?? 0);
      writer.writeUInt32(entry.PitchVariance ?? 0);
      writer.writeUInt32(stringOffset);
      writer.writeUInt32(stringLengths[i]);
      writer.writeUInt32(entry.SoundLength ?? 0);
      stringOffset += stringLengths[i];
    }

    for (let i = 0; i < stringCount; i++) {
      writer.writeChars(this.TLKStrings[i].Value != null ? String(this.TLKStrings[i].Value) : '');
    }

    return writer.buffer;
  }

}

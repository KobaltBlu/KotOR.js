import { TLKString } from "@/resource/TLKString";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Resource);

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

  onSuccess: (() => void) | undefined;
  onProgress: ((current: number, total: number) => void) | undefined;
  FileType: string;
  FileVersion: string;
  LanguageID: number;
  StringCount: number;
  StringEntriesOffset: number;

  constructor(file: Uint8Array|string = '', onSuccess?: () => void, onProgress?: (current: number, total: number) => void){
    this.file = file;
    this.TLKStrings = [];
    log.info('TLKObject', 'Opening TLK');
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

  LoadFromBuffer( buffer: Uint8Array, onProgress?: (current: number, total: number) => void ){
    return new Promise<void>( (resolve, reject) => {
      try{
        log.info('TLKObject', 'Reading');
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

          const pos = this.reader.tell();
          this.reader.seek(this.TLKStrings[i].StringOffset);
          //log.info(this.TLKStrings[i].StringOffset);
          this.TLKStrings[i].Value = this.reader.readChars(this.TLKStrings[i].StringLength).replace(/\0[\s\S]*$/g,'');
          this.reader.seek(pos);

          if(typeof onProgress == 'function')
            onProgress(i+1, this.StringCount);
        }
        log.info('TLKObject', 'Done');
        resolve();
      }catch(e){
        reject(e);
      }
    })
  }

  LoadFromDisk( resource_path: string, onProgress?: (current: number, total: number) => void ){
    return new Promise<void>( (resolve, reject) => {
      GameFileSystem.readFile(resource_path).then((buffer: Uint8Array) => {
        this.LoadFromBuffer(buffer, onProgress).then( () => {
          resolve();
        }).catch( () => {
          reject();
        });
      }).catch((_err) => {
        reject();
      })
    });
  }

  GetStringById(id: number, onReturn?: (value: string) => void): string {
    if(this.TLKStrings[id] != null){
      if(this.TLKStrings[id].Value == null){
        this.TLKStrings[id].GetValue(this.reader, onReturn);
      }else{
        if(onReturn != null)
          onReturn(this.TLKStrings[id].Value);
      }
    }

    try{
      return this.TLKStrings[id]?.Value ?? '';
    }catch{
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

  /**
   * Serialize the current TLK state back into a TLK V3.0 buffer.
   *
   * This is intentionally "best-effort" and never throws for missing/partial
   * string entries; undefined entries are encoded as empty strings.
   */
  toBuffer(): Uint8Array {
    const headerSize = 20;
    const entrySize = 40;

    const fileType = ((this.FileType ?? 'TLK ') + '    ').slice(0, 4);
    const fileVersion = ((this.FileVersion ?? 'V3.0') + '    ').slice(0, 4);
    const languageID = typeof this.LanguageID === 'number' ? this.LanguageID : 0;

    const stringCount =
      typeof this.StringCount === 'number' && this.StringCount >= 0
        ? this.StringCount
        : this.TLKStrings.length;

    const stringEntriesOffset = headerSize + stringCount * entrySize;

    const values: string[] = Array.from({ length: stringCount }, () => '');
    let stringDataSize = 0;
    for(let i = 0; i < stringCount; i++){
      const rawValue = this.TLKStrings[i]?.Value;
      const value = (rawValue ?? '').toString().replace(/\0[\s\S]*$/g,'');
      values[i] = value;
      stringDataSize += value.length;
    }

    const totalSize = stringEntriesOffset + stringDataSize;
    const writer = new BinaryWriter(new Uint8Array(totalSize));

    // Header
    writer.writeChars(fileType);
    writer.writeChars(fileVersion);
    writer.writeUInt32(languageID);
    writer.writeUInt32(stringCount);
    writer.writeUInt32(stringEntriesOffset);

    // Entries
    let runningOffset = 0; // offset relative to StringEntriesOffset
    for(let i = 0; i < stringCount; i++){
      const entry = this.TLKStrings[i];
      const value = values[i] ?? '';

      const flags = entry?.flags ?? 0;
      const soundResRef = (entry?.SoundResRef ?? '').toString().replace(/\0[\s\S]*$/g,'').slice(0, 16);
      const volumeVariance = entry?.VolumeVariance ?? 0;
      const pitchVariance = entry?.PitchVariance ?? 0;
      const soundLength = entry?.SoundLength ?? 0;

      writer.writeUInt32(flags);
      writer.writeChars(soundResRef.padEnd(16, '\0'));
      writer.writeUInt32(volumeVariance);
      writer.writeUInt32(pitchVariance);
      writer.writeUInt32(runningOffset);
      writer.writeUInt32(value.length);
      writer.writeUInt32(soundLength);

      runningOffset += value.length;
    }

    // String data
    for(let i = 0; i < stringCount; i++){
      writer.writeChars(values[i] ?? '');
    }

    return writer.buffer;
  }

}

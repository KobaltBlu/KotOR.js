import { BinaryReader } from "../BinaryReader";
import { TLKManager } from "../managers/TLKManager";

/**
 * SSFObject class.
 * 
 * Class representing a Sound Set file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SSFObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SSFObject {
  data: Uint8Array;
  sound_refs: number[];
  FileType: string;
  FileVersion: string;

  constructor( data: Uint8Array ){
    this.data = data;
    this.sound_refs = [];

    this.Open(this.data);

  }

  Open( data: Uint8Array ){

    this.data = data;
    this.sound_refs = [];

    if(this.data instanceof Uint8Array){

      let reader = new BinaryReader(this.data);
      this.FileType = reader.readChars(4);
      this.FileVersion = reader.readChars(4);
      let unknown = reader.readUInt32(); //Always 12?

      let soundCount = (this.data.length - 12) / 4;
      for(let i = 0; i < soundCount; i++){
        this.sound_refs.push(reader.readUInt32() & 0xFFFFFFFF);
      }

      this.data = new Uint8Array(0);
      reader.dispose();

    }

  }

  GetSoundResRef(type = -1){

    if(type > -1 && type < 28){
      let tlk = TLKManager.TLKStrings[this.sound_refs[type]];
      if(tlk){
        return tlk.SoundResRef;
      }
    }

    return '';
  }

}

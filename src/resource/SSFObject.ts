import isBuffer from "is-buffer";
import { BinaryReader } from "../BinaryReader";
import { TLKManager } from "../managers/TLKManager";

export class SSFObject {
  data: Buffer;
  sound_refs: number[];
  FileType: string;
  FileVersion: string;

  constructor( data: Buffer ){
    this.data = data;
    this.sound_refs = [];

    this.Open(this.data);

  }

  Open( data: Buffer ){

    this.data = data;
    this.sound_refs = [];

    if(isBuffer(this.data)){

      let reader = new BinaryReader(this.data);
      this.FileType = reader.readChars(4);
      this.FileVersion = reader.readChars(4);
      let unknown = reader.readUInt32(); //Always 12?

      let soundCount = (this.data.length - 12) / 4;
      for(let i = 0; i < soundCount; i++){
        this.sound_refs.push(reader.readUInt32() & 0xFFFFFFFF);
      }

      this.data = Buffer.allocUnsafe(0);
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

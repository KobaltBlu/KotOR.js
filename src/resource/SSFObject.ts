import { TLKManager } from "../managers/TLKManager";
import { BinaryReader } from "../utility/binary/BinaryReader";
import { BinaryWriter } from "../utility/binary/BinaryWriter";

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

      const reader = new BinaryReader(this.data);
      this.FileType = reader.readChars(4);
      this.FileVersion = reader.readChars(4);
      const unknown = reader.readUInt32(); //Always 12?

      const soundCount = Math.min(28, Math.max(0, (this.data.length - 12) >> 2));
      for (let i = 0; i < soundCount; i++) {
        const u = reader.readUInt32();
        this.sound_refs.push(u === 0xFFFFFFFF ? -1 : (u >>> 0));
      }
      // SSF format defines 28 sound slots (PyKotor/engine parity); pad for editor
      while (this.sound_refs.length < 28) {
        this.sound_refs.push(-1);
      }

      this.data = new Uint8Array(0);
      reader.dispose();

    }

  }

  GetSoundResRef(type = -1){

    if(type > -1 && type < 28){
      const tlk = TLKManager.TLKStrings[this.sound_refs[type]];
      if(tlk){
        return tlk.SoundResRef;
      }
    }

    return '';
  }

  /**
   * Serialize SSF to binary (PyKotor bytes_ssf parity).
   * Format: "SSF " (4) + "V1.1" (4) + offset (4) + 28 × uint32 (StrRef, -1 for none).
   */
  toBuffer(): Uint8Array {
    const bw = new BinaryWriter(new Uint8Array(12 + 28 * 4));
    bw.writeChars('SSF ');
    bw.writeChars('V1.1');
    bw.writeUInt32(12);
    const refs = this.sound_refs ?? [];
    for (let i = 0; i < 28; i++) {
      const v = refs[i] ?? -1;
      const u = v < 0 ? 0xffffffff : v >>> 0;
      bw.writeUInt32(u);
    }
    return bw.buffer;
  }

}

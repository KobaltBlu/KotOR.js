import { TLKManager } from "@/managers/TLKManager";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from "@/utility/FormatSerialization";

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

  constructor(data: Uint8Array = new Uint8Array(0)) {
    this.data = data;
    this.sound_refs = [];

    if (data.length) {
      this.Open(this.data);
    } else {
      this.FileType = 'SSF ';
      this.FileVersion = 'V1.1';
      this.ensure28Slots();
    }
  }

  Open(data: Uint8Array) {
    this.data = data;
    this.sound_refs = [];

    if (this.data instanceof Uint8Array) {
      if (this.data.length < SSF_V11_HEADER_SIZE) {
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      const reader = new BinaryReader(this.data);
      this.FileType = reader.readChars(4);
      this.FileVersion = reader.readChars(4);
      const strrefTableOffset = reader.readUInt32();

      if (this.FileType !== 'SSF ' || this.FileVersion !== 'V1.1') {
        reader.dispose();
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      if (strrefTableOffset !== SSF_V11_HEADER_SIZE) {
        reader.dispose();
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      const payload = this.data.length - SSF_V11_HEADER_SIZE;
      if (payload < 0 || payload % 4 !== 0) {
        reader.dispose();
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      const soundCount = payload / 4;
      for (let i = 0; i < soundCount; i++) {
        this.sound_refs.push(reader.readUInt32() & 0xffffffff);
      }

      this.ensure28Slots();

      this.data = new Uint8Array(0);
      reader.dispose();
    }
  }

  ensure28Slots(): void {
    while (this.sound_refs.length < SSF_STRREF_SLOT_COUNT) {
      this.sound_refs.push(-1);
    }
    if (this.sound_refs.length > SSF_STRREF_SLOT_COUNT) {
      this.sound_refs = this.sound_refs.slice(0, SSF_STRREF_SLOT_COUNT);
    }
  }

    if(type > -1 && type < 28){
      const tlk = TLKManager.TLKStrings[this.sound_refs[type]];
      if(tlk){
        return tlk.SoundResRef;
      }
    }

    return '';
  }
}

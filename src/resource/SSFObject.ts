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
      const _unknown = reader.readUInt32(); //Always 12?

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

  toJSON(): { fileType: string; fileVersion: string; sound_refs: number[] } {
    return {
      fileType: this.FileType ?? 'SSF ',
      fileVersion: this.FileVersion ?? 'V1.1',
      sound_refs: [...(this.sound_refs ?? [])]
    };
  }

  fromJSON(json: string | ReturnType<SSFObject['toJSON']>): void {
    const obj = typeof json === 'string' ? (JSON.parse(json) as ReturnType<SSFObject['toJSON']>) : json;
    this.FileType = (String(obj.fileType ?? 'SSF ').padEnd(4, ' ')).slice(0, 4);
    this.FileVersion = (String(obj.fileVersion ?? 'V1.1').padEnd(4, ' ')).slice(0, 4);
    this.sound_refs = Array.isArray(obj.sound_refs) ? [...obj.sound_refs] : [];
    while (this.sound_refs.length < 28) this.sound_refs.push(-1);
  }

  toXML(): string { return objectToXML(this.toJSON()); }
  fromXML(xml: string): void { this.fromJSON(xmlToObject(xml) as ReturnType<SSFObject['toJSON']>); }
  toYAML(): string { return objectToYAML(this.toJSON()); }
  fromYAML(yaml: string): void { this.fromJSON(yamlToObject(yaml) as ReturnType<SSFObject['toJSON']>); }
  toTOML(): string { return objectToTOML(this.toJSON()); }
  fromTOML(toml: string): void { this.fromJSON(tomlToObject(toml) as ReturnType<SSFObject['toJSON']>); }

  static fromJSON(json: string | ReturnType<SSFObject['toJSON']>): SSFObject {
    const ssf = new SSFObject(new Uint8Array(0));
    ssf.fromJSON(json);
    return ssf;
  }
  static fromXML(xml: string): SSFObject { return SSFObject.fromJSON(xmlToObject(xml) as ReturnType<SSFObject['toJSON']>); }
  static fromYAML(yaml: string): SSFObject { return SSFObject.fromJSON(yamlToObject(yaml) as ReturnType<SSFObject['toJSON']>); }
  static fromTOML(toml: string): SSFObject { return SSFObject.fromJSON(tomlToObject(toml) as ReturnType<SSFObject['toJSON']>); }

}

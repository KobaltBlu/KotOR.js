import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TLKManager } from "@/managers/TLKManager";

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

  constructor( data: Uint8Array = new Uint8Array(0) ){
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

  Open( data: Uint8Array ){

    this.data = data;
    this.sound_refs = [];

    if(this.data instanceof Uint8Array){
      if (this.data.length < 12) {
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      const reader = new BinaryReader(this.data);
      this.FileType = reader.readChars(4);
      this.FileVersion = reader.readChars(4);
      const unknown = reader.readUInt32(); //Always 12?

      if (this.FileType !== 'SSF ' || this.FileVersion !== 'V1.1') {
        reader.dispose();
        throw new Error('Tried to save or load an unsupported or corrupted file.');
      }

      const soundCount = (this.data.length - 12) / 4;
      for(let i = 0; i < soundCount; i++){
        this.sound_refs.push(reader.readUInt32() & 0xFFFFFFFF);
      }

      this.ensure28Slots();

      this.data = new Uint8Array(0);
      reader.dispose();

    }

  }

  ensure28Slots(): void {
    while (this.sound_refs.length < 28) {
      this.sound_refs.push(-1);
    }
    if (this.sound_refs.length > 28) {
      this.sound_refs = this.sound_refs.slice(0, 28);
    }
  }

  toBuffer(): Uint8Array {
    this.ensure28Slots();
    const writer = new BinaryWriter(new Uint8Array(12 + 28 * 4));
    writer.writeChars(this.FileType || 'SSF ');
    writer.writeChars(this.FileVersion || 'V1.1');
    writer.writeUInt32(12);
    for (let i = 0; i < 28; i++) {
      writer.writeUInt32(this.sound_refs[i] < 0 ? 0xFFFFFFFF : this.sound_refs[i]);
    }
    return writer.buffer;
  }

  toJSON(): { fileType: string; fileVersion: string; sound_refs: number[] } {
    this.ensure28Slots();
    return {
      fileType: this.FileType || 'SSF ',
      fileVersion: this.FileVersion || 'V1.1',
      sound_refs: [...this.sound_refs],
    };
  }

  fromJSON(json: string | ReturnType<SSFObject['toJSON']>): void {
    const data = typeof json === 'string' ? JSON.parse(json) as ReturnType<SSFObject['toJSON']> : json;
    this.FileType = data.fileType || 'SSF ';
    this.FileVersion = data.fileVersion || 'V1.1';
    this.sound_refs = [...(data.sound_refs || [])];
    this.ensure28Slots();
  }

  static fromJSON(json: string | ReturnType<SSFObject['toJSON']>): SSFObject {
    const ssf = new SSFObject();
    ssf.fromJSON(json);
    return ssf;
  }

  toXML(): string { return objectToXML({ json: JSON.stringify(this.toJSON()) }); }
  fromXML(xml: string): void {
    const data = xmlToObject(xml) as { json?: string } | ReturnType<SSFObject['toJSON']>;
    if (typeof (data as { json?: string }).json === 'string') {
      this.fromJSON((data as { json: string }).json);
      return;
    }
    this.fromJSON(data as ReturnType<SSFObject['toJSON']>);
  }
  static fromXML(xml: string): SSFObject { const ssf = new SSFObject(); ssf.fromXML(xml); return ssf; }
  toYAML(): string { return objectToYAML(this.toJSON()); }
  fromYAML(yaml: string): void { this.fromJSON(yamlToObject(yaml) as ReturnType<SSFObject['toJSON']>); }
  static fromYAML(yaml: string): SSFObject { const ssf = new SSFObject(); ssf.fromYAML(yaml); return ssf; }
  toTOML(): string { return objectToTOML(this.toJSON()); }
  fromTOML(toml: string): void { this.fromJSON(tomlToObject(toml) as ReturnType<SSFObject['toJSON']>); }
  static fromTOML(toml: string): SSFObject { const ssf = new SSFObject(); ssf.fromTOML(toml); return ssf; }

  GetSoundResRef(type = -1){

    if(type > -1 && type < 28){
      const tlk = TLKManager.TLKStrings[this.sound_refs[type]];
      if(tlk){
        return tlk.SoundResRef;
      }
    }

    return '';
  }

}

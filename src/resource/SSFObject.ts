import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { TLKManager } from '@/managers/TLKManager';
import {
  objectToTOML,
  objectToXML,
  objectToYAML,
  tomlToObject,
  xmlToObject,
  yamlToObject,
} from '@/utility/FormatSerialization';

/** Sound set (SSF) V1.1: type, version, then byte offset to the strref list (immediately after header). */
export const SSF_V11_HEADER_SIZE = 12;

/** KotOR uses 28 strref slots per soundset. */
export const SSF_STRREF_SLOT_COUNT = 28;

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

  toBuffer(): Uint8Array {
    this.ensure28Slots();
    const writer = new BinaryWriter(new Uint8Array(SSF_V11_HEADER_SIZE + SSF_STRREF_SLOT_COUNT * 4));
    writer.writeChars(this.FileType || 'SSF ');
    writer.writeChars(this.FileVersion || 'V1.1');
    writer.writeUInt32(SSF_V11_HEADER_SIZE);
    for (let i = 0; i < SSF_STRREF_SLOT_COUNT; i++) {
      writer.writeUInt32(this.sound_refs[i] < 0 ? 0xffffffff : this.sound_refs[i]);
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
    const data = typeof json === 'string' ? (JSON.parse(json) as ReturnType<SSFObject['toJSON']>) : json;
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

  toXML(): string {
    return objectToXML({ json: JSON.stringify(this.toJSON()) });
  }
  fromXML(xml: string): void {
    const data = xmlToObject(xml) as { json?: string } | ReturnType<SSFObject['toJSON']>;
    if (typeof (data as { json?: string }).json === 'string') {
      this.fromJSON((data as { json: string }).json);
      return;
    }
    this.fromJSON(data as ReturnType<SSFObject['toJSON']>);
  }
  static fromXML(xml: string): SSFObject {
    const ssf = new SSFObject();
    ssf.fromXML(xml);
    return ssf;
  }
  toYAML(): string {
    return objectToYAML(this.toJSON());
  }
  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as ReturnType<SSFObject['toJSON']>);
  }
  static fromYAML(yaml: string): SSFObject {
    const ssf = new SSFObject();
    ssf.fromYAML(yaml);
    return ssf;
  }
  toTOML(): string {
    return objectToTOML(this.toJSON());
  }
  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as ReturnType<SSFObject['toJSON']>);
  }
  static fromTOML(toml: string): SSFObject {
    const ssf = new SSFObject();
    ssf.fromTOML(toml);
    return ssf;
  }

  GetSoundResRef(type = -1) {
    if (type > -1 && type < 28) {
      const tlk = TLKManager.TLKStrings[this.sound_refs[type]];
      if (tlk) {
        return tlk.SoundResRef;
      }
    }

    return '';
  }
}

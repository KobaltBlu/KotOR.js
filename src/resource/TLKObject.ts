import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { TLKString } from "@/resource/TLKString";
import { TLKStringFlags } from "@/enums/resource/TLKStringFlags";

export interface TLKStringUpdate {
  Value?: string;
  SoundResRef?: string;
  flags?: number;
  VolumeVariance?: number;
  PitchVariance?: number;
  SoundLength?: number;
}

function encodeLatin1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return bytes;
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

  TLKStrings: TLKString[] = [];

  FileType: string;
  FileVersion: string;
  LanguageID: number;
  StringCount: number;
  StringEntriesOffset: number;

  /**
   * Parses a dialog.tlk buffer in two sequential passes:
   *   Pass 1 — reads all 40-byte DataElement records with no random seeks.
   *   Pass 2 — decodes string values from the string-data section using
   *             Uint8Array.subarray() (zero-copy views) and a single TextDecoder.
   *
   * The BinaryReader and raw buffer are released immediately after parsing.
   */
  loadFromBuffer(buffer: Uint8Array): void {
    const reader = new BinaryReader(buffer);
    reader.seek(0);

    this.FileType             = reader.readChars(4);
    this.FileVersion          = reader.readChars(4);
    this.LanguageID           = reader.readUInt32();
    this.StringCount          = reader.readUInt32();
    this.StringEntriesOffset  = reader.readUInt32();

    // Pass 1: read all DataElement records sequentially (40 bytes each, no seeks)
    reader.seek(20);
    const records: {
      flags: number;
      soundResRef: string;
      volVar: number;
      pitchVar: number;
      strOffset: number;
      strLen: number;
      sndLen: number;
    }[] = new Array(this.StringCount);

    for(let i = 0; i < this.StringCount; i++){
      records[i] = {
        flags:       reader.readUInt32(),
        soundResRef: reader.readChars(16).replace(/\0[\s\S]*$/g, ''),
        volVar:      reader.readUInt32(),
        pitchVar:    reader.readUInt32(),
        strOffset:   reader.readUInt32(),
        strLen:      reader.readUInt32(),
        sndLen:      reader.readUInt32(),
      };
    }

    // Pass 2: decode string values using zero-copy subarray views
    const strSection = buffer.subarray(this.StringEntriesOffset);
    const decoder = new TextDecoder('latin1');

    this.TLKStrings = new Array(this.StringCount);
    for(let i = 0; i < this.StringCount; i++){
      const r = records[i];
      const flags = r.flags >>> 0;
      const hasText = (flags & TLKStringFlags.TEXT_PRESENT) !== 0;
      const hasSound = (flags & TLKStringFlags.SND_PRESENT) !== 0;
      const hasSoundLength = (flags & TLKStringFlags.SNDLENGTH_PRESENT) !== 0;
      const value = hasText && r.strLen > 0
        ? decoder.decode(strSection.subarray(r.strOffset, r.strOffset + r.strLen)).replace(/\0[\s\S]*$/g, '')
        : '';
      this.TLKStrings[i] = new TLKString(
        flags,
        hasSound ? r.soundResRef : '',
        r.volVar,
        r.pitchVar,
        this.StringEntriesOffset + r.strOffset,
        hasText ? r.strLen : 0,
        hasSoundLength ? r.sndLen : 0,
        value
      );
    }
    // Release the reader and buffer — all values are eagerly loaded.
  }

  GetStringById(id: number): string {
    return this.TLKStrings[id]?.getDisplayText() ?? '';
  }

  AddTLKString(tlkString: TLKString){
    this.TLKStrings.push(tlkString);
    this.StringCount = this.TLKStrings.length;
  }

  /** Append a new empty string at the end of the table. Returns the new index. */
  appendString(entry: TLKString = TLKString.createEmpty()): number {
    this.TLKStrings.push(entry);
    this.StringCount = this.TLKStrings.length;
    return this.TLKStrings.length - 1;
  }

  /**
   * Insert a new string at `index`, shifting later entries up by one.
   * Returns the index of the inserted string.
   */
  insertStringAt(index: number, entry: TLKString = TLKString.createEmpty()): number {
    const clamped = Math.max(0, Math.min(index, this.TLKStrings.length));
    this.TLKStrings.splice(clamped, 0, entry);
    this.StringCount = this.TLKStrings.length;
    return clamped;
  }

  /** Remove the string at `index`, shifting later entries down by one. */
  deleteStringAt(index: number): boolean {
    if (index < 0 || index >= this.TLKStrings.length) {
      return false;
    }
    this.TLKStrings.splice(index, 1);
    this.StringCount = this.TLKStrings.length;
    return true;
  }

  getStringCount(): number {
    return this.TLKStrings.length;
  }

  updateString(index: number, partial: TLKStringUpdate): void {
    const entry = this.TLKStrings[index];
    if (!entry) return;

    if (partial.flags !== undefined) {
      entry.flags = partial.flags >>> 0;
      entry.applyFlagsToFields();
    }

    if (partial.Value !== undefined) {
      entry.Value = partial.Value.replace(/\0[\s\S]*$/g, '');
    }
    if (partial.SoundResRef !== undefined) {
      entry.SoundResRef = partial.SoundResRef;
    }
    if (partial.VolumeVariance !== undefined) {
      entry.VolumeVariance = partial.VolumeVariance >>> 0;
    }
    if (partial.PitchVariance !== undefined) {
      entry.PitchVariance = partial.PitchVariance >>> 0;
    }
    if (partial.SoundLength !== undefined) {
      entry.SoundLength = partial.SoundLength >>> 0;
    }

    if (partial.flags === undefined) {
      entry.syncFlagsFromContent();
    } else {
      entry.invalidateSearchCache();
    }
  }

  private padFourChars(s: string): string {
    const x = (s || '').slice(0, 4);
    return x.padEnd(4, ' ');
  }

  private writeSoundResRef(bw: BinaryWriter, resRef: string): void {
    const trimmed = (resRef || '').slice(0, 16);
    const bytes = new Uint8Array(16);
    for (let i = 0; i < trimmed.length; i++) {
      bytes[i] = trimmed.charCodeAt(i) & 0xff;
    }
    bw.writeBytes(bytes);
  }

  /**
   * Serialize the talk table to binary .tlk bytes.
   */
  toExportBuffer(): Uint8Array {
    const count = this.TLKStrings.length;
    const stringEntriesOffset = 20 + count * 40;
    const offsets = new Array<number>(count);
    const lengths = new Array<number>(count);
    const stringChunks = new Array<Uint8Array>(count);
    let strDataLen = 0;

    for (let i = 0; i < count; i++) {
      const entry = this.TLKStrings[i];
      const flags = entry.flags >>> 0;
      const hasText = (flags & TLKStringFlags.TEXT_PRESENT) !== 0;
      const value = hasText ? (entry.Value ?? '').replace(/\0[\s\S]*$/g, '') : '';
      const bytes = hasText ? encodeLatin1(value) : new Uint8Array(0);
      stringChunks[i] = bytes;
      offsets[i] = strDataLen;
      lengths[i] = bytes.length;
      strDataLen += bytes.length;
    }

    const totalSize = stringEntriesOffset + strDataLen;
    const out = new Uint8Array(totalSize);
    const bw = new BinaryWriter(out);

    bw.writeChars(this.padFourChars(this.FileType || 'TLK '));
    bw.writeChars(this.padFourChars(this.FileVersion || 'V3.0'));
    bw.writeUInt32(this.LanguageID >>> 0);
    bw.writeUInt32(count >>> 0);
    bw.writeUInt32(stringEntriesOffset >>> 0);

    for (let i = 0; i < count; i++) {
      const entry = this.TLKStrings[i];
      const flags = entry.flags >>> 0;
      const hasSound = (flags & TLKStringFlags.SND_PRESENT) !== 0;
      const hasSoundLength = (flags & TLKStringFlags.SNDLENGTH_PRESENT) !== 0;
      bw.writeUInt32(flags);
      this.writeSoundResRef(bw, hasSound ? String(entry.SoundResRef ?? '') : '');
      bw.writeUInt32(entry.VolumeVariance >>> 0);
      bw.writeUInt32(entry.PitchVariance >>> 0);
      bw.writeUInt32(offsets[i] >>> 0);
      bw.writeUInt32(lengths[i] >>> 0);
      bw.writeUInt32(hasSoundLength ? entry.SoundLength >>> 0 : 0);
    }

    let writePos = stringEntriesOffset;
    for (let i = 0; i < count; i++) {
      const chunk = stringChunks[i];
      out.set(chunk, writePos);
      writePos += chunk.length;
    }

    this.StringCount = count;
    this.StringEntriesOffset = stringEntriesOffset;
    return out;
  }

}

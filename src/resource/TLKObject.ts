import { BinaryReader } from "@/utility/binary/BinaryReader";
import { TLKString } from "@/resource/TLKString";

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
      const value = r.strLen > 0
        ? decoder.decode(strSection.subarray(r.strOffset, r.strOffset + r.strLen)).replace(/\0[\s\S]*$/g, '')
        : '';
      this.TLKStrings[i] = new TLKString(
        r.flags,
        r.soundResRef,
        r.volVar,
        r.pitchVar,
        this.StringEntriesOffset + r.strOffset,
        r.strLen,
        r.sndLen,
        value
      );
    }
    // Release the reader and buffer — all values are eagerly loaded.
  }

  GetStringById(id: number): string {
    return this.TLKStrings[id]?.Value ?? '';
  }

  AddTLKString(tlkString: TLKString){
    this.TLKStrings.push(tlkString);
  }

}

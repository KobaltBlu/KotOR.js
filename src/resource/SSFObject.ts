import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { TLKManager } from "@/managers/TLKManager";
import { SSFType } from "@/enums/resource/SSFType";

/** Number of sound slots in a KotOR creature sound set (matches {@link SSFType}). */
export const SSF_SLOT_COUNT = 28;

/** STRREF value used when padding unused slots (invalid TLK index). */
const SSF_PAD_STRREF = 0xffffffff >>> 0;

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
  /** Third uint32 in the file header (preserved on round-trip). */
  headerPadding: number;

  constructor(data: Uint8Array) {
    this.data = data;
    this.sound_refs = [];
    this.FileType = "SSF ";
    this.FileVersion = "V1.1";
    this.headerPadding = 0;

    this.Open(this.data);
  }

  Open(data: Uint8Array) {
    this.data = data;
    this.sound_refs = [];

    if (!(data instanceof Uint8Array) || data.length === 0) {
      this.FileType = "SSF ";
      this.FileVersion = "V1.1";
      this.headerPadding = 0;
      this.sound_refs = new Array(SSF_SLOT_COUNT).fill(SSF_PAD_STRREF);
      this.data = new Uint8Array(0);
      return;
    }

    const reader = new BinaryReader(data);
    this.FileType = reader.readChars(4);
    this.FileVersion = reader.readChars(4);
    this.headerPadding = reader.readUInt32() >>> 0;

    const remaining = Math.max(0, data.length - 12);
    const soundCount = (remaining / 4) | 0;
    for (let i = 0; i < soundCount; i++) {
      this.sound_refs.push(reader.readUInt32() >>> 0);
    }
    reader.dispose();

    this.normalizeSlots();
    this.data = new Uint8Array(0);
  }

  /** Pad or trim {@link sound_refs} to {@link SSF_SLOT_COUNT} entries. */
  normalizeSlots(): void {
    while (this.sound_refs.length < SSF_SLOT_COUNT) {
      this.sound_refs.push(SSF_PAD_STRREF);
    }
    if (this.sound_refs.length > SSF_SLOT_COUNT) {
      this.sound_refs.length = SSF_SLOT_COUNT;
    }
  }

  private padFourChars(s: string): string {
    const x = (s || "").slice(0, 4);
    return x.padEnd(4, " ");
  }

  /**
   * Serialize to binary .ssf bytes (12-byte header + 28 × uint32 STRREFs).
   */
  toExportBuffer(): Uint8Array {
    this.normalizeSlots();
    const bw = new BinaryWriter();
    bw.writeChars(this.padFourChars(this.FileType));
    bw.writeChars(this.padFourChars(this.FileVersion));
    bw.writeUInt32(this.headerPadding >>> 0);
    for (let i = 0; i < SSF_SLOT_COUNT; i++) {
      bw.writeUInt32((this.sound_refs[i] ?? 0) >>> 0);
    }
    return bw.buffer.subarray(0, bw.position);
  }

  getStrRef(slot: SSFType): number {
    return this.sound_refs[slot] ?? 0;
  }

  setStrRef(slot: SSFType, value: number): void {
    const v = value >>> 0;
    this.normalizeSlots();
    this.sound_refs[slot] = v;
  }

  /**
   * TLK SoundResRef for a slot (runtime playback). Normalizes null-padded TLK strings.
   */
  GetSoundResRef(type = -1) {
    if (type > -1 && type < this.sound_refs.length && type < SSF_SLOT_COUNT) {
      const strRef = this.sound_refs[type];
      const tlk = TLKManager.TLKStrings[strRef];
      if (tlk) {
        return SSFObject.normalizeTlkSoundResRef(tlk.SoundResRef);
      }
    }
    return "";
  }

  private static normalizeTlkSoundResRef(raw: unknown): string {
    if (raw == null) return "";
    if (typeof raw === "string") {
      return raw.replace(/\0[\s\S]*$/g, "").trim();
    }
    if (Array.isArray(raw)) {
      const s = raw
        .map((c) => (typeof c === "string" ? c : String.fromCharCode(Number(c) & 0xff)))
        .join("");
      return s.replace(/\0[\s\S]*$/g, "").trim();
    }
    return String(raw)
      .replace(/\0[\s\S]*$/g, "")
      .trim();
  }
}

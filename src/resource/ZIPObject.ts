import { GameFileSystem } from "@/utility/GameFileSystem";
import type { IZIPStoredEntry } from "@/interface/resource/IZIPStoredEntry";

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const GPBF_UTF8 = 0x0800;
const METHOD_STORED = 0;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: false });

/**
 * ZIPObject class.
 *
 * Minimal PKZIP subset: **compression method 0 (STORED) only**, 32-bit sizes and offsets,
 * no ZIP64, no encryption, no spanning. Suitable for building small distribution archives
 * (e.g. Forge mod bundles). Optional {@link ZIPObject.load} reads archives produced the same way.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ZIPObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ZIPObject {
  resource_path: string | undefined;
  buffer: Uint8Array = new Uint8Array(0);
  inMemory: boolean = false;

  type: string = "zip";
  group: string = "zip";

  #storedEntries: IZIPStoredEntry[] = [];

  constructor(file?: string | Uint8Array) {
    if (file instanceof Uint8Array) {
      this.buffer = file;
      this.inMemory = true;
    } else if (typeof file === "string") {
      this.resource_path = file;
      this.inMemory = false;
    }
  }

  /** Entries staged for export or populated by {@link ZIPObject.load}. */
  get storedEntries(): readonly IZIPStoredEntry[] {
    return this.#storedEntries;
  }

  getEntry(path: string): IZIPStoredEntry | undefined {
    const n = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return this.#storedEntries.find((e) => e.path === n);
  }

  clearEntries(): void {
    this.#storedEntries = [];
  }

  /**
   * Append a STORED file to the in-memory archive layout (call {@link ZIPObject.getExportBuffer} to serialize).
   */
  addStoredEntry(path: string, data: Uint8Array): void {
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized.length) {
      throw new Error("ZIPObject.addStoredEntry: empty path");
    }
    this.#storedEntries.push({ path: normalized, data });
  }

  /**
   * One-shot build: same as `new ZIPObject(); entries.forEach(...); return z.getExportBuffer()`.
   */
  static buildStoreOnly(entries: { path: string; data: Uint8Array }[]): Uint8Array {
    const z = new ZIPObject();
    for (const e of entries) {
      z.addStoredEntry(e.path, e.data);
    }
    return z.getExportBuffer();
  }

  async load(): Promise<ZIPObject> {
    if (this.inMemory) {
      this.loadFromBuffer(this.buffer);
      return this;
    }
    if (this.resource_path) {
      await this.loadFromDisk();
      return this;
    }
    throw new Error("ZIPObject.load: no buffer or path");
  }

  private loadFromBuffer(buffer: Uint8Array): void {
    this.buffer = buffer;
    if (buffer.length === 0) {
      this.#storedEntries = [];
      return;
    }
    this.#storedEntries = ZIPObject.#parseStoreOnlyZip(buffer);
  }

  private async loadFromDisk(): Promise<void> {
    if (!this.resource_path) {
      throw new Error("ZIPObject.loadFromDisk: missing path");
    }
    const buf = await GameFileSystem.readFile(this.resource_path);
    if (!buf || !buf.byteLength) {
      this.buffer = new Uint8Array(0);
      this.loadFromBuffer(this.buffer);
      return;
    }
    this.buffer = buf;
    this.inMemory = true;
    this.loadFromBuffer(this.buffer);
  }

  /**
   * Parse a STORE-only zip from `buffer`. Throws if EOCD not found, unsupported compression, or malformed layout.
   */
  static #parseStoreOnlyZip(buffer: Uint8Array): IZIPStoredEntry[] {
    if (buffer.length < 22) {
      throw new Error("ZIPObject: buffer too small for EOCD");
    }
    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const eocdOff = ZIPObject.#findEocdOffset(buffer, dv);
    if (eocdOff < 0) {
      throw new Error("ZIPObject: EOCD signature not found");
    }
    const totalEntries = dv.getUint16(eocdOff + 10, true);
    const cdSize = dv.getUint32(eocdOff + 12, true);
    const cdOffset = dv.getUint32(eocdOff + 16, true);
    const diskNo = dv.getUint16(eocdOff + 4, true);
    const diskCd = dv.getUint16(eocdOff + 6, true);
    if (diskNo !== 0 || diskCd !== 0) {
      throw new Error("ZIPObject: multi-disk ZIP not supported");
    }
    if (cdOffset + cdSize > buffer.length) {
      throw new Error("ZIPObject: invalid central directory extent");
    }

    const out: IZIPStoredEntry[] = [];
    let pos = cdOffset;
    const cdEnd = cdOffset + cdSize;

    for (let i = 0; i < totalEntries; i++) {
      if (pos + 4 > cdEnd || dv.getUint32(pos, true) !== SIG_CENTRAL) {
        throw new Error(`ZIPObject: invalid central directory at entry ${i}`);
      }
      const method = dv.getUint16(pos + 10, true);
      if (method !== METHOD_STORED) {
        throw new Error(`ZIPObject: unsupported compression method ${method} (only STORED/0)`);
      }
      const crc = dv.getUint32(pos + 16, true);
      const csize = dv.getUint32(pos + 20, true);
      const usize = dv.getUint32(pos + 24, true);
      if (csize !== usize) {
        throw new Error("ZIPObject: compressed size must equal uncompressed for STORED entries");
      }
      const fnLen = dv.getUint16(pos + 28, true);
      const exLen = dv.getUint16(pos + 30, true);
      const comLen = dv.getUint16(pos + 32, true);
      const localHeaderOffset = dv.getUint32(pos + 42, true);
      const nameStart = pos + 46;
      const nameEnd = nameStart + fnLen;
      if (nameEnd > cdEnd) {
        throw new Error("ZIPObject: central file name out of range");
      }
      const nameBytes = buffer.subarray(nameStart, nameEnd);
      const path = textDecoder.decode(nameBytes);
      pos = nameEnd + exLen + comLen;

      if (localHeaderOffset + 30 > buffer.length) {
        throw new Error("ZIPObject: local header out of range");
      }
      if (dv.getUint32(localHeaderOffset, true) !== SIG_LOCAL) {
        throw new Error("ZIPObject: invalid local file header");
      }
      const lMethod = dv.getUint16(localHeaderOffset + 8, true);
      if (lMethod !== METHOD_STORED) {
        throw new Error(`ZIPObject: local header compression ${lMethod} not supported`);
      }
      const lFnLen = dv.getUint16(localHeaderOffset + 26, true);
      const lExLen = dv.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + lFnLen + lExLen;
      const dataEnd = dataStart + usize;
      if (dataEnd > buffer.length) {
        throw new Error("ZIPObject: file data out of range");
      }
      const data = buffer.subarray(dataStart, dataEnd);
      out.push({ path, data, crc32: crc });
    }

    if (pos !== cdEnd) {
      throw new Error("ZIPObject: central directory size mismatch");
    }
    return out;
  }

  static #findEocdOffset(buffer: Uint8Array, dv: DataView): number {
    const min = Math.max(0, buffer.length - 65557);
    for (let i = buffer.length - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === SIG_EOCD) {
        return i;
      }
    }
    return -1;
  }

  static #gpbfForName(nameBytes: Uint8Array): number {
    for (let i = 0; i < nameBytes.length; i++) {
      if (nameBytes[i]! > 0x7f) {
        return GPBF_UTF8;
      }
    }
    return 0;
  }

  static #crc32(data: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      c ^= data[i]!;
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  static #concat(chunks: Uint8Array[]): Uint8Array {
    let len = 0;
    for (const c of chunks) {
      len += c.byteLength;
    }
    const out = new Uint8Array(len);
    let o = 0;
    for (const c of chunks) {
      out.set(c, o);
      o += c.byteLength;
    }
    return out;
  }

  static #writeLocalFileHeader(nameBytes: Uint8Array, crc: number, size: number, gpbf: number): Uint8Array {
    const header = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(header.buffer);
    let p = 0;
    dv.setUint32(p, SIG_LOCAL, true);
    p += 4;
    dv.setUint16(p, 20, true);
    p += 2;
    dv.setUint16(p, gpbf & 0xffff, true);
    p += 2;
    dv.setUint16(p, METHOD_STORED, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint32(p, crc >>> 0, true);
    p += 4;
    dv.setUint32(p, size >>> 0, true);
    p += 4;
    dv.setUint32(p, size >>> 0, true);
    p += 4;
    dv.setUint16(p, nameBytes.length, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    header.set(nameBytes, p);
    return header;
  }

  static #writeCentralDirectoryRecord(
    nameBytes: Uint8Array,
    crc: number,
    size: number,
    localHeaderOffset: number,
    gpbf: number,
  ): Uint8Array {
    const rec = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(rec.buffer);
    let p = 0;
    dv.setUint32(p, SIG_CENTRAL, true);
    p += 4;
    dv.setUint16(p, 0x0314, true);
    p += 2;
    dv.setUint16(p, 20, true);
    p += 2;
    dv.setUint16(p, gpbf & 0xffff, true);
    p += 2;
    dv.setUint16(p, METHOD_STORED, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint32(p, crc >>> 0, true);
    p += 4;
    dv.setUint32(p, size >>> 0, true);
    p += 4;
    dv.setUint32(p, size >>> 0, true);
    p += 4;
    dv.setUint16(p, nameBytes.length, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint32(p, 0, true);
    p += 4;
    dv.setUint32(p, localHeaderOffset >>> 0, true);
    p += 4;
    rec.set(nameBytes, p);
    return rec;
  }

  static #writeEndOfCentralDirectory(diskEntryCount: number, centralDirSize: number, centralDirOffset: number): Uint8Array {
    const e = new Uint8Array(22);
    const dv = new DataView(e.buffer);
    let p = 0;
    dv.setUint32(p, SIG_EOCD, true);
    p += 4;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, 0, true);
    p += 2;
    dv.setUint16(p, diskEntryCount, true);
    p += 2;
    dv.setUint16(p, diskEntryCount, true);
    p += 2;
    dv.setUint32(p, centralDirSize >>> 0, true);
    p += 4;
    dv.setUint32(p, centralDirOffset >>> 0, true);
    p += 4;
    dv.setUint16(p, 0, true);
    return e;
  }

  getExportBuffer(): Uint8Array {
    const localParts: Uint8Array[] = [];
    const meta: { nameBytes: Uint8Array; crc: number; size: number; gpbf: number; localOffset: number }[] = [];
    let cursor = 0;

    for (const e of this.#storedEntries) {
      const nameBytes = textEncoder.encode(e.path);
      const gpbf = ZIPObject.#gpbfForName(nameBytes);
      const crc = ZIPObject.#crc32(e.data);
      const size = e.data.byteLength;
      const localHeader = ZIPObject.#writeLocalFileHeader(nameBytes, crc, size, gpbf);
      meta.push({ nameBytes, crc, size, gpbf, localOffset: cursor });
      localParts.push(localHeader);
      localParts.push(e.data);
      cursor += localHeader.byteLength + size;
    }

    const centralOffset = cursor;
    const centralParts: Uint8Array[] = [];
    for (const m of meta) {
      centralParts.push(
        ZIPObject.#writeCentralDirectoryRecord(m.nameBytes, m.crc, m.size, m.localOffset, m.gpbf),
      );
    }
    const centralDir = ZIPObject.#concat(centralParts);
    const end = ZIPObject.#writeEndOfCentralDirectory(
      this.#storedEntries.length,
      centralDir.byteLength,
      centralOffset,
    );

    return ZIPObject.#concat([...localParts, centralDir, end]);
  }

  export(file: string, onExport?: Function, onError?: Function): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject("Failed to export: Missing file path.");
        return;
      }
      const buffer = this.getExportBuffer();
      GameFileSystem.writeFile(file, buffer)
        .then(() => {
          if (typeof onExport === "function") {
            onExport();
          }
          resolve();
        })
        .catch((err) => {
          console.error(err);
          if (typeof onError === "function") {
            onError(err);
          }
          reject(err);
        });
    });
  }
}

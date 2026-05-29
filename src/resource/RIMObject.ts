import * as fs from 'fs';
import * as path from 'path';
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { Endians } from "@/enums/resource/Endians";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { IRIMResource } from "@/interface/resource/IRIMResource";
import { IRIMHeader } from "@/interface/resource/IRIMHeader";

const RIM_HEADER_LENGTH = 160;
/** RIM V1.0: each resource list row is 32 bytes (resRef, type, id, offset, size), matching the key-table layout. */
const RIM_KEY_ENTRY_SIZE = 32;
const DEFAULT_RIM_RESOURCES_OFFSET = 120;

/**
 * RIMObject class.
 *
 * Class representing a RIM archive file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file RIMObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class RIMObject {
  resource_path: string;
  buffer: Uint8Array;
  inMemory: boolean = false;

  type: string = 'rim';
  group: string;
  resources: IRIMResource[] = [];
  reader: BinaryReader;
  header: IRIMHeader;
  rimDataOffset: number;

  resourceMap: Map<number, Map<string, IRIMResource>> = new Map();

  constructor(file: Uint8Array | string) {
    this.resources = [];
    this.inMemory = false;
    this.group = 'rim';
    this.type = 'rim';
    this.header = {
      fileType: 'RIM ',
      fileVersion: 'V1.0',
      resourceCount: 0,
      resourcesOffset: DEFAULT_RIM_RESOURCES_OFFSET,
    };

    if (typeof file == 'string') {
      this.resource_path = file;
      this.inMemory = false;
    } else {
      this.buffer = file;
      this.inMemory = true;
    }

    (Object.values(ResourceTypes) as unknown[]).forEach((value: unknown) => {
      if (typeof value !== 'number') return;
      this.resourceMap.set(value, new Map());
    });
  }

  static fromBufferSync(buffer: Uint8Array): RIMObject {
    const rim = new RIMObject(buffer);
    rim.readHeaderFromBuffer(buffer);
    rim.reader?.dispose();
    return rim;
  }

  async load(): Promise<RIMObject> {
    try {
      if (!this.inMemory) {
        await this.loadFromDisk(this.resource_path);
      } else {
        await this.loadFromBuffer(this.buffer);
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    return this;
  }

  readHeaderFromBuffer(buffer: Uint8Array) {
    this.reader = new BinaryReader(buffer);
    this.header = {} as IRIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    if (this.header.fileType !== 'RIM ' || this.header.fileVersion !== 'V1.0') {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    // Some vanilla-style RIMs leave the header resource-table offset as 0.
    // Treat that as the conventional fixed table start instead of rejecting it.
    if (this.header.resourcesOffset === 0) {
      this.header.resourcesOffset = DEFAULT_RIM_RESOURCES_OFFSET;
    }

    if (this.header.resourcesOffset < 20) {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    // Read from the file header through the end of the resource list (packaged data starts after this).
    this.rimDataOffset = this.header.resourcesOffset + this.header.resourceCount * RIM_KEY_ENTRY_SIZE;
    if (this.rimDataOffset > buffer.length) {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }
    const header = new Uint8Array(buffer.slice(0, this.rimDataOffset));
    this.reader = new BinaryReader(header);
    this.reader.seek(this.header.resourcesOffset);

    const resourceCount = this.header.resourceCount;
    for (let i = 0; i < resourceCount; i++) {
      this.addResource({
        resRef: normalizeResRefFromArchiveSlot(this.reader.readChars(RESREF_FIXED_SLOT_BYTES)).trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32(),
      });
    }
  }

  async readHeaderFromFileDecriptor(fd: any) {
    let header = new Uint8Array(RIM_HEADER_LENGTH);
    await GameFileSystem.read(fd, header, 0, RIM_HEADER_LENGTH, 0);
    this.reader = new BinaryReader(header);

    this.header = {} as IRIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    if (this.header.fileType !== 'RIM ' || this.header.fileVersion !== 'V1.0') {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    if (this.header.resourcesOffset === 0) {
      this.header.resourcesOffset = DEFAULT_RIM_RESOURCES_OFFSET;
    }

    if (this.header.resourcesOffset < 20) {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    // Read from the file header through the end of the resource list (packaged data starts after this).
    this.rimDataOffset = this.header.resourcesOffset + this.header.resourceCount * RIM_KEY_ENTRY_SIZE;
    if (this.rimDataOffset > RIM_HEADER_LENGTH && this.rimDataOffset < this.header.resourcesOffset) {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }
    header = new Uint8Array(this.rimDataOffset);
    await GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0);
    this.reader.reuse(header);
    this.reader.seek(this.header.resourcesOffset);

    const resourceCount = this.header.resourceCount;
    for (let i = 0; i < resourceCount; i++) {
      this.addResource({
        resRef: normalizeResRefFromArchiveSlot(this.reader.readChars(RESREF_FIXED_SLOT_BYTES)).trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32(),
      });
    }

    this.reader.dispose();
  }

  addResource(res: IRIMResource): IRIMResource;
  addResource(resRef: string, resType: number, data: Uint8Array): IRIMResource;
  addResource(resOrRef: IRIMResource | string, resType?: number, data?: Uint8Array): IRIMResource {
    const res =
      typeof resOrRef === 'string'
        ? {
            resId: this.resources.length,
            resRef: resOrRef.toLowerCase(),
            resType: resType as number,
            unused: 0,
            offset: 0,
            size: data?.length ?? 0,
            data,
          }
        : {
            ...resOrRef,
            resRef: resOrRef.resRef.toLowerCase(),
          };

    if (res.resId == null || res.resId < 0) {
      res.resId = this.resources.length;
    }

    if (res.data instanceof Uint8Array) {
      res.size = res.data.length;
    }

    let typeMap = this.resourceMap.get(res.resType);
    if (!typeMap) {
      typeMap = new Map();
      this.resourceMap.set(res.resType, typeMap);
    }
    typeMap.set(res.resRef, res);
    this.resources.push(res);
    this.header.resourceCount = this.resources.length;
    return res;
  }

  async loadFromBuffer(buffer: Uint8Array) {
    this.inMemory = true;
    const header = new Uint8Array(RIM_HEADER_LENGTH);
    header.set(buffer.slice(0, RIM_HEADER_LENGTH));
    this.reader = new BinaryReader(header);
    this.readHeaderFromBuffer(buffer);
    this.reader.dispose();
  }

  async loadFromDisk(resource_path: string) {
    const fd = await GameFileSystem.open(resource_path, 'r');
    try {
      await this.readHeaderFromFileDecriptor(fd);
    } catch (e) {
      console.error('RIM Header Read', e);
    }
    await GameFileSystem.close(fd);
  }

  getResource(resRef: string, resType: number): IRIMResource {
    let typeMap = this.resourceMap.get(resType);
    if (!typeMap) {
      return undefined;
    }
    return typeMap.get(resRef.toLowerCase());
  }

  async getResourceBuffer(resource?: IRIMResource): Promise<Uint8Array> {
    if (!resource) {
      return new Uint8Array(0);
    }

    if (resource.data instanceof Uint8Array) {
      return resource.data;
    }

    try {
      if (this.inMemory && this.buffer instanceof Uint8Array) {
        const buffer = new Uint8Array(resource.size);
        buffer.set(this.buffer.slice(resource.offset, resource.offset + resource.size));
        return buffer;
      } else {
        const fd = await this.getFileDescription();
        const buffer = new Uint8Array(resource.size);
        await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
        // Do not close fd here: getFileDescription() caches it for reuse; closing caused EBADF on subsequent reads.
        return buffer;
      }
    } catch (e) {
      console.error(e);
    }
    return new Uint8Array(0);
  }

  hasResource(resRef: string, resType: number): boolean {
    return this.getResource(resRef, resType) !== undefined;
  }

  async getResourceBufferByResRef(resRef: string = '', resType: number = 0x000f): Promise<Uint8Array> {
    const resource = this.getResource(resRef, resType);
    if (!resource) {
      return;
    }

    return await this.getResourceBuffer(resource);
  }

  #fd: any;
  async getFileDescription() {
    if (this.#fd) {
      return this.#fd;
    }
    this.#fd = await GameFileSystem.open(this.resource_path, 'r');
    return this.#fd;
  }

  async exportRawResource(directory: string, resref: string, restype = 0x000f): Promise<Uint8Array> {
    if (directory == null) {
      return new Uint8Array(0);
    }

    const resource = this.getResource(resref, restype);
    if (!resource) {
      return new Uint8Array(0);
    }

    const outputPath = path.join(directory, resref + '.' + ResourceTypes.getKeyByValue(restype));

    if (this.inMemory) {
      const buffer = new Uint8Array(this.buffer.slice(resource.offset, resource.offset + resource.size));
      if (path.isAbsolute(directory)) {
        await fs.promises.writeFile(outputPath, buffer);
      } else {
        await GameFileSystem.writeFile(outputPath, buffer);
      }
      return buffer;
    } else {
      let buffer = new Uint8Array(resource.size);
      const fd = await this.getFileDescription();
      await GameFileSystem.read(fd, buffer, 0, resource.size, resource.offset);
      if (path.isAbsolute(directory)) {
        await fs.promises.writeFile(outputPath, buffer);
      } else {
        await GameFileSystem.writeFile(outputPath, buffer);
      }
      return buffer;
    }
  }

  /**
   * Build a new RIM archive in memory
   */
  static buildFromResourceEntries(entries: { resRef: string; resType: number; data: Uint8Array }[]): Uint8Array {
    const HEADER_RES_TABLE_OFFSET = 160;
    const n = entries.length;
    const indexBytes = n * 34;
    let dataCursor = HEADER_RES_TABLE_OFFSET + indexBytes;
    const rows: { resRef: string; resType: number; resId: number; offset: number; size: number; data: Uint8Array }[] = [];
    for(let i = 0; i < n; i++){
      const e = entries[i];
      const resRef = String(e.resRef || '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 16);
      const data = e.data;
      rows.push({
        resRef,
        resType: e.resType | 0,
        resId: i,
        offset: dataCursor,
        size: data.byteLength,
        data
      });
      dataCursor += data.byteLength;
    }
    const writer = new BinaryWriter(new Uint8Array(dataCursor), Endians.LITTLE);
    writer.writeString('RIM ');
    writer.writeString('V1.0');
    writer.writeUInt32(0);
    writer.writeUInt32(n);
    writer.writeUInt32(HEADER_RES_TABLE_OFFSET);
    while(writer.tell() < HEADER_RES_TABLE_OFFSET){
      writer.writeUInt8(0);
    }
    for(const r of rows){
      writer.writeString(r.resRef.padEnd(16, '\0').substring(0, 16));
      writer.writeUInt16(r.resType & 0xffff);
      writer.writeUInt16(0);
      writer.writeUInt32(r.resId >>> 0);
      writer.writeUInt32(r.offset >>> 0);
      writer.writeUInt32(r.size >>> 0);
    }
    for(const r of rows){
      writer.writeBytes(r.data);
    }
    return writer.buffer.subarray(0, writer.tell());
  }

}

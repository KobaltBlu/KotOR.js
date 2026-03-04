import * as path from 'path';

import { IRIMResource } from '@/interface/resource/IRIMResource';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { objectToTOML, objectToXML, objectToYAML, tomlToObject, xmlToObject, yamlToObject } from "@/utility/FormatSerialization";
import { GameFileSystem } from '@/utility/GameFileSystem';
import { createScopedLogger, LogScope } from "@/utility/Logger";



const log = createScopedLogger(LogScope.Resource);
import { IRIMHeader } from '@/interface/resource/IRIMHeader';

const RIM_HEADER_LENGTH = 160;
const RIM_RESOURCE_ENTRY_SIZE = 34;

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

    if (typeof file == 'string') {
      this.resource_path = file;
      this.inMemory = false;
    } else {
      this.buffer = file;
      this.inMemory = true;
    }

    Object.values(ResourceTypes).forEach((type: number | unknown) => {
      if (typeof type !== 'number') { return; }
      this.resourceMap.set(type, new Map());
    });

  }

  /**
   * Load RIM from buffer synchronously (PyKotor read_rim parity for read_unknown_resource).
   * Populates header and resources from the buffer. getExportBuffer() requires in-memory buffer.
   */
  static fromBufferSync(buffer: Uint8Array): RIMObject {
    if (buffer.length < RIM_HEADER_LENGTH) {
      throw new Error('RIM buffer too short for header.');
    }
    const rim = new RIMObject(buffer);
    rim.reader = new BinaryReader(buffer.slice(0, RIM_HEADER_LENGTH));
    rim.header = {} as IRIMHeader;
    rim.header.fileType = rim.reader.readChars(4);
    rim.header.fileVersion = rim.reader.readChars(4);
    rim.reader.skip(4);
    rim.header.resourceCount = rim.reader.readUInt32();
    rim.header.resourcesOffset = rim.reader.readUInt32();
    rim.rimDataOffset = rim.header.resourcesOffset + rim.header.resourceCount * RIM_RESOURCE_ENTRY_SIZE;
    if (buffer.length < rim.rimDataOffset) {
      throw new Error('RIM buffer too short for structure.');
    }
    rim.reader.reuse(buffer.slice(0, rim.rimDataOffset));
    rim.reader.seek(rim.header.resourcesOffset);
    for (let i = 0; i < rim.header.resourceCount; i++) {
      rim.addResource({
        resRef: rim.reader.readChars(16).replace(/\0[\s\S]*$/g, '').trim().toLowerCase(),
        resType: rim.reader.readUInt16(),
        unused: rim.reader.readUInt16(),
        resId: rim.reader.readUInt32(),
        offset: rim.reader.readUInt32(),
        size: rim.reader.readUInt32()
      });
    }
    rim.reader.dispose();
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
      log.error(e);
      throw e;
    }
    return this;
  }

  readHeaderFromBuffer(buffer: Uint8Array) {
    this.header = {} as IRIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * RIM_RESOURCE_ENTRY_SIZE));
    const header = new Uint8Array(buffer.slice(0, this.rimDataOffset));
    this.reader = new BinaryReader(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      this.addResource({
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g, '').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      });
    }
  }

  async readHeaderFromFileDecriptor(fd: FileSystemFileHandle | number) {
    let header = new Uint8Array(RIM_HEADER_LENGTH);
    await GameFileSystem.read(fd, header, 0, RIM_HEADER_LENGTH, 0);
    this.reader = new BinaryReader(header);

    this.header = {} as IRIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * RIM_RESOURCE_ENTRY_SIZE));
    header = new Uint8Array(this.rimDataOffset);
    await GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0);
    this.reader.reuse(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      this.addResource({
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g, '').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      });
    }

    this.reader.dispose();
  }

  addResource(res: IRIMResource) {
    let typeMap = this.resourceMap.get(res.resType);
    if (!typeMap) {
      typeMap = new Map();
      this.resourceMap.set(res.resType, typeMap);
    }
    typeMap.set(res.resRef, res);
    this.resources.push(res);
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
      log.error('RIM Header Read', e);
    }
    await GameFileSystem.close(fd);
  }

  getResource(resRef: string, resType: number): IRIMResource {
    const typeMap = this.resourceMap.get(resType);
    if (!typeMap) {
      return undefined;
    }
    return typeMap.get(resRef.toLowerCase());
  }

  async getResourceBuffer(resource?: IRIMResource): Promise<Uint8Array> {
    if (!resource) {
      return new Uint8Array(0);
    }

    try {
      if (this.inMemory && this.buffer instanceof Uint8Array) {
        const buffer = new Uint8Array(resource.size);
        buffer.set(this.buffer.slice(resource.offset, resource.offset + resource.size));
        return buffer;
      } else {
        // Open fresh fd per call to avoid EBADF when InitModuleCache runs parallel reads.
        // A shared cached fd would be closed by one caller while others still need it.
        const fd = await GameFileSystem.open(this.resource_path, 'r');
        try {
          const buffer = new Uint8Array(resource.size);
          await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
          return buffer;
        } finally {
          await GameFileSystem.close(fd);
        }
      }
    }
    catch (e) {
      log.error(e);
    }
    return new Uint8Array(0);
  }

  hasResource(resRef: string, resType: number): boolean {
    return this.getResource(resRef, resType) !== undefined;
  }

  async getResourceBufferByResRef(resRef: string = '', resType: number = 0x000F): Promise<Uint8Array> {
    const resource = this.getResource(resRef, resType);
    if (!resource) {
      return;
    }

    return await this.getResourceBuffer(resource);
  }

  toJSON(): { header: { fileType: string; fileVersion: string; resourceCount: number }; resources: Array<{ resRef: string; resType: number; resId: number; offset: number; size: number }> } {
    return {
      header: {
        fileType: this.header?.fileType ?? 'RIM ',
        fileVersion: this.header?.fileVersion ?? 'V1.0',
        resourceCount: this.resources?.length ?? 0
      },
      resources: (this.resources ?? []).map(r => ({ resRef: r.resRef, resType: r.resType, resId: r.resId, offset: r.offset, size: r.size }))
    };
  }

  fromJSON(json: string | ReturnType<RIMObject['toJSON']>): void {
    const obj = typeof json === 'string' ? (JSON.parse(json) as ReturnType<RIMObject['toJSON']>) : json;
    this.header = { ...this.header, ...obj.header } as IRIMHeader;
    this.resources = (obj.resources ?? []).map((r: { resRef: string; resType: number; resId: number; offset: number; size: number }) => ({
      resRef: r.resRef ?? '', resType: r.resType ?? 0, unused: 0, resId: r.resId ?? 0, offset: r.offset ?? 0, size: r.size ?? 0
    })) as IRIMResource[];
  }

  toXML(): string { return objectToXML(this.toJSON()); }
  fromXML(xml: string): void { this.fromJSON(xmlToObject(xml) as ReturnType<RIMObject['toJSON']>); }
  toYAML(): string { return objectToYAML(this.toJSON()); }
  fromYAML(yaml: string): void { this.fromJSON(yamlToObject(yaml) as ReturnType<RIMObject['toJSON']>); }
  toTOML(): string { return objectToTOML(this.toJSON()); }
  fromTOML(toml: string): void { this.fromJSON(tomlToObject(toml) as ReturnType<RIMObject['toJSON']>); }

  /**
   * Serialize RIM to binary (PyKotor bytes_rim parity). Only valid when loaded from buffer (in memory).
   */
  getExportBuffer(): Uint8Array {
    if (!this.inMemory || !this.buffer) {
      throw new Error('RIMObject.getExportBuffer requires in-memory buffer (load from buffer first).');
    }
    const output = new BinaryWriter();
    const resourcesOffset = RIM_HEADER_LENGTH;
    let dataOffset = resourcesOffset + this.resources.length * RIM_RESOURCE_ENTRY_SIZE;
    output.writeString((this.header.fileType ?? 'RIM ').slice(0, 4).padEnd(4, '\0').slice(0, 4));
    output.writeString((this.header.fileVersion ?? 'V1.0').slice(0, 4).padEnd(4, '\0').slice(0, 4));
    output.writeBytes(new Uint8Array(4));
    output.writeUInt32(this.resources.length);
    output.writeUInt32(resourcesOffset);
    const padding = RIM_HEADER_LENGTH - (4 + 4 + 4 + 4 + 4);
    if (padding > 0) output.writeBytes(new Uint8Array(padding));
    const resourceData: Uint8Array[] = [];
    for (const res of this.resources) {
      output.writeString(res.resRef.padEnd(16, '\0').slice(0, 16));
      output.writeUInt16(res.resType);
      output.writeUInt16(res.unused ?? 0);
      output.writeUInt32(res.resId);
      output.writeUInt32(dataOffset);
      output.writeUInt32(res.size);
      if (res.offset + res.size <= this.buffer.length) {
        resourceData.push(this.buffer.slice(res.offset, res.offset + res.size));
      } else {
        resourceData.push(new Uint8Array(0));
      }
      dataOffset += res.size;
    }
    for (const chunk of resourceData) {
      output.writeBytes(chunk);
    }
    return output.buffer;
  }

  async exportRawResource(directory: string, resref: string, restype = 0x000F): Promise<Uint8Array> {
    if (directory == null) {
      return new Uint8Array(0);
    }

    const resource = this.getResource(resref, restype);
    if (!resource) {
      return new Uint8Array(0);
    }

    if (this.inMemory) {
      const buffer = new Uint8Array(this.buffer.slice(resource.offset, resource.offset + resource.size));
      await GameFileSystem.writeFile(path.join(directory, resref + '.' + ResourceTypes.getKeyByValue(restype)), buffer);
      return buffer;
    } else {
      const buffer = new Uint8Array(resource.size);
      const fd = await GameFileSystem.open(this.resource_path, 'r');
      try {
        await GameFileSystem.read(fd, buffer, 0, resource.size, resource.offset);
        await GameFileSystem.writeFile(
          path.join(directory, resref + '.' + ResourceTypes.getKeyByValue(restype)), buffer
        );
        return buffer;
      } finally {
        await GameFileSystem.close(fd);
      }
    }
  }

}

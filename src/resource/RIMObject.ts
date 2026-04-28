import * as fs from 'fs';
import * as path from 'path';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { IRIMResource } from '@/interface/resource/IRIMResource';
import { IRIMHeader } from '@/interface/resource/IRIMHeader';
import {
  objectToTOML,
  objectToXML,
  objectToYAML,
  tomlToObject,
  xmlToObject,
  yamlToObject,
} from '@/utility/FormatSerialization';

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
        resRef: this.reader
          .readChars(16)
          .replace(/\0[\s\S]*$/g, '')
          .trim()
          .toLowerCase(),
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
        resRef: this.reader
          .readChars(16)
          .replace(/\0[\s\S]*$/g, '')
          .trim()
          .toLowerCase(),
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

  private getInlineResourceData(resource: IRIMResource): Uint8Array | null {
    if (resource.data instanceof Uint8Array) {
      return resource.data;
    }

    if (this.inMemory && this.buffer instanceof Uint8Array) {
      return new Uint8Array(this.buffer.slice(resource.offset, resource.offset + resource.size));
    }

    return null;
  }

  private buildExportBufferFromResources(resources: Array<IRIMResource & { data: Uint8Array }>): Uint8Array {
    const writer = new BinaryWriter();
    const headerSize = DEFAULT_RIM_RESOURCES_OFFSET;
    const entrySize = RIM_KEY_ENTRY_SIZE;

    this.header.fileType = this.header.fileType || 'RIM ';
    this.header.fileVersion = this.header.fileVersion || 'V1.0';
    this.header.resourceCount = resources.length;
    this.header.resourcesOffset = DEFAULT_RIM_RESOURCES_OFFSET;

    let currentOffset = headerSize + resources.length * entrySize;
    resources.forEach((resource, index) => {
      resource.resId = index;
      resource.offset = currentOffset;
      resource.size = resource.data.length;
      currentOffset += resource.size;
    });

    writer.writeChars(this.header.fileType);
    writer.writeChars(this.header.fileVersion);
    writer.writeUInt32(0);
    writer.writeUInt32(resources.length);
    writer.writeUInt32(this.header.resourcesOffset);
    writer.writeBytes(new Uint8Array(headerSize - writer.tell()));

    resources.forEach((resource) => {
      writer.writeString(resource.resRef.padEnd(16, '\0').slice(0, 16));
      writer.writeUInt16(resource.resType);
      writer.writeUInt16(resource.unused ?? 0);
      writer.writeUInt32(resource.resId);
      writer.writeUInt32(resource.offset);
      writer.writeUInt32(resource.size);
    });

    resources.forEach((resource) => {
      writer.writeBytes(resource.data);
    });

    return writer.buffer;
  }

  getExportBuffer(): Uint8Array {
    const resources = this.resources.map((resource) => {
      const data = this.getInlineResourceData(resource);
      if (!(data instanceof Uint8Array)) {
        throw new Error('RIM resource data is not loaded in memory; use export() for disk-backed archives.');
      }
      return {
        ...resource,
        data,
      };
    });

    return this.buildExportBufferFromResources(resources);
  }

  async export(file: string): Promise<void> {
    if (!file) {
      throw new Error('Failed to export: Missing file path.');
    }

    const resources = await Promise.all(
      this.resources.map(async (resource) => ({
        ...resource,
        data: await this.getResourceBuffer(resource),
      }))
    );

    const buffer = this.buildExportBufferFromResources(resources as Array<IRIMResource & { data: Uint8Array }>);

    if (path.isAbsolute(file)) {
      await fs.promises.writeFile(file, buffer);
      return;
    }

    await GameFileSystem.writeFile(file, buffer);
  }

  toJSON(): { header: IRIMHeader; resources: IRIMResource[]; type: string; group: string } {
    return {
      header: { ...this.header },
      resources: this.resources.map((resource) => ({
        ...resource,
        data: resource.data ? Uint8Array.from(resource.data) : undefined,
      })),
      type: this.type || 'rim',
      group: this.group || 'rim',
    };
  }

  fromJSON(json: string | ReturnType<RIMObject['toJSON']>): void {
    const data = typeof json === 'string' ? (JSON.parse(json) as ReturnType<RIMObject['toJSON']>) : json;
    this.header = { ...data.header };
    this.type = data.type || 'rim';
    this.group = data.group || 'rim';
    this.resources = [];
    this.resourceMap.clear();
    (data.resources || []).forEach((resource) => this.addResource({ ...resource }));
  }

  toXML(): string {
    return objectToXML({ json: JSON.stringify(this.toJSON()) });
  }
  fromXML(xml: string): void {
    const data = xmlToObject(xml) as { json?: string } | ReturnType<RIMObject['toJSON']>;
    if (typeof (data as { json?: string }).json === 'string') {
      this.fromJSON((data as { json: string }).json);
      return;
    }
    this.fromJSON(data as ReturnType<RIMObject['toJSON']>);
  }
  toYAML(): string {
    return objectToYAML(this.toJSON());
  }
  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as ReturnType<RIMObject['toJSON']>);
  }
  toTOML(): string {
    return objectToTOML(this.toJSON());
  }
  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as ReturnType<RIMObject['toJSON']>);
  }
}

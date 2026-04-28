import { BinaryReader } from '@/utility/binary/BinaryReader';
import * as path from 'path';
import { KEYManager } from '@/managers/KEYManager';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { IResourceDiskInfo } from '@/interface/resource/IResourceDiskInfo';
import { IBIFResource } from '@/interface/resource/IBIFResource';
import {
  objectToTOML,
  objectToXML,
  objectToYAML,
  tomlToObject,
  xmlToObject,
  yamlToObject,
} from '@/utility/FormatSerialization';

/** Fixed header: signature and version (8), variable and fixed entry counts (8), offset to the variable index table (4) — 20 bytes total. */
const BIF_HEADER_SIZE = 20;

/**
 * BIFObject class.
 *
 * Class representing a BIF archive file in memory.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file BIFObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BIFObject {
  resource_path: string;
  buffer: Uint8Array;
  inMemory: boolean = false;

  fileType: string;
  fileVersion: string;
  variableResourceCount: number;
  fixedResourceCount: number;
  variableTableOffset: number;
  variableTableRowSize: number;
  variableTableSize: number;
  reader: BinaryReader;

  resourceDiskInfo: IResourceDiskInfo;
  resources: IBIFResource[] = [];
  file: string;

  constructor(file: Uint8Array | string) {
    this.resourceDiskInfo = {
      path: '',
      existsOnDisk: false,
    } as IResourceDiskInfo;

    this.resources = [];

    if (file instanceof Uint8Array) {
      this.buffer = file;
      this.inMemory = true;
      this.resourceDiskInfo.path = '';
      this.resourceDiskInfo.existsOnDisk = false;
    } else if (typeof file === 'string') {
      this.file = file;
      this.inMemory = false;
      this.buffer = new Uint8Array(0);
      this.resourceDiskInfo.path = file;
      this.resourceDiskInfo.existsOnDisk = true;
      this.resourceDiskInfo.pathInfo = path.parse(this.resourceDiskInfo.path);
    }
  }

  async load(): Promise<BIFObject> {
    if (this.inMemory) {
      this.readFromMemory();
    } else {
      await this.readFromDisk();
    }

    return this;
  }

  readFromMemory() {
    if (!this.inMemory || !(this.buffer instanceof Uint8Array)) {
      throw new Error('BIFObject.readFromMemory requires an in-memory buffer');
    }
    if (this.buffer.length < BIF_HEADER_SIZE) {
      throw new Error('BIF buffer too short for header');
    }

    this.reader = new BinaryReader(this.buffer);
    this.fileType = this.reader.readChars(4);
    this.fileVersion = this.reader.readChars(4);
    this.variableResourceCount = this.reader.readUInt32();
    this.fixedResourceCount = this.reader.readUInt32();
    this.variableTableOffset = this.reader.readUInt32();

    if (this.fileType !== 'BIFF' || this.fileVersion !== 'V1  ') {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    this.variableTableRowSize = 16;
    this.variableTableSize = this.variableResourceCount * this.variableTableRowSize;
    this.resources = [];

    // Variable index: one row per entry; each row is four little-endian dwords (id, data offset, size, type id).
    this.reader.seek(this.variableTableOffset);
    for (let i = 0; i < this.variableResourceCount; i++) {
      this.resources.push({
        Id: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32(),
        resType: this.reader.readUInt32(),
      } as IBIFResource);
    }
  }

  async readFromDisk() {
    const fd = await GameFileSystem.open(this.resourceDiskInfo.path, 'r');
    const header = new Uint8Array(BIF_HEADER_SIZE);
    await GameFileSystem.read(fd, header, 0, BIF_HEADER_SIZE, 0);
    this.reader = new BinaryReader(header);

    this.fileType = this.reader.readChars(4);
    this.fileVersion = this.reader.readChars(4);
    this.variableResourceCount = this.reader.readUInt32();
    this.fixedResourceCount = this.reader.readUInt32();
    this.variableTableOffset = this.reader.readUInt32();

    if (this.fileType !== 'BIFF' || this.fileVersion !== 'V1  ') {
      throw new Error('Tried to save or load an unsupported or corrupted file.');
    }

    this.variableTableRowSize = 16;
    this.variableTableSize = this.variableResourceCount * this.variableTableRowSize;

    const variableTable: Uint8Array = new Uint8Array(this.variableTableSize);
    await GameFileSystem.read(fd, variableTable, 0, this.variableTableSize, this.variableTableOffset);
    this.reader.reuse(variableTable);
    for (let i = 0; i < this.variableResourceCount; i++) {
      this.resources[i] = {
        Id: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32(),
        resType: this.reader.readUInt32(),
      } as IBIFResource;
    }

    this.reader.dispose();

    await GameFileSystem.close(fd);
  }

  getResourceById(id: number) {
    if (id != null) {
      for (let i = 0; i < this.variableResourceCount; i++) {
        if (this.resources[i].Id == id) {
          return this.resources[i];
        }
      }
    }
    return null;
  }

  getResourcesByType(ResType: number) {
    const arr: IBIFResource[] = [];
    if (ResType != null) {
      for (let i = 0; i < this.variableResourceCount; i++) {
        if (this.resources[i].resType == ResType) {
          arr.push(this.resources[i]);
        }
      }
    }
    return arr;
  }

  getResource(resRef: string, ResType: number): IBIFResource | undefined {
    if (resRef == null) {
      return undefined;
    }

    const len = KEYManager.Key.keys.length;
    for (let i = 0; i < len; i++) {
      const key = KEYManager.Key.keys[i];
      if (key.resRef == resRef && key.resType == ResType) {
        for (let j = 0; j != this.resources.length; j++) {
          const res = this.resources[j];
          if (res.Id == key.resId && res.resType == ResType) {
            return res;
          }
        }
      }
    }
  }

  async getResourceBuffer(res?: IBIFResource): Promise<Uint8Array> {
    if (!res) {
      return new Uint8Array(0);
    }
    if (!res.size) {
      return new Uint8Array(0);
    }

    if (this.inMemory && this.buffer instanceof Uint8Array) {
      return this.buffer.slice(res.offset, res.offset + res.size);
    }

    try {
      const fd = await GameFileSystem.open(this.resourceDiskInfo.path, 'r');
      const buffer = new Uint8Array(res.size);
      await GameFileSystem.read(fd, buffer, 0, buffer.length, res.offset);
      await GameFileSystem.close(fd);

      return buffer;
    } catch (e) {
      return new Uint8Array(0);
    }
  }

  async getResourceBufferByResRef(resRef: string, resType: number): Promise<Uint8Array> {
    const resource = this.getResource(resRef, resType);
    if (typeof resource === 'undefined') {
      console.error('getResourceBufferByResRef', resRef, resType, resource);
      return new Uint8Array(0);
    }

    return await this.getResourceBuffer(resource);
  }

  toJSON(): {
    fileType: string;
    fileVersion: string;
    variableResourceCount: number;
    fixedResourceCount: number;
    variableTableOffset: number;
    resources: IBIFResource[];
  } {
    return {
      fileType: this.fileType,
      fileVersion: this.fileVersion,
      variableResourceCount: this.variableResourceCount,
      fixedResourceCount: this.fixedResourceCount,
      variableTableOffset: this.variableTableOffset,
      resources: this.resources.map((resource) => ({ ...resource })),
    };
  }

  fromJSON(json: string | ReturnType<BIFObject['toJSON']>): void {
    const data = typeof json === 'string' ? (JSON.parse(json) as ReturnType<BIFObject['toJSON']>) : json;
    this.fileType = data.fileType;
    this.fileVersion = data.fileVersion;
    this.variableResourceCount = data.variableResourceCount;
    this.fixedResourceCount = data.fixedResourceCount;
    this.variableTableOffset = data.variableTableOffset;
    this.resources = (data.resources || []).map((resource) => ({ ...resource }));
    this.variableTableRowSize = 16;
    this.variableTableSize = this.variableResourceCount * this.variableTableRowSize;
  }

  toXML(): string {
    return objectToXML({ json: JSON.stringify(this.toJSON()) });
  }
  fromXML(xml: string): void {
    const data = xmlToObject(xml) as { json?: string } | ReturnType<BIFObject['toJSON']>;
    if (typeof (data as { json?: string }).json === 'string') {
      this.fromJSON((data as { json: string }).json);
      return;
    }
    this.fromJSON(data as ReturnType<BIFObject['toJSON']>);
  }
  toYAML(): string {
    return objectToYAML(this.toJSON());
  }
  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as ReturnType<BIFObject['toJSON']>);
  }
  toTOML(): string {
    return objectToTOML(this.toJSON());
  }
  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as ReturnType<BIFObject['toJSON']>);
  }

  /*load( path: string, onLoad?: Function, onError?: Function ){

    let pathInfo = Utility.filePathInfo(path);

    if(pathInfo.location == 'archive' && pathInfo.archive.type == 'bif'){
      let key = KEYManager.Key.GetFileKey(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
      if(key != null){
        const res = this.getResource(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
        if(res){
          this.getResourceBuffer(res).then( (buffer: Uint8Array) => {
            if(typeof onLoad === 'function')
              onLoad(buffer);
          }, (_e: unknown) => {
            if(typeof onError === 'function')
              onError('Resource not found in BIF archive '+pathInfo.archive.name);
          });
        }else{
          if(typeof onError === 'function')
            onError('Resource not found in BIF archive '+pathInfo.archive.name);
        }
      }
    }else{
      if(typeof onError === 'function')
        onError('Path is not pointing to a resource inside of a BIF archive');
    }

  }*/
}

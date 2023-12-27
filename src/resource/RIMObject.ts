/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import isBuffer from 'is-buffer';
import * as path from 'path';
import { BinaryReader } from '../BinaryReader';
import { GameFileSystem } from '../utility/GameFileSystem';
import { ResourceTypes } from './ResourceTypes';

/* @file
 * The RIMObject class.
 */

export interface RIMHeader {
  fileType: string;
  fileVersion: string;
  resourceCount: number;
  resourcesOffset: number;
}

export interface RIMResource {
  resRef: string;
  resType: number;
  unused: number;
  resId: number;
  offset: number;
  size: number;
}

const RIM_HEADER_LENGTH = 160;

export class RIMObject {
  resource_path: string;
  buffer: Buffer;
  inMemory: boolean = false;

  group: string;
  resources: RIMResource[] = [];
  reader: BinaryReader;
  header: RIMHeader;
  rimDataOffset: number;

  constructor(file: Buffer|string){

    this.resources = [];
    this.inMemory = false;

    if(typeof file == 'string'){
      this.resource_path = file;
      this.inMemory = false;
    }else if(isBuffer(file)){
      this.buffer = file;
      this.inMemory = true;
    }

  }

  async load(): Promise<RIMObject> {
    try{
      if(!this.inMemory){
        await this.loadFromDisk(this.resource_path);
      }else{
        await this.loadFromBuffer(this.buffer);
      }
    }catch(e){
      console.error(e);
      throw e;
    }
    return this;
  }

  readHeaderFromBuffer(buffer: Buffer){
    this.header = {} as RIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * 34));
    const header = Buffer.from(buffer, 0, this.rimDataOffset);
    this.reader = new BinaryReader(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      const res = {
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      };
      this.resources.push(res);
    }
  }

  async readHeaderFromFileDecriptor(fd: any){
    let header = Buffer.allocUnsafe(RIM_HEADER_LENGTH);
    await GameFileSystem.read(fd, header, 0, RIM_HEADER_LENGTH, 0);
    this.reader = new BinaryReader(header);

    this.header = {} as RIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * 34));
    header = Buffer.allocUnsafe(this.rimDataOffset);
    await GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0);
    this.reader.reuse(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      const res: RIMResource = {
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      } as RIMResource;
      this.resources.push(res);
    }

    this.reader.dispose();
  }

  async loadFromBuffer(buffer: Buffer){
    this.inMemory = true;
    let header = Buffer.from(buffer, 0, RIM_HEADER_LENGTH);
    this.reader = new BinaryReader(header);
    this.readHeaderFromBuffer(buffer);
    this.reader.dispose();
  }

  async loadFromDisk(resource_path: string){
    const fd = await GameFileSystem.open(resource_path, 'r');
    try{
      await this.readHeaderFromFileDecriptor(fd);
    }catch(e){
      console.error('RIM Header Read', e);
    }
    await GameFileSystem.close(fd);
  }

  getResource(resRef: string, resType: number): RIMResource {
    resRef = resRef.toLowerCase();
    for(let i = 0; i < this.resources.length; i++){
      let key = this.resources[i];
      if (key.resRef == resRef && key.resType == resType) {
        return key;
      }
    };
    return;
  }

  async getResourceBuffer(resource?: RIMResource): Promise<Buffer> {
    if(!resource){
      return Buffer.allocUnsafe(0);
    }

    try {
      if(this.inMemory && isBuffer(this.buffer)){
        const buffer = Buffer.alloc(resource.size);
        this.buffer.copy(buffer, 0, resource.offset, resource.offset + (resource.size - 1));
        return buffer;
      }else{
        const fd = await GameFileSystem.open(this.resource_path, 'r');
        const buffer = Buffer.alloc(resource.size);
        await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
        await GameFileSystem.close(fd);
        return buffer;
      }
    }
    catch (e) {
      console.error(e);
    }
    return Buffer.allocUnsafe(0);
  }

  async getResourceBufferByResRef(resRef: string = '', resType: number = 0x000F): Promise<Buffer> {
    const resource = this.getResource(resRef, resType);
    if(!resource){
      return;
    }

    return await this.getResourceBuffer(resource);
  }

  async exportRawResource(directory: string, resref: string, restype = 0x000F): Promise<Buffer> {
    if(directory == null){
      return Buffer.allocUnsafe(0);
    }

    const resource = this.getResource(resref, restype);
    if(!resource){
      return Buffer.allocUnsafe(0);
    }
    
    if(this.inMemory){
      const buffer = Buffer.from(this.buffer, resource.offset, resource.offset + (resource.size - 1));
      await GameFileSystem.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer);
      return buffer;
    }else{
      let buffer = Buffer.alloc(resource.size);
      const fd = await GameFileSystem.open(this.resource_path, 'r');
      await GameFileSystem.read(fd, buffer, 0, resource.size, resource.offset);
      console.log('RIM Export', 'Writing File', path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)));
      await GameFileSystem.writeFile(
        path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer
      );
      return buffer;
    }
  }

}

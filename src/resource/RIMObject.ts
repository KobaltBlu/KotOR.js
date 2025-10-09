import * as path from 'path';
import { BinaryReader } from '../utility/binary/BinaryReader';
import { GameFileSystem } from '../utility/GameFileSystem';
import { ResourceTypes } from './ResourceTypes';
import { IRIMResource } from '../interface/resource/IRIMResource';
import { IRIMHeader } from '../interface/resource/IRIMHeader';

const RIM_HEADER_LENGTH = 160;

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

  constructor(file: Uint8Array|string){

    this.resources = [];
    this.inMemory = false;

    if(typeof file == 'string'){
      this.resource_path = file;
      this.inMemory = false;
    }else{
      this.buffer = file;
      this.inMemory = true;
    }

    Object.values(ResourceTypes).forEach((type: number) => {
      if(typeof type !== 'number'){ return; }
      this.resourceMap.set(type, new Map());
    });

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

  readHeaderFromBuffer(buffer: Uint8Array){
    this.header = {} as IRIMHeader;

    this.header.fileType = this.reader.readChars(4);
    this.header.fileVersion = this.reader.readChars(4);

    this.reader.skip(4);

    this.header.resourceCount = this.reader.readUInt32();
    this.header.resourcesOffset = this.reader.readUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * 34));
    const header = new Uint8Array(buffer.slice(0, this.rimDataOffset));
    this.reader = new BinaryReader(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      this.addResource({
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      });
    }
  }

  async readHeaderFromFileDecriptor(fd: any){
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
    this.rimDataOffset = (this.header.resourcesOffset + (this.header.resourceCount * 34));
    header = new Uint8Array(this.rimDataOffset);
    await GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0);
    this.reader.reuse(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      this.addResource({
        resRef: this.reader.readChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
        resType: this.reader.readUInt16(),
        unused: this.reader.readUInt16(),
        resId: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32()
      });
    }

    this.reader.dispose();
  }

  addResource(res: IRIMResource){
    let typeMap = this.resourceMap.get(res.resType);
    if(!typeMap){
      typeMap = new Map();
      this.resourceMap.set(res.resType, typeMap);
    }
    typeMap.set(res.resRef, res);
    this.resources.push(res);
  }

  async loadFromBuffer(buffer: Uint8Array){
    this.inMemory = true;
    const header = new Uint8Array(RIM_HEADER_LENGTH);
    header.set(buffer.slice(0, RIM_HEADER_LENGTH));
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

  getResource(resRef: string, resType: number): IRIMResource {
    let typeMap = this.resourceMap.get(resType);
    if(!typeMap){
      return undefined;
    }
    return typeMap.get(resRef.toLowerCase());
  }

  async getResourceBuffer(resource?: IRIMResource): Promise<Uint8Array> {
    if(!resource){
      return new Uint8Array(0);
    }

    try {
      if(this.inMemory && this.buffer instanceof Uint8Array){
        const buffer = new Uint8Array(resource.size);
        buffer.set(this.buffer.slice(resource.offset, resource.offset + (resource.size - 1)));
        return buffer;
      }else{
        const fd = await this.getFileDescription();
        const buffer = new Uint8Array(resource.size);
        await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
        await GameFileSystem.close(fd);
        return buffer;
      }
    }
    catch (e) {
      console.error(e);
    }
    return new Uint8Array(0);
  }

  async getResourceBufferByResRef(resRef: string = '', resType: number = 0x000F): Promise<Uint8Array> {
    const resource = this.getResource(resRef, resType);
    if(!resource){
      return;
    }

    return await this.getResourceBuffer(resource);
  }

  #fd: any;
  async getFileDescription(){
    if(this.#fd){
      return this.#fd;
    }
    this.#fd = await GameFileSystem.open(this.resource_path, 'r');
    return this.#fd;
  }

  async exportRawResource(directory: string, resref: string, restype = 0x000F): Promise<Uint8Array> {
    if(directory == null){
      return new Uint8Array(0);
    }

    const resource = this.getResource(resref, restype);
    if(!resource){
      return new Uint8Array(0);
    }
    
    if(this.inMemory){
      const buffer = new Uint8Array(this.buffer.slice(resource.offset, resource.offset + (resource.size - 1)));
      await GameFileSystem.writeFile(path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer);
      return buffer;
    }else{
      let buffer = new Uint8Array(resource.size);
      const fd = await this.getFileDescription();
      await GameFileSystem.read(fd, buffer, 0, resource.size, resource.offset);
      // console.log('RIM Export', 'Writing File', path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)));
      await GameFileSystem.writeFile(
        path.join(directory, resref+'.'+ResourceTypes.getKeyByValue(restype)), buffer
      );
      return buffer;
    }
  }

}

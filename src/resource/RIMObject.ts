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

export class RIMObject {
  resource_path: string;
  buffer: Buffer;
  inMemory: boolean = false;

  group: string;
  resources: RIMResource[];
  headerLength: number;
  reader: BinaryReader;
  header: RIMHeader;
  rimDataOffset: number;

  constructor(file: Buffer|string){

    this.resources = [];
    this.headerLength = 160;

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
    let header = Buffer.from(buffer, 0, this.rimDataOffset);
    this.reader = new BinaryReader(header);
    this.reader.seek(this.header.resourcesOffset);

    for (let i = 0; i < this.header.resourceCount; i++) {
      let res = {
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

  readHeaderFromFileDecriptor(fd: any){
    return new Promise<void>( (resolve, reject) => {
      let header = Buffer.allocUnsafe(this.headerLength);
      GameFileSystem.read(fd, header, 0, this.headerLength, 0).then( () => {
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
        GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0).then( () => {
          this.reader.reuse(header);
          this.reader.seek(this.header.resourcesOffset);

          for (let i = 0; i < this.header.resourceCount; i++) {
            let res: RIMResource = {
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
          resolve();
        }).catch( (err) => {
          console.error(err);
        });
      }).catch( (err) => {
        console.error(err);
      });
    });
  }

  loadFromBuffer(buffer: Buffer){
    return new Promise<RIMObject>( (resolve, reject) => {
      this.inMemory = true;
      let header = Buffer.from(buffer, 0, this.headerLength);
      this.reader = new BinaryReader(header);
      this.readHeaderFromBuffer(buffer);
      this.reader.dispose();
      resolve(this);
    });
  }

  loadFromDisk(resource_path: string){
    return new Promise<RIMObject>( (resolve, reject) => {
      GameFileSystem.open(resource_path, 'r').then( (fd) => {
        
        try{
          this.readHeaderFromFileDecriptor(fd).then( () => {
            GameFileSystem.close(fd).then( () => {
              resolve(this);
            });
          }).catch( (err) => {
            console.error('RIM Header Read', err);
            GameFileSystem.close(fd).then( () => {
              resolve(this);
            });
          });
        }catch(e){
          GameFileSystem.close(fd).then( () => {
            resolve(this);
          });
        }

      }).catch( (err: any) => {
        console.error('RIM Header Read', err);
        reject(err);
        return;
      });
    });
  }

  async getRawResource(resRef: string = '', resType: number = 0x000F): Promise<Buffer> {
    let buffer = Buffer.allocUnsafe(0);

    for(let i = 0; i < this.resources.length; i++){
      let resource: RIMResource = this.resources[i];
      if (resource.resRef == resRef && resource.resType == resType) {
        try {
          if(this.inMemory && isBuffer(this.buffer)){
            buffer = Buffer.alloc(resource.size);
            this.buffer.copy(buffer, 0, resource.offset, resource.offset + (resource.size - 1));
          }else{
            const fd = await GameFileSystem.open(this.resource_path, 'r');
            buffer = Buffer.alloc(resource.size);
            await GameFileSystem.read(fd, buffer, 0, buffer.length, resource.offset);
            await GameFileSystem.close(fd);
          }
        } catch (e) {
          console.error('getRawResource', e);
        }
        break;
      }
    }
    
    return buffer;

  }

  getResourceByKey(resRef: string, resType: number): RIMResource|undefined {
    resRef = resRef.toLowerCase();
    for(let i = 0; i < this.resources.length; i++){
      let key = this.resources[i];
      if (key.resRef == resRef && key.resType == resType) {
        return key;
      }
    };
    return;
  }

  getResourceByLabel(label: string, ResType: number){
    return this.getResourceByKey(label, ResType);
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

  async exportRawResource(directory: string, resref: string, restype = 0x000F): Promise<Buffer> {
    if(directory == null){
      return Buffer.allocUnsafe(0);
    }

    const resource = this.getResourceByKey(resref, restype);
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
    return Buffer.allocUnsafe(0);
  }

  async getResourceByKeyAsync(key: RIMResource): Promise<Buffer> {
    return await this.getRawResource(key.resRef, key.resType);
  }

  async getResourceDataAsync(resref: string, restype: number): Promise<Buffer> {
    return await this.getRawResource(resref, restype);
  }

}

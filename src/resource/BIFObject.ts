/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import * as fs from 'fs';
import * as path from 'path';
import { Utility } from "../utility/Utility";
import { KEYManager } from "../managers/KEYManager";
import { ResourceTypes } from "./ResourceTypes";
import isBuffer from "is-buffer";
import { GameFileSystem } from "../utility/GameFileSystem";

/* @file
 * The BIFObject class.
 */

export interface IResourceDiskInfo {
  pathInfo: path.ParsedPath;
  path: string;
  existsOnDisk: boolean;
}

export interface BIFResource {
  Id: number;
  offset: number;
  size: number;
  resType: number;
}

const BIF_HEADER_SIZE = 20;

export class BIFObject {
  resource_path: string;
  buffer: Buffer;
  inMemory: boolean = false;

  fileType: any;
  fileVersion: any;
  variableResourceCount: any;
  fixedResourceCount: any;
  variableTableOffset: any;
  variableTableRowSize: number;
  variableTableSize: number;
  reader: BinaryReader;

  resourceDiskInfo: IResourceDiskInfo;
  resources: BIFResource[];
  file: string;

  constructor(file: Buffer|string){

    this.resourceDiskInfo = {
      path: '',
      existsOnDisk: false,
    } as IResourceDiskInfo;

    this.resources = [];

    if(isBuffer(file)){
      this.buffer = file as Buffer;
      this.inMemory = true;
      this.resourceDiskInfo.path = '';
      this.resourceDiskInfo.existsOnDisk = false;
    }else if(typeof file === 'string'){
      this.file = file;
      this.inMemory = false;
      this.buffer = Buffer.allocUnsafe(0);
      this.resourceDiskInfo.path = file;
      this.resourceDiskInfo.existsOnDisk = true;
      this.resourceDiskInfo.pathInfo = path.parse(this.resourceDiskInfo.path);
    }

  }

  async load(): Promise<BIFObject>{

    if(this.inMemory){
      this.readFromMemory();
    }else{
      await this.readFromDisk();
    }

    return this;

  }

  readFromMemory(){
    //TODO
  }

  async readFromDisk(){
    const fd = await GameFileSystem.open(this.resourceDiskInfo.path, 'r');
    const header = Buffer.alloc(BIF_HEADER_SIZE);
    await GameFileSystem.read(fd, header, 0, BIF_HEADER_SIZE, 0)
    this.reader = new BinaryReader(header);

    this.fileType = this.reader.readChars(4);
    this.fileVersion = this.reader.readChars(4);
    this.variableResourceCount = this.reader.readUInt32();
    this.fixedResourceCount = this.reader.readUInt32();
    this.variableTableOffset = this.reader.readUInt32();

    this.variableTableRowSize = 16;
    this.variableTableSize = this.variableResourceCount * this.variableTableRowSize;

    //Read variable tabs blocks
    const variableTable: Buffer = Buffer.alloc(this.variableTableSize);
    await GameFileSystem.read(fd, variableTable, 0, this.variableTableSize, this.variableTableOffset);
    this.reader.reuse(variableTable);
    for(let i = 0; i < this.variableResourceCount; i++){
      this.resources[i] = {
        Id: this.reader.readUInt32(),
        offset: this.reader.readUInt32(),
        size: this.reader.readUInt32(),
        resType: this.reader.readUInt32()
      } as BIFResource;
    }

    this.reader.dispose();

    await GameFileSystem.close(fd);
  }

  GetResourceById(id: number){
    if(id != null){
      for(let i = 0; i < this.variableResourceCount; i++){
        if(this.resources[i].Id == id){
          return this.resources[i];
        }
      }
    }
    return null;
  }

  GetResourcesByType(ResType: number){
    let arr: BIFResource[] = []
    if(ResType != null){
      for(let i = 0; i < this.variableResourceCount; i++){
        if(this.resources[i].resType == ResType){
          arr.push(this.resources[i]);
        }
      }
    }
    return arr;
  }

  GetResourceByLabel(label: string, ResType: number): BIFResource|undefined {
    if(label != null){
      let len = KEYManager.Key.keys.length;
      for(let i = 0; i < len; i++){
        let key = KEYManager.Key.keys[i];
        if(key.resRef == label && key.resType == ResType){
          for(let j = 0; j != this.resources.length; j++){
            let res = this.resources[j];
            if(res.Id == key.resId && res.resType == ResType){
              return res;
            }
          }
        }
      }
    }
    return undefined;
  }

  async getResourceBuffer(res?: BIFResource): Promise<Buffer> {
    if(!res){ return Buffer.allocUnsafe(0); }
    if(!res.size){ return Buffer.allocUnsafe(0); }

    try{

      const fd = await GameFileSystem.open(this.resourceDiskInfo.path, 'r')
      const buffer = Buffer.alloc(res.size);
      await GameFileSystem.read(fd, buffer, 0, buffer.length, res.offset);
      await GameFileSystem.close(fd);

      return buffer;

    }catch(e){
      return Buffer.allocUnsafe(0);
    }
  }

  /*load( path: string, onLoad?: Function, onError?: Function ){

    let pathInfo = Utility.filePathInfo(path);

    if(pathInfo.location == 'archive' && pathInfo.archive.type == 'bif'){
      let key = KEYManager.Key.GetFileKey(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
      if(key != null){
        const res = this.GetResourceByLabel(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
        if(res){
          this.getResourceBuffer(res).then( (buffer: Buffer) => {
            if(typeof onLoad === 'function')
              onLoad(buffer);
          }, (e: any) => {
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

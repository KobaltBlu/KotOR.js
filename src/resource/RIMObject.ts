/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from 'fs';
import * as path from 'path';
import { BinaryReader } from '../BinaryReader';
import { ResourceTypes } from './ResourceTypes';

/* @file
 * The RIMObject class.
 */

export interface RIMHeader {
  FileType: number;
  FileVersion: string;
  ResourceCount: number;
  ResourcesOffset: number;
}

export interface RIMResource {
  ResRef: string;
  ResType: number;
  Unused: number;
  ResID: number;
  DataOffset: number;
  DataSize: number;
}

export class RIMObject {
  file: string | Buffer;
  Resources: RIMResource[];
  HeaderSize: number;
  inMemory: boolean;
  buffer: Buffer;
  Reader: any;
  Header: RIMHeader;
  rimDataOffset: number;

  constructor(file: Buffer|string, onComplete: Function|undefined = undefined, onError: Function|undefined = undefined){
    this.file = file;

    this.Resources = [];
    this.HeaderSize = 160;

    this.inMemory = false;

    try{

      if(typeof file == 'string'){
        fs.open(this.file, 'r', (err, fd) => {
          if (err) {
            console.log('RIM Header Read', err);
            if(typeof onError === 'function')
              onError();

            return;
          }
          let header = Buffer.allocUnsafe(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (err, num) => {
            this.Reader = new BinaryReader(header);
  
            this.Header = {} as RIMHeader;
  
            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);
  
            this.Reader.Skip(4);
  
            this.Header.ResourceCount = this.Reader.ReadUInt32();
            this.Header.ResourcesOffset = this.Reader.ReadUInt32();
  
            //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
            this.rimDataOffset = (this.Header.ResourcesOffset + (this.Header.ResourceCount * 34));
            header = Buffer.allocUnsafe(this.rimDataOffset);
            fs.read(fd, header, 0, this.rimDataOffset, 0, (err, num) => {
              this.Reader.resuse(header);
              this.Reader.Seek(this.Header.ResourcesOffset);
  
              for (let i = 0; i != this.Header.ResourceCount; i++) {
                let res: RIMResource = {
                  ResRef: this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
                  ResType: this.Reader.ReadUInt16(),
                  Unused: this.Reader.ReadUInt16(),
                  ResID: this.Reader.ReadUInt32(),
                  DataOffset: this.Reader.ReadUInt32(),
                  DataSize: this.Reader.ReadUInt32()
                } as RIMResource;
                this.Resources.push(res);
              }

              this.Reader.dispose();
  
              if(typeof onComplete === 'function')
                onComplete(this);
  
            });
  
          });
  
        });
      }else if(this.file instanceof Buffer){
        this.inMemory = true;

        let header = Buffer.from(this.file, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header = {} as RIMHeader;

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);

        this.Reader.Skip(4);

        this.Header.ResourceCount = this.Reader.ReadUInt32();
        this.Header.ResourcesOffset = this.Reader.ReadUInt32();

        //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
        this.rimDataOffset = (this.Header.ResourcesOffset + (this.Header.ResourceCount * 34));
        header = Buffer.from(this.file, 0, this.rimDataOffset);
        this.Reader = new BinaryReader(header);
        this.Reader.Seek(this.Header.ResourcesOffset);

        for (let i = 0; i != this.Header.ResourceCount; i++) {
          let res = {
            ResRef: this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
            ResType: this.Reader.ReadUInt16(),
            Unused: this.Reader.ReadUInt16(),
            ResID: this.Reader.ReadUInt32(),
            DataOffset: this.Reader.ReadUInt32(),
            DataSize: this.Reader.ReadUInt32()
          };
          this.Resources.push(res);
        }

        this.Reader.dispose();

        if(onComplete != null)
          onComplete(this);

      }
      
    }catch(e){
      console.log('RIM Open Error', e);
      if(typeof onError === 'function')
        onError();
    }

  }

  getRawResource(resref: string = '', restype: number = 0x000F, onComplete: Function|undefined = undefined, onError: Function|undefined = undefined) {
    for(let i = 0; i != this.Resources.length; i++){
      let resource: RIMResource = this.Resources[i];
      if (resource.ResRef == resref && resource.ResType == restype) {
        try {
          let _buffers: Buffer[] = [];

          if(this.inMemory && this.file instanceof Buffer){
            let buffer = Buffer.alloc(resource.DataSize);
            this.file.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));

            if(typeof onComplete == 'function')
              onComplete(buffer);
          }else{
            fs.createReadStream(this.file, {autoClose: true, start: resource.DataOffset, end: resource.DataOffset + (resource.DataSize - 1)}).on('data', function (chunk: Buffer) {
              _buffers.push(chunk);
            })
            .on('end', function () {
      
              let buffer = Buffer.concat(_buffers);
              if(typeof onComplete == 'function')
                onComplete(buffer);
      
            });
          }
          
        }
        catch (e) {
          console.error('getRawResource', e);
          if(onComplete != null)
            onComplete(new ArrayBuffer(0));
        }
        return;
      }
    }

    if(typeof onError == 'function')
      onError();

  }

  getResourceByKey(key: string, restype: number): RIMResource|undefined {
    key = key.toLowerCase();
    for(let i = 0; i != this.Resources.length; i++){
      let _key = this.Resources[i];
      if (_key.ResRef == key && _key.ResType == restype) {
        return _key;
      }
    };
    return;
  }

  GetResourceByLabel(label: string, ResType: number){
    return this.getResourceByKey(label, ResType);
  }

  GetResourceData(resource: RIMResource, onComplete: Function|undefined = undefined) {
    if(!!resource){
      try {

        let _buffers: Buffer[] = [];

        if(this.inMemory && this.file instanceof Buffer){
          let buffer = Buffer.alloc(resource.DataSize);
          this.file.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{
          fs.createReadStream(this.file, {autoClose: true, start: resource.DataOffset, end: resource.DataOffset + (resource.DataSize - 1)}).on('data', function (chunk: Buffer) {
            _buffers.push(chunk);
          })
          .on('end', function () {
    
            let buffer = Buffer.concat(_buffers);
            if(typeof onComplete == 'function')
              onComplete(buffer);
    
          });
        }
      }
      catch (e) {
        console.log(e);
        if(onComplete != null)
          onComplete(new ArrayBuffer(0));
      }
    }
  }

  exportRawResource(directory: string, resref: string, restype = 0x000F, onComplete: Function|undefined = undefined) {
    if(directory != null){
      for(let i = 0; i != this.Resources.length; i++){
        let resource = this.Resources[i];
        if (resource.ResRef == resref && resource.ResType == restype) {
          try {

            if(this.inMemory && this.file instanceof Buffer){
              let buffer = Buffer.from(this.file, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
              fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
                if (err) console.log(err);

                if(onComplete != null)
                  onComplete(buffer);

              });
            }else{
              fs.open(this.file, 'r', function(err, fd) {
                if (err) {
                  console.log('RIM Read', err.message);
                  return;
                }
                let buffer = Buffer.alloc(resource.DataSize);
                fs.read(fd, buffer, 0, resource.DataSize, resource.DataOffset, function(err, num) {
                  console.log('RIM Export', 'Writing File', path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)));
                  fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
                    if (err) console.log(err);
  
                    if(onComplete != null)
                      onComplete(buffer);
  
                  });
  
                });
              });
            }

          }
          catch (e) {
            console.log(e);
            if(onComplete != null)
              onComplete(new ArrayBuffer(0));
          }
        }
      }
    }
  }

}

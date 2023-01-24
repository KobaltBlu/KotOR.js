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
  FileType: string;
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
  buffer: Buffer;
  resource_path: string;
  group: string;
  Resources: RIMResource[];
  HeaderSize: number;
  inMemory: boolean;
  Reader: BinaryReader;
  Header: RIMHeader;
  rimDataOffset: number;

  constructor(file: Buffer|string, onComplete?: Function, onError?: Function){

    this.Resources = [];
    this.HeaderSize = 160;

    this.inMemory = false;

    try{

      if(typeof file == 'string'){
        this.resource_path = file;
        this.LoadFromDisk(file).then( (rim: RIMObject) => {
          if(typeof onComplete === 'function')
            onComplete(rim);
        }).catch( (e: any) => {
          console.error(e);
          if(typeof onError === 'function')
            onError();
        });
      }else if(isBuffer(file)){
        this.buffer = file;
        this.LoadFromBuffer(this.buffer).then( (rim: RIMObject) => {
          if(typeof onComplete === 'function')
            onComplete(rim);
        }).catch( (e: any) => {
          console.error(e);
          if(typeof onError === 'function')
            onError();
        });
      }
      
    }catch(e){
      console.error(e);
      if(typeof onError === 'function')
        onError();
    }

  }

  ReadHeaderFromBuffer(buffer: Buffer){
    this.Header = {} as RIMHeader;

    this.Header.FileType = this.Reader.ReadChars(4);
    this.Header.FileVersion = this.Reader.ReadChars(4);

    this.Reader.Skip(4);

    this.Header.ResourceCount = this.Reader.ReadUInt32();
    this.Header.ResourcesOffset = this.Reader.ReadUInt32();

    //Enlarge the buffer to the include the entire structre up to the beginning of the file data block
    this.rimDataOffset = (this.Header.ResourcesOffset + (this.Header.ResourceCount * 34));
    let header = Buffer.from(buffer, 0, this.rimDataOffset);
    this.Reader = new BinaryReader(header);
    this.Reader.Seek(this.Header.ResourcesOffset);

    for (let i = 0; i < this.Header.ResourceCount; i++) {
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
  }

  ReadHeaderFromFileDecriptor(fd: any){
    return new Promise<void>( (resolve, reject) => {
      let header = Buffer.allocUnsafe(this.HeaderSize);
      GameFileSystem.read(fd, header, 0, this.HeaderSize, 0).then( () => {
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
        GameFileSystem.read(fd, header, 0, this.rimDataOffset, 0).then( () => {
          this.Reader.reuse(header);
          this.Reader.Seek(this.Header.ResourcesOffset);

          for (let i = 0; i < this.Header.ResourceCount; i++) {
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
          resolve();
        }).catch( (err) => {
          console.error(err);
        });
      }).catch( (err) => {
        console.error(err);
      });
    });
  }

  LoadFromBuffer(buffer: Buffer){
    return new Promise<RIMObject>( (resolve, reject) => {
      this.inMemory = true;
      let header = Buffer.from(buffer, 0, this.HeaderSize);
      this.Reader = new BinaryReader(header);
      this.ReadHeaderFromBuffer(buffer);
      this.Reader.dispose();
      resolve(this);
    });
  }

  LoadFromDisk(resource_path: string){
    return new Promise<RIMObject>( (resolve, reject) => {
      GameFileSystem.open(resource_path, 'r').then( (fd) => {
        
        try{
          this.ReadHeaderFromFileDecriptor(fd).then( () => {
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

  getRawResource(resref: string = '', restype: number = 0x000F, onComplete?: Function, onError?: Function) {
    for(let i = 0; i < this.Resources.length; i++){
      let resource: RIMResource = this.Resources[i];
      if (resource.ResRef == resref && resource.ResType == restype) {
        try {

          if(this.inMemory && isBuffer(this.buffer)){
            let buffer = Buffer.alloc(resource.DataSize);
            this.buffer.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));

            if(typeof onComplete == 'function')
              onComplete(buffer);
          }else{
            GameFileSystem.open(this.resource_path, 'r').then( (fd) => {
              let buffer = Buffer.alloc(resource.DataSize);
              GameFileSystem.read(fd, buffer, 0, buffer.length, resource.DataOffset).then( () => {
                GameFileSystem.close(fd).then( () => {
                  if(typeof onComplete === 'function')
                    onComplete(buffer);
                }).catch( (err) => {
                  if(typeof onComplete === 'function')
                    onComplete(Buffer.allocUnsafe(0));
                })
              }).catch( (err) => {
                if(typeof onComplete === 'function')
                  onComplete(Buffer.allocUnsafe(0));
              })
            }).catch( (err) => {
              if(typeof onComplete === 'function')
                onComplete(Buffer.allocUnsafe(0));
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
    for(let i = 0; i < this.Resources.length; i++){
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

  GetResourceData(resource?: RIMResource, onComplete?: Function) {
    if(!!resource){
      try {

        if(this.inMemory && isBuffer(this.buffer)){
          let buffer = Buffer.alloc(resource.DataSize);
          this.buffer.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{
          GameFileSystem.open(this.resource_path, 'r').then( (fd) => {
            let buffer = Buffer.alloc(resource.DataSize);
            GameFileSystem.read(fd, buffer, 0, buffer.length, resource.DataOffset).then( () => {
              GameFileSystem.close(fd).then( () => {
                if(typeof onComplete === 'function')
                  onComplete(buffer);
              }).catch( (err) => {
                if(typeof onComplete === 'function')
                  onComplete(Buffer.allocUnsafe(0));
              })
            }).catch( (err) => {
              if(typeof onComplete === 'function')
                onComplete(Buffer.allocUnsafe(0));
            })
          }).catch( (err) => {
            if(typeof onComplete === 'function')
              onComplete(Buffer.allocUnsafe(0));
          });
        }
      }
      catch (e) {
        console.error(e);
        if(onComplete != null)
          onComplete(new ArrayBuffer(0));
      }
    }
  }

  exportRawResource(directory: string, resref: string, restype = 0x000F, onComplete?: Function) {
    if(directory != null){
      for(let i = 0; i < this.Resources.length; i++){
        let resource = this.Resources[i];
        if (resource.ResRef == resref && resource.ResType == restype) {
          try {
            if(onComplete != null)
              onComplete();

            // if(this.inMemory && isBuffer(this.buffer)){
            //   let buffer = Buffer.from(this.buffer, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
            //   fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
            //     if (err) console.log(err);

            //     if(onComplete != null)
            //       onComplete(buffer);

            //   });
            // }else{
            //   fs.open(this.resource_path, 'r', function(err, fd) {
            //     if (err) {
            //       console.log('RIM Read', err.message);
            //       return;
            //     }
            //     let buffer = Buffer.alloc(resource.DataSize);
            //     fs.read(fd, buffer, 0, resource.DataSize, resource.DataOffset, function(err, num) {
            //       console.log('RIM Export', 'Writing File', path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)));
            //       fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
            //         if (err) console.log(err);
  
            //         if(onComplete != null)
            //           onComplete(buffer);
  
            //       });
  
            //     });
            //   });
            // }

          }
          catch (e) {
            console.error(e);
            if(onComplete != null)
              onComplete();
          }
        }
      }
    }
  }

}
